// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { validateEmbroiderySpecs, calculateEmbroideryRuntime } from '@/lib/printing-calculations'

// Embroidery Printing API
// Based on CLIENT_UPDATED_PLAN.md Stage 4.4 specifications

// POST /api/printing/embroidery - Log embroidery-specific data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { run_id, operation, ...data } = body

    // Validate run exists and is embroidery
    const run = await db.printRun.findUnique({
      where: { id: run_id },
      include: {
        order: {
          select: {
            workspace_id: true,
            po_number: true,
            total_qty: true
          }
        }
      }
    })

    if (!run) {
      return NextResponse.json(
        { error: 'Print run not found' },
        { status: 404 }
      )
    }

    if (run.method !== 'EMBROIDERY') {
      return NextResponse.json(
        { error: 'This endpoint is for embroidery runs only' },
        { status: 400 }
      )
    }

    let result: any = null
    const audit_action = 'CREATE'
    let audit_data: any = { run_id, po_number: run.order.po_number, operation }

    switch (operation) {
      case 'setup':
        // Log embroidery setup (digitized file loading, thread/stabilizer setup)
        const {
          design_version_id,
          stitch_count,
          machine_spm,
          stabilizer_type,
          thread_colors,
          hoop_size,
          fabric_type
        } = data

        if (!stitch_count || !machine_spm) {
          return NextResponse.json(
            { error: 'stitch_count and machine_spm are required for embroidery setup' },
            { status: 400 }
          )
        }

        // Validate embroidery specifications
        const emb_validation = validateEmbroiderySpecs({
          stitch_count,
          fabric_type,
          stabilizer_type,
          thread_colors: Array.isArray(thread_colors) ? thread_colors : []
        })

        // Calculate estimated runtime
        const runtime_estimate = calculateEmbroideryRuntime(stitch_count, machine_spm, run.order.total_qty)

        result = await db.embroideryRun.create({
          data: {
            run_id,
            design_version_id,
            stitch_count,
            machine_spm,
            stabilizer_type,
            thread_colors: Array.isArray(thread_colors) ? JSON.stringify(thread_colors) : null,
            hoop_size,
            fabric_type,
            estimated_runtime_minutes: runtime_estimate.total_minutes,
            thread_breaks: 0,
            runtime_minutes: 0,
            validation_status: emb_validation.status,
            validation_message: emb_validation.message
          }
        })

        audit_data = {
          ...audit_data,
          design_version_id,
          stitch_count,
          machine_spm,
          stabilizer_type,
          thread_colors,
          estimated_runtime: runtime_estimate,
          validation_status: emb_validation.status
        }
        break

      case 'production_update':
        // Update production progress during embroidery run
        const {
          pieces_completed,
          thread_breaks,
          actual_runtime_minutes,
          quality_notes,
          needle_changes
        } = data

        // Get existing embroidery run to update
        const existingRun = await db.embroideryRun.findFirst({
          where: { run_id },
          orderBy: { created_at: 'desc' }
        })

        if (!existingRun) {
          return NextResponse.json(
            { error: 'Embroidery setup not found. Please create setup first.' },
            { status: 400 }
          )
        }

        result = await db.embroideryRun.update({
          where: { id: existingRun.id },
          data: {
            pieces_completed: pieces_completed || existingRun.pieces_completed,
            thread_breaks: thread_breaks !== undefined ? thread_breaks : existingRun.thread_breaks,
            runtime_minutes: actual_runtime_minutes || existingRun.runtime_minutes,
            quality_notes,
            needle_changes: needle_changes || existingRun.needle_changes
          }
        })

        // Calculate efficiency if we have both estimated and actual runtime
        let efficiency_data = null
        if (actual_runtime_minutes && existingRun.estimated_runtime_minutes) {
          efficiency_data = {
            estimated_minutes: existingRun.estimated_runtime_minutes,
            actual_minutes: actual_runtime_minutes,
            efficiency_pct: Math.round((existingRun.estimated_runtime_minutes / actual_runtime_minutes) * 100),
            variance_minutes: actual_runtime_minutes - existingRun.estimated_runtime_minutes
          }
        }

        audit_data = {
          ...audit_data,
          pieces_completed,
          thread_breaks,
          actual_runtime_minutes,
          efficiency_data
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Must be: setup or production_update' },
          { status: 400 }
        )
    }

    // Create audit log
    await createAuditLog({
      workspace_id: run.order.workspace_id,
      entity_type: 'embroidery_operation',
      entity_id: result.id,
      action: audit_action,
      after_data: audit_data
    })

    return NextResponse.json({
      success: true,
      message: `Embroidery ${operation} logged successfully`,
      data: result,
      validation: operation === 'setup' ? validateEmbroiderySpecs({
        stitch_count: data.stitch_count,
        fabric_type: data.fabric_type,
        stabilizer_type: data.stabilizer_type,
        thread_colors: Array.isArray(data.thread_colors) ? data.thread_colors : []
      }) : undefined,
      runtime_estimate: operation === 'setup' ? calculateEmbroideryRuntime(data.stitch_count, data.machine_spm, run.order.total_qty) : undefined
    }, { status: 201 })

  } catch (error) {
    console.error('Error in embroidery operation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log embroidery operation' },
      { status: 500 }
    )
  }
}

