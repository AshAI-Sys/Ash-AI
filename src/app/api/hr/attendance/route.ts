// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// HR Attendance API for Stage 10 HR System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/hr/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const employee_id = searchParams.get('employee_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
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
    if (date_from && date_to) {
      where.attendance_date = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    // If department filter is specified, join with employee
    if (department) {
      where.employee = {
        department
      }
    }

    const attendance_records = await db.attendanceRecord.findMany({
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
            job_title: true
          }
        }
      },
      orderBy: [
        { attendance_date: 'desc' },
        { employee: { last_name: 'asc' } }
      ]
    })

    // Calculate summary data
    const records_with_summary = attendance_records.map(record => {
      const full_name = [
        record.employee.first_name,
        record.employee.middle_name,
        record.employee.last_name,
        record.employee.suffix
      ].filter(Boolean).join(' ')

      // Calculate total hours worked
      const total_hours = record.regular_hours + record.overtime_hours + record.night_diff_hours + record.holiday_hours

      return {
        ...record,
        employee: {
          ...record.employee,
          full_name
        },
        summary: {
          total_hours_worked: total_hours,
          is_complete: !!(record.time_in && record.time_out),
          has_overtime: record.overtime_hours > 0,
          has_violations: record.late_minutes > 0 || record.undertime_minutes > 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      attendance_records: records_with_summary
    })

  } catch (_error) {
    console.error('Error fetching attendance records:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}

// POST /api/hr/attendance - Record attendance (time in/out)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      employee_id,
      attendance_date,
      action, // TIME_IN, TIME_OUT, BREAK_START, BREAK_END
      timestamp,
      method = 'MANUAL', // BIOMETRIC, MANUAL, SYSTEM
      notes
    } = body

    if (!workspace_id || !employee_id || !attendance_date || !action) {
      return NextResponse.json(
        { error: 'workspace_id, employee_id, attendance_date, and action are required' },
        { status: 400 }
      )
    }

    // Validate employee exists
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

    const record_date = new Date(attendance_date)
    record_date.setHours(0, 0, 0, 0) // Normalize to start of day

    const action_timestamp = timestamp ? new Date(timestamp) : new Date()

    // Find or create attendance record for the date
    let attendance_record = await db.attendanceRecord.findFirst({
      where: {
        workspace_id,
        employee_id,
        attendance_date: record_date
      }
    })

    if (!attendance_record) {
      attendance_record = await db.attendanceRecord.create({
        data: {
          workspace_id,
          employee_id,
          attendance_date: record_date,
          status: 'PRESENT'
        }
      })
    }

    // Validate action sequence
    if (action === 'TIME_OUT' && !attendance_record.time_in) {
      return NextResponse.json(
        { error: 'Cannot time out without time in' },
        { status: 409 }
      )
    }

    if (action === 'BREAK_END' && !attendance_record.break_start) {
      return NextResponse.json(
        { error: 'Cannot end break without starting break' },
        { status: 409 }
      )
    }

    // Ashley AI validation for attendance anomalies
    const ashley_check = await validateAshleyAI({
      context: 'ATTENDANCE_RECORD',
      employee_id,
      action,
      timestamp: action_timestamp.toISOString(),
      current_record: attendance_record,
      method
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked attendance recording',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Update attendance record based on action
    const update_data: any = { updated_at: new Date() }

    switch (action) {
      case 'TIME_IN':
        if (attendance_record.time_in) {
          return NextResponse.json(
            { error: 'Employee has already timed in for this date' },
            { status: 409 }
          )
        }
        update_data.time_in = action_timestamp
        update_data.time_in_method = method
        break

      case 'TIME_OUT':
        if (attendance_record.time_out) {
          return NextResponse.json(
            { error: 'Employee has already timed out for this date' },
            { status: 409 }
          )
        }
        update_data.time_out = action_timestamp
        update_data.time_out_method = method
        
        // Calculate hours worked
        if (attendance_record.time_in) {
          const time_in = new Date(attendance_record.time_in)
          const time_out = action_timestamp
          
          let total_minutes = Math.floor((new Date(time_out).getTime() - new Date(time_in).getTime()) / (1000 * 60))
          
          // Subtract break time if applicable
          if (attendance_record.break_start && attendance_record.break_end) {
            const break_minutes = Math.floor(
              (new Date(attendance_record.break_end).getTime() - new Date(attendance_record.break_start).getTime()) 
              / (1000 * 60)
            )
            total_minutes -= break_minutes
          }
          
          // Standard work day is 8 hours (480 minutes)
          const standard_minutes = 8 * 60
          const regular_minutes = Math.min(total_minutes, standard_minutes)
          const overtime_minutes = Math.max(0, total_minutes - standard_minutes)
          
          update_data.regular_hours = Math.round((regular_minutes / 60) * 100) / 100
          update_data.overtime_hours = Math.round((overtime_minutes / 60) * 100) / 100
          
          // Check for late/undertime
          const scheduled_time_in = new Date(record_date)
          scheduled_time_in.setHours(8, 0, 0, 0) // Assume 8 AM start
          
          if (time_in > scheduled_time_in) {
            update_data.late_minutes = Math.floor((new Date(time_in).getTime() - new Date(scheduled_time_in).getTime()) / (1000 * 60))
          }
          
          if (regular_minutes < standard_minutes) {
            update_data.undertime_minutes = standard_minutes - regular_minutes
          }
        }
        break

      case 'BREAK_START':
        if (attendance_record.break_start) {
          return NextResponse.json(
            { error: 'Break has already been started' },
            { status: 409 }
          )
        }
        update_data.break_start = action_timestamp
        break

      case 'BREAK_END':
        update_data.break_end = action_timestamp
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be TIME_IN, TIME_OUT, BREAK_START, or BREAK_END' },
          { status: 400 }
        )
    }

    if (notes) {
      update_data.notes = notes
    }

    // Update the record
    const updated_record = await db.attendanceRecord.update({
      where: { id: attendance_record.id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'attendance_record',
        entity_id: updated_record.id,
        action: `ATTENDANCE_${action}`,
        after_data: {
          employee_id,
          employee_no: employee.employee_no,
          attendance_date: record_date.toISOString(),
          action,
          timestamp: action_timestamp.toISOString(),
          method,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      attendance_record: updated_record,
      message: `${action.toLowerCase().replace('_', ' ')} recorded successfully`,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    })

  } catch (_error) {
    console.error('Error recording attendance:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to record attendance' },
      { status: 500 }
    )
  }
}