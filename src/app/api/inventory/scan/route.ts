// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, InventoryItem, Prisma } from '@prisma/client'

// POST /api/inventory/scan - Process barcode/QR code scan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      code, // The scanned barcode/QR code
      action = 'lookup', // 'lookup', 'stock_in', 'stock_out', 'usage'
      quantity,
      order_id,
      taskId,
      reason,
      reference
    } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }

    // Find inventory item by barcode, QR code, or SKU
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          { barcode: code },
          { qrCode: code },
          { sku: code.toUpperCase() }
        ]
      },
      include: {
        brand: {
          select: { name: true, code: true }
        },
        stockMovements: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    })

    if (!inventoryItem) {
      return NextResponse.json({
        found: false,
        message: 'Item not found',
        suggestedActions: [
          'Verify the code is correct',
          'Check if item exists in inventory',
          'Create new inventory item if needed'
        ]
      })
    }

    // Basic lookup - just return item info
    if (action === 'lookup') {
      return NextResponse.json({
        found: true,
        item: inventoryItem,
        currentStock: inventoryItem.quantity,
        stockStatus: getStockStatus(inventoryItem),
        recentMovements: inventoryItem.stockMovements
      })
    }

    // For other actions, validate permissions
    const canManageStock = [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF].includes(session.user.role)
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

    if ((action === 'stock_in' || action === 'stock_out') && !canManageStock) {
      return NextResponse.json({ error: 'Insufficient permissions for stock operations' }, { status: 403 })
    }

    if (action === 'usage' && !canRecordUsage) {
      return NextResponse.json({ error: 'Insufficient permissions for usage recording' }, { status: 403 })
    }

    // Validate quantity for stock operations
    if (['stock_in', 'stock_out', 'usage'].includes(action)) {
      if (!quantity || parseFloat(quantity) <= 0) {
        return NextResponse.json(
          { error: 'Valid quantity is required' },
          { status: 400 }
        )
      }
    }

    const quantityNum = parseFloat(quantity)

    // Handle different actions
    switch (action) {
      case 'stock_in':
        return await handleStockIn(inventoryItem, quantityNum, reason, reference)
      
      case 'stock_out':
        return await handleStockOut(inventoryItem, quantityNum, reason, reference)
      
      case 'usage':
        return await handleUsage(inventoryItem, quantityNum, order_id, taskId, reason)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (_error) {
    console.error('Error processing scan:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to handle stock in operations
async function handleStockIn(item: InventoryItem, quantity: number, reason?: string, reference?: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Create stock movement
    const movement = await tx.stockMovement.create({
      data: {
        inventoryId: item.id,
        type: 'IN',
        quantity: Math.floor(quantity),
        reason: reason || 'Stock received via scan',
        reference: reference || null
      }
    })

    // Update inventory quantity
    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: { increment: Math.floor(quantity) },
        lastUpdated: new Date()
      }
    })

    return { movement, updatedItem }
  })

  return NextResponse.json({
    success: true,
    action: 'stock_in',
    item: {
      id: item.id,
      name: item.name,
      sku: item.sku
    },
    previousQuantity: item.quantity,
    newQuantity: result.updatedItem.quantity,
    quantityAdded: Math.floor(quantity),
    stockStatus: getStockStatus(result.updatedItem),
    movement: result.movement
  })
}

// Helper function to handle stock out operations
async function handleStockOut(item: InventoryItem, quantity: number, reason?: string, reference?: string) {
  // Check sufficient stock
  if (item.quantity < Math.floor(quantity)) {
    return NextResponse.json({
      error: `Insufficient stock. Available: ${item.quantity}, Requested: ${Math.floor(quantity)}`,
      currentStock: item.quantity
    }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create stock movement
    const movement = await tx.stockMovement.create({
      data: {
        inventoryId: item.id,
        type: 'OUT',
        quantity: Math.floor(quantity),
        reason: reason || 'Stock removed via scan',
        reference: reference || null
      }
    })

    // Update inventory quantity
    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: { decrement: Math.floor(quantity) },
        lastUpdated: new Date()
      }
    })

    return { movement, updatedItem }
  })

  return NextResponse.json({
    success: true,
    action: 'stock_out',
    item: {
      id: item.id,
      name: item.name,
      sku: item.sku
    },
    previousQuantity: item.quantity,
    newQuantity: result.updatedItem.quantity,
    quantityRemoved: Math.floor(quantity),
    stockStatus: getStockStatus(result.updatedItem),
    movement: result.movement,
    alert: result.updatedItem.quantity <= result.updatedItem.reorderPoint ? 'LOW_STOCK' : null
  })
}

// Helper function to handle material usage recording
async function handleUsage(item: InventoryItem, quantity: number, order_id?: string, taskId?: string, reason?: string) {
  // Check sufficient stock
  if (item.quantity < Math.floor(quantity)) {
    return NextResponse.json({
      error: `Insufficient stock for usage. Available: ${item.quantity}, Requested: ${Math.floor(quantity)}`,
      currentStock: item.quantity
    }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create material usage record
    const usageRecord = await tx.materialUsage.create({
      data: {
        inventoryId: item.id,
        order_id: order_id || null,
        taskId: taskId || null,
        quantityUsed: quantity,
        unitCost: item.unitCost,
        totalCost: quantity * item.unitCost
      }
    })

    // Create corresponding stock movement
    await tx.stockMovement.create({
      data: {
        inventoryId: item.id,
        type: 'OUT',
        quantity: Math.floor(quantity),
        reason: reason || `Material usage ${order_id ? `for order ${order_id}` : ''}`.trim(),
        reference: order_id || taskId || `USAGE_${usageRecord.id}`
      }
    })

    // Update inventory quantity
    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: { decrement: Math.floor(quantity) },
        lastUpdated: new Date()
      }
    })

    return { usageRecord, updatedItem }
  })

  return NextResponse.json({
    success: true,
    action: 'usage',
    item: {
      id: item.id,
      name: item.name,
      sku: item.sku
    },
    previousQuantity: item.quantity,
    newQuantity: result.updatedItem.quantity,
    quantityUsed: quantity,
    totalCost: result.usageRecord.totalCost,
    stockStatus: getStockStatus(result.updatedItem),
    usageRecord: result.usageRecord,
    alert: result.updatedItem.quantity <= result.updatedItem.reorderPoint ? 'LOW_STOCK' : null
  })
}

// Helper function to determine stock status
function getStockStatus(item: InventoryItem): string {
  if (item.quantity === 0) {
    return 'OUT_OF_STOCK'
  } else if (item.quantity <= item.reorderPoint) {
    return 'LOW_STOCK'
  } else {
    return 'IN_STOCK'
  }
}

// GET /api/inventory/scan - Get scanning history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Get recent stock movements (as proxy for scan activity)
    const recentActivity = await prisma.stockMovement.findMany({
      where: {
        reason: {
          contains: 'scan'
        }
      },
      include: {
        inventory: {
          select: {
            name: true,
            sku: true,
            unit: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    })

    return NextResponse.json({
      recentActivity,
      count: recentActivity.length
    })

  } catch (_error) {
    console.error('Error fetching scan history:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}