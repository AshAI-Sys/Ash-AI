/**
 * ASH AI - Order Status Management API
 * Professional order status transitions with AI-powered validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { transitionOrderStatus, getValidTransitions } from '@/lib/ash/order-state-machine'

const transitionSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  reason: z.string().optional(),
  metadata: z.any().optional()
})

/**
 * GET /api/ash/orders/[id]/status - Get order status and valid transitions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const orderId = id

    // Get order with current status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        po_number: true,
        status: true,
        created_at: true,
        updated_at: true,
        brand: { select: { name: true, code: true } },
        client: { select: { name: true, company: true } },
        routing_steps: {
          select: {
            id: true,
            name: true,
            status: true,
            sequence: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get valid transitions for user's role
    const validTransitions = await getValidTransitions(orderId, session.user.role as Role)

    // Get status history
    const statusHistory = await prisma.auditLog.findMany({
      where: {
        entity_type: 'order',
        entity_id: orderId,
        action: 'STATUS_CHANGE'
      },
      select: {
        id: true,
        before_data: true,
        after_data: true,
        metadata: true,
        created_at: true,
        actor_id: true
      },
      orderBy: { created_at: 'desc' },
      take: 20
    })

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        progress_percentage: calculateProgressPercentage(order.routing_steps)
      },
      current_status: order.status,
      valid_transitions: validTransitions.map(t => ({
        action: t.action,
        to: t.to,
        description: t.description,
        required_role: t.requiredRole
      })),
      status_history: statusHistory
    })

  } catch (error) {
    console.error('Error fetching order status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ash/orders/[id]/status - Transition order status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const orderId = id
    const body = await request.json()

    // Validate input
    const validatedData = transitionSchema.parse(body)

    // Perform status transition
    const result = await transitionOrderStatus(orderId, validatedData.action, {
      userId: session.user.id,
      userRole: session.user.role as Role,
      reason: validatedData.reason,
      metadata: validatedData.metadata
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message,
        blocked_by: result.blockedBy,
        warnings: result.warnings
      }, { status: result.blockedBy ? 422 : 400 })
    }

    // Get updated order info
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        po_number: true,
        status: true,
        updated_at: true
      }
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      order: updatedOrder,
      new_status: result.newStatus
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error transitioning order status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to transition order status'
    }, { status: 500 })
  }
}

// Helper function to calculate progress
function calculateProgressPercentage(routingSteps: any[]): number {
  if (routingSteps.length === 0) return 0
  
  const statusWeights = {
    'PLANNED': 0,
    'READY': 25,
    'IN_PROGRESS': 75,
    'DONE': 100,
    'BLOCKED': 0
  }

  const totalProgress = routingSteps.reduce((sum, step) => {
    return sum + (statusWeights[step.status as keyof typeof statusWeights] || 0)
  }, 0)

  return Math.round(totalProgress / routingSteps.length)
}