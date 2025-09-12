// @ts-nocheck
/**
 * ASH AI - Individual Order API
 * Fetch detailed order information with AI insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/ash/orders/[id] - Get detailed order information
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

    const { id: order_id } = await params

    // Get detailed order information
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            emails: true,
            phones: true,
            // portal_access: true // This field doesn't exist
          }
        },
        routing_steps: {
          select: {
            id: true,
            name: true,
            workcenter: true,
            sequence: true,
            status: true,
            planned_start: true,
            planned_end: true,
            standard_spec: true
          },
          orderBy: { sequence: 'asc' }
        },
        design_assets: {
          select: {
            id: true,
            version: true,
            type: true,
            file_name: true,
            approval_status: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' }
        },
        // tasks don't have direct relation to orders - removing this include
        qc_inspections: {
          select: {
            id: true,
            status: true,
            passed_qty: true,
            rejected_qty: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' }
        },
        shipments: {
          select: {
            id: true,
            status: true,
            delivery_method: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Role-based access control
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      // Check if user has access to this order
      const hasAccess = order.created_by === session.user.id
                       // Tasks don't have direct relation to orders
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Calculate additional insights
    const insights = {
      progress_percentage: calculateProgressPercentage(order.routing_steps),
      estimated_completion: calculateEstimatedCompletion(order),
      days_since_created: Math.floor(
        (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
      is_overdue: order.target_delivery_date < new Date(),
      active_tasks_count: 0, // Tasks don't have direct relation to orders
      completed_routing_steps: order.routing_steps.filter((s: any) => s.status === 'DONE').length,
      total_routing_steps: order.routing_steps.length
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        insights
      }
    })

  } catch (_error) {
    console.error('Error fetching order details:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/ash/orders/[id] - Update order information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only certain roles can update orders
    const allowedRoles = ['ADMIN', 'MANAGER', 'CSR'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: order_id } = await params
    const body = await request.json()

    // Get existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id: order_id }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: order_id },
      data: {
        ...body,
        updated_at: new Date()
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        workspace_id: existingOrder.workspace_id,
        actor_id: session.user.id,
        entity_type: 'order',
        entity_id: order_id,
        action: 'UPDATE',
        before_data: existingOrder,
        after_data: updatedOrder
        // metadata field doesn't exist in AuditLog model
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    })

  } catch (_error) {
    console.error('Error updating order:', _error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateProgressPercentage(routing_steps: any[]): number {
  if (routing_steps.length === 0) return 0
  
  const statusWeights = {
    'PLANNED': 0,
    'READY': 25,
    'IN_PROGRESS': 75,
    'DONE': 100,
    'BLOCKED': 0
  }

  const totalProgress = routing_steps.reduce((sum: number, step: any) => {
    return sum + (statusWeights[step.status as keyof typeof statusWeights] || 0)
  }, 0)

  return Math.round(totalProgress / routing_steps.length)
}

function calculateEstimatedCompletion(order: any): Date {
  // Simple estimation based on remaining steps and current progress
  const now = new Date()
  const remainingSteps = order.routing_steps.filter((step: any) => step.status !== 'DONE').length
  const daysPerStep = 1.5 // Average days per step
  
  return new Date(new Date(now).getTime() + remainingSteps * daysPerStep * 24 * 60 * 60 * 1000)
}