// GET /api/printing/embroidery?run_id=xxx - Get embroidery data for run
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const run_id = searchParams.get('run_id')

    if (!run_id) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      )
    }

    // Get embroidery data for the run
    const embroideryRuns = await db.embroideryRun.findMany({
      where: { run_id },
      orderBy: { created_at: 'asc' }
    })

    // Get run info
    const run = await db.printRun.findUnique({
      where: { id: run_id },
      select: {
        status: true,
        method: true,
        order: {
          select: {
            po_number: true,
            total_qty: true
          }
        }
      }
    })

    if (!run) {
      return NextResponse.json(
        { error: 'Print run not found' },
        { status: 404 }
      )
    }

    const latest_run = embroideryRuns[embroideryRuns.length - 1]

    // Calculate production summary
    let production_summary = null
    if (latest_run) {
      const progress_pct = run.order.total_qty > 0 ?
        Math.round(((latest_run.pieces_completed || 0) / run.order.total_qty) * 100) : 0

      // Calculate thread break rate
      const thread_break_rate = latest_run.pieces_completed > 0 ?
        Math.round((latest_run.thread_breaks / latest_run.pieces_completed) * 100) / 100 : 0

      // Calculate runtime efficiency
      let efficiency_data = null
      if (latest_run.runtime_minutes && latest_run.estimated_runtime_minutes) {
        efficiency_data = {
          estimated_minutes: latest_run.estimated_runtime_minutes,
          actual_minutes: latest_run.runtime_minutes,
          efficiency_pct: Math.round((latest_run.estimated_runtime_minutes / latest_run.runtime_minutes) * 100),
          variance_minutes: latest_run.runtime_minutes - latest_run.estimated_runtime_minutes,
          variance_pct: Math.round(((latest_run.runtime_minutes - latest_run.estimated_runtime_minutes) / latest_run.estimated_runtime_minutes) * 100)
        }
      }

      production_summary = {
        total_pieces: run.order.total_qty,
        pieces_completed: latest_run.pieces_completed || 0,
        progress_pct,
        thread_breaks: latest_run.thread_breaks,
        thread_break_rate,
        needle_changes: latest_run.needle_changes || 0,
        stitch_count: latest_run.stitch_count,
        machine_spm: latest_run.machine_spm,
        efficiency_data,
        quality_rating: latest_run.thread_breaks <= 5 && progress_pct >= 95 ? 'EXCELLENT' :
                       latest_run.thread_breaks <= 10 && progress_pct >= 90 ? 'GOOD' :
                       latest_run.thread_breaks <= 15 && progress_pct >= 80 ? 'FAIR' : 'POOR'
      }
    }

    // Parse thread colors if available
    let thread_colors = null
    if (latest_run?.thread_colors) {
      try {
        thread_colors = JSON.parse(latest_run.thread_colors)
      } catch (e) {
        console.warn('Failed to parse thread colors data')
      }
    }

    return NextResponse.json({
      success: true,
      run_info: run,
      embroidery_data: {
        runs: embroideryRuns,
        latest_run,
        production_summary,
        thread_colors,
        setup_info: latest_run ? {
          stabilizer_type: latest_run.stabilizer_type,
          hoop_size: latest_run.hoop_size,
          fabric_type: latest_run.fabric_type,
          validation_status: latest_run.validation_status,
          validation_message: latest_run.validation_message
        } : null
      }
    })

  } catch (error) {
    console.error('Error fetching embroidery data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch embroidery data' },
      { status: 500 }
    )
  }
}