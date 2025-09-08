/**
 * Merchandising AI - Inventory Optimization API
 * Provides AI-powered inventory optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { secureDb } from '@/lib/db-security'
import { verifyToken } from '@/lib/auth'
import { InputSanitizer } from '@/lib/input-security'
import { securityAuditLogger } from '@/lib/auth-security'
import { z } from 'zod'

const optimizationQuerySchema = z.object({
  workspace_id: z.string().uuid(),
  category: z.enum(['all', 'fabric', 'trims', 'finished_goods']).optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter', 'all_season']).optional(),
  analysis_period: z.enum(['30d', '90d', '6m', '1y']).default('90d'),
  optimization_goal: z.enum(['minimize_cost', 'maximize_turnover', 'balanced']).default('balanced'),
  include_forecasting: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sanitizedBody = InputSanitizer.sanitizeObject(body)
    const query = optimizationQuerySchema.parse(sanitizedBody)

    // Verify workspace access
    const workspace = await secureDb.getPrisma().workspace.findFirst({
      where: {
        id: query.workspace_id,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Get inventory data
    const inventoryData = await getInventoryData(query.workspace_id, query)
    
    // Perform optimization analysis
    const optimization = await performInventoryOptimization(inventoryData, query)
    
    // Get reorder recommendations
    const reorderRecommendations = await generateReorderRecommendations(inventoryData, query)
    
    // Calculate ABC analysis
    const abcAnalysis = await performABCAnalysis(inventoryData)
    
    // Get slow-moving inventory
    const slowMovingItems = await identifySlowMovingInventory(inventoryData, query)

    const result = {
      workspace_id: query.workspace_id,
      analysis_date: new Date().toISOString(),
      analysis_period: query.analysis_period,
      optimization_goal: query.optimization_goal,
      summary: {
        total_items: inventoryData.length,
        total_value: inventoryData.reduce((sum, item) => sum + (item.quantity * item.cost), 0),
        optimization_opportunities: optimization.opportunities.length,
        reorder_items: reorderRecommendations.length,
        slow_moving_items: slowMovingItems.length
      },
      optimization: {
        current_metrics: optimization.current_metrics,
        optimized_metrics: optimization.optimized_metrics,
        potential_savings: optimization.potential_savings,
        opportunities: optimization.opportunities
      },
      reorder_recommendations: reorderRecommendations,
      abc_analysis: abcAnalysis,
      slow_moving_inventory: slowMovingItems,
      generated_at: new Date().toISOString()
    }

    // Log audit event
    await securityAuditLogger.logSecurityEvent({
      type: 'DATA_ACCESS',
      severity: 'LOW',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        action: 'INVENTORY_OPTIMIZATION_ANALYSIS',
        workspace_id: query.workspace_id,
        user_id: user.id,
        analysis_period: query.analysis_period
      }
    })

    return NextResponse.json(result)

  } catch (_error) {
    console.error('Inventory optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to perform inventory optimization' },
      { status: 500 }
    )
  }
}

async function getInventoryData(workspaceId: string, query: any) {
  const whereClause: any = {
    workspace_id: workspaceId
  }

  if (query.category && query.category !== 'all') {
    whereClause.category = query.category
  }

  const inventoryItems = await secureDb.getPrisma().inventoryItem.findMany({
    where: whereClause,
    include: {
      inventory_transactions: {
        where: {
          created_at: {
            gte: getDateFromPeriod(query.analysis_period)
          }
        },
        orderBy: { created_at: 'desc' }
      },
      _count: {
        select: {
          inventory_transactions: true
        }
      }
    }
  })

  return inventoryItems.map(item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    quantity: item.quantity,
    cost: parseFloat(item.cost.toString()),
    price: item.price ? parseFloat(item.price.toString()) : 0,
    reorder_point: item.reorder_point,
    max_stock: item.max_stock,
    transactions: item.inventory_transactions,
    transaction_count: item._count.inventory_transactions,
    last_movement: item.inventory_transactions[0]?.created_at || null,
    turnover_rate: calculateTurnoverRate(item.inventory_transactions, item.quantity),
    days_on_hand: calculateDaysOnHand(item.inventory_transactions, item.quantity),
    stockout_risk: calculateStockoutRisk(item.inventory_transactions, item.quantity, item.reorder_point)
  }))
}

async function performInventoryOptimization(inventoryData: any[], query: any) {
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
  const totalItems = inventoryData.length
  
  // Calculate current metrics
  const averageTurnover = inventoryData.reduce((sum, item) => sum + item.turnover_rate, 0) / totalItems
  const averageDaysOnHand = inventoryData.reduce((sum, item) => sum + item.days_on_hand, 0) / totalItems
  const stockoutRiskItems = inventoryData.filter(item => item.stockout_risk > 0.7).length
  
  const current_metrics = {
    inventory_value: totalValue,
    average_turnover: averageTurnover,
    average_days_on_hand: averageDaysOnHand,
    stockout_risk_items: stockoutRiskItems,
    carrying_cost: totalValue * 0.25 // Assume 25% carrying cost
  }

  // Generate optimization opportunities
  const opportunities = []
  let potential_savings = 0

  // High inventory items with low turnover
  const excessInventory = inventoryData.filter(item => 
    item.days_on_hand > 90 && item.turnover_rate < 2
  )
  
  if (excessInventory.length > 0) {
    const excessValue = excessInventory.reduce((sum, item) => sum + (item.quantity * item.cost * 0.3), 0)
    opportunities.push({
      type: 'REDUCE_EXCESS_INVENTORY',
      description: `Reduce excess inventory for ${excessInventory.length} slow-moving items`,
      affected_items: excessInventory.length,
      potential_saving: excessValue,
      priority: 'HIGH',
      items: excessInventory.map(item => ({ sku: item.sku, name: item.name, excess_days: item.days_on_hand }))
    })
    potential_savings += excessValue
  }

  // Low stock items with high turnover
  const understockedItems = inventoryData.filter(item => 
    item.stockout_risk > 0.8 && item.turnover_rate > 4
  )
  
  if (understockedItems.length > 0) {
    const lostSales = understockedItems.reduce((sum, item) => sum + (item.price * 30), 0) // Assume 30 units lost sales
    opportunities.push({
      type: 'INCREASE_FAST_MOVERS',
      description: `Increase stock for ${understockedItems.length} fast-moving items at risk of stockout`,
      affected_items: understockedItems.length,
      potential_saving: lostSales * 0.3, // 30% profit margin
      priority: 'CRITICAL',
      items: understockedItems.map(item => ({ sku: item.sku, name: item.name, stockout_risk: item.stockout_risk }))
    })
    potential_savings += lostSales * 0.3
  }

  // Optimize reorder points
  const suboptimalReorderPoints = inventoryData.filter(item => {
    const optimalReorderPoint = item.turnover_rate * 7 // 7 days lead time
    return Math.abs(item.reorder_point - optimalReorderPoint) > optimalReorderPoint * 0.2
  })

  if (suboptimalReorderPoints.length > 0) {
    opportunities.push({
      type: 'OPTIMIZE_REORDER_POINTS',
      description: `Optimize reorder points for ${suboptimalReorderPoints.length} items`,
      affected_items: suboptimalReorderPoints.length,
      potential_saving: totalValue * 0.05, // 5% of inventory value
      priority: 'MEDIUM',
      items: suboptimalReorderPoints.map(item => ({
        sku: item.sku,
        name: item.name,
        current_reorder_point: item.reorder_point,
        recommended_reorder_point: Math.round(item.turnover_rate * 7)
      }))
    })
    potential_savings += totalValue * 0.05
  }

  // Calculate optimized metrics
  const optimized_metrics = {
    inventory_value: totalValue - (potential_savings * 0.4),
    average_turnover: averageTurnover * 1.2,
    average_days_on_hand: averageDaysOnHand * 0.8,
    stockout_risk_items: Math.max(0, stockoutRiskItems - understockedItems.length),
    carrying_cost: (totalValue - (potential_savings * 0.4)) * 0.25
  }

  return {
    current_metrics,
    optimized_metrics,
    potential_savings: Math.round(potential_savings),
    opportunities: opportunities.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }
}

async function generateReorderRecommendations(inventoryData: any[], query: any) {
  return inventoryData
    .filter(item => item.quantity <= item.reorder_point || item.stockout_risk > 0.6)
    .map(item => {
      const recommendedQuantity = Math.max(
        item.max_stock - item.quantity,
        Math.round(item.turnover_rate * 30) // 30 days supply
      )
      
      return {
        sku: item.sku,
        name: item.name,
        current_quantity: item.quantity,
        reorder_point: item.reorder_point,
        recommended_quantity: recommendedQuantity,
        estimated_cost: recommendedQuantity * item.cost,
        urgency: item.stockout_risk > 0.8 ? 'CRITICAL' : item.stockout_risk > 0.6 ? 'HIGH' : 'MEDIUM',
        reason: item.quantity <= item.reorder_point ? 'Below reorder point' : 'High stockout risk',
        lead_time_days: 7, // Default lead time
        estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    })
    .sort((a, b) => {
      const urgencyOrder = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 }
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
    })
}

async function performABCAnalysis(inventoryData: any[]) {
  // Sort by value (quantity * cost) descending
  const sortedItems = inventoryData
    .map(item => ({
      ...item,
      total_value: item.quantity * item.cost
    }))
    .sort((a, b) => b.total_value - a.total_value)

  const totalValue = sortedItems.reduce((sum, item) => sum + item.total_value, 0)
  let cumulativeValue = 0
  let cumulativePercentage = 0

  const categorizedItems = sortedItems.map((item, index) => {
    cumulativeValue += item.total_value
    cumulativePercentage = (cumulativeValue / totalValue) * 100

    let category
    if (cumulativePercentage <= 70) {
      category = 'A'
    } else if (cumulativePercentage <= 90) {
      category = 'B'
    } else {
      category = 'C'
    }

    return {
      sku: item.sku,
      name: item.name,
      total_value: item.total_value,
      cumulative_percentage: Math.round(cumulativePercentage * 100) / 100,
      abc_category: category,
      recommended_control: {
        'A': 'Tight control, frequent reviews, accurate forecasting',
        'B': 'Moderate control, periodic reviews',
        'C': 'Loose control, bulk ordering, annual reviews'
      }[category]
    }
  })

  const summary = {
    category_A: {
      items: categorizedItems.filter(item => item.abc_category === 'A').length,
      value_percentage: 70,
      description: 'High-value items requiring tight inventory control'
    },
    category_B: {
      items: categorizedItems.filter(item => item.abc_category === 'B').length,
      value_percentage: 20,
      description: 'Medium-value items with moderate control needed'
    },
    category_C: {
      items: categorizedItems.filter(item => item.abc_category === 'C').length,
      value_percentage: 10,
      description: 'Low-value items suitable for bulk ordering'
    }
  }

  return {
    summary,
    items: categorizedItems
  }
}

async function identifySlowMovingInventory(inventoryData: any[], query: any) {
  const slowMovingThreshold = 60 // 60 days without movement
  const lowTurnoverThreshold = 2 // Less than 2 turnovers per period

  return inventoryData
    .filter(item => {
      const daysSinceLastMovement = item.last_movement 
        ? Math.floor((Date.now() - new Date(item.last_movement).getTime()) / (1000 * 60 * 60 * 24))
        : 365 // Assume 1 year if no movement recorded
      
      return daysSinceLastMovement > slowMovingThreshold || item.turnover_rate < lowTurnoverThreshold
    })
    .map(item => {
      const daysSinceLastMovement = item.last_movement 
        ? Math.floor((Date.now() - new Date(item.last_movement).getTime()) / (1000 * 60 * 60 * 24))
        : 365

      const inventoryValue = item.quantity * item.cost
      const carryingCost = inventoryValue * 0.25 * (daysSinceLastMovement / 365)

      return {
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        inventory_value: inventoryValue,
        days_since_movement: daysSinceLastMovement,
        turnover_rate: item.turnover_rate,
        carrying_cost: Math.round(carryingCost * 100) / 100,
        risk_level: daysSinceLastMovement > 180 ? 'HIGH' : daysSinceLastMovement > 90 ? 'MEDIUM' : 'LOW',
        recommendations: [
          ...(daysSinceLastMovement > 180 ? ['Consider liquidation or markdown'] : []),
          ...(item.turnover_rate < 1 ? ['Discontinue or find alternative use'] : []),
          'Review demand forecasting',
          'Consider bundling with fast-moving items'
        ]
      }
    })
    .sort((a, b) => b.days_since_movement - a.days_since_movement)
}

function getDateFromPeriod(period: string): Date {
  const now = new Date()
  switch (period) {
    case '30d':
      return new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(new Date(now).getTime() - 90 * 24 * 60 * 60 * 1000)
    case '6m':
      return new Date(new Date(now).getTime() - 180 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(new Date(now).getTime() - 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(new Date(now).getTime() - 90 * 24 * 60 * 60 * 1000)
  }
}

function calculateTurnoverRate(transactions: any[], currentQuantity: number): number {
  const outboundTransactions = transactions.filter(t => t.transaction_type === 'OUT')
  const totalOut = outboundTransactions.reduce((sum, t) => sum + t.quantity, 0)
  const averageInventory = currentQuantity + (totalOut / 2)
  return averageInventory > 0 ? totalOut / averageInventory : 0
}

function calculateDaysOnHand(transactions: any[], currentQuantity: number): number {
  const recentOutbound = transactions
    .filter(t => t.transaction_type === 'OUT')
    .slice(0, 30) // Last 30 transactions
  
  if (recentOutbound.length === 0) return 365
  
  const dailyUsage = recentOutbound.reduce((sum, t) => sum + t.quantity, 0) / 30
  return dailyUsage > 0 ? currentQuantity / dailyUsage : 365
}

function calculateStockoutRisk(transactions: any[], currentQuantity: number, reorderPoint: number): number {
  const recentOutbound = transactions
    .filter(t => t.transaction_type === 'OUT')
    .slice(0, 7) // Last week
  
  const weeklyUsage = recentOutbound.reduce((sum, t) => sum + t.quantity, 0)
  const weeksUntilReorder = reorderPoint > 0 ? currentQuantity / (weeklyUsage / 7) : 0
  
  if (weeksUntilReorder <= 1) return 1.0
  if (weeksUntilReorder <= 2) return 0.8
  if (weeksUntilReorder <= 4) return 0.6
  if (weeksUntilReorder <= 8) return 0.4
  return 0.2
}