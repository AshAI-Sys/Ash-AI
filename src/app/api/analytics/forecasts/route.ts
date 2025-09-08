import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const period = searchParams.get("period")
    
    const where: { type?: string; status?: string; period?: string } = {}
    
    if (type) {
      where.type = type
    }
    
    if (status) {
      where.status = status
    }
    
    if (period) {
      where.period = period
    }

    const forecasts = await prisma.forecast.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: forecasts
    })

  } catch (_error) {
    console.error("Error fetching forecasts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch forecasts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Authorization check - admin/manager only
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      name,
      type,
      period,
      algorithm = "LINEAR_REGRESSION",
      parameters,
      createdBy
    } = body

    if (!name || !type || !period || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Name, type, period, and creator are required" },
        { status: 400 }
      )
    }

    // Generate forecast based on type and historical data
    const forecastResult = await generateForecast(type, period, algorithm, parameters)

    const forecast = await prisma.forecast.create({
      data: {
        name,
        type,
        period,
        algorithm,
        accuracy: forecastResult.accuracy,
        parameters: parameters || {},
        inputData: forecastResult.inputData,
        prediction: forecastResult.prediction,
        status: "COMPLETED",
        createdBy
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: forecast
    })

  } catch (_error) {
    console.error("Error creating forecast:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create forecast" },
      { status: 500 }
    )
  }
}

// Forecast generation engine (mock implementation with realistic business logic)
async function generateForecast(type: string, period: string, _algorithm: string, _parameters: unknown) {
  try {
    const targetDate = new Date(period + "-01")
    
    // Get historical data based on forecast type
    let inputData: unknown = {}
    let prediction: unknown = {}
    let accuracy = 0.85 // Base accuracy
    
    switch (type) {
      case "SALES":
        inputData = await getSalesHistoricalData(targetDate)
        prediction = generateSalesForecast(inputData, algorithm)
        accuracy = 0.78 + Math.random() * 0.15 // 78-93% accuracy
        break
        
      case "INVENTORY":
        inputData = await getInventoryHistoricalData(targetDate)
        prediction = generateInventoryForecast(inputData, algorithm)
        accuracy = 0.85 + Math.random() * 0.1 // 85-95% accuracy
        break
        
      case "CASH_FLOW":
        inputData = await getCashFlowHistoricalData(targetDate)
        prediction = generateCashFlowForecast(inputData, algorithm)
        accuracy = 0.72 + Math.random() * 0.18 // 72-90% accuracy
        break
        
      case "DEMAND":
        inputData = await getDemandHistoricalData(targetDate)
        prediction = generateDemandForecast(inputData, algorithm)
        accuracy = 0.80 + Math.random() * 0.12 // 80-92% accuracy
        break
        
      case "PRODUCTION":
        inputData = await getProductionHistoricalData(targetDate)
        prediction = generateProductionForecast(inputData, algorithm)
        accuracy = 0.88 + Math.random() * 0.08 // 88-96% accuracy
        break
        
      default:
        throw new Error(`Unsupported forecast type: ${type}`)
    }
    
    return {
      inputData,
      prediction,
      accuracy: Math.round(accuracy * 1000) / 1000 // Round to 3 decimal places
    }
    
  } catch (_error) {
    console.error("Error generating forecast:", error)
    throw error
  }
}

// Mock historical data generators
async function getSalesHistoricalData(_targetDate: Date) {
  // In real implementation, query actual sales data
  const months = []
  for (let i = 12; i >= 1; i--) {
    const date = new Date(targetDate)
    date.setMonth(date.getMonth() - i)
    
    // Mock seasonal sales pattern with growth trend
    const baseRevenue = 2500000
    const seasonalMultiplier = 1 + 0.3 * Math.sin(date.getMonth() * Math.PI / 6) // Seasonal variation
    const growthMultiplier = 1 + (12 - i) * 0.015 // 1.5% monthly growth
    const randomVariation = 0.9 + Math.random() * 0.2 // ±10% random variation
    
    months.push({
      period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      revenue: Math.round(baseRevenue * seasonalMultiplier * growthMultiplier * randomVariation),
      orders: Math.round(45 + Math.random() * 20),
      averageOrderValue: Math.round(50000 + Math.random() * 20000)
    })
  }
  
  return { monthlyData: months, trend: "increasing", seasonality: "moderate" }
}

async function getInventoryHistoricalData(_targetDate: Date) {
  const materials = ["DTF Film", "Cotton Fabric", "Polyester Blend", "Screen Print Ink", "Embroidery Thread"]
  const data = materials.map(material => ({
    material,
    currentStock: Math.round(500 + Math.random() * 1500),
    avgMonthlyConsumption: Math.round(200 + Math.random() * 300),
    leadTime: Math.round(7 + Math.random() * 14),
    reorderPoint: Math.round(150 + Math.random() * 100)
  }))
  
  return { materials: data, totalValue: 1250000 + Math.random() * 500000 }
}

async function getCashFlowHistoricalData(_targetDate: Date) {
  const months = []
  for (let i = 6; i >= 1; i--) {
    const date = new Date(targetDate)
    date.setMonth(date.getMonth() - i)
    
    months.push({
      period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      inflow: Math.round(2800000 + Math.random() * 600000),
      outflow: Math.round(2200000 + Math.random() * 400000),
      netFlow: Math.round(600000 + Math.random() * 200000)
    })
  }
  
  return { monthlyData: months, trend: "positive" }
}

