// Driver Trip Management API for Stage 8 Delivery System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { optimizeRoute } from '@/lib/delivery-calculations'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/delivery/trips - Get all trips for workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const driver_name = searchParams.get('driver_name')
    const date = searchParams.get('date')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (status) where.status = status
    if (driver_name) where.driver_name = { contains: driver_name, mode: 'insensitive' }
    if (date) {
      const start_date = new Date(date)
      const end_date = new Date(start_date)
      end_date.setDate(end_date.getDate() + 1)
      where.scheduled_date = {
        gte: start_date,
        lt: end_date
      }
    }

    const trips = await db.trip.findMany({
      where,
      include: {
        vehicle: {
          select: {
            plate_no: true,
            type: true,
            fuel_type: true
          }
        },
        stops: {
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
            }
          },
          orderBy: { sequence: 'asc' }
        }
      },
      orderBy: { scheduled_date: 'desc' }
    })

    return NextResponse.json({
      success: true,
      trips: trips.map(trip => ({
        ...trip,
        total_stops: trip.stops.length,
        completed_stops: trip.stops.filter(stop => stop.status === 'DELIVERED').length,
        progress_pct: trip.stops.length > 0 
          ? Math.round((trip.stops.filter(stop => stop.status === 'DELIVERED').length / trip.stops.length) * 100)
          : 0
      }))
    })

  } catch (_error) {
    console.error('Error fetching trips:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trips' },
      { status: 500 }
    )
  }
}

// POST /api/delivery/trips - Create new trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      vehicle_id,
      driver_name,
      driver_contact,
      scheduled_date,
      shipment_ids = [],
      optimize_route = true
    } = body

    if (!workspace_id || !driver_name || !scheduled_date) {
      return NextResponse.json(
        { error: 'workspace_id, driver_name, and scheduled_date are required' },
        { status: 400 }
      )
    }

    // Validate vehicle exists if provided
    if (vehicle_id) {
      const vehicle = await db.vehicle.findFirst({
        where: {
          id: vehicle_id,
          workspace_id,
          active: true
        }
      })

      if (!vehicle) {
        return NextResponse.json(
          { error: 'Vehicle not found or inactive' },
          { status: 404 }
        )
      }
    }

    // Validate shipments belong to workspace and are ready
    if (shipment_ids.length > 0) {
      const shipments = await db.shipment.findMany({
        where: {
          id: { in: shipment_ids },
          workspace_id,
          status: 'READY',
          delivery_method: 'DRIVER'
        },
        include: {
          cartons: true
        }
      })

      if (shipments.length !== shipment_ids.length) {
        return NextResponse.json(
          { error: 'One or more shipments not found, not ready, or not for driver delivery' },
          { status: 400 }
        )
      }

      // Ashley AI validation for trip capacity and routing
      const ashley_check = await validateAshleyAI({
        context: 'TRIP_CREATION',
        driver_name,
        shipments_count: shipments.length,
        total_weight: shipments.reduce((sum, s) => sum + s.cartons.reduce((cs, c) => cs + (c.weight_kg || 0), 0), 0),
        vehicle_type: vehicle_id ? 'ASSIGNED' : 'TBD'
      })

      if (ashley_check.risk === 'RED') {
        return NextResponse.json({
          success: false,
          error: 'Ashley AI blocked trip creation',
          ashley_feedback: ashley_check,
          blocked: true
        }, { status: 422 })
      }
    }

    // Create trip
    const trip = await db.trip.create({
      data: {
        workspace_id,
        vehicle_id,
        driver_name,
        driver_contact,
        scheduled_date: new Date(scheduled_date),
        status: 'SCHEDULED'
      }
    })

    // Create trip stops from shipments
    if (shipment_ids.length > 0) {
      const shipments = await db.shipment.findMany({
        where: {
          id: { in: shipment_ids },
          workspace_id
        }
      })

      // Prepare stops for route optimization
      const stops_to_optimize = shipments.map(shipment => ({
        id: shipment.id,
        address: typeof shipment.consignee_address === 'string' 
          ? shipment.consignee_address 
          : JSON.stringify(shipment.consignee_address)
      }))

      // Optimize route if requested
      let optimized_route
      if (optimize_route && stops_to_optimize.length > 1) {
        optimized_route = optimizeRoute(stops_to_optimize)
      }

      // Create trip stops
      await Promise.all(
        shipments.map(async (shipment, index) => {
          const sequence = optimized_route 
            ? optimized_route.optimized_stops.find(stop => stop.stop_id === shipment.id)?.sequence || index + 1
            : index + 1

          await db.tripStop.create({
            data: {
              trip_id: trip.id,
              shipment_id: shipment.id,
              sequence,
              estimated_duration_minutes: optimized_route?.optimized_stops
                .find(stop => stop.stop_id === shipment.id)?.estimated_duration_minutes || 30,
              distance_km: optimized_route?.optimized_stops
                .find(stop => stop.stop_id === shipment.id)?.distance_km || 5,
              status: 'PENDING'
            }
          })

          // Update shipment status
          await db.shipment.update({
            where: { id: shipment.id },
            data: { status: 'IN_TRANSIT' }
          })
        })
      )

      // Update trip with route optimization data
      if (optimized_route) {
        await db.trip.update({
          where: { id: trip.id },
          data: {
            estimated_duration_minutes: optimized_route.total_duration_minutes,
            estimated_distance_km: optimized_route.total_distance_km,
            fuel_cost_estimate: optimized_route.fuel_cost_estimate
          }
        })
      }
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'trip',
        entity_id: trip.id,
        action: 'CREATE',
        after_data: {
          driver_name,
          shipments_count: shipment_ids.length,
          route_optimized: optimize_route
        }
      }
    })

    // Get created trip with relations
    const created_trip = await db.trip.findUnique({
      where: { id: trip.id },
      include: {
        vehicle: {
          select: {
            plate_no: true,
            type: true
          }
        },
        stops: {
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
            }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      trip: created_trip,
      route_optimization: optimize_route && shipment_ids.length > 1 ? {
        total_stops: shipment_ids.length,
        estimated_duration_hours: Math.round((created_trip.estimated_duration_minutes || 0) / 60 * 100) / 100,
        estimated_distance_km: created_trip.estimated_distance_km,
        fuel_cost_estimate: created_trip.fuel_cost_estimate
      } : null
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating trip:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create trip' },
      { status: 500 }
    )
  }
}

