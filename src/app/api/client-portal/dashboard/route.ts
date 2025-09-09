/**
 * ASH AI - Client Portal Dashboard API
 * Client-specific dashboard data with order insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required for production')
}

/**
 * GET /api/client-portal/dashboard - Get client dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Verify client session
    const token = request.cookies.get('client-portal-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const clientId = decoded.clientId
    const workspaceId = decoded.workspaceId

    // Get client orders with detailed information
    const orders = await prisma.order.findMany({
      where: {
        client_id: clientId,
        workspace_id: workspaceId
      },
      include: {
        brand: {
          select: {
            name: true,
            code: true
          }
        },
        routing_steps: {
          select: {
            id: true,
            name: true,
            status: true,
            sequence: true,
            planned_start: true,
            planned_end: true,
            actual_start: true,
            actual_end: true
          },
          orderBy: {
            sequence: 'asc'
          }
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
          orderBy: {
            created_at: 'desc'
          },
          take: 3 // Latest 3 assets per order
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            due_at: true
          },
          where: {
            status: {
              not: 'COMPLETED'
            }
          }
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            scheduled_at: true,
            completed_at: true
          },
          orderBy: {
            scheduled_at: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Calculate order insights
    const orderInsights = calculateOrderInsights(orders)

    // Get recent design approvals needed
    const pendingDesignApprovals = await prisma.designAsset.findMany({
      where: {
        order: {
          client_id: clientId,
          workspace_id: workspaceId
        },
        approval_status: 'PENDING_CLIENT_APPROVAL'
      },
      include: {
        order: {
          select: {
            id: true,
            po_number: true,
            brand: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      },
      take: 10
    })

    // Get communication notifications
    const notifications = await getClientNotifications(clientId, workspaceId)

    // Get client preferences and settings
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        company: true,
        portal_settings: true
      }
    })

    return NextResponse.json({
      success: true,
      dashboard: {
        client: {
          name: client?.name,
          company: client?.company,
          settings: client?.portal_settings || {}
        },
        overview: {
          total_orders: orders.length,
          active_orders: orders.filter(o => !['DELIVERED', 'CLOSED', 'CANCELLED'].includes(o.status)).length,
          pending_approvals: pendingDesignApprovals.length,
          urgent_tasks: orders.reduce((sum, o) => sum + o.tasks.length, 0)
        },
        recent_orders: orders.slice(0, 8).map(order => ({
          id: order.id,
          po_number: order.po_number,
          brand: order.brand.name,
          status: order.status,
          product_type: order.product_type,
          total_qty: order.total_qty,
          target_delivery_date: order.target_delivery_date,
          created_at: order.created_at,
          progress_percentage: calculateOrderProgress(order.routing_steps),
          next_milestone: getNextMilestone(order),
          design_status: getDesignStatus(order.design_assets),
          delivery_info: order.deliveries[0] || null
        })),
        pending_approvals: pendingDesignApprovals.map(asset => ({
          id: asset.id,
          order_po: asset.order.po_number,
          brand: asset.order.brand.name,
          file_type: asset.type,
          version: asset.version,
          created_at: asset.created_at,
          order_id: asset.order.id
        })),
        insights: orderInsights,
        notifications: notifications.slice(0, 5), // Latest 5 notifications
        quick_actions: generateQuickActions(orders, pendingDesignApprovals)
      }
    })

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    console.error('Dashboard error:', _error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to load dashboard' 
    }, { status: 500 })
  }
}

// Helper functions
function calculateOrderProgress(routingSteps: any[]): number {
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

function getNextMilestone(order: any): string | null {
  const activeStep = order.routing_steps.find((step: any) => 
    step.status === 'IN_PROGRESS' || step.status === 'READY'
  )
  
  if (activeStep) {
    return activeStep.name
  }

  // Check if waiting for design approval
  const pendingDesigns = order.design_assets.filter((asset: any) => 
    asset.approval_status === 'PENDING_CLIENT_APPROVAL'
  )
  
  if (pendingDesigns.length > 0) {
    return 'Design Approval Required'
  }

  return null
}

function getDesignStatus(designAssets: any[]): string {
  if (designAssets.length === 0) return 'No designs uploaded'
  
  const statuses = designAssets.map(asset => asset.approval_status)
  
  if (statuses.includes('PENDING_CLIENT_APPROVAL')) {
    return 'Pending your approval'
  } else if (statuses.includes('APPROVED')) {
    return 'Approved'
  } else if (statuses.includes('REJECTED')) {
    return 'Revision needed'
  }
  
  return 'Under review'
}

function calculateOrderInsights(orders: any[]) {
  const insights = {
    avg_lead_time: 0,
    on_time_delivery_rate: 0,
    design_approval_time: 0,
    status_distribution: {} as Record<string, number>,
    delivery_performance: {
      on_time: 0,
      delayed: 0,
      early: 0
    }
  }

  if (orders.length === 0) return insights

  // Status distribution
  orders.forEach(order => {
    insights.status_distribution[order.status] = 
      (insights.status_distribution[order.status] || 0) + 1
  })

  // Calculate delivery performance for completed orders
  const completedOrders = orders.filter(o => o.status === 'DELIVERED')
  if (completedOrders.length > 0) {
    completedOrders.forEach(order => {
      const delivery = order.deliveries?.[0]
      if (delivery && delivery.completed_at) {
        const _targetDate = new Date(order.target_delivery_date)
        const actualDate = new Date(delivery.completed_at)
        const daysDiff = Math.floor((new Date(actualDate).getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 0) insights.delivery_performance.on_time++
        else if (daysDiff > 0) insights.delivery_performance.delayed++
        else insights.delivery_performance.early++
      }
    })

    insights.on_time_delivery_rate = Math.round(
      (insights.delivery_performance.on_time / completedOrders.length) * 100
    )
  }

  return insights
}

async function getClientNotifications(clientId: string, workspaceId: string) {
  // Get recent audit logs that might be relevant to the client
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      workspace_id: workspaceId,
      entity_type: 'order',
      entity_id: {
        in: await prisma.order.findMany({
          where: { client_id: clientId, workspace_id: workspaceId },
          select: { id: true }
        }).then(orders => orders.map(o => o.id))
      },
      action: {
        in: ['STATUS_CHANGE', 'DESIGN_UPLOAD', 'DELIVERY_SCHEDULED']
      },
      created_at: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 10
  })

  return recentLogs.map(log => ({
    id: log.id,
    type: log.action,
    message: generateNotificationMessage(log),
    created_at: log.created_at,
    order_id: log.entity_id
  }))
}

function generateNotificationMessage(log: any): string {
  switch (log.action) {
    case 'STATUS_CHANGE':
      return `Order status updated to ${log.after_data?.status || 'unknown'}`
    case 'DESIGN_UPLOAD':
      return 'New design uploaded for your review'
    case 'DELIVERY_SCHEDULED':
      return 'Delivery has been scheduled'
    default:
      return 'Order updated'
  }
}

function generateQuickActions(orders: any[], pendingApprovals: any[]) {
  const actions = []

  if (pendingApprovals.length > 0) {
    actions.push({
      type: 'approve_designs',
      title: 'Review Pending Designs',
      count: pendingApprovals.length,
      priority: 'high'
    })
  }

  const urgentOrders = orders.filter(o => {
    const deliveryDate = new Date(o.target_delivery_date)
    const daysUntilDelivery = Math.ceil((new Date(deliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilDelivery <= 7 && !['DELIVERED', 'CLOSED'].includes(o.status)
  })

  if (urgentOrders.length > 0) {
    actions.push({
      type: 'urgent_orders',
      title: 'Orders Delivering Soon',
      count: urgentOrders.length,
      priority: 'medium'
    })
  }

  const activeOrders = orders.filter(o => 
    ['IN_PROGRESS', 'QC', 'PACKING'].includes(o.status)
  )

  if (activeOrders.length > 0) {
    actions.push({
      type: 'track_orders',
      title: 'Track Active Orders',
      count: activeOrders.length,
      priority: 'low'
    })
  }

  return actions
}