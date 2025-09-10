import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get("order_id")
    const status = searchParams.get("status")
    const cartonId = searchParams.get("cartonId")

    const where: any = {}
    
    if (order_id) where.order_id = order_id
    if (status) where.status = status
    if (cartonId) where.id = cartonId

    const cartons = await prisma.carton.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            clientName: true
          }
        },
        contents: {
          include: {
            order: {
              select: {
                apparelType: true,
                brand_id: true
              }
            }
          }
        },
        cartonContents: true,
        shipment: {
          select: {
            id: true,
            shipmentNumber: true,
            status: true,
            trackingNumber: true
          }
        },
        sealer: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: cartons
    })

  } catch (_error) {
    console.error("Error fetching cartons:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch cartons" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      order_id,
      dimensions, // {length_cm, width_cm, height_cm}
      maxWeightKg,
      notes,
      autoPackUnits = false
    } = body

    // Validate required fields
    if (!dimensions || !dimensions.length_cm || !dimensions.width_cm || !dimensions.height_cm) {
      return NextResponse.json(
        { success: false, error: "Missing carton dimensions" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate carton number
      const cartonCount = await tx.carton.count()
      const cartonNumber = `CTN-${String(cartonCount + 1).padStart(6, "0")}`

      // Create the carton
      const carton = await tx.carton.create({
        data: {
          cartonNumber,
          order_id,
          dimensions,
          maxWeightKg,
          notes,
          qrCode: `QR-${cartonNumber}-${Date.now()}`,
          barcode: `BC-${cartonNumber}`,
          status: "EMPTY"
        }
      })

      // Auto-pack available units if requested
      if (autoPackUnits && order_id) {
        const availableUnits = await tx.finishedUnit.findMany({
          where: {
            order_id,
            status: "READY",
            cartonId: null
          },
          take: 50 // Pack up to 50 units automatically
        })

        if (availableUnits.length > 0) {
          // Update units to be packed in this carton
          await tx.finishedUnit.updateMany({
            where: {
              id: {
                in: availableUnits.map(u => u.id)
              }
            },
            data: {
              cartonId: carton.id,
              status: "PACKED",
              packedAt: new Date()
            }
          })

          // Group by SKU for carton contents
          const skuGroups = availableUnits.reduce((acc: any, unit) => {
            if (!acc[unit.sku]) {
              acc[unit.sku] = { qty: 0, estimatedWeight: 0 }
            }
            acc[unit.sku].qty++
            acc[unit.sku].estimatedWeight += 0.5 // 500g per unit estimate
            return acc
          }, {})

          // Create carton contents
          await tx.cartonContent.createMany({
            data: Object.entries(skuGroups).map(([sku, data]: [string, any]) => ({
              cartonId: carton.id,
              sku,
              qty: data.qty,
              weightKg: data.estimatedWeight
            }))
          })

          // Update carton status and weight
          const totalWeight = Object.values(skuGroups).reduce((sum: number, data: any) => sum + data.estimatedWeight, 0)
          await tx.carton.update({
            where: { id: carton.id },
            data: {
              status: availableUnits.length >= 50 ? "FULL" : "PARTIAL",
              weightKg: totalWeight
            }
          })
        }
      }

      return carton
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error creating carton:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create carton" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, sealedBy, notes, packUnits } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing carton ID" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Pack units if specified
      if (packUnits && Array.isArray(packUnits)) {
        // Update units to this carton
        await tx.finishedUnit.updateMany({
          where: {
            id: {
              in: packUnits.map((u: any) => u.unitId)
            }
          },
          data: {
            cartonId: id,
            status: "PACKED",
            packedAt: new Date()
          }
        })

        // Update carton contents
        const skuGroups = packUnits.reduce((acc: any, unit: any) => {
          if (!acc[unit.sku]) {
            acc[unit.sku] = { qty: 0, weight: 0 }
          }
          acc[unit.sku].qty += unit.qty || 1
          acc[unit.sku].weight += unit.weight || 0.5
          return acc
        }, {})

        // Delete existing contents and create new ones
        await tx.cartonContent.deleteMany({
          where: { cartonId: id }
        })

        await tx.cartonContent.createMany({
          data: Object.entries(skuGroups).map(([sku, data]: [string, any]) => ({
            cartonId: id,
            sku,
            qty: data.qty,
            weightKg: data.weight
          }))
        })

        // Update carton weight
        const totalWeight = Object.values(skuGroups).reduce((sum: number, data: any) => sum + data.weight, 0)
        await tx.carton.update({
          where: { id },
          data: {
            weightKg: totalWeight
          }
        })
      }

      // Update carton
      const updatedCarton = await tx.carton.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(sealedBy && { sealedBy, sealedAt: new Date() }),
          ...(notes && { notes })
        },
        include: {
          contents: true,
          cartonContents: true,
          order: {
            select: {
              orderNumber: true,
              clientName: true
            }
          }
        }
      })

      return updatedCarton
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (_error) {
    console.error("Error updating carton:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to update carton" },
      { status: 500 }
    )
  }
}