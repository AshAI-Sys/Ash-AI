import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { get3PLQuotes, validateCODCollection } from '@/lib/delivery-calculations'
import { validateAshleyAI } from '@/lib/ashley-ai'
// 3PL Booking API for Stage 8 Delivery System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/delivery/3pl - Get 3PL bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const provider_name = searchParams.get('provider_name')
    const status = searchParams.get('status')
    const shipment_id = searchParams.get('shipment_id')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id, delivery_method: '3PL' }
    if (provider_name) where.provider_name = provider_name
    if (status) where.status = status
    if (shipment_id) where.id = shipment_id

    const bookings = await db.shipment.findMany({
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
          select: {
            carton_no: true,
            weight_kg: true,
            length_cm: true,
            width_cm: true,
            height_cm: true
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
      bookings: bookings.map(booking => ({
        id: booking.id,
        tracking_no: booking.tracking_no,
        provider_name: booking.provider_name,
        service_type: booking.service_type,
        status: booking.status,
        consignee_name: booking.consignee_name,
        consignee_address: booking.consignee_address,
        estimated_cost: booking.estimated_cost,
        estimated_eta: booking.estimated_eta,
        actual_delivery_at: booking.actual_delivery_at,
        total_weight: booking.cartons.reduce((sum, c) => sum + (c.weight_kg || 0), 0),
        cartons_count: booking.cartons.length,
        client_name: booking.order.client_name,
        order_value: booking.order.total_value,
        pod_completed: !!booking.pod_record,
        created_at: booking.created_at
      }))
    })

  } catch (_error) {
    console.error('Error fetching 3PL bookings:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch 3PL bookings' },
      { status: 500 }
    )
  }
}

// POST /api/delivery/3pl - Book 3PL delivery service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      shipment_id,
      provider_name,
      service_type,
      estimated_cost,
      estimated_eta,
      booking_reference,
      special_instructions,
      cod_amount
    } = body

    if (!workspace_id || !shipment_id || !provider_name || !service_type) {
      return NextResponse.json(
        { error: 'workspace_id, shipment_id, provider_name, and service_type are required' },
        { status: 400 }
      )
    }

    // Validate shipment exists and is ready for 3PL
    const shipment = await db.shipment.findFirst({
      where: {
        id: shipment_id,
        workspace_id,
        status: 'READY',
        delivery_method: '3PL'
      },
      include: {
        cartons: true,
        order: {
          select: {
            client_name: true,
            total_value: true
          }
        }
      }
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment not found, not ready, or not set for 3PL delivery' },
        { status: 404 }
      )
    }

    // Ashley AI validation for 3PL booking
    const ashley_check = await validateAshleyAI({
      context: '3PL_BOOKING',
      provider_name,
      service_type,
      shipment_value: shipment.order.total_value,
      cartons_count: shipment.cartons.length,
      cod_amount: cod_amount || 0
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked 3PL booking',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Update shipment with 3PL booking details
    const updated_shipment = await db.shipment.update({
      where: { id: shipment_id },
      data: {
        provider_name,
        service_type,
        estimated_cost: estimated_cost || 0,
        estimated_eta: estimated_eta ? new Date(estimated_eta) : null,
        tracking_no: booking_reference,
        special_instructions,
        status: 'BOOKED_3PL'
      }
    })

    // Create 3PL booking record
    const booking_record = {
      shipment_id,
      provider_name,
      service_type,
      booking_reference: booking_reference || `BOOKING_${Date.now()}`,
      estimated_cost: estimated_cost || 0,
      estimated_eta: estimated_eta ? new Date(estimated_eta) : null,
      cod_amount: cod_amount || 0,
      special_instructions,
      status: 'CONFIRMED',
      booked_at: new Date(),
      ashley_validation: ashley_check
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: '3pl_booking',
        entity_id: booking_reference || `BOOKING_${Date.now()}`,
        action: 'CREATE',
        after_data: booking_record
      }
    })

    return NextResponse.json({
      success: true,
      booking: {
        ...booking_record,
        shipment: {
          id: shipment.id,
          consignee_name: shipment.consignee_name,
          consignee_address: shipment.consignee_address,
          client_name: shipment.order.client_name
        }
      },
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating 3PL booking:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create 3PL booking' },
      { status: 500 }
    )
  }
}

