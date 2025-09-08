/**
 * ASH AI - Stage 6: Quality Control Inspection API
 * Comprehensive QC inspection system with Ashley AI defect detection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'

const defectSchema = z.object({
  type: z.enum([
    'STITCHING_DEFECT',
    'FABRIC_DEFECT', 
    'PRINT_DEFECT',
    'SIZING_ISSUE',
    'COLOR_MISMATCH',
    'CONSTRUCTION_FAULT',
    'FINISHING_ISSUE',
    'PACKAGING_ERROR'
  ]),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  location: z.string().min(1, 'Defect location is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  photo_path: z.string().optional(),
  correctable: z.boolean().default(true),
  correction_time_minutes: z.number().positive().optional()
})

const inspectionSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  bundle_ids: z.array(z.string()).min(1, 'At least one bundle ID is required'),
  inspection_type: z.enum(['INCOMING', 'IN_PROCESS', 'FINAL', 'RANDOM_AUDIT']).default('FINAL'),
  inspection_level: z.enum(['NORMAL', 'TIGHTENED', 'REDUCED']).default('NORMAL'),
  sample_size: z.number().positive('Sample size must be positive'),
  pieces_inspected: z.number().positive('Pieces inspected must be positive'),
  pieces_passed: z.number().nonnegative('Pieces passed cannot be negative'),
  pieces_failed: z.number().nonnegative('Pieces failed cannot be negative'),
  defects: z.array(defectSchema).default([]),
  inspector_notes: z.string().optional(),
  ashley_assisted: z.boolean().default(false),
  measurements: z.record(z.string(), z.number()).optional(),
  overall_rating: z.enum(['A', 'B', 'C', 'D', 'F']).optional()
})

const reworkSchema = z.object({
  inspection_id: z.string().min(1, 'Inspection ID is required'),
  defect_ids: z.array(z.string()).min(1, 'At least one defect ID is required'),
  rework_type: z.enum(['REPAIR', 'REPLACE', 'DOWNGRADE', 'SCRAP']),
  assigned_operator_id: z.string().optional(),
  estimated_time_minutes: z.number().positive().optional(),
  rework_instructions: z.string().min(5, 'Rework instructions are required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
})

/**
 * POST /api/qc/inspection - Create quality inspection record
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only QC inspectors and supervisors can create inspections
    if (![Role.ADMIN, Role.MANAGER, Role.QC_INSPECTOR, Role.QC_SUPERVISOR].includes(session.user.role as Role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for quality inspection' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = inspectionSchema.parse(body)

    // Verify order exists and bundles belong to the order
    const order = await prisma.order.findFirst({
      where: {
        id: validatedData.order_id,
        workspace_id: session.user.workspaceId
      },
      include: {
        brand: { select: { name: true, code: true } },
        client: { select: { name: true } }
      }
    })

    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found or access denied' 
      }, { status: 404 })
    }

    // Validate inspection data integrity
    if (validatedData.pieces_passed + validatedData.pieces_failed !== validatedData.pieces_inspected) {
      return NextResponse.json({
        error: 'Inspection count mismatch: passed + failed must equal inspected',
        details: {
          inspected: validatedData.pieces_inspected,
          passed: validatedData.pieces_passed,
          failed: validatedData.pieces_failed
        }
      }, { status: 400 })
    }

    // Run Ashley AI quality analysis if enabled
    let ashleyAnalysis = null
    if (validatedData.ashley_assisted) {
      ashleyAnalysis = await runAshleyQualityAnalysis({
        defects: validatedData.defects,
        measurements: validatedData.measurements,
        sampleSize: validatedData.sample_size,
        order: order
      })
    }

    // Create inspection record with defects
    const inspection = await prisma.$transaction(async (tx) => {
      const inspectionId = require('nanoid').nanoid()
      
      // Create main inspection record
      const inspectionRecord = await tx.qualityInspection.create({
        data: {
          id: inspectionId,
          workspace_id: session.user.workspaceId,
          order_id: validatedData.order_id,
          inspector_id: session.user.id,
          inspection_type: validatedData.inspection_type,
          inspection_level: validatedData.inspection_level,
          status: 'COMPLETED',
          
          // Sample data
          sample_size: validatedData.sample_size,
          pieces_inspected: validatedData.pieces_inspected,
          pieces_passed: validatedData.pieces_passed,
          pieces_failed: validatedData.pieces_failed,
          
          // Quality metrics
          defect_count: validatedData.defects.length,
          pass_rate: (validatedData.pieces_passed / validatedData.pieces_inspected) * 100,
          overall_rating: validatedData.overall_rating,
          inspector_notes: validatedData.inspector_notes,
          
          // Ashley AI integration
          ashley_assisted: validatedData.ashley_assisted,
          ashley_analysis: ashleyAnalysis,
          
          // Additional data
          measurements: validatedData.measurements || {},
          metadata: {
            bundle_ids: validatedData.bundle_ids,
            inspection_duration_minutes: 30, // Estimated
            ashley_confidence: ashleyAnalysis?.confidence || null
          }
        }
      })

      // Create defect records
      for (const defect of validatedData.defects) {
        await tx.qualityDefect.create({
          data: {
            id: require('nanoid').nanoid(),
            workspace_id: session.user.workspaceId,
            inspection_id: inspectionId,
            type: defect.type,
            severity: defect.severity,
            location: defect.location,
            description: defect.description,
            photo_path: defect.photo_path,
            correctable: defect.correctable,
            correction_time_minutes: defect.correction_time_minutes,
            status: 'IDENTIFIED',
            detected_by: validatedData.ashley_assisted ? 'ASHLEY_AI_ASSISTED' : 'MANUAL',
            metadata: {
              inspector_id: session.user.id,
              detection_confidence: ashleyAnalysis?.defect_confidence?.[defect.type] || null
            }
          }
        })
      }

      // Update bundle statuses based on inspection results
      for (const bundleId of validatedData.bundle_ids) {
        const newStatus = validatedData.pieces_failed > 0 ? 'QC_FAILED' : 'QC_PASSED'
        await tx.cuttingBundle.updateMany({
          where: { 
            id: bundleId,
            workspace_id: session.user.workspaceId 
          },
          data: {
            status: newStatus,
            qc_status: newStatus,
            qc_inspection_id: inspectionId,
            last_updated: new Date()
          }
        })
      }

      return inspectionRecord
    })

    // Determine next actions based on inspection results
    const nextActions = []
    if (validatedData.pieces_failed > 0) {
      nextActions.push('Create rework orders for failed pieces')
      nextActions.push('Assign rework to operators')
      nextActions.push('Re-inspect after rework completion')
    } else {
      nextActions.push('Move bundles to packing stage')
      nextActions.push('Update order status to ready for packaging')
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: session.user.workspaceId,
        actor_id: session.user.id,
        entity_type: 'quality_inspection',
        entity_id: inspection.id,
        action: 'CREATE',
        after_data: {
          ...validatedData,
          pass_rate: inspection.pass_rate,
          defect_count: validatedData.defects.length
        },
        metadata: {
          source: 'qc_inspection_api',
          order_po: order.po_number,
          brand: order.brand.name,
          ashley_assisted: validatedData.ashley_assisted,
          inspection_result: validatedData.pieces_failed > 0 ? 'FAILED' : 'PASSED'
        }
      }
    })

    // Emit QC event
    await emitQCEvent('ash.qc.inspection_completed', {
      inspection_id: inspection.id,
      order_id: validatedData.order_id,
      pass_rate: inspection.pass_rate,
      defect_count: validatedData.defects.length,
      inspection_type: validatedData.inspection_type,
      inspector_id: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: `Quality inspection completed with ${inspection.pass_rate.toFixed(1)}% pass rate`,
      inspection: {
        id: inspection.id,
        status: inspection.status,
        pass_rate: inspection.pass_rate,
        defect_count: validatedData.defects.length,
        overall_rating: validatedData.overall_rating,
        ashley_analysis: ashleyAnalysis ? {
          risk_level: ashleyAnalysis.risk_level,
          confidence: ashleyAnalysis.confidence,
          recommendations: ashleyAnalysis.recommendations
        } : null
      },
      next_actions: nextActions
    }, { status: 201 })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('QC inspection error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create quality inspection'
    }, { status: 500 })
  }
}

/**
 * POST /api/qc/inspection/rework - Create rework order
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reworkSchema.parse(body)

    // Verify inspection exists
    const inspection = await prisma.qualityInspection.findFirst({
      where: {
        id: validatedData.inspection_id,
        workspace_id: session.user.workspaceId
      },
      include: {
        quality_defects: {
          where: {
            id: { in: validatedData.defect_ids }
          }
        }
      }
    })

    if (!inspection || inspection.quality_defects.length === 0) {
      return NextResponse.json({ 
        error: 'Inspection or defects not found' 
      }, { status: 404 })
    }

    // Create rework order
    const reworkOrder = await prisma.$transaction(async (tx) => {
      const reworkId = require('nanoid').nanoid()
      
      const rework = await tx.reworkOrder.create({
        data: {
          id: reworkId,
          workspace_id: session.user.workspaceId,
          inspection_id: validatedData.inspection_id,
          created_by_id: session.user.id,
          rework_type: validatedData.rework_type,
          assigned_operator_id: validatedData.assigned_operator_id,
          estimated_time_minutes: validatedData.estimated_time_minutes,
          rework_instructions: validatedData.rework_instructions,
          priority: validatedData.priority,
          status: 'PENDING',
          defect_count: validatedData.defect_ids.length
        }
      })

      // Update defect statuses
      await tx.qualityDefect.updateMany({
        where: {
          id: { in: validatedData.defect_ids }
        },
        data: {
          status: 'REWORK_ORDERED',
          rework_order_id: reworkId
        }
      })

      return rework
    })

    return NextResponse.json({
      success: true,
      message: 'Rework order created successfully',
      rework_order: {
        id: reworkOrder.id,
        rework_type: reworkOrder.rework_type,
        priority: reworkOrder.priority,
        defect_count: reworkOrder.defect_count,
        estimated_time: reworkOrder.estimated_time_minutes
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Rework creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create rework order'
    }, { status: 500 })
  }
}

/**
 * GET /api/qc/inspection - Get quality inspection records
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const inspection_type = searchParams.get('inspection_type')
    const status = searchParams.get('status')
    const inspector_id = searchParams.get('inspector_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereConditions: any = {
      workspace_id: session.user.workspaceId
    }

    if (order_id) whereConditions.order_id = order_id
    if (inspection_type) whereConditions.inspection_type = inspection_type
    if (status) whereConditions.status = status
    if (inspector_id) whereConditions.inspector_id = inspector_id

    const inspections = await prisma.qualityInspection.findMany({
      where: whereConditions,
      include: {
        order: {
          select: {
            po_number: true,
            brand: { select: { name: true, code: true } }
          }
        },
        inspector: {
          select: {
            full_name: true
          }
        },
        quality_defects: {
          select: {
            id: true,
            type: true,
            severity: true,
            location: true,
            status: true
          }
        },
        rework_orders: {
          select: {
            id: true,
            status: true,
            rework_type: true,
            priority: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    })

    // Get summary statistics
    const summaryStats = await getQCSummary(session.user.workspaceId)

    return NextResponse.json({
      success: true,
      inspections,
      summary: summaryStats,
      pagination: {
        limit,
        offset,
        total: await prisma.qualityInspection.count({ where: whereConditions })
      }
    })

  } catch (_error) {
    console.error('Get QC inspections error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve quality inspections'
    }, { status: 500 })
  }
}

// Helper functions
async function runAshleyQualityAnalysis(params: any) {
  const { defects, measurements, sampleSize, order } = params

  // Simulate Ashley AI quality analysis
  const defectTypes = defects.map((d: any) => d.type)
  const criticalDefects = defects.filter((d: any) => d.severity === 'CRITICAL').length
  const majorDefects = defects.filter((d: any) => d.severity === 'MAJOR').length

  let riskLevel = 'LOW'
  if (criticalDefects > 0) riskLevel = 'HIGH'
  else if (majorDefects > 2) riskLevel = 'MEDIUM'

  const recommendations = []
  if (criticalDefects > 0) {
    recommendations.push('Immediate supervisor review required')
    recommendations.push('Consider process improvement training')
  }
  if (defectTypes.includes('STITCHING_DEFECT')) {
    recommendations.push('Review sewing machine maintenance schedule')
  }
  if (defectTypes.includes('PRINT_DEFECT')) {
    recommendations.push('Calibrate printing equipment')
  }

  return {
    risk_level: riskLevel,
    confidence: 0.87,
    recommendations,
    defect_confidence: defectTypes.reduce((acc: any, type: string) => {
      acc[type] = Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence
      return acc
    }, {}),
    quality_score: Math.max(0, 100 - (criticalDefects * 25) - (majorDefects * 10)),
    process_capability: sampleSize > 20 ? 'ADEQUATE' : 'LIMITED'
  }
}

async function getQCSummary(workspaceId: string) {
  const [statusCounts, todayInspections, avgPassRate, defectTypes] = await Promise.all([
    prisma.qualityInspection.groupBy({
      by: ['status'],
      where: { workspace_id: workspaceId },
      _count: true
    }),
    prisma.qualityInspection.count({
      where: {
        workspace_id: workspaceId,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.qualityInspection.aggregate({
      where: {
        workspace_id: workspaceId,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      _avg: {
        pass_rate: true
      }
    }),
    prisma.qualityDefect.groupBy({
      by: ['type'],
      where: { workspace_id: workspaceId },
      _count: true,
      orderBy: {
        _count: {
          type: 'desc'
        }
      },
      take: 5
    })
  ])

  return {
    status_distribution: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
    inspections_today: todayInspections,
    avg_pass_rate_week: avgPassRate._avg.pass_rate || 0,
    top_defect_types: defectTypes.map(dt => ({
      type: dt.type,
      count: dt._count
    }))
  }
}

async function emitQCEvent(eventType: string, data: any) {
  try {
    await prisma.systemEvent.create({
      data: {
        id: require('nanoid').nanoid(),
        event_type: eventType,
        entity_type: 'quality_inspection',
        entity_id: data.inspection_id,
        data: data,
        status: 'PENDING',
        created_at: new Date()
      }
    })
  } catch (_error) {
    console.error('Failed to emit QC event:', error)
  }
}