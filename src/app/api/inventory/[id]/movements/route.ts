import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, Prisma } from '@prisma/client'

// GET /api/inventory/[id]/movements - Get stock movements for specific item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 'IN', 'OUT', 'TRANSFER', 'REJECT'

    const { id } = await params
    const where: Prisma.StockMovementWhereInput = { inventoryId: id }
    if (type) {
      where.type = type
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.stockMovement.count({ where })
    ])

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (_error) {
    console.error('Error fetching stock movements:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/[id]/movements - Record stock movement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only warehouse staff, admin, and manager can record stock movements
    const canManageStock = [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF].includes(session.user.role)
    if (!canManageStock) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      type, // 'IN', 'OUT', 'TRANSFER', 'REJECT', 'ADJUSTMENT'
      quantity,
      reason,
      reference, // Order ID, PO Number, etc.
      notes,
      toLocationId, // For transfers
      unitCost // For IN movements (purchases)
    } = body

    // Validate required fields
    if (!type || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Type, quantity, and reason are required' },
        { status: 400 }
      )
    }

    const quantityNum = parseInt(quantity)
    if (quantityNum <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate movement type
    const validTypes = ['IN', 'OUT', 'TRANSFER', 'REJECT', 'ADJUSTMENT']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid movement type' },
        { status: 400 }
      )
    }

    const { id } = await params
    
    // Get current inventory item
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (!inventoryItem) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // For OUT movements, check if sufficient stock exists
    if (['OUT', 'TRANSFER', 'REJECT'].includes(type)) {
      if (inventoryItem.quantity < quantityNum) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${inventoryItem.quantity}, Requested: ${quantityNum}` },
          { status: 400 }
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          inventoryId: id,
          type,
          quantity: quantityNum,
          reason,
          reference: reference || null
        }
      })

      // Update inventory quantity based on movement type
      let quantityChange = 0
      switch (type) {
        case 'IN':
          quantityChange = quantityNum
          break
        case 'OUT':
        case 'REJECT':
          quantityChange = -quantityNum
          break
        case 'TRANSFER':
          quantityChange = -quantityNum // From source location
          break
        case 'ADJUSTMENT':
          // For adjustments, quantity represents the final count
          quantityChange = quantityNum - inventoryItem.quantity
          break
      }

      // Update inventory item quantity
      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: Math.max(0, inventoryItem.quantity + quantityChange),
          lastUpdated: new Date(),
          // Update unit cost if provided (for purchases)
          ...(type === 'IN' && unitCost && { unitCost: parseFloat(unitCost) })
        }
      })

      // Handle transfers (create corresponding IN movement at destination)
      if (type === 'TRANSFER' && toLocationId) {
        await tx.stockMovement.create({
          data: {
            inventoryId: toLocationId,
            type: 'IN',
            quantity: quantityNum,
            reason: `Transfer from ${inventoryItem.name}`,
            reference: reference || movement.id
          }
        })

        // Update destination item quantity
        await tx.inventoryItem.update({
          where: { id: toLocationId },
          data: {
            quantity: { increment: quantityNum },
            lastUpdated: new Date()
          }
        })
      }

      return { movement, updatedItem }
    })

    // Check if item is now at or below reorder point
    const alertStatus = result.updatedItem.quantity <= result.updatedItem.reorderPoint
      ? 'REORDER_ALERT'
      : result.updatedItem.quantity === 0
        ? 'OUT_OF_STOCK'
        : 'OK'

    return NextResponse.json({
      message: 'Stock movement recorded successfully',
      movement: result.movement,
      newQuantity: result.updatedItem.quantity,
      alertStatus
    })

  } catch (_error) {
    console.error('Error recording stock movement:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}