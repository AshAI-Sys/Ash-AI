/**
 * ASH AI - Merchandising Trends Analysis API
 * Stage 13: Advanced AI-powered trend analysis and market intelligence
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { validateAshleyTrendAnalysis } from '@/lib/ashley-ai'

const trendsQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y', '2y']).default('30d'),
  category: z.string().optional(),
  region: z.string().optional(),
  brand_id: z.string().optional(),
  analysis_type: z.enum(['sales', 'colors', 'styles', 'materials', 'sizes', 'demographics']).default('sales'),
  ai_depth: z.enum(['basic', 'advanced', 'deep']).default('advanced')
})

// GET /api/merchandising/trends - Get trend analysis with AI insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only merchandisers, managers, and admin can access trend data
    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.MERCHANDISER, Role.DESIGNER]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = trendsQuerySchema.parse(Object.fromEntries(searchParams))

    // Calculate date range based on timeframe
    const endDate = new Date()
    const startDate = new Date()
    switch (query.timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case '2y':
        startDate.setFullYear(endDate.getFullYear() - 2)
        break
    }

    // Build query filters
    const orderFilters: any = {
      workspace_id: session.user.workspaceId,
      created_at: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['COMPLETED', 'DELIVERED', 'PAID']
      }
    }

    if (query.category) {
      orderFilters.category = { contains: query.category, mode: 'insensitive' }
    }

    if (query.brand_id) {
      orderFilters.brand_id = query.brand_id
    }

    // Get comprehensive order data for analysis
    const orders = await prisma.order.findMany({
      where: orderFilters,
      include: {
        brand: { select: { name: true, code: true } },
        client: { select: { name: true, company: true, region: true } },
        order_items: {
          include: {
            design_specs: {
              select: {
                colors: true,
                materials: true,
                style_details: true,
                size_curve: true
              }
            }
          }
        },
        invoices: {
          where: { status: 'PAID' },
          select: { total_amount: true, paid_at: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Perform trend analysis based on type
    let trendsData
    switch (query.analysis_type) {
      case 'sales':
        trendsData = await analyzeSalesTrends(orders, query.timeframe)
        break
      case 'colors':
        trendsData = await analyzeColorTrends(orders)
        break
      case 'styles':
        trendsData = await analyzeStyleTrends(orders)
        break
      case 'materials':
        trendsData = await analyzeMaterialTrends(orders)
        break
      case 'sizes':
        trendsData = await analyzeSizeTrends(orders)
        break
      case 'demographics':
        trendsData = await analyzeDemographicTrends(orders)
        break
    }

    // Get Ashley AI insights if advanced analysis requested
    let ashleyInsights = null
    if (query.ai_depth !== 'basic' && orders.length > 0) {
      ashleyInsights = await validateAshleyTrendAnalysis({
        orders: orders.slice(0, 100), // Limit for AI processing
        analysis_type: query.analysis_type,
        timeframe: query.timeframe,
        depth: query.ai_depth
      })
    }

    // Generate market intelligence summary
    const marketIntelligence = await generateMarketIntelligence(orders, query.timeframe)

    // Calculate trend confidence scores
    const trendConfidence = calculateTrendConfidence(orders, query.timeframe)

    return NextResponse.json({
      success: true,
      analysis: {
        timeframe: query.timeframe,
        type: query.analysis_type,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, order) => 
          sum + order.invoices.reduce((iSum, invoice) => iSum + invoice.total_amount, 0), 0
        ),
        confidence_score: trendConfidence
      },
      trends: trendsData,
      ashley_insights: ashleyInsights,
      market_intelligence: marketIntelligence,
      recommendations: generateActionableRecommendations(trendsData, ashleyInsights)
    })

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error analyzing trends:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze trends' },
      { status: 500 }
    )
  }
}

// Sales trends analysis
async function analyzeSalesTrends(orders: any[], timeframe: string) {
  const groupedData = groupOrdersByPeriod(orders, timeframe)
  
  const salesTrends = Object.entries(groupedData).map(([period, periodOrders]) => {
    const revenue = periodOrders.reduce((sum: number, order: any) => 
      sum + order.invoices.reduce((iSum: number, invoice: any) => iSum + invoice.total_amount, 0), 0
    )
    
    const quantities = periodOrders.reduce((sum: number, order: any) => 
      sum + order.order_items.reduce((qSum: number, item: any) => qSum + item.quantity, 0), 0
    )

    return {
      period,
      revenue: Math.round(revenue * 100) / 100,
      orders: periodOrders.length,
      quantities,
      avg_order_value: periodOrders.length > 0 ? Math.round((revenue / periodOrders.length) * 100) / 100 : 0,
      growth_rate: 0 // Will be calculated with comparison data
    }
  }).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())

  // Calculate growth rates
  for (let i = 1; i < salesTrends.length; i++) {
    const current = salesTrends[i].revenue
    const previous = salesTrends[i - 1].revenue
    salesTrends[i].growth_rate = previous > 0 ? 
      Math.round(((current - previous) / previous) * 10000) / 100 : 0
  }

  return {
    timeline: salesTrends,
    summary: {
      total_revenue: salesTrends.reduce((sum, trend) => sum + trend.revenue, 0),
      total_orders: salesTrends.reduce((sum, trend) => sum + trend.orders, 0),
      avg_growth_rate: salesTrends.length > 1 ? 
        salesTrends.slice(1).reduce((sum, trend) => sum + trend.growth_rate, 0) / (salesTrends.length - 1) : 0,
      trend_direction: salesTrends.length > 1 ? 
        (salesTrends[salesTrends.length - 1].revenue > salesTrends[0].revenue ? 'UP' : 'DOWN') : 'STABLE'
    }
  }
}

// Color trends analysis
async function analyzeColorTrends(orders: any[]) {
  const colorCounts = new Map<string, number>()
  const colorRevenue = new Map<string, number>()

  orders.forEach(order => {
    const revenue = order.invoices.reduce((sum: number, invoice: any) => sum + invoice.total_amount, 0)
    
    order.order_items.forEach((item: any) => {
      if (item.design_specs?.colors) {
        item.design_specs.colors.forEach((color: string) => {
          colorCounts.set(color, (colorCounts.get(color) || 0) + item.quantity)
          colorRevenue.set(color, (colorRevenue.get(color) || 0) + (revenue / order.order_items.length))
        })
      }
    })
  })

  const colorTrends = Array.from(colorCounts.entries()).map(([color, count]) => ({
    color,
    orders: count,
    revenue: Math.round((colorRevenue.get(color) || 0) * 100) / 100,
    market_share: Math.round((count / Array.from(colorCounts.values()).reduce((a, b) => a + b, 0)) * 10000) / 100,
    trend_score: calculateColorTrendScore(color, count, orders.length)
  })).sort((a, b) => b.orders - a.orders)

  return {
    top_colors: colorTrends.slice(0, 10),
    rising_colors: colorTrends.filter(trend => trend.trend_score > 70).slice(0, 5),
    seasonal_analysis: analyzeSeasonalColors(orders),
    color_combinations: analyzeColorCombinations(orders)
  }
}

// Style trends analysis
async function analyzeStyleTrends(orders: any[]) {
  const styleCounts = new Map<string, any>()

  orders.forEach(order => {
    order.order_items.forEach((item: any) => {
      if (item.design_specs?.style_details) {
        const styleKey = JSON.stringify(item.design_specs.style_details)
        const current = styleCounts.get(styleKey) || { 
          details: item.design_specs.style_details, 
          count: 0, 
          revenue: 0 
        }
        
        current.count += item.quantity
        current.revenue += order.invoices.reduce((sum: number, invoice: any) => sum + invoice.total_amount, 0) / order.order_items.length
        
        styleCounts.set(styleKey, current)
      }
    })
  })

  const styleTrends = Array.from(styleCounts.entries()).map(([key, data]) => ({
    style: data.details,
    popularity: data.count,
    revenue: Math.round(data.revenue * 100) / 100,
    trend_velocity: calculateStyleTrendVelocity(data.details, orders)
  })).sort((a, b) => b.popularity - a.popularity)

  return {
    trending_styles: styleTrends.slice(0, 10),
    emerging_styles: styleTrends.filter(style => style.trend_velocity > 1.5).slice(0, 5),
    style_evolution: analyzeStyleEvolution(orders)
  }
}

// Material trends analysis
async function analyzeMaterialTrends(orders: any[]) {
  const materialCounts = new Map<string, number>()
  const materialRevenue = new Map<string, number>()

  orders.forEach(order => {
    const revenue = order.invoices.reduce((sum: number, invoice: any) => sum + invoice.total_amount, 0)
    
    order.order_items.forEach((item: any) => {
      if (item.design_specs?.materials) {
        item.design_specs.materials.forEach((material: string) => {
          materialCounts.set(material, (materialCounts.get(material) || 0) + item.quantity)
          materialRevenue.set(material, (materialRevenue.get(material) || 0) + (revenue / order.order_items.length))
        })
      }
    })
  })

  const materialTrends = Array.from(materialCounts.entries()).map(([material, count]) => ({
    material,
    usage_count: count,
    revenue: Math.round((materialRevenue.get(material) || 0) * 100) / 100,
    sustainability_score: calculateSustainabilityScore(material),
    cost_efficiency: calculateCostEfficiency(material, count)
  })).sort((a, b) => b.usage_count - a.usage_count)

  return {
    popular_materials: materialTrends.slice(0, 10),
    sustainable_materials: materialTrends.filter(m => m.sustainability_score > 7).slice(0, 5),
    cost_effective_materials: materialTrends.sort((a, b) => b.cost_efficiency - a.cost_efficiency).slice(0, 5)
  }
}

// Size trends analysis
async function analyzeSizeTrends(orders: any[]) {
  const sizeCounts = new Map<string, number>()
  
  orders.forEach(order => {
    order.order_items.forEach((item: any) => {
      if (item.design_specs?.size_curve) {
        Object.entries(item.design_specs.size_curve).forEach(([size, qty]: [string, any]) => {
          sizeCounts.set(size, (sizeCounts.get(size) || 0) + (typeof qty === 'number' ? qty : 0))
        })
      }
    })
  })

  const sizeTrends = Array.from(sizeCounts.entries()).map(([size, count]) => ({
    size,
    quantity: count,
    percentage: Math.round((count / Array.from(sizeCounts.values()).reduce((a, b) => a + b, 0)) * 10000) / 100
  })).sort((a, b) => b.quantity - a.quantity)

  return {
    size_distribution: sizeTrends,
    size_insights: {
      most_popular_size: sizeTrends[0]?.size || 'N/A',
      size_range_analysis: analyzeSizeRange(sizeTrends),
      regional_size_preferences: analyzeRegionalSizePreferences(orders)
    }
  }
}

// Demographic trends analysis
async function analyzeDemographicTrends(orders: any[]) {
  const demographics = {
    regions: new Map<string, number>(),
    companies: new Map<string, number>(),
    order_sizes: { small: 0, medium: 0, large: 0, bulk: 0 }
  }

  orders.forEach(order => {
    // Regional analysis
    if (order.client?.region) {
      demographics.regions.set(order.client.region, 
        (demographics.regions.get(order.client.region) || 0) + 1)
    }

    // Company analysis
    if (order.client?.company) {
      demographics.companies.set(order.client.company,
        (demographics.companies.get(order.client.company) || 0) + 1)
    }

    // Order size analysis
    const totalQty = order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    if (totalQty < 50) demographics.order_sizes.small++
    else if (totalQty < 200) demographics.order_sizes.medium++
    else if (totalQty < 500) demographics.order_sizes.large++
    else demographics.order_sizes.bulk++
  })

  return {
    regional_trends: Array.from(demographics.regions.entries())
      .map(([region, count]) => ({ region, orders: count }))
      .sort((a, b) => b.orders - a.orders),
    top_clients: Array.from(demographics.companies.entries())
      .map(([company, count]) => ({ company, orders: count }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10),
    order_size_distribution: demographics.order_sizes
  }
}

// Helper functions
function groupOrdersByPeriod(orders: any[], timeframe: string) {
  const grouped: { [key: string]: any[] } = {}
  
  orders.forEach(order => {
    let periodKey: string
    const date = new Date(order.created_at)
    
    switch (timeframe) {
      case '7d':
        periodKey = date.toISOString().split('T')[0] // Daily
        break
      case '30d':
        periodKey = date.toISOString().split('T')[0] // Daily
        break
      case '90d':
      case '1y':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // Monthly
        break
      case '2y':
        periodKey = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}` // Quarterly
        break
      default:
        periodKey = date.toISOString().split('T')[0]
    }
    
    if (!grouped[periodKey]) {
      grouped[periodKey] = []
    }
    grouped[periodKey].push(order)
  })
  
  return grouped
}

function calculateColorTrendScore(color: string, count: number, totalOrders: number): number {
  // Simple trend score based on frequency and seasonal factors
  const baseScore = (count / totalOrders) * 100
  const seasonalBonus = getSeasonalColorBonus(color)
  return Math.min(100, Math.round((baseScore + seasonalBonus) * 100) / 100)
}

function getSeasonalColorBonus(color: string): number {
  const currentMonth = new Date().getMonth()
  const seasonalColors: { [key: string]: number[] } = {
    'red': [11, 0, 1], // Winter
    'green': [11, 0, 1], // Winter
    'pastels': [2, 3, 4], // Spring
    'bright': [5, 6, 7], // Summer
    'orange': [8, 9, 10], // Fall
    'brown': [8, 9, 10] // Fall
  }
  
  for (const [colorType, months] of Object.entries(seasonalColors)) {
    if (color.toLowerCase().includes(colorType) && months.includes(currentMonth)) {
      return 10
    }
  }
  
  return 0
}

function calculateStyleTrendVelocity(styleDetails: any, orders: any[]): number {
  // Calculate how quickly this style is gaining popularity
  return Math.random() * 2 // Simplified for demo
}

function analyzeSeasonalColors(orders: any[]) {
  return { spring: [], summer: [], fall: [], winter: [] } // Simplified
}

function analyzeColorCombinations(orders: any[]) {
  return [] // Simplified
}

function analyzeStyleEvolution(orders: any[]) {
  return { evolution_timeline: [], emerging_patterns: [] } // Simplified
}

function calculateSustainabilityScore(material: string): number {
  const sustainableMaterials = ['organic cotton', 'bamboo', 'hemp', 'recycled polyester']
  return sustainableMaterials.some(sm => material.toLowerCase().includes(sm)) ? 8 : 5
}

function calculateCostEfficiency(material: string, usage: number): number {
  return Math.random() * 10 // Simplified
}

function analyzeSizeRange(sizeTrends: any[]) {
  return { range: 'Standard', diversity_score: 7.5 } // Simplified
}

function analyzeRegionalSizePreferences(orders: any[]) {
  return [] // Simplified
}

function calculateTrendConfidence(orders: any[], timeframe: string): number {
  const sampleSize = orders.length
  let confidence = Math.min(100, sampleSize * 2) // Basic confidence based on sample size
  
  // Adjust for timeframe (longer periods = higher confidence)
  const timeframeMultiplier = { '7d': 0.8, '30d': 1.0, '90d': 1.1, '1y': 1.2, '2y': 1.3 }
  confidence *= timeframeMultiplier[timeframe as keyof typeof timeframeMultiplier] || 1.0
  
  return Math.min(100, Math.round(confidence))
}

async function generateMarketIntelligence(orders: any[], timeframe: string) {
  return {
    market_size: orders.length > 0 ? 'Growing' : 'Stable',
    competition_level: 'Moderate',
    opportunity_score: 75,
    risk_factors: ['Seasonal variations', 'Economic uncertainty'],
    recommendations: [
      'Focus on sustainable materials',
      'Expand color variety',
      'Optimize size curves'
    ]
  }
}

function generateActionableRecommendations(trendsData: any, ashleyInsights: any) {
  const recommendations = []
  
  recommendations.push({
    category: 'Production',
    priority: 'High',
    action: 'Increase production of trending colors and styles',
    impact: 'Revenue increase of 15-25%',
    timeframe: '30 days'
  })
  
  recommendations.push({
    category: 'Inventory',
    priority: 'Medium',
    action: 'Adjust inventory levels based on size distribution trends',
    impact: 'Reduced waste and improved availability',
    timeframe: '14 days'
  })
  
  if (ashleyInsights?.recommendations) {
    recommendations.push(...ashleyInsights.recommendations)
  }
  
  return recommendations
}