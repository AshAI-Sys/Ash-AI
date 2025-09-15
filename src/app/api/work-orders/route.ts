// 🎖️ WORK ORDER MANAGEMENT API
// Commander Protocol: Automated work order creation and management endpoints
// Neural ERP - Work Order Intelligence System

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { workOrderManager, WorkOrderType, WorkOrderStatus, WorkOrderPriority } from '@/lib/work-order-manager';
import { z } from 'zod';

// Validation schemas
const CreateWorkOrderSchema = z.object({
  type: z.enum(['PRODUCTION', 'MAINTENANCE', 'QUALITY_CHECK', 'SETUP', 'CLEANUP', 'MATERIAL_PREP', 'PACKAGING']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']),
  title: z.string().min(1),
  description: z.string().min(1),
  order_id: z.string().uuid().optional(),
  production_stage: z.string().optional(),
  machine_id: z.string().optional(),
  estimated_duration_hours: z.number().positive(),
  scheduled_start: z.string().datetime(),
  materials_required: z.array(z.string()).optional(),
  tools_required: z.array(z.string()).optional(),
  skills_required: z.array(z.string()).optional(),
  instructions: z.string().min(1),
  quality_requirements: z.string().optional(),
  safety_notes: z.string().optional(),
  dependencies: z.array(z.string().uuid()).optional()
});

const UpdateWorkOrderSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'BLOCKED']).optional(),
  assigned_to: z.string().uuid().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  completion_notes: z.string().optional(),
  completion_photos: z.array(z.string()).optional(),
  quality_rating: z.number().min(1).max(5).optional(),
  materials_used: z.array(z.string()).optional(),
  actual_duration_override: z.number().positive().optional()
});

// GET: Fetch work orders with filters
async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.split(',') as WorkOrderStatus[] | undefined;
    const type = searchParams.get('type')?.split(',') as WorkOrderType[] | undefined;
    const priority = searchParams.get('priority')?.split(',') as WorkOrderPriority[] | undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const date_from = searchParams.get('date_from') ? new Date(searchParams.get('date_from')!) : undefined;
    const date_to = searchParams.get('date_to') ? new Date(searchParams.get('date_to')!) : undefined;

    const workspace_id = 'default'; // Get from session in production

    const dashboardData = await workOrderManager.getDashboardData(workspace_id, {
      status,
      type,
      assigned_to,
      priority,
      date_from,
      date_to
    });

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🚨 [WORK ORDER API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch work orders' },
      { status: 500 }
    );
  }
}

// POST: Create new work order
async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = session.user.role as Role;
    if (!['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    const workspace_id = 'default'; // Get from session in production

    switch (action) {
      case 'create':
        const validatedData = CreateWorkOrderSchema.parse(data);
        const workOrder = await workOrderManager.createWorkOrder({
          ...validatedData,
          scheduled_start: new Date(validatedData.scheduled_start),
          created_by: session.user.id,
          workspace_id
        });

        return NextResponse.json({
          success: true,
          data: workOrder,
          message: `Work order ${workOrder.work_order_number} created successfully`
        });

      case 'create_from_template':
        if (!data.template_id || !data.scheduled_start) {
          return NextResponse.json(
            { success: false, error: 'Template ID and scheduled start are required' },
            { status: 400 }
          );
        }

        const templateWorkOrder = await workOrderManager.createFromTemplate(
          data.template_id,
          {
            ...data,
            scheduled_start: new Date(data.scheduled_start),
            created_by: session.user.id,
            workspace_id
          }
        );

        return NextResponse.json({
          success: true,
          data: templateWorkOrder,
          message: `Work order ${templateWorkOrder.work_order_number} created from template`
        });

      case 'generate_production':
        if (!data.order_id) {
          return NextResponse.json(
            { success: false, error: 'Order ID is required' },
            { status: 400 }
          );
        }

        const productionWorkOrders = await workOrderManager.generateProductionWorkOrders(
          data.order_id,
          session.user.id
        );

        return NextResponse.json({
          success: true,
          data: productionWorkOrders,
          message: `Generated ${productionWorkOrders.length} production work orders`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('🚨 [WORK ORDER API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Work order operation failed' },
      { status: 500 }
    );
  }
}

// PUT: Update work order
async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('id');

    if (!workOrderId) {
      return NextResponse.json(
        { success: false, error: 'Work order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'start':
        const startedWorkOrder = await workOrderManager.startWorkOrder(
          workOrderId,
          session.user.id
        );

        return NextResponse.json({
          success: true,
          data: startedWorkOrder,
          message: `Work order ${startedWorkOrder.work_order_number} started`
        });

      case 'update_progress':
        const validatedProgressData = z.object({
          progress_percentage: z.number().min(0).max(100).optional(),
          notes: z.string().optional(),
          materials_used: z.array(z.string()).optional(),
          quality_checks: z.array(z.any()).optional(),
          photos: z.array(z.string()).optional(),
          issues_encountered: z.string().optional()
        }).parse(data);

        const updatedWorkOrder = await workOrderManager.updateProgress(
          workOrderId,
          validatedProgressData
        );

        return NextResponse.json({
          success: true,
          data: updatedWorkOrder,
          message: 'Work order progress updated'
        });

      case 'complete':
        if (!data.completion_notes) {
          return NextResponse.json(
            { success: false, error: 'Completion notes are required' },
            { status: 400 }
          );
        }

        const completedWorkOrder = await workOrderManager.completeWorkOrder(
          workOrderId,
          {
            completion_notes: data.completion_notes,
            completion_photos: data.completion_photos,
            quality_rating: data.quality_rating,
            materials_used: data.materials_used,
            actual_duration_override: data.actual_duration_override
          }
        );

        return NextResponse.json({
          success: true,
          data: completedWorkOrder,
          message: `Work order ${completedWorkOrder.work_order_number} completed`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('🚨 [WORK ORDER API] PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Work order update failed' },
      { status: 500 }
    );
  }
}

export { GET, POST, PUT };