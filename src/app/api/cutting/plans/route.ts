// Cutting Plans API for Stage 3 Cutting System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { optimizeFabricLayout, getAshleyAICuttingRecommendations, calculateCuttingCost } from '@/lib/cutting-calculations'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/cutting/plans - Get cutting plans for workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (order_id) where.order_id = order_id
    if (status) where.status = status

    const cutting_plans = await db.cuttingPlan.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            client: {
              select: {
                name: true
              }
            },
            product_type: true,
            total_qty: true
          }
        },
        cutting_sheets: {
          select: {
            id: true,
            sheet_number: true,
            pieces_count: true,
            status: true
          }
        },
        fabric_cuts: {
          select: {
            id: true,
            fabric_lot: true,
            color: true,
            length_used_cm: true,
            total_cost: true
          }
        },
        cutting_metrics: {
          select: {
            total_pieces_cut: true,
            fabric_utilization: true,
            efficiency_score: true
          },
          orderBy: { recorded_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      success: true,
      cutting_plans: cutting_plans.map(plan => ({
        ...plan,
        total_sheets: plan.cutting_sheets.length,
        completed_sheets: plan.cutting_sheets.filter(s => s.status === 'COMPLETED').length,
        latest_metrics: plan.cutting_metrics[0] || null
      }))
    })

  } catch (_error) {
    console.error('Error fetching cutting plans:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cutting plans' },
      { status: 500 }
    )
  }
}

// POST /api/cutting/plans - Create new cutting plan with optimization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      plan_name,
      fabric_type,
      fabric_width_cm,
      fabric_cost_per_meter,
      pieces, // Array of piece specifications
      seam_allowance_cm = 0.5,
      grain_direction_required = true
    } = body

    if (!workspace_id || !order_id || !plan_name || !fabric_type || !fabric_width_cm || !pieces?.length) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, plan_name, fabric_type, fabric_width_cm, and pieces are required' },
        { status: 400 }
      )
    }

    // Validate order exists and belongs to workspace
    const order = await db.order.findFirst({
      where: {
        id: order_id,
        workspace_id
      },
      include: {
        client: {
          select: {
            name: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Optimize fabric layout
    const optimization = optimizeFabricLayout(
      pieces,
      fabric_width_cm,
      1000, // max fabric length
      seam_allowance_cm,
      grain_direction_required
    )

    // Get Ashley AI recommendations
    const ashley_recommendations = getAshleyAICuttingRecommendations(
      optimization.utilization_pct,
      optimization.waste_analysis.waste_percentage,
      optimization.cutting_time_estimate_mins
    )

    // Ashley AI validation for cutting plan
    const ashley_check = await validateAshleyAI({
      context: 'CUTTING_PLAN_CREATION',
      fabric_utilization: optimization.utilization_pct,
      waste_percentage: optimization.waste_analysis.waste_percentage,
      total_pieces: pieces.reduce((sum: number, p: any) => sum + p.quantity, 0),
      cutting_time_mins: optimization.cutting_time_estimate_mins
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked cutting plan creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Calculate costs
    const total_pieces = pieces.reduce((sum: number, p: any) => sum + p.quantity, 0)
    const fabric_cost = (optimization.total_fabric_needed_cm / 100) * fabric_cost_per_meter
    const waste_cost = optimization.waste_analysis.cost_of_waste
    const cost_analysis = calculateCuttingCost(
      total_pieces,
      optimization.cutting_time_estimate_mins,
      fabric_cost,
      waste_cost
    )

    // Create cutting plan
    const cutting_plan = await db.cuttingPlan.create({
      data: {
        workspace_id,
        order_id,
        plan_name,
        fabric_type,
        fabric_width_cm,
        fabric_length_cm: optimization.total_fabric_needed_cm,
        utilization_pct: optimization.utilization_pct,
        total_pieces,
        cutting_time_mins: optimization.cutting_time_estimate_mins,
        status: ashley_check.risk === 'AMBER' ? 'DRAFT' : 'APPROVED',
        created_by: 'system' // In real app, would be current user
      }
    })

    // Create cutting sheets
    const cutting_sheets = await Promise.all(
      optimization.sheets.map(async (sheet) => {
        return await db.cuttingSheet.create({
          data: {
            cutting_plan_id: cutting_plan.id,
            sheet_number: sheet.sheet_number,
            sheet_width_cm: sheet.sheet_width_cm,
            sheet_length_cm: sheet.sheet_length_cm,
            pieces_count: sheet.pieces.length,
            layout_data: {
              pieces: sheet.pieces,
              utilization_pct: sheet.utilization_pct,
              waste_area_cm2: sheet.waste_area_cm2
            },
            cutting_sequence: {
              optimized: true,
              total_pieces: sheet.pieces.length
            }
          }
        })
      })
    )

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'cutting_plan',
        entity_id: cutting_plan.id,
        action: 'CREATE',
        after_data: {
          order_id,
          total_pieces,
          fabric_utilization: optimization.utilization_pct,
          ashley_risk: ashley_check.risk,
          cost_analysis
        }
      }
    })

    // Get created plan with relations
    const created_plan = await db.cuttingPlan.findUnique({
      where: { id: cutting_plan.id },
      include: {
        order: {
          select: {
            po_number: true,
            client: {
              select: {
                name: true
              }
            }
          }
        },
        cutting_sheets: {
          select: {
            id: true,
            sheet_number: true,
            pieces_count: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      cutting_plan: created_plan,
      optimization_results: {
        fabric_needed_cm: optimization.total_fabric_needed_cm,
        utilization_pct: optimization.utilization_pct,
        waste_analysis: optimization.waste_analysis,
        cutting_time_mins: optimization.cutting_time_estimate_mins
      },
      cost_analysis,
      ashley_recommendations,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating cutting plan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create cutting plan' },
      { status: 500 }
    )
  }
}

// PUT /api/cutting/plans - Update cutting plan status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cutting_plan_id,
      workspace_id,
      status,
      approved_by,
      notes
    } = body

    if (!cutting_plan_id || !workspace_id) {
      return NextResponse.json(
        { error: 'cutting_plan_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing cutting plan
    const existing_plan = await db.cuttingPlan.findFirst({
      where: {
        id: cutting_plan_id,
        workspace_id
      }
    })

    if (!existing_plan) {
      return NextResponse.json(
        { error: 'Cutting plan not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (status) update_data.status = status
    if (approved_by) {
      update_data.approved_by = approved_by
      update_data.approved_at = new Date()
    }

    // Update cutting plan
    const updated_plan = await db.cuttingPlan.update({
      where: { id: cutting_plan_id },
      data: update_data,
      include: {
        order: {
          select: {
            po_number: true,
            client: {
              select: {
                name: true
              }
            }
          }
        },
        cutting_sheets: {
          select: {
            id: true,
            sheet_number: true,
            pieces_count: true,
            status: true
          }
        }
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'cutting_plan',
        entity_id: cutting_plan_id,
        action: 'UPDATE',
        before_data: existing_plan,
        after_data: {
          ...update_data,
          notes
        }
      }
    })

    return NextResponse.json({
      success: true,
      cutting_plan: updated_plan
    })

  } catch (_error) {
    console.error('Error updating cutting plan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update cutting plan' },
      { status: 500 }
    )
  }
}