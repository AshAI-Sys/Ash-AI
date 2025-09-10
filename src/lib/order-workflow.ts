import { db } from './db';
import { OrderStatus, Role } from '@prisma/client';
import { AppError } from './api-error-handler';

export interface OrderWorkflowTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiredRole: Role[];
  validation?: (order_id: string, user_id: string) => Promise<boolean>;
  onTransition?: (order_id: string, user_id: string) => Promise<void>;
}

// Order workflow state machine based on CLIENT_UPDATED_PLAN.md
export const ORDER_WORKFLOW: OrderWorkflowTransition[] = [
  // Initial state transitions
  {
    from: 'INTAKE',
    to: 'DESIGN_PENDING',
    requiredRole: ['ADMIN', 'MANAGER'],
    onTransition: async (order_id, user_id) => {
      await createOrderNotification(order_id, 'Order moved to design phase', 'DESIGN_TEAM');
    }
  },
  {
    from: 'DESIGN_PENDING',
    to: 'DESIGN_APPROVAL',
    requiredRole: ['ADMIN', 'MANAGER', 'DESIGNER'],
    validation: async (order_id) => {
      const order = await db.order.findUnique({
        where: { id: order_id },
        include: { design_assets: true }
      });
      return !!order?.design_assets?.length;
    }
  },
  {
    from: 'DESIGN_APPROVAL',
    to: 'CONFIRMED',
    requiredRole: ['ADMIN', 'MANAGER', 'CLIENT'],
    onTransition: async (order_id, user_id) => {
      await createOrderNotification(order_id, 'Design approved, order confirmed', 'PRODUCTION_TEAM');
    }
  },
  {
    from: 'CONFIRMED',
    to: 'PRODUCTION_PLANNED',
    requiredRole: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    onTransition: async (order_id, user_id) => {
      await createProductionPlan(order_id, user_id);
    }
  },
  {
    from: 'PRODUCTION_PLANNED',
    to: 'IN_PROGRESS',
    requiredRole: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    onTransition: async (order_id, user_id) => {
      await startProductionTracking(order_id);
    }
  },
  {
    from: 'IN_PROGRESS',
    to: 'QC',
    requiredRole: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    validation: async (order_id) => {
      return await checkProductionCompletion(order_id);
    }
  },
  {
    from: 'QC',
    to: 'PACKING',
    requiredRole: ['ADMIN', 'MANAGER', 'QC_INSPECTOR'],
    validation: async (order_id) => {
      return await checkQualityApproval(order_id);
    }
  },
  {
    from: 'PACKING',
    to: 'READY_FOR_DELIVERY',
    requiredRole: ['ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'],
    onTransition: async (order_id, user_id) => {
      await createShipment(order_id, user_id);
    }
  },
  {
    from: 'READY_FOR_DELIVERY',
    to: 'DELIVERED',
    requiredRole: ['ADMIN', 'MANAGER', 'DELIVERY_DRIVER'],
    onTransition: async (order_id, user_id) => {
      await completeDelivery(order_id, user_id);
    }
  },
  {
    from: 'DELIVERED',
    to: 'CLOSED',
    requiredRole: ['ADMIN', 'MANAGER', 'CLIENT'],
    onTransition: async (order_id, user_id) => {
      await finalizeOrder(order_id, user_id);
    }
  },
  // Emergency transitions
  {
    from: 'IN_PROGRESS',
    to: 'ON_HOLD',
    requiredRole: ['ADMIN', 'MANAGER'],
    onTransition: async (order_id, user_id) => {
      await pauseProduction(order_id, user_id);
    }
  },
  {
    from: 'ON_HOLD',
    to: 'IN_PROGRESS',
    requiredRole: ['ADMIN', 'MANAGER'],
    onTransition: async (order_id, user_id) => {
      await resumeProduction(order_id, user_id);
    }
  }
];

export class OrderWorkflowEngine {
  static async transitionOrder(
    order_id: string,
    toStatus: OrderStatus,
    user_id: string,
    userRole: Role,
    notes?: string
  ): Promise<void> {
    // Get current order
    const order = await db.order.findUnique({
      where: { id: order_id }
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    // Find valid transition
    const transition = ORDER_WORKFLOW.find(
      t => t.from === order.status && t.to === toStatus
    );

    if (!transition) {
      throw new AppError(
        'INVALID_TRANSITION',
        `Cannot transition from ${order.status} to ${toStatus}`,
        400
      );
    }

    // Check permissions
    if (!transition.requiredRole.includes(userRole)) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'You do not have permission to perform this transition',
        403
      );
    }

    // Run validation if exists
    if (transition.validation) {
      const isValid = await transition.validation(order_id, user_id);
      if (!isValid) {
        throw new AppError(
          'VALIDATION_FAILED',
          'Order does not meet requirements for this transition',
          400
        );
      }
    }

    // Perform the transition
    await db.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: order_id },
        data: {
          status: toStatus,
          updated_at: new Date(),
          updated_by: user_id
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id: order.workspace_id,
          actor_id: user_id,
          entity_type: 'ORDER',
          entity_id: order_id,
          action: 'STATUS_CHANGE',
          before_data: JSON.stringify({ status: order.status }),
          after_data: JSON.stringify({ status: toStatus, notes })
        }
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          order_id: order_id,
          status: toStatus,
          changed_by: user_id,
          notes: notes || `Status changed from ${order.status} to ${toStatus}`,
          workspace_id: order.workspace_id
        }
      });
    });

    // Run post-transition hook
    if (transition.onTransition) {
      await transition.onTransition(order_id, user_id);
    }
  }

  static async getAvailableTransitions(
    order_id: string,
    userRole: Role
  ): Promise<{ status: OrderStatus; label: string; description: string }[]> {
    const order = await db.order.findUnique({
      where: { id: order_id }
    });

    if (!order) {
      return [];
    }

    const availableTransitions = ORDER_WORKFLOW.filter(
      t => t.from === order.status && t.requiredRole.includes(userRole)
    );

    return availableTransitions.map(t => ({
      status: t.to,
      label: getStatusLabel(t.to),
      description: getStatusDescription(t.to)
    }));
  }

  static getStatusProgress(status: OrderStatus): number {
    const statusOrder = [
      'INTAKE',
      'DESIGN_PENDING',
      'DESIGN_APPROVAL', 
      'CONFIRMED',
      'PRODUCTION_PLANNED',
      'IN_PROGRESS',
      'QC',
      'PACKING',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CLOSED'
    ];
    
    const index = statusOrder.indexOf(status);
    return index >= 0 ? (index / (statusOrder.length - 1)) * 100 : 0;
  }
}

