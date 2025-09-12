// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { OrderWorkflowEngine } from '@/lib/order-workflow'

// ASH AI - Order Approval Management API
// Client design approval workflow with automated notifications

const DesignApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REQUEST_CHANGES', 'REJECT']),
  notes: z.string().optional(),
  requested_changes: z.array(z.string()).optional(),
  design_asset_ids: z.array(z.string()).optional(),
  client_signature: z.string().optional()
});

const InternalApprovalSchema = z.object({
  approval_type: z.enum(['DESIGN_REVIEW', 'PRODUCTION_READY', 'QUALITY_SIGN_OFF', 'FINAL_APPROVAL']),
  approved: z.boolean(),
  notes: z.string().optional(),
  reviewer_role: z.nativeEnum(Role)
});

// GET /api/orders/[id]/approval - Get approval status and pending approvals
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw Errors.UNAUTHORIZED;
  }

  const order_id = params.id;
  const { searchParams } = new URL(request.url);
  const approvalType = searchParams.get('type') || 'all';

  try {
    const [order, designAssets, approvalHistory, pendingApprovals] = await Promise.all([
      db.order.findUnique({
        where: { id: order_id },
        include: {
          client: { select: { id: true, name: true, emails: true } }
        }
      }),
      db.designAsset.findMany({
        where: { order_id },
        orderBy: { version: 'desc' }
      }),
      db.orderApproval.findMany({
        where: { order_id },
        include: {
          approvedBy: { select: { name: true, role: true } }
        },
        orderBy: { created_at: 'desc' }
      }),
      db.orderApproval.findMany({
        where: {
          order_id,
          status: 'PENDING'
        },
        include: {
          assignedTo: { select: { name: true, role: true, emails: true } }
        }
      })
    ]);

    if (!order) {
      throw Errors.NOT_FOUND;
    }

    // Check user permissions for this order
    const canApprove = checkApprovalPermissions(order, session.user);

    // Get next required approvals based on order status
    const nextApprovals = getRequiredApprovals(order.status, order);

    // Calculate approval progress
    const totalRequired = getTotalRequiredApprovals(order.status);
    const completed = approvalHistory.filter(a => a.status === 'APPROVED').length;
    const approvalProgress = totalRequired > 0 ? (completed / totalRequired) * 100 : 100;

    return createSuccessResponse({
      order: {
        id: order.id,
        po_number: order.po_number,
        status: order.status,
        client_name: order.client?.name
      },
      approval_status: {
        current_phase: getCurrentApprovalPhase(order.status),
        progress_percentage: approvalProgress,
        can_approve: canApprove,
        requires_client_approval: requiresClientApproval(order.status),
        next_approvals: nextApprovals
      },
      design_assets: designAssets.map(asset => ({
        ...asset,
        approval_status: getAssetApprovalStatus(asset.id, approvalHistory)
      })),
      approval_history: approvalHistory,
      pending_approvals: pendingApprovals
    });

  } catch (error) {
    console.error('Approval Status Retrieval Error:', error);
    throw error;
  }
});

// POST /api/orders/[id]/approval - Submit approval decision
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
  const { approval_type } = body;

  // Route to appropriate approval handler
  if (approval_type === 'DESIGN_APPROVAL') {
    return handleDesignApproval(request, order_id, session, body);
  } else {
    return handleInternalApproval(request, order_id, session, body);
  }
});

