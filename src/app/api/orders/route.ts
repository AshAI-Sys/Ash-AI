// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, OrderStatus, ProductMethod } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, createErrorResponse, Errors, AppError } from '@/lib/api-error-handler'
import type { ProductMethod, OrderStatus as PrismaOrderStatus } from '@prisma/client'
import { OrderWorkflowEngine } from '@/lib/order-workflow'

// ASH AI Enhanced Order Management System - CLIENT_UPDATED_PLAN.md Implementation
// Complete order lifecycle management with workflow automation

// Enhanced Order Schema for ASH AI TikTok-style form
const OrderCreateSchema = z.object({
  // Core order info
  client_id: z.string().uuid().optional(),
  brand_id: z.string().uuid(),
  po_number: z.string().optional(),
  
  // Enhanced Company/Client Information
  company_name: z.string().min(1, "Company name is required"),
  requested_deadline: z.string().datetime(),
  
  // Product Details
  product_name: z.string().min(1, "Product name is required"),
  product_type: z.string(),
  service_type: z.string(), // "Sew and Print / Embro", "Sew Only", "Print / Embro Only"
  garment_type: z.string().optional(),
  fabric_type: z.string().optional(),
  fabric_colors: z.array(z.string()).optional(),
  method: z.nativeEnum(ProductMethod),
  
  // Options (20 checkboxes as JSON)
  options: z.record(z.boolean()).optional(),
  
  // Design Info
  screen_printed: z.boolean().default(false),
  embroidered_sublim: z.boolean().default(false),
  size_label: z.enum(["Sew", "Print", "None"]).optional(),
  
  // Quantity & Specifications
  estimated_quantity: z.number().positive().optional(),
  total_qty: z.number().positive(),
  size_curve: z.record(z.number()).default({}),
  variants: z.array(z.object({
    color: z.string(),
    qty: z.number().positive()
  })).optional(),
  
  // Files
  images: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
    type: z.string().optional()
  })).max(10, "Maximum 10 images allowed").optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
    type: z.enum(["pdf", "ai", "psd", "zip"])
  })).optional(),
  
  // Legacy fields for compatibility
  target_delivery_date: z.string().datetime(),
  commercials: z.object({
    unit_price: z.number().positive().optional(),
    deposit_pct: z.number().min(0).max(100).optional(),
    terms: z.string().optional(),
    tax_mode: z.enum(["VAT_INCLUSIVE", "VAT_EXCLUSIVE", "NON_VAT"]).optional(),
    currency: z.string().default("PHP")
  }).optional(),
  
  clothing_type: z.string().optional(),
  order_type: z.string().optional(),
  notes: z.string().optional(),
  addons: z.array(z.object({
    name: z.string(),
    price: z.number(),
    quantity: z.number().optional()
  })).optional()
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

  } catch (error) {
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

    // Generate ASH AI PO number using brand-specific format
    const { generatePONumber } = await import('@/lib/po-generator');
    const po_result = validatedData.po_number 
      ? { po_number: validatedData.po_number, sequence: 0 }
      : await generatePONumber(validatedData.brand_id);
    const po_number = po_result.po_number;

    // Handle client creation or retrieval
    let client_id = validatedData.client_id;
    if (!client_id && validatedData.company_name) {
      // Create new client if company name provided but no client_id
      const newClient = await db.client.create({
        data: {
          workspace_id,
          name: validatedData.company_name,
          company: validatedData.company_name,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      client_id = newClient.id;
    }

    if (!client_id) {
      throw new AppError('CLIENT_REQUIRED', 'Client ID or company name is required', 400);
    }

    // Create enhanced order with all new fields
    const order = await db.$transaction(async (tx) => {
      // Create the order with enhanced fields
      const newOrder = await tx.order.create({
        data: {
          // Core identification
          workspace_id,
          brand_id: validatedData.brand_id,
          client_id,
          po_number,
          created_by: user_id,
          
          // Enhanced Company/Client Information
          company_name: validatedData.company_name,
          requested_deadline: new Date(validatedData.requested_deadline),
          
          // Product Details
          product_name: validatedData.product_name,
          product_type: validatedData.product_type,
          service_type: validatedData.service_type,
          garment_type: validatedData.garment_type,
          fabric_type: validatedData.fabric_type,
          fabric_colors: validatedData.fabric_colors || [],
          method: validatedData.method,
          
          // Options (checkboxes)
          options: validatedData.options || {},
          
          // Design Info
          screen_printed: validatedData.screen_printed,
          embroidered_sublim: validatedData.embroidered_sublim,
          size_label: validatedData.size_label,
          
          // Quantity & Files
          estimated_quantity: validatedData.estimated_quantity,
          total_qty: validatedData.total_qty,
          size_curve: validatedData.size_curve,
          variants: validatedData.variants || [],
          images: validatedData.images || [],
          attachments: validatedData.attachments || [],
          
          // Core order fields
          target_delivery_date: new Date(validatedData.target_delivery_date),
          commercials: validatedData.commercials || {},
          clothing_type: validatedData.clothing_type,
          order_type: validatedData.order_type,
          notes: validatedData.notes,
          addons: validatedData.addons || [],
          
          // Status and timestamps
          status: OrderStatus.INTAKE,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create order items from variants or default item
      const orderItems = [];
      
      if (validatedData.variants && validatedData.variants.length > 0) {
        // Create items from variants (color/qty breakdown)
        for (const variant of validatedData.variants) {
          // Generate SKU for this variant
          const sku = `${validatedData.product_name?.replace(/\s+/g, '-').toUpperCase()}-${variant.color.replace(/\s+/g, '-').toUpperCase()}`;
          
          orderItems.push({
            order_id: newOrder.id,
            sku,
            product_name: validatedData.product_name,
            size: 'MIXED', // Will be broken down by size_curve
            color: variant.color,
            quantity: variant.qty,
            unit_price: validatedData.commercials?.unit_price || 0,
            total_price: variant.qty * (validatedData.commercials?.unit_price || 0),
            created_at: new Date()
          });
        }
      } else {
        // Create single item
        const sku = `${validatedData.product_name?.replace(/\s+/g, '-').toUpperCase()}-DEFAULT`;
        orderItems.push({
          order_id: newOrder.id,
          sku,
          product_name: validatedData.product_name,
          size: 'MIXED',
          color: 'DEFAULT',
          quantity: validatedData.total_qty,
          unit_price: validatedData.commercials?.unit_price || 0,
          total_price: validatedData.total_qty * (validatedData.commercials?.unit_price || 0),
          created_at: new Date()
        });
      }
      
      if (orderItems.length > 0) {
        await tx.orderItem.createMany({
          data: orderItems
        });
      }

      // Create order attachments if images provided
      if (validatedData.images && validatedData.images.length > 0) {
        await tx.orderAttachment.createMany({
          data: validatedData.images.map((image, index) => ({
            order_id: newOrder.id,
            type: 'image',
            file_url: image.url,
            meta: {
              name: image.name,
              size: image.size,
              type: image.type,
              order: index + 1
            },
            created_at: new Date()
          }))
        });
      }
      
      // Create attachment records for file attachments
      if (validatedData.attachments && validatedData.attachments.length > 0) {
        await tx.orderAttachment.createMany({
          data: validatedData.attachments.map((attachment, index) => ({
            order_id: newOrder.id,
            type: 'attachment',
            file_url: attachment.url,
            meta: {
              name: attachment.name,
              size: attachment.size,
              type: attachment.type,
              order: index + 1
            },
            created_at: new Date()
          }))
        });
      }

      // Create audit log with enhanced data
      await tx.auditLog.create({
        data: {
          workspace_id,
          actor_id: user_id,
          entity_type: 'order',
          entity_id: newOrder.id,
          action: 'CREATE',
          after_data: {
            po_number,
            company_name: validatedData.company_name,
            product_name: validatedData.product_name,
            service_type: validatedData.service_type,
            method: validatedData.method,
            total_qty: validatedData.total_qty,
            estimated_quantity: validatedData.estimated_quantity,
            requested_deadline: validatedData.requested_deadline,
            images_count: validatedData.images?.length || 0,
            attachments_count: validatedData.attachments?.length || 0,
            options_selected: Object.keys(validatedData.options || {}).filter(key => validatedData.options?.[key]).length
          },
          created_at: new Date()
        }
      });

      return newOrder;
    });

    // Get complete order with enhanced relations
    const completeOrder = await db.order.findUnique({
      where: { id: order.id },
      include: {
        workspace: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, code: true } },
        client: { select: { id: true, name: true, company: true, emails: true } },
        items: true,
        order_attachments: {
          select: {
            id: true,
            type: true,
            file_url: true,
            meta: true,
            created_at: true
          }
        }
      }
    });

    return createSuccessResponse(
      {
        id: completeOrder?.id,
        po_number,
        status: completeOrder?.status,
        company_name: completeOrder?.company_name,
        product_name: completeOrder?.product_name,
        service_type: completeOrder?.service_type,
        method: completeOrder?.method,
        total_qty: completeOrder?.total_qty,
        estimated_quantity: completeOrder?.estimated_quantity,
        requested_deadline: completeOrder?.requested_deadline,
        target_delivery_date: completeOrder?.target_delivery_date,
        images: completeOrder?.images,
        attachments: completeOrder?.attachments,
        options: completeOrder?.options,
        brand: completeOrder?.brand,
        client: completeOrder?.client,
        workspace: completeOrder?.workspace,
        items: completeOrder?.items,
        order_attachments: completeOrder?.order_attachments,
        progress_percentage: 0,
        available_transitions: [], // Will be populated by workflow engine
        created_at: completeOrder?.created_at,
        updated_at: completeOrder?.updated_at
      },
      `ASH AI Order ${po_number} created successfully! 🎯`,
      201
    );

  } catch (error) {
    console.error('Order Creation Error:', error);
    throw error;
  }
});

// Helper Functions
// Legacy fallback PO number generator
async function generateLegacyPONumber(workspace_id: string): Promise<string> {
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

// PUT /api/orders - Update order details (bulk update)
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const body = await request.json();
  const { id, ...updateData } = body;
  
  if (!id) {
    throw Errors.VALIDATION_ERROR;
  }

  const validatedData = OrderUpdateSchema.parse(updateData);

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Get existing order
    const existingOrder = await db.order.findUnique({
      where: { id, workspace_id }
    });

    if (!existingOrder) {
      throw Errors.NOT_FOUND;
    }

    // Update order in transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          ...validatedData,
          due_date: validatedData.due_date ? new Date(validatedData.due_date) : undefined,
          updated_by: user_id,
          updated_at: new Date()
        },
        include: {
          client: { select: { id: true, name: true, emails: true } },
          orderItems: true,
          statusHistory: { orderBy: { changed_at: 'desc' }, take: 5 }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id,
          actor_id: user_id,
          entity_type: 'ORDER',
          entity_id: id,
          action: 'UPDATE',
          before_data: JSON.stringify(existingOrder),
          after_data: JSON.stringify(validatedData)
        }
      });

      return order;
    });

    return createSuccessResponse(
      {
        ...updatedOrder,
        progress_percentage: OrderWorkflowEngine.getStatusProgress(updatedOrder.status),
        available_transitions: await OrderWorkflowEngine.getAvailableTransitions(
          id,
          session.user.role as Role
        )
      },
      'Order updated successfully'
    );

  } catch (error) {
    console.error('Order Update Error:', error);
    throw error;
  }
});

