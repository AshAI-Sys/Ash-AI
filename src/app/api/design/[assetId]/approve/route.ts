import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// POST /api/design/[assetId]/approve - Approve design asset
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = await params
    const body = await request.json()

    // Find the design asset
    const asset = await prisma.designAsset.findUnique({
      where: { id: assetId },
      include: {
        order: {
          select: {
            orderNumber: true,
            clientId: true,
            client: { select: { name: true } }
          }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Design asset not found' }, { status: 404 })
    }

    // Update asset status to approved
    const updatedAsset = await prisma.designAsset.update({
      where: { id: assetId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: session.user.id
      }
    })

    // Create approval record
    await prisma.designApproval.create({
      data: {
        assetId: assetId,
        status: 'APPROVED',
        approverUserId: session.user.id,
        approverName: session.user.name || 'Client',
        comments: body.comments || '',
        approvedAt: new Date()
      }
    })

    // Update order status if needed
    if (asset.order) {
      await prisma.order.update({
        where: { id: asset.orderId },
        data: {
          status: 'DESIGN_APPROVED'
        }
      })
    }

    // Create tracking update
    await prisma.trackingUpdate.create({
      data: {
        orderId: asset.orderId,
        stage: 'Design Approval',
        status: 'COMPLETED',
        message: body.comments ? 
          `Design "${asset.name}" approved. Comments: ${body.comments}` : 
          `Design "${asset.name}" approved by client.`,
        operator: session.user.name || 'Client',
        timestamp: new Date()
      }
    })

    // Create task for production planning
    await prisma.task.create({
      data: {
        title: `Production Planning - ${asset.order?.orderNumber}`,
        description: `Design approved for order ${asset.order?.orderNumber}. Ready for production planning.`,
        type: 'PRODUCTION_PLANNING',
        priority: 'MEDIUM',
        status: 'PENDING',
        assignedToRole: 'PRODUCTION_MANAGER',
        entityType: 'design_asset',
        entityId: assetId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        createdById: session.user.id
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'design.approved',
        entityType: 'design_asset',
        entityId: assetId,
        payload: {
          assetName: asset.name,
          orderNumber: asset.order?.orderNumber,
          approverName: session.user.name,
          comments: body.comments,
          method: asset.method
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'APPROVE_DESIGN',
        entityType: 'DesignAsset',
        entityId: assetId,
        details: `Approved design "${asset.name}" for order ${asset.order?.orderNumber}`,
        metadata: {
          comments: body.comments,
          method: asset.method
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Design "${asset.name}" approved successfully. Production planning initiated.`,
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        status: updatedAsset.status,
        approvedAt: updatedAsset.approvedAt
      }
    })

  } catch (_error) {
    console.error('Error approving design:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}