async function handleDesignApproval(
  request: NextRequest,
  order_id: string,
  session: any,
  body: any
) {
  const validatedData = DesignApprovalSchema.parse(body);

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Get order and verify client permissions
    const order = await db.order.findUnique({
      where: { id: order_id },
      include: { client: true }
    });

    if (!order) {
      throw Errors.NOT_FOUND;
    }

    // Verify user is client or has admin rights
    const isClient = order.client_id === session.user.client_id;
    const isAdmin = ['ADMIN', 'MANAGER'].includes(session.user.role);
    
    if (!isClient && !isAdmin) {
      throw Errors.INSUFFICIENT_PERMISSIONS;
    }

    const result = await db.$transaction(async (tx) => {
      // Create approval record
      const approval = await tx.orderApproval.create({
        data: {
          order_id: order_id,
          approval_type: 'DESIGN_APPROVAL',
          status: validatedData.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          notes: validatedData.notes,
          requested_changes: validatedData.requested_changes,
          approved_by: user_id,
          approved_at: new Date(),
          workspace_id,
          metadata: JSON.stringify({
            design_asset_ids: validatedData.design_asset_ids,
            client_signature: validatedData.client_signature
          })
        }
      });

      // Update design assets if specified
      if (validatedData.design_asset_ids?.length) {
        await tx.designAsset.updateMany({
          where: { 
            id: { in: validatedData.design_asset_ids },
            order_id: order_id
          },
          data: {
            status: validatedData.action === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUIRED',
            approved_at: validatedData.action === 'APPROVE' ? new Date() : null,
            approved_by: validatedData.action === 'APPROVE' ? user_id : null
          }
        });
      }

      // Transition order status based on approval
      if (validatedData.action === 'APPROVE') {
        await OrderWorkflowEngine.transitionOrder(
          order_id,
          'CONFIRMED',
          user_id,
          session.user.role as Role,
          `Design approved by ${isClient ? 'client' : 'admin'}: ${validatedData.notes || 'No notes'}`
        );
      } else if (validatedData.action === 'REQUEST_CHANGES') {
        await OrderWorkflowEngine.transitionOrder(
          order_id,
          'DESIGN_PENDING',
          user_id,
          session.user.role as Role,
          `Changes requested: ${validatedData.requested_changes?.join(', ') || validatedData.notes}`
        );
      }

      // Create notification for team
      await tx.notification.create({
        data: {
          workspace_id,
          title: `Design ${validatedData.action.toLowerCase()}: ${order.po_number}`,
          message: `Client ${validatedData.action.toLowerCase()} design for order ${order.po_number}`,
          type: 'APPROVAL_UPDATE',
          entity_id: order_id,
          entity_type: 'ORDER',
          target_role: 'DESIGN_TEAM'
        }
      });

      return approval;
    });

    return createSuccessResponse(
      {
        approval: result,
        order_status: validatedData.action === 'APPROVE' ? 'CONFIRMED' : 'DESIGN_PENDING',
        message: `Design ${validatedData.action.toLowerCase()} processed successfully`
      },
      'Design approval processed',
      201
    );

  } catch (error) {
    console.error('Design Approval Error:', error);
    throw error;
  }
}

async function handleInternalApproval(
  request: NextRequest,
  order_id: string,
  session: any,
  body: any
) {
  const validatedData = InternalApprovalSchema.parse(body);

  try {
    const workspace_id = 'default';
    const user_id = session.user.id;

    // Verify user has permission for this approval type
    if (!hasApprovalPermission(validatedData.approval_type, session.user.role)) {
      throw Errors.INSUFFICIENT_PERMISSIONS;
    }

    const result = await db.$transaction(async (tx) => {
      // Create internal approval record
      const approval = await tx.orderApproval.create({
        data: {
          order_id: order_id,
          approval_type: validatedData.approval_type,
          status: validatedData.approved ? 'APPROVED' : 'REJECTED',
          notes: validatedData.notes,
          approved_by: user_id,
          approved_at: new Date(),
          workspace_id
        }
      });

      // Handle status transitions based on approval type
      if (validatedData.approved) {
        await handleApprovalStatusTransition(
          tx,
          order_id,
          validatedData.approval_type,
          user_id,
          session.user.role
        );
      }

      return approval;
    });

    return createSuccessResponse(
      {
        approval: result,
        message: `${validatedData.approval_type} ${validatedData.approved ? 'approved' : 'rejected'} successfully`
      },
      'Internal approval processed',
      201
    );

  } catch (error) {
    console.error('Internal Approval Error:', error);
    throw error;
  }
}

// Helper Functions
function checkApprovalPermissions(order: any, user: any): boolean {
  // Client can approve their own orders
  if (order.client_id === user.client_id) return true;
  
  // Admin/Manager can approve any order
  if (['ADMIN', 'MANAGER'].includes(user.role)) return true;
  
  // Specific role permissions based on order status
  const roleApprovals: Record<string, Role[]> = {
    'DESIGN_PENDING': ['DESIGNER', 'DESIGN_MANAGER'],
    'DESIGN_APPROVAL': ['CLIENT'],
    'PRODUCTION_PLANNED': ['PRODUCTION_MANAGER'],
    'QC': ['QC_INSPECTOR', 'QC_MANAGER']
  };
  
  return roleApprovals[order.status]?.includes(user.role) || false;
}

