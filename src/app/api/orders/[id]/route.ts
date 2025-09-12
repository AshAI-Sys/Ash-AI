// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { OrderWorkflowEngine } from '@/lib/order-workflow'

// GET /api/orders/[id] - Get single order with full details
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const { id } = params;

  try {
    const workspace_id = 'default';

    const order = await db.order.findUnique({
      where: { id, workspace_id },
      include: {
        client: {
          select: { 
            id: true, 
            name: true, 
            emails: true, 
            phones: true,
            billing_address: true 
          }
        },
        orderItems: {
          select: { 
            id: true, 
            product_type: true, 
            quantity: true, 
            unit_price: true,
            total_price: true,
            specifications: true 
          },
          orderBy: { created_at: 'asc' }
        },
        statusHistory: {
          select: { 
            status: true, 
            changed_at: true, 
            notes: true,
            changed_by: true
          },
          orderBy: { changed_at: 'desc' }
        },
        design_assets: {
          select: {
            id: true,
            asset_type: true,
            file_url: true,
            file_name: true,
            version: true,
            status: true
          }
        },
        routing_steps: {
          select: {
            id: true,
            step_name: true,
            status: true,
            assigned_to: true,
            started_at: true,
            completed_at: true
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { 
            orderItems: true,
            design_assets: true,
            routing_steps: true
          }
        }
      }
    });

    if (!order) {
      throw Errors.NOT_FOUND;
    }

    // Get available status transitions for current user
    const availableTransitions = await OrderWorkflowEngine.getAvailableTransitions(
      id,
      session.user.role as Role
    );

    // Calculate progress and timeline
    const progressPercentage = OrderWorkflowEngine.getStatusProgress(order.status);
    
    // Calculate estimated completion
    const estimatedCompletion = calculateEstimatedCompletion(order.status, order.due_date);
    
    // Assess order risk
    const riskAssessment = assessOrderRisk(order);

    // Get production metrics if order is in production
    let productionMetrics = null;
    if (['IN_PROGRESS', 'QC', 'PACKING'].includes(order.status)) {
      productionMetrics = await getProductionMetrics(id);
    }

    const enhancedOrder = {
      ...order,
      progress_percentage: progressPercentage,
      available_transitions: availableTransitions,
      estimated_completion: estimatedCompletion,
      risk_assessment: riskAssessment,
      production_metrics: productionMetrics,
      counts: {
        total_items: order._count.orderItems,
        design_assets: order._count.design_assets,
        routing_steps: order._count.routing_steps
      }
    };

    return createSuccessResponse(enhancedOrder);

  } catch (error) {
    console.error('Get Order Error:', error);
    throw error;
  }
});

// PATCH /api/orders/[id] - Update order status (status transitions)
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const { id } = params;
  const body = await request.json();
  const { status, notes } = body;

  if (!status) {
    throw Errors.VALIDATION_ERROR;
  }

  try {
    // Use OrderWorkflowEngine for status transitions
    await OrderWorkflowEngine.transitionOrder(
      id,
      status as OrderStatus,
      session.user.id,
      session.user.role as Role,
      notes
    );

    // Get updated order
    const updatedOrder = await db.order.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, emails: true } },
        orderItems: true,
        statusHistory: { 
          orderBy: { changed_at: 'desc' }, 
          take: 1 
        }
      }
    });

    return createSuccessResponse(
      {
        ...updatedOrder,
        progress_percentage: OrderWorkflowEngine.getStatusProgress(status),
        available_transitions: await OrderWorkflowEngine.getAvailableTransitions(
          id,
          session.user.role as Role
        )
      },
      'Order status updated successfully'
    );

  } catch (error) {
    console.error('Order Status Update Error:', error);
    throw error;
  }
});

// Helper Functions
function calculateEstimatedCompletion(status: OrderStatus, dueDate: Date | null): string | null {
  if (!dueDate) return null;
  
  const progress = OrderWorkflowEngine.getStatusProgress(status);
  const totalDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const remainingWork = (100 - progress) / 100;
  const estimatedDays = Math.ceil(totalDays * remainingWork);
  
  if (estimatedDays <= 0) return 'Overdue';
  if (estimatedDays === 1) return 'Tomorrow';
  if (estimatedDays <= 7) return `${estimatedDays} days`;
  if (estimatedDays <= 30) return `${Math.ceil(estimatedDays / 7)} weeks`;
  
  return `${Math.ceil(estimatedDays / 30)} months`;
}

function assessOrderRisk(order: any): 'low' | 'medium' | 'high' {
  if (!order.due_date) return 'low';
  
  const now = new Date();
  const dueDate = new Date(order.due_date);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const progress = OrderWorkflowEngine.getStatusProgress(order.status);
  
  if (daysUntilDue < 0) return 'high'; // Overdue
  if (daysUntilDue <= 3 && progress < 80) return 'high';
  if (daysUntilDue <= 7 && progress < 50) return 'medium';
  if (daysUntilDue <= 14 && progress < 25) return 'medium';
  
  return 'low';
}

async function getProductionMetrics(order_id: string) {
  try {
    const [sewingRuns, productionLogs, qcInspections] = await Promise.all([
      db.sewingRun.findMany({
        where: { order_id },
        select: {
          id: true,
          quantity: true,
          status: true,
          completed_quantity: true,
          efficiency_rate: true
        }
      }),
      db.productionLog.findMany({
        where: { order_id },
        select: {
          update_type: true,
          timestamp: true
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),
      db.qcInspection.findMany({
        where: { order_id },
        select: {
          status: true,
          pass_rate: true,
          defect_count: true
        }
      })
    ]);

    return {
      sewing_runs: sewingRuns,
      recent_activities: productionLogs,
      quality_metrics: qcInspections
    };
  } catch (_error) {
    console.warn('Failed to get production metrics:', _error);
    return null;
  }
}