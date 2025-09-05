import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventBus } from '@/lib/ash/event-bus'

/**
 * Create/Upload Design Version
 * POST /api/ash/designs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      order_id,
      name,
      method,
      files, // {mockup_url, prod_url, separations:[], dst_url?}
      placements, // [{area,width_cm,height_cm,offset_x,offset_y}]
      palette, // [...] 
      meta, // {dpi?, notes?}
      created_by
    } = body

    // Validate required fields
    if (!order_id || !name || !method || !files || !placements || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { brand: true }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if design asset exists for this order
    let designAsset = await prisma.designAsset.findFirst({
      where: { orderId: order_id }
    })

    let version = 1

    if (designAsset) {
      // Increment version
      version = designAsset.currentVersion + 1
      
      // Update asset
      designAsset = await prisma.designAsset.update({
        where: { id: designAsset.id },
        data: {
          currentVersion: version,
          name,
          method,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new design asset
      designAsset = await prisma.designAsset.create({
        data: {
          workspaceId: 'default',
          brandId: order.brandId,
          orderId: order_id,
          name,
          method,
          currentVersion: version,
          createdBy: created_by
        }
      })
    }

    // Create design version
    const _designVersion = await prisma.designVersion.create({
      data: {
        assetId: designAsset.id,
        version,
        files,
        placements,
        palette,
        meta,
        createdBy: created_by
      }
    })

    // Emit event for Ashley to run checks
    await EventBus.emit('ash.design.version.created', {
      design_asset_id: designAsset.id,
      version,
      method,
      order_id,
      brand_id: order.brandId,
      placements,
      files
    })

    return NextResponse.json({
      asset_id: designAsset.id,
      version,
      design_checks_initiated: true
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating design version:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get Design Assets
 * GET /api/ash/designs?order_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const brandId = searchParams.get('brand_id')

    const where: { orderId?: string; brandId?: string } = {}
    
    if (orderId) where.orderId = orderId
    if (brandId) where.brandId = brandId

    const designs = await prisma.designAsset.findMany({
      where,
      include: {
        brand: true,
        order: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1 // Latest version only for list
        },
        approvals: {
          where: {
            version: { // Only show approvals for current version
              equals: prisma.designAsset.fields.currentVersion
            }
          },
          include: {
            client: true
          }
        },
        designChecks: {
          where: {
            version: { // Only show checks for current version
              equals: prisma.designAsset.fields.currentVersion
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(designs)

  } catch (error) {
    console.error('Error fetching designs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}