import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { validatePrintingSpecs } from '@/lib/printing-calculations'
// Print Runs API
// Based on CLIENT_UPDATED_PLAN.md Stage 4 specifications


// GET /api/printing/runs - Get print runs (queue view for operators)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workcenter = searchParams.get('workcenter')
    const status = searchParams.get('status')
    const machine_id = searchParams.get('machine_id')

    const where: any = {}
    if (workcenter) where.workcenter = workcenter
    if (status) where.status = status
    if (machine_id) where.machine_id = machine_id

    const printRuns = await db.printRun.findMany({
      where,
      include: {
        order: {
          include: {
            brand: { select: { name: true, code: true } },
            client: { select: { name: true } }
          }
        },
        routing_step: {
          select: {
            name: true,
            workcenter: true,
            status: true
          }
        },
        machine: {
          select: {
            name: true,
            spec: true
          }
        },
        outputs: true,
        materials: {
          orderBy: { created_at: 'desc' }
        },
        rejects: {
          orderBy: { created_at: 'desc' }
        },
        // Include method-specific data
        silkscreen_prep: true,
        silkscreen_spec: true,
        curing_logs: true,
        sublimation_print: true,
        heat_press_logs: true,
        dtf_print: true,
        dtf_powder_cure: true,
        embroidery_run: true
      },
      orderBy: [
        { status: 'asc' }, // IN_PROGRESS first
        { created_at: 'asc' }
      ]
    })

    // Calculate progress and totals
    const runsWithProgress = printRuns.map(run => {
      const total_good = run.outputs.reduce((sum, output) => sum + output.qty_good, 0)
      const total_reject = run.outputs.reduce((sum, output) => sum + output.qty_reject, 0)
      const total_produced = total_good + total_reject
      const target_qty = run.order.total_qty

      const progress_percentage = target_qty > 0 ? Math.round((total_produced / target_qty) * 100) : 0

      return {
        ...run,
        totals: {
          target_qty,
          produced: total_produced,
          good: total_good,
          reject: total_reject,
          progress_percentage
        }
      }
    })

    return NextResponse.json({
      success: true,
      runs: runsWithProgress,
      summary: {
        total_runs: printRuns.length,
        in_progress: printRuns.filter(r => r.status === 'IN_PROGRESS').length,
        pending: printRuns.filter(r => r.status === 'CREATED').length,
        completed: printRuns.filter(r => r.status === 'DONE').length
      }
    })

  } catch (_error) {
    console.error('Error fetching print runs:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch print runs' },
      { status: 500 }
    )
  }
}

// POST /api/printing/runs - Create new print run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      order_id,
      routing_step_id,
      method,
      workcenter,
      machine_id,
      created_by,
      printing_specs // For Ashley validation
    } = body

    // Validate required fields
    if (!order_id || !routing_step_id || !method || !workcenter || !created_by) {
      return NextResponse.json(
        { error: 'order_id, routing_step_id, method, workcenter, and created_by are required' },
        { status: 400 }
      )
    }

    // Validate order and routing step exist
    const routingStep = await db.routingStep.findUnique({
      where: { id: routing_step_id },
      include: {
        order: {
          include: {
            brand: { select: { name: true } },
            client: { select: { name: true } }
          }
        }
      }
    })

    if (!routingStep || routingStep.order_id !== order_id) {
      return NextResponse.json(
        { error: 'Invalid order or routing step' },
        { status: 400 }
      )
    }

    // Check if routing step is ready
    if (routingStep.status !== 'READY' && routingStep.status !== 'PLANNED') {
      return NextResponse.json(
        { error: `Routing step is ${routingStep.status} - cannot start print run` },
        { status: 400 }
      )
    }

    // Validate machine if specified
    if (machine_id) {
      const machine = await db.machine.findUnique({
        where: { id: machine_id }
      })

      if (!machine || !machine.is_active) {
        return NextResponse.json(
          { error: 'Invalid or inactive machine' },
          { status: 400 }
        )
      }

      if (machine.workcenter !== workcenter) {
        return NextResponse.json(
          { error: `Machine workcenter ${machine.workcenter} does not match run workcenter ${workcenter}` },
          { status: 400 }
        )
      }
    }

    // Ashley AI validation if specs provided
    let ashley_validation = null
    if (printing_specs) {
      ashley_validation = validatePrintingSpecs({
        method: method as any,
        placement_area_cm2: printing_specs.placement_area_cm2,
        quantity: routingStep.order.total_qty,
        colors: printing_specs.colors,
        coats: printing_specs.coats,
        mesh_count: printing_specs.mesh_count,
        stitch_count: printing_specs.stitch_count
      })

      // Block if RED risk
      if (ashley_validation.risk === 'RED') {
        return NextResponse.json({
          success: false,
          error: 'Print run blocked by Ashley AI validation',
          ashley_assessment: ashley_validation,
          requires_manager_override: true
        }, { status: 422 })
      }
    }

    // Create print run
    const printRun = await db.printRun.create({
      data: {
        order_id,
        routing_step_id,
        method,
        workcenter,
        machine_id,
        created_by,
        status: 'CREATED'
      }
    })

    // Update routing step status
    await db.routingStep.update({
      where: { id: routing_step_id },
      data: { status: 'READY' }
    })

    // Create audit log
    await createAuditLog({
      workspace_id: routingStep.order.workspace_id,
      entity_type: 'print_run',
      entity_id: printRun.id,
      action: 'CREATE',
      after_data: {
        po_number: routingStep.order.po_number,
        method,
        workcenter,
        machine_id,
        ashley_risk: ashley_validation?.risk || null,
        created_by
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Print run created successfully',
      run: printRun,
      ashley_assessment: ashley_validation
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating print run:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create print run' },
      { status: 500 }
    )
  }
}