import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, createErrorResponse, Errors } from '@/lib/api-error-handler'

// Production Tracking System - CLIENT_UPDATED_PLAN.md Implementation
// Real-time production monitoring with stage transitions and performance metrics

const ProductionStageSchema = z.object({
  order_id: z.string().uuid(),
  stage: z.enum(['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING']),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'FAILED']),
  started_by: z.string().uuid().optional(),
  completed_by: z.string().uuid().optional(),
  notes: z.string().optional(),
  quality_score: z.number().min(0).max(100).optional(),
  efficiency_percentage: z.number().min(0).max(200).optional(),
  defect_count: z.number().min(0).optional(),
  machine_id: z.string().optional(),
  operator_id: z.string().optional()
});

const ProductionMetricsSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  stage: z.enum(['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING']).optional(),
  order_id: z.string().uuid().optional()
});

// GET /api/production/tracking - Get production tracking data with real-time metrics
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const { searchParams } = new URL(request.url);
  const order_id = searchParams.get('order_id');
  const stage = searchParams.get('stage');
  const status = searchParams.get('status');
  const active_only = searchParams.get('active_only') === 'true';

  try {
    const workspace_id = 'default';

    // If specific order requested, return detailed tracking
    if (order_id) {
      const tracking = await getOrderProductionTracking(order_id, workspace_id);
      return createSuccessResponse(tracking);
    }

    // Get production overview with real-time data
    const productionData = await getProductionOverview(workspace_id, {
      stage: stage as any,
      status: status as any,
      active_only
    });

    return createSuccessResponse(productionData);

  } catch (error) {
    console.error('Production Tracking API Error:', error);
    throw Errors.DATABASE_ERROR;
  }
});

// POST /api/production/tracking - Update production stage status
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  // Check permissions for production updates
  const userRole = session.user.role as Role;
  if (!['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER', 'OPERATOR'].includes(userRole)) {
    throw Errors.FORBIDDEN;
  }

  const body = await request.json();
  const validatedData = ProductionStageSchema.parse(body);

  try {
    const workspace_id = 'default';
    const userId = session.user.id;

    // Update production tracking with stage transition
    const updatedTracking = await db.$transaction(async (tx) => {
      // Get current tracking record
      let tracking = await tx.productionTracking.findFirst({
        where: {
          order_id: validatedData.order_id,
          stage: validatedData.stage,
          workspace_id
        }
      });

      if (!tracking) {
        // Create new tracking record
        tracking = await tx.productionTracking.create({
          data: {
            order_id: validatedData.order_id,
            stage: validatedData.stage,
            status: validatedData.status,
            started_at: validatedData.status === 'IN_PROGRESS' ? new Date() : null,
            started_by: validatedData.status === 'IN_PROGRESS' ? userId : null,
            completed_at: validatedData.status === 'COMPLETED' ? new Date() : null,
            completed_by: validatedData.status === 'COMPLETED' ? userId : null,
            notes: validatedData.notes,
            quality_score: validatedData.quality_score,
            efficiency_percentage: validatedData.efficiency_percentage,
            defect_count: validatedData.defect_count || 0,
            machine_id: validatedData.machine_id,
            operator_id: validatedData.operator_id || userId,
            workspace_id
          }
        });
      } else {
        // Update existing tracking record
        const updateData: any = {
          status: validatedData.status,
          notes: validatedData.notes,
          quality_score: validatedData.quality_score,
          efficiency_percentage: validatedData.efficiency_percentage,
          defect_count: validatedData.defect_count,
          machine_id: validatedData.machine_id,
          operator_id: validatedData.operator_id || tracking.operator_id
        };

        // Set timestamps based on status
        if (validatedData.status === 'IN_PROGRESS' && !tracking.started_at) {
          updateData.started_at = new Date();
          updateData.started_by = userId;
        }
        
        if (validatedData.status === 'COMPLETED') {
          updateData.completed_at = new Date();
          updateData.completed_by = userId;
          updateData.actual_duration = tracking.started_at 
            ? Math.round((Date.now() - tracking.started_at.getTime()) / 60000) // minutes
            : null;
        }

        tracking = await tx.productionTracking.update({
          where: { id: tracking.id },
          data: updateData
        });
      }

      // Create production history entry
      await tx.productionHistory.create({
        data: {
          production_tracking_id: tracking.id,
          stage: validatedData.stage,
          status: validatedData.status,
          changed_by: userId,
          notes: validatedData.notes || `Status changed to ${validatedData.status}`,
          quality_score: validatedData.quality_score,
          efficiency_percentage: validatedData.efficiency_percentage,
          workspace_id
        }
      });

      // Update order status if this stage completion affects order workflow
      if (validatedData.status === 'COMPLETED') {
        await updateOrderProgressFromProduction(tx, validatedData.order_id, workspace_id);
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id,
          actor_id: userId,
          entity_type: 'PRODUCTION_TRACKING',
          entity_id: tracking.id,
          action: 'UPDATE',
          after_data: JSON.stringify({
            stage: validatedData.stage,
            status: validatedData.status,
            notes: validatedData.notes
          })
        }
      });

      return tracking;
    });

    // Get updated tracking with relations for response
    const completeTracking = await db.productionTracking.findUnique({
      where: { id: updatedTracking.id },
      include: {
        order: { select: { po_number: true, client: { select: { name: true } } } },
        operator: { select: { name: true } },
        machine: { select: { name: true, code: true } }
      }
    });

    return createSuccessResponse(
      completeTracking,
      'Production tracking updated successfully'
    );

  } catch (error) {
    console.error('Production Tracking Update Error:', error);
    throw error;
  }
});

