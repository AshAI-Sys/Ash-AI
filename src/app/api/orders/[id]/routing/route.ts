import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { routingEngine, OrderContext } from '@/lib/routing-engine'

// ASH AI - Order Routing Management API
// Intelligent production routing with Ashley AI recommendations

const RoutingStepUpdateSchema = z.object({
  step_id: z.string(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'SKIPPED']),
  notes: z.string().optional(),
  actual_hours: z.number().optional(),
  assigned_to: z.string().optional()
});

// GET /api/orders/[id]/routing - Get order routing plan and progress
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
    const [order, routingSteps, sewingRuns] = await Promise.all([
      db.order.findUnique({
        where: { id: order_id },
        include: {
          orderItems: {
            select: {
              id: true,
              product_type: true,
              quantity: true,
              specifications: true
            }
          }
        }
      }),
      db.routingStep.findMany({
        where: { order_id },
        include: {
          assignedTo: { select: { name: true, role: true } }
        },
        orderBy: { sequence: 'asc' }
      }),
      db.sewingRun.findMany({
        where: { order_id },
        select: {
          id: true,
          routing_template_id: true,
          estimated_completion: true,
          efficiency_target: true,
          status: true
        }
      })
    ]);

    if (!order) {
      throw Errors.NOT_FOUND;
    }

    // Generate Ashley AI routing recommendations if no routing exists
    let recommendations = null;
    if (routingSteps.length === 0 && order.orderItems.length > 0) {
      const item = order.orderItems[0];
      const specs = item.specifications ? JSON.parse(item.specifications as string) : {};
      
      const orderContext: OrderContext = {
        productType: item.product_type,
        method: specs.printing_method || 'Silkscreen',
        quantity: item.quantity,
        target_delivery_date: order.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        brand_id: order.client_id,
        hasComplexDesign: specs.complexity === 'HIGH',
        isPriority: specs.priority === 'HIGH'
      };

      recommendations = routingEngine.getAshleyRecommendation(orderContext);
    }

    // Calculate routing progress
    const totalSteps = routingSteps.length;
    const completedSteps = routingSteps.filter(step => step.status === 'COMPLETED').length;
    const routingProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Get current active step
    const activeStep = routingSteps.find(step => step.status === 'IN_PROGRESS');
    const nextStep = routingSteps.find(step => step.status === 'PLANNED');

    return createSuccessResponse({
      order: {
        id: order.id,
        po_number: order.po_number,
        status: order.status,
        due_date: order.due_date
      },
      routing_plan: {
        steps: routingSteps.map(step => ({
          ...step,
          assigned_to_name: step.assignedTo?.name,
          assigned_to_role: step.assignedTo?.role
        })),
        progress_percentage: routingProgress,
        total_steps: totalSteps,
        completed_steps: completedSteps,
        active_step: activeStep,
        next_step: nextStep
      },
      sewing_runs: sewingRuns,
      ashley_recommendations: recommendations
    });

  } catch (error) {
    console.error('Routing Retrieval Error:', error);
    throw error;
  }
});

// PUT /api/orders/[id]/routing - Update routing step status
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
  const validatedData = RoutingStepUpdateSchema.parse(body);

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Get the routing step
    const routingStep = await db.routingStep.findFirst({
      where: {
        id: validatedData.step_id,
        order_id: order_id
      }
    });

    if (!routingStep) {
      throw Errors.NOT_FOUND;
    }

    // Update routing step
    const updatedStep = await db.$transaction(async (tx) => {
      // Update the step
      const step = await tx.routingStep.update({
        where: { id: validatedData.step_id },
        data: {
          status: validatedData.status,
          actual_hours: validatedData.actual_hours,
          assigned_to: validatedData.assigned_to,
          completed_at: validatedData.status === 'COMPLETED' ? new Date() : null,
          updated_at: new Date(),
          updated_by: user_id
        }
      });

      // Create routing log
      await tx.routingStepLog.create({
        data: {
          routing_step_id: validatedData.step_id,
          status: validatedData.status,
          notes: validatedData.notes || `Step ${validatedData.status.toLowerCase()}`,
          changed_by: user_id,
          changed_at: new Date(),
          workspace_id
        }
      });

      // Update production tracking if step completed
      if (validatedData.status === 'COMPLETED') {
        await tx.productionTracking.updateMany({
          where: {
            order_id: order_id,
            routing_step_id: validatedData.step_id
          },
          data: {
            status: 'COMPLETED',
            completed_at: new Date()
          }
        });

        // Start next step if exists
        const nextStep = await tx.routingStep.findFirst({
          where: {
            order_id: order_id,
            sequence: routingStep.sequence + 1,
            status: 'PLANNED'
          }
        });

        if (nextStep) {
          await tx.routingStep.update({
            where: { id: nextStep.id },
            data: {
              status: 'IN_PROGRESS',
              started_at: new Date()
            }
          });

          await tx.productionTracking.create({
            data: {
              order_id: order_id,
              routing_step_id: nextStep.id,
              stage: nextStep.department,
              status: 'IN_PROGRESS',
              started_at: new Date()
            }
          });
        }
      }

      return step;
    });

    return createSuccessResponse(
      {
        updated_step: updatedStep,
        message: `Routing step ${validatedData.status.toLowerCase()} successfully`
      },
      'Routing step updated successfully'
    );

  } catch (error) {
    console.error('Routing Step Update Error:', error);
    throw error;
  }
});

// POST /api/orders/[id]/routing - Generate routing plan using Ashley AI
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const order_id = params.id;
  const body = await request.json();
  const { regenerate = false } = body;

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Get order with items
    const order = await db.order.findUnique({
      where: { id: order_id },
      include: {
        orderItems: true,
        client: { select: { preferences: true } }
      }
    });

    if (!order) {
      throw Errors.NOT_FOUND;
    }

    // Check if routing already exists
    const existingRouting = await db.routingStep.findMany({
      where: { order_id }
    });

    if (existingRouting.length > 0 && !regenerate) {
      return createSuccessResponse(
        { message: 'Routing plan already exists. Use regenerate=true to recreate.' },
        'Routing already exists'
      );
    }

    // Clear existing routing if regenerating
    if (regenerate && existingRouting.length > 0) {
      await db.routingStep.deleteMany({
        where: { order_id }
      });
    }

    // Generate routing plan using workflow engine logic
    await createProductionPlan(order_id, user_id);

    // Get the newly created routing
    const newRouting = await db.routingStep.findMany({
      where: { order_id },
      orderBy: { sequence: 'asc' }
    });

    return createSuccessResponse(
      {
        routing_steps: newRouting,
        total_steps: newRouting.length,
        message: 'Ashley AI routing plan generated successfully'
      },
      'Routing plan generated',
      201
    );

  } catch (error) {
    console.error('Routing Generation Error:', error);
    throw error;
  }
});

// Helper function (import from order-workflow)
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
    }
  }
}