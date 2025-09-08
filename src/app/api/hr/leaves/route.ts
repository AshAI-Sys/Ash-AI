// HR Leave Management API for Stage 10 HR System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/hr/leaves - Get leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const employee_id = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const leave_type = searchParams.get('leave_type')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (employee_id) where.employee_id = employee_id
    if (status) where.status = status
    if (leave_type) where.leave_type = leave_type
    if (date_from && date_to) {
      where.start_date = { gte: new Date(date_from) }
      where.end_date = { lte: new Date(date_to) }
    }

    const leave_requests = await db.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            employee_no: true,
            first_name: true,
            middle_name: true,
            last_name: true,
            suffix: true,
            department: true,
            job_title: true,
            immediate_supervisor: true
          }
        }
      },
      orderBy: [
        { requested_at: 'desc' },
        { employee: { last_name: 'asc' } }
      ]
    })

    // Add summary data
    const requests_with_summary = leave_requests.map(request => {
      const full_name = [
        request.employee.first_name,
        request.employee.middle_name,
        request.employee.last_name,
        request.employee.suffix
      ].filter(Boolean).join(' ')

      const days_span = Math.ceil(
        (new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1

      return {
        ...request,
        employee: {
          ...request.employee,
          full_name
        },
        summary: {
          days_span,
          is_pending: request.status === 'PENDING',
          is_current: new Date() >= request.start_date && new Date() <= request.end_date,
          requires_supervisor_approval: request.days_requested > 3 || request.leave_type === 'EMERGENCY'
        }
      }
    })

    return NextResponse.json({
      success: true,
      leave_requests: requests_with_summary
    })

  } catch (_error) {
    console.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave requests' },
      { status: 500 }
    )
  }
}

