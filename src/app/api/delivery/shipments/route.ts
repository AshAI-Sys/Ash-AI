import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { get3PLQuotes, recommendDeliveryMethod } from '@/lib/delivery-calculations'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Shipment Management API for Stage 8 Delivery System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/delivery/shipments - Get all shipments for workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const order_id = searchParams.get('order_id')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (status) where.status = status
    if (order_id) where.order_id = order_id

    const shipments = await db.shipment.findMany({
      where,
      include: {
        order: {
          select: {
            client_name: true,
            product_type: true,
            total_value: true
          }
        },
        cartons: {
          include: {
            items: true
          }
        },
        trip_stops: {
          include: {
            trip: {
              select: {
                driver_name: true,
                vehicle: {
                  select: {
                    plate_no: true,
                    type: true
                  }
                },
                status: true
              }
            }
          }
        },
        pod_record: {
          select: {
            delivered_at: true,
            signature_url: true,
            photo_url: true,
            notes: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      success: true,
      shipments: shipments.map(shipment => ({
        ...shipment,
        total_weight: shipment.cartons.reduce((sum, carton) => sum + (carton.weight_kg || 0), 0),
        total_items: shipment.cartons.reduce((sum, carton) => sum + carton.items.length, 0),
        current_trip: shipment.trip_stops[0]?.trip || null
      }))
    })

  } catch (_error) {
    console.error('Error fetching shipments:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shipments' },
      { status: 500 }
    )
  }
}

// POST /api/delivery/shipments - Create new shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      order_id,
      consignee_name,
      consignee_address,
      delivery_method = 'DRIVER', // DRIVER or 3PL
      provider_name,
      service_type,
      estimated_cost,
      estimated_eta,
      special_instructions,
      cartons = []
    } = body

    if (!workspace_id || !order_id || !consignee_name || !consignee_address) {
      return NextResponse.json(
        { error: 'workspace_id, order_id, consignee_name, and consignee_address are required' },
        { status: 400 }
      )
    }

    // Validate order exists and get details
    const order = await db.order.findFirst({
      where: {
        id: order_id,
        workspace_id
      },
      include: {
        items: {
          include: {
            print_jobs: {
              where: { status: 'COMPLETED' },
              include: {
                printed_items: true
              }
            },
            quality_checks: {
              where: { final_result: 'PASS' }
            }
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

    // Ashley AI validation for shipment readiness
    const ashley_check = await validateAshleyAI({
      context: 'SHIPMENT_CREATION',
      order_data: order,
      delivery_method,
      consignee_address,
      cartons_count: cartons.length
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
    const shipment = await db.shipment.create({
      data: {
        workspace_id,
        order_id,
        consignee_name,
        consignee_address,
        delivery_method,
        provider_name,
        service_type,
        estimated_cost,
        estimated_eta: estimated_eta ? new Date(estimated_eta) : null,
        special_instructions,
        status: 'READY',
        ashley_validation: ashley_check
      }
    })

    // Create cartons if provided
    if (cartons.length > 0) {
      await Promise.all(
        cartons.map(async (carton: any) => {
          const created_carton = await db.carton.create({
            data: {
              shipment_id: shipment.id,
              carton_no: carton.carton_no,
              length_cm: carton.length_cm,
              width_cm: carton.width_cm,
              height_cm: carton.height_cm,
              weight_kg: carton.weight_kg,
              fragile: carton.fragile || false,
              cod_amount: carton.cod_amount
            }
          })

          // Create carton items if provided
          if (carton.items && carton.items.length > 0) {
            await db.cartonItem.createMany({
              data: carton.items.map((_item: any) => ({
                carton_id: created_carton.id,
                order_item_id: item.order_item_id,
                quantity: item.quantity,
                sku: item.sku,
                description: item.description
              }))
            })
          }
        })
      )
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'shipment',
        entity_id: shipment.id,
        action: 'CREATE',
        after_data: {
          order_id,
          delivery_method,
          cartons_count: cartons.length,
          ashley_risk: ashley_check.risk
        }
      }
    })

    // Get created shipment with relations
    const created_shipment = await db.shipment.findUnique({
      where: { id: shipment.id },
      include: {
        order: {
          select: {
            client_name: true,
            product_type: true
          }
        },
        cartons: {
          include: {
            items: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      shipment: created_shipment,
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating shipment:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shipment' },
      { status: 500 }
    )
  }
}

// PUT /api/delivery/shipments - Update shipment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shipment_id,
      workspace_id,
      status,
      tracking_no,
      provider_name,
      service_type,
      estimated_cost,
      estimated_eta,
      special_instructions,
      actual_pickup_at,
      actual_delivery_at
    } = body

    if (!shipment_id || !workspace_id) {
      return NextResponse.json(
        { error: 'shipment_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing shipment
    const existing_shipment = await db.shipment.findFirst({
      where: {
        id: shipment_id,
        workspace_id
      }
    })

    if (!existing_shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (status) update_data.status = status
    if (tracking_no) update_data.tracking_no = tracking_no
    if (provider_name) update_data.provider_name = provider_name
    if (service_type) update_data.service_type = service_type
    if (estimated_cost) update_data.estimated_cost = estimated_cost
    if (estimated_eta) update_data.estimated_eta = new Date(estimated_eta)
    if (special_instructions) update_data.special_instructions = special_instructions
    if (actual_pickup_at) update_data.actual_pickup_at = new Date(actual_pickup_at)
    if (actual_delivery_at) update_data.actual_delivery_at = new Date(actual_delivery_at)

    // Update shipment
    const updated_shipment = await db.shipment.update({
      where: { id: shipment_id },
      data: update_data,
      include: {
        order: {
          select: {
            client_name: true,
            product_type: true
          }
        },
        cartons: {
          include: {
            items: true
          }
        }
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'shipment',
        entity_id: shipment_id,
        action: 'UPDATE',
        before_data: existing_shipment,
        after_data: update_data
      }
    })

    return NextResponse.json({
      success: true,
      shipment: updated_shipment
    })

  } catch (_error) {
    console.error('Error updating shipment:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update shipment' },
      { status: 500 }
    )
  }
}