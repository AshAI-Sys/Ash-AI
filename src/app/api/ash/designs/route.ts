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
      where: { order_id: order_id }
    })

    let version = 1

    if (designAsset) {
      // Increment version
      version = designAsset.version + 1
      
      // Update asset
      designAsset = await prisma.designAsset.update({
        where: { id: designAsset.id },
        data: {
          version: version,
          // name,
          // method,
          updated_at: new Date()
        }
      })
    } else {
      // Create new design asset
      designAsset = await prisma.designAsset.create({
        data: {
          order_id: order_id,
          file_name: name,
          version: version,
          type: method,
          file_url: ''
        }
      })
    }

    // Create design version
    const _designVersion = await prisma.designRevision.create({
      data: {
        design_asset_id: designAsset.id,
        revision_notes: `Version ${version} created`,
        changes_made: {
          files,
          placements,
          palette,
          meta
        },
        revised_by: created_by
      }
    })

    // Emit event for Ashley to run checks
    await EventBus.emit('ash.design.version.created', {
      design_asset_id: designAsset.id,
      version,
      method,
      order_id,
      brand_id: order.brand_id,
      placements,
      files
    })

    return NextResponse.json({
      asset_id: designAsset.id,
      version,
      design_checks_initiated: true
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating design version:', _error)
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
    const order_id = searchParams.get('order_id')
    const brand_id = searchParams.get('brand_id')

    const where: { order_id?: string; brand_id?: string } = {}
    
    if (order_id) where.order_id = order_id
    if (brand_id) where.brand_id = brand_id

    const designs = await prisma.designAsset.findMany({
      where,
      include: {
        // brand: true,
        // order: true,
        revisions: {
          orderBy: { revised_at: 'desc' },
          take: 1 // Latest version only for list
        },
        approvals: {
          include: {
            client: true
          }
        },
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(designs)

  } catch (_error) {
    console.error('Error fetching designs:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}