// Sewing Bundles API for Stage 5 Sewing System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateBundleProgress } from '@/lib/sewing-calculations'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/sewing/bundles - Get sewing bundles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')
    const line_name = searchParams.get('line_name')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (order_id) where.order_id = order_id
    if (status) where.status = status
    if (line_name) where.line_name = { contains: line_name, mode: 'insensitive' }

    const bundles = await db.bundle.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            client: {
              select: {
                name: true
              }
            }
          }
        },
        bundle_progress: {
          include: {
            sewing_operation: {
              select: {
                name: true,
                standard_minutes: true,
                depends_on: true
              }
            }
          },
          orderBy: { started_at: 'asc' }
        },
        sewing_runs: {
          select: {
            id: true,
            operation_name: true,
            qty_good: true,
            qty_rejected: true,
            efficiency_pct: true,
            operator_name: true
          },
          take: 5,
          orderBy: { created_at: 'desc' }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Calculate progress for each bundle
    const bundles_with_progress = bundles.map(bundle => {
      const completed_operations = bundle.bundle_progress
        .filter(p => p.status === 'COMPLETED')
        .map(p => p.sewing_operation.name)

      const all_operations = bundle.bundle_progress.map(p => ({
        name: p.sewing_operation.name,
        standard_minutes: p.sewing_operation.standard_minutes,
        depends_on: p.sewing_operation.depends_on as string[]
      }))

      const progress_calc = calculateBundleProgress(
        {
          bundle_id: bundle.id,
          bundle_no: bundle.bundle_no,
          total_qty: bundle.total_qty,
          current_qty: bundle.current_qty,
          status: bundle.status as any,
          operations_completed: completed_operations,
          operations_pending: [],
          progress_pct: 0
        },
        all_operations,
        completed_operations
      )

      return {
        ...bundle,
        progress_summary: {
          overall_progress_pct: progress_calc.overall_progress_pct,
          next_available_operations: progress_calc.next_available_operations,
          blocked_operations: progress_calc.blocked_operations,
          estimated_completion_time_mins: progress_calc.estimated_completion_time_mins
        }
      }
    })

    return NextResponse.json({
      success: true,
      bundles: bundles_with_progress
    })

  } catch (_error) {
    console.error('Error fetching sewing bundles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sewing bundles' },
      { status: 500 }
    )
  }
}

// POST /api/sewing/bundles - Create sewing bundle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      bundle_no,
      total_qty,
      size_breakdown,
      line_name,
      priority_level = 'NORMAL',
      target_completion_date,
      notes
    } = body

    if (!workspace_id || !order_id || !bundle_no || !total_qty || !line_name) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, bundle_no, total_qty, and line_name are required' },
        { status: 400 }
      )
    }

    // Validate order exists and belongs to workspace
    const order = await db.order.findFirst({
      where: {
        id: order_id,
        workspace_id
      },
      include: {
        routing_steps: {
          where: { stage: 'SEWING' },
          include: {
            sewing_operations: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Check for duplicate bundle number
    const existing_bundle = await db.bundle.findFirst({
      where: {
        workspace_id,
        bundle_no
      }
    })

    if (existing_bundle) {
      return NextResponse.json(
        { error: 'Bundle with this number already exists' },
        { status: 409 }
      )
    }

    // Ashley AI validation for bundle creation
    const ashley_check = await validateAshleyAI({
      context: 'BUNDLE_CREATION',
      bundle_qty: total_qty,
      line_name,
      priority_level,
      operations_count: order.routing_steps.reduce((sum, step) => sum + step.sewing_operations.length, 0)
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked bundle creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Generate QR code data
    const qr_code_data = `ASH-BUNDLE-${bundle_no}-${workspace_id.slice(-8)}`

    // Create bundle
    const bundle = await db.bundle.create({
      data: {
        workspace_id,
        order_id,
        bundle_no,
        total_qty,
        current_qty: total_qty,
        size_breakdown: size_breakdown || {},
        line_name,
        priority_level,
        target_completion_date: target_completion_date ? new Date(target_completion_date) : null,
        qr_code_data,
        status: 'CREATED',
        notes
      }
    })

    // Create bundle progress records for all sewing operations in the order routing
    const bundle_progress_data = []
    for (const routing_step of order.routing_steps) {
      for (const sewing_op of routing_step.sewing_operations) {
        bundle_progress_data.push({
          workspace_id,
          bundle_id: bundle.id,
          sewing_operation_id: sewing_op.id,
          status: 'PENDING',
          started_at: null,
          completed_at: null
        })
      }
    }

    if (bundle_progress_data.length > 0) {
      await db.bundleProgress.createMany({
        data: bundle_progress_data
      })
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'bundle',
        entity_id: bundle.id,
        action: 'CREATE',
        after_data: {
          bundle_no,
          total_qty,
          line_name,
          priority_level,
          operations_count: bundle_progress_data.length
        }
      }
    })

    // Get created bundle with relations
    const created_bundle = await db.bundle.findUnique({
      where: { id: bundle.id },
      include: {
        order: {
          select: {
            po_number: true,
            client: {
              select: {
                name: true
              }
            }
          }
        },
        bundle_progress: {
          include: {
            sewing_operation: {
              select: {
                name: true,
                standard_minutes: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      bundle: created_bundle,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating sewing bundle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sewing bundle' },
      { status: 500 }
    )
  }
}

// PUT /api/sewing/bundles - Update bundle status or details
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bundle_id,
      workspace_id,
      status,
      current_qty,
      line_name,
      priority_level,
      target_completion_date,
      notes
    } = body

    if (!bundle_id || !workspace_id) {
      return NextResponse.json(
        { error: 'bundle_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing bundle
    const existing_bundle = await db.bundle.findFirst({
      where: {
        id: bundle_id,
        workspace_id
      }
    })

    if (!existing_bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (status) update_data.status = status
    if (current_qty !== undefined) update_data.current_qty = current_qty
    if (line_name) update_data.line_name = line_name
    if (priority_level) update_data.priority_level = priority_level
    if (target_completion_date) update_data.target_completion_date = new Date(target_completion_date)
    if (notes !== undefined) update_data.notes = notes

    // Update completion timestamp if status is being set to COMPLETED
    if (status === 'COMPLETED' && existing_bundle.status !== 'COMPLETED') {
      update_data.completed_at = new Date()
    }

    // Update bundle
    const updated_bundle = await db.bundle.update({
      where: { id: bundle_id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'bundle',
        entity_id: bundle_id,
        action: 'UPDATE',
        before_data: existing_bundle,
        after_data: update_data
      }
    })

    return NextResponse.json({
      success: true,
      bundle: updated_bundle
    })

  } catch (_error) {
    console.error('Error updating bundle:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update bundle' },
      { status: 500 }
    )
  }
}