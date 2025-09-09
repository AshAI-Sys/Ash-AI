import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/design/assets - Get all design assets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const method = searchParams.get('method')

    // Build where clause
    const where: any = {}
    
    if (orderId) {
      where.orderId = orderId
    }
    if (status) {
      where.status = status
    }
    if (method) {
      where.method = method
    }

    const assets = await prisma.designAsset.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            brand: { select: { name: true } },
            client: { select: { name: true } }
          }
        },
        created_by: {
          select: { name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Transform for API response
    const transformedAssets = assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      orderId: asset.orderId,
      orderNumber: asset.order?.orderNumber || '',
      brandName: asset.order?.brand?.name || '',
      clientName: asset.order?.client?.name || '',
      method: asset.method,
      status: asset.status,
      type: asset.type,
      fileUrl: asset.fileUrl,
      created_by: asset.createdBy?.name || 'Unknown',
      created_at: asset.createdAt,
      updated_at: asset.updatedAt
    }))

    return NextResponse.json({ assets: transformedAssets })

  } catch (_error) {
    console.error('Error fetching design assets:', _error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/design/assets - Create new design asset
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'orderId', 'method', 'type']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        fields: missingFields 
      }, { status: 400 })
    }

    // Create design asset
    const asset = await prisma.designAsset.create({
      data: {
        name: body.name,
        orderId: body.orderId,
        brandId: body.brandId,
        method: body.method,
        type: body.type || 'MOCKUP',
        fileUrl: body.fileUrl,
        status: 'DRAFT',
        placements: body.placements || [],
        palette: body.palette || [],
        meta: body.meta || {},
        createdById: session.user.id
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            brand: { select: { name: true } }
          }
        }
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'design.asset.created',
        entityType: 'design_asset',
        entityId: asset.id,
        payload: {
          assetName: asset.name,
          orderNumber: asset.order?.orderNumber,
          method: asset.method,
          type: asset.type
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_DESIGN_ASSET',
        entityType: 'DesignAsset',
        entityId: asset.id,
        details: `Created design asset "${asset.name}" for order ${asset.order?.orderNumber}`,
        metadata: {
          method: asset.method,
          type: asset.type
        }
      }
    })

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        status: asset.status,
        fileUrl: asset.fileUrl
      },
      message: `Design asset "${asset.name}" created successfully`
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating design asset:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}