// PUT /api/delivery/trips - Update trip status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      trip_id,
      workspace_id,
      status,
      actual_start_time,
      actual_end_time,
      actual_distance_km,
      fuel_consumed_liters,
      notes
    } = body

    if (!trip_id || !workspace_id) {
      return NextResponse.json(
        { error: 'trip_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing trip
    const existing_trip = await db.trip.findFirst({
      where: {
        id: trip_id,
        workspace_id
      }
    })

    if (!existing_trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (status) update_data.status = status
    if (actual_start_time) update_data.actual_start_time = new Date(actual_start_time)
    if (actual_end_time) update_data.actual_end_time = new Date(actual_end_time)
    if (actual_distance_km) update_data.actual_distance_km = actual_distance_km
    if (fuel_consumed_liters) update_data.fuel_consumed_liters = fuel_consumed_liters
    if (notes) update_data.notes = notes

    // Update trip
    const updated_trip = await db.trip.update({
      where: { id: trip_id },
      data: update_data,
      include: {
        vehicle: {
          select: {
            plate_no: true,
            type: true
          }
        },
        stops: {
          include: {
            shipment: {
              select: {
                consignee_name: true,
                consignee_address: true
              }
            }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    // If trip is completed, update all pending stops to delivered
    if (status === 'COMPLETED') {
      await db.tripStop.updateMany({
        where: {
          trip_id,
          status: 'PENDING'
        },
        data: {
          status: 'DELIVERED',
          actual_arrival_time: new Date()
        }
      })

      // Update associated shipments
      const trip_stops = await db.tripStop.findMany({
        where: { trip_id }
      })

      await Promise.all(
        trip_stops.map(stop =>
          db.shipment.update({
            where: { id: stop.shipment_id },
            data: { 
              status: 'DELIVERED',
              actual_delivery_at: new Date()
            }
          })
        )
      )
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'trip',
        entity_id: trip_id,
        action: 'UPDATE',
        before_data: existing_trip,
        after_data: update_data
      }
    })

    return NextResponse.json({
      success: true,
      trip: updated_trip
    })

  } catch (_error) {
    console.error('Error updating trip:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update trip' },
      { status: 500 }
    )
  }
}