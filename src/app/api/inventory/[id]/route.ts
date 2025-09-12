// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/inventory/[id] - Get specific inventory item with history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: (await params).id },
      include: {
        brand: {
          select: { id: true, name: true, code: true }
        },
        stockMovements: {
          orderBy: { created_at: 'desc' },
          take: 50
        },
        usageRecords: {
          orderBy: { usedAt: 'desc' },
          take: 50
        },
        purchaseItems: {
          include: {
            purchaseOrder: {
              select: {
                po_number: true,
                status: true,
                created_at: true,
                vendor: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { purchaseOrder: { created_at: 'desc' } },
          take: 10
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Calculate usage statistics
    const usageStats = {
      totalUsed: item.usageRecords.reduce((sum, record) => sum + record.quantityUsed, 0),
      avgUsagePerMonth: 0,
      topProjects: await prisma.materialUsage.groupBy({
        by: ['order_id'],
        where: {
          inventoryId: id,
          order_id: { not: null }
        },
        _sum: { quantityUsed: true },
        orderBy: { _sum: { quantityUsed: 'desc' } },
        take: 5
      })
    }

    // Calculate monthly usage for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentUsage = await prisma.materialUsage.aggregate({
      where: {
        inventoryId: id,
        usedAt: { gte: thirtyDaysAgo }
      },
      _sum: { quantityUsed: true }
    })

    usageStats.avgUsagePerMonth = (recentUsage._sum.quantityUsed || 0)

    return NextResponse.json({
      item,
      usageStats,
      stockHistory: item.stockMovements,
      usageHistory: item.usageRecords,
      purchaseHistory: item.purchaseItems
    })

  } catch (_error) {
    console.error('Error fetching inventory item:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/inventory/[id] - Update inventory item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin, manager, and warehouse staff can update inventory
    const canManageInventory = [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF].includes(session.user.role)
    if (!canManageInventory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      category,
      unitCost,
      reorderPoint,
      location,
      barcode,
      qrCode,
      brand_id
    } = body

    const { id } = await params
    
    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Validate brand if provided
    if (brand_id) {
      const brand = await prisma.brand.findUnique({
        where: { id: brand_id }
      })
      if (!brand) {
        return NextResponse.json(
          { error: 'Brand not found' },
          { status: 404 }
        )
      }
    }

    // Update item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unitCost !== undefined && { unitCost: parseFloat(unitCost) }),
        ...(reorderPoint !== undefined && { reorderPoint: parseInt(reorderPoint) }),
        ...(location !== undefined && { location }),
        ...(barcode !== undefined && { barcode }),
        ...(qrCode !== undefined && { qrCode }),
        ...(brand_id !== undefined && { brand_id }),
        lastUpdated: new Date()
      },
      include: {
        brand: {
          select: { id: true, name: true, code: true }
        }
      }
    })

    return NextResponse.json({
      message: 'Inventory item updated successfully',
      item: updatedItem
    })

  } catch (_error) {
    console.error('Error updating inventory item:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/[id] - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and manager can delete inventory items
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    
    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockMovements: true,
            usageRecords: true,
            purchaseItems: true
          }
        }
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if item has been used (has movement/usage history)
    const hasHistory = existingItem._count.stockMovements > 0 || 
                      existingItem._count.usageRecords > 0 || 
                      existingItem._count.purchaseItems > 0

    if (hasHistory) {
      return NextResponse.json(
        { error: 'Cannot delete item with transaction history. Consider marking as inactive instead.' },
        { status: 400 }
      )
    }

    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Inventory item deleted successfully'
    })

  } catch (_error) {
    console.error('Error deleting inventory item:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}