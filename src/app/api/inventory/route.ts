import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, Prisma } from '@prisma/client'

// GET /api/inventory - Fetch inventory items with filtering and search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const brandId = searchParams.get('brandId')
    const stockLevel = searchParams.get('stockLevel') // 'low', 'out', 'all'
    const location = searchParams.get('location')

    // Build where clause
    const where: Prisma.InventoryItemWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category && category !== 'all') {
      where.category = category
    }

    if (brandId && brandId !== 'all') {
      where.brandId = brandId
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

    // Get inventory items
    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          brand: {
            select: { id: true, name: true, code: true }
          },
          stockMovements: {
            orderBy: { created_at: 'desc' },
            take: 5
          },
          usageRecords: {
            orderBy: { usedAt: 'desc' },
            take: 5
          },
          _count: {
            select: {
              stockMovements: true,
              usageRecords: true
            }
          }
        },
        orderBy: { lastUpdated: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.inventoryItem.count({ where })
    ])

    // Apply stock level filter (after fetching to use computed values)
    let filteredItems = items
    if (stockLevel === 'low') {
      filteredItems = items.filter(item => item.quantity <= item.reorderPoint && item.quantity > 0)
    } else if (stockLevel === 'out') {
      filteredItems = items.filter(item => item.quantity === 0)
    }

    // Calculate statistics
    const stats = {
      totalItems: items.length,
      lowStockItems: items.filter(item => item.quantity <= item.reorderPoint && item.quantity > 0).length,
      outOfStockItems: items.filter(item => item.quantity === 0).length,
      totalValue: items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
      categories: await prisma.inventoryItem.groupBy({
        by: ['category'],
        _count: { category: true }
      }),
      recentMovements: await prisma.stockMovement.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          inventory: {
            select: { name: true, sku: true }
          }
        }
      })
    }

    return NextResponse.json({
      items: filteredItems,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (_error) {
    console.error('Error fetching inventory:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin, manager, and warehouse staff can create inventory items
    const canManageInventory = [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF].includes(session.user.role)
    if (!canManageInventory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      sku,
      category,
      brandId,
      quantity = 0,
      unit,
      unitCost,
      reorderPoint,
      location,
      barcode,
      qrCode,
      initialQuantity
    } = body

    // Validate required fields
    if (!name || !sku || !category || !unit || unitCost === undefined) {
      return NextResponse.json(
        { error: 'Name, SKU, category, unit, and unit cost are required' },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const existingSku = await prisma.inventoryItem.findUnique({
      where: { sku }
    })
    if (existingSku) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 409 }
      )
    }

    // Validate brand if provided
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId }
      })
      if (!brand) {
        return NextResponse.json(
          { error: 'Brand not found' },
          { status: 404 }
        )
      }
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        sku: sku.toUpperCase(),
        category,
        brandId: brandId || null,
        quantity: parseInt(quantity),
        unit,
        unitCost: parseFloat(unitCost),
        reorderPoint: parseInt(reorderPoint) || 0,
        location: location || '',
        barcode: barcode || null,
        qrCode: qrCode || null
      },
      include: {
        brand: {
          select: { id: true, name: true, code: true }
        }
      }
    })

    // Create initial stock movement if quantity > 0
    if (initialQuantity && parseInt(initialQuantity) > 0) {
      await prisma.stockMovement.create({
        data: {
          inventoryId: item.id,
          type: 'IN',
          quantity: parseInt(initialQuantity),
          reason: 'Initial stock',
          reference: 'INITIAL_STOCK'
        }
      })
    }

    return NextResponse.json({
      message: 'Inventory item created successfully',
      item
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating inventory item:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory - Bulk update inventory (for imports)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and manager can bulk update
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { items = [] } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    // Process bulk update
    const results = {
      created: 0,
      updated: 0,
      errors: []
    }

    for (const itemData of items) {
      try {
        const { sku, ...data } = itemData

        if (!sku) {
          results.errors.push('SKU is required for all items')
          continue
        }

        // Try to update existing item
        const existing = await prisma.inventoryItem.findUnique({
          where: { sku: sku.toUpperCase() }
        })

        if (existing) {
          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: {
              ...data,
              lastUpdated: new Date()
            }
          })
          results.updated++
        } else {
          await prisma.inventoryItem.create({
            data: {
              ...data,
              sku: sku.toUpperCase()
            }
          })
          results.created++
        }

      } catch (itemError) {
        results.errors.push(`Error processing item ${itemData.sku}: ${itemError}`)
      }
    }

    return NextResponse.json({
      message: 'Bulk update completed',
      results
    })

  } catch (_error) {
    console.error('Error in bulk update:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}