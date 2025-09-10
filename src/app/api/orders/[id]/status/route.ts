import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { OrderWorkflowEngine } from '@/lib/order-workflow'

// Order Status Transition API - CLIENT_UPDATED_PLAN.md Implementation
// Automated order workflow with notifications and validation

const OrderStatusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
  notify_client: z.boolean().default(true),
  notify_team: z.boolean().default(true)
});

// PUT /api/orders/[id]/status - Update order status with workflow automation
export const PUT = withErrorHandler(async (
  request: NextRequest, 
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const order_id = params.id;
  const body = await request.json();
  const validatedData = OrderStatusUpdateSchema.parse(body);

  try {
    // Use workflow engine for status transition
    await OrderWorkflowEngine.transitionOrder(
      order_id,
      validatedData.status,
      session.user.id,
      session.user.role as Role,
      validatedData.notes
    );

    // Get updated order with full details
    const updatedOrder = await db.order.findUnique({
      where: { id: order_id },
      include: {
        client: { select: { name: true, email: true } },
        statusHistory: {
          orderBy: { changed_at: 'desc' },
          take: 5,
          include: {
            changedBy: { select: { name: true } }
          }
        },
        orderItems: true
      }
    });

    if (!updatedOrder) {
      throw Errors.ORDER_NOT_FOUND;
    }

    // Send automated notifications if requested
    if (validatedData.notify_client || validatedData.notify_team) {
      await sendOrderStatusNotifications(updatedOrder, validatedData, session.user.name);
    }

    // Get available next transitions for the user
    const availableTransitions = await OrderWorkflowEngine.getAvailableTransitions(
      order_id,
      session.user.role as Role
    );

    return createSuccessResponse({
      order: updatedOrder,
      available_transitions: availableTransitions,
      progress_percentage: OrderWorkflowEngine.getStatusProgress(validatedData.status),
      workflow_complete: validatedData.status === 'CLOSED'
    }, 'Order status updated successfully');

  } catch (_error) {
    console.error('Order Status Update Error:', error);
    throw error;
  }
});

// GET /api/orders/[id]/status - Get order status history and workflow info
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const order_id = params.id;

  try {
    const [order, statusHistory, availableTransitions] = await Promise.all([
      db.order.findUnique({
        where: { id: order_id },
        include: {
          client: { select: { name: true, email: true } }
        }
      }),
      db.orderStatusHistory.findMany({
        where: { order_id: order_id },
        include: {
          changedBy: { select: { name: true, role: true } }
        },
        orderBy: { changed_at: 'desc' }
      }),
      OrderWorkflowEngine.getAvailableTransitions(
        order_id,
        session.user.role as Role
      )
    ]);

    if (!order) {
      throw Errors.ORDER_NOT_FOUND;
    }

    return createSuccessResponse({
      order: {
        id: order.id,
        po_number: order.po_number,
        current_status: order.status,
        client_name: order.client?.name,
        total_amount: order.total_amount,
        due_date: order.due_date,
        created_at: order.created_at
      },
      status_history: statusHistory.map(h => ({
        status: h.status,
        changed_at: h.changed_at,
        changed_by: h.changedBy?.name,
        changed_by_role: h.changedBy?.role,
        notes: h.notes,
        duration: calculateStatusDuration(h, statusHistory)
      })),
      available_transitions: availableTransitions,
      workflow_progress: {
        current_progress: OrderWorkflowEngine.getStatusProgress(order.status),
        stages_completed: getCompletedStages(order.status),
        estimated_completion: calculateEstimatedCompletion(order),
        bottlenecks: await identifyBottlenecks(order)
      }
    });

  } catch (_error) {
    console.error('Order Status Retrieval Error:', error);
    throw error;
  }
});