// POST /api/hr/leaves - Submit leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      employee_id,
      leave_type, // SICK/VACATION/EMERGENCY/MATERNITY/PATERNITY/BEREAVEMENT
      start_date,
      end_date,
      days_requested,
      reason
    } = body

    if (!workspace_id || !employee_id || !leave_type || !start_date || !end_date || !days_requested) {
      return NextResponse.json(
        { error: 'workspace_id, employee_id, leave_type, start_date, end_date, and days_requested are required' },
        { status: 400 }
      )
    }

    // Validate employee exists and is active
    const employee = await db.employee.findFirst({
      where: {
        id: employee_id,
        workspace_id,
        status: 'ACTIVE'
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Active employee not found' },
        { status: 404 }
      )
    }

    const leave_start = new Date(start_date)
    const leave_end = new Date(end_date)

    // Validate date range
    if (leave_start > leave_end) {
      return NextResponse.json(
        { error: 'Start date cannot be after end date' },
        { status: 400 }
      )
    }

    // Check for overlapping leave requests
    const overlapping_requests = await db.leaveRequest.findMany({
      where: {
        employee_id,
        workspace_id,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            start_date: { lte: leave_end },
            end_date: { gte: leave_start }
          }
        ]
      }
    })

    if (overlapping_requests.length > 0) {
      return NextResponse.json(
        { error: 'Leave request overlaps with existing approved or pending leave' },
        { status: 409 }
      )
    }

    // Calculate leave balance impact (simplified)
    const current_year = new Date().getFullYear()
    const ytd_leave_taken = await db.leaveRequest.findMany({
      where: {
        employee_id,
        workspace_id,
        status: 'APPROVED',
        start_date: {
          gte: new Date(current_year, 0, 1),
          lt: new Date(current_year + 1, 0, 1)
        }
      }
    })

    const total_leave_taken = ytd_leave_taken.reduce((sum, req) => sum + (req.days_deducted || req.days_requested), 0)
    const annual_leave_entitlement = 15 // Standard 15 days per year
    const remaining_balance = annual_leave_entitlement - total_leave_taken

    // Check leave balance for vacation leave
    if (leave_type === 'VACATION' && days_requested > remaining_balance) {
      return NextResponse.json(
        { error: `Insufficient leave balance. Remaining: ${remaining_balance} days` },
        { status: 409 }
      )
    }

    // Ashley AI validation for leave request
    const ashley_check = await validateAshleyAI({
      context: 'LEAVE_REQUEST',
      employee_id,
      leave_type,
      days_requested,
      remaining_balance,
      request_timing: {
        days_in_advance: Math.floor((new Date(leave_start).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        is_weekend_adjacent: leave_start.getDay() === 1 || leave_end.getDay() === 5,
        is_holiday_period: false // Could check against holiday calendar
      }
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked leave request',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create leave request
    const leave_request = await db.leaveRequest.create({
      data: {
        workspace_id,
        employee_id,
        leave_type,
        start_date: leave_start,
        end_date: leave_end,
        days_requested,
        reason,
        status: 'PENDING'
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'leave_request',
        entity_id: leave_request.id,
        action: 'CREATE',
        after_data: {
          employee_id,
          employee_no: employee.employee_no,
          leave_type,
          start_date: leave_start.toISOString(),
          end_date: leave_end.toISOString(),
          days_requested,
          reason,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      leave_request,
      message: 'Leave request submitted successfully',
      remaining_balance: remaining_balance - (leave_type === 'VACATION' ? days_requested : 0),
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create leave request' },
      { status: 500 }
    )
  }
}

// PUT /api/hr/leaves - Review/approve leave request
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      leave_request_id,
      workspace_id,
      action, // APPROVE, REJECT, CANCEL
      reviewed_by,
      review_comments,
      days_deducted // Actual days to deduct (may differ from requested)
    } = body

    if (!leave_request_id || !workspace_id || !action || !reviewed_by) {
      return NextResponse.json(
        { error: 'leave_request_id, workspace_id, action, and reviewed_by are required' },
        { status: 400 }
      )
    }

    // Get existing leave request
    const existing_request = await db.leaveRequest.findFirst({
      where: {
        id: leave_request_id,
        workspace_id
      },
      include: {
        employee: {
          select: {
            employee_no: true,
            first_name: true,
            last_name: true
          }
        }
      }
    })

    if (!existing_request) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    if (existing_request.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be reviewed' },
        { status: 409 }
      )
    }

    // Validate action
    if (!['APPROVE', 'REJECT', 'CANCEL'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE, REJECT, or CANCEL' },
        { status: 400 }
      )
    }

    // Prepare update data
    const update_data: any = {
      reviewed_by,
      reviewed_at: new Date(),
      review_comments,
      updated_at: new Date()
    }

    if (action === 'APPROVE') {
      update_data.status = 'APPROVED'
      update_data.days_deducted = days_deducted || existing_request.days_requested
    } else if (action === 'REJECT') {
      update_data.status = 'REJECTED'
    } else if (action === 'CANCEL') {
      update_data.status = 'CANCELLED'
    }

    // Ashley AI validation for leave approval
    if (action === 'APPROVE') {
      const ashley_check = await validateAshleyAI({
        context: 'LEAVE_APPROVAL',
        leave_request_id,
        employee_id: existing_request.employee_id,
        leave_type: existing_request.leave_type,
        days_requested: existing_request.days_requested,
        days_deducted: update_data.days_deducted,
        reviewer_id: reviewed_by
      })

      if (ashley_check.risk === 'RED') {
        return NextResponse.json({
          success: false,
          error: 'Ashley AI blocked leave approval',
          ashley_feedback: ashley_check,
          blocked: true
        }, { status: 422 })
      }
    }

    // Update leave request
    const updated_request = await db.leaveRequest.update({
      where: { id: leave_request_id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'leave_request',
        entity_id: leave_request_id,
        action: `LEAVE_${action}`,
        before_data: existing_request,
        after_data: {
          action,
          reviewed_by,
          review_comments,
          days_deducted: update_data.days_deducted
        }
      }
    })

    return NextResponse.json({
      success: true,
      leave_request: updated_request,
      message: `Leave request ${action.toLowerCase()}d successfully`
    })

  } catch (_error) {
    console.error('Error reviewing leave request:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to review leave request' },
      { status: 500 }
    )
  }
}