import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// HR Payroll API for Stage 10 HR System
// Philippine tax and compliance-ready payroll processing
// Based on CLIENT_UPDATED_PLAN.md specifications


// Philippine tax tables for 2024 (simplified)
const TAX_BRACKETS = [
  { min: 0, max: 20833, rate: 0 },
  { min: 20833, max: 33333, rate: 0.20 },
  { min: 33333, max: 66667, rate: 0.25 },
  { min: 66667, max: 166667, rate: 0.30 },
  { min: 166667, max: 666667, rate: 0.32 },
  { min: 666667, max: Infinity, rate: 0.35 }
]

const SSS_CONTRIBUTIONS = [
  { min: 0, max: 4250, employee: 180, employer: 382.5 },
  { min: 4250, max: 4749.99, employee: 202.5, employer: 427.5 },
  { min: 4750, max: 5249.99, employee: 225, employer: 472.5 },
  { min: 5250, max: 5749.99, employee: 247.5, employer: 517.5 },
  // ... more brackets would be here in production
  { min: 19750, max: Infinity, employee: 900, employer: 1800 }
]

function calculateWithholdingTax(monthly_gross: number): number {
  let tax = 0
  let remaining = monthly_gross

  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0) break
    
    const taxable_amount = Math.min(remaining, bracket.max - bracket.min)
    tax += taxable_amount * bracket.rate
    remaining -= taxable_amount
  }

  return Math.round(tax * 100) / 100
}

function calculateSSS(monthly_salary: number): { employee: number, employer: number } {
  const bracket = SSS_CONTRIBUTIONS.find(b => monthly_salary >= b.min && monthly_salary <= b.max)
  return bracket || { employee: 900, employer: 1800 }
}

function calculatePhilHealth(monthly_salary: number): { employee: number, employer: number } {
  // PhilHealth 2024 rates (simplified)
  const premium = Math.min(Math.max(monthly_salary * 0.04, 200), 1600)
  return {
    employee: Math.round((premium / 2) * 100) / 100,
    employer: Math.round((premium / 2) * 100) / 100
  }
}

function calculatePagibig(monthly_salary: number): { employee: number, employer: number } {
  // Pag-IBIG 2024 rates
  const employee_rate = monthly_salary <= 1500 ? 0.01 : 0.02
  const employee_contribution = Math.min(monthly_salary * employee_rate, 200)
  const employer_contribution = Math.min(monthly_salary * 0.02, 200)
  
  return {
    employee: Math.round(employee_contribution * 100) / 100,
    employer: Math.round(employer_contribution * 100) / 100
  }
}

// GET /api/hr/payroll - Get payroll records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const employee_id = searchParams.get('employee_id')
    const pay_period_start = searchParams.get('pay_period_start')
    const pay_period_end = searchParams.get('pay_period_end')
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (employee_id) where.employee_id = employee_id
    if (status) where.status = status
    if (pay_period_start && pay_period_end) {
      where.pay_period_start = { gte: new Date(pay_period_start) }
      where.pay_period_end = { lte: new Date(pay_period_end) }
    }

    // If department filter, join with employee
    if (department) {
      where.employee = { department }
    }

    const payroll_records = await db.payrollRecord.findMany({
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
            employment_status: true
          }
        }
      },
      orderBy: [
        { pay_period_end: 'desc' },
        { employee: { last_name: 'asc' } }
      ]
    })

    // Add summary data
    const records_with_summary = payroll_records.map(record => {
      const full_name = [
        record.employee.first_name,
        record.employee.middle_name,
        record.employee.last_name,
        record.employee.suffix
      ].filter(Boolean).join(' ')

      return {
        ...record,
        employee: {
          ...record.employee,
          full_name
        },
        summary: {
          days_covered: Math.ceil(
            (new Date(record.pay_period_end).getTime() - new Date(record.pay_period_start).getTime()) 
            / (1000 * 60 * 60 * 24)
          ),
          total_government_deductions: record.sss_employee + record.philhealth_employee + record.pagibig_employee + record.withholding_tax,
          take_home_percentage: record.gross_pay > 0 ? Math.round((record.net_pay / record.gross_pay) * 100) : 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      payroll_records: records_with_summary
    })

  } catch (_error) {
    console.error('Error fetching payroll records:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records' },
      { status: 500 }
    )
  }
}

