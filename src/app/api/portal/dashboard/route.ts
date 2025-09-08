// Enhanced Client Portal Dashboard API
// Provides comprehensive dashboard data with AI-powered recommendations

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAshleyAIRecommendations } from '@/lib/ashley-ai'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client_id = searchParams.get('client_id')
    const workspace_id = searchParams.get('workspace_id')

    if (!client_id || !workspace_id) {
      return NextResponse.json(
        { error: 'client_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Verify client exists and has access to workspace
    const client = await db.client.findFirst({
      where: {
        id: client_id,
        workspace_id: workspace_id
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      )
    }

    // Get order statistics
    const orderStats = await db.order.aggregate({
      where: {
        client_id: client_id,
        workspace_id: workspace_id
      },
      _count: {
        id: true
      }
    })

    const activeOrders = await db.order.count({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        status: {
          in: ['INTAKE', 'DESIGN_PENDING', 'PRODUCTION_PLANNED', 'IN_PROGRESS', 'QC', 'PACKING']
        }
      }
    })

    const completedOrders = await db.order.count({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        status: {
          in: ['DELIVERED', 'COMPLETED']
        }
      }
    })

    const pendingApprovalOrders = await db.order.count({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        status: 'DESIGN_PENDING'
      }
    })

    // Get payment information
    const paymentStats = await db.order.aggregate({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        payment_status: {
          not: 'PAID'
        }
      },
      _sum: {
        total_value: true
      }
    })

    const overduePayments = await db.order.aggregate({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        payment_status: 'OVERDUE'
      },
      _sum: {
        total_value: true
      }
    })

    const thisMonthPayments = await db.order.aggregate({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        payment_status: 'PAID',
        updated_at: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: {
        total_value: true
      }
    })

    // Get recent orders with progress
    const recentOrders = await db.order.findMany({
      where: {
        client_id: client_id,
        workspace_id: workspace_id
      },
      include: {
        routing_steps: {
          select: {
            name: true,
            status: true,
            sequence: true
          },
          orderBy: {
            sequence: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 10
    })

    // Calculate progress for each order
    const ordersWithProgress = recentOrders.map(order => {
      const totalSteps = order.routing_steps.length
      const completedSteps = order.routing_steps.filter(step => 
        step.status === 'COMPLETED'
      ).length
      
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

      return {
        id: order.id,
        po_number: order.po_number,
        product_type: order.product_type,
        status: order.status,
        progress_percent: progressPercent,
        total_value: order.total_value || 0,
        target_delivery: order.target_delivery_date?.toISOString() || ''
      }
    })

    // Get Ashley AI recommendations for this client
    const aiRecommendations = await getAshleyAIRecommendations({
      client_id,
      workspace_id,
      context: 'CLIENT_PORTAL_RECOMMENDATIONS',
      order_history: recentOrders.map(order => ({
        product_type: order.product_type,
        method: order.method,
        total_value: order.total_value,
        created_at: order.created_at
      }))
    })

    // Get client notifications
    const notifications = await db.clientNotification.findMany({
      where: {
        client_id: client_id,
        workspace_id: workspace_id
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 20
    })

    // Build response
    const dashboardData = {
      orders: {
        total: orderStats._count.id,
        active: activeOrders,
        completed: completedOrders,
        pending_approval: pendingApprovalOrders
      },
      payments: {
        total_outstanding: paymentStats._sum.total_value || 0,
        overdue_amount: overduePayments._sum.total_value || 0,
        paid_this_month: thisMonthPayments._sum.total_value || 0
      },
      recent_orders: ordersWithProgress,
      recommended_products: aiRecommendations.product_recommendations || [
        {
          id: 'rec-1',
          name: 'Custom T-Shirts',
          description: 'Premium cotton tees with your design',
          base_price: 250.00,
          popularity_score: 4.8,
          estimated_days: 5
        },
        {
          id: 'rec-2',
          name: 'Hoodies & Sweatshirts',
          description: 'Comfortable hoodies for your team',
          base_price: 850.00,
          popularity_score: 4.6,
          estimated_days: 7
        },
        {
          id: 'rec-3',
          name: 'Corporate Uniforms',
          description: 'Professional uniforms with embroidery',
          base_price: 1200.00,
          popularity_score: 4.9,
          estimated_days: 10
        }
      ],
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        created_at: notif.created_at.toISOString(),
        is_read: notif.is_read
      })),
      ashley_insights: {
        reorder_suggestions: aiRecommendations.reorder_suggestions || [],
        spending_trends: aiRecommendations.spending_trends || {},
        next_recommended_action: aiRecommendations.next_action || null
      }
    }

    return NextResponse.json(dashboardData)

  } catch (_error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

// Helper function to get Ashley AI recommendations (placeholder implementation)
async function getAshleyAIRecommendations(params: any) {
  // This would integrate with actual Ashley AI service
  // For now, return mock recommendations
  return {
    product_recommendations: [
      {
        id: 'ai-rec-1',
        name: 'Best Seller: Premium Tees',
        description: 'Based on your previous orders, these are trending',
        base_price: 280.00,
        popularity_score: 4.9,
        estimated_days: 4
      }
    ],
    reorder_suggestions: [
      {
        product_type: 'T-Shirt',
        suggested_quantity: 100,
        confidence: 0.85,
        reason: 'Similar to your order from 3 months ago'
      }
    ],
    spending_trends: {
      monthly_average: 25000,
      trend_direction: 'increasing',
      savings_opportunity: 2500
    },
    next_action: {
      type: 'REORDER',
      message: 'Consider reordering your popular T-shirt design',
      confidence: 0.78
    }
  }
}