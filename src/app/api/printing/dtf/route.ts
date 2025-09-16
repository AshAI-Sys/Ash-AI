// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { validateDTFCure, validateDTFPress } from '@/lib/printing-calculations'

// DTF (Direct-to-Film) Printing API
// Based on CLIENT_UPDATED_PLAN.md Stage 4.3 specifications

// POST /api/printing/dtf - Log DTF-specific data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { run_id, operation, ...data } = body

    // Validate run exists and is DTF
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

    if (run.method !== 'DTF') {
      return NextResponse.json(
        { error: 'This endpoint is for DTF runs only' },
        { status: 400 }
      )
    }

    let result: any = null
    const audit_action = 'CREATE'
    let audit_data: any = { run_id, po_number: run.order.po_number, operation }

    switch (operation) {
      case 'print_on_film':
        // Log printing on DTF film
        const { film_m2, ink_g, printer_id, design_area_cm2, nest_efficiency } = data

        if (!film_m2) {
          return NextResponse.json(
            { error: 'film_m2 is required for print on film' },
            { status: 400 }
          )
        }

        // Calculate film utilization if design area provided
        let film_utilization = null
        if (design_area_cm2) {
          const design_area_m2 = design_area_cm2 / 10000
          film_utilization = {
            design_area_m2,
            film_used_m2: film_m2,
            utilization_pct: Math.round((design_area_m2 / film_m2) * 100),
            waste_m2: film_m2 - design_area_m2
          }
        }

        result = await db.dTFPrint.create({
          data: {
            run_id,
            film_m2,
            ink_g,
            printer_id,
            design_area_cm2,
            nest_efficiency,
            film_utilization: film_utilization ? JSON.stringify(film_utilization) : null
          }
        })

        audit_data = { ...audit_data, film_m2, ink_g, printer_id, film_utilization }
        break

      case 'powder_cure':
        // Log powder application and curing
        const { powder_g, temp_c, seconds, oven_id } = data

        if (!powder_g || !temp_c || !seconds) {
          return NextResponse.json(
            { error: 'powder_g, temp_c, and seconds are required for powder cure' },
            { status: 400 }
          )
        }

        // Validate DTF curing parameters
        const cure_validation = validateDTFCure(temp_c, seconds)

        result = await db.dTFPowderCure.create({
          data: {
            run_id,
            powder_g,
            temp_c,
            seconds,
            oven_id,
            validation_status: cure_validation.status,
            validation_message: cure_validation.message,
            cure_index: cure_validation.cure_index
          }
        })

        audit_data = {
          ...audit_data,
          powder_g,
          temp_c,
          seconds,
          oven_id,
          validation_status: cure_validation.status
        }
        break

      case 'heat_press_to_garment':
        // Log heat pressing DTF to garment
        const { press_id, press_temp_c, press_seconds, pressure, fabric_type } = data

        if (!press_temp_c || !press_seconds) {
          return NextResponse.json(
            { error: 'press_temp_c and press_seconds are required for heat press to garment' },
            { status: 400 }
          )
        }

        // Validate DTF press settings based on fabric type
        const press_validation = validateDTFPress(press_temp_c, press_seconds, pressure || 'MEDIUM', fabric_type)

        // Use HeatPressLog table (shared with sublimation)
        result = await db.heatPressLog.create({
          data: {
            run_id,
            press_id,
            temp_c: press_temp_c,
            seconds: press_seconds,
            pressure: pressure || 'MEDIUM',
            cycles: 1,
            validation_status: press_validation.status,
            validation_message: press_validation.message,
            fabric_type
          }
        })

        audit_data = {
          ...audit_data,
          press_id,
          press_temp_c,
          press_seconds,
          pressure,
          fabric_type,
          validation_status: press_validation.status
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Must be: print_on_film, powder_cure, or heat_press_to_garment' },
          { status: 400 }
        )
    }

    // Create audit log
    await createAuditLog({
      workspace_id: run.order.workspace_id,
      entity_type: 'dtf_operation',
      entity_id: result.id,
      action: audit_action,
      after_data: audit_data
    })

    return NextResponse.json({
      success: true,
      message: `DTF ${operation} logged successfully`,
      data: result,
      validation: operation === 'powder_cure' ? validateDTFCure(data.temp_c, data.seconds) :
                  operation === 'heat_press_to_garment' ? validateDTFPress(data.press_temp_c, data.press_seconds, data.pressure || 'MEDIUM', data.fabric_type) :
                  undefined
    }, { status: 201 })

  } catch (error) {
    console.error('Error in DTF operation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log DTF operation' },
      { status: 500 }
    )
  }
}

// GET /api/printing/dtf?run_id=xxx - Get DTF data for run
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

    // Get all DTF-specific data for the run
    const [prints, powderCures, pressLogs] = await Promise.all([
      db.dTFPrint.findMany({
        where: { run_id },
        orderBy: { created_at: 'asc' }
      }),
      db.dTFPowderCure.findMany({
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

    // Calculate film efficiency if we have data
    const latest_print = prints[prints.length - 1]
    let film_efficiency = null
    if (latest_print?.film_utilization) {
      try {
        film_efficiency = JSON.parse(latest_print.film_utilization)
      } catch (e) {
        console.warn('Failed to parse film utilization data')
      }
    }

    // Calculate powder usage summary
    let powder_summary = null
    if (powderCures.length > 0) {
      const totalPowder = powderCures.reduce((sum, cure) => sum + cure.powder_g, 0)
      const passCount = powderCures.filter(cure => cure.validation_status === 'PASS').length

      powder_summary = {
        total_powder_g: totalPowder,
        avg_temp_c: Math.round(powderCures.reduce((sum, cure) => sum + cure.temp_c, 0) / powderCures.length),
        avg_seconds: Math.round(powderCures.reduce((sum, cure) => sum + cure.seconds, 0) / powderCures.length),
        cure_pass_rate: Math.round((passCount / powderCures.length) * 100),
        total_cures: powderCures.length
      }
    }

    // Calculate press summary
    let press_summary = null
    if (pressLogs.length > 0) {
      const avgTemp = Math.round(pressLogs.reduce((sum, log) => sum + log.temp_c, 0) / pressLogs.length)
      const avgTime = Math.round(pressLogs.reduce((sum, log) => sum + log.seconds, 0) / pressLogs.length)
      const passCount = pressLogs.filter(log => log.validation_status === 'PASS').length

      press_summary = {
        avg_temp_c: avgTemp,
        avg_seconds: avgTime,
        press_pass_rate: Math.round((passCount / pressLogs.length) * 100),
        total_presses: pressLogs.length,
        fabric_types: [...new Set(pressLogs.map(log => log.fabric_type).filter(Boolean))]
      }
    }

    return NextResponse.json({
      success: true,
      run_info: run,
      dtf_data: {
        prints,
        powder_cures: powderCures,
        heat_press_logs: pressLogs,
        film_efficiency,
        powder_summary,
        press_summary
      }
    })

  } catch (error) {
    console.error('Error fetching DTF data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch DTF data' },
      { status: 500 }
    )
  }
}