// Helper Functions
async function sendOrderStatusNotifications(
  order: any,
  updateData: any,
  changedBy: string
) {
  const notifications = [];

  // Client notification
  if (updateData.notify_client && order.client?.email) {
    notifications.push({
      type: 'EMAIL',
      recipient: order.client.email,
      subject: `Order Update: ${order.po_number}`,
      template: 'order_status_update',
      data: {
        po_number: order.po_number,
        status: updateData.status,
        client_name: order.client.name,
        notes: updateData.notes,
        changed_by: changedBy,
        tracking_url: `${process.env.NEXTAUTH_URL}/client-portal/orders/${order.id}`
      }
    });
  }

  // Team notification
  if (updateData.notify_team) {
    const teamRoles = getNotificationRoles(updateData.status);
    for (const role of teamRoles) {
      notifications.push({
        type: 'INTERNAL',
        target_role: role,
        title: `Order ${order.po_number}`,
        message: `Status changed to ${updateData.status}`,
        entity_id: order.id,
        entity_type: 'ORDER',
        action_url: `/orders/${order.id}`
      });
    }
  }

  // Send notifications (in real implementation, this would use a queue)
  for (const notification of notifications) {
    try {
      if (notification.type === 'INTERNAL') {
        await db.notification.create({
          data: {
            workspace_id: order.workspace_id,
            title: notification.title,
            message: notification.message,
            type: 'ORDER_UPDATE',
            entity_id: notification.entity_id,
            entity_type: notification.entity_type,
            target_role: notification.target_role,
            action_url: notification.action_url
          }
        });
      }
      // Email notifications would be handled by a background job
    } catch (_error) {
      console.error('Notification send error:', error);
    }
  }
}

function getNotificationRoles(status: OrderStatus): string[] {
  const roleMap: Record<OrderStatus, string[]> = {
    'INTAKE': ['ADMIN', 'MANAGER'],
    'DESIGN_PENDING': ['ADMIN', 'MANAGER', 'DESIGNER'],
    'DESIGN_APPROVAL': ['ADMIN', 'MANAGER', 'CLIENT'],
    'CONFIRMED': ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    'PRODUCTION_PLANNED': ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    'IN_PROGRESS': ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER', 'OPERATOR'],
    'QC': ['ADMIN', 'MANAGER', 'QC_INSPECTOR'],
    'PACKING': ['ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'],
    'READY_FOR_DELIVERY': ['ADMIN', 'MANAGER', 'DELIVERY_DRIVER'],
    'DELIVERED': ['ADMIN', 'MANAGER', 'CLIENT'],
    'CLOSED': ['ADMIN', 'MANAGER'],
    'ON_HOLD': ['ADMIN', 'MANAGER'],
    'CANCELLED': ['ADMIN', 'MANAGER']
  };

  return roleMap[status] || ['ADMIN', 'MANAGER'];
}

function calculateStatusDuration(
  currentStatus: any,
  statusHistory: any[]
): number | null {
  const currentIndex = statusHistory.findIndex(h => h.id === currentStatus.id);
  if (currentIndex === statusHistory.length - 1) return null; // First status
  
  const nextStatus = statusHistory[currentIndex + 1];
  return Math.round(
    (new Date(currentStatus.changed_at).getTime() - new Date(nextStatus.changed_at).getTime()) 
    / (1000 * 60 * 60) // Convert to hours
  );
}

function getCompletedStages(status: OrderStatus): string[] {
  const allStages = [
    'INTAKE', 'DESIGN_PENDING', 'DESIGN_APPROVAL', 'CONFIRMED',
    'PRODUCTION_PLANNED', 'IN_PROGRESS', 'QC', 'PACKING',
    'READY_FOR_DELIVERY', 'DELIVERED', 'CLOSED'
  ];
  
  const currentIndex = allStages.indexOf(status);
  return currentIndex >= 0 ? allStages.slice(0, currentIndex + 1) : [];
}

function calculateEstimatedCompletion(order: any): string {
  if (!order.due_date) return 'No due date set';
  
  const now = new Date();
  const dueDate = new Date(order.due_date);
  const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) return 'Overdue';
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining === 1) return 'Due tomorrow';
  return `${daysRemaining} days remaining`;
}

async function identifyBottlenecks(order: any): Promise<string[]> {
  // Simple bottleneck detection based on status duration
  const statusHistory = await db.orderStatusHistory.findMany({
    where: { order_id: order.id },
    orderBy: { changed_at: 'desc' },
    take: 5
  });

  const bottlenecks = [];
  
  // Check if stuck in any status for too long
  if (statusHistory.length >= 2) {
    const timeSinceLastChange = Date.now() - statusHistory[0].changed_at.getTime();
    const hoursStuck = timeSinceLastChange / (1000 * 60 * 60);
    
    if (hoursStuck > 48) { // More than 2 days
      bottlenecks.push(`Order has been in ${order.status} status for ${Math.round(hoursStuck)} hours`);
    }
  }

  return bottlenecks;
}