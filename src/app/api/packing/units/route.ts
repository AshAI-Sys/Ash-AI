// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Packing Units API for Stage 7 Finishing & Packing System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/packing/units - Get finished units
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')
    const bundle_id = searchParams.get('bundle_id')
    const sku = searchParams.get('sku')
    const packed = searchParams.get('packed')
    const size_code = searchParams.get('size_code')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (order_id) where.order_id = order_id
    if (bundle_id) where.bundle_id = bundle_id
    if (sku) where.sku = { contains: sku, mode: 'insensitive' }
    if (size_code) where.size_code = size_code
    if (packed !== null) where.packed = packed === 'true'

    const finished_units = await db.finishedUnit.findMany({
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
        bundle: {
          select: {
            bundle_no: true
          }
        },
        carton_contents: {
          include: {
            carton: {
              select: {
                id: true,
                carton_no: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      success: true,
      finished_units
    })

  } catch (_error) {
    console.error('Error fetching finished units:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch finished units' },
      { status: 500 }
    )
  }
}

// POST /api/packing/units - Create finished units from bundles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      bundle_id,
      units = [] // [{sku, size_code, color?, serial?, retail_barcode?, weight_g?}]
    } = body

    if (!workspace_id || !order_id || units.length === 0) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, and units array are required' },
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

    // If bundle_id provided, validate it exists
    if (bundle_id) {
      const bundle = await db.bundle.findFirst({
        where: {
          id: bundle_id,
          workspace_id,
          order_id
        }
      })

      if (!bundle) {
        return NextResponse.json(
          { error: 'Bundle not found or does not belong to order' },
          { status: 404 }
        )
      }
    }

    // Ashley AI validation for unit creation
    const ashley_check = await validateAshleyAI({
      context: 'FINISHED_UNITS_CREATION',
      order_id,
      units_count: units.length,
      bundle_id: bundle_id || null,
      unique_skus: [...new Set(units.map(u => u.sku))].length
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked finished units creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create finished units
    const finished_units_data = units.map((unit: any) => ({
      workspace_id,
      order_id,
      bundle_id: bundle_id || null,
      sku: unit.sku,
      size_code: unit.size_code,
      color: unit.color || null,
      serial: unit.serial || null,
      retail_barcode: unit.retail_barcode || null,
      weight_g: unit.weight_g || null,
      packed: false
    }))

    const created_units = await db.finishedUnit.createMany({
      data: finished_units_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'finished_unit',
        entity_id: 'batch',
        action: 'CREATE',
        after_data: {
          order_id,
          bundle_id,
          units_created: created_units.count,
          unique_skus: [...new Set(units.map(u => u.sku))].length,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Created ${created_units.count} finished units`,
      units_created: created_units.count,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating finished units:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create finished units' },
      { status: 500 }
    )
  }
}