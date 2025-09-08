/**
 * ASH AI - Individual Order API
 * Fetch detailed order information with AI insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

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

    const { id: orderId } = await params

    // Get detailed order information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
            portal_access: true
          }
        },
        created_by: {
          select: {
            id: true,
            full_name: true,
            email: true
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
            actual_start: true,
            actual_end: true,
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
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            assigned_to: true,
            due_at: true,
            assignee: {
              select: {
                full_name: true
              }
            }
          },
          where: {
            status: {
              not: 'COMPLETED'
            }
          }
        },
        qc_records: {
          select: {
            id: true,
            passed: true,
            passed_qty: true,
            rejected_qty: true,
            created_at: true,
            inspector: {
              select: {
                full_name: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            scheduled_at: true,
            completed_at: true,
            vehicle: {
              select: {
                plate: true,
                type: true
              }
            }
          },
          orderBy: { scheduled_at: 'desc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Role-based access control
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      // Check if user has access to this order
      const hasAccess = order.created_by_id === session.user.id ||
                       order.routing_steps.some(step => 
                         step.tasks?.some(task => task.assigned_to === session.user.id)
                       )
      
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
      active_tasks_count: order.tasks.length,
      completed_routing_steps: order.routing_steps.filter(s => s.status === 'DONE').length,
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
    console.error('Error fetching order details:', error)
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
    if (![Role.ADMIN, Role.MANAGER, Role.CSR].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: orderId } = await params
    const body = await request.json()

    // Get existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
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
        entity_id: orderId,
        action: 'UPDATE',
        before_data: existingOrder,
        after_data: updatedOrder,
        metadata: {
          fields_updated: Object.keys(body),
          source: 'order_details_api'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    })

  } catch (_error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// Helper functions
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

function calculateEstimatedCompletion(order: any): Date {
  // Simple estimation based on remaining steps and current progress
  const now = new Date()
  const remainingSteps = order.routing_steps.filter((step: any) => step.status !== 'DONE').length
  const daysPerStep = 1.5 // Average days per step
  
  return new Date(new Date(now).getTime() + remainingSteps * daysPerStep * 24 * 60 * 60 * 1000)
}