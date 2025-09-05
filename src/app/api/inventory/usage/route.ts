import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, Prisma } from '@prisma/client'

// GET /api/inventory/usage - Get material usage records with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const orderId = searchParams.get('orderId')
    const taskId = searchParams.get('taskId')
    const inventoryId = searchParams.get('inventoryId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Prisma.UsageRecordWhereInput = {}

    if (orderId) where.orderId = orderId
    if (taskId) where.taskId = taskId
    if (inventoryId) where.inventoryId = inventoryId
    
    if (dateFrom || dateTo) {
      where.usedAt = {}
      if (dateFrom) where.usedAt.gte = new Date(dateFrom)
      if (dateTo) where.usedAt.lte = new Date(dateTo)
    }

    const [usageRecords, total] = await Promise.all([
      prisma.materialUsage.findMany({
        where,
        include: {
          inventory: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              category: true,
              brand: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { usedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.materialUsage.count({ where })
    ])

    // Get usage statistics
    const stats = await prisma.materialUsage.aggregate({
      where,
      _sum: { totalCost: true },
      _count: { id: true }
    })

    // Get top used materials
    const topMaterials = await prisma.materialUsage.groupBy({
      by: ['inventoryId'],
      where,
      _sum: {
        quantityUsed: true,
        totalCost: true
      },
      orderBy: {
        _sum: {
          totalCost: 'desc'
        }
      },
      take: 10
    })

    // Enrich top materials with inventory details
    const enrichedTopMaterials = await Promise.all(
      topMaterials.map(async (material) => {
        const inventory = await prisma.inventoryItem.findUnique({
          where: { id: material.inventoryId },
          select: {
            name: true,
            sku: true,
            unit: true,
            brand: { select: { name: true } }
          }
        })
        return {
          ...material,
          inventory
        }
      })
    )

    return NextResponse.json({
      usageRecords,
      stats: {
        totalRecords: stats._count,
        totalCost: stats._sum.totalCost || 0
      },
      topMaterials: enrichedTopMaterials,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching material usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/usage - Record material usage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow production roles to record usage
    const canRecordUsage = [
      Role.ADMIN,
      Role.MANAGER,
      Role.WAREHOUSE_STAFF,
      Role.SILKSCREEN_OPERATOR,
      Role.SUBLIMATION_OPERATOR,
      Role.DTF_OPERATOR,
      Role.EMBROIDERY_OPERATOR,
      Role.SEWING_OPERATOR
    ].includes(session.user.role)

    if (!canRecordUsage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      inventoryId,
      orderId,
      taskId,
      quantityUsed,
      notes
    } = body

    // Validate required fields
    if (!inventoryId || !quantityUsed) {
      return NextResponse.json(
        { error: 'Inventory ID and quantity used are required' },
        { status: 400 }
      )
    }

    const quantityNum = parseFloat(quantityUsed)
    if (quantityNum <= 0) {
      return NextResponse.json(
        { error: 'Quantity used must be greater than 0' },
        { status: 400 }
      )
    }

    // Get inventory item details
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId }
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Check if sufficient stock is available
    if (inventoryItem.quantity < quantityNum) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}, Requested: ${quantityNum} ${inventoryItem.unit}` },
        { status: 400 }
      )
    }

    // Validate order/task if provided
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
    }

    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      })
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calculate costs
      const unitCost = inventoryItem.unitCost
      const totalCost = quantityNum * unitCost

      // Create material usage record
      const usageRecord = await tx.materialUsage.create({
        data: {
          inventoryId,
          orderId: orderId || null,
          taskId: taskId || null,
          quantityUsed: quantityNum,
          unitCost,
          totalCost
        },
        include: {
          inventory: {
            select: {
              name: true,
              sku: true,
              unit: true,
              category: true
            }
          }
        }
      })

      // Create corresponding stock movement (OUT)
      await tx.stockMovement.create({
        data: {
          inventoryId,
          type: 'OUT',
          quantity: Math.floor(quantityNum), // Round down for discrete units
          reason: orderId 
            ? `Used for order ${orderId}${taskId ? ` (Task: ${taskId})` : ''}` 
            : `Material usage${taskId ? ` (Task: ${taskId})` : ''}`,
          reference: orderId || taskId || `USAGE_${usageRecord.id}`
        }
      })

      // Update inventory quantity
      const updatedItem = await tx.inventoryItem.update({
        where: { id: inventoryId },
        data: {
          quantity: Math.max(0, inventoryItem.quantity - Math.floor(quantityNum)),
          lastUpdated: new Date()
        }
      })

      return { usageRecord, updatedItem }
    })

    // Check reorder status
    const alertStatus = result.updatedItem.quantity <= result.updatedItem.reorderPoint
      ? 'REORDER_ALERT'
      : result.updatedItem.quantity === 0
        ? 'OUT_OF_STOCK'
        : 'OK'

    return NextResponse.json({
      message: 'Material usage recorded successfully',
      usageRecord: result.usageRecord,
      newQuantity: result.updatedItem.quantity,
      costImpact: result.usageRecord.totalCost,
      alertStatus
    })

  } catch (error) {
    console.error('Error recording material usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/usage - Bulk delete usage records (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can delete usage records
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { usageIds = [] } = body

    if (!Array.isArray(usageIds) || usageIds.length === 0) {
      return NextResponse.json(
        { error: 'Usage IDs array is required' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get usage records to be deleted
      const usageRecords = await tx.materialUsage.findMany({
        where: { id: { in: usageIds } },
        include: { inventory: true }
      })

      // Reverse the inventory impact by creating adjustment movements
      for (const record of usageRecords) {
        await tx.stockMovement.create({
          data: {
            inventoryId: record.inventoryId,
            type: 'ADJUSTMENT',
            quantity: Math.floor(record.quantityUsed),
            reason: `Reversal of deleted usage record`,
            reference: `REVERSAL_${record.id}`
          }
        })

        // Update inventory quantity
        await tx.inventoryItem.update({
          where: { id: record.inventoryId },
          data: {
            quantity: { increment: Math.floor(record.quantityUsed) },
            lastUpdated: new Date()
          }
        })
      }

      // Delete usage records
      await tx.materialUsage.deleteMany({
        where: { id: { in: usageIds } }
      })

      return { deletedCount: usageRecords.length }
    })

    return NextResponse.json({
      message: 'Usage records deleted and inventory adjusted',
      deletedCount: result.deletedCount
    })

  } catch (error) {
    console.error('Error deleting usage records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}