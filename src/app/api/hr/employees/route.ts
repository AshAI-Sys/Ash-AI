// HR Employees API for Stage 10 HR System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/hr/employees - Get employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const department = searchParams.get('department')
    const employment_status = searchParams.get('employment_status')
    const status = searchParams.get('status')
    const job_title = searchParams.get('job_title')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (department) where.department = department
    if (employment_status) where.employment_status = employment_status
    if (status) where.status = status
    if (job_title) where.job_title = { contains: job_title, mode: 'insensitive' }

    const employees = await db.employee.findMany({
      where,
      select: {
        id: true,
        employee_no: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        suffix: true,
        email: true,
        phone: true,
        hire_date: true,
        employment_status: true,
        job_title: true,
        department: true,
        immediate_supervisor: true,
        basic_salary: true,
        daily_rate: true,
        hourly_rate: true,
        status: true,
        created_at: true,
        updated_at: true
      },
      orderBy: [
        { department: 'asc' },
        { last_name: 'asc' },
        { first_name: 'asc' }
      ]
    })

    // Calculate summary data
    const employees_with_summary = employees.map(employee => {
      const full_name = [
        employee.first_name,
        employee.middle_name,
        employee.last_name,
        employee.suffix
      ].filter(Boolean).join(' ')

      return {
        ...employee,
        full_name,
        pay_type: employee.basic_salary ? 'MONTHLY' : 
                 employee.daily_rate ? 'DAILY' : 
                 employee.hourly_rate ? 'HOURLY' : 'UNSET'
      }
    })

    return NextResponse.json({
      success: true,
      employees: employees_with_summary
    })

  } catch (_error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

// POST /api/hr/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
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
      hire_date,
      employment_status,
      job_title,
      department,
      immediate_supervisor,
      basic_salary,
      daily_rate,
      hourly_rate,
      allowances = {}
    } = body

    if (!workspace_id || !first_name || !last_name || !hire_date || 
        !employment_status || !job_title || !department) {
      return NextResponse.json(
        { error: 'workspace_id, first_name, last_name, hire_date, employment_status, job_title, and department are required' },
        { status: 400 }
      )
    }

    // Validate workspace exists
    const workspace = await db.workspace.findUnique({
      where: { id: workspace_id }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Generate next employee number
    const last_employee = await db.employee.findFirst({
      where: { workspace_id },
      orderBy: { employee_no: 'desc' }
    })

    const employee_no = last_employee 
      ? (parseInt(last_employee.employee_no) + 1).toString().padStart(4, '0')
      : '0001'

    // Validate unique email if provided
    if (email) {
      const existing_email = await db.employee.findFirst({
        where: { 
          email,
          workspace_id,
          status: 'ACTIVE'
        }
      })

      if (existing_email) {
        return NextResponse.json(
          { error: 'Email address already exists for another active employee' },
          { status: 409 }
        )
      }
    }

    // Ashley AI validation for employee creation
    const ashley_check = await validateAshleyAI({
      context: 'EMPLOYEE_CREATION',
      workspace_id,
      employment_status,
      department,
      job_title,
      pay_structure: {
        basic_salary: basic_salary || null,
        daily_rate: daily_rate || null,
        hourly_rate: hourly_rate || null
      }
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked employee creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create employee
    const employee = await db.employee.create({
      data: {
        workspace_id,
        employee_no,
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
        hire_date: new Date(hire_date),
        employment_status,
        job_title,
        department,
        immediate_supervisor,
        basic_salary,
        daily_rate,
        hourly_rate,
        allowances
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'employee',
        entity_id: employee.id,
        action: 'CREATE',
        after_data: {
          employee_no,
          full_name: [first_name, middle_name, last_name, suffix].filter(Boolean).join(' '),
          department,
          job_title,
          employment_status,
          ashley_risk: ashley_check.risk
        }
      }
    })

    const full_name = [first_name, middle_name, last_name, suffix].filter(Boolean).join(' ')

    return NextResponse.json({
      success: true,
      employee: {
        ...employee,
        full_name
      },
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}