/**
 * ASH AI - Stage 3: Cutting - Bundle Tracking API
 * Professional bundle status tracking with QR code scanning
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'

const bundleUpdateSchema = z.object({
  bundle_id: z.string().min(1, 'Bundle ID is required'),
  qr_code: z.string().optional(),
  new_status: z.enum(['READY_FOR_CUTTING', 'IN_PROGRESS', 'COMPLETED', 'QC_PENDING']),
  operator_notes: z.string().optional(),
  defect_count: z.number().nonnegative().optional(),
  quality_issues: z.array(z.string()).optional()
})

const batchUpdateSchema = z.object({
  updates: z.array(z.object({
    bundle_id: z.string().min(1),
    new_status: z.string(),
    operator_notes: z.string().optional()
  })).min(1, 'At least one update is required')
})

/**
 * POST /api/cutting/bundle-tracking - Update bundle status via QR scan
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only cutting operators and supervisors can track bundles
    if (![Role.ADMIN, Role.MANAGER, Role.CUTTING_SUPERVISOR, Role.OPERATOR].includes(session.user.role as Role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for bundle tracking' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = bundleUpdateSchema.parse(body)

    // Find bundle by ID or QR code
    const whereClause: any = {}
    if (validatedData.bundle_id) {
      whereClause.id = validatedData.bundle_id
    } else if (validatedData.qr_code) {
      whereClause.qr_code = validatedData.qr_code
    } else {
      return NextResponse.json({ 
        error: 'Either bundle_id or qr_code is required' 
      }, { status: 400 })
    }

    const bundle = await prisma.cuttingBundle.findFirst({
      where: {
        ...whereClause,
        workspace_id: session.user.workspaceId
      },
      include: {
        lay_plan: {
          include: {
            order: {
              select: {
                po_number: true,
                brand: { select: { name: true, code: true } }
              }
            }
          }
        }
      }
    })

    if (!bundle) {
      return NextResponse.json({ 
        error: 'Bundle not found or access denied' 
      }, { status: 404 })
    }

    // Validate status transition
    const isValidTransition = validateStatusTransition(bundle.status, validatedData.new_status)
    if (!isValidTransition) {
      return NextResponse.json({
        error: `Invalid status transition from ${bundle.status} to ${validatedData.new_status}`,
        current_status: bundle.status,
        valid_next_states: getValidNextStates(bundle.status)
      }, { status: 422 })
    }

    // Update bundle with transaction for audit trail
    const updatedBundle = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const updateData: any = {
        status: validatedData.new_status,
        last_updated: now,
        last_updated_by_id: session.user.id
      }

      // Set timestamps based on status
      switch (validatedData.new_status) {
        case 'IN_PROGRESS':
          updateData.started_at = now
          updateData.operator_id = session.user.id
          break
        case 'COMPLETED':
          updateData.completed_at = now
          if (validatedData.defect_count !== undefined) {
            updateData.defect_count = validatedData.defect_count
          }
          break
        case 'QC_PENDING':
          updateData.cutting_completed_at = now
          break
      }

      // Add operator notes
      if (validatedData.operator_notes) {
        const existingNotes = bundle.metadata?.notes || []
        updateData.metadata = {
          ...bundle.metadata,
          notes: [...existingNotes, {
            timestamp: now.toISOString(),
            operator: session.user.id,
            note: validatedData.operator_notes,
            status_change: `${bundle.status} → ${validatedData.new_status}`
          }]
        }
      }

      // Add quality issues
      if (validatedData.quality_issues && validatedData.quality_issues.length > 0) {
        updateData.quality_issues = validatedData.quality_issues
      }

      const updated = await tx.cuttingBundle.update({
        where: { id: bundle.id },
        data: updateData
      })

      // Create bundle status history
      await tx.bundleStatusHistory.create({
        data: {
          id: require('nanoid').nanoid(),
          workspace_id: session.user.workspaceId,
          bundle_id: bundle.id,
          from_status: bundle.status,
          to_status: validatedData.new_status,
          changed_by_id: session.user.id,
          change_reason: 'QR_SCAN_UPDATE',
          operator_notes: validatedData.operator_notes,
          metadata: {
            scan_method: validatedData.qr_code ? 'QR_CODE' : 'MANUAL',
            defect_count: validatedData.defect_count,
            quality_issues: validatedData.quality_issues
          }
        }
      })

      return updated
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: session.user.workspaceId,
        actor_id: session.user.id,
        entity_type: 'cutting_bundle',
        entity_id: bundle.id,
        action: 'STATUS_UPDATE',
        before_data: { status: bundle.status },
        after_data: { status: validatedData.new_status },
        metadata: {
          source: 'bundle_tracking_api',
          order_po: bundle.lay_plan.order.po_number,
          brand: bundle.lay_plan.order.brand.name,
          bundle_number: bundle.bundle_number,
          scan_method: validatedData.qr_code ? 'QR_CODE' : 'MANUAL',
          operator_notes: validatedData.operator_notes
        }
      }
    })

    // Emit bundle tracking event
    await emitBundleEvent('ash.cutting.bundle_updated', {
      bundle_id: bundle.id,
      bundle_number: bundle.bundle_number,
      old_status: bundle.status,
      new_status: validatedData.new_status,
      operator_id: session.user.id,
      lay_plan_id: bundle.lay_plan_id
    })

    // Calculate productivity metrics
    const productivityMetrics = await calculateBundleMetrics(bundle.id, updatedBundle)

    return NextResponse.json({
      success: true,
      message: `Bundle ${bundle.bundle_number} updated to ${validatedData.new_status}`,
      bundle: {
        id: updatedBundle.id,
        bundle_number: bundle.bundle_number,
        status: updatedBundle.status,
        total_pieces: updatedBundle.total_pieces,
        started_at: updatedBundle.started_at,
        completed_at: updatedBundle.completed_at,
        operator_id: updatedBundle.operator_id,
        defect_count: updatedBundle.defect_count
      },
      productivity_metrics: productivityMetrics,
      valid_next_actions: getValidNextStates(validatedData.new_status)
    }, { status: 200 })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Bundle tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update bundle status'
    }, { status: 500 })
  }
}

/**
 * PUT /api/cutting/bundle-tracking - Batch update bundle statuses
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = batchUpdateSchema.parse(body)

    const results = []
    const errors = []

    // Process each update
    for (const update of validatedData.updates) {
      try {
        const bundle = await prisma.cuttingBundle.findFirst({
          where: {
            id: update.bundle_id,
            workspace_id: session.user.workspaceId
          }
        })

        if (!bundle) {
          errors.push({
            bundle_id: update.bundle_id,
            error: 'Bundle not found'
          })
          continue
        }

        const isValidTransition = validateStatusTransition(bundle.status, update.new_status as any)
        if (!isValidTransition) {
          errors.push({
            bundle_id: update.bundle_id,
            error: `Invalid status transition: ${bundle.status} → ${update.new_status}`
          })
          continue
        }

        // Update bundle
        const updatedBundle = await prisma.cuttingBundle.update({
          where: { id: update.bundle_id },
          data: {
            status: update.new_status,
            last_updated: new Date(),
            last_updated_by_id: session.user.id
          }
        })

        results.push({
          bundle_id: update.bundle_id,
          old_status: bundle.status,
          new_status: update.new_status,
          success: true
        })

      } catch (updateError) {
        errors.push({
          bundle_id: update.bundle_id,
          error: 'Update failed'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch update completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors
    })

  } catch (_error) {
    console.error('Batch bundle update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process batch update'
    }, { status: 500 })
  }
}

/**
 * GET /api/cutting/bundle-tracking - Get bundle tracking data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lay_plan_id = searchParams.get('lay_plan_id')
    const status = searchParams.get('status')
    const qr_code = searchParams.get('qr_code')
    const operator_id = searchParams.get('operator_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereConditions: any = {
      workspace_id: session.user.workspaceId
    }

    if (lay_plan_id) whereConditions.lay_plan_id = lay_plan_id
    if (status) whereConditions.status = status
    if (qr_code) whereConditions.qr_code = qr_code
    if (operator_id) whereConditions.operator_id = operator_id

    const bundles = await prisma.cuttingBundle.findMany({
      where: whereConditions,
      include: {
        lay_plan: {
          include: {
            order: {
              select: {
                po_number: true,
                brand: { select: { name: true, code: true } }
              }
            }
          }
        },
        operator: {
          select: {
            full_name: true
          }
        },
        last_updated_by: {
          select: {
            full_name: true
          }
        }
      },
      orderBy: { last_updated: 'desc' },
      skip: offset,
      take: limit
    })

    // Get summary statistics
    const summaryStats = await getBundleTrackingSummary(session.user.workspaceId, lay_plan_id)

    return NextResponse.json({
      success: true,
      bundles,
      summary: summaryStats,
      pagination: {
        limit,
        offset,
        total: await prisma.cuttingBundle.count({ where: whereConditions })
      }
    })

  } catch (_error) {
    console.error('Get bundle tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve bundle tracking data'
    }, { status: 500 })
  }
}

// Helper functions
function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'READY_FOR_CUTTING': ['IN_PROGRESS'],
    'IN_PROGRESS': ['COMPLETED', 'QC_PENDING'],
    'COMPLETED': ['QC_PENDING'],
    'QC_PENDING': ['COMPLETED'] // If QC passes, back to completed
  }

  return validTransitions[currentStatus]?.includes(newStatus) || false
}

function getValidNextStates(currentStatus: string): string[] {
  const validTransitions: Record<string, string[]> = {
    'READY_FOR_CUTTING': ['IN_PROGRESS'],
    'IN_PROGRESS': ['COMPLETED', 'QC_PENDING'],
    'COMPLETED': ['QC_PENDING'],
    'QC_PENDING': ['COMPLETED']
  }

  return validTransitions[currentStatus] || []
}

async function calculateBundleMetrics(bundleId: string, bundle: any) {
  try {
    const metrics: any = {
      pieces_per_hour: null,
      cutting_efficiency: null,
      defect_rate: null
    }

    if (bundle.started_at && bundle.completed_at) {
      const startTime = new Date(bundle.started_at).getTime()
      const endTime = new Date(bundle.completed_at).getTime()
      const hoursWorked = (endTime - startTime) / (1000 * 60 * 60)
      
      if (hoursWorked > 0) {
        metrics.pieces_per_hour = bundle.total_pieces / hoursWorked
        
        // Standard time calculation (assuming 1 minute per piece as baseline)
        const standardTime = bundle.total_pieces / 60 // hours
        metrics.cutting_efficiency = (standardTime / hoursWorked) * 100
      }
    }

    if (bundle.defect_count !== null && bundle.total_pieces > 0) {
      metrics.defect_rate = (bundle.defect_count / bundle.total_pieces) * 100
    }

    return metrics
  } catch (_error) {
    console.warn('Failed to calculate bundle metrics:', error)
    return {}
  }
}

async function getBundleTrackingSummary(workspaceId: string, layPlanId?: string) {
  const whereClause: any = { workspace_id: workspaceId }
  if (layPlanId) whereClause.lay_plan_id = layPlanId

  const [statusCounts, todayActivity, avgMetrics] = await Promise.all([
    prisma.cuttingBundle.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    }),
    prisma.cuttingBundle.count({
      where: {
        ...whereClause,
        last_updated: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.cuttingBundle.aggregate({
      where: {
        ...whereClause,
        status: 'COMPLETED',
        completed_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      _avg: {
        defect_count: true
      },
      _sum: {
        total_pieces: true
      }
    })
  ])

  return {
    status_distribution: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
    activity_last_24h: todayActivity,
    avg_defect_rate: avgMetrics._sum.total_pieces 
      ? ((avgMetrics._avg.defect_count || 0) / avgMetrics._sum.total_pieces) * 100
      : 0,
    total_pieces_completed_week: avgMetrics._sum.total_pieces || 0
  }
}

async function emitBundleEvent(eventType: string, data: any) {
  try {
    await prisma.systemEvent.create({
      data: {
        id: require('nanoid').nanoid(),
        event_type: eventType,
        entity_type: 'cutting_bundle',
        entity_id: data.bundle_id,
        data: data,
        status: 'PENDING',
        created_at: new Date()
      }
    })
  } catch (_error) {
    console.error('Failed to emit bundle event:', error)
  }
}