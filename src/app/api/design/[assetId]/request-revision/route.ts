import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// POST /api/design/[assetId]/request-revision - Request design revision
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

    // Validate required fields
    if (!body.comments || body.comments.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Revision comments are required' 
      }, { status: 400 })
    }

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
        },
        createdBy: {
          select: { name: true, id: true }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Design asset not found' }, { status: 404 })
    }

    // Update asset status to revision requested
    const updatedAsset = await prisma.designAsset.update({
      where: { id: assetId },
      data: {
        status: 'REVISION_REQUESTED'
      }
    })

    // Create approval record for revision request
    await prisma.designApproval.create({
      data: {
        assetId: assetId,
        status: 'CHANGES_REQUESTED',
        approverUserId: session.user.id,
        approverName: session.user.name || 'Client',
        comments: body.comments,
        requestedAt: new Date()
      }
    })

    // Create tracking update
    await prisma.trackingUpdate.create({
      data: {
        orderId: asset.orderId,
        stage: 'Design Revision',
        status: 'PENDING',
        message: `Client requested design revision: ${body.comments}`,
        operator: session.user.name || 'Client',
        timestamp: new Date()
      }
    })

    // Create task for graphic artist
    await prisma.task.create({
      data: {
        title: `Design Revision Required - ${asset.order?.orderNumber}`,
        description: `Client has requested design revisions for "${asset.name}".\n\nClient Comments: ${body.comments}`,
        type: 'DESIGN_REVISION',
        priority: body.urgency || 'MEDIUM',
        status: 'PENDING',
        assignedToRole: 'GRAPHIC_ARTIST',
        assignedToUserId: asset.createdBy?.id,
        entityType: 'design_asset',
        entityId: assetId,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdById: session.user.id
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'design.revision_requested',
        entityType: 'design_asset',
        entityId: assetId,
        payload: {
          assetName: asset.name,
          orderNumber: asset.order?.orderNumber,
          requesterName: session.user.name,
          comments: body.comments,
          urgency: body.urgency,
          method: asset.method
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REQUEST_DESIGN_REVISION',
        entityType: 'DesignAsset',
        entityId: assetId,
        details: `Requested design revision for "${asset.name}" - ${asset.order?.orderNumber}`,
        metadata: {
          comments: body.comments,
          urgency: body.urgency,
          method: asset.method
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Design revision requested successfully. ${asset.createdBy?.name || 'The designer'} will be notified.`,
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        status: updatedAsset.status
      }
    })

  } catch (error) {
    console.error('Error requesting design revision:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}