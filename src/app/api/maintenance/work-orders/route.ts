// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// Work Order Management API for Stage 11 Maintenance System
// Based on CLIENT_UPDATED_PLAN.md specifications

// Helper function to generate work order number
async function generateWorkOrderNumber(workspace_id: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `WO-${year}-`

  // Find the latest work order number for this year
  const lastWorkOrder = await db.maintenanceWorkOrder.findFirst({
    where: {
      workspace_id,
      wo_number: { startsWith: prefix }
    },
    orderBy: { wo_number: 'desc' }
  })

  let nextNumber = 1
  if (lastWorkOrder) {
    const lastNumber = parseInt(lastWorkOrder.wo_number.split('-').pop() || '0')
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// GET /api/maintenance/work-orders - Get work orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const asset_id = searchParams.get('asset_id')
    const schedule_id = searchParams.get('schedule_id')
    const work_type = searchParams.get('work_type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assigned_to = searchParams.get('assigned_to')
    const requested_by = searchParams.get('requested_by')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const overdue_only = searchParams.get('overdue_only') === 'true'
    const search = searchParams.get('search')
    const include_details = searchParams.get('include_details') === 'true'

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (asset_id) where.asset_id = asset_id
    if (schedule_id) where.schedule_id = schedule_id
    if (work_type) where.work_type = work_type
    if (status) where.status = status
    if (priority) where.priority = priority
    if (assigned_to) where.assigned_to = assigned_to
    if (requested_by) where.requested_by = requested_by

    if (date_from && date_to) {
      where.requested_date = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    if (overdue_only) {
      where.scheduled_date = { lt: new Date() }
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] }
    }

    if (search) {
      where.OR = [
        { wo_number: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const include_options: any = {
      asset: {
        select: {
          id: true,
          asset_no: true,
          name: true,
          category: true,
          type: true,
          location: true
        }
      },
      schedule: {
        select: {
          id: true,
          schedule_name: true,
          frequency_type: true
        }
      },
      requester: {
        select: {
          id: true,
          name: true,
          department: true
        }
      },
      assignee: {
        select: {
          id: true,
          name: true,
          department: true,
          skills: true
        }
      },
      _count: {
        select: {
          labor_entries: true,
          parts_used: true,
          attachments: true
        }
      }
    }

    if (include_details) {
      include_options.labor_entries = {
        include: {
          employee: {
            select: {
              name: true,
              department: true
            }
          }
        },
        orderBy: { start_time: 'desc' }
      }
      include_options.parts_used = {
        orderBy: { created_at: 'desc' }
      }
      include_options.attachments = {
        include: {
          uploader: {
            select: {
              name: true
            }
          }
        },
        orderBy: { uploaded_at: 'desc' }
      }
    }

    const workOrders = await db.maintenanceWorkOrder.findMany({
      where,
      include: include_options,
      orderBy: [
        { priority: 'desc' },
        { scheduled_date: 'asc' },
        { requested_date: 'desc' }
      ]
    })

    // Calculate summary data for each work order
    const work_orders_with_summary = workOrders.map(wo => {
      const is_overdue = wo.scheduled_date && new Date() > wo.scheduled_date && !['COMPLETED', 'CANCELLED'].includes(wo.status)
      const days_overdue = is_overdue ? Math.ceil((Date.now() - wo.scheduled_date!.getTime()) / (1000 * 60 * 60 * 24)) : 0

      // Calculate time metrics
      const duration_variance = wo.actual_duration && wo.estimated_duration
        ? wo.actual_duration - wo.estimated_duration
        : null

      // Calculate cost metrics
      const total_labor_cost = include_details
        ? wo.labor_entries.reduce((sum, entry) => sum + (entry.labor_cost || 0), 0)
        : 0

      const total_parts_cost = include_details
        ? wo.parts_used.reduce((sum, part) => sum + (part.total_cost || 0), 0)
        : 0

      const calculated_cost = total_labor_cost + total_parts_cost
      const cost_variance = wo.actual_cost && wo.estimated_cost
        ? wo.actual_cost - wo.estimated_cost
        : null

      // Calculate efficiency rating
      let efficiency_rating = 'PENDING'
      if (wo.status === 'COMPLETED') {
        const time_efficiency = duration_variance !== null && wo.estimated_duration
          ? (wo.estimated_duration / wo.actual_duration!) * 100
          : 100

        const cost_efficiency = cost_variance !== null && wo.estimated_cost
          ? (wo.estimated_cost / wo.actual_cost!) * 100
          : 100

        const avg_efficiency = (time_efficiency + cost_efficiency) / 2

        if (avg_efficiency >= 90) efficiency_rating = 'EXCELLENT'
        else if (avg_efficiency >= 80) efficiency_rating = 'GOOD'
        else if (avg_efficiency >= 70) efficiency_rating = 'FAIR'
        else efficiency_rating = 'POOR'
      }

      return {
        ...wo,
        summary: {
          is_overdue,
          days_overdue,
          duration_variance_minutes: duration_variance,
          cost_variance: cost_variance,
          total_labor_cost,
          total_parts_cost,
          calculated_cost,
          total_attachments: wo._count.attachments,
          total_labor_entries: wo._count.labor_entries,
          total_parts_used: wo._count.parts_used,
          efficiency_rating,
          is_scheduled_maintenance: !!wo.schedule_id,
          requires_followup: wo.requires_followup && !wo.followup_date
        }
      }
    })

    return NextResponse.json({
      success: true,
      work_orders: work_orders_with_summary,
      summary: {
        total_work_orders: workOrders.length,
        by_status: workOrders.reduce((acc, wo) => {
          acc[wo.status] = (acc[wo.status] || 0) + 1
          return acc
        }, {} as any),
        by_priority: workOrders.reduce((acc, wo) => {
          acc[wo.priority] = (acc[wo.priority] || 0) + 1
          return acc
        }, {} as any),
        by_work_type: workOrders.reduce((acc, wo) => {
          acc[wo.work_type] = (acc[wo.work_type] || 0) + 1
          return acc
        }, {} as any),
        total_overdue: work_orders_with_summary.filter(wo => wo.summary.is_overdue).length,
        total_emergency: workOrders.filter(wo => wo.priority === 'EMERGENCY').length,
        avg_completion_time: workOrders
          .filter(wo => wo.status === 'COMPLETED' && wo.actual_duration)
          .reduce((sum, wo, _, arr) => sum + wo.actual_duration! / arr.length, 0) || 0
      }
    })

  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch work orders' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/work-orders - Create work order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      asset_id,
      schedule_id,
      title,
      description,
      work_type,
      priority = 'MEDIUM',
      requested_by,
      assigned_to,
      scheduled_date,
      estimated_duration,
      estimated_cost
    } = body

    if (!workspace_id || !title || !work_type || !requested_by) {
      return NextResponse.json(
        { error: 'workspace_id, title, work_type, and requested_by are required' },
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

    // Validate asset if provided
    if (asset_id) {
      const asset = await db.asset.findFirst({
        where: {
          id: asset_id,
          workspace_id
        }
      })

      if (!asset) {
        return NextResponse.json(
          { error: 'Asset not found or does not belong to workspace' },
          { status: 404 }
        )
      }
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

    // Validate requester
    const requester = await db.employee.findFirst({
      where: {
        id: requested_by,
        workspace_id,
        status: 'ACTIVE'
      }
    })

    if (!requester) {
      return NextResponse.json(
        { error: 'Requester not found or not active' },
        { status: 404 }
      )
    }

    // Validate assignee if provided
    if (assigned_to) {
      const assignee = await db.employee.findFirst({
        where: {
          id: assigned_to,
          workspace_id,
          status: 'ACTIVE'
        }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found or not active' },
          { status: 404 }
        )
      }
    }

    // Generate work order number
    const wo_number = await generateWorkOrderNumber(workspace_id)

    // Ashley AI validation for work order creation
    const ashley_check = await validateAshleyAI({
      context: 'WORK_ORDER_CREATION',
      work_type,
      priority,
      estimated_duration,
      estimated_cost,
      asset_id,
      scheduled_date
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked work order creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create work order
    const workOrder = await db.maintenanceWorkOrder.create({
      data: {
        workspace_id,
        wo_number,
        asset_id,
        schedule_id,
        title,
        description,
        work_type,
        priority,
        requested_by,
        assigned_to,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
        estimated_duration,
        estimated_cost,
        status: assigned_to ? 'ASSIGNED' : 'OPEN'
      },
      include: {
        asset: {
          select: {
            asset_no: true,
            name: true
          }
        },
        requester: {
          select: {
            name: true,
            department: true
          }
        },
        assignee: {
          select: {
            name: true,
            department: true
          }
        },
        schedule: {
          select: {
            schedule_name: true
          }
        }
      }
    })

    // Update maintenance schedule if this is scheduled maintenance
    if (schedule_id) {
      const schedule = await db.maintenanceSchedule.findUnique({
        where: { id: schedule_id }
      })

      if (schedule) {
        // Calculate next due date based on frequency
        const next_due_date = new Date()
        switch (schedule.frequency_type) {
          case 'DAILY':
            next_due_date.setDate(next_due_date.getDate() + schedule.frequency_value)
            break
          case 'WEEKLY':
            next_due_date.setDate(next_due_date.getDate() + (schedule.frequency_value * 7))
            break
          case 'MONTHLY':
            next_due_date.setMonth(next_due_date.getMonth() + schedule.frequency_value)
            break
          case 'QUARTERLY':
            next_due_date.setMonth(next_due_date.getMonth() + (schedule.frequency_value * 3))
            break
          case 'YEARLY':
            next_due_date.setFullYear(next_due_date.getFullYear() + schedule.frequency_value)
            break
        }

        await db.maintenanceSchedule.update({
          where: { id: schedule_id },
          data: { next_due_date }
        })
      }
    }

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'work_order',
      entity_id: workOrder.id,
      action: 'CREATE',
      after_data: {
        wo_number,
        title,
        work_type,
        priority,
        asset_id,
        schedule_id,
        requested_by,
        assigned_to,
        scheduled_date,
        ashley_risk: ashley_check.risk
      }
    })

    return NextResponse.json({
      success: true,
      work_order: workOrder,
      message: 'Work order created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating work order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create work order' },
      { status: 500 }
    )
  }
}

// PUT /api/maintenance/work-orders - Update work order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      work_order_id,
      workspace_id,
      title,
      description,
      work_type,
      priority,
      status,
      assigned_to,
      scheduled_date,
      estimated_duration,
      estimated_cost,
      actual_duration,
      actual_cost,
      completion_notes,
      requires_followup,
      followup_date
    } = body

    if (!work_order_id || !workspace_id) {
      return NextResponse.json(
        { error: 'work_order_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing work order
    const existing_wo = await db.maintenanceWorkOrder.findFirst({
      where: {
        id: work_order_id,
        workspace_id
      }
    })

    if (!existing_wo) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Validate assignee if provided
    if (assigned_to && assigned_to !== existing_wo.assigned_to) {
      const assignee = await db.employee.findFirst({
        where: {
          id: assigned_to,
          workspace_id,
          status: 'ACTIVE'
        }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found or not active' },
          { status: 404 }
        )
      }
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }

    if (title !== undefined) update_data.title = title
    if (description !== undefined) update_data.description = description
    if (work_type !== undefined) update_data.work_type = work_type
    if (priority !== undefined) update_data.priority = priority
    if (assigned_to !== undefined) update_data.assigned_to = assigned_to
    if (scheduled_date !== undefined) update_data.scheduled_date = scheduled_date ? new Date(scheduled_date) : null
    if (estimated_duration !== undefined) update_data.estimated_duration = estimated_duration
    if (estimated_cost !== undefined) update_data.estimated_cost = estimated_cost
    if (actual_duration !== undefined) update_data.actual_duration = actual_duration
    if (actual_cost !== undefined) update_data.actual_cost = actual_cost
    if (completion_notes !== undefined) update_data.completion_notes = completion_notes
    if (requires_followup !== undefined) update_data.requires_followup = requires_followup
    if (followup_date !== undefined) update_data.followup_date = followup_date ? new Date(followup_date) : null

    // Handle status updates
    if (status !== undefined) {
      update_data.status = status

      if (status === 'IN_PROGRESS' && !existing_wo.started_at) {
        update_data.started_at = new Date()
      } else if (status === 'COMPLETED' && !existing_wo.completed_at) {
        update_data.completed_at = new Date()

        // Update maintenance schedule last completed if this is scheduled maintenance
        if (existing_wo.schedule_id) {
          await db.maintenanceSchedule.update({
            where: { id: existing_wo.schedule_id },
            data: { last_completed: new Date() }
          })
        }
      }
    }

    // Update work order
    const updated_wo = await db.maintenanceWorkOrder.update({
      where: { id: work_order_id },
      data: update_data,
      include: {
        asset: {
          select: {
            asset_no: true,
            name: true
          }
        },
        requester: {
          select: {
            name: true,
            department: true
          }
        },
        assignee: {
          select: {
            name: true,
            department: true
          }
        }
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'work_order',
      entity_id: work_order_id,
      action: 'UPDATE',
      before_data: existing_wo,
      after_data: update_data
    })

    return NextResponse.json({
      success: true,
      work_order: updated_wo,
      message: 'Work order updated successfully'
    })

  } catch (error) {
    console.error('Error updating work order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update work order' },
      { status: 500 }
    )
  }
}