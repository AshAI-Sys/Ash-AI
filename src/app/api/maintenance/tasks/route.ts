// Maintenance Tasks API for Stage 11 Maintenance System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/maintenance/tasks - Get maintenance tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const schedule_id = searchParams.get('schedule_id')
    const equipment_type = searchParams.get('equipment_type')
    const equipment_id = searchParams.get('equipment_id')
    const task_type = searchParams.get('task_type')
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const priority = searchParams.get('priority')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (schedule_id) where.schedule_id = schedule_id
    if (equipment_type) where.equipment_type = equipment_type
    if (equipment_id) where.equipment_id = equipment_id
    if (task_type) where.task_type = task_type
    if (status) where.status = status
    if (assigned_to) where.assigned_to = assigned_to
    if (priority) where.priority = priority
    if (date_from && date_to) {
      where.created_at = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    const maintenance_tasks = await db.maintenanceTask.findMany({
      where,
      include: {
        schedule: {
          select: {
            id: true,
            schedule_name: true,
            frequency_type: true,
            frequency_value: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduled_date: 'asc' },
        { created_at: 'desc' }
      ]
    })

    // Add summary data
    const tasks_with_summary = maintenance_tasks.map(task => {
      const is_overdue = task.scheduled_date && new Date() > task.scheduled_date && !['COMPLETED', 'CANCELLED'].includes(task.status)
      const days_overdue = is_overdue ? Math.ceil((Date.now() - task.scheduled_date!.getTime()) / (1000 * 60 * 60 * 24)) : 0
      
      // Calculate actual vs estimated time
      const time_variance = task.actual_duration && task.estimated_duration 
        ? task.actual_duration - task.estimated_duration 
        : null

      // Calculate cost breakdown
      const cost_breakdown = {
        labor: task.labor_cost || 0,
        parts: task.parts_cost || 0,
        total: task.total_cost || 0
      }

      return {
        ...task,
        summary: {
          is_overdue,
          days_overdue,
          time_variance_minutes: time_variance,
          cost_breakdown,
          is_scheduled_maintenance: !!task.schedule_id,
          requires_quality_check: task.status === 'COMPLETED' && task.quality_check_passed === null,
          has_follow_up: task.follow_up_required && !task.next_inspection_date
        }
      }
    })

    return NextResponse.json({
      success: true,
      maintenance_tasks: tasks_with_summary
    })

  } catch (error) {
    console.error('Error fetching maintenance tasks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance tasks' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/tasks - Create maintenance task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      schedule_id, // Optional - link to schedule for scheduled maintenance
      equipment_type,
      equipment_id,
      task_type, // SCHEDULED/BREAKDOWN/INSPECTION/UPGRADE
      priority = 'MEDIUM',
      title,
      description,
      assigned_to,
      requested_by,
      scheduled_date,
      estimated_duration
    } = body

    if (!workspace_id || !equipment_type || !task_type || !title) {
      return NextResponse.json(
        { error: 'workspace_id, equipment_type, task_type, and title are required' },
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

    // Validate schedule if provided
    if (schedule_id) {
      const schedule = await db.maintenanceSchedule.findFirst({
        where: {
          id: schedule_id,
          workspace_id
        }
      })

      if (!schedule) {
        return NextResponse.json(
          { error: 'Maintenance schedule not found' },
          { status: 404 }
        )
      }
    }

    // Validate equipment if provided
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

    // Generate task number
    const task_count = await db.maintenanceTask.count({
      where: { workspace_id }
    })
    const task_no = `MT${String(task_count + 1).padStart(6, '0')}`

    // Ashley AI validation for maintenance task
    const ashley_check = await validateAshleyAI({
      context: 'MAINTENANCE_TASK_CREATION',
      equipment_type,
      task_type,
      priority,
      is_breakdown: task_type === 'BREAKDOWN',
      estimated_duration
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked maintenance task creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create maintenance task
    const maintenance_task = await db.maintenanceTask.create({
      data: {
        workspace_id,
        schedule_id,
        task_no,
        equipment_type,
        equipment_id,
        task_type,
        priority,
        title,
        description,
        assigned_to,
        requested_by,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
        estimated_duration
      }
    })

    // If this is from a schedule, update the schedule's next due date
    if (schedule_id) {
      const schedule = await db.maintenanceSchedule.findUnique({
        where: { id: schedule_id }
      })

      if (schedule) {
        const next_due = new Date()
        switch (schedule.frequency_type) {
          case 'DAILY':
            next_due.setDate(next_due.getDate() + schedule.frequency_value)
            break
          case 'WEEKLY':
            next_due.setDate(next_due.getDate() + (schedule.frequency_value * 7))
            break
          case 'MONTHLY':
            next_due.setMonth(next_due.getMonth() + schedule.frequency_value)
            break
          case 'QUARTERLY':
            next_due.setMonth(next_due.getMonth() + (schedule.frequency_value * 3))
            break
          case 'YEARLY':
            next_due.setFullYear(next_due.getFullYear() + schedule.frequency_value)
            break
        }

        await db.maintenanceSchedule.update({
          where: { id: schedule_id },
          data: { next_due_date: next_due }
        })
      }
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'maintenance_task',
        entity_id: maintenance_task.id,
        action: 'CREATE',
        after_data: {
          task_no,
          equipment_type,
          task_type,
          priority,
          title,
          assigned_to,
          scheduled_date: scheduled_date || null,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      maintenance_task,
      message: 'Maintenance task created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating maintenance task:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance task' },
      { status: 500 }
    )
  }
}

// PUT /api/maintenance/tasks - Update maintenance task status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      task_id,
      workspace_id,
      action, // START, COMPLETE, PAUSE, CANCEL, UPDATE_PROGRESS
      status,
      assigned_to,
      scheduled_date,
      estimated_duration,
      resolution_notes,
      parts_used = [], // [{part_id, part_name, quantity, cost}]
      labor_cost,
      quality_check_passed,
      follow_up_required,
      next_inspection_date
    } = body

    if (!task_id || !workspace_id) {
      return NextResponse.json(
        { error: 'task_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing task
    const existing_task = await db.maintenanceTask.findFirst({
      where: {
        id: task_id,
        workspace_id
      }
    })

    if (!existing_task) {
      return NextResponse.json(
        { error: 'Maintenance task not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }
    const now = new Date()

    switch (action) {
      case 'START':
        if (existing_task.status !== 'OPEN') {
          return NextResponse.json(
            { error: 'Only open tasks can be started' },
            { status: 409 }
          )
        }
        update_data.status = 'IN_PROGRESS'
        update_data.started_at = now
        break

      case 'COMPLETE':
        if (!['IN_PROGRESS', 'WAITING_PARTS'].includes(existing_task.status)) {
          return NextResponse.json(
            { error: 'Only in-progress or waiting tasks can be completed' },
            { status: 409 }
          )
        }
        update_data.status = 'COMPLETED'
        update_data.completed_at = now
        
        // Calculate actual duration if task was started
        if (existing_task.started_at) {
          update_data.actual_duration = Math.floor(
            (now.getTime() - existing_task.started_at.getTime()) / (1000 * 60)
          )
        }
        
        if (resolution_notes) update_data.resolution_notes = resolution_notes
        if (quality_check_passed !== undefined) update_data.quality_check_passed = quality_check_passed
        if (follow_up_required !== undefined) update_data.follow_up_required = follow_up_required
        if (next_inspection_date) update_data.next_inspection_date = new Date(next_inspection_date)
        break

      case 'PAUSE':
        if (existing_task.status !== 'IN_PROGRESS') {
          return NextResponse.json(
            { error: 'Only in-progress tasks can be paused' },
            { status: 409 }
          )
        }
        update_data.status = 'WAITING_PARTS'
        break

      case 'CANCEL':
        if (['COMPLETED', 'CANCELLED'].includes(existing_task.status)) {
          return NextResponse.json(
            { error: 'Task is already completed or cancelled' },
            { status: 409 }
          )
        }
        update_data.status = 'CANCELLED'
        break

      case 'UPDATE_PROGRESS':
        // Allow updates to various fields without changing status
        if (assigned_to !== undefined) update_data.assigned_to = assigned_to
        if (scheduled_date !== undefined) update_data.scheduled_date = scheduled_date ? new Date(scheduled_date) : null
        if (estimated_duration !== undefined) update_data.estimated_duration = estimated_duration
        if (status !== undefined) update_data.status = status
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Handle parts and costs
    if (parts_used.length > 0) {
      update_data.parts_used = parts_used
      const parts_cost = parts_used.reduce((sum: number, part: any) => 
        sum + ((part.quantity || 0) * (part.cost || 0)), 0
      )
      update_data.parts_cost = parts_cost
    }

    if (labor_cost !== undefined) {
      update_data.labor_cost = labor_cost
    }

    // Calculate total cost
    if (update_data.parts_cost !== undefined || update_data.labor_cost !== undefined) {
      update_data.total_cost = (update_data.parts_cost || existing_task.parts_cost || 0) + 
                               (update_data.labor_cost || existing_task.labor_cost || 0)
    }

    // Update task
    const updated_task = await db.maintenanceTask.update({
      where: { id: task_id },
      data: update_data
    })

    // Update parts inventory if parts were used
    if (parts_used.length > 0) {
      for (const part of parts_used) {
        if (part.part_id) {
          try {
            await db.maintenancePart.update({
              where: { id: part.part_id },
              data: {
                current_stock: { decrement: part.quantity || 0 },
                last_used_date: now,
                total_used_ytd: { increment: part.quantity || 0 }
              }
            })
          } catch (part_error) {
            console.warn(`Failed to update inventory for part ${part.part_id}:`, part_error)
          }
        }
      }
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'maintenance_task',
        entity_id: task_id,
        action: `TASK_${action}`,
        before_data: existing_task,
        after_data: {
          action,
          parts_used,
          total_cost: update_data.total_cost,
          status: update_data.status
        }
      }
    })

    return NextResponse.json({
      success: true,
      maintenance_task: updated_task,
      message: `Maintenance task ${action.toLowerCase().replace('_', ' ')}d successfully`
    })

  } catch (error) {
    console.error('Error updating maintenance task:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance task' },
      { status: 500 }
    )
  }
}