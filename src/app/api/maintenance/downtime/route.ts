import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Equipment Downtime API for Stage 11 Maintenance System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/maintenance/downtime - Get equipment downtime records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const equipment_type = searchParams.get('equipment_type')
    const equipment_id = searchParams.get('equipment_id')
    const reason_category = searchParams.get('reason_category')
    const impact_level = searchParams.get('impact_level')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const active_only = searchParams.get('active_only') // Show only ongoing downtime

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (equipment_type) where.equipment_type = equipment_type
    if (equipment_id) where.equipment_id = equipment_id
    if (reason_category) where.reason_category = reason_category
    if (impact_level) where.impact_level = impact_level
    if (active_only === 'true') where.downtime_end = null
    if (date_from && date_to) {
      where.downtime_start = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    const downtime_records = await db.equipmentDowntime.findMany({
      where,
      orderBy: [
        { downtime_start: 'desc' },
        { impact_level: 'desc' }
      ]
    })

    // Add summary data
    const records_with_summary = downtime_records.map(record => {
      const is_ongoing = !record.downtime_end
      const actual_duration = is_ongoing 
        ? Math.floor((Date.now() - new Date(record.downtime_start).getTime()) / (1000 * 60))
        : record.duration_minutes

      // Calculate impact metrics
      const hours_down = actual_duration ? Math.round((actual_duration / 60) * 100) / 100 : 0
      const cost_impact = record.production_loss || 0

      return {
        ...record,
        summary: {
          is_ongoing,
          actual_duration_minutes: actual_duration,
          hours_down,
          cost_impact,
          has_maintenance_task: !!record.maintenance_task_id,
          is_resolved: !!record.resolved_by,
          days_since_start: Math.floor((Date.now() - new Date(record.downtime_start).getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    })

    return NextResponse.json({
      success: true,
      downtime_records: records_with_summary
    })

  } catch (_error) {
    console.error('Error fetching downtime records:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch downtime records' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/downtime - Record equipment downtime
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      equipment_type,
      equipment_id,
      downtime_start,
      reason_category, // BREAKDOWN/MAINTENANCE/SETUP/NO_OPERATOR/NO_MATERIAL
      reason_details,
      impact_level = 'MEDIUM',
      production_loss,
      orders_affected = [],
      reported_by
    } = body

    if (!workspace_id || !equipment_type || !downtime_start || !reason_category) {
      return NextResponse.json(
        { error: 'workspace_id, equipment_type, downtime_start, and reason_category are required' },
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

    // Check for overlapping downtime for the same equipment
    if (equipment_id) {
      const overlapping_downtime = await db.equipmentDowntime.findFirst({
        where: {
          workspace_id,
          equipment_id,
          downtime_end: null, // Ongoing downtime
          downtime_start: { lt: new Date(downtime_start) }
        }
      })

      if (overlapping_downtime) {
        return NextResponse.json(
          { error: 'Equipment already has ongoing downtime. End previous downtime first.' },
          { status: 409 }
        )
      }
    }

    // Ashley AI validation for downtime recording
    const ashley_check = await validateAshleyAI({
      context: 'EQUIPMENT_DOWNTIME',
      equipment_type,
      reason_category,
      impact_level,
      production_loss: production_loss || 0,
      orders_affected: orders_affected.length
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked downtime recording',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create downtime record
    const downtime_record = await db.equipmentDowntime.create({
      data: {
        workspace_id,
        equipment_type,
        equipment_id,
        downtime_start: new Date(downtime_start),
        reason_category,
        reason_details,
        impact_level,
        production_loss,
        orders_affected
      }
    })

    // Automatically create maintenance task for breakdowns
    let maintenance_task = null
    if (reason_category === 'BREAKDOWN') {
      try {
        const task_count = await db.maintenanceTask.count({
          where: { workspace_id }
        })
        const task_no = `MT${String(task_count + 1).padStart(6, '0')}`

        maintenance_task = await db.maintenanceTask.create({
          data: {
            workspace_id,
            task_no,
            equipment_type,
            equipment_id,
            task_type: 'BREAKDOWN',
            priority: impact_level === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            title: `Breakdown Repair - ${equipment_type}${equipment_id ? ` #${equipment_id}` : ''}`,
            description: `Automatic task created from downtime record. ${reason_details || ''}`,
            requested_by: reported_by,
            scheduled_date: new Date()
          }
        })

        // Link maintenance task to downtime record
        await db.equipmentDowntime.update({
          where: { id: downtime_record.id },
          data: { maintenance_task_id: maintenance_task.id }
        })
      } catch (task_error) {
        console.warn('Failed to create automatic maintenance task:', task_error)
      }
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'equipment_downtime',
        entity_id: downtime_record.id,
        action: 'CREATE',
        after_data: {
          equipment_type,
          equipment_id,
          reason_category,
          impact_level,
          production_loss,
          maintenance_task_created: !!maintenance_task,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      downtime_record,
      maintenance_task,
      message: 'Equipment downtime recorded successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error recording equipment downtime:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to record equipment downtime' },
      { status: 500 }
    )
  }
}

// PUT /api/maintenance/downtime - End equipment downtime
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      downtime_id,
      workspace_id,
      downtime_end,
      resolved_by,
      resolution_notes,
      final_production_loss,
      maintenance_task_id // Link to maintenance task that resolved the issue
    } = body

    if (!downtime_id || !workspace_id || !downtime_end) {
      return NextResponse.json(
        { error: 'downtime_id, workspace_id, and downtime_end are required' },
        { status: 400 }
      )
    }

    // Get existing downtime record
    const existing_record = await db.equipmentDowntime.findFirst({
      where: {
        id: downtime_id,
        workspace_id
      }
    })

    if (!existing_record) {
      return NextResponse.json(
        { error: 'Downtime record not found' },
        { status: 404 }
      )
    }

    if (existing_record.downtime_end) {
      return NextResponse.json(
        { error: 'Downtime has already been ended' },
        { status: 409 }
      )
    }

    const end_time = new Date(downtime_end)
    if (end_time <= existing_record.downtime_start) {
      return NextResponse.json(
        { error: 'End time cannot be before or equal to start time' },
        { status: 400 }
      )
    }

    // Calculate duration in minutes
    const duration_minutes = Math.floor(
      (new Date(end_time).getTime() - new Date(existing_record.downtime_start).getTime()) / (1000 * 60)
    )

    // Update downtime record
    const updated_record = await db.equipmentDowntime.update({
      where: { id: downtime_id },
      data: {
        downtime_end: end_time,
        duration_minutes,
        resolved_by,
        resolution_notes,
        maintenance_task_id,
        production_loss: final_production_loss !== undefined ? final_production_loss : existing_record.production_loss,
        updated_at: new Date()
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'equipment_downtime',
        entity_id: downtime_id,
        action: 'END_DOWNTIME',
        before_data: existing_record,
        after_data: {
          downtime_end: end_time.toISOString(),
          duration_minutes,
          resolved_by,
          resolution_notes,
          final_production_loss
        }
      }
    })

    return NextResponse.json({
      success: true,
      downtime_record: updated_record,
      message: 'Equipment downtime ended successfully',
      summary: {
        total_downtime_hours: Math.round((duration_minutes / 60) * 100) / 100,
        production_impact: updated_record.production_loss || 0
      }
    })

  } catch (_error) {
    console.error('Error ending equipment downtime:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to end equipment downtime' },
      { status: 500 }
    )
  }
}