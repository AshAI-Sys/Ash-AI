// Packing Cartons API for Stage 7 Finishing & Packing System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/packing/cartons - Get cartons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (order_id) where.order_id = order_id
    if (status) where.status = status

    const cartons = await db.finishingCarton.findMany({
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
        carton_contents: {
          include: {
            finished_unit: {
              select: {
                sku: true,
                size_code: true,
                color: true,
                weight_g: true
              }
            }
          }
        },
        shipment_cartons: {
          include: {
            shipment: {
              select: {
                id: true,
                shipment_no: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: [
        { order_id: 'desc' },
        { carton_no: 'asc' }
      ]
    })

    // Calculate summary data for each carton
    const cartons_with_summary = cartons.map(carton => {
      const total_units = carton.carton_contents.reduce((sum, content) => sum + content.qty, 0)
      const unique_skus = [...new Set(carton.carton_contents.map(content => content.finished_unit.sku))].length
      const volume_cubic_cm = (carton.length_cm || 0) * (carton.width_cm || 0) * (carton.height_cm || 0)

      return {
        ...carton,
        summary: {
          total_units,
          unique_skus,
          volume_cubic_cm,
          is_shipped: carton.shipment_cartons.length > 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      cartons: cartons_with_summary
    })

  } catch (error) {
    console.error('Error fetching cartons:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cartons' },
      { status: 500 }
    )
  }
}

// POST /api/packing/cartons - Create new carton
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      length_cm,
      width_cm,
      height_cm,
      tare_weight_kg = 0,
      notes
    } = body

    if (!workspace_id || !order_id || !length_cm || !width_cm || !height_cm) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, length_cm, width_cm, and height_cm are required' },
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

    // Get next carton number for this order
    const last_carton = await db.finishingCarton.findFirst({
      where: {
        workspace_id,
        order_id
      },
      orderBy: { carton_no: 'desc' }
    })

    const carton_no = (last_carton?.carton_no || 0) + 1

    // Generate QR code
    const qr_code = `CARTON-${order.po_number}-${carton_no.toString().padStart(3, '0')}`

    // Calculate dimensional weight (using standard 5000 divisor)
    const dim_weight_kg = (length_cm * width_cm * height_cm) / 5000

    // Ashley AI validation for carton creation
    const ashley_check = await validateAshleyAI({
      context: 'CARTON_CREATION',
      order_id,
      carton_dimensions: { length_cm, width_cm, height_cm },
      volume_cubic_cm: length_cm * width_cm * height_cm,
      dim_weight_kg
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked carton creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create carton
    const carton = await db.finishingCarton.create({
      data: {
        workspace_id,
        order_id,
        carton_no,
        length_cm,
        width_cm,
        height_cm,
        tare_weight_kg,
        dim_weight_kg,
        qr_code,
        notes,
        status: 'OPEN'
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'finishing_carton',
        entity_id: carton.id,
        action: 'CREATE',
        after_data: {
          order_id,
          carton_no,
          dimensions: { length_cm, width_cm, height_cm },
          qr_code,
          ashley_risk: ashley_check.risk
        }
      }
    })

    // Get created carton with relations
    const created_carton = await db.finishingCarton.findUnique({
      where: { id: carton.id },
      include: {
        order: {
          select: {
            po_number: true,
            product_type: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      carton: created_carton,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating carton:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create carton' },
      { status: 500 }
    )
  }
}