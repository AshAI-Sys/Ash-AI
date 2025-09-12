// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// POST /api/client-portal/orders/[order_id]/approve-design - Approve design for order
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

    // Update order status to approved
    await prisma.order.update({
      where: { id: order_id },
      data: {
        status: 'DESIGN_APPROVED'
      }
    })

    // Update design approval routing step if exists
    const designStep = order.routing_steps.find(step => 
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
        order_id,
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
        entityId: order_id,
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
        user_id: session.user.id,
        action: 'APPROVE_DESIGN',
        entityType: 'Order',
        entityId: order_id,
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

  } catch (_error) {
    console.error('Error approving design:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: _error instanceof Error ? _error.message : 'Unknown error'
    }, { status: 500 })
  }
}