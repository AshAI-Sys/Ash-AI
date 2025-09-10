import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, createErrorResponse, Errors } from '@/lib/api-error-handler'
import { OrderWorkflowEngine } from '@/lib/order-workflow'

// ASH AI Enhanced Order Management System - CLIENT_UPDATED_PLAN.md Implementation
// Complete order lifecycle management with workflow automation

const OrderCreateSchema = z.object({
  client_id: z.string().uuid(),
  po_number: z.string().optional(),
  total_amount: z.number().positive(),
  due_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_type: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    specifications: z.record(z.any()).optional()
  }))
});

const OrderUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  total_amount: z.number().positive().optional(),
  due_date: z.string().datetime().optional(),
  notes: z.string().optional()
});

// GET /api/orders - List orders with real-time status and AI insights
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as OrderStatus | null;
  const client_id = searchParams.get('client_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Get workspace ID (in production, this would come from session)
    const workspace_id = 'default';

    const [orders, totalCount] = await Promise.all([
      db.order.findMany({
        where: {
          workspace_id,
          ...(status && { status }),
          ...(client_id && { client_id })
        },
        include: {
          client: {
            select: { id: true, name: true, emails: true }
          },
          orderItems: {
            select: { id: true, product_type: true, quantity: true, unit_price: true }
          },
          statusHistory: {
            select: { status: true, changed_at: true, notes: true },
            orderBy: { changed_at: 'desc' },
            take: 1
          },
          _count: {
            select: { orderItems: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      db.order.count({
        where: {
          workspace_id,
          ...(status && { status }),
          ...(client_id && { client_id })
        }
      })
    ]);

    // Enhance orders with progress and AI insights
    const enhancedOrders = orders.map(order => ({
      ...order,
      progress_percentage: OrderWorkflowEngine.getStatusProgress(order.status),
      available_transitions: [], // Will be populated on individual order view
      total_items: order._count.orderItems,
      estimated_completion: calculateEstimatedCompletion(order.status, order.due_date),
      risk_assessment: assessOrderRisk(order),
      recent_activity: order.statusHistory[0] || null
    }));

    return createSuccessResponse({
      orders: enhancedOrders,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      summary: {
        total_orders: totalCount,
        by_status: await getOrderStatusSummary(workspace_id)
      }
    });

  } catch (_error) {
    console.error('Orders API Error:', error);
    throw Errors.DATABASE_ERROR;
  }
});

// POST /api/orders - Create new order with automatic workflow initiation
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const body = await request.json();
  const validatedData = OrderCreateSchema.parse(body);

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Generate PO number if not provided
    const po_number = validatedData.po_number || await generatePONumber(workspace_id);

    // Create order with items in transaction
    const order = await db.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          po_number,
          client_id: validatedData.client_id,
          status: 'INTAKE',
          total_amount: validatedData.total_amount,
          due_date: validatedData.due_date ? new Date(validatedData.due_date) : null,
          notes: validatedData.notes,
          workspace_id,
          created_by: user_id
        }
      });

      // Create order items
      await tx.orderItem.createMany({
        data: validatedData.items.map(item => ({
          order_id: newOrder.id,
          product_type: item.product_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          specifications: item.specifications ? JSON.stringify(_item.specifications) : null,
          workspace_id,
          created_by: user_id
        }))
      });

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          order_id: newOrder.id,
          status: 'INTAKE',
          changed_by: user_id,
          notes: 'Order created',
          workspace_id
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id,
          actor_id: user_id,
          entity_type: 'ORDER',
          entity_id: newOrder.id,
          action: 'CREATE',
          after_data: JSON.stringify(validatedData)
        }
      });

      return newOrder;
    });

    // Get complete order with relations
    const completeOrder = await db.order.findUnique({
      where: { id: order.id },
      include: {
        client: { select: { id: true, name: true, emails: true } },
        orderItems: true,
        statusHistory: { orderBy: { changed_at: 'desc' } }
      }
    });

    return createSuccessResponse(
      {
        ...completeOrder,
        progress_percentage: 0,
        available_transitions: await OrderWorkflowEngine.getAvailableTransitions(
          order.id,
          session.user.role as Role
        )
      },
      'Order created successfully',
      201
    );

  } catch (_error) {
    console.error('Order Creation Error:', error);
    throw error;
  }
});

// Helper Functions
async function generatePONumber(workspace_id: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.order.count({
    where: {
      workspace_id,
      created_at: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }
  });
  
  return `ASH-${year}-${String(count + 1).padStart(6, '0')}`;
}

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

async function getOrderStatusSummary(workspace_id: string) {
  const statusCounts = await db.order.groupBy({
    by: ['status'],
    where: { workspace_id },
    _count: { status: true }
  });

  return statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {} as Record<string, number>);
}