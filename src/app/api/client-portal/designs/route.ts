// @ts-nocheck
/**
 * ASH AI - Client Portal Design Assets API
 * Design approval workflow and asset management for clients
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required for production')
}

const approvalSchema = z.object({
  asset_id: z.string().min(1, 'Asset ID is required'),
  action: z.enum(['APPROVE', 'REJECT'], { 
    errorMap: () => ({ message: 'Action must be either APPROVE or REJECT' }) 
  }),
  feedback: z.string().optional(),
  requested_changes: z.array(z.string()).optional()
})

/**
 * GET /api/client-portal/designs - Get client's design assets
 */
export async function GET(request: NextRequest) {
  try {
    // Verify client session
    const token = request.cookies.get('client-portal-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const client_id = decoded.client_id
    const workspace_id = decoded.workspace_id

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filter conditions
    const whereConditions: any = {
      order: {
        client_id: client_id,
        workspace_id: workspace_id
      }
    }

    if (order_id) {
      whereConditions.order_id = order_id
    }

    if (status && status !== 'all') {
      whereConditions.approval_status = status
    }

    if (type && type !== 'all') {
      whereConditions.type = type
    }

    // Get design assets with order information
    const designAssets = await prisma.designAsset.findMany({
      where: whereConditions,
      include: {
        order: {
          select: {
            id: true,
            po_number: true,
            product_type: true,
            method: true,
            brand: {
              select: {
                name: true,
                code: true
              }
            }
          }
        },
        uploaded_by: {
          select: {
            full_name: true,
            email: true
          }
        },
        approved_by: {
          select: {
            full_name: true,
            email: true
          }
        }
      },
      orderBy: [
        { approval_status: 'asc' }, // Pending first
        { created_at: 'desc' }
      ],
      skip: offset,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await prisma.designAsset.count({
      where: whereConditions
    })

    // Enhance assets with additional information
    const enhancedAssets = designAssets.map(asset => ({
      id: asset.id,
      order: asset.order,
      version: asset.version,
      type: asset.type,
      file_name: asset.file_name,
      file_path: asset.file_path,
      file_size: asset.file_size,
      approval_status: asset.approval_status,
      client_feedback: asset.client_feedback,
      requested_changes: asset.requested_changes,
      created_at: asset.created_at,
      approved_at: asset.approved_at,
      uploaded_by: asset.uploaded_by,
      approved_by: asset.approved_by,
      // Add helper properties
      is_pending_approval: asset.approval_status === 'PENDING_CLIENT_APPROVAL',
      can_be_approved: asset.approval_status === 'PENDING_CLIENT_APPROVAL',
      days_since_upload: Math.floor(
        (Date.now() - new Date(asset.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
      file_url: `/api/client-portal/designs/${asset.id}/download`, // Secure download URL
      thumbnail_url: asset.type.startsWith('image/') 
        ? `/api/client-portal/designs/${asset.id}/thumbnail`
        : null
    }))

    // Get summary statistics
    const summaryStats = await getDesignSummaryStats(client_id, workspace_id)

    return NextResponse.json({
      success: true,
      designs: enhancedAssets,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount
      },
      summary: summaryStats
    })

  } catch (_error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    console.error('Client designs error:', _error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to load designs' 
    }, { status: 500 })
  }
}

/**
 * POST /api/client-portal/designs - Submit design approval/rejection
 */
export async function POST(request: NextRequest) {
  try {
    // Verify client session
    const token = request.cookies.get('client-portal-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const client_id = decoded.client_id
    const workspace_id = decoded.workspace_id

    const body = await request.json()
    const validatedData = approvalSchema.parse(body)

    // Verify asset belongs to client and is pending approval
    const asset = await prisma.designAsset.findFirst({
      where: {
        id: validatedData.asset_id,
        order: {
          client_id: client_id,
          workspace_id: workspace_id
        },
        approval_status: 'PENDING_CLIENT_APPROVAL'
      },
      include: {
        order: {
          select: {
            id: true,
            po_number: true,
            brand: { select: { name: true } }
          }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({
        success: false,
        error: 'Design asset not found or not available for approval'
      }, { status: 404 })
    }

    const newStatus = validatedData.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    const approvalDate = validatedData.action === 'APPROVE' ? new Date() : null

    // Update design asset
    const updatedAsset = await prisma.designAsset.update({
      where: { id: validatedData.asset_id },
      data: {
        approval_status: newStatus,
        approved_at: approvalDate,
        approved_by_client_id: validatedData.action === 'APPROVE' ? client_id : null,
        client_feedback: validatedData.feedback,
        requested_changes: validatedData.requested_changes || [],
        updated_at: new Date()
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: workspace_id,
        actor_id: client_id,
        entity_type: 'design_asset',
        entity_id: validatedData.asset_id,
        action: `CLIENT_${validatedData.action}`,
        before_data: {
          approval_status: asset.approval_status
        },
        after_data: {
          approval_status: newStatus,
          feedback: validatedData.feedback,
          requested_changes: validatedData.requested_changes
        },
        metadata: {
          source: 'client_portal',
          order_id: asset.order.id,
          order_po: asset.order.po_number,
          action_type: 'design_approval'
        }
      }
    })

    // Create notification for production team
    await createApprovalNotification(asset, validatedData.action, validatedData.feedback)

    // If rejected, potentially create a task for design revision
    if (validatedData.action === 'REJECT') {
      await createDesignRevisionTask(asset, validatedData.requested_changes)
    }

    // Get updated summary stats
    const summaryStats = await getDesignSummaryStats(client_id, workspace_id)

    return NextResponse.json({
      success: true,
      message: `Design ${validatedData.action.toLowerCase()}d successfully`,
      asset: {
        id: updatedAsset.id,
        approval_status: updatedAsset.approval_status,
        approved_at: updatedAsset.approved_at,
        client_feedback: updatedAsset.client_feedback
      },
      summary: summaryStats
    })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    console.error('Design approval error:', _error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process approval'
    }, { status: 500 })
  }
}

// Helper functions
async function getDesignSummaryStats(client_id: string, workspace_id: string) {
  const statusCounts = await prisma.designAsset.groupBy({
    by: ['approval_status'],
    where: {
      order: {
        client_id: client_id,
        workspace_id: workspace_id
      }
    },
    _count: true
  })

  const typeCounts = await prisma.designAsset.groupBy({
    by: ['type'],
    where: {
      order: {
        client_id: client_id,
        workspace_id: workspace_id
      }
    },
    _count: true
  })

  // Get recent activity (last 30 days)
  const recentActivity = await prisma.auditLog.count({
    where: {
      workspace_id: workspace_id,
      actor_id: client_id,
      entity_type: 'design_asset',
      action: {
        in: ['CLIENT_APPROVE', 'CLIENT_REJECT']
      },
      created_at: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })

  return {
    status_distribution: statusCounts.reduce((acc, item) => {
      acc[item.approval_status] = item._count
      return acc
    }, {} as Record<string, number>),
    type_distribution: typeCounts.reduce((acc, item) => {
      acc[item.type] = item._count
      return acc
    }, {} as Record<string, number>),
    pending_approvals: statusCounts.find(s => s.approval_status === 'PENDING_CLIENT_APPROVAL')?._count || 0,
    total_designs: statusCounts.reduce((sum, item) => sum + item._count, 0),
    recent_activity_count: recentActivity
  }
}

async function createApprovalNotification(asset: any, action: string, feedback?: string) {
  try {
    // This would typically integrate with your notification system
    // For now, we'll create a simple audit log entry that can be picked up by notifications
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: asset.order.workspace_id,
        actor_id: 'system',
        entity_type: 'notification',
        entity_id: asset.order.id,
        action: 'DESIGN_APPROVAL_NOTIFICATION',
        metadata: {
          type: 'design_approval',
          asset_id: asset.id,
          order_po: asset.order.po_number,
          brand: asset.order.brand.name,
          action: action,
          feedback: feedback,
          priority: action === 'REJECT' ? 'HIGH' : 'MEDIUM',
          notification_targets: ['production_team', 'design_team']
        }
      }
    })
  } catch (_error) {
    console.error('Failed to create approval notification:', _error)
  }
}

async function createDesignRevisionTask(asset: any, requestedChanges?: string[]) {
  try {
    if (!requestedChanges || requestedChanges.length === 0) return

    const taskId = require('nanoid').nanoid()

    await prisma.task.create({
      data: {
        id: taskId,
        workspace_id: asset.order.workspace_id,
        order_id: asset.order.id,
        title: `Design Revision Required - ${asset.file_name}`,
        description: `Client has requested revisions for design asset: ${asset.file_name}\n\nRequested changes:\n${requestedChanges.map(change => `• ${change}`).join('\n')}`,
        status: 'OPEN',
        priority: 'HIGH',
        type: 'DESIGN_REVISION',
        due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
        metadata: {
          asset_id: asset.id,
          revision_type: 'client_requested',
          requested_changes: requestedChanges
        }
      }
    })
  } catch (_error) {
    console.error('Failed to create design revision task:', _error)
  }
}