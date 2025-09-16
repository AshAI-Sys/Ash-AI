// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { validateHeatPress } from '@/lib/printing-calculations'

// Sublimation-Specific Printing API
// Based on CLIENT_UPDATED_PLAN.md Stage 4.2 specifications

// POST /api/printing/sublimation - Log sublimation-specific data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { run_id, operation, ...data } = body

    // Validate run exists and is sublimation
    const run = await db.printRun.findUnique({
      where: { id: run_id },
      include: {
        order: {
          select: {
            workspace_id: true,
            po_number: true
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

    if (run.method !== 'SUBLIMATION') {
      return NextResponse.json(
        { error: 'This endpoint is for sublimation runs only' },
        { status: 400 }
      )
    }

    let result: any = null
    const audit_action = 'CREATE'
    let audit_data: any = { run_id, po_number: run.order.po_number, operation }

    switch (operation) {
      case 'print_to_paper':
        // Log printing to transfer paper
        const { printer_id, paper_m2, ink_g, design_area_cm2, nest_efficiency } = data

        if (!printer_id || !paper_m2) {
          return NextResponse.json(
            { error: 'printer_id and paper_m2 are required for print to paper' },
            { status: 400 }
          )
        }

        // Calculate paper utilization if design area provided
        let paper_utilization = null
        if (design_area_cm2) {
          const design_area_m2 = design_area_cm2 / 10000
          paper_utilization = {
            design_area_m2,
            paper_used_m2: paper_m2,
            utilization_pct: Math.round((design_area_m2 / paper_m2) * 100),
            waste_m2: paper_m2 - design_area_m2
          }
        }

        result = await db.sublimationPrint.create({
          data: {
            run_id,
            printer_id,
            paper_m2,
            ink_g,
            design_area_cm2,
            nest_efficiency,
            paper_utilization: paper_utilization ? JSON.stringify(paper_utilization) : null
          }
        })

        audit_data = { ...audit_data, printer_id, paper_m2, ink_g, paper_utilization }
        break

      case 'heat_press':
        // Log heat press transfer with validation
        const { press_id, temp_c, seconds, pressure, cycles = 1 } = data

        if (!temp_c || !seconds) {
          return NextResponse.json(
            { error: 'temp_c and seconds are required for heat press' },
            { status: 400 }
          )
        }

        // Validate heat press settings
        const press_validation = validateHeatPress(temp_c, seconds, pressure || 'MEDIUM')

        result = await db.heatPressLog.create({
          data: {
            run_id,
            press_id,
            temp_c,
            seconds,
            pressure: pressure || 'MEDIUM',
            cycles,
            validation_status: press_validation.status,
            validation_message: press_validation.message
          }
        })

        audit_data = {
          ...audit_data,
          press_id,
          temp_c,
          seconds,
          pressure,
          cycles,
          validation_status: press_validation.status
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Must be: print_to_paper or heat_press' },
          { status: 400 }
        )
    }

    // Create audit log
    await createAuditLog({
      workspace_id: run.order.workspace_id,
      entity_type: 'sublimation_operation',
      entity_id: result.id,
      action: audit_action,
      after_data: audit_data
    })

    return NextResponse.json({
      success: true,
      message: `Sublimation ${operation} logged successfully`,
      data: result,
      validation: operation === 'heat_press' ? validateHeatPress(data.temp_c, data.seconds, data.pressure || 'MEDIUM') : undefined
    }, { status: 201 })

  } catch (error) {
    console.error('Error in sublimation operation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log sublimation operation' },
      { status: 500 }
    )
  }
}

// GET /api/printing/sublimation?run_id=xxx - Get sublimation data for run
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

    // Get all sublimation-specific data for the run
    const [prints, pressLogs] = await Promise.all([
      db.sublimationPrint.findMany({
        where: { run_id },
        orderBy: { created_at: 'asc' }
      }),
      db.heatPressLog.findMany({
        where: { run_id },
        orderBy: { created_at: 'asc' }
      })
    ])

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

    // Calculate paper efficiency if we have data
    const latest_print = prints[prints.length - 1]
    let paper_efficiency = null
    if (latest_print?.paper_utilization) {
      try {
        paper_efficiency = JSON.parse(latest_print.paper_utilization)
      } catch (e) {
        console.warn('Failed to parse paper utilization data')
      }
    }

    // Calculate heat press averages
    let press_summary = null
    if (pressLogs.length > 0) {
      const avgTemp = Math.round(pressLogs.reduce((sum, log) => sum + log.temp_c, 0) / pressLogs.length)
      const avgTime = Math.round(pressLogs.reduce((sum, log) => sum + log.seconds, 0) / pressLogs.length)
      const passCount = pressLogs.filter(log => log.validation_status === 'PASS').length

      press_summary = {
        total_cycles: pressLogs.reduce((sum, log) => sum + log.cycles, 0),
        avg_temp_c: avgTemp,
        avg_seconds: avgTime,
        pass_rate: Math.round((passCount / pressLogs.length) * 100),
        total_logs: pressLogs.length
      }
    }

    return NextResponse.json({
      success: true,
      run_info: run,
      sublimation_data: {
        prints,
        heat_press_logs: pressLogs,
        paper_efficiency,
        press_summary
      }
    })

  } catch (error) {
    console.error('Error fetching sublimation data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sublimation data' },
      { status: 500 }
    )
  }
}