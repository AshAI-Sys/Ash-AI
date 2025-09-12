// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { analyzeLineEfficiency, calculateSewingPayrollAccruals } from '@/lib/sewing-calculations'
// Sewing Metrics API for Stage 5 Sewing System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/sewing/metrics - Get sewing performance metrics and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const line_name = searchParams.get('line_name')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const operator_id = searchParams.get('operator_id')
    const include_payroll = searchParams.get('include_payroll') === 'true'

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    // Set default date range if not provided
    const end_date = date_to ? new Date(date_to) : new Date()
    const start_date = date_from ? new Date(date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const where: any = { 
      workspace_id,
      created_at: {
        gte: start_date,
        lte: end_date
      }
    }

    // Apply filters
    if (line_name) {
      where.bundle = {
        line_name: { contains: line_name, mode: 'insensitive' }
      }
    }
    if (operator_id) where.operator_id = operator_id

    // Get sewing runs with comprehensive data
    const sewing_runs = await db.sewingRun.findMany({
      where,
      include: {
        bundle: {
          select: {
            bundle_no: true,
            line_name: true,
            total_qty: true,
            order: {
              select: {
                po_number: true,
                product_type: true,
                client: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        operator: {
          select: {
            name: true,
            skill_level: true
          }
        },
        sewing_operation: {
          select: {
            name: true,
            standard_minutes: true,
            piece_rate: true,
            complexity: true,
            skill_level: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Calculate operator performance metrics
    const operator_stats = new Map<string, any>()
    sewing_runs.forEach(run => {
      const op_id = run.operator_id
      if (!operator_stats.has(op_id)) {
        operator_stats.set(op_id, {
          operator_id: op_id,
          operator_name: run.operator?.name || 'Unknown',
          total_pieces: 0,
          total_minutes: 0,
          earned_minutes: 0,
          efficiency_pct: 0,
          pieces_per_hour: 0,
          piece_rate_earned: 0,
          defect_rate: 0,
          runs_count: 0,
          skill_level: run.operator?.skill_level || 'BASIC'
        })
      }

      const stats = operator_stats.get(op_id)
      stats.total_pieces += run.qty_good
      stats.total_minutes += run.actual_minutes
      stats.earned_minutes += run.earned_minutes
      stats.piece_rate_earned += run.piece_rate_earned || 0
      stats.defect_rate = ((stats.defect_rate * stats.runs_count) + (run.defect_rate || 0)) / (stats.runs_count + 1)
      stats.runs_count += 1
    })

    // Finalize operator statistics
    const operator_performance = Array.from(operator_stats.values()).map(stats => {
      stats.efficiency_pct = stats.total_minutes > 0 ? (stats.earned_minutes / stats.total_minutes) * 100 : 0
      stats.pieces_per_hour = stats.total_minutes > 0 ? (stats.total_pieces / stats.total_minutes) * 60 : 0
      stats.efficiency_pct = Math.round(stats.efficiency_pct * 100) / 100
      stats.pieces_per_hour = Math.round(stats.pieces_per_hour * 100) / 100
      stats.piece_rate_earned = Math.round(stats.piece_rate_earned * 100) / 100
      stats.defect_rate = Math.round(stats.defect_rate * 1000) / 1000
      return stats
    })

    // Line efficiency analysis
    const operations_workload = sewing_runs.reduce((acc: any, run) => {
      const op_name = run.operation_name
      if (!acc[op_name]) acc[op_name] = 0
      acc[op_name] += run.actual_minutes
      return acc
    }, {})

    const line_efficiency = analyzeLineEfficiency(operator_performance, operations_workload, 85)

    // Bundle progress summary
    const bundle_stats = new Map<string, any>()
    sewing_runs.forEach(run => {
      const bundle_id = run.bundle_id
      if (!bundle_stats.has(bundle_id)) {
        bundle_stats.set(bundle_id, {
          bundle_id,
          bundle_no: run.bundle?.bundle_no || 'Unknown',
          line_name: run.bundle?.line_name || 'Unknown',
          client_name: run.bundle?.order?.client?.name || 'Unknown',
          po_number: run.bundle?.order?.po_number || 'Unknown',
          total_qty: run.bundle?.total_qty || 0,
          completed_pieces: 0,
          rejected_pieces: 0,
          operations_completed: new Set(),
          avg_efficiency: 0,
          total_earned: 0
        })
      }

      const stats = bundle_stats.get(bundle_id)
      stats.completed_pieces += run.qty_good
      stats.rejected_pieces += run.qty_rejected
      stats.operations_completed.add(run.operation_name)
      stats.avg_efficiency = (stats.avg_efficiency + (run.efficiency_pct || 0)) / 2
      stats.total_earned += run.piece_rate_earned || 0
    })

    const bundle_summary = Array.from(bundle_stats.values()).map(stats => ({
      ...stats,
      operations_completed: stats.operations_completed.size,
      completion_rate: stats.total_qty > 0 ? (stats.completed_pieces / stats.total_qty) * 100 : 0,
      avg_efficiency: Math.round(stats.avg_efficiency * 100) / 100,
      total_earned: Math.round(stats.total_earned * 100) / 100
    }))

    // Overall metrics
    const total_pieces = sewing_runs.reduce((sum, run) => sum + run.qty_good, 0)
    const total_rejected = sewing_runs.reduce((sum, run) => sum + run.qty_rejected, 0)
    const total_minutes = sewing_runs.reduce((sum, run) => sum + run.actual_minutes, 0)
    const total_earned_minutes = sewing_runs.reduce((sum, run) => sum + run.earned_minutes, 0)
    const total_earnings = sewing_runs.reduce((sum, run) => sum + (run.piece_rate_earned || 0), 0)

    const overall_metrics = {
      total_pieces_produced: total_pieces,
      total_pieces_rejected: total_rejected,
      quality_rate: total_pieces + total_rejected > 0 ? (total_pieces / (total_pieces + total_rejected)) * 100 : 0,
      overall_efficiency: total_minutes > 0 ? (total_earned_minutes / total_minutes) * 100 : 0,
      avg_pieces_per_hour: total_minutes > 0 ? (total_pieces / total_minutes) * 60 : 0,
      total_piece_rate_earnings: Math.round(total_earnings * 100) / 100,
      active_operators: operator_performance.length,
      active_bundles: bundle_summary.length,
      total_sewing_runs: sewing_runs.length
    }

    // Payroll accruals if requested
    let payroll_accruals = null
    if (include_payroll) {
      const payroll_data = sewing_runs.map(run => ({
        operator_id: run.operator_id,
        qty_good: run.qty_good,
        piece_rate_earned: run.piece_rate_earned || 0,
        earned_minutes: run.earned_minutes,
        actual_minutes: run.actual_minutes,
        operation_name: run.operation_name
      }))

      payroll_accruals = calculateSewingPayrollAccruals(payroll_data, start_date, end_date)
    }

    return NextResponse.json({
      success: true,
      metrics: {
        period: {
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString(),
          days: Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (24 * 60 * 60 * 1000))
        },
        overall: overall_metrics,
        operator_performance,
        line_efficiency,
        bundle_summary,
        payroll_accruals
      }
    })

  } catch (_error) {
    console.error('Error fetching sewing metrics:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sewing metrics' },
      { status: 500 }
    )
  }
}

// POST /api/sewing/metrics - Record line metrics (shift summary)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      line_name,
      shift_date,
      shift_type = 'DAY', // DAY, NIGHT, OVERTIME
      target_efficiency = 85,
      actual_efficiency,
      total_pieces_produced,
      total_pieces_rejected,
      operators_count,
      downtime_minutes = 0,
      notes
    } = body

    if (!workspace_id || !line_name || !shift_date || !actual_efficiency || 
        !total_pieces_produced || !operators_count) {
      return NextResponse.json(
        { error: 'workspace_id, line_name, shift_date, actual_efficiency, total_pieces_produced, and operators_count are required' },
        { status: 400 }
      )
    }

    // Calculate quality rate
    const total_pieces = total_pieces_produced + (total_pieces_rejected || 0)
    const quality_rate = total_pieces > 0 ? (total_pieces_produced / total_pieces) * 100 : 0

    // Calculate performance score
    let performance_score = 0
    
    // Efficiency scoring (40 points max)
    if (actual_efficiency >= target_efficiency) {
      performance_score += 40
    } else if (actual_efficiency >= target_efficiency - 10) {
      performance_score += 30
    } else if (actual_efficiency >= target_efficiency - 20) {
      performance_score += 20
    } else {
      performance_score += 10
    }

    // Quality scoring (30 points max)
    if (quality_rate >= 98) performance_score += 30
    else if (quality_rate >= 95) performance_score += 25
    else if (quality_rate >= 90) performance_score += 20
    else if (quality_rate >= 85) performance_score += 15
    else performance_score += 5

    // Production volume scoring (20 points max)
    const pieces_per_operator = total_pieces_produced / operators_count
    if (pieces_per_operator >= 100) performance_score += 20
    else if (pieces_per_operator >= 80) performance_score += 15
    else if (pieces_per_operator >= 60) performance_score += 10
    else performance_score += 5

    // Downtime penalty (10 points max)
    if (downtime_minutes <= 30) performance_score += 10
    else if (downtime_minutes <= 60) performance_score += 5
    else performance_score -= 5

    performance_score = Math.min(100, Math.max(0, performance_score))

    // Create line metrics record
    const line_metrics = await db.sewingLineMetrics.create({
      data: {
        workspace_id,
        line_name,
        shift_date: new Date(shift_date),
        shift_type,
        target_efficiency,
        actual_efficiency,
        total_pieces_produced,
        total_pieces_rejected,
        quality_rate,
        operators_count,
        downtime_minutes,
        performance_score,
        notes,
        recorded_at: new Date()
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'sewing_line_metrics',
        entity_id: line_metrics.id,
        action: 'CREATE',
        after_data: {
          line_name,
          shift_type,
          actual_efficiency,
          performance_score,
          pieces_per_operator: Math.round(pieces_per_operator * 100) / 100
        }
      }
    })

    return NextResponse.json({
      success: true,
      line_metrics: {
        ...line_metrics,
        calculated_data: {
          quality_rate: Math.round(quality_rate * 100) / 100,
          performance_score,
          pieces_per_operator: Math.round(pieces_per_operator * 100) / 100
        }
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating line metrics:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create line metrics' },
      { status: 500 }
    )
  }
}