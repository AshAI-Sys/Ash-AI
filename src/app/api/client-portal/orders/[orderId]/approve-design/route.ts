import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// POST /api/client-portal/orders/[orderId]/approve-design - Approve design for order
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

    // Update order status to approved
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DESIGN_APPROVED'
      }
    })

    // Update design approval routing step if exists
    const designStep = order.routingSteps.find(step => 
      step.name.toLowerCase().includes('design') || 
      step.name.toLowerCase().includes('approval')
    )

    if (designStep) {
      await prisma.routingStep.update({
        where: { id: designStep.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedById: session.user.id
        }
      })
    }

    // Create tracking update
    await prisma.trackingUpdate.create({
      data: {
        orderId,
        stage: 'Design Approval',
        status: 'COMPLETED',
        message: body.comments ? 
          `Design approved by client. Comments: ${body.comments}` : 
          'Design approved by client.',
        operator: session.user.name || 'Client',
        timestamp: new Date()
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'client.design.approved',
        entityType: 'order',
        entityId: orderId,
        payload: {
          orderNumber: order.orderNumber,
          clientComments: body.comments,
          approvedBy: session.user.id
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'APPROVE_DESIGN',
        entityType: 'Order',
        entityId: orderId,
        details: `Client approved design for order ${order.orderNumber}`,
        metadata: {
          orderNumber: order.orderNumber,
          comments: body.comments
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Design approved successfully. Production will begin shortly.',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: 'DESIGN_APPROVED'
      }
    })

  } catch (error) {
    console.error('Error approving design:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}