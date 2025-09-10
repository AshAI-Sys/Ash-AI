import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// POD (Proof of Delivery) Records API for Stage 8 Delivery System
// Based on CLIENT_UPDATED_PLAN.md specifications


// POST /api/delivery/pod - Create new POD record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      shipment_id,
      trip_id,
      recipient_name,
      signature_url,
      photo_url,
      notes,
      location_lat,
      location_lon,
      location_accuracy,
      delivery_status = 'DELIVERED', // DELIVERED, FAILED, PARTIAL
      failed_reason
    } = body

    if (!workspace_id || !shipment_id || !recipient_name || !delivery_status) {
      return NextResponse.json(
        { error: 'workspace_id, shipment_id, recipient_name, and delivery_status are required' },
        { status: 400 }
      )
    }

    // Validate shipment exists and belongs to workspace
    const shipment = await db.shipment.findFirst({
      where: {
        id: shipment_id,
        workspace_id
      },
      include: {
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
        { error: 'Shipment not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Ashley AI validation for POD creation
    const ashley_check = await validateAshleyAI({
      context: 'POD_CREATION',
      delivery_status,
      shipment_value: shipment.order.total_value,
      location_provided: !!(location_lat && location_lon),
      signature_provided: !!signature_url,
      photo_provided: !!photo_url
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked POD creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create POD record
    const pod_record = await db.pODRecord.create({
      data: {
        workspace_id,
        shipment_id,
        trip_id,
        recipient_name,
        signature_url,
        photo_url,
        notes,
        location_lat,
        location_lon,
        location_accuracy,
        delivery_status,
        failed_reason: delivery_status === 'FAILED' ? failed_reason : null,
        delivered_at: delivery_status === 'DELIVERED' ? new Date() : null,
        ashley_validation: ashley_check
      }
    })

    // Update shipment status based on delivery status
    const shipment_update_data: any = {}
    if (delivery_status === 'DELIVERED') {
      shipment_update_data.status = 'DELIVERED'
      shipment_update_data.actual_delivery_at = new Date()
    } else if (delivery_status === 'FAILED') {
      shipment_update_data.status = 'DELIVERY_FAILED'
    }

    if (Object.keys(shipment_update_data).length > 0) {
      await db.shipment.update({
        where: { id: shipment_id },
        data: shipment_update_data
      })
    }

    // Update trip stop status if trip_id is provided
    if (trip_id && delivery_status === 'DELIVERED') {
      const trip_stop = await db.tripStop.findFirst({
        where: {
          trip_id,
          shipment_id
        }
      })

      if (trip_stop) {
        await db.tripStop.update({
          where: { id: trip_stop.id },
          data: {
            status: 'DELIVERED',
            actual_arrival_time: new Date()
          }
        })
      }
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'pod_record',
        entity_id: pod_record.id,
        action: 'CREATE',
        after_data: {
          shipment_id,
          delivery_status,
          recipient_name,
          has_signature: !!signature_url,
          has_photo: !!photo_url,
          location_provided: !!(location_lat && location_lon)
        }
      }
    })

    return NextResponse.json({
      success: true,
      pod_record: {
        ...pod_record,
        shipment: {
          id: shipment.id,
          consignee_name: shipment.consignee_name,
          client_name: shipment.order.client_name
        }
      },
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating POD record:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create POD record' },
      { status: 500 }
    )
  }
}

// GET /api/delivery/pod - Get POD records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const shipment_id = searchParams.get('shipment_id')
    const trip_id = searchParams.get('trip_id')
    const delivery_status = searchParams.get('delivery_status')
    const date = searchParams.get('date')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (shipment_id) where.shipment_id = shipment_id
    if (trip_id) where.trip_id = trip_id
    if (delivery_status) where.delivery_status = delivery_status
    if (date) {
      const start_date = new Date(date)
      const end_date = new Date(start_date)
      end_date.setDate(end_date.getDate() + 1)
      where.delivered_at = {
        gte: start_date,
        lt: end_date
      }
    }

    const pod_records = await db.pODRecord.findMany({
      where,
      include: {
        shipment: {
          select: {
            consignee_name: true,
            consignee_address: true,
            order: {
              select: {
                client_name: true,
                product_type: true
              }
            }
          }
        },
        trip: {
          select: {
            driver_name: true,
            vehicle: {
              select: {
                plate_no: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({
      success: true,
      pod_records: pod_records.map(record => ({
        ...record,
        location: record.location_lat && record.location_lon 
          ? { lat: record.location_lat, lon: record.location_lon, accuracy: record.location_accuracy }
          : null,
        has_signature: !!record.signature_url,
        has_photo: !!record.photo_url
      }))
    })

  } catch (_error) {
    console.error('Error fetching POD records:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch POD records' },
      { status: 500 }
    )
  }
}

// PUT /api/delivery/pod - Update POD record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pod_id,
      workspace_id,
      signature_url,
      photo_url,
      notes,
      delivery_status
    } = body

    if (!pod_id || !workspace_id) {
      return NextResponse.json(
        { error: 'pod_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing POD record
    const existing_record = await db.pODRecord.findFirst({
      where: {
        id: pod_id,
        workspace_id
      }
    })

    if (!existing_record) {
      return NextResponse.json(
        { error: 'POD record not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (signature_url) update_data.signature_url = signature_url
    if (photo_url) update_data.photo_url = photo_url
    if (notes) update_data.notes = notes
    if (delivery_status) update_data.delivery_status = delivery_status

    // Update POD record
    const updated_record = await db.pODRecord.update({
      where: { id: pod_id },
      data: update_data,
      include: {
        shipment: {
          select: {
            consignee_name: true,
            order: {
              select: {
                client_name: true
              }
            }
          }
        }
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'pod_record',
        entity_id: pod_id,
        action: 'UPDATE',
        before_data: existing_record,
        after_data: update_data
      }
    })

    return NextResponse.json({
      success: true,
      pod_record: updated_record
    })

  } catch (_error) {
    console.error('Error updating POD record:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update POD record' },
      { status: 500 }
    )
  }
}