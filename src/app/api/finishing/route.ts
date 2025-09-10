import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Finishing API for Stage 7 Finishing & Packing System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/finishing - Get finishing runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')
    const operator_id = searchParams.get('operator_id')
    const status = searchParams.get('status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (order_id) where.order_id = order_id
    if (operator_id) where.operator_id = operator_id
    if (status) where.status = status
    if (date_from && date_to) {
      where.created_at = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    const finishing_runs = await db.finishingRun.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            product_type: true,
            client: {
              select: {
                name: true
              }
            }
          }
        },
        routing_step: {
          select: {
            name: true,
            workcenter: true,
            sequence: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      success: true,
      finishing_runs
    })

  } catch (_error) {
    console.error('Error fetching finishing runs:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch finishing runs' },
      { status: 500 }
    )
  }
}

// POST /api/finishing - Create finishing run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      routing_step_id,
      operator_id,
      materials = [], // [{item_id,uom,qty,batch_id?}]
      notes
    } = body

    if (!workspace_id || !order_id || !routing_step_id || !operator_id) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, routing_step_id, and operator_id are required' },
        { status: 400 }
      )
    }

    // Validate order exists and belongs to workspace
    const order = await db.order.findFirst({
      where: {
        id: order_id,
        workspace_id
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Validate routing step exists and belongs to order
    const routing_step = await db.routingStep.findFirst({
      where: {
        id: routing_step_id,
        order_id
      }
    })

    if (!routing_step) {
      return NextResponse.json(
        { error: 'Routing step not found or does not belong to order' },
        { status: 404 }
      )
    }

    // Ashley AI validation for finishing run
    const ashley_check = await validateAshleyAI({
      context: 'FINISHING_RUN_START',
      order_id,
      operator_id,
      materials_count: materials.length,
      routing_step_name: routing_step.name
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked finishing run creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create finishing run
    const finishing_run = await db.finishingRun.create({
      data: {
        workspace_id,
        order_id,
        routing_step_id,
        operator_id,
        materials,
        notes,
        started_at: new Date(),
        status: 'IN_PROGRESS'
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'finishing_run',
        entity_id: finishing_run.id,
        action: 'CREATE',
        after_data: {
          order_id,
          operator_id,
          routing_step_name: routing_step.name,
          materials_count: materials.length,
          ashley_risk: ashley_check.risk
        }
      }
    })

    // Get created run with relations
    const created_run = await db.finishingRun.findUnique({
      where: { id: finishing_run.id },
      include: {
        order: {
          select: {
            po_number: true,
            product_type: true
          }
        },
        routing_step: {
          select: {
            name: true,
            workcenter: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      finishing_run: created_run,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating finishing run:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create finishing run' },
      { status: 500 }
    )
  }
}

// PUT /api/finishing - Complete finishing run
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      finishing_run_id,
      workspace_id,
      status, // IN_PROGRESS, COMPLETED, CANCELLED
      materials, // Updated materials list
      notes
    } = body

    if (!finishing_run_id || !workspace_id || !status) {
      return NextResponse.json(
        { error: 'finishing_run_id, workspace_id, and status are required' },
        { status: 400 }
      )
    }

    // Get existing finishing run
    const existing_run = await db.finishingRun.findFirst({
      where: {
        id: finishing_run_id,
        workspace_id
      }
    })

    if (!existing_run) {
      return NextResponse.json(
        { error: 'Finishing run not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = { status }
    if (materials) update_data.materials = materials
    if (notes !== undefined) update_data.notes = notes

    if (status === 'COMPLETED') {
      update_data.ended_at = new Date()
    }

    // Update finishing run
    const updated_run = await db.finishingRun.update({
      where: { id: finishing_run_id },
      data: update_data
    })

    // If completing the run, process materials deduction
    if (status === 'COMPLETED' && materials && materials.length > 0) {
      // TODO: Implement inventory deduction for materials used
      // This would integrate with inventory management system
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'finishing_run',
        entity_id: finishing_run_id,
        action: 'UPDATE',
        before_data: existing_run,
        after_data: update_data
      }
    })

    return NextResponse.json({
      success: true,
      finishing_run: updated_run
    })

  } catch (_error) {
    console.error('Error updating finishing run:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update finishing run' },
      { status: 500 }
    )
  }
}