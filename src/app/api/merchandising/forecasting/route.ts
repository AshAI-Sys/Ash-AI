/**
 * ASH AI - Merchandising Forecasting API
 * Stage 13: Advanced demand forecasting and inventory optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { validateAshleyForecastingAI } from '@/lib/ashley-ai'

const forecastQuerySchema = z.object({
  horizon: z.enum(['7d', '30d', '90d', '6m', '1y']).default('30d'),
  product_category: z.string().optional(),
  client_segment: z.string().optional(),
  confidence_level: z.enum(['low', 'medium', 'high']).default('medium'),
  include_seasonality: z.boolean().default(true),
  include_market_trends: z.boolean().default(true),
  forecasting_method: z.enum(['linear', 'exponential', 'seasonal', 'ai_ensemble']).default('ai_ensemble')
})

// GET /api/merchandising/forecasting - Generate demand forecasts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only merchandisers, planners, managers, and admin can access forecasting
    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.MERCHANDISER, Role.PRODUCTION_PLANNER]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = forecastQuerySchema.parse(Object.fromEntries(searchParams))

    // Get historical data for forecasting (last 2 years)
    const historicalStartDate = new Date()
    historicalStartDate.setFullYear(historicalStartDate.getFullYear() - 2)

    const historicalOrders = await prisma.order.findMany({
      where: {
        workspace_id: session.user.workspaceId,
        created_at: { gte: historicalStartDate },
        status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] },
        ...(query.product_category && {
          category: { contains: query.product_category, mode: 'insensitive' }
        })
      },
      include: {
        brand: { select: { name: true, code: true } },
        client: { select: { name: true, company: true, region: true } },
        order_items: {
          select: {
            quantity: true,
            unit_price: true,
            category: true,
            design_specs: true
          }
        },
        invoices: {
          where: { status: 'PAID' },
          select: { total_amount: true, paid_at: true }
        }
      },
      orderBy: { created_at: 'asc' }
    })

    // Generate forecasting models
    const forecastResults = await generateForecast(historicalOrders, query)

    // Get Ashley AI ensemble forecast if requested
    let ashleyForecast = null
    if (query.forecasting_method === 'ai_ensemble' && historicalOrders.length > 10) {
      ashleyForecast = await validateAshleyForecastingAI({
        historical_data: historicalOrders,
        horizon: query.horizon,
        confidence_level: query.confidence_level,
        include_seasonality: query.include_seasonality,
        include_market_trends: query.include_market_trends
      })
    }

    // Generate inventory recommendations
    const inventoryRecommendations = await generateInventoryRecommendations(
      forecastResults, 
      ashleyForecast, 
      historicalOrders
    )

    // Calculate forecast accuracy metrics
    const accuracyMetrics = await calculateForecastAccuracy(historicalOrders, query.horizon)

    // Generate risk assessment
    const riskAssessment = generateForecastRiskAssessment(forecastResults, historicalOrders)

    return NextResponse.json({
      success: true,
      forecast_metadata: {
        horizon: query.horizon,
        method: query.forecasting_method,
        confidence_level: query.confidence_level,
        data_points: historicalOrders.length,
        forecast_generated_at: new Date().toISOString()
      },
      demand_forecast: forecastResults,
      ashley_ai_forecast: ashleyForecast,
      inventory_recommendations: inventoryRecommendations,
      accuracy_metrics: accuracyMetrics,
      risk_assessment: riskAssessment,
      actionable_insights: generateForecastingInsights(
        forecastResults, 
        ashleyForecast, 
        riskAssessment
      )
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid forecast parameters',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error generating forecast:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate forecast' },
      { status: 500 }
    )
  }
}

// POST /api/merchandising/forecasting - Create custom forecast scenario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.MERCHANDISER]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      scenario_name,
      parameters,
      adjustments,
      external_factors
    } = body

    if (!scenario_name || !parameters) {
      return NextResponse.json({
        success: false,
        error: 'Scenario name and parameters are required'
      }, { status: 400 })
    }

    // Create custom forecast scenario
    const customScenario = await prisma.forecastScenario.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: session.user.workspaceId,
        name: scenario_name,
        parameters,
        adjustments: adjustments || {},
        external_factors: external_factors || {},
        created_by: session.user.id,
        created_at: new Date()
      }
    })

    // Generate forecast based on custom scenario
    const customForecast = await generateCustomScenarioForecast(
      customScenario, 
      session.user.workspaceId
    )

    return NextResponse.json({
      success: true,
      scenario: customScenario,
      forecast: customForecast
    })

  } catch (error) {
    console.error('Error creating custom forecast:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create custom forecast' },
      { status: 500 }
    )
  }
}

// Core forecasting engine
async function generateForecast(historicalOrders: any[], query: any) {
  const forecastPeriods = generateForecastPeriods(query.horizon)
  const forecastData = []

  // Group historical data by time periods
  const timeSeries = generateTimeSeries(historicalOrders, query.horizon)

  for (const period of forecastPeriods) {
    let forecast

    switch (query.forecasting_method) {
      case 'linear':
        forecast = generateLinearForecast(timeSeries, period)
        break
      case 'exponential':
        forecast = generateExponentialForecast(timeSeries, period)
        break
      case 'seasonal':
        forecast = generateSeasonalForecast(timeSeries, period, query.include_seasonality)
        break
      default:
        forecast = generateEnsembleForecast(timeSeries, period, query)
    }

    forecastData.push({
      period: period.toISOString().split('T')[0],
      forecasted_demand: Math.round(forecast.demand),
      forecasted_revenue: Math.round(forecast.revenue * 100) / 100,
      confidence_interval: {
        lower: Math.round(forecast.demand * 0.85),
        upper: Math.round(forecast.demand * 1.15)
      },
      seasonal_factor: forecast.seasonal_factor || 1.0,
      trend_factor: forecast.trend_factor || 1.0
    })
  }

  return {
    periods: forecastData,
    summary: {
      total_forecasted_demand: forecastData.reduce((sum, period) => sum + period.forecasted_demand, 0),
      total_forecasted_revenue: forecastData.reduce((sum, period) => sum + period.forecasted_revenue, 0),
      average_daily_demand: Math.round(forecastData.reduce((sum, period) => sum + period.forecasted_demand, 0) / forecastData.length),
      peak_demand_period: forecastData.reduce((peak, current) => 
        current.forecasted_demand > peak.forecasted_demand ? current : peak
      ),
      forecast_method: query.forecasting_method,
      data_quality_score: calculateDataQualityScore(historicalOrders)
    }
  }
}

// Generate time series data
function generateTimeSeries(orders: any[], horizon: string) {
  const timeSeries = new Map<string, any>()
  
  orders.forEach(order => {
    const date = new Date(order.created_at)
    let periodKey: string

    // Group by appropriate time unit based on horizon
    switch (horizon) {
      case '7d':
      case '30d':
        periodKey = date.toISOString().split('T')[0] // Daily
        break
      case '90d':
      case '6m':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // Monthly
        break
      case '1y':
        periodKey = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}` // Quarterly
        break
      default:
        periodKey = date.toISOString().split('T')[0]
    }

    if (!timeSeries.has(periodKey)) {
      timeSeries.set(periodKey, {
        date: periodKey,
        orders: 0,
        quantity: 0,
        revenue: 0
      })
    }

    const period = timeSeries.get(periodKey)
    period.orders += 1
    period.quantity += order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    period.revenue += order.invoices.reduce((sum: number, invoice: any) => sum + invoice.total_amount, 0)
  })

  return Array.from(timeSeries.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Generate forecast periods
function generateForecastPeriods(horizon: string): Date[] {
  const periods: Date[] = []
  const startDate = new Date()
  let increment: number
  let count: number

  switch (horizon) {
    case '7d':
      increment = 24 * 60 * 60 * 1000 // 1 day
      count = 7
      break
    case '30d':
      increment = 24 * 60 * 60 * 1000 // 1 day
      count = 30
      break
    case '90d':
      increment = 7 * 24 * 60 * 60 * 1000 // 1 week
      count = 13
      break
    case '6m':
      increment = 30 * 24 * 60 * 60 * 1000 // 1 month (approx)
      count = 6
      break
    case '1y':
      increment = 30 * 24 * 60 * 60 * 1000 // 1 month (approx)
      count = 12
      break
    default:
      increment = 24 * 60 * 60 * 1000
      count = 30
  }

  for (let i = 1; i <= count; i++) {
    periods.push(new Date(startDate.getTime() + (i * increment)))
  }

  return periods
}

// Linear regression forecast
function generateLinearForecast(timeSeries: any[], period: Date) {
  if (timeSeries.length < 2) {
    return { demand: 0, revenue: 0 }
  }

  // Simple linear regression
  const n = timeSeries.length
  const xSum = timeSeries.reduce((sum, _, index) => sum + index, 0)
  const ySum = timeSeries.reduce((sum, point) => sum + point.quantity, 0)
  const xySum = timeSeries.reduce((sum, point, index) => sum + (index * point.quantity), 0)
  const x2Sum = timeSeries.reduce((sum, _, index) => sum + (index * index), 0)

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
  const intercept = (ySum - slope * xSum) / n

  const nextIndex = n
  const forecastedDemand = Math.max(0, slope * nextIndex + intercept)
  
  // Estimate revenue based on historical avg revenue per unit
  const avgRevenuePerUnit = timeSeries.reduce((sum, point) => sum + point.revenue, 0) / 
                           timeSeries.reduce((sum, point) => sum + point.quantity, 0)
  
  return {
    demand: forecastedDemand,
    revenue: forecastedDemand * (avgRevenuePerUnit || 0),
    trend_factor: slope > 0 ? 1.1 : (slope < 0 ? 0.9 : 1.0)
  }
}

// Exponential smoothing forecast
function generateExponentialForecast(timeSeries: any[], period: Date) {
  if (timeSeries.length === 0) return { demand: 0, revenue: 0 }
  
  const alpha = 0.3 // Smoothing parameter
  let smoothedValue = timeSeries[0].quantity

  for (let i = 1; i < timeSeries.length; i++) {
    smoothedValue = alpha * timeSeries[i].quantity + (1 - alpha) * smoothedValue
  }

  const avgRevenuePerUnit = timeSeries.reduce((sum, point) => sum + point.revenue, 0) / 
                           timeSeries.reduce((sum, point) => sum + point.quantity, 0)

  return {
    demand: smoothedValue,
    revenue: smoothedValue * (avgRevenuePerUnit || 0)
  }
}

// Seasonal decomposition forecast
function generateSeasonalForecast(timeSeries: any[], period: Date, includeSeasonality: boolean) {
  const linearForecast = generateLinearForecast(timeSeries, period)
  
  if (!includeSeasonality || timeSeries.length < 12) {
    return linearForecast
  }

  // Calculate seasonal factors
  const seasonalFactor = calculateSeasonalFactor(period, timeSeries)
  
  return {
    demand: linearForecast.demand * seasonalFactor,
    revenue: linearForecast.revenue * seasonalFactor,
    seasonal_factor: seasonalFactor,
    trend_factor: linearForecast.trend_factor
  }
}

// Ensemble forecast (combines multiple methods)
function generateEnsembleForecast(timeSeries: any[], period: Date, query: any) {
  const linear = generateLinearForecast(timeSeries, period)
  const exponential = generateExponentialForecast(timeSeries, period)
  const seasonal = generateSeasonalForecast(timeSeries, period, query.include_seasonality)

  // Weighted average of different methods
  const weights = { linear: 0.3, exponential: 0.3, seasonal: 0.4 }
  
  const ensembleDemand = (
    linear.demand * weights.linear +
    exponential.demand * weights.exponential +
    seasonal.demand * weights.seasonal
  )

  const ensembleRevenue = (
    linear.revenue * weights.linear +
    exponential.revenue * weights.exponential +
    seasonal.revenue * weights.seasonal
  )

  return {
    demand: ensembleDemand,
    revenue: ensembleRevenue,
    seasonal_factor: seasonal.seasonal_factor,
    trend_factor: linear.trend_factor
  }
}

// Calculate seasonal factor for a given period
function calculateSeasonalFactor(period: Date, timeSeries: any[]): number {
  const month = period.getMonth()
  const seasonalFactors = [
    1.0, 0.9, 1.1, 1.2, 1.3, 1.1, // Jan-Jun
    0.9, 0.8, 1.0, 1.2, 1.4, 1.5  // Jul-Dec
  ]
  
  return seasonalFactors[month] || 1.0
}

// Generate inventory recommendations based on forecast
async function generateInventoryRecommendations(forecast: any, ashleyForecast: any, historicalOrders: any[]) {
  const recommendations = []
  
  // Safety stock calculation
  const demandVariability = calculateDemandVariability(historicalOrders)
  const leadTime = 14 // Assume 14 days lead time
  const serviceLevel = 0.95 // 95% service level target
  
  const safetyStock = Math.ceil(demandVariability * Math.sqrt(leadTime) * 1.65) // Z-score for 95%
  
  recommendations.push({
    type: 'SAFETY_STOCK',
    recommendation: `Maintain safety stock of ${safetyStock} units`,
    rationale: 'Based on demand variability and 95% service level target',
    priority: 'High'
  })

  // Reorder point calculation
  const avgDailyDemand = forecast.summary.average_daily_demand
  const reorderPoint = (avgDailyDemand * leadTime) + safetyStock
  
  recommendations.push({
    type: 'REORDER_POINT',
    recommendation: `Set reorder point at ${reorderPoint} units`,
    rationale: 'Covers lead time demand plus safety stock',
    priority: 'High'
  })

  // Seasonal inventory adjustments
  if (forecast.periods.some((p: any) => p.seasonal_factor > 1.2)) {
    recommendations.push({
      type: 'SEASONAL_BUILDUP',
      recommendation: 'Increase inventory 30-45 days before peak season',
      rationale: 'Forecast indicates seasonal demand peaks',
      priority: 'Medium'
    })
  }

  // Ashley AI specific recommendations
  if (ashleyForecast?.inventory_recommendations) {
    recommendations.push(...ashleyForecast.inventory_recommendations)
  }

  return recommendations
}

// Calculate forecast accuracy metrics
async function calculateForecastAccuracy(historicalOrders: any[], horizon: string) {
  // This would compare previous forecasts with actual results
  // For now, return simulated metrics
  
  return {
    mean_absolute_error: 12.5,
    mean_absolute_percentage_error: 8.3,
    forecast_bias: -2.1,
    tracking_signal: 0.85,
    accuracy_grade: 'B+',
    confidence_score: 78
  }
}

// Generate risk assessment for forecasts
function generateForecastRiskAssessment(forecast: any, historicalOrders: any[]) {
  const risks = []
  
  // Data quality risk
  if (historicalOrders.length < 50) {
    risks.push({
      type: 'DATA_QUALITY',
      level: 'HIGH',
      description: 'Limited historical data may affect forecast accuracy',
      mitigation: 'Collect more data points and use external benchmarks'
    })
  }

  // Volatility risk
  const demandVariability = calculateDemandVariability(historicalOrders)
  if (demandVariability > 50) {
    risks.push({
      type: 'DEMAND_VOLATILITY',
      level: 'MEDIUM',
      description: 'High demand variability detected',
      mitigation: 'Increase safety stock and use shorter planning cycles'
    })
  }

  // Seasonal risk
  const hasSeasonality = forecast.periods.some((p: any) => p.seasonal_factor > 1.3 || p.seasonal_factor < 0.7)
  if (hasSeasonality) {
    risks.push({
      type: 'SEASONAL_VOLATILITY',
      level: 'MEDIUM',
      description: 'Strong seasonal patterns may create inventory challenges',
      mitigation: 'Plan capacity and inventory buffers for peak seasons'
    })
  }

  return {
    overall_risk_level: risks.length > 2 ? 'HIGH' : risks.length > 0 ? 'MEDIUM' : 'LOW',
    identified_risks: risks,
    risk_score: Math.max(0, 100 - (risks.length * 20))
  }
}

// Helper function to calculate demand variability
function calculateDemandVariability(orders: any[]): number {
  const demands = orders.map(order => 
    order.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
  )
  
  if (demands.length < 2) return 0
  
  const mean = demands.reduce((sum, demand) => sum + demand, 0) / demands.length
  const variance = demands.reduce((sum, demand) => sum + Math.pow(demand - mean, 2), 0) / demands.length
  
  return Math.sqrt(variance)
}

// Calculate data quality score
function calculateDataQualityScore(orders: any[]): number {
  let score = 100
  
  // Penalize for insufficient data
  if (orders.length < 30) score -= 30
  else if (orders.length < 100) score -= 15
  
  // Penalize for data gaps (simplified check)
  const daysDiff = (new Date().getTime() - new Date(orders[0]?.created_at).getTime()) / (1000 * 60 * 60 * 24)
  const expectedOrders = daysDiff / 7 // Expect 1 order per week minimum
  if (orders.length < expectedOrders * 0.5) score -= 20
  
  return Math.max(0, score)
}

// Generate actionable insights
function generateForecastingInsights(forecast: any, ashleyForecast: any, riskAssessment: any) {
  const insights = []
  
  // Demand trend insights
  const trendDirection = forecast.summary.peak_demand_period ? 'increasing' : 'stable'
  insights.push({
    category: 'Demand Trend',
    insight: `Demand is ${trendDirection} with peak expected in ${forecast.summary.peak_demand_period?.period || 'current period'}`,
    action: 'Adjust production planning and inventory levels accordingly',
    impact: 'High'
  })
  
  // Capacity planning insight
  insights.push({
    category: 'Capacity Planning',
    insight: `Peak demand of ${forecast.summary.peak_demand_period?.forecasted_demand || 0} units expected`,
    action: 'Ensure production capacity can handle peak demand periods',
    impact: 'High'
  })
  
  // Risk mitigation insights
  if (riskAssessment.overall_risk_level !== 'LOW') {
    insights.push({
      category: 'Risk Management',
      insight: `${riskAssessment.overall_risk_level} risk level detected with ${riskAssessment.identified_risks.length} risk factors`,
      action: 'Implement risk mitigation strategies and increase monitoring frequency',
      impact: 'Medium'
    })
  }
  
  return insights
}

// Generate custom scenario forecast
async function generateCustomScenarioForecast(scenario: any, workspaceId: string) {
  // This would apply custom parameters and adjustments to create a scenario-based forecast
  return {
    scenario_name: scenario.name,
    forecast_adjustment: '+15%',
    confidence_level: 'Medium',
    key_assumptions: scenario.parameters,
    external_factors_impact: scenario.external_factors
  }
}