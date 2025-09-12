// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import InventoryMonitor from '@/lib/realtime/inventory-monitor'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for inventory access
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'WAREHOUSE', 'WAREHOUSE_STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const sku = searchParams.get('sku')
    const summary = searchParams.get('summary') === 'true'
    const movements = searchParams.get('movements') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const monitor = InventoryMonitor.getInstance()

    if (summary) {
      // Get inventory summary
      const inventorySummary = await monitor.getInventorySummary()
      
      return NextResponse.json({
        success: true,
        data: {
          summary: inventorySummary,
          timestamp: new Date().toISOString()
        }
      })
    }

    if (itemId) {
      if (movements) {
        // Get stock movements for specific item
        const stockMovements = await monitor.getStockMovements(itemId, limit)
        
        return NextResponse.json({
          success: true,
          data: {
            itemId,
            movements: stockMovements,
            count: stockMovements.length,
            timestamp: new Date().toISOString()
          }
        })
      } else {
        // Get specific item status
        const itemStatus = await monitor.getInventoryStatus(itemId)
        
        if (!itemStatus) {
          return NextResponse.json(
            { error: 'Item not found or not monitored' }, 
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            item: itemStatus,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    if (sku) {
      // Find item by SKU and return status
      const allItems = await monitor.getAllInventoryStatuses()
      const item = allItems.find(item => item.sku === sku)
      
      if (!item) {
        return NextResponse.json(
          { error: 'Item with SKU not found' }, 
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          item,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Get all inventory statuses
    const allInventory = await monitor.getAllInventoryStatuses()
    
    // Apply filters if provided
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const outOfStock = searchParams.get('outOfStock') === 'true'
    
    let filteredInventory = allInventory
    
    if (category) {
      filteredInventory = filteredInventory.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      )
    }
    
    if (lowStock) {
      filteredInventory = filteredInventory.filter(item => 
        item.currentStock <= item.reorderPoint && item.currentStock > 0
      )
    }
    
    if (outOfStock) {
      filteredInventory = filteredInventory.filter(item => 
        item.currentStock <= 0
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        inventory: filteredInventory,
        count: filteredInventory.length,
        filters: { category, lowStock, outOfStock },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in inventory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for inventory operations
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'WAREHOUSE', 'WAREHOUSE_STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, itemId, data } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' }, 
        { status: 400 }
      )
    }

    const monitor = InventoryMonitor.getInstance()
    const operatorId = session.user.id

    switch (action) {
      case 'adjust_stock':
        const { quantity: adjustQuantity, reason: adjustReason } = data
        
        if (typeof adjustQuantity !== 'number' || !adjustReason) {
          return NextResponse.json(
            { error: 'Quantity (number) and reason are required for stock adjustment' }, 
            { status: 400 }
          )
        }
        
        const adjustmentId = await monitor.adjustStock(itemId, adjustQuantity, adjustReason, operatorId)
        
        return NextResponse.json({
          success: true,
          data: {
            movementId: adjustmentId,
            message: `Stock adjusted by ${adjustQuantity} units`,
            timestamp: new Date().toISOString()
          }
        })

      case 'transfer_stock':
        const { quantity: transferQuantity, fromLocation, toLocation } = data
        
        if (typeof transferQuantity !== 'number' || !fromLocation || !toLocation) {
          return NextResponse.json(
            { error: 'Quantity (number), fromLocation, and toLocation are required for stock transfer' }, 
            { status: 400 }
          )
        }
        
        const transferId = await monitor.transferStock(itemId, transferQuantity, fromLocation, toLocation, operatorId)
        
        return NextResponse.json({
          success: true,
          data: {
            movementId: transferId,
            message: `${transferQuantity} units transferred from ${fromLocation} to ${toLocation}`,
            timestamp: new Date().toISOString()
          }
        })

      case 'receive_stock':
        const { quantity: receiveQuantity, batchNumber, cost } = data
        
        if (typeof receiveQuantity !== 'number' || !batchNumber || typeof cost !== 'number') {
          return NextResponse.json(
            { error: 'Quantity (number), batchNumber, and cost (number) are required for stock receipt' }, 
            { status: 400 }
          )
        }
        
        const receiptId = await monitor.receiveStock(itemId, receiveQuantity, batchNumber, cost, operatorId)
        
        return NextResponse.json({
          success: true,
          data: {
            movementId: receiptId,
            message: `${receiveQuantity} units received (batch: ${batchNumber})`,
            timestamp: new Date().toISOString()
          }
        })

      case 'consume_stock':
        const { quantity: consumeQuantity, orderId } = data
        
        if (typeof consumeQuantity !== 'number' || !orderId) {
          return NextResponse.json(
            { error: 'Quantity (number) and orderId are required for stock consumption' }, 
            { status: 400 }
          )
        }
        
        const consumptionId = await monitor.consumeStock(itemId, consumeQuantity, orderId, operatorId)
        
        return NextResponse.json({
          success: true,
          data: {
            movementId: consumptionId,
            message: `${consumeQuantity} units consumed for order ${orderId}`,
            timestamp: new Date().toISOString()
          }
        })

      case 'start_monitoring':
        monitor.startMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'Inventory monitoring started',
          timestamp: new Date().toISOString()
        })

      case 'stop_monitoring':
        monitor.stopMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'Inventory monitoring stopped',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in inventory POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}