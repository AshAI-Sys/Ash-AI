import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db, createAuditLog } from '@/lib/db'
import { validateCuring } from '@/lib/printing-calculations'
// Silkscreen-Specific Printing API
// Based on CLIENT_UPDATED_PLAN.md Stage 4.1 specifications


// POST /api/printing/silkscreen - Log silkscreen-specific data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { run_id, operation, ...data } = body

    // Validate run exists and is silkscreen
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

    if (run.method !== 'SILKSCREEN') {
      return NextResponse.json(
        { error: 'This endpoint is for silkscreen runs only' },
        { status: 400 }
      )
    }

    let result: any = null
    const audit_action = 'CREATE'
    let audit_data: any = { run_id, po_number: run.order.po_number, operation }

    switch (operation) {
      case 'screen_prep':
        // Log screen preparation
        const { screen_id, mesh_count, emulsion_batch, exposure_seconds, registration_notes } = data

        if (!screen_id || !mesh_count) {
          return NextResponse.json(
            { error: 'screen_id and mesh_count are required for screen prep' },
            { status: 400 }
          )
        }

        result = await db.silkscreenPrep.create({
          data: {
            run_id,
            screen_id,
            mesh_count,
            emulsion_batch,
            exposure_seconds,
            registration_notes
          }
        })

        audit_data = { ...audit_data, screen_id, mesh_count }
        break

      case 'printing_specs':
        // Log printing specifications
        const { ink_type, coats, squeegee_durometer, floodbar, expected_ink_g, actual_ink_g } = data

        if (!ink_type || !coats) {
          return NextResponse.json(
            { error: 'ink_type and coats are required for printing specs' },
            { status: 400 }
          )
        }

        result = await db.silkscreenSpec.create({
          data: {
            run_id,
            ink_type,
            coats,
            squeegee_durometer,
            floodbar,
            expected_ink_g,
            actual_ink_g
          }
        })

        audit_data = { ...audit_data, ink_type, coats, actual_ink_g }
        break

      case 'curing':
        // Log curing process with validation
        const { dryer_id, temp_c, seconds, belt_speed } = data

        if (!temp_c || !seconds) {
          return NextResponse.json(
            { error: 'temp_c and seconds are required for curing' },
            { status: 400 }
          )
        }

        // Get ink type from specs to validate curing
        const specs = await db.silkscreenSpec.findFirst({
          where: { run_id },
          orderBy: { created_at: 'desc' }
        })

        const ink_type_for_cure = specs?.ink_type || 'PLASTISOL'
        const cure_validation = validateCuring(temp_c, seconds, ink_type_for_cure)

        result = await db.curingLog.create({
          data: {
            run_id,
            dryer_id,
            temp_c,
            seconds,
            belt_speed,
            cure_index: cure_validation.cure_index,
            pass_fail: cure_validation.status
          }
        })

        audit_data = { 
          ...audit_data, 
          temp_c, 
          seconds, 
          cure_status: cure_validation.status,
          cure_message: cure_validation.message
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Must be: screen_prep, printing_specs, or curing' },
          { status: 400 }
        )
    }

    // Create audit log
    await createAuditLog({
      workspace_id: run.order.workspace_id,
      entity_type: 'silkscreen_operation',
      entity_id: result.id,
      action: audit_action,
      after_data: audit_data
    })

    return NextResponse.json({
      success: true,
      message: `Silkscreen ${operation} logged successfully`,
      data: result,
      validation: operation === 'curing' ? {
        cure_index: validateCuring(data.temp_c, data.seconds, 'PLASTISOL').cure_index,
        status: validateCuring(data.temp_c, data.seconds, 'PLASTISOL').status,
        message: validateCuring(data.temp_c, data.seconds, 'PLASTISOL').message
      } : undefined
    }, { status: 201 })

  } catch (_error) {
    console.error('Error in silkscreen operation:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to log silkscreen operation' },
      { status: 500 }
    )
  }
}

// GET /api/printing/silkscreen?run_id=xxx - Get silkscreen data for run
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

    // Get all silkscreen-specific data for the run
    const [prep, specs, curing] = await Promise.all([
      db.silkscreenPrep.findMany({
        where: { run_id },
        orderBy: { created_at: 'asc' }
      }),
      db.silkscreenSpec.findMany({
        where: { run_id },
        orderBy: { created_at: 'asc' }
      }),
      db.curingLog.findMany({
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

    // Calculate ink efficiency if we have data
    const latest_spec = specs[specs.length - 1]
    let ink_efficiency = null
    if (latest_spec?.expected_ink_g && latest_spec?.actual_ink_g) {
      ink_efficiency = {
        expected: latest_spec.expected_ink_g,
        actual: latest_spec.actual_ink_g,
        variance_pct: Math.round(((latest_spec.actual_ink_g - latest_spec.expected_ink_g) / latest_spec.expected_ink_g) * 100),
        efficiency_rating: Math.abs(latest_spec.actual_ink_g - latest_spec.expected_ink_g) <= latest_spec.expected_ink_g * 0.15 ? 'GOOD' : 'POOR'
      }
    }

    return NextResponse.json({
      success: true,
      run_info: run,
      silkscreen_data: {
        screen_prep: prep,
        printing_specs: specs,
        curing_logs: curing,
        ink_efficiency
      }
    })

  } catch (_error) {
    console.error('Error fetching silkscreen data:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch silkscreen data' },
      { status: 500 }
    )
  }
}