// Helper Functions
async function getOrderProductionTracking(order_id: string, workspace_id: string) {
  const order = await db.order.findUnique({
    where: { id: order_id },
    include: {
      client: { select: { name: true } },
      productionTracking: {
        include: {
          operator: { select: { name: true } },
          machine: { select: { name: true, code: true } },
          history: {
            orderBy: { changed_at: 'desc' },
            take: 5,
            include: {
              changedBy: { select: { name: true } }
            }
          }
        },
        orderBy: { created_at: 'asc' }
      }
    }
  });

  if (!order) {
    throw Errors.ORDER_NOT_FOUND;
  }

  // Calculate overall progress and metrics
  const stages = ['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING'];
  const completedStages = order.productionTracking.filter(t => t.status === 'COMPLETED').length;
  const overallProgress = (completedStages / stages.length) * 100;

  // Calculate efficiency and quality metrics
  const completedTasks = order.productionTracking.filter(t => t.status === 'COMPLETED');
  const avgQuality = completedTasks.length > 0 
    ? completedTasks.reduce((sum, t) => sum + (t.quality_score || 0), 0) / completedTasks.length 
    : 0;
  const avgEfficiency = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + (t.efficiency_percentage || 0), 0) / completedTasks.length
    : 0;
  const totalDefects = completedTasks.reduce((sum, t) => sum + (t.defect_count || 0), 0);

  return {
    order: {
      id: order.id,
      po_number: order.po_number,
      client_name: order.client?.name,
      status: order.status,
      due_date: order.due_date
    },
    tracking: order.productionTracking,
    metrics: {
      overall_progress: Math.round(overallProgress),
      completed_stages: completedStages,
      total_stages: stages.length,
      average_quality: Math.round(avgQuality * 10) / 10,
      average_efficiency: Math.round(avgEfficiency * 10) / 10,
      total_defects: totalDefects,
      current_stage: getCurrentStage(order.productionTracking),
      estimated_completion: calculateEstimatedCompletion(order.productionTracking, order.due_date)
    }
  };
}