// PUT /api/delivery/3pl - Update 3PL booking status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shipment_id,
      workspace_id,
      status,
      tracking_no,
      actual_pickup_at,
      actual_delivery_at,
      delivery_cost,
      cod_collected,
      provider_notes
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
        workspace_id,
        delivery_method: '3PL'
      }
    })

    if (!existing_shipment) {
      return NextResponse.json(
        { error: '3PL shipment not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (status) update_data.status = status
    if (tracking_no) update_data.tracking_no = tracking_no
    if (actual_pickup_at) update_data.actual_pickup_at = new Date(actual_pickup_at)
    if (actual_delivery_at) update_data.actual_delivery_at = new Date(actual_delivery_at)
    if (delivery_cost) update_data.estimated_cost = delivery_cost // Update with actual cost
    if (provider_notes) update_data.special_instructions = provider_notes

    // Update shipment
    const updated_shipment = await db.shipment.update({
      where: { id: shipment_id },
      data: update_data,
      include: {
        order: {
          select: {
            client_name: true,
            total_value: true
          }
        },
        cartons: true
      }
    })

    // Handle COD validation if collected
    let cod_validation
    if (cod_collected && existing_shipment.estimated_cost) {
      cod_validation = validateCODCollection(
        cod_collected,
        existing_shipment.estimated_cost || 0
      )
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: '3pl_booking',
        entity_id: shipment_id,
        action: 'UPDATE',
        before_data: existing_shipment,
        after_data: {
          ...update_data,
          cod_collected,
          cod_validation
        }
      }
    })

    return NextResponse.json({
      success: true,
      booking: {
        ...updated_shipment,
        cod_validation,
        total_weight: updated_shipment.cartons.reduce((sum, c) => sum + (c.weight_kg || 0), 0)
      }
    })

  } catch (_error) {
    console.error('Error updating 3PL booking:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update 3PL booking' },
      { status: 500 }
    )
  }
}

// OPTIONS /api/delivery/3pl - Get quotes from multiple 3PL providers
export async function OPTIONS(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      weight_kg,
      dimensions,
      pickup_address,
      delivery_address,
      cod_amount,
      is_fragile = false,
      urgency = 'MEDIUM'
    } = body

    if (!workspace_id || !weight_kg || !dimensions || !pickup_address || !delivery_address) {
      return NextResponse.json(
        { error: 'workspace_id, weight_kg, dimensions, pickup_address, and delivery_address are required' },
        { status: 400 }
      )
    }

    // Get quotes from 3PL providers
    const quotes = get3PLQuotes({
      weight_kg,
      dimensions,
      pickup_address,
      delivery_address,
      cod_amount,
      is_fragile
    })

    // Filter quotes based on urgency
    let filtered_quotes = quotes
    if (urgency === 'HIGH') {
      filtered_quotes = quotes.filter(quote => 
        quote.service_type === 'SAME_DAY' || quote.service_type === 'INSTANT'
      )
    } else if (urgency === 'LOW') {
      filtered_quotes = quotes.filter(quote => 
        quote.service_type === 'STANDARD' || quote.service_type === 'NEXT_DAY'
      )
    }

    // Sort by cost (cheapest first)
    filtered_quotes.sort((a, b) => a.estimated_cost - b.estimated_cost)

    return NextResponse.json({
      success: true,
      quotes: filtered_quotes,
      metadata: {
        urgency,
        total_quotes: quotes.length,
        filtered_quotes: filtered_quotes.length,
        cheapest_option: filtered_quotes[0] || null,
        fastest_option: filtered_quotes.reduce((fastest, quote) => 
          new Date(quote.estimated_eta) < new Date(fastest.estimated_eta) ? quote : fastest
        , filtered_quotes[0]) || null
      }
    })

  } catch (_error) {
    console.error('Error getting 3PL quotes:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to get 3PL quotes' },
      { status: 500 }
    )
  }
}