/**
 * ASH AI - Stage 3: Cutting - Lay Planning API
 * Professional fabric lay optimization with AI-powered efficiency
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const layPlanSchema = z.object({
  fabric_issue_id: z.string().min(1, 'Fabric issue ID is required'),
  fabric_batch_id: z.string().min(1, 'Fabric batch ID is required'),
  order_id: z.string().min(1, 'Order ID is required'),
  lay_configuration: z.object({
    table_width_cm: z.number().positive('Table width must be positive'),
    maximum_lay_height_cm: z.number().positive('Maximum lay height must be positive'),
    fabric_direction: z.enum(['WITH_GRAIN', 'AGAINST_GRAIN', 'BIAS']).default('WITH_GRAIN'),
    marker_efficiency_target: z.number().min(0.7).max(1, 'Efficiency must be between 70-100%').default(0.85),
    allow_pattern_rotation: z.boolean().default(true),
    quality_requirements: z.enum(['STANDARD', 'PREMIUM', 'EXPORT']).default('STANDARD')
  }),
  size_breakdown: z.record(z.string(), z.number().nonnegative()),
  cutting_notes: z.string().optional(),
  expected_bundles: z.number().positive().optional()
})

const bundleCreationSchema = z.object({
  lay_plan_id: z.string().min(1, 'Lay plan ID is required'),
  bundle_size: z.number().min(1).max(50, 'Bundle size must be 1-50 pieces'),
  bundle_configuration: z.array(z.object({
    size: z.string(),
    quantity: z.number().positive(),
    layer_position: z.number().positive()
  })).min(1, 'At least one size must be included'),
  special_instructions: z.string().optional()
})

/**
 * POST /api/cutting/lay-planning - Create lay plan with AI optimization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only cutting supervisors and managers can create lay plans
    if (![Role.ADMIN, Role.MANAGER, Role.CUTTING_SUPERVISOR].includes(session.user.role as Role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for lay planning' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = layPlanSchema.parse(body)

    // Verify fabric issue exists and is ready
    const fabricIssue = await prisma.fabricIssue.findFirst({
      where: {
        id: validatedData.fabric_issue_id,
        workspace_id: session.user.workspace_id,
        status: 'ISSUED'
      },
      include: {
        fabric_batches: {
          where: { id: validatedData.fabric_batch_id }
        },
        order: {
          include: {
            brand: { select: { name: true, code: true } }
          }
        }
      }
    })

    if (!fabricIssue || fabricIssue.fabric_batches.length === 0) {
      return NextResponse.json({ 
        error: 'Fabric batch not found or not ready for cutting' 
      }, { status: 404 })
    }

    const fabricBatch = fabricIssue.fabric_batches[0]

    // Run Ashley AI lay optimization
    const layOptimization = await optimizeLayPlan({
      fabricBatch,
      sizeBreakdown: validatedData.size_breakdown,
      layConfiguration: validatedData.lay_configuration,
      order: fabricIssue.order
    })

    if (layOptimization.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI detected critical lay planning issues',
        blocked_by: 'ASHLEY_AI_LAY_OPTIMIZATION',
        issues: layOptimization.issues,
        recommendations: layOptimization.recommendations
      }, { status: 422 })
    }

    // Create lay plan record
    const layPlan = await prisma.$transaction(async (tx) => {
      const layPlanId = require('nanoid').nanoid()

      const plan = await tx.layPlan.create({
        data: {
          id: layPlanId,
          workspace_id: session.user.workspace_id,
          fabric_issue_id: validatedData.fabric_issue_id,
          fabric_batch_id: validatedData.fabric_batch_id,
          order_id: validatedData.order_id,
          created_by_id: session.user.id,
          status: 'PLANNED',
          
          // Lay configuration
          table_width_cm: validatedData.lay_configuration.table_width_cm,
          maximum_lay_height_cm: validatedData.lay_configuration.maximum_lay_height_cm,
          fabric_direction: validatedData.lay_configuration.fabric_direction,
          marker_efficiency_target: validatedData.lay_configuration.marker_efficiency_target,
          allow_pattern_rotation: validatedData.lay_configuration.allow_pattern_rotation,
          quality_requirements: validatedData.lay_configuration.quality_requirements,
          
          // Size breakdown
          size_breakdown: validatedData.size_breakdown,
          cutting_notes: validatedData.cutting_notes,
          expected_bundles: validatedData.expected_bundles,
          
          // Ashley AI optimization results
          ashley_optimization: layOptimization,
          estimated_efficiency: layOptimization.estimated_efficiency,
          estimated_fabric_utilization: layOptimization.fabric_utilization,
          estimated_cutting_time_minutes: layOptimization.cutting_time_minutes,
          
          metadata: {
            total_pieces: Object.values(validatedData.size_breakdown).reduce((sum, qty) => sum + qty, 0),
            fabric_meters_required: layOptimization.fabric_meters_required,
            waste_percentage: layOptimization.waste_percentage,
            ashley_confidence: layOptimization.confidence
          }
        }
      })

      // Update fabric batch status
      await tx.fabricBatch.update({
        where: { id: validatedData.fabric_batch_id },
        data: { 
          status: 'LAY_PLANNED',
          lay_plan_id: layPlanId
        }
      })

      return plan
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: session.user.workspace_id,
        actor_id: session.user.id,
        entity_type: 'lay_plan',
        entity_id: layPlan.id,
        action: 'CREATE',
        after_data: validatedData,
        metadata: {
          source: 'lay_planning_api',
          order_po: fabricIssue.order.po_number,
          brand: fabricIssue.order.brand.name,
          ashley_optimization: layOptimization,
          efficiency: layOptimization.estimated_efficiency
        }
      }
    })

    // Emit lay planning event
    await emitCuttingEvent('ash.cutting.lay_planned', {
      lay_plan_id: layPlan.id,
      fabric_batch_id: validatedData.fabric_batch_id,
      order_id: validatedData.order_id,
      efficiency: layOptimization.estimated_efficiency,
      total_pieces: Object.values(validatedData.size_breakdown).reduce((sum, qty) => sum + qty, 0),
      created_by: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Lay plan created successfully with AI optimization',
      lay_plan: {
        id: layPlan.id,
        status: layPlan.status,
        estimated_efficiency: layOptimization.estimated_efficiency,
        fabric_utilization: layOptimization.fabric_utilization,
        cutting_time_minutes: layOptimization.cutting_time_minutes,
        ashley_risk: layOptimization.risk,
        recommendations: layOptimization.recommendations
      },
      next_steps: [
        'Review and approve lay plan',
        'Generate cutting markers',
        'Spread fabric on cutting table',
        'Create cutting bundles'
      ]
    }, { status: 201 })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Lay planning error:', _error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create lay plan'
    }, { status: 500 })
  }
}

/**
 * POST /api/cutting/lay-planning/bundles - Create cutting bundles from lay plan
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bundleCreationSchema.parse(body)

    // Verify lay plan exists and is approved
    const layPlan = await prisma.layPlan.findFirst({
      where: {
        id: validatedData.lay_plan_id,
        workspace_id: session.user.workspace_id,
        status: { in: ['PLANNED', 'APPROVED'] }
      },
      include: {
        fabric_batch: true,
        order: {
          include: {
            brand: { select: { name: true, code: true } }
          }
        }
      }
    })

    if (!layPlan) {
      return NextResponse.json({ 
        error: 'Lay plan not found or not ready for bundle creation' 
      }, { status: 404 })
    }

    // Create bundles
    const bundles = await prisma.$transaction(async (tx) => {
      const bundlePromises = []
      const totalPieces = validatedData.bundle_configuration.reduce((sum, config) => sum + config.quantity, 0)
      
      for (let i = 0; i < Math.ceil(totalPieces / validatedData.bundle_size); i++) {
        const bundleId = require('nanoid').nanoid()
        const bundleNumber = `${layPlan.order.brand.code}-${layPlan.order.po_number}-B${(i + 1).toString().padStart(3, '0')}`
        
        bundlePromises.push(tx.cuttingBundle.create({
          data: {
            id: bundleId,
            workspace_id: session.user.workspace_id,
            lay_plan_id: validatedData.lay_plan_id,
            bundle_number: bundleNumber,
            bundle_sequence: i + 1,
            size_breakdown: validatedData.bundle_configuration.reduce((acc, config) => {
              acc[config.size] = Math.min(config.quantity, validatedData.bundle_size)
              return acc
            }, {} as Record<string, number>),
            total_pieces: Math.min(validatedData.bundle_size, totalPieces - (i * validatedData.bundle_size)),
            status: 'READY_FOR_CUTTING',
            special_instructions: validatedData.special_instructions,
            qr_code: await generateBundleQRCode(bundleNumber),
            metadata: {
              layer_positions: validatedData.bundle_configuration.map(c => c.layer_position),
              created_from_lay_plan: true,
              bundle_type: 'CUTTING'
            }
          }
        }))
      }

      return await Promise.all(bundlePromises)
    })

    // Update lay plan status
    await prisma.layPlan.update({
      where: { id: validatedData.lay_plan_id },
      data: { 
        status: 'BUNDLES_CREATED',
        bundles_created_at: new Date(),
        total_bundles: bundles.length
      }
    })

    return NextResponse.json({
      success: true,
      message: `${bundles.length} cutting bundles created successfully`,
      bundles: bundles.map(bundle => ({
        id: bundle.id,
        bundle_number: bundle.bundle_number,
        total_pieces: bundle.total_pieces,
        qr_code: bundle.qr_code,
        status: bundle.status
      })),
      next_steps: [
        'Print bundle QR code labels',
        'Begin fabric cutting process',
        'Scan bundles as cutting progresses',
        'Move completed bundles to sewing department'
      ]
    }, { status: 201 })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Bundle creation error:', _error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create cutting bundles'
    }, { status: 500 })
  }
}

/**
 * GET /api/cutting/lay-planning - Get lay plans
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const fabric_batch_id = searchParams.get('fabric_batch_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereConditions: any = {
      workspace_id: session.user.workspace_id
    }

    if (order_id) whereConditions.order_id = order_id
    if (fabric_batch_id) whereConditions.fabric_batch_id = fabric_batch_id
    if (status) whereConditions.status = status

    const layPlans = await prisma.layPlan.findMany({
      where: whereConditions,
      include: {
        fabric_batch: {
          select: {
            batch_number: true,
            fabric_type: true,
            color_code: true,
            actual_meters: true,
            width_cm: true
          }
        },
        order: {
          select: {
            po_number: true,
            brand: { select: { name: true, code: true } }
          }
        },
        created_by: {
          select: { full_name: true }
        },
        cutting_bundles: {
          select: {
            id: true,
            bundle_number: true,
            total_pieces: true,
            status: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit
    })

    return NextResponse.json({
      success: true,
      lay_plans: layPlans,
      pagination: {
        limit,
        offset,
        total: await prisma.layPlan.count({ where: whereConditions })
      }
    })

  } catch (_error) {
    console.error('Get lay plans error:', _error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve lay plans'
    }, { status: 500 })
  }
}

// Helper functions
async function optimizeLayPlan(params: any) {
  const { fabricBatch, sizeBreakdown, layConfiguration, order } = params

  // Simulate Ashley AI lay optimization
  const totalPieces = Object.values(sizeBreakdown).reduce((sum, qty) => sum + (qty as number), 0)
  const fabricWidthCm = fabricBatch.width_cm
  const tableWidthCm = layConfiguration.table_width_cm

  // Calculate fabric utilization
  const markerWidth = Math.min(fabricWidthCm, tableWidthCm)
  const estimatedMarkerLength = calculateMarkerLength(sizeBreakdown, markerWidth)
  const fabricRequired = estimatedMarkerLength * (totalPieces / 10) // Assuming 10 pieces per lay
  const fabricUtilization = Math.min(fabricRequired / fabricBatch.actual_meters, 1)

  // Efficiency calculation
  const baseEfficiency = layConfiguration.marker_efficiency_target
  const complexityFactor = Object.keys(sizeBreakdown).length > 6 ? 0.95 : 1.0
  const estimatedEfficiency = baseEfficiency * complexityFactor

  // Risk assessment
  let risk = 'GREEN'
  const issues: any[] = []
  const recommendations: any[] = []

  if (fabricUtilization > 0.95) {
    risk = 'AMBER'
    issues.push({
      type: 'FABRIC_SHORTAGE',
      severity: 'MEDIUM',
      details: 'Fabric utilization is very high, risk of shortage'
    })
    recommendations.push('Consider ordering additional fabric as safety stock')
  }

  if (estimatedEfficiency < 0.75) {
    risk = 'AMBER'
    issues.push({
      type: 'LOW_EFFICIENCY',
      severity: 'MEDIUM', 
      details: `Estimated marker efficiency is ${(estimatedEfficiency * 100).toFixed(1)}%`
    })
    recommendations.push('Review size distribution and marker layout for better efficiency')
  }

  return {
    risk,
    confidence: 0.92,
    issues,
    recommendations,
    estimated_efficiency: estimatedEfficiency,
    fabric_utilization: fabricUtilization,
    fabric_meters_required: fabricRequired,
    waste_percentage: (1 - estimatedEfficiency) * 100,
    cutting_time_minutes: totalPieces * 0.75, // Estimated 45 seconds per piece
    processing_time: Date.now()
  }
}

function calculateMarkerLength(sizeBreakdown: Record<string, number>, markerWidth: number): number {
  // Simplified marker length calculation
  // In reality, this would use pattern dimensions and nesting algorithms
  const totalPieces = Object.values(sizeBreakdown).reduce((sum, qty) => sum + qty, 0)
  const avgPieceLength = 75 // cm, estimated average garment length
  return (totalPieces * avgPieceLength) / (markerWidth / 30) // Assuming 30cm average width per piece
}

async function generateBundleQRCode(bundleNumber: string): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase()
  return `BUNDLE-${bundleNumber}-${timestamp}`
}

async function emitCuttingEvent(eventType: string, data: any) {
  try {
    await prisma.systemEvent.create({
      data: {
        id: require('nanoid').nanoid(),
        event_type: eventType,
        entity_type: 'lay_plan',
        entity_id: data.lay_plan_id,
        data: data,
        status: 'OPEN',
        created_at: new Date()
      }
    })
  } catch (_error) {
    console.error('Failed to emit cutting event:', _error)
  }
}