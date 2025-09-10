import { NextRequest, NextResponse } from 'next/server'

import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shipmentId, cartonId, scannedBy } = body

    if (!shipmentId || !cartonId) {
      return NextResponse.json(
        { success: false, error: "Shipment ID and Carton ID are required" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify carton belongs to shipment
      const carton = await tx.carton.findFirst({
        where: {
          id: cartonId,
          shipmentId
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              clientName: true
            }
          }
        }
      })

      if (!carton) {
        throw new Error("Carton not found in this shipment")
      }

      // Check if carton is already scanned out
      const existingScan = await tx.stopCarton.findFirst({
        where: {
          cartonId,
          scannedOutAt: {
            not: null
          }
        }
      })

      if (existingScan) {
        return {
          success: false,
          message: "Carton already scanned out",
          scanTime: existingScan.scannedOutAt
        }
      }

      // Find the stop carton record and mark as scanned out
      const stopCarton = await tx.stopCarton.findFirst({
        where: {
          cartonId,
          tripStop: {
            trip: {
              shipmentId
            }
          }
        },
        include: {
          tripStop: {
            include: {
              trip: {
                include: {
                  driver: {
                    select: {
                      name: true
                    }
                  },
                  vehicle: {
                    select: {
                      plateNumber: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (stopCarton) {
        await tx.stopCarton.update({
          where: { id: stopCarton.id },
          data: {
            scannedOutAt: new Date()
          }
        })
      }

      // Create tracking event
      await tx.trackingEvent.create({
        data: {
          shipmentId,
          eventType: "PICKED_UP",
          description: `Carton ${carton.cartonNumber} scanned out from warehouse`,
          timestamp: new Date(),
          source: "WAREHOUSE"
        }
      })

      // Check if all cartons for this shipment are scanned out
      const shipmentCartons = await tx.carton.findMany({
        where: { shipmentId },
        include: {
          _count: {
            select: {
              stopCartons: {
                where: {
                  scannedOutAt: {
                    not: null
                  }
                }
              }
            }
          }
        }
      })

      const totalCartons = shipmentCartons.length
      const scannedCartons = shipmentCartons.reduce((sum, carton) => 
        sum + (carton._count.stopCartons > 0 ? 1 : 0), 0
      )

      const allScanned = scannedCartons === totalCartons

      // Update shipment status if all cartons scanned
      if (allScanned) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: { status: "PICKED_UP" }
        })

        await tx.trackingEvent.create({
          data: {
            shipmentId,
            eventType: "PICKED_UP",
            description: `All ${totalCartons} cartons scanned out. Shipment ready for delivery`,
            timestamp: new Date(),
            source: "WAREHOUSE"
          }
        })
      }

      return {
        success: true,
        carton: {
          id: carton.id,
          cartonNumber: carton.cartonNumber,
          qrCode: carton.qrCode,
          weightKg: carton.weightKg,
          order: carton.order
        },
        scanTime: new Date(),
        trip: stopCarton?.tripStop?.trip ? {
          driver: stopCarton.tripStop.trip.driver.name,
          vehicle: stopCarton.tripStop.trip.vehicle.plateNumber
        } : null,
        shipmentProgress: {
          scannedCartons,
          totalCartons,
          allScanned
        }
      }
    })

    return NextResponse.json({
      success: result.success,
      data: result.success ? result : null,
      error: result.success ? null : result.message
    })

  } catch (_error) {
    console.error("Error scanning out carton:", _error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to scan out carton" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get("shipmentId")

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: "Shipment ID required" },
        { status: 400 }
      )
    }

    const scanOutRecords = await prisma.stopCarton.findMany({
      where: {
        scannedOutAt: {
          not: null
        },
        tripStop: {
          trip: {
            shipmentId
          }
        }
      },
      include: {
        carton: {
          select: {
            cartonNumber: true,
            qrCode: true,
            weightKg: true
          }
        },
        tripStop: {
          select: {
            stopNo: true,
            consigneeName: true
          }
        }
      },
      orderBy: {
        scannedOutAt: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: scanOutRecords
    })

  } catch (_error) {
    console.error("Error fetching scan-out records:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch scan-out records" },
      { status: 500 }
    )
  }
}