async function getProductionOverview(
  workspace_id: string, 
  filters: { stage?: string; status?: string; active_only?: boolean }
) {
  const whereClause: any = { workspace_id };
  
  if (filters.stage) whereClause.stage = filters.stage;
  if (filters.status) whereClause.status = filters.status;
  if (filters.active_only) {
    whereClause.status = { in: ['PLANNED', 'IN_PROGRESS'] };
  }

  const [trackingData, todayMetrics, weeklyTrends] = await Promise.all([
    // Current production tracking
    db.productionTracking.findMany({
      where: whereClause,
      include: {
        order: { 
          select: { 
            po_number: true, 
            due_date: true,
            client: { select: { name: true } }
          } 
        },
        operator: { select: { name: true } },
        machine: { select: { name: true, code: true } }
      },
      orderBy: { updated_at: 'desc' },
      take: 100
    }),
    // Today's metrics
    db.productionTracking.aggregate({
      where: {
        workspace_id,
        updated_at: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      _count: { id: true },
      _avg: { efficiency_percentage: true, quality_score: true },
      _sum: { defect_count: true }
    }),
    // Weekly trends
    getWeeklyProductionTrends(workspace_id)
  ]);

  // Group tracking by stage and status
  const stageStatus = trackingData.reduce((acc, item) => {
    if (!acc[item.stage]) acc[item.stage] = {};
    if (!acc[item.stage][item.status]) acc[item.stage][item.status] = 0;
    acc[item.stage][item.status]++;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  return {
    active_production: trackingData,
    summary: {
      total_active: trackingData.length,
      by_stage: stageStatus,
      today_metrics: {
        completed_tasks: todayMetrics._count.id || 0,
        average_efficiency: Math.round((todayMetrics._avg.efficiency_percentage || 0) * 10) / 10,
        average_quality: Math.round((todayMetrics._avg.quality_score || 0) * 10) / 10,
        total_defects: todayMetrics._sum.defect_count || 0
      }
    },
    trends: weeklyTrends
  };
}

async function updateOrderProgressFromProduction(tx: any, order_id: string, workspace_id: string) {
  // Get all production stages for the order
  const allTracking = await tx.productionTracking.findMany({
    where: { order_id, workspace_id }
  });

  const stages = ['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING'];
  const completedStages = allTracking.filter(t => t.status === 'COMPLETED').length;

  // Update order status based on production progress
  let newOrderStatus = null;
  if (completedStages === stages.length) {
    newOrderStatus = 'READY_FOR_DELIVERY';
  } else if (completedStages >= 4) { // QC stage
    newOrderStatus = 'QC';
  } else if (completedStages > 0) {
    newOrderStatus = 'IN_PROGRESS';
  }

  if (newOrderStatus) {
    await tx.order.update({
      where: { id: order_id },
      data: { status: newOrderStatus }
    });
  }
}

function getCurrentStage(trackingData: any[]): string | null {
  const inProgress = trackingData.find(t => t.status === 'IN_PROGRESS');
  if (inProgress) return inProgress.stage;

  const stages = ['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING'];
  const completedStages = trackingData
    .filter(t => t.status === 'COMPLETED')
    .map(t => t.stage);

  for (const stage of stages) {
    if (!completedStages.includes(stage)) {
      return stage;
    }
  }

  return 'COMPLETED';
}

function calculateEstimatedCompletion(trackingData: any[], dueDate: Date | null): string | null {
  if (!dueDate) return null;

  const stages = ['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING'];
  const completedStages = trackingData.filter(t => t.status === 'COMPLETED').length;
  const remainingStages = stages.length - completedStages;

  if (remainingStages === 0) return 'Ready for delivery';

  // Estimate based on average stage completion time
  const avgHoursPerStage = 8; // Default estimate
  const remainingHours = remainingStages * avgHoursPerStage;
  const estimatedCompletion = new Date(Date.now() + remainingHours * 60 * 60 * 1000);

  const daysUntilCompletion = Math.ceil((estimatedCompletion.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntilCompletion <= daysUntilDue) {
    return `On track (${daysUntilCompletion} days)`;
  } else {
    return `Delayed (${daysUntilCompletion - daysUntilDue} days behind)`;
  }
}

async function getWeeklyProductionTrends(workspace_id: string) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weeklyData = await db.productionTracking.findMany({
    where: {
      workspace_id,
      completed_at: { gte: oneWeekAgo }
    },
    select: {
      completed_at: true,
      stage: true,
      efficiency_percentage: true,
      quality_score: true,
      defect_count: true
    }
  });

  // Group by day and calculate metrics
  const dailyMetrics = weeklyData.reduce((acc, item) => {
    if (!item.completed_at) return acc;
    
    const day = item.completed_at.toISOString().split('T')[0];
    if (!acc[day]) {
      acc[day] = { completed: 0, efficiency: [], quality: [], defects: 0 };
    }
    
    acc[day].completed++;
    if (item.efficiency_percentage) acc[day].efficiency.push(item.efficiency_percentage);
    if (item.quality_score) acc[day].quality.push(item.quality_score);
    acc[day].defects += item.defect_count || 0;
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate averages
  Object.keys(dailyMetrics).forEach(day => {
    const metrics = dailyMetrics[day];
    metrics.avg_efficiency = metrics.efficiency.length > 0 
      ? metrics.efficiency.reduce((a: number, b: number) => a + b, 0) / metrics.efficiency.length 
      : 0;
    metrics.avg_quality = metrics.quality.length > 0
      ? metrics.quality.reduce((a: number, b: number) => a + b, 0) / metrics.quality.length
      : 0;
    delete metrics.efficiency;
    delete metrics.quality;
  });

  return dailyMetrics;
}