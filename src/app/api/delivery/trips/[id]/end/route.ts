// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { odoEnd } = body
    const resolvedParams = await params
    const tripId = resolvedParams.id

    if (!odoEnd || typeof odoEnd !== "number") {
      return NextResponse.json(
        { success: false, error: "Valid odometer end reading required" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // End the trip
      const trip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          odoEnd
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
            }
          },
          expenses: true
        }
      })

      // Check if all stops are delivered
      const pendingStops = trip.stops.filter(stop => stop.status === "PENDING")
      const allDelivered = pendingStops.length === 0

      // Update shipment status based on delivery completion
      await tx.shipment.update({
        where: { id: trip.shipmentId },
        data: {
          status: allDelivered ? "DELIVERED" : "IN_TRANSIT"
        }
      })

      // Create tracking event
      await tx.trackingEvent.create({
        data: {
          shipmentId: trip.shipmentId,
          eventType: allDelivered ? "DELIVERED" : "TRIP_ENDED",
          description: allDelivered 
            ? `All deliveries completed. Trip ended by ${trip.driver.name}`
            : `Trip ended by ${trip.driver.name}. ${pendingStops.length} stops still pending`,
          timestamp: new Date(),
          source: "DRIVER_APP"
        }
      })

      // Calculate trip metrics
      const kmDriven = trip.odoStart ? odoEnd - trip.odoStart : 0
      const durationHours = trip.startedAt ? 
        (new Date().getTime() - new Date(trip.startedAt).getTime()) / (1000 * 60 * 60) : 0
      
      const totalExpenses = trip.expenses.reduce((sum, expense) => sum + expense.amount, 0)

      return {
        ...trip,
        metrics: {
          kmDriven,
          durationHours: Math.round(durationHours * 100) / 100,
          totalExpenses,
          stopsCompleted: trip.stops.filter(s => s.status === "DELIVERED").length,
          stopsFailed: trip.stops.filter(s => s.status === "FAILED").length,
          stopsPending: pendingStops.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error ending trip:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to end trip" },
      { status: 500 }
    )
  }
}