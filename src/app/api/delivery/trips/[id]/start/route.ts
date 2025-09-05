import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { odoStart } = body
    const resolvedParams = await params
    const tripId = resolvedParams.id

    if (!odoStart || typeof odoStart !== "number") {
      return NextResponse.json(
        { success: false, error: "Valid odometer start reading required" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Start the trip
      const trip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          odoStart
        },
        include: {
          shipment: true,
          driver: { select: { name: true } },
          vehicle: { select: { plateNumber: true } },
          stops: {
            include: {
              stopCartons: {
                include: {
                  carton: { select: { cartonNumber: true } }
                }
              }
            },
            orderBy: { stopNo: "asc" }
          }
        }
      })

      // Update shipment status
      await tx.shipment.update({
        where: { id: trip.shipmentId },
        data: { status: "PICKED_UP" }
      })

      // Create tracking event
      await tx.trackingEvent.create({
        data: {
          shipmentId: trip.shipmentId,
          eventType: "PICKED_UP",
          description: `Trip started by ${trip.driver.name} with vehicle ${trip.vehicle.plateNumber}`,
          timestamp: new Date(),
          source: "DRIVER_APP"
        }
      })

      return trip
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error("Error starting trip:", error)
    return NextResponse.json(
      { success: false, error: "Failed to start trip" },
      { status: 500 }
    )
  }
}