function getRequiredApprovals(status: OrderStatus, order: any): string[] {
  const approvalMap: Record<OrderStatus, string[]> = {
    'DESIGN_PENDING': ['Design Review'],
    'DESIGN_APPROVAL': ['Client Design Approval'],
    'CONFIRMED': ['Production Planning Approval'],
    'PRODUCTION_PLANNED': ['Production Start Approval'],
    'QC': ['Quality Control Sign-off'],
    'PACKING': ['Final Quality Approval'],
    'INTAKE': [],
    'IN_PROGRESS': [],
    'READY_FOR_DELIVERY': [],
    'DELIVERED': [],
    'CLOSED': [],
    'ON_HOLD': [],
    'CANCELLED': []
  };
  
  return approvalMap[status] || [];
}

function getCurrentApprovalPhase(status: OrderStatus): string {
  const phaseMap: Record<OrderStatus, string> = {
    'INTAKE': 'Order Processing',
    'DESIGN_PENDING': 'Design Development',
    'DESIGN_APPROVAL': 'Client Approval',
    'CONFIRMED': 'Production Planning',
    'PRODUCTION_PLANNED': 'Production Approval',
    'IN_PROGRESS': 'Production Active',
    'QC': 'Quality Control',
    'PACKING': 'Final Inspection',
    'READY_FOR_DELIVERY': 'Ready to Ship',
    'DELIVERED': 'Delivered',
    'CLOSED': 'Completed',
    'ON_HOLD': 'On Hold',
    'CANCELLED': 'Cancelled'
  };
  
  return phaseMap[status] || 'Unknown';
}

function requiresClientApproval(status: OrderStatus): boolean {
  return status === 'DESIGN_APPROVAL';
}

function getTotalRequiredApprovals(status: OrderStatus): number {
  const countMap: Record<OrderStatus, number> = {
    'DESIGN_PENDING': 1,
    'DESIGN_APPROVAL': 1,
    'CONFIRMED': 1,
    'PRODUCTION_PLANNED': 1,
    'QC': 1,
    'PACKING': 1
  };
  
  return countMap[status] || 0;
}

function getAssetApprovalStatus(assetId: string, approvalHistory: any[]): string {
  const assetApprovals = approvalHistory.filter(a => 
    a.metadata && JSON.parse(a.metadata).design_asset_ids?.includes(assetId)
  );
  
  if (assetApprovals.some(a => a.status === 'APPROVED')) return 'APPROVED';
  if (assetApprovals.some(a => a.status === 'REJECTED')) return 'REJECTED';
  return 'PENDING';
}

function hasApprovalPermission(approvalType: string, userRole: Role): boolean {
  const permissionMap: Record<string, Role[]> = {
    'DESIGN_REVIEW': ['DESIGNER', 'DESIGN_MANAGER', 'ADMIN', 'MANAGER'],
    'PRODUCTION_READY': ['PRODUCTION_MANAGER', 'ADMIN', 'MANAGER'],
    'QUALITY_SIGN_OFF': ['QC_INSPECTOR', 'QC_MANAGER', 'ADMIN', 'MANAGER'],
    'FINAL_APPROVAL': ['MANAGER', 'ADMIN']
  };
  
  return permissionMap[approvalType]?.includes(userRole) || false;
}

async function handleApprovalStatusTransition(
  tx: any,
  order_id: string,
  approvalType: string,
  user_id: string,
  userRole: Role
): Promise<void> {
  const transitionMap: Record<string, OrderStatus> = {
    'DESIGN_REVIEW': 'DESIGN_APPROVAL',
    'PRODUCTION_READY': 'PRODUCTION_PLANNED'
  };
  
  const nextStatus = transitionMap[approvalType];
  if (nextStatus) {
    await OrderWorkflowEngine.transitionOrder(
      order_id,
      nextStatus,
      user_id,
      userRole,
      `${approvalType} approved`
    );
  }
}