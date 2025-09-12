// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Maintenance Schedules API for Stage 11 Maintenance System
// Based on CLIENT_UPDATED_PLAN.md specifications


// Helper function to calculate next due date
function calculateNextDueDate(frequency_type: string, frequency_value: number, last_date: Date): Date {
  const next_date = new Date(last_date)
  
  switch (frequency_type) {
    case 'DAILY':
      next_date.setDate(next_date.getDate() + frequency_value)
      break
    case 'WEEKLY':
      next_date.setDate(next_date.getDate() + (frequency_value * 7))
      break
    case 'MONTHLY':
      next_date.setMonth(next_date.getMonth() + frequency_value)
      break
    case 'QUARTERLY':
      next_date.setMonth(next_date.getMonth() + (frequency_value * 3))
      break
    case 'YEARLY':
      next_date.setFullYear(next_date.getFullYear() + frequency_value)
      break
    default:
      // For USAGE_BASED, return same date (requires manual update)
      break
  }
  
  return next_date
}

// GET /api/maintenance/schedules - Get maintenance schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const equipment_type = searchParams.get('equipment_type')
    const equipment_id = searchParams.get('equipment_id')
    const assigned_to = searchParams.get('assigned_to')
    const priority = searchParams.get('priority')
    const active = searchParams.get('active')
    const overdue_only = searchParams.get('overdue_only')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (equipment_type) where.equipment_type = equipment_type
    if (equipment_id) where.equipment_id = equipment_id
    if (assigned_to) where.assigned_to = assigned_to
    if (priority) where.priority = priority
    if (active !== null) where.active = active === 'true'
    
    if (overdue_only === 'true') {
      where.next_due_date = { lt: new Date() }
      where.active = true
    }

    const schedules = await db.maintenanceSchedule.findMany({
      where,
      include: {
        maintenance_tasks: {
          take: 5,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            task_no: true,
            status: true,
            completed_at: true,
            total_cost: true
          }
        },
        _count: {
          select: {
            maintenance_tasks: true
          }
        }
      },
      orderBy: [
        { next_due_date: 'asc' },
        { priority: 'desc' },
        { schedule_name: 'asc' }
      ]
    })

    // Add summary data
    const schedules_with_summary = schedules.map(schedule => {
      const days_until_due = Math.ceil(
        (new Date(schedule.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      const completed_tasks = schedule.maintenance_tasks.filter(t => t.status === 'COMPLETED').length
      const total_cost_ytd = schedule.maintenance_tasks
        .filter(t => t.completed_at && t.completed_at.getFullYear() === new Date().getFullYear())
        .reduce((sum, t) => sum + (t.total_cost || 0), 0)

      return {
        ...schedule,
        summary: {
          days_until_due,
          is_overdue: days_until_due < 0,
          is_due_soon: days_until_due >= 0 && days_until_due <= 7,
          total_tasks_created: schedule._count.maintenance_tasks,
          completed_tasks_count: completed_tasks,
          total_cost_ytd: total_cost_ytd,
          last_completed: schedule.maintenance_tasks.find(t => t.status === 'COMPLETED')?.completed_at || null
        }
      }
    })

    return NextResponse.json({
      success: true,
      schedules: schedules_with_summary
    })

  } catch (_error) {
    console.error('Error fetching maintenance schedules:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance schedules' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/schedules - Create maintenance schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      equipment_type,
      equipment_id,
      schedule_name,
      description,
      frequency_type, // DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY/USAGE_BASED
      frequency_value,
      estimated_duration,
      assigned_to,
      priority = 'MEDIUM',
      start_date // When to start the schedule
    } = body

    if (!workspace_id || !equipment_type || !schedule_name || !frequency_type || !frequency_value || !start_date) {
      return NextResponse.json(
        { error: 'workspace_id, equipment_type, schedule_name, frequency_type, frequency_value, and start_date are required' },
        { status: 400 }
      )
    }

    // Validate workspace exists
    const _workspace = await db.workspace.findUnique({
      where: { id: workspace_id }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Validate equipment exists if equipment_id provided
    if (equipment_id) {
      const equipment = await db.machine.findFirst({
        where: {
          id: equipment_id,
          workspace_id
        }
      })

      if (!equipment) {
        return NextResponse.json(
          { error: 'Equipment not found or does not belong to workspace' },
          { status: 404 }
        )
      }
    }

    // Validate assigned technician if provided
    if (assigned_to) {
      const technician = await db.employee.findFirst({
        where: {
          id: assigned_to,
          workspace_id,
          status: 'ACTIVE'
        }
      })

      if (!technician) {
        return NextResponse.json(
          { error: 'Assigned technician not found or not active' },
          { status: 404 }
        )
      }
    }

    // Calculate first due date
    const next_due_date = calculateNextDueDate(frequency_type, frequency_value, new Date(start_date))

    // Ashley AI validation for maintenance schedule
    const ashley_check = await validateAshleyAI({
      context: 'MAINTENANCE_SCHEDULE_CREATION',
      equipment_type,
      frequency_type,
      frequency_value,
      priority,
      estimated_duration
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked maintenance schedule creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create maintenance schedule
    const schedule = await db.maintenanceSchedule.create({
      data: {
        workspace_id,
        equipment_type,
        equipment_id,
        schedule_name,
        description,
        frequency_type,
        frequency_value,
        estimated_duration,
        assigned_to,
        next_due_date,
        priority
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'maintenance_schedule',
        entity_id: schedule.id,
        action: 'CREATE',
        after_data: {
          schedule_name,
          equipment_type,
          frequency_type,
          frequency_value,
          next_due_date: next_due_date.toISOString(),
          priority,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Maintenance schedule created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating maintenance schedule:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance schedule' },
      { status: 500 }
    )
  }
}

// PUT /api/maintenance/schedules - Update maintenance schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schedule_id,
      workspace_id,
      schedule_name,
      description,
      frequency_type,
      frequency_value,
      estimated_duration,
      assigned_to,
      priority,
      active,
      next_due_date // Manual override
    } = body

    if (!schedule_id || !workspace_id) {
      return NextResponse.json(
        { error: 'schedule_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing schedule
    const existing_schedule = await db.maintenanceSchedule.findFirst({
      where: {
        id: schedule_id,
        workspace_id
      }
    })

    if (!existing_schedule) {
      return NextResponse.json(
        { error: 'Maintenance schedule not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }
    
    if (schedule_name !== undefined) update_data.schedule_name = schedule_name
    if (description !== undefined) update_data.description = description
    if (frequency_type !== undefined) update_data.frequency_type = frequency_type
    if (frequency_value !== undefined) update_data.frequency_value = frequency_value
    if (estimated_duration !== undefined) update_data.estimated_duration = estimated_duration
    if (assigned_to !== undefined) update_data.assigned_to = assigned_to
    if (priority !== undefined) update_data.priority = priority
    if (active !== undefined) update_data.active = active
    
    // Handle next due date update
    if (next_due_date) {
      update_data.next_due_date = new Date(next_due_date)
    } else if (frequency_type && frequency_value) {
      // Recalculate due date if frequency changed
      update_data.next_due_date = calculateNextDueDate(
        frequency_type, 
        frequency_value, 
        existing_schedule.next_due_date
      )
    }

    // Update schedule
    const updated_schedule = await db.maintenanceSchedule.update({
      where: { id: schedule_id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'maintenance_schedule',
        entity_id: schedule_id,
        action: 'UPDATE',
        before_data: existing_schedule,
        after_data: update_data
      }
    })

    return NextResponse.json({
      success: true,
      schedule: updated_schedule,
      message: 'Maintenance schedule updated successfully'
    })

  } catch (_error) {
    console.error('Error updating maintenance schedule:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance schedule' },
      { status: 500 }
    )
  }
}