// POST /api/hr/payroll - Process payroll for period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      pay_period_start,
      pay_period_end,
      employee_ids = [], // If empty, process all active employees
      override_calculations = false, // Allow manual adjustments
      processed_by
    } = body

    if (!workspace_id || !pay_period_start || !pay_period_end) {
      return NextResponse.json(
        { error: 'workspace_id, pay_period_start, and pay_period_end are required' },
        { status: 400 }
      )
    }

    const start_date = new Date(pay_period_start)
    const end_date = new Date(pay_period_end)

    // Get employees to process
    const where_employees: any = {
      workspace_id,
      status: 'ACTIVE'
    }
    if (employee_ids.length > 0) {
      where_employees.id = { in: employee_ids }
    }

    const employees = await db.employee.findMany({
      where: where_employees,
      include: {
        attendance_records: {
          where: {
            attendance_date: {
              gte: start_date,
              lte: end_date
            }
          }
        }
      }
    })

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'No active employees found for processing' },
        { status: 404 }
      )
    }

    // Check for existing payroll records in this period
    const existing_records = await db.payrollRecord.findMany({
      where: {
        workspace_id,
        pay_period_start: start_date,
        pay_period_end: end_date,
        employee_id: { in: employees.map(e => e.id) },
        status: { not: 'CANCELLED' }
      }
    })

    if (existing_records.length > 0 && !override_calculations) {
      return NextResponse.json(
        { error: `Payroll records already exist for this period. Use override_calculations=true to reprocess.` },
        { status: 409 }
      )
    }

    const payroll_results = []
    let total_gross = 0
    let total_net = 0
    let total_employer_cost = 0

    // Process each employee
    for (const employee of employees) {
      try {
        // Calculate basic pay based on employment type
        let basic_pay = 0
        let regular_hours = 0
        let overtime_hours = 0
        let night_diff_hours = 0
        let holiday_hours = 0
        let present_days = 0

        // Aggregate attendance data
        for (const attendance of employee.attendance_records) {
          if (attendance.status === 'PRESENT') {
            present_days++
            regular_hours += attendance.regular_hours
            overtime_hours += attendance.overtime_hours
            night_diff_hours += attendance.night_diff_hours
            holiday_hours += attendance.holiday_hours
          }
        }

        // Calculate basic pay based on pay structure
        if (employee.basic_salary) {
          // Monthly salary
          basic_pay = employee.basic_salary
        } else if (employee.daily_rate) {
          // Daily rate
          basic_pay = employee.daily_rate * present_days
        } else if (employee.hourly_rate) {
          // Hourly rate
          basic_pay = employee.hourly_rate * regular_hours
        } else {
          continue // Skip employee with no pay structure
        }

        // Calculate other pay components
        const overtime_pay = employee.hourly_rate 
          ? employee.hourly_rate * 1.25 * overtime_hours 
          : (employee.basic_salary || employee.daily_rate * 22) / (8 * 22) * 1.25 * overtime_hours
        
        const night_differential = employee.hourly_rate 
          ? employee.hourly_rate * 0.10 * night_diff_hours 
          : (employee.basic_salary || employee.daily_rate * 22) / (8 * 22) * 0.10 * night_diff_hours
        
        const holiday_pay_calc = employee.hourly_rate 
          ? employee.hourly_rate * 2.0 * holiday_hours 
          : (employee.basic_salary || employee.daily_rate * 22) / (8 * 22) * 2.0 * holiday_hours

        // Add allowances
        const allowances_total = employee.allowances 
          ? Object.values(employee.allowances as Record<string, number>).reduce((sum, val) => sum + val, 0)
          : 0

        // Calculate gross pay
        const gross_pay = basic_pay + overtime_pay + night_differential + holiday_pay_calc + allowances_total

        // Calculate government deductions
        const sss = calculateSSS(gross_pay)
        const philhealth = calculatePhilHealth(gross_pay)
        const pagibig = calculatePagibig(gross_pay)
        const withholding_tax = calculateWithholdingTax(gross_pay)

        const total_deductions = sss.employee + philhealth.employee + pagibig.employee + withholding_tax
        const net_pay = gross_pay - total_deductions
        const employer_cost = gross_pay + sss.employer + philhealth.employer + pagibig.employer

        // Ashley AI validation for payroll anomalies
        const ashley_check = await validateAshleyAI({
          context: 'PAYROLL_PROCESSING',
          employee_id: employee.id,
          gross_pay,
          net_pay,
          days_worked: present_days,
          overtime_hours,
          deductions_percentage: (total_deductions / gross_pay) * 100
        })

        if (ashley_check.risk === 'RED') {
          console.warn(`Ashley AI flagged payroll for employee ${employee.employee_no}:`, ashley_check.issues)
          continue // Skip this employee but continue processing others
        }

        // Create or update payroll record
        let payroll_record
        const existing_record = existing_records.find(r => r.employee_id === employee.id)

        if (existing_record && override_calculations) {
          payroll_record = await db.payrollRecord.update({
            where: { id: existing_record.id },
            data: {
              basic_pay,
              overtime_pay,
              night_differential,
              holiday_pay: holiday_pay_calc,
              allowances: allowances_total,
              gross_pay,
              sss_employee: sss.employee,
              sss_employer: sss.employer,
              philhealth_employee: philhealth.employee,
              philhealth_employer: philhealth.employer,
              pagibig_employee: pagibig.employee,
              pagibig_employer: pagibig.employer,
              withholding_tax,
              total_deductions,
              net_pay,
              employer_cost,
              processed_by,
              updated_at: new Date()
            }
          })
        } else if (!existing_record) {
          payroll_record = await db.payrollRecord.create({
            data: {
              workspace_id,
              employee_id: employee.id,
              pay_period_start: start_date,
              pay_period_end: end_date,
              basic_pay,
              overtime_pay,
              night_differential,
              holiday_pay: holiday_pay_calc,
              allowances: allowances_total,
              gross_pay,
              sss_employee: sss.employee,
              sss_employer: sss.employer,
              philhealth_employee: philhealth.employee,
              philhealth_employer: philhealth.employer,
              pagibig_employee: pagibig.employee,
              pagibig_employer: pagibig.employer,
              withholding_tax,
              total_deductions,
              net_pay,
              employer_cost,
              processed_by,
              status: 'DRAFT'
            }
          })
        }

        if (payroll_record) {
          payroll_results.push({
            employee_no: employee.employee_no,
            full_name: [employee.first_name, employee.middle_name, employee.last_name, employee.suffix].filter(Boolean).join(' '),
            gross_pay,
            net_pay,
            employer_cost,
            ashley_risk: ashley_check.risk,
            warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
          })

          total_gross += gross_pay
          total_net += net_pay
          total_employer_cost += employer_cost
        }

      } catch (employee_error) {
        console.error(`Error processing payroll for employee ${employee.employee_no}:`, employee_error)
        continue
      }
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'payroll_record',
        entity_id: 'batch',
        action: 'PAYROLL_PROCESS',
        after_data: {
          pay_period: `${pay_period_start} to ${pay_period_end}`,
          employees_processed: payroll_results.length,
          total_gross,
          total_net,
          total_employer_cost,
          processed_by
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Payroll processed for ${payroll_results.length} employees`,
      payroll_results,
      summary: {
        employees_processed: payroll_results.length,
        total_gross_pay: total_gross,
        total_net_pay: total_net,
        total_employer_cost: total_employer_cost,
        period: `${pay_period_start} to ${pay_period_end}`
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error processing payroll:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to process payroll' },
      { status: 500 }
    )
  }
}