import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AshleyMerchandisingAI, OrderHistoryItem, MarketTrendData } from '@/lib/ashley-ai-merchandising'
// Ashley AI Merchandising API - Stage 13 Implementation
// Provides AI-powered reprint recommendations and theme suggestions


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action, 
      client_id, 
      workspace_id, 
      analysis_period = 'LAST_12_MONTHS' 
    } = body

    if (!client_id || !workspace_id) {
      return NextResponse.json(
        { error: 'client_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Verify client access
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

    // Get client order history
    const dateThreshold = getDateThreshold(analysis_period)
    const orders = await db.order.findMany({
      where: {
        client_id: client_id,
        workspace_id: workspace_id,
        created_at: {
          gte: dateThreshold
        }
      },
      include: {
        design_assets: {
          select: {
            design_theme: true,
            colors_used: true
          }
        },
        feedback: {
          select: {
            rating: true,
            created_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Transform to order history format
    const orderHistory: OrderHistoryItem[] = orders.map(order => ({
      id: order.id,
      product_type: order.product_type,
      method: order.method,
      design_theme: order.design_assets[0]?.design_theme || undefined,
      colors_used: order.design_assets[0]?.colors_used || [],
      quantity: order.total_qty,
      total_value: order.total_value || 0,
      client_satisfaction: order.feedback[0]?.rating || undefined,
      reorder_count: orders.filter(o => 
        o.product_type === order.product_type && 
        o.method === order.method &&
        o.created_at > order.created_at
      ).length,
      seasonal_period: `Q${Math.ceil((order.created_at.getMonth() + 1) / 3)}`,
      created_at: order.created_at,
      performance_metrics: {
        sell_through_rate: Math.random() * 0.5 + 0.5, // Mock data
        return_rate: Math.random() * 0.1,
        customer_feedback_score: order.feedback[0]?.rating || 4.0
      }
    }))

    // Get market trend data (would be from external service in production)
    const marketData: MarketTrendData = await getMarketTrendData()

    switch (action) {
      case 'REPRINT_ANALYSIS':
        const reprintRecommendations = await AshleyMerchandisingAI.analyzeReprintOpportunities(
          client_id,
          orderHistory,
          marketData
        )

        // Log AI insights for analytics
        await logAshleyInsight({
          client_id,
          workspace_id,
          insight_type: 'REPRINT_RECOMMENDATION',
          data: { recommendations: reprintRecommendations.length }
        })

        return NextResponse.json({
          success: true,
          analysis_period,
          total_orders_analyzed: orderHistory.length,
          recommendations: reprintRecommendations,
          market_context: {
            industry_growth: marketData.industry_benchmarks.average_reorder_rate,
            trending_methods: marketData.industry_benchmarks.popular_methods
          }
        })

      case 'THEME_RECOMMENDATIONS':
        const clientPreferences = await getClientPreferences(client_id, orderHistory)
        const currentSeason = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
        
        const themeRecommendations = await AshleyMerchandisingAI.generateThemeRecommendations(
          client_id,
          clientPreferences,
          marketData,
          currentSeason
        )

        await logAshleyInsight({
          client_id,
          workspace_id,
          insight_type: 'THEME_RECOMMENDATION',
          data: { themes: themeRecommendations.length }
        })

        return NextResponse.json({
          success: true,
          current_season: currentSeason,
          client_preferences: clientPreferences,
          theme_recommendations: themeRecommendations,
          trending_themes: marketData.trending_themes.slice(0, 5)
        })

      case 'CHURN_ANALYSIS':
        const churnAnalysis = await AshleyMerchandisingAI.analyzeClientChurnRisk(
          client_id,
          orderHistory,
          marketData.industry_benchmarks
        )

        await logAshleyInsight({
          client_id,
          workspace_id,
          insight_type: 'CHURN_ANALYSIS',
          data: { risk_level: churnAnalysis.churn_risk }
        })

        return NextResponse.json({
          success: true,
          churn_analysis: churnAnalysis,
          last_order_date: orderHistory[0]?.created_at || null,
          order_frequency_benchmark: marketData.industry_benchmarks.average_reorder_rate
        })

      case 'COMPREHENSIVE_INSIGHTS':
        // Run all analyses
        const [reprints, themes, churn] = await Promise.all([
          AshleyMerchandisingAI.analyzeReprintOpportunities(client_id, orderHistory, marketData),
          AshleyMerchandisingAI.generateThemeRecommendations(
            client_id,
            await getClientPreferences(client_id, orderHistory),
            marketData,
            `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
          ),
          AshleyMerchandisingAI.analyzeClientChurnRisk(client_id, orderHistory, marketData.industry_benchmarks)
        ])

        await logAshleyInsight({
          client_id,
          workspace_id,
          insight_type: 'COMPREHENSIVE_ANALYSIS',
          data: { 
            reprints: reprints.length,
            themes: themes.length,
            churn_risk: churn.churn_risk
          }
        })

        return NextResponse.json({
          success: true,
          comprehensive_insights: {
            reprint_recommendations: reprints.slice(0, 5),
            theme_recommendations: themes.slice(0, 4),
            churn_analysis: churn,
            client_score: calculateClientScore(orderHistory, churn, reprints),
            next_recommended_actions: generateNextActions(reprints, themes, churn)
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: REPRINT_ANALYSIS, THEME_RECOMMENDATIONS, CHURN_ANALYSIS, or COMPREHENSIVE_INSIGHTS' },
          { status: 400 }
        )
    }

  } catch (_error) {
    console.error('Ashley AI Merchandising API error:', _error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate AI merchandising insights',
        details: process.env.NODE_ENV === 'development' ? _error : undefined
      },
      { status: 500 }
    )
  }
}

// Helper functions
function getDateThreshold(period: string): Date {
  const now = new Date()
  switch (period) {
    case 'LAST_3_MONTHS':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case 'LAST_6_MONTHS':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case 'LAST_12_MONTHS':
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  }
}

async function getMarketTrendData(): Promise<MarketTrendData> {
  // In production, this would fetch from external market data APIs
  // For now, return mock trending data
  return {
    trending_themes: [
      {
        theme: 'Minimalist Typography',
        popularity_score: 4.8,
        growth_rate: 0.25,
        demographic: ['millennials', 'professionals', 'startups']
      },
      {
        theme: 'Vintage Retro',
        popularity_score: 4.6,
        growth_rate: 0.18,
        demographic: ['gen-z', 'creatives', 'fashion-forward']
      },
      {
        theme: 'Nature & Sustainability',
        popularity_score: 4.4,
        growth_rate: 0.35,
        demographic: ['eco-conscious', 'outdoor-enthusiasts', 'millennials']
      },
      {
        theme: 'Bold Geometric',
        popularity_score: 4.2,
        growth_rate: 0.15,
        demographic: ['young-adults', 'tech-companies', 'sports-teams']
      },
      {
        theme: 'Hand-drawn Illustrations',
        popularity_score: 4.0,
        growth_rate: 0.22,
        demographic: ['artists', 'small-businesses', 'personal-brands']
      }
    ],
    seasonal_patterns: {
      Q1: {
        peak_months: ['January', 'March'],
        popular_products: ['Hoodies', 'Long Sleeves', 'Corporate Uniforms'],
        color_preferences: ['Navy', 'Black', 'Gray', 'Burgundy']
      },
      Q2: {
        peak_months: ['May', 'June'],
        popular_products: ['T-Shirts', 'Polo Shirts', 'Tank Tops'],
        color_preferences: ['White', 'Light Blue', 'Coral', 'Mint Green']
      },
      Q3: {
        peak_months: ['August', 'September'],
        popular_products: ['Back-to-School Tees', 'Event Shirts', 'Sports Jerseys'],
        color_preferences: ['Bright Colors', 'School Colors', 'Neon Accents']
      },
      Q4: {
        peak_months: ['November', 'December'],
        popular_products: ['Holiday Tees', 'Gift Items', 'Year-end Merchandise'],
        color_preferences: ['Red', 'Green', 'Gold', 'Silver']
      }
    },
    industry_benchmarks: {
      average_reorder_rate: 1.8,
      popular_methods: ['DTG', 'Silkscreen', 'Embroidery', 'Sublimation'],
      price_ranges: {
        'T-Shirt': { min: 200, max: 600 },
        'Hoodie': { min: 800, max: 1500 },
        'Polo Shirt': { min: 400, max: 900 },
        'Tank Top': { min: 180, max: 450 }
      }
    }
  }
}

async function getClientPreferences(client_id: string, orderHistory: OrderHistoryItem[]) {
  // Analyze order history to extract preferences
  const productTypes = [...new Set(orderHistory.map(o => o.product_type))]
  const methods = [...new Set(orderHistory.map(o => o.method))]
  const themes = [...new Set(orderHistory.map(o => o.design_theme).filter(Boolean))]
  
  const avgOrderValue = orderHistory.reduce((sum, o) => sum + o.total_value, 0) / orderHistory.length
  
  return {
    preferred_products: productTypes,
    preferred_methods: methods,
    preferred_styles: themes,
    typical_order_value: Math.round(avgOrderValue),
    price_sensitivity: avgOrderValue < 500 ? 'HIGH' : avgOrderValue < 1000 ? 'MEDIUM' : 'LOW',
    order_frequency: calculateOrderFrequency(orderHistory),
    seasonal_preferences: analyzeSeasonalPreferences(orderHistory)
  }
}

function calculateOrderFrequency(orders: OrderHistoryItem[]): string {
  if (orders.length < 2) return 'NEW_CLIENT'
  
  const sortedOrders = orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const daysBetween = (new Date(sortedOrders[0].created_at).getTime() - new Date(sortedOrders[1].created_at).getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysBetween < 30) return 'FREQUENT'
  if (daysBetween < 90) return 'REGULAR'
  return 'OCCASIONAL'
}

function analyzeSeasonalPreferences(orders: OrderHistoryItem[]) {
  const byQuarter = orders.reduce((acc, order) => {
    const quarter = order.seasonal_period
    if (!acc[quarter]) acc[quarter] = 0
    acc[quarter]++
    return acc
  }, {} as { [key: string]: number })
  
  return Object.entries(byQuarter)
    .sort(([,a], [,b]) => b - a)
    .map(([quarter]) => quarter)
}

async function logAshleyInsight(data: {
  client_id: string
  workspace_id: string
  insight_type: string
  data: any
}) {
  try {
    await db.ashleyInsight.create({
      data: {
        workspace_id: data.workspace_id,
        entity_type: 'client',
        entity_id: data.client_id,
        insight_type: data.insight_type,
        insight_data: data.data,
        confidence_score: 0.85, // Default confidence
        created_at: new Date()
      }
    })
  } catch (_error) {
    console.error('Failed to log Ashley insight:', _error)
  }
}

function calculateClientScore(
  orderHistory: OrderHistoryItem[],
  churnAnalysis: any,
  reprintRecommendations: any[]
): {
  overall_score: number
  loyalty_score: number
  growth_potential: number
  profitability_score: number
} {
  const totalValue = orderHistory.reduce((sum, o) => sum + o.total_value, 0)
  const avgSatisfaction = orderHistory.reduce((sum, o) => sum + (o.client_satisfaction || 4), 0) / orderHistory.length
  
  const loyaltyScore = Math.min(100, (orderHistory.length * 10) + (avgSatisfaction * 10))
  const growthPotential = reprintRecommendations.length > 0 ? 
    reprintRecommendations[0].confidence_score * 100 : 50
  const profitabilityScore = Math.min(100, (totalValue / 10000) * 100)
  
  return {
    overall_score: Math.round((loyaltyScore + growthPotential + profitabilityScore) / 3),
    loyalty_score: Math.round(loyaltyScore),
    growth_potential: Math.round(growthPotential),
    profitability_score: Math.round(profitabilityScore)
  }
}

function generateNextActions(
  reprints: any[],
  themes: any[],
  churn: any
): Array<{
  action: string
  priority: number
  description: string
  expected_impact: string
}> {
  const actions = []
  
  if (churn.churn_risk === 'HIGH') {
    actions.push({
      action: 'URGENT_RETENTION',
      priority: 1,
      description: 'Immediate outreach with personalized offer',
      expected_impact: 'Prevent client churn'
    })
  }
  
  if (reprints.length > 0) {
    actions.push({
      action: 'PRESENT_REPRINT_OPPORTUNITY',
      priority: churn.churn_risk === 'HIGH' ? 3 : 2,
      description: `Present top ${Math.min(3, reprints.length)} reprint recommendations`,
      expected_impact: 'Increase order value and frequency'
    })
  }
  
  if (themes.length > 0) {
    actions.push({
      action: 'INTRODUCE_NEW_THEMES',
      priority: 4,
      description: 'Present trending theme opportunities',
      expected_impact: 'Expand product variety and engagement'
    })
  }
  
  return actions.sort((a, b) => a.priority - b.priority)
}