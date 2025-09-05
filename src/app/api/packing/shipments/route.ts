// Packing Shipments API for Stage 7 Finishing & Packing System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/packing/shipments - Get finishing shipments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')
    const method = searchParams.get('method')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (order_id) where.order_id = order_id
    if (status) where.status = status
    if (method) where.method = method

    const shipments = await db.finishingShipment.findMany({
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
        shipment_cartons: {
          include: {
            carton: {
              select: {
                id: true,
                carton_no: true,
                actual_weight_kg: true,
                dim_weight_kg: true,
                fill_percent: true,
                status: true,
                carton_contents: {
                  select: {
                    qty: true,
                    finished_unit: {
                      select: {
                        sku: true,
                        size_code: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Calculate summary data for each shipment
    const shipments_with_summary = shipments.map(shipment => {
      const total_cartons = shipment.shipment_cartons.length
      const total_units = shipment.shipment_cartons.reduce((sum, sc) => 
        sum + sc.carton.carton_contents.reduce((cartonSum, content) => cartonSum + content.qty, 0), 0
      )
      const total_weight_kg = shipment.shipment_cartons.reduce((sum, sc) => 
        sum + Math.max(sc.carton.actual_weight_kg, sc.carton.dim_weight_kg), 0
      )

      return {
        ...shipment,
        summary: {
          total_cartons,
          total_units,
          total_weight_kg: Math.round(total_weight_kg * 100) / 100
        }
      }
    })

    return NextResponse.json({
      success: true,
      shipments: shipments_with_summary
    })

  } catch (error) {
    console.error('Error fetching shipments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shipments' },
      { status: 500 }
    )
  }
}

// POST /api/packing/shipments - Create new shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      consignee_name,
      consignee_address, // {street, city, province, postal_code, country}
      contact_phone,
      method, // DRIVER, LALAMOVE, GRAB, 3PL, etc.
      cod_amount,
      carton_ids = [],
      notes
    } = body

    if (!workspace_id || !order_id || !consignee_name || !consignee_address || !method || carton_ids.length === 0) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, consignee_name, consignee_address, method, and carton_ids are required' },
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

    // Validate all cartons exist, belong to the order, and are closed
    const cartons = await db.finishingCarton.findMany({
      where: {
        id: { in: carton_ids },
        workspace_id,
        order_id
      },
      include: {
        shipment_cartons: {
          include: {
            shipment: {
              select: {
                id: true,
                shipment_no: true
              }
            }
          }
        }
      }
    })

    if (cartons.length !== carton_ids.length) {
      return NextResponse.json(
        { error: 'Some cartons not found or do not belong to the specified order' },
        { status: 404 }
      )
    }

    // Check if any cartons are not closed
    const unclosed_cartons = cartons.filter(carton => carton.status !== 'CLOSED')
    if (unclosed_cartons.length > 0) {
      const unclosed_nos = unclosed_cartons.map(c => c.carton_no).join(', ')
      return NextResponse.json(
        { error: `Cartons must be closed before shipping: ${unclosed_nos}` },
        { status: 409 }
      )
    }

    // Check if any cartons are already shipped
    const already_shipped = cartons.filter(carton => carton.shipment_cartons.length > 0)
    if (already_shipped.length > 0) {
      const shipped_info = already_shipped.map(c => `${c.carton_no} (Shipment: ${c.shipment_cartons[0].shipment.shipment_no})`).join(', ')
      return NextResponse.json(
        { error: `Cartons already shipped: ${shipped_info}` },
        { status: 409 }
      )
    }

    // Calculate shipment totals
    const total_cartons = cartons.length
    const total_weight_kg = cartons.reduce((sum, carton) => sum + Math.max(carton.actual_weight_kg, carton.dim_weight_kg), 0)

    // Get next shipment number for this order
    const last_shipment = await db.finishingShipment.findFirst({
      where: {
        workspace_id,
        order_id
      },
      orderBy: { created_at: 'desc' }
    })

    const shipment_no = `${order.po_number}-S${(last_shipment ? parseInt(last_shipment.shipment_no.split('-S')[1]) + 1 : 1).toString().padStart(3, '0')}`

    // Ashley AI validation for shipment creation
    const ashley_check = await validateAshleyAI({
      context: 'SHIPMENT_CREATION',
      order_id,
      method,
      total_cartons,
      total_weight_kg,
      cod_amount: cod_amount || 0,
      consignee_address
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked shipment creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create shipment
    const shipment = await db.finishingShipment.create({
      data: {
        workspace_id,
        order_id,
        shipment_no,
        consignee_name,
        consignee_address,
        contact_phone,
        method,
        cod_amount,
        total_weight_kg,
        total_cartons,
        status: 'READY_FOR_PICKUP',
        notes
      }
    })

    // Link cartons to shipment
    const shipment_carton_data = carton_ids.map(carton_id => ({
      shipment_id: shipment.id,
      carton_id
    }))

    await db.shipmentCarton.createMany({
      data: shipment_carton_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'finishing_shipment',
        entity_id: shipment.id,
        action: 'CREATE',
        after_data: {
          order_id,
          shipment_no,
          method,
          total_cartons,
          total_weight_kg,
          consignee_name,
          carton_ids,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      shipment,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating shipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shipment' },
      { status: 500 }
    )
  }
}