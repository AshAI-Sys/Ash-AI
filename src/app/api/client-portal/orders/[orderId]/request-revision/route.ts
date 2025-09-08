import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// POST /api/client-portal/orders/[orderId]/request-revision - Request design revision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.comments || body.comments.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Revision comments are required' 
      }, { status: 400 })
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        routingSteps: true,
        client: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status to revision requested
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DESIGN_REVISION'
      }
    })

    // Reset design approval routing step if exists
    const designStep = order.routingSteps.find(step => 
      step.name.toLowerCase().includes('design') || 
      step.name.toLowerCase().includes('approval')
    )

    if (designStep) {
      await prisma.routingStep.update({
        where: { id: designStep.id },
        data: {
          status: 'PENDING'
        }
      })
    }

    // Create tracking update
    await prisma.trackingUpdate.create({
      data: {
        orderId,
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
        title: `Design Revision Required - ${order.orderNumber}`,
        description: `Client has requested design revisions for order ${order.orderNumber}.\n\nClient Comments: ${body.comments}`,
        type: 'DESIGN_REVISION',
        priority: body.urgency || 'MEDIUM',
        status: 'PENDING',
        assignedToRole: 'GRAPHIC_ARTIST',
        entityType: 'order',
        entityId: orderId,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdById: session.user.id
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'client.design.revision_requested',
        entityType: 'order',
        entityId: orderId,
        payload: {
          orderNumber: order.orderNumber,
          revisionComments: body.comments,
          urgency: body.urgency,
          requestedBy: session.user.id
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REQUEST_DESIGN_REVISION',
        entityType: 'Order',
        entityId: orderId,
        details: `Client requested design revision for order ${order.orderNumber}`,
        metadata: {
          orderNumber: order.orderNumber,
          comments: body.comments,
          urgency: body.urgency
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Design revision requested successfully. Our design team will contact you shortly.',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: 'DESIGN_REVISION'
      }
    })

  } catch (_error) {
    console.error('Error requesting design revision:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}