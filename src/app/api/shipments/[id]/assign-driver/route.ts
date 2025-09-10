import { NextRequest, NextResponse } from 'next/server'

import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { driverId, vehicleId, stops } = body
    const resolvedParams = await params
    const shipmentId = resolvedParams.id

    if (!driverId || !vehicleId || !stops || stops.length === 0) {
      return NextResponse.json(
        { success: false, error: "Driver ID, vehicle ID, and stops are required" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify shipment exists
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          cartons: true
        }
      })

      if (!shipment) {
        throw new Error("Shipment not found")
      }

      // Verify driver and vehicle exist
      const [driver, vehicle] = await Promise.all([
        tx.user.findFirst({
          where: { id: driverId, role: "DRIVER" }
        }),
        tx.vehicle.findFirst({
          where: { id: vehicleId, active: true }
        })
      ])

      if (!driver) {
        throw new Error("Driver not found or not valid")
      }

      if (!vehicle) {
        throw new Error("Vehicle not found or not active")
      }

      // Create the trip
      const trip = await tx.trip.create({
        data: {
          shipmentId,
          driverId,
          vehicleId,
          status: "PLANNED"
        },
        include: {
          driver: {
            select: {
              name: true
            }
          },
          vehicle: {
            select: {
              plateNumber: true,
              type: true
            }
          }
        }
      })

      // Create trip stops
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i]
        
        const tripStop = await tx.tripStop.create({
          data: {
            tripId: trip.id,
            stopNo: i + 1,
            consigneeName: stop.consigneeName,
            address: stop.address,
            phone: stop.phone || null,
            eta: stop.eta ? new Date(stop.eta) : null
          }
        })

        // Link cartons to this stop
        if (stop.cartonIds && stop.cartonIds.length > 0) {
          await tx.stopCarton.createMany({
            data: stop.cartonIds.map((cartonId: string) => ({
              tripStopId: tripStop.id,
              cartonId
            }))
          })
        }
      }

      // Update shipment status
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { 
          status: "CONFIRMED"
        }
      })

      // Create tracking event
      await tx.trackingEvent.create({
        data: {
          shipmentId,
          eventType: "ASSIGNED",
          description: `Assigned to driver ${driver.name} with vehicle ${vehicle.plateNumber}`,
          timestamp: new Date(),
          source: "DISPATCH"
        }
      })

      return {
        trip,
        message: `Trip assigned to ${driver.name} with vehicle ${vehicle.plateNumber}`
      }
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error assigning driver:", _error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to assign driver" },
      { status: 500 }
    )
  }
}