async function getDemandHistoricalData(_targetDate: Date) {
  const productTypes = ["DTF Prints", "Screen Prints", "Embroidery", "Sublimation", "Heat Transfer"]
  const data = productTypes.map(product => ({
    product,
    avgMonthlyDemand: Math.round(100 + Math.random() * 400),
    trend: Math.random() > 0.3 ? "increasing" : "stable",
    seasonalPattern: Math.random() > 0.5 ? "high_season" : "normal"
  }))
  
  return { productDemand: data }
}

async function getProductionHistoricalData(_targetDate: Date) {
  const stages = ["Design", "Cutting", "Printing", "Sewing", "QC", "Finishing", "Packing", "Delivery"]
  const data = stages.map((stage, index) => ({
    stage,
    avgDailyOutput: Math.round(50 + Math.random() * 100),
    efficiency: Math.round(85 + Math.random() * 10),
    bottleneckRisk: index === 3 || index === 4 ? "medium" : "low" // Sewing and QC are common bottlenecks
  }))
  
  return { stageMetrics: data, overallEfficiency: 89.2 }
}

// Forecast generators using simple algorithms
function generateSalesForecast(inputData: { monthlyData: Array<{ revenue: number }> }, _algorithm: string) {
  const monthlyData = inputData.monthlyData
  const lastMonthRevenue = monthlyData[monthlyData.length - 1].revenue
  
  // Simple linear regression trend
  const trendFactor = 1.015 // 1.5% monthly growth
  const seasonalFactor = 1.1 // Assuming upcoming month is peak season
  
  return {
    projectedRevenue: Math.round(lastMonthRevenue * trendFactor * seasonalFactor),
    projectedOrders: Math.round(45 + Math.random() * 15),
    projectedAOV: Math.round(55000 + Math.random() * 10000),
    confidence: "medium",
    factors: ["historical_trend", "seasonal_adjustment", "market_conditions"]
  }
}

function generateInventoryForecast(inputData: { materials: Array<{ material: string; currentStock: number; reorderPoint: number; avgMonthlyConsumption: number; leadTime: number }>; totalValue: number }, _algorithm: string) {
  const materials = inputData.materials
  const stockouts = materials.filter(m => 
    m.currentStock < m.reorderPoint + (m.avgMonthlyConsumption * m.leadTime / 30)
  )
  
  return {
    stockoutRisk: stockouts.length > 0 ? "high" : "low",
    materialsAtRisk: stockouts.map(m => m.material),
    recommendedOrders: stockouts.map(m => ({
      material: m.material,
      suggestedQuantity: m.avgMonthlyConsumption * 2,
      urgency: "high"
    })),
    totalValue: Math.round(inputData.totalValue * 1.05)
  }
}

function generateCashFlowForecast(inputData: { monthlyData: Array<{ inflow: number; outflow: number }> }, _algorithm: string) {
  const monthlyData = inputData.monthlyData
  const avgInflow = monthlyData.reduce((sum, m) => sum + m.inflow, 0) / monthlyData.length
  const avgOutflow = monthlyData.reduce((sum, m) => sum + m.outflow, 0) / monthlyData.length
  
  return {
    projectedInflow: Math.round(avgInflow * 1.08),
    projectedOutflow: Math.round(avgOutflow * 1.05),
    projectedNetFlow: Math.round((avgInflow * 1.08) - (avgOutflow * 1.05)),
    cashPosition: "healthy",
    recommendations: ["maintain_current_payment_terms", "consider_expansion_investment"]
  }
}

function generateDemandForecast(inputData: { productDemand: Array<{ product: string; avgMonthlyDemand: number; trend: string }> }, _algorithm: string) {
  const productDemand = inputData.productDemand
  
  return {
    topDemandProducts: productDemand
      .sort((a, b) => b.avgMonthlyDemand - a.avgMonthlyDemand)
      .slice(0, 3)
      .map(p => ({
        product: p.product,
        projectedDemand: Math.round(p.avgMonthlyDemand * (p.trend === "increasing" ? 1.15 : 1.02)),
        confidence: p.trend === "increasing" ? "high" : "medium"
      })),
    totalDemandGrowth: "8-12%",
    seasonalAdjustment: "peak_season_expected"
  }
}

function generateProductionForecast(inputData: { stageMetrics: Array<{ stage: string; avgDailyOutput: number; efficiency: number; bottleneckRisk: string }> }, _algorithm: string) {
  const stageMetrics = inputData.stageMetrics
  const bottlenecks = stageMetrics.filter(s => s.bottleneckRisk === "medium" || s.bottleneckRisk === "high")
  
  return {
    projectedCapacity: Math.round(stageMetrics.reduce((sum, s) => sum + s.avgDailyOutput, 0) * 1.05),
    bottleneckStages: bottlenecks.map(b => b.stage),
    efficiencyImprovements: stageMetrics.map(s => ({
      stage: s.stage,
      currentEfficiency: s.efficiency,
      targetEfficiency: Math.min(s.efficiency + 3, 98),
      improvementPotential: `${Math.min(3, 98 - s.efficiency)}%`
    })),
    overallProjection: "capacity_increase_5-8%"
  }
}