// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// POST /api/client-portal/orders/[order_id]/request-revision - Request design revision
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
    const order_id = orderId
    const body = await request.json()

    // Validate required fields
    if (!body.comments || body.comments.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Revision comments are required' 
      }, { status: 400 })
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        routing_steps: true,
        client: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status to revision requested
    await prisma.order.update({
      where: { id: order_id },
      data: {
        status: 'DESIGN_REVISION'
      }
    })

    // Reset design approval routing step if exists
    const designStep = order.routing_steps.find(step => 
      step.name.toLowerCase().includes('design') || 
      step.name.toLowerCase().includes('approval')
    )

    if (designStep) {
      await prisma.routingStep.update({
        where: { id: designStep.id },
        data: {
          status: 'OPEN'
        }
      })
    }

    // Create tracking update
    await prisma.trackingUpdate.create({
      data: {
        order_id,
        stage: 'Design Revision',
        status: 'OPEN',
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
        status: 'OPEN',
        assignedToRole: 'GRAPHIC_ARTIST',
        entityType: 'order',
        entityId: order_id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdById: session.user.id
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'client.design.revision_requested',
        entityType: 'order',
        entityId: order_id,
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
        user_id: session.user.id,
        action: 'REQUEST_DESIGN_REVISION',
        entityType: 'Order',
        entityId: order_id,
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
    console.error('Error requesting design revision:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: _error instanceof Error ? _error.message : 'Unknown error'
    }, { status: 500 })
  }
}