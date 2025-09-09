import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { calculateBundleProgress } from '@/lib/sewing-calculations'
// Individual Sewing Bundle API for Stage 5 Sewing System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/sewing/bundles/[id] - Get specific bundle details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const bundle = await db.bundle.findFirst({
      where: {
        id,
        workspace_id
      },
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
        bundle_progress: {
          include: {
            sewing_operation: {
              select: {
                name: true,
                standard_minutes: true,
                depends_on: true,
                complexity: true,
                skill_level: true
              }
            }
          },
          orderBy: { started_at: 'asc' }
        },
        sewing_runs: {
          include: {
            operator: {
              select: {
                name: true,
                skill_level: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    })

    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Calculate detailed progress
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

    // Calculate operation-level statistics
    const operation_stats = bundle.bundle_progress.map(progress => {
      const operation_runs = bundle.sewing_runs.filter(
        run => run.operation_name === progress.sewing_operation.name
      )

      const total_pieces_completed = operation_runs.reduce((sum, run) => sum + run.qty_good, 0)
      const total_pieces_rejected = operation_runs.reduce((sum, run) => sum + run.qty_rejected, 0)
      const avg_efficiency = operation_runs.length > 0
        ? operation_runs.reduce((sum, run) => sum + (run.efficiency_pct || 0), 0) / operation_runs.length
        : 0

      return {
        operation_name: progress.sewing_operation.name,
        status: progress.status,
        complexity: progress.sewing_operation.complexity,
        skill_level: progress.sewing_operation.skill_level,
        standard_minutes: progress.sewing_operation.standard_minutes,
        started_at: progress.started_at,
        completed_at: progress.completed_at,
        pieces_completed: total_pieces_completed,
        pieces_rejected: total_pieces_rejected,
        completion_rate: bundle.total_qty > 0 ? (total_pieces_completed / bundle.total_qty) * 100 : 0,
        avg_efficiency_pct: Math.round(avg_efficiency * 100) / 100,
        runs_count: operation_runs.length
      }
    })

    return NextResponse.json({
      success: true,
      bundle: {
        ...bundle,
        progress_summary: {
          overall_progress_pct: progress_calc.overall_progress_pct,
          next_available_operations: progress_calc.next_available_operations,
          blocked_operations: progress_calc.blocked_operations,
          estimated_completion_time_mins: progress_calc.estimated_completion_time_mins
        },
        operation_details: operation_stats
      }
    })

  } catch (_error) {
    console.error('Error fetching bundle details:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bundle details' },
      { status: 500 }
    )
  }
}

// POST /api/sewing/bundles/[id] - Start operation on bundle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      workspace_id,
      operation_name,
      operator_id,
      action // 'START' or 'COMPLETE'
    } = body

    if (!workspace_id || !operation_name || !action) {
      return NextResponse.json(
        { error: 'workspace_id, operation_name, and action are required' },
        { status: 400 }
      )
    }

    // Validate bundle exists
    const bundle = await db.bundle.findFirst({
      where: {
        id,
        workspace_id
      },
      include: {
        bundle_progress: {
          include: {
            sewing_operation: true
          }
        }
      }
    })

    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Find the specific operation progress record
    const operation_progress = bundle.bundle_progress.find(
      p => p.sewing_operation.name === operation_name
    )

    if (!operation_progress) {
      return NextResponse.json(
        { error: 'Operation not found in bundle routing' },
        { status: 404 }
      )
    }

    // Check dependencies for START action
    if (action === 'START') {
      const depends_on = operation_progress.sewing_operation.depends_on as string[]
      const completed_operations = bundle.bundle_progress
        .filter(p => p.status === 'COMPLETED')
        .map(p => p.sewing_operation.name)

      const unmet_dependencies = depends_on.filter(dep => !completed_operations.includes(dep))
      if (unmet_dependencies.length > 0) {
        return NextResponse.json(
          { error: `Cannot start operation. Missing dependencies: ${unmet_dependencies.join(', ')}` },
          { status: 422 }
        )
      }
    }

    // Update operation progress
    const update_data: any = {}
    if (action === 'START') {
      update_data.status = 'IN_PROGRESS'
      update_data.started_at = new Date()
    } else if (action === 'COMPLETE') {
      update_data.status = 'COMPLETED'
      update_data.completed_at = new Date()
      
      // If this wasn't already started, set start time too
      if (!operation_progress.started_at) {
        update_data.started_at = new Date()
      }
    }

    const updated_progress = await db.bundleProgress.update({
      where: { id: operation_progress.id },
      data: update_data
    })

    // Check if all operations are completed to update bundle status
    const all_progress = await db.bundleProgress.findMany({
      where: { bundle_id: bundle.id }
    })

    const all_completed = all_progress.every(p => p.status === 'COMPLETED')
    if (all_completed && bundle.status !== 'COMPLETED') {
      await db.bundle.update({
        where: { id: bundle.id },
        data: {
          status: 'COMPLETED',
          completed_at: new Date()
        }
      })
    } else if (action === 'START' && bundle.status === 'CREATED') {
      await db.bundle.update({
        where: { id: bundle.id },
        data: { status: 'IN_SEWING' }
      })
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'bundle_progress',
        entity_id: operation_progress.id,
        action: action,
        after_data: {
          bundle_id: bundle.id,
          bundle_no: bundle.bundle_no,
          operation_name,
          operator_id,
          new_status: update_data.status
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Operation ${operation_name} ${action.toLowerCase()}ed successfully`,
      bundle_progress: updated_progress
    })

  } catch (_error) {
    console.error('Error updating bundle operation:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update bundle operation' },
      { status: 500 }
    )
  }
}