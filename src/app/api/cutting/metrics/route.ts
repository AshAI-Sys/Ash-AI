import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
// Cutting Metrics API for Stage 3 Cutting System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/cutting/metrics - Get cutting performance metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const cutting_plan_id = searchParams.get('cutting_plan_id')
    const operator_name = searchParams.get('operator_name')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (cutting_plan_id) where.cutting_plan_id = cutting_plan_id
    if (operator_name) where.operator_name = { contains: operator_name, mode: 'insensitive' }
    if (date_from && date_to) {
      where.shift_date = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    const cutting_metrics = await db.cuttingMetrics.findMany({
      where,
      include: {
        cutting_plan: {
          select: {
            plan_name: true,
            fabric_type: true,
            order: {
              select: {
                po_number: true,
                client: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { recorded_at: 'desc' }
    })

    // Calculate summary statistics
    const summary = {
      total_records: cutting_metrics.length,
      avg_pieces_per_hour: cutting_metrics.length > 0 
        ? Math.round(cutting_metrics.reduce((sum, m) => sum + m.total_pieces_cut / (m.total_time_mins / 60), 0) / cutting_metrics.length)
        : 0,
      avg_fabric_utilization: cutting_metrics.length > 0
        ? Math.round((cutting_metrics.reduce((sum, m) => sum + m.fabric_utilization, 0) / cutting_metrics.length) * 100) / 100
        : 0,
      avg_waste_percentage: cutting_metrics.length > 0
        ? Math.round((cutting_metrics.reduce((sum, m) => sum + m.waste_percentage, 0) / cutting_metrics.length) * 100) / 100
        : 0,
      avg_efficiency_score: cutting_metrics.length > 0
        ? Math.round((cutting_metrics.reduce((sum, m) => sum + m.efficiency_score, 0) / cutting_metrics.length) * 100) / 100
        : 0
    }

    return NextResponse.json({
      success: true,
      cutting_metrics,
      summary
    })

  } catch (_error) {
    console.error('Error fetching cutting metrics:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cutting metrics' },
      { status: 500 }
    )
  }
}

// POST /api/cutting/metrics - Record cutting performance metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      cutting_plan_id,
      operator_name,
      shift_date,
      total_pieces_cut,
      total_time_mins,
      fabric_utilization,
      waste_percentage,
      defect_rate,
      notes
    } = body

    if (!workspace_id || !cutting_plan_id || !operator_name || !shift_date || 
        !total_pieces_cut || !total_time_mins) {
      return NextResponse.json(
        { error: 'workspace_id, cutting_plan_id, operator_name, shift_date, total_pieces_cut, and total_time_mins are required' },
        { status: 400 }
      )
    }

    // Validate cutting plan exists and belongs to workspace
    const cutting_plan = await db.cuttingPlan.findFirst({
      where: {
        id: cutting_plan_id,
        workspace_id
      }
    })

    if (!cutting_plan) {
      return NextResponse.json(
        { error: 'Cutting plan not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Calculate efficiency score
    const pieces_per_hour = total_pieces_cut / (total_time_mins / 60)
    let efficiency_score = 0

    // Base scoring (pieces per hour)
    if (pieces_per_hour >= 30) efficiency_score += 40
    else if (pieces_per_hour >= 20) efficiency_score += 30
    else if (pieces_per_hour >= 15) efficiency_score += 20
    else efficiency_score += 10

    // Fabric utilization bonus
    if (fabric_utilization >= 0.85) efficiency_score += 30
    else if (fabric_utilization >= 0.75) efficiency_score += 25
    else if (fabric_utilization >= 0.65) efficiency_score += 15
    else efficiency_score += 5

    // Waste penalty
    if (waste_percentage <= 10) efficiency_score += 20
    else if (waste_percentage <= 20) efficiency_score += 10
    else efficiency_score -= 10

    // Defect rate penalty
    if (defect_rate <= 0.02) efficiency_score += 10
    else if (defect_rate <= 0.05) efficiency_score += 5
    else efficiency_score -= 15

    efficiency_score = Math.min(100, Math.max(0, efficiency_score))

    // Create cutting metrics record
    const cutting_metrics = await db.cuttingMetrics.create({
      data: {
        workspace_id,
        cutting_plan_id,
        operator_name,
        shift_date: new Date(shift_date),
        total_pieces_cut,
        total_time_mins,
        fabric_utilization: fabric_utilization || 0,
        waste_percentage: waste_percentage || 0,
        defect_rate: defect_rate || 0,
        efficiency_score,
        notes,
        recorded_at: new Date()
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'cutting_metrics',
        entity_id: cutting_metrics.id,
        action: 'CREATE',
        after_data: {
          cutting_plan_id,
          operator_name,
          efficiency_score,
          pieces_per_hour: Math.round(pieces_per_hour * 100) / 100
        }
      }
    })

    // Get created record with relations
    const created_metrics = await db.cuttingMetrics.findUnique({
      where: { id: cutting_metrics.id },
      include: {
        cutting_plan: {
          select: {
            plan_name: true,
            order: {
              select: {
                po_number: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      cutting_metrics: {
        ...created_metrics,
        calculated_data: {
          pieces_per_hour: Math.round(pieces_per_hour * 100) / 100,
          efficiency_score
        }
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating cutting metrics:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create cutting metrics' },
      { status: 500 }
    )
  }
}

// GET /api/cutting/metrics/dashboard - Get cutting dashboard data
export async function OPTIONS(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const days = parseInt(searchParams.get('days') || '7')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const date_from = new Date()
    date_from.setDate(date_from.getDate() - days)

    // Get recent cutting metrics
    const recent_metrics = await db.cuttingMetrics.findMany({
      where: {
        workspace_id,
        recorded_at: {
          gte: date_from
        }
      },
      include: {
        cutting_plan: {
          select: {
            plan_name: true,
            fabric_type: true,
            status: true
          }
        }
      },
      orderBy: { recorded_at: 'desc' }
    })

    // Get active cutting plans
    const active_plans = await db.cuttingPlan.findMany({
      where: {
        workspace_id,
        status: { in: ['APPROVED', 'IN_PROGRESS'] }
      },
      include: {
        cutting_sheets: {
          select: {
            status: true
          }
        },
        order: {
          select: {
            po_number: true,
            client: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Calculate dashboard statistics
    const total_pieces_cut = recent_metrics.reduce((sum, m) => sum + m.total_pieces_cut, 0)
    const total_time_hours = recent_metrics.reduce((sum, m) => sum + m.total_time_mins, 0) / 60
    const avg_efficiency = recent_metrics.length > 0 
      ? recent_metrics.reduce((sum, m) => sum + m.efficiency_score, 0) / recent_metrics.length
      : 0

    // Operator performance
    const operator_stats = recent_metrics.reduce((acc: any, metric) => {
      if (!acc[metric.operator_name]) {
        acc[metric.operator_name] = {
          total_pieces: 0,
          total_time: 0,
          efficiency_scores: []
        }
      }
      acc[metric.operator_name].total_pieces += metric.total_pieces_cut
      acc[metric.operator_name].total_time += metric.total_time_mins
      acc[metric.operator_name].efficiency_scores.push(metric.efficiency_score)
      return acc
    }, {})

    const top_operators = Object.entries(operator_stats)
      .map(([name, stats]: [string, any]) => ({
        name,
        pieces_cut: stats.total_pieces,
        pieces_per_hour: Math.round((stats.total_pieces / (stats.total_time / 60)) * 100) / 100,
        avg_efficiency: Math.round((stats.efficiency_scores.reduce((sum: number, score: number) => sum + score, 0) / stats.efficiency_scores.length) * 100) / 100
      }))
      .sort((a, b) => b.avg_efficiency - a.avg_efficiency)
      .slice(0, 5)

    // Plan status summary
    const plan_summary = active_plans.map(plan => ({
      id: plan.id,
      plan_name: plan.plan_name,
      po_number: plan.order.po_number,
      client_name: plan.order.client.name,
      status: plan.status,
      total_sheets: plan.cutting_sheets.length,
      completed_sheets: plan.cutting_sheets.filter(s => s.status === 'COMPLETED').length,
      progress_pct: plan.cutting_sheets.length > 0 
        ? Math.round((plan.cutting_sheets.filter(s => s.status === 'COMPLETED').length / plan.cutting_sheets.length) * 100)
        : 0
    }))

    return NextResponse.json({
      success: true,
      dashboard: {
        period_days: days,
        summary: {
          total_pieces_cut,
          total_time_hours: Math.round(total_time_hours * 100) / 100,
          avg_pieces_per_hour: total_time_hours > 0 ? Math.round((total_pieces_cut / total_time_hours) * 100) / 100 : 0,
          avg_efficiency_score: Math.round(avg_efficiency * 100) / 100,
          active_plans_count: active_plans.length,
          operators_count: Object.keys(operator_stats).length
        },
        top_operators,
        active_plans: plan_summary,
        daily_metrics: recent_metrics.slice(0, 10) // Last 10 records
      }
    })

  } catch (_error) {
    console.error('Error fetching cutting dashboard:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cutting dashboard' },
      { status: 500 }
    )
  }
}