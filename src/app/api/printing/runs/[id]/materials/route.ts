// Print Run Material Tracking API
// Based on CLIENT_UPDATED_PLAN.md Stage 4 specifications

import { NextRequest, NextResponse } from 'next/server'
import { db, createAuditLog } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/printing/runs/[id]/materials - Get materials used in run
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: runId } = await params

    const materials = await db.printRunMaterial.findMany({
      where: { run_id: runId },
      orderBy: { created_at: 'desc' }
    })

    const run = await db.printRun.findUnique({
      where: { id: runId },
      select: {
        method: true,
        order: {
          select: {
            po_number: true,
            workspace_id: true
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

    // Calculate totals
    const totals = materials.reduce((acc, material) => {
      return {
        total_cost: acc.total_cost + (material.total_cost || 0),
        items_count: acc.items_count + 1
      }
    }, { total_cost: 0, items_count: 0 })

    return NextResponse.json({
      success: true,
      materials,
      totals,
      run_info: {
        method: run.method,
        po_number: run.order.po_number
      }
    })

  } catch (error) {
    console.error('Error fetching run materials:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}

// POST /api/printing/runs/[id]/materials - Log material usage
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: runId } = await params
    const body = await request.json()
    const {
      item_id,
      item_name,
      uom,
      qty,
      source_batch_id,
      cost_per_unit
    } = body

    // Validate required fields
    if (!item_id || !item_name || !uom || qty === undefined) {
      return NextResponse.json(
        { error: 'item_id, item_name, uom, and qty are required' },
        { status: 400 }
      )
    }

    if (qty <= 0) {
      return NextResponse.json(
        { error: 'qty must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate run exists and is active
    const run = await db.printRun.findUnique({
      where: { id: runId },
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

    if (run.status !== 'IN_PROGRESS' && run.status !== 'CREATED') {
      return NextResponse.json(
        { error: `Cannot log materials for ${run.status} run` },
        { status: 400 }
      )
    }

    // Calculate total cost
    const total_cost = cost_per_unit ? qty * cost_per_unit : null

    // Create material usage record
    const material = await db.printRunMaterial.create({
      data: {
        run_id: runId,
        item_id,
        item_name,
        uom,
        qty,
        source_batch_id,
        cost_per_unit,
        total_cost
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id: run.order.workspace_id,
      entity_type: 'print_material',
      entity_id: material.id,
      action: 'CREATE',
      after_data: {
        run_id: runId,
        po_number: run.order.po_number,
        item_name,
        qty,
        uom,
        total_cost
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Material usage logged successfully',
      material
    }, { status: 201 })

  } catch (error) {
    console.error('Error logging material usage:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log material usage' },
      { status: 500 }
    )
  }
}