// Helper functions
async function createOrderNotification(
  order_id: string,
  message: string,
  targetRole: string
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: order_id },
    include: { client: true }
  });

  if (!order) return;

  // Create notification record
  await db.notification.create({
    data: {
      workspace_id: order.workspace_id,
      title: `Order ${order.po_number}`,
      message,
      type: 'ORDER_UPDATE',
      entity_id: order_id,
      entity_type: 'ORDER',
      target_role: targetRole as any
    }
  });
}

async function createProductionPlan(order_id: string, user_id: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: order_id },
    include: { orderItems: true }
  });

  if (!order) return;

  // Create production runs for each order item
  for (const item of order.orderItems) {
    await db.sewingRun.create({
      data: {
        order_id: order_id,
        order_item_id: item.id,
        quantity: item.quantity,
        status: 'PLANNED',
        workspace_id: order.workspace_id,
        created_by: user_id
      }
    });
  }
}

async function startProductionTracking(order_id: string): Promise<void> {
  // Initialize production tracking
  await db.productionTracking.create({
    data: {
      order_id: order_id,
      stage: 'CUTTING',
      status: 'IN_PROGRESS',
      started_at: new Date()
    }
  });
}

async function checkProductionCompletion(order_id: string): Promise<boolean> {
  const tracking = await db.productionTracking.findMany({
    where: { 
      order_id: order_id,
      status: { not: 'COMPLETED' }
    }
  });
  
  return tracking.length === 0;
}

async function checkQualityApproval(order_id: string): Promise<boolean> {
  const qcInspections = await db.qcInspection.findMany({
    where: { 
      order_id: order_id,
      status: 'APPROVED'
    }
  });
  
  return qcInspections.length > 0;
}

async function createShipment(order_id: string, user_id: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: order_id }
  });

  if (!order) return;

  await db.shipment.create({
    data: {
      order_id: order_id,
      status: 'PENDING',
      workspace_id: order.workspace_id,
      created_by: user_id
    }
  });
}

async function completeDelivery(order_id: string, user_id: string): Promise<void> {
  await db.order.update({
    where: { id: order_id },
    data: {
      delivered_at: new Date(),
      updated_by: user_id
    }
  });
}

async function finalizeOrder(order_id: string, user_id: string): Promise<void> {
  await db.order.update({
    where: { id: order_id },
    data: {
      closed_at: new Date(),
      updated_by: user_id
    }
  });
}

async function pauseProduction(order_id: string, user_id: string): Promise<void> {
  await db.productionTracking.updateMany({
    where: { 
      order_id: order_id,
      status: 'IN_PROGRESS'
    },
    data: { 
      status: 'PAUSED',
      paused_at: new Date()
    }
  });
}

async function resumeProduction(order_id: string, user_id: string): Promise<void> {
  await db.productionTracking.updateMany({
    where: { 
      order_id: order_id,
      status: 'PAUSED'
    },
    data: { 
      status: 'IN_PROGRESS',
      resumed_at: new Date()
    }
  });
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    INTAKE: 'Order Intake',
    DESIGN_PENDING: 'Design in Progress',
    DESIGN_APPROVAL: 'Awaiting Design Approval',
    CONFIRMED: 'Order Confirmed',
    PRODUCTION_PLANNED: 'Production Planned',
    IN_PROGRESS: 'In Production',
    QC: 'Quality Control',
    PACKING: 'Packing',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    DELIVERED: 'Delivered',
    CLOSED: 'Order Closed',
    ON_HOLD: 'On Hold',
    CANCELLED: 'Cancelled'
  };
  
  return labels[status] || status;
}

function getStatusDescription(status: OrderStatus): string {
  const descriptions: Record<OrderStatus, string> = {
    INTAKE: 'Order has been received and is being processed',
    DESIGN_PENDING: 'Design team is working on the order requirements',
    DESIGN_APPROVAL: 'Design is complete and waiting for client approval',
    CONFIRMED: 'Design approved, order confirmed for production',
    PRODUCTION_PLANNED: 'Production schedule has been created',
    IN_PROGRESS: 'Order is currently in production',
    QC: 'Products are undergoing quality control inspection',
    PACKING: 'Products are being packed for shipment',
    READY_FOR_DELIVERY: 'Order is ready to be shipped',
    DELIVERED: 'Order has been delivered to the client',
    CLOSED: 'Order has been completed and closed',
    ON_HOLD: 'Order is temporarily paused',
    CANCELLED: 'Order has been cancelled'
  };
  
  return descriptions[status] || status;
}