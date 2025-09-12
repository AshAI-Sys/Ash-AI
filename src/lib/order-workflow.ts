// @ts-nocheck
import { db } from './db';
import { OrderStatus, Role } from '@prisma/client';
import { AppError } from './api-error-handler';
import { routingEngine, OrderContext } from './routing-engine';

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
    include: { 
      orderItems: true,
      client: { select: { preferences: true } }
    }
  });

  if (!order) return;

  // Create intelligent routing-based production plan
  for (const item of order.orderItems) {
    const specs = item.specifications ? JSON.parse(item.specifications as string) : {};
    const method = specs.printing_method || 'Silkscreen';
    
    // Create order context for routing engine
    const orderContext: OrderContext = {
      productType: item.product_type,
      method: method,
      quantity: item.quantity,
      target_delivery_date: order.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      brand_id: order.client_id,
      hasComplexDesign: specs.complexity === 'HIGH',
      isPriority: specs.priority === 'HIGH'
    };

    // Get routing recommendation from Ashley AI
    const recommendation = routingEngine.getAshleyRecommendation(orderContext);
    
    if (recommendation.recommendedTemplate) {
      const template = recommendation.recommendedTemplate;
      const criticalPath = routingEngine.calculateCriticalPath(
        template, 
        item.quantity, 
        orderContext.target_delivery_date
      );

      // Create routing steps for this order item
      for (let i = 0; i < template.steps.length; i++) {
        const step = template.steps[i];
        await db.routingStep.create({
          data: {
            order_id: order_id,
            order_item_id: item.id,
            step_name: step.name,
            step_id: step.id,
            department: step.department,
            sequence: i + 1,
            estimated_hours: step.estimatedHours,
            required_skills: step.requiredSkills,
            dependencies: step.dependencies,
            status: 'PLANNED',
            workspace_id: order.workspace_id,
            created_by: user_id
          }
        });
      }

      // Create production run with routing intelligence
      await db.sewingRun.create({
        data: {
          order_id: order_id,
          order_item_id: item.id,
          quantity: item.quantity,
          status: 'PLANNED',
          routing_template_id: template.id,
          estimated_completion: criticalPath.estimatedDeliveryDate,
          efficiency_target: 85.0,
          workspace_id: order.workspace_id,
          created_by: user_id
        }
      });

      // Log Ashley's routing insights
      if (recommendation.insights.length > 0 || recommendation.warnings.length > 0) {
        await db.productionLog.create({
          data: {
            order_id: order_id,
            update_type: 'ROUTING_ANALYSIS',
            details: JSON.stringify({
              template: template.name,
              insights: recommendation.insights,
              warnings: recommendation.warnings,
              feasible: criticalPath.feasible,
              bottlenecks: criticalPath.bottleneckSteps
            }),
            timestamp: new Date(),
            workspace_id: order.workspace_id
          }
        });
      }
    } else {
      // Fallback to basic production run
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
}

async function startProductionTracking(order_id: string): Promise<void> {
  // Get routing steps to initialize proper tracking
  const routingSteps = await db.routingStep.findMany({
    where: { order_id: order_id, status: 'PLANNED' },
    orderBy: { sequence: 'asc' }
  });

  if (routingSteps.length > 0) {
    // Start with first routing step
    const firstStep = routingSteps[0];
    
    // Update first step to IN_PROGRESS
    await db.routingStep.update({
      where: { id: firstStep.id },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date()
      }
    });

    // Initialize production tracking with routing-aware stage
    await db.productionTracking.create({
      data: {
        order_id: order_id,
        routing_step_id: firstStep.id,
        stage: firstStep.department,
        status: 'IN_PROGRESS',
        started_at: new Date()
      }
    });
  } else {
    // Fallback to basic tracking
    await db.productionTracking.create({
      data: {
        order_id: order_id,
        stage: 'CUTTING',
        status: 'IN_PROGRESS',
        started_at: new Date()
      }
    });
  }
}

async function checkProductionCompletion(order_id: string): Promise<boolean> {
  // Check if all routing steps are completed
  const incompleteSteps = await db.routingStep.findMany({
    where: { 
      order_id: order_id,
      status: { not: 'COMPLETED' }
    }
  });
  
  // If using routing steps, check those; otherwise fallback to production tracking
  if (incompleteSteps.length === 0) {
    const tracking = await db.productionTracking.findMany({
      where: { 
        order_id: order_id,
        status: { not: 'COMPLETED' }
      }
    });
    return tracking.length === 0;
  }
  
  return false;
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