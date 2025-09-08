import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIInsight } from '@/lib/ai'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get insights based on user role
    const insights: AIInsight[] = []

    if (session.user.role === 'ADMIN' || session.user.role === 'MANAGER') {
      // Mock insights for demo - in production, use aiService
      const mockInsights = [
        {
          id: 'assignment-001',
          type: 'ASSIGNMENT' as const,
          title: 'Optimal Task Assignment Available',
          description: 'Maria Santos would be 87% more efficient on cutting tasks based on her skill profile and current workload.',
          data: { taskId: 'TASK-001', suggestedAssignee: 'maria-santos', confidence: 0.87 },
          createdAt: new Date(),
          priority: 'HIGH' as const
        },
        {
          id: 'inventory-001',
          type: 'INVENTORY' as const,
          title: 'Restock Recommendation',
          description: 'Cotton fabric (white) will run out in 3 days. Current orders require 200kg but only 50kg in stock.',
          data: { action: 'RESTOCK', itemId: 'cotton-white', quantity: 200, priority: 'HIGH' },
          createdAt: new Date(),
          priority: 'HIGH' as const
        },
        {
          id: 'forecast-001',
          type: 'FORECAST' as const,
          title: 'Delivery Risk Detected',
          description: 'Order #045 has 78% chance of delay due to cutting stage bottleneck. Consider reallocating resources.',
          data: { orderId: 'ORD-045', estimatedDelay: 2, confidence: 0.78 },
          createdAt: new Date(),
          priority: 'MEDIUM' as const
        },
        {
          id: 'pricing-001',
          type: 'PRICING' as const,
          title: 'Price Optimization Available',
          description: 'Custom t-shirt pricing can be increased by ₱45 per unit based on market analysis and material costs.',
          data: { currentPrice: 350, suggestedPrice: 395, confidence: 0.87 },
          createdAt: new Date(),
          priority: 'MEDIUM' as const
        },
        {
          id: 'anomaly-001',
          type: 'ANOMALY' as const,
          title: 'Quality Issue Detected',
          description: 'Reject rate increased to 8% from normal 3% in sewing department. Immediate attention required.',
          data: { type: 'quality', severity: 'HIGH', affectedDepartment: 'sewing' },
          createdAt: new Date(),
          priority: 'HIGH' as const
        }
      ]
      
      insights.push(...mockInsights)

      // In production, replace with actual aiService calls

    } else if (['WAREHOUSE_STAFF', 'PURCHASER'].includes(session.user.role)) {
      // Mock inventory insights for warehouse/purchaser
      const inventoryInsights = [
        {
          id: 'inventory-002',
          type: 'INVENTORY' as const,
          title: 'Low Stock Alert',
          description: 'Polyester thread (black) below minimum threshold. 7 days supply remaining.',
          data: { action: 'RESTOCK', itemId: 'thread-black', quantity: 100, priority: 'MEDIUM' },
          createdAt: new Date(),
          priority: 'MEDIUM' as const
        },
        {
          id: 'inventory-003',
          type: 'INVENTORY' as const,
          title: 'Liquidation Opportunity',
          description: 'Brand labels showing no movement for 6 months. Consider liquidation sale.',
          data: { action: 'LIQUIDATE', itemId: 'labels-brand', quantity: 300, priority: 'LOW' },
          createdAt: new Date(),
          priority: 'LOW' as const
        }
      ]
      insights.push(...inventoryInsights)

    } else if (['SALES_STAFF', 'CSR', 'LIVE_SELLER'].includes(session.user.role)) {
      // Mock pricing insights for sales staff
      const pricingInsights = [
        {
          id: 'pricing-002',
          type: 'PRICING' as const,
          title: 'Competitive Price Adjustment',
          description: 'Hoodie pricing can be reduced by ₱50 to match competitor rates while maintaining 15% margin.',
          data: { currentPrice: 1200, suggestedPrice: 1150, confidence: 0.92 },
          createdAt: new Date(),
          priority: 'MEDIUM' as const
        },
        {
          id: 'pricing-003',
          type: 'PRICING' as const,
          title: 'Premium Pricing Opportunity',
          description: 'Branded polo shirts can support 7% price increase due to high demand and low stock.',
          data: { currentPrice: 580, suggestedPrice: 620, confidence: 0.79 },
          createdAt: new Date(),
          priority: 'MEDIUM' as const
        }
      ]
      insights.push(...pricingInsights)
    }

    // Sort by priority and creation date
    insights.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(insights)
  } catch (_error) {
    console.error('Error getting AI insights:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}