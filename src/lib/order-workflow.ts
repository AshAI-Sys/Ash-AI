import { db } from './db';
import { OrderStatus, Role } from '@prisma/client';
import { AppError } from './api-error-handler';

export interface OrderWorkflowTransition {
  from: OrderStatus;
  to: OrderStatus;
  requiredRole: Role[];
  validation?: (orderId: string, userId: string) => Promise<boolean>;
  onTransition?: (orderId: string, userId: string) => Promise<void>;
}

// Order workflow state machine based on CLIENT_UPDATED_PLAN.md
export const ORDER_WORKFLOW: OrderWorkflowTransition[] = [
  // Initial state transitions
  {
    from: 'INTAKE',
    to: 'DESIGN_PENDING',
    requiredRole: ['ADMIN', 'MANAGER'],
    onTransition: async (orderId, userId) => {
      await createOrderNotification(orderId, 'Order moved to design phase', 'DESIGN_TEAM');
    }
  },
  {
    from: 'DESIGN_PENDING',
    to: 'DESIGN_APPROVAL',
    requiredRole: ['ADMIN', 'MANAGER', 'DESIGNER'],
    validation: async (orderId) => {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { designAssets: true }
      });
      return !!order?.designAssets?.length;
    }
  },
  {
    from: 'DESIGN_APPROVAL',
    to: 'CONFIRMED',
    requiredRole: ['ADMIN', 'MANAGER', 'CLIENT'],
    onTransition: async (orderId, userId) => {
      await createOrderNotification(orderId, 'Design approved, order confirmed', 'PRODUCTION_TEAM');
    }
  },
  {
    from: 'CONFIRMED',
    to: 'PRODUCTION_PLANNED',
    requiredRole: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    onTransition: async (orderId, userId) => {
      await createProductionPlan(orderId, userId);
    }
  },
  {
    from: 'PRODUCTION_PLANNED',
    to: 'IN_PROGRESS',
    requiredRole: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    onTransition: async (orderId, userId) => {
      await startProductionTracking(orderId);
    }
  },
  {
    from: 'IN_PROGRESS',
    to: 'QC',
    requiredRole: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    validation: async (orderId) => {
      return await checkProductionCompletion(orderId);
    }
  },
  {
    from: 'QC',
    to: 'PACKING',
    requiredRole: ['ADMIN', 'MANAGER', 'QC_INSPECTOR'],
    validation: async (orderId) => {
      return await checkQualityApproval(orderId);
    }
  },
  {
    from: 'PACKING',
    to: 'READY_FOR_DELIVERY',
    requiredRole: ['ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'],
    onTransition: async (orderId, userId) => {
      await createShipment(orderId, userId);
    }
  },
  {
    from: 'READY_FOR_DELIVERY',
    to: 'DELIVERED',
    requiredRole: ['ADMIN', 'MANAGER', 'DELIVERY_DRIVER'],
    onTransition: async (orderId, userId) => {
      await completeDelivery(orderId, userId);
    }
  },
  {
    from: 'DELIVERED',
    to: 'CLOSED',
    requiredRole: ['ADMIN', 'MANAGER', 'CLIENT'],
    onTransition: async (orderId, userId) => {
      await finalizeOrder(orderId, userId);
    }
  },
  // Emergency transitions
  {
    from: 'IN_PROGRESS',
    to: 'ON_HOLD',
    requiredRole: ['ADMIN', 'MANAGER'],
    onTransition: async (orderId, userId) => {
      await pauseProduction(orderId, userId);
    }
  },
  {
    from: 'ON_HOLD',
    to: 'IN_PROGRESS',
    requiredRole: ['ADMIN', 'MANAGER'],
    onTransition: async (orderId, userId) => {
      await resumeProduction(orderId, userId);
    }
  }
];

export class OrderWorkflowEngine {
  static async transitionOrder(
    orderId: string,
    toStatus: OrderStatus,
    userId: string,
    userRole: Role,
    notes?: string
  ): Promise<void> {
    // Get current order
    const order = await db.order.findUnique({
      where: { id: orderId }
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
      const isValid = await transition.validation(orderId, userId);
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
        where: { id: orderId },
        data: {
          status: toStatus,
          updated_at: new Date(),
          updated_by: userId
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id: order.workspace_id,
          actor_id: userId,
          entity_type: 'ORDER',
          entity_id: orderId,
          action: 'STATUS_CHANGE',
          before_data: JSON.stringify({ status: order.status }),
          after_data: JSON.stringify({ status: toStatus, notes })
        }
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          order_id: orderId,
          status: toStatus,
          changed_by: userId,
          notes: notes || `Status changed from ${order.status} to ${toStatus}`,
          workspace_id: order.workspace_id
        }
      });
    });

    // Run post-transition hook
    if (transition.onTransition) {
      await transition.onTransition(orderId, userId);
    }
  }

  static async getAvailableTransitions(
    orderId: string,
    userRole: Role
  ): Promise<{ status: OrderStatus; label: string; description: string }[]> {
    const order = await db.order.findUnique({
      where: { id: orderId }
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
  orderId: string,
  message: string,
  targetRole: string
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
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
      entity_id: orderId,
      entity_type: 'ORDER',
      target_role: targetRole as any
    }
  });
}

async function createProductionPlan(orderId: string, userId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true }
  });

  if (!order) return;

  // Create production runs for each order item
  for (const item of order.orderItems) {
    await db.sewingRun.create({
      data: {
        order_id: orderId,
        order_item_id: item.id,
        quantity: item.quantity,
        status: 'PLANNED',
        workspace_id: order.workspace_id,
        created_by: userId
      }
    });
  }
}

async function startProductionTracking(orderId: string): Promise<void> {
  // Initialize production tracking
  await db.productionTracking.create({
    data: {
      order_id: orderId,
      stage: 'CUTTING',
      status: 'IN_PROGRESS',
      started_at: new Date()
    }
  });
}

async function checkProductionCompletion(orderId: string): Promise<boolean> {
  const tracking = await db.productionTracking.findMany({
    where: { 
      order_id: orderId,
      status: { not: 'COMPLETED' }
    }
  });
  
  return tracking.length === 0;
}

async function checkQualityApproval(orderId: string): Promise<boolean> {
  const qcInspections = await db.qcInspection.findMany({
    where: { 
      order_id: orderId,
      status: 'APPROVED'
    }
  });
  
  return qcInspections.length > 0;
}

async function createShipment(orderId: string, userId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId }
  });

  if (!order) return;

  await db.shipment.create({
    data: {
      order_id: orderId,
      status: 'PENDING',
      workspace_id: order.workspace_id,
      created_by: userId
    }
  });
}

async function completeDelivery(orderId: string, userId: string): Promise<void> {
  await db.order.update({
    where: { id: orderId },
    data: {
      delivered_at: new Date(),
      updated_by: userId
    }
  });
}

async function finalizeOrder(orderId: string, userId: string): Promise<void> {
  await db.order.update({
    where: { id: orderId },
    data: {
      closed_at: new Date(),
      updated_by: userId
    }
  });
}

async function pauseProduction(orderId: string, userId: string): Promise<void> {
  await db.productionTracking.updateMany({
    where: { 
      order_id: orderId,
      status: 'IN_PROGRESS'
    },
    data: { 
      status: 'PAUSED',
      paused_at: new Date()
    }
  });
}

async function resumeProduction(orderId: string, userId: string): Promise<void> {
  await db.productionTracking.updateMany({
    where: { 
      order_id: orderId,
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