// DELETE /api/orders - Cancel order (soft delete)
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    throw Errors.VALIDATION_ERROR;
  }

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Check if order can be cancelled
    const order = await db.order.findUnique({
      where: { id, workspace_id }
    });

    if (!order) {
      throw Errors.NOT_FOUND;
    }

    // Only allow cancellation of orders that haven't started production
    const cancellableStatuses: OrderStatus[] = ['INTAKE', 'DESIGN_PENDING', 'DESIGN_APPROVAL', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new AppError(
        'CANNOT_CANCEL',
        'Orders in production cannot be cancelled. Use status transition to ON_HOLD instead.',
        400
      );
    }

    // Cancel order in transaction
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          updated_by: user_id,
          updated_at: new Date()
        }
      });

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          order_id: id,
          status: 'CANCELLED',
          changed_by: user_id,
          notes: 'Order cancelled',
          workspace_id
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id,
          actor_id: user_id,
          entity_type: 'ORDER',
          entity_id: id,
          action: 'DELETE',
          before_data: JSON.stringify({ status: order.status }),
          after_data: JSON.stringify({ status: 'CANCELLED' })
        }
      });
    });

    return createSuccessResponse(null, 'Order cancelled successfully');

  } catch (error) {
    console.error('Order Cancellation Error:', error);
    throw error;
  }
});