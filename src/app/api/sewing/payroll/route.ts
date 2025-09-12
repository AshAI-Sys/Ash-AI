// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db } from '../../../../lib/db'
// Sewing Payroll API for Stage 5 Piece-Rate System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/sewing/payroll - Get piece-rate payroll records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const operator_id = searchParams.get('operator_id')
    const pay_period_start = searchParams.get('pay_period_start')
    const pay_period_end = searchParams.get('pay_period_end')
    const status = searchParams.get('status')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    // Verify workspace exists
    const _workspace = await db.workspace.findFirst({
      where: {
        id: workspace_id
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Set default pay period (current week) if not provided
    const end_date = pay_period_end ? new Date(pay_period_end) : new Date()
    const start_date = pay_period_start ? new Date(pay_period_start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const where: any = { workspace_id }
    if (operator_id) where.employee_id = operator_id
    if (status) where.status = status
    if (pay_period_start && pay_period_end) {
      where.pay_period_start = {
        gte: start_date,
        lte: end_date
      }
    }

    const payroll_records = await db.payrollRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            first_name: true,
            last_name: true,
            employee_no: true,
            job_title: true
          }
        }
      },
      orderBy: { pay_period_start: 'desc' }
    })

    return NextResponse.json({
      success: true,
      payroll_records
    })

  } catch (_error) {
    console.error('Error fetching payroll records:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records' },
      { status: 500 }
    )
  }
}

// POST /api/sewing/payroll - Generate payroll for pay period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      pay_period_start,
      pay_period_end,
      operator_ids = [], // If empty, generate for all operators
      notes
    } = body

    if (!workspace_id || !pay_period_start || !pay_period_end) {
      return NextResponse.json(
        { error: 'workspace_id, pay_period_start, and pay_period_end are required' },
        { status: 400 }
      )
    }

    // Verify workspace exists
    const _workspace = await db.workspace.findFirst({
      where: {
        id: workspace_id
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const start_date = new Date(pay_period_start)
    const end_date = new Date(pay_period_end)

    // Validate pay period
    if (start_date >= end_date) {
      return NextResponse.json(
        { error: 'pay_period_start must be before pay_period_end' },
        { status: 400 }
      )
    }

    // Check if payroll already exists for this period
    const existing_payroll = await db.payrollRecord.findFirst({
      where: {
        workspace_id,
        pay_period_start: start_date,
        pay_period_end: end_date,
        ...(operator_ids.length > 0 ? { employee_id: { in: operator_ids } } : {})
      }
    })

    if (existing_payroll) {
      return NextResponse.json(
        { error: 'Payroll already exists for this period and operator(s)' },
        { status: 409 }
      )
    }

    // Get sewing runs for the pay period
    const sewing_runs_where: any = {
      workspace_id,
      created_at: {
        gte: start_date,
        lte: end_date
      }
    }
    if (operator_ids.length > 0) {
      sewing_runs_where.operator_id = { in: operator_ids }
    }

    const sewing_runs = await db.sewingRun.findMany({
      where: sewing_runs_where,
      include: {
        order: {
          select: {
            po_number: true
          }
        },
        routing_step: {
          select: {
            name: true
          }
        },
        sewing_operation: {
          select: {
            name: true,
            standard_minutes: true,
            piece_rate: true
          }
        }
      }
    })

    if (sewing_runs.length === 0) {
      return NextResponse.json(
        { error: 'No sewing runs found for the specified period' },
        { status: 404 }
      )
    }

    // Calculate payroll metrics
    const operatorData = new Map()
    
    sewing_runs.forEach(run => {
      const operatorId = run.operator_id
      if (!operatorData.has(operatorId)) {
        operatorData.set(operatorId, {
          operator_id: operatorId,
          total_pieces: 0,
          total_earned_minutes: 0,
          total_actual_minutes: 0,
          piece_rate_earnings: 0,
          operations_worked: []
        })
      }
      
      const data = operatorData.get(operatorId)
      data.total_pieces += run.qty_good || 0
      data.total_earned_minutes += run.earned_minutes || 0
      data.total_actual_minutes += run.actual_minutes || 0
      data.piece_rate_earnings += run.piece_rate_earned || 0
      data.operations_worked.push(run.sewing_operation?.name || 'Unknown')
    })
    
    // Create payroll records
    const payroll_records = []
    for (const [operatorId, accrual] of Array.from(operatorData)) {
      // Get employee details
      const employee = await db.employee.findUnique({
        where: { id: operatorId },
        select: { first_name: true, last_name: true, job_title: true, employee_no: true }
      })

      if (!employee) continue

      // Calculate pay components
      const gross_pay = accrual.piece_rate_earnings
      const tax_deduction = gross_pay * 0.1 // 10% tax (simplified)
      const total_deductions = tax_deduction
      const net_pay = gross_pay - total_deductions

      const payroll_record = await db.payrollRecord.create({
        data: {
          workspace_id,
          employee_id: operatorId,
          pay_period_start: start_date,
          pay_period_end: end_date,
          basic_pay: accrual.piece_rate_earnings,
          overtime_pay: 0,
          allowances: 0,
          bonus: 0,
          gross_pay,
          withholding_tax: tax_deduction,
          sss_employee: 0,
          total_deductions,
          net_pay,
          status: 'OPEN'
        }
      })

      payroll_records.push(payroll_record)
    }

    return NextResponse.json({
      success: true,
      message: `Generated payroll for ${payroll_records.length} operators`,
      payroll_summary: {
        pay_period: {
          start: start_date.toISOString(),
          end: end_date.toISOString(),
        },
        operators_count: payroll_records.length,
        total_gross_pay: Math.round(payroll_records.reduce((sum, record) => sum + record.gross_pay, 0) * 100) / 100,
        total_net_pay: Math.round(payroll_records.reduce((sum, record) => sum + record.net_pay, 0) * 100) / 100
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error generating payroll:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll' },
      { status: 500 }
    )
  }
}

// PUT /api/sewing/payroll - Update payroll status or approve
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      payroll_ids,
      workspace_id,
      status, // PENDING, APPROVED, PAID, CANCELLED
      approval_notes
    } = body

    if (!payroll_ids || !workspace_id || !status) {
      return NextResponse.json(
        { error: 'payroll_ids, workspace_id, and status are required' },
        { status: 400 }
      )
    }

    // Verify workspace exists
    const _workspace = await db.workspace.findFirst({
      where: {
        id: workspace_id
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Validate all payroll records belong to workspace
    const payroll_records = await db.payrollRecord.findMany({
      where: {
        id: { in: payroll_ids },
        workspace_id
      }
    })

    if (payroll_records.length !== payroll_ids.length) {
      return NextResponse.json(
        { error: 'Some payroll records not found or do not belong to workspace' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = { status }
    if (approval_notes) update_data.approval_notes = approval_notes

    if (status === 'APPROVED') {
      update_data.approved_at = new Date()
    } else if (status === 'PAID') {
      update_data.paid_at = new Date()
    }

    // Update payroll records
    const updated_records = await db.payrollRecord.updateMany({
      where: {
        id: { in: payroll_ids }
      },
      data: update_data
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${updated_records.count} payroll records to ${status}`,
      updated_count: updated_records.count
    })

  } catch (_error) {
    console.error('Error updating payroll:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll' },
      { status: 500 }
    )
  }
}