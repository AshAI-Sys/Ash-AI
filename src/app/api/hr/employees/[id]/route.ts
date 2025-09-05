// Individual Employee Management API for Stage 10 HR System
// Handles employee updates, termination, and detailed information

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/hr/employees/[id] - Get employee details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const employee = await db.employee.findFirst({
      where: {
        id,
        workspace_id
      },
      include: {
        attendance_records: {
          take: 30,
          orderBy: { attendance_date: 'desc' }
        },
        payroll_records: {
          take: 12,
          orderBy: { pay_period_end: 'desc' }
        },
        leave_requests: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { requested_at: 'desc' }
        },
        disciplinary_actions: {
          orderBy: { incident_date: 'desc' }
        },
        performance_reviews: {
          orderBy: { review_date: 'desc' }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Calculate employee summary
    const full_name = [
      employee.first_name,
      employee.middle_name,
      employee.last_name,
      employee.suffix
    ].filter(Boolean).join(' ')

    const current_year = new Date().getFullYear()
    const ytd_payroll = employee.payroll_records
      .filter(pr => pr.pay_period_end.getFullYear() === current_year && pr.status === 'PAID')
      .reduce((sum, pr) => sum + pr.net_pay, 0)

    const pending_leaves = employee.leave_requests
      .filter(lr => lr.status === 'PENDING').length

    const recent_disciplinary = employee.disciplinary_actions
      .filter(da => da.incident_date.getTime() > Date.now() - (365 * 24 * 60 * 60 * 1000))
      .length

    return NextResponse.json({
      success: true,
      employee: {
        ...employee,
        full_name,
        summary: {
          ytd_gross_pay: ytd_payroll,
          pending_leave_requests: pending_leaves,
          recent_disciplinary_actions: recent_disciplinary,
          years_of_service: Math.floor(
            (Date.now() - employee.hire_date.getTime()) / (365 * 24 * 60 * 60 * 1000)
          )
        }
      }
    })

  } catch (error) {
    console.error('Error fetching employee details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee details' },
      { status: 500 }
    )
  }
}

// PUT /api/hr/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      workspace_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      phone,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      sss_number,
      philhealth_number,
      pagibig_number,
      tin_number,
      employment_status,
      job_title,
      department,
      immediate_supervisor,
      basic_salary,
      daily_rate,
      hourly_rate,
      allowances,
      status
    } = body

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    // Get existing employee
    const existing_employee = await db.employee.findFirst({
      where: {
        id,
        workspace_id
      }
    })

    if (!existing_employee) {
      return NextResponse.json(
        { error: 'Employee not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Validate email uniqueness if changed
    if (email && email !== existing_employee.email) {
      const email_exists = await db.employee.findFirst({
        where: {
          email,
          workspace_id,
          status: 'ACTIVE',
          id: { not: id }
        }
      })

      if (email_exists) {
        return NextResponse.json(
          { error: 'Email address already exists for another active employee' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const update_data: any = {
      updated_at: new Date()
    }

    // Only update provided fields
    if (first_name !== undefined) update_data.first_name = first_name
    if (middle_name !== undefined) update_data.middle_name = middle_name
    if (last_name !== undefined) update_data.last_name = last_name
    if (suffix !== undefined) update_data.suffix = suffix
    if (email !== undefined) update_data.email = email
    if (phone !== undefined) update_data.phone = phone
    if (address_line1 !== undefined) update_data.address_line1 = address_line1
    if (address_line2 !== undefined) update_data.address_line2 = address_line2
    if (city !== undefined) update_data.city = city
    if (province !== undefined) update_data.province = province
    if (postal_code !== undefined) update_data.postal_code = postal_code
    if (sss_number !== undefined) update_data.sss_number = sss_number
    if (philhealth_number !== undefined) update_data.philhealth_number = philhealth_number
    if (pagibig_number !== undefined) update_data.pagibig_number = pagibig_number
    if (tin_number !== undefined) update_data.tin_number = tin_number
    if (employment_status !== undefined) update_data.employment_status = employment_status
    if (job_title !== undefined) update_data.job_title = job_title
    if (department !== undefined) update_data.department = department
    if (immediate_supervisor !== undefined) update_data.immediate_supervisor = immediate_supervisor
    if (basic_salary !== undefined) update_data.basic_salary = basic_salary
    if (daily_rate !== undefined) update_data.daily_rate = daily_rate
    if (hourly_rate !== undefined) update_data.hourly_rate = hourly_rate
    if (allowances !== undefined) update_data.allowances = allowances
    if (status !== undefined) update_data.status = status

    // Ashley AI validation for significant changes
    const significant_changes = ['employment_status', 'job_title', 'department', 'basic_salary', 'daily_rate', 'hourly_rate', 'status']
    const has_significant_change = significant_changes.some(field => update_data[field] !== undefined)

    if (has_significant_change) {
      const ashley_check = await validateAshleyAI({
        context: 'EMPLOYEE_UPDATE',
        employee_id: id,
        changes: Object.keys(update_data),
        previous_status: existing_employee.status,
        new_status: status || existing_employee.status,
        pay_changes: {
          basic_salary: update_data.basic_salary,
          daily_rate: update_data.daily_rate,
          hourly_rate: update_data.hourly_rate
        }
      })

      if (ashley_check.risk === 'RED') {
        return NextResponse.json({
          success: false,
          error: 'Ashley AI blocked employee update',
          ashley_feedback: ashley_check,
          blocked: true
        }, { status: 422 })
      }
    }

    // Update employee
    const updated_employee = await db.employee.update({
      where: { id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'employee',
        entity_id: id,
        action: 'UPDATE',
        before_data: existing_employee,
        after_data: update_data
      }
    })

    const full_name = [
      updated_employee.first_name,
      updated_employee.middle_name,
      updated_employee.last_name,
      updated_employee.suffix
    ].filter(Boolean).join(' ')

    return NextResponse.json({
      success: true,
      employee: {
        ...updated_employee,
        full_name
      },
      message: 'Employee updated successfully'
    })

  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

// DELETE /api/hr/employees/[id] - Terminate employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      workspace_id,
      termination_date,
      termination_reason,
      final_pay_amount,
      notes
    } = body

    if (!workspace_id || !termination_date || !termination_reason) {
      return NextResponse.json(
        { error: 'workspace_id, termination_date, and termination_reason are required' },
        { status: 400 }
      )
    }

    const existing_employee = await db.employee.findFirst({
      where: {
        id,
        workspace_id
      }
    })

    if (!existing_employee) {
      return NextResponse.json(
        { error: 'Employee not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    if (existing_employee.status === 'TERMINATED') {
      return NextResponse.json(
        { error: 'Employee is already terminated' },
        { status: 409 }
      )
    }

    // Ashley AI validation for termination
    const ashley_check = await validateAshleyAI({
      context: 'EMPLOYEE_TERMINATION',
      employee_id: id,
      termination_reason,
      employment_duration_months: Math.floor(
        (new Date(termination_date).getTime() - existing_employee.hire_date.getTime()) 
        / (30 * 24 * 60 * 60 * 1000)
      )
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked employee termination',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Terminate employee
    const terminated_employee = await db.employee.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        termination_date: new Date(termination_date),
        termination_reason,
        updated_at: new Date()
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'employee',
        entity_id: id,
        action: 'TERMINATE',
        before_data: existing_employee,
        after_data: {
          termination_date,
          termination_reason,
          final_pay_amount,
          notes,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      employee: terminated_employee,
      message: 'Employee terminated successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    })

  } catch (error) {
    console.error('Error terminating employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to terminate employee' },
      { status: 500 }
    )
  }
}