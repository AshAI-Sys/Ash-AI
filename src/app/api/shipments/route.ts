import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const status = searchParams.get("status")
    const tplProvider = searchParams.get("tplProvider")

    const where: any = {}
    
    if (orderId) where.orderId = orderId
    if (status) where.status = status
    if (tplProvider) where.tplProvider = tplProvider

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            clientName: true,
            quantity: true
          }
        },
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        cartons: {
          include: {
            cartonContents: true
          }
        },
        trackingEvents: {
          orderBy: {
            timestamp: "desc"
          }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: shipments
    })

  } catch (_error) {
    console.error("Error fetching shipments:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch shipments" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      orderId,
      tplProvider,
      recipientName,
      recipientPhone,
      recipientAddress,
      cartonIds,
      pickupDate,
      estimatedCost,
      notes,
      createdBy,
      autoCreateTracking = true
    } = body

    // Validate required fields
    if (!tplProvider || !recipientName || !recipientPhone || !recipientAddress || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate shipment number
      const shipmentCount = await tx.shipment.count()
      const shipmentNumber = `SHP-${String(shipmentCount + 1).padStart(6, "0")}`

      // Calculate total weight and cartons from specified cartons
      let totalWeightKg = 0
      let totalCartons = 0

      if (cartonIds && cartonIds.length > 0) {
        const cartons = await tx.carton.findMany({
          where: {
            id: {
              in: cartonIds
            }
          }
        })

        totalWeightKg = cartons.reduce((sum, carton) => sum + carton.weightKg, 0)
        totalCartons = cartons.length

        // Update cartons to be part of this shipment
        await tx.carton.updateMany({
          where: {
            id: {
              in: cartonIds
            }
          },
          data: {
            status: "SHIPPED"
          }
        })
      }

      // Estimate ETA based on provider (basic logic)
      const estimatedETA = pickupDate ? 
        new Date(new Date(pickupDate).getTime() + (tplProvider === "LALAMOVE" ? 24 : 72) * 60 * 60 * 1000) : 
        null

      // Create the shipment
      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          orderId,
          status: "DRAFT",
          tplProvider,
          recipientName,
          recipientPhone,
          recipientAddress,
          totalWeightKg,
          totalCartons,
          estimatedCost,
          pickupDate: pickupDate ? new Date(pickupDate) : null,
          estimatedETA,
          notes,
          createdBy
        }
      })

      // Link cartons to shipment
      if (cartonIds && cartonIds.length > 0) {
        await tx.carton.updateMany({
          where: {
            id: {
              in: cartonIds
            }
          },
          data: {
            shipmentId: shipment.id
          }
        })
      }

      // Create initial tracking event
      if (autoCreateTracking) {
        await tx.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            eventType: "CREATED",
            description: "Shipment created and ready for pickup",
            timestamp: new Date(),
            source: "SYSTEM"
          }
        })
      }

      // Integrate with 3PL provider if not DIRECT
      if (tplProvider !== "DIRECT") {
        try {
          const tplResult = await integrate3PLShipment(shipment, tplProvider)
          
          if (tplResult.success) {
            await tx.shipment.update({
              where: { id: shipment.id },
              data: {
                tplShipmentId: tplResult.shipmentId,
                trackingNumber: tplResult.trackingNumber,
                status: "CONFIRMED"
              }
            })

            // Add 3PL confirmation event
            await tx.trackingEvent.create({
              data: {
                shipmentId: shipment.id,
                eventType: "CONFIRMED",
                description: `Confirmed with ${tplProvider}. Tracking: ${tplResult.trackingNumber}`,
                timestamp: new Date(),
                source: "3PL"
              }
            })
          }
        } catch (_error) {
          console.warn("3PL integration failed, continuing with manual shipment:", error)
        }
      }

      return shipment
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error creating shipment:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create shipment" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      status, 
      actualCost, 
      driverName, 
      driverPhone, 
      vehicleDetails,
      trackingNumber,
      actualETA,
      notes,
      addTrackingEvent
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing shipment ID" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update shipment
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(actualCost && { actualCost }),
          ...(driverName && { driverName }),
          ...(driverPhone && { driverPhone }),
          ...(vehicleDetails && { vehicleDetails }),
          ...(trackingNumber && { trackingNumber }),
          ...(actualETA && { actualETA: new Date(actualETA) }),
          ...(notes && { notes })
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              clientName: true
            }
          },
          cartons: true,
          trackingEvents: {
            orderBy: {
              timestamp: "desc"
            }
          }
        }
      })

      // Add tracking event if specified
      if (addTrackingEvent) {
        await tx.trackingEvent.create({
          data: {
            shipmentId: id,
            eventType: addTrackingEvent.eventType || status?.toUpperCase() || "UPDATE",
            location: addTrackingEvent.location,
            description: addTrackingEvent.description || `Shipment ${status || 'updated'}`,
            timestamp: addTrackingEvent.timestamp ? new Date(addTrackingEvent.timestamp) : new Date(),
            source: addTrackingEvent.source || "MANUAL"
          }
        })
      }

      // Update finished units status based on shipment status
      if (status === "DELIVERED") {
        await tx.finishedUnit.updateMany({
          where: {
            carton: {
              shipmentId: id
            }
          },
          data: {
            status: "SHIPPED",
            shippedAt: new Date()
          }
        })
      }

      return updatedShipment
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error updating shipment:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to update shipment" },
      { status: 500 }
    )
  }
}

// 3PL Integration Functions
async function integrate3PLShipment(shipment: any, provider: string) {
  switch (provider) {
    case "LALAMOVE":
      return integrateLalamove(shipment)
    case "GRAB":
      return integrateGrab(shipment)
    default:
      return { success: false, error: "Unsupported 3PL provider" }
  }
}

async function integrateLalamove(shipment: any) {
  // Placeholder for Lalamove API integration
  // In production, this would make actual API calls to Lalamove
  return {
    success: true,
    shipmentId: `LAL-${Date.now()}`,
    trackingNumber: `LAL${String(Math.random()).substring(2, 8)}`
  }
}

async function integrateGrab(shipment: any) {
  // Placeholder for Grab API integration
  // In production, this would make actual API calls to Grab
  return {
    success: true,
    shipmentId: `GRB-${Date.now()}`,
    trackingNumber: `GRB${String(Math.random()).substring(2, 8)}`
  }
}