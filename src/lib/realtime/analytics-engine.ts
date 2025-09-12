// @ts-nocheck
// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import WebSocketManager from './websocket-manager'
import ProductionTracker from './production-tracker'
import MachineMonitor from './machine-monitor'
import InventoryMonitor from './inventory-monitor'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface RealTimeKPI {
  id: string
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  target?: number
  status: 'good' | 'warning' | 'critical'
  lastUpdate: Date
}

export interface ProductionAnalytics {
  currentHour: {
    ordersCompleted: number
    efficiency: number
    throughput: number
    qualityRate: number
  }
  currentDay: {
    ordersCompleted: number
    efficiency: number
    revenue: number
    qualityRate: number
  }
  realTimeMetrics: {
    activeOrders: number
    bottlenecks: number
    delayedOrders: number
    onTimeDelivery: number
  }
  trends: {
    hourly: Array<{ hour: string, value: number }>
    daily: Array<{ date: string, value: number }>
  }
}

export interface OperationalAnalytics {
  machines: {
    totalUtilization: number
    averageOEE: number
    downtimeMinutes: number
    maintenanceAlerts: number
  }
  inventory: {
    totalItems: number
    lowStockItems: number
    stockTurnover: number
    wastePercentage: number
  }
  workforce: {
    activeOperators: number
    productivity: number
    attendanceRate: number
    overtime: number
  }
}

export interface PredictiveAnalytics {
  demandForecast: Array<{ period: string, predicted: number, confidence: number }>
  capacityForecast: Array<{ period: string, capacity: number, demand: number }>
  maintenancePrediction: Array<{ machineId: string, predictedDate: Date, confidence: number }>
  inventoryOptimization: Array<{ itemId: string, recommendedStock: number, reasoning: string }>
}

class AnalyticsEngine {
  private static instance: AnalyticsEngine
  private wsManager: WebSocketManager
  private analyticsInterval: NodeJS.Timeout | null = null
  private kpiCache = new Map<string, RealTimeKPI>()

  private constructor() {
    this.wsManager = WebSocketManager.getInstance()
  }

  static getInstance(): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine()
    }
    return AnalyticsEngine.instance
  }

  startAnalytics() {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval)
    }

    // Calculate analytics every 30 seconds
    this.analyticsInterval = setInterval(async () => {
      await this.calculateRealTimeKPIs()
      await this.generateProductionAnalytics()
      await this.generateOperationalAnalytics()
      await this.broadcastAnalyticsUpdate()
    }, 30000)

    console.log('Real-time analytics engine started')
  }

  stopAnalytics() {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval)
      this.analyticsInterval = null
    }
    console.log('Real-time analytics engine stopped')
  }

  private async calculateRealTimeKPIs() {
    try {
      const kpis = await Promise.all([
        this.calculateThroughputKPI(),
        this.calculateEfficiencyKPI(),
        this.calculateQualityKPI(),
        this.calculateOTDKPI(), // On-Time Delivery
        this.calculateUtilizationKPI(),
        this.calculateInventoryTurnoverKPI(),
        this.calculateRevenueKPI(),
        this.calculateCostPerUnitKPI()
      ])

      kpis.forEach(kpi => {
        this.kpiCache.set(kpi.id, kpi)
      })

      // Cache KPIs in Redis
      await redis.setex('analytics:kpis', 300, JSON.stringify(Array.from(this.kpiCache.values())))

    } catch (error) {
      console.error('Error calculating real-time KPIs:', error)
    }
  }

  private async calculateThroughputKPI(): Promise<RealTimeKPI> {
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0)
    
    const completedThisHour = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        updated_at: {
          gte: currentHour
        }
      }
    })

    const previousHour = new Date(currentHour.getTime() - 60 * 60 * 1000)
    const completedPreviousHour = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        updated_at: {
          gte: previousHour,
          lt: currentHour
        }
      }
    })

    const trendPercent = completedPreviousHour > 0 
      ? ((completedThisHour - completedPreviousHour) / completedPreviousHour) * 100
      : 0

    return {
      id: 'throughput',
      name: 'Hourly Throughput',
      value: completedThisHour,
      unit: 'orders',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 10, // Target 10 orders per hour
      status: completedThisHour >= 8 ? 'good' : completedThisHour >= 5 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateEfficiencyKPI(): Promise<RealTimeKPI> {
    const productionTracker = ProductionTracker.getInstance()
    const summary = await productionTracker.getProductionSummary()
    
    const efficiency = summary?.overallEfficiency || 0
    const previousEfficiency = await this.getPreviousEfficiency()
    const trendPercent = previousEfficiency > 0 
      ? ((efficiency - previousEfficiency) / previousEfficiency) * 100
      : 0

    return {
      id: 'efficiency',
      name: 'Production Efficiency',
      value: efficiency,
      unit: '%',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 85,
      status: efficiency >= 80 ? 'good' : efficiency >= 60 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateQualityKPI(): Promise<RealTimeKPI> {
    // Calculate quality rate from QC data
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // This would be calculated from actual QC data
    // For now, using simulated data
    const qualityRate = 96.5 + (Math.random() - 0.5) * 5 // Simulate 94-99% range

    const previousQuality = await redis.get('analytics:previous:quality')
    const prevValue = previousQuality ? parseFloat(previousQuality) : qualityRate
    const trendPercent = ((qualityRate - prevValue) / prevValue) * 100

    await redis.setex('analytics:previous:quality', 3600, qualityRate.toString())

    return {
      id: 'quality',
      name: 'Quality Rate',
      value: Math.round(qualityRate * 100) / 100,
      unit: '%',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 95,
      status: qualityRate >= 95 ? 'good' : qualityRate >= 90 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateOTDKPI(): Promise<RealTimeKPI> {
    const productionTracker = ProductionTracker.getInstance()
    const summary = await productionTracker.getProductionSummary()
    
    const otd = summary?.onTimeDelivery || 0
    const previousOTD = await redis.get('analytics:previous:otd')
    const prevValue = previousOTD ? parseFloat(previousOTD) : otd
    const trendPercent = prevValue > 0 ? ((otd - prevValue) / prevValue) * 100 : 0

    await redis.setex('analytics:previous:otd', 3600, otd.toString())

    return {
      id: 'otd',
      name: 'On-Time Delivery',
      value: Math.round(otd * 100) / 100,
      unit: '%',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 90,
      status: otd >= 85 ? 'good' : otd >= 70 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateUtilizationKPI(): Promise<RealTimeKPI> {
    const machineMonitor = MachineMonitor.getInstance()
    const machines = await machineMonitor.getAllMachineStatuses()
    
    const totalUtilization = machines.length > 0 
      ? machines.reduce((sum, machine) => sum + machine.utilization, 0) / machines.length
      : 0

    const previousUtilization = await redis.get('analytics:previous:utilization')
    const prevValue = previousUtilization ? parseFloat(previousUtilization) : totalUtilization
    const trendPercent = prevValue > 0 ? ((totalUtilization - prevValue) / prevValue) * 100 : 0

    await redis.setex('analytics:previous:utilization', 3600, totalUtilization.toString())

    return {
      id: 'utilization',
      name: 'Machine Utilization',
      value: Math.round(totalUtilization * 100) / 100,
      unit: '%',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 75,
      status: totalUtilization >= 70 ? 'good' : totalUtilization >= 50 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateInventoryTurnoverKPI(): Promise<RealTimeKPI> {
    const inventoryMonitor = InventoryMonitor.getInstance()
    const summary = await inventoryMonitor.getInventorySummary()
    
    // Simplified inventory turnover calculation
    const turnover = summary?.totalValue ? (summary.recentMovements / summary.totalValue) * 1000 : 0
    
    const previousTurnover = await redis.get('analytics:previous:turnover')
    const prevValue = previousTurnover ? parseFloat(previousTurnover) : turnover
    const trendPercent = prevValue > 0 ? ((turnover - prevValue) / prevValue) * 100 : 0

    await redis.setex('analytics:previous:turnover', 3600, turnover.toString())

    return {
      id: 'inventory_turnover',
      name: 'Inventory Turnover',
      value: Math.round(turnover * 100) / 100,
      unit: 'x',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 5,
      status: turnover >= 4 ? 'good' : turnover >= 2 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateRevenueKPI(): Promise<RealTimeKPI> {
    // Calculate today's revenue
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayRevenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        updated_at: {
          gte: today
        }
      },
      _sum: {
        total_price: true
      }
    })

    const revenue = parseFloat(todayRevenue._sum.total_price?.toString() || '0')

    // Get yesterday's revenue for comparison
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayRevenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        updated_at: {
          gte: yesterday,
          lt: today
        }
      },
      _sum: {
        total_price: true
      }
    })

    const prevRevenue = parseFloat(yesterdayRevenue._sum.total_price?.toString() || '0')
    const trendPercent = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0

    return {
      id: 'revenue',
      name: 'Daily Revenue',
      value: revenue,
      unit: 'PHP',
      trend: trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'stable',
      trendPercent: Math.abs(trendPercent),
      target: 50000, // Target ₱50,000 daily
      status: revenue >= 40000 ? 'good' : revenue >= 25000 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async calculateCostPerUnitKPI(): Promise<RealTimeKPI> {
    // Simplified cost per unit calculation
    const totalOrders = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        updated_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    // Estimated cost per unit (would be calculated from actual cost data)
    const estimatedCostPerUnit = totalOrders > 0 ? 150 + (Math.random() - 0.5) * 20 : 150

    const previousCost = await redis.get('analytics:previous:cost_per_unit')
    const prevValue = previousCost ? parseFloat(previousCost) : estimatedCostPerUnit
    const trendPercent = ((estimatedCostPerUnit - prevValue) / prevValue) * 100

    await redis.setex('analytics:previous:cost_per_unit', 3600, estimatedCostPerUnit.toString())

    return {
      id: 'cost_per_unit',
      name: 'Cost Per Unit',
      value: Math.round(estimatedCostPerUnit * 100) / 100,
      unit: 'PHP',
      trend: trendPercent < 0 ? 'up' : trendPercent > 0 ? 'down' : 'stable', // Lower cost is better
      trendPercent: Math.abs(trendPercent),
      target: 140,
      status: estimatedCostPerUnit <= 140 ? 'good' : estimatedCostPerUnit <= 160 ? 'warning' : 'critical',
      lastUpdate: new Date()
    }
  }

  private async getPreviousEfficiency(): Promise<number> {
    const previous = await redis.get('analytics:previous:efficiency')
    return previous ? parseFloat(previous) : 0
  }

  private async generateProductionAnalytics(): Promise<ProductionAnalytics> {
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0, 0)
    
    const currentDay = new Date()
    currentDay.setHours(0, 0, 0, 0)

    const productionTracker = ProductionTracker.getInstance()
    const summary = await productionTracker.getProductionSummary()

    // Current hour metrics
    const hourlyCompleted = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        updated_at: { gte: currentHour }
      }
    })

    // Current day metrics
    const dailyCompleted = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        updated_at: { gte: currentDay }
      }
    })

    const dailyRevenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        updated_at: { gte: currentDay }
      },
      _sum: { total_price: true }
    })

    // Generate hourly trend data
    const hourlyTrends = await this.generateHourlyTrends()
    const dailyTrends = await this.generateDailyTrends()

    const analytics: ProductionAnalytics = {
      currentHour: {
        ordersCompleted: hourlyCompleted,
        efficiency: summary?.overallEfficiency || 0,
        throughput: hourlyCompleted,
        qualityRate: summary?.qualityPassRate || 0
      },
      currentDay: {
        ordersCompleted: dailyCompleted,
        efficiency: summary?.overallEfficiency || 0,
        revenue: parseFloat(dailyRevenue._sum.total_price?.toString() || '0'),
        qualityRate: summary?.qualityPassRate || 0
      },
      realTimeMetrics: {
        activeOrders: summary?.totalActiveOrders || 0,
        bottlenecks: summary?.bottleneckWorkcenters.length || 0,
        delayedOrders: 0, // Would calculate from production tracker
        onTimeDelivery: summary?.onTimeDelivery || 0
      },
      trends: {
        hourly: hourlyTrends,
        daily: dailyTrends
      }
    }

    // Cache the analytics
    await redis.setex('analytics:production', 300, JSON.stringify(analytics))
    
    return analytics
  }

  private async generateHourlyTrends(): Promise<Array<{ hour: string, value: number }>> {
    const trends = []
    const currentHour = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const hour = new Date(currentHour.getTime() - i * 60 * 60 * 1000)
      hour.setMinutes(0, 0, 0)
      const nextHour = new Date(hour.getTime() + 60 * 60 * 1000)
      
      const completed = await prisma.order.count({
        where: {
          status: 'DELIVERED',
          updated_at: {
            gte: hour,
            lt: nextHour
          }
        }
      })
      
      trends.push({
        hour: hour.getHours().toString().padStart(2, '0') + ':00',
        value: completed
      })
    }
    
    return trends
  }

  private async generateDailyTrends(): Promise<Array<{ date: string, value: number }>> {
    const trends = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      
      const completed = await prisma.order.count({
        where: {
          status: 'DELIVERED',
          updated_at: {
            gte: date,
            lt: nextDate
          }
        }
      })
      
      trends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: completed
      })
    }
    
    return trends
  }

  private async generateOperationalAnalytics(): Promise<OperationalAnalytics> {
    const machineMonitor = MachineMonitor.getInstance()
    const inventoryMonitor = InventoryMonitor.getInstance()
    
    const machines = await machineMonitor.getAllMachineStatuses()
    const inventorySummary = await inventoryMonitor.getInventorySummary()

    // Machine analytics
    const totalUtilization = machines.length > 0 
      ? machines.reduce((sum, m) => sum + m.utilization, 0) / machines.length
      : 0

    const averageOEE = machines.length > 0 
      ? machines.reduce((sum, m) => sum + m.oee, 0) / machines.length
      : 0

    // Workforce analytics (simulated for now)
    const activeOperators = await this.getActiveOperators()
    
    const analytics: OperationalAnalytics = {
      machines: {
        totalUtilization,
        averageOEE,
        downtimeMinutes: await this.getTotalDowntime(),
        maintenanceAlerts: machines.filter(m => m.status === 'maintenance').length
      },
      inventory: {
        totalItems: inventorySummary?.totalItems || 0,
        lowStockItems: inventorySummary?.lowStockItems || 0,
        stockTurnover: 4.2, // Simulated
        wastePercentage: 2.1 // Simulated
      },
      workforce: {
        activeOperators,
        productivity: 87.5, // Simulated
        attendanceRate: 94.2, // Simulated
        overtime: 12.3 // Simulated hours
      }
    }

    await redis.setex('analytics:operational', 300, JSON.stringify(analytics))
    
    return analytics
  }

  private async getActiveOperators(): Promise<number> {
    // In a real system, this would query active user sessions or clock-in data
    return Math.floor(Math.random() * 20) + 15 // Simulate 15-35 operators
  }

  private async getTotalDowntime(): Promise<number> {
    // Calculate total downtime across all machines for today
    return Math.floor(Math.random() * 120) + 30 // Simulate 30-150 minutes
  }

  private async broadcastAnalyticsUpdate() {
    try {
      const analyticsData = {
        kpis: Array.from(this.kpiCache.values()),
        timestamp: new Date().toISOString()
      }

      await this.wsManager.broadcastAnalytics(analyticsData)
      
    } catch (error) {
      console.error('Error broadcasting analytics update:', error)
    }
  }

  // Public API methods
  async getRealTimeKPIs(): Promise<RealTimeKPI[]> {
    return Array.from(this.kpiCache.values())
  }

  async getProductionAnalytics(): Promise<ProductionAnalytics | null> {
    try {
      const cached = await redis.get('analytics:production')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting production analytics:', error)
      return null
    }
  }

  async getOperationalAnalytics(): Promise<OperationalAnalytics | null> {
    try {
      const cached = await redis.get('analytics:operational')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting operational analytics:', error)
      return null
    }
  }

  async generatePredictiveAnalytics(): Promise<PredictiveAnalytics> {
    // This would use machine learning models in production
    // For now, generating simulated predictive data
    
    const demandForecast = this.generateDemandForecast()
    const capacityForecast = this.generateCapacityForecast()
    const maintenancePrediction = await this.generateMaintenancePrediction()
    const inventoryOptimization = await this.generateInventoryOptimization()

    const predictive: PredictiveAnalytics = {
      demandForecast,
      capacityForecast,
      maintenancePrediction,
      inventoryOptimization
    }

    await redis.setex('analytics:predictive', 1800, JSON.stringify(predictive)) // 30 min cache

    return predictive
  }

  private generateDemandForecast(): Array<{ period: string, predicted: number, confidence: number }> {
    const forecast = []
    const baseOrders = 25
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      
      // Simulate demand with seasonal variations
      const seasonal = 1 + Math.sin(i / 7 * Math.PI) * 0.2
      const predicted = Math.floor(baseOrders * seasonal * (0.8 + Math.random() * 0.4))
      const confidence = 85 + Math.random() * 10
      
      forecast.push({
        period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        predicted,
        confidence: Math.round(confidence)
      })
    }
    
    return forecast
  }

  private generateCapacityForecast(): Array<{ period: string, capacity: number, demand: number }> {
    const forecast = []
    const baseCapacity = 30
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      
      const capacity = baseCapacity + Math.floor(Math.random() * 10) - 5
      const demand = 20 + Math.floor(Math.random() * 15)
      
      forecast.push({
        period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        capacity,
        demand
      })
    }
    
    return forecast
  }

  private async generateMaintenancePrediction(): Promise<Array<{ machineId: string, predictedDate: Date, confidence: number }>> {
    const machineMonitor = MachineMonitor.getInstance()
    const machines = await machineMonitor.getAllMachineStatuses()
    
    const predictions = []
    
    for (const machine of machines.slice(0, 3)) { // Top 3 machines needing maintenance
      const daysUntilMaintenance = Math.floor(Math.random() * 30) + 1
      const predictedDate = new Date()
      predictedDate.setDate(predictedDate.getDate() + daysUntilMaintenance)
      
      predictions.push({
        machineId: machine.machineId,
        predictedDate,
        confidence: 70 + Math.floor(Math.random() * 25)
      })
    }
    
    return predictions
  }

  private async generateInventoryOptimization(): Promise<Array<{ itemId: string, recommendedStock: number, reasoning: string }>> {
    const inventoryMonitor = InventoryMonitor.getInstance()
    const items = await inventoryMonitor.getAllInventoryStatuses()
    
    const optimization = []
    
    for (const item of items.slice(0, 5)) { // Top 5 items to optimize
      const recommendedStock = Math.floor(item.minStock * (1.5 + Math.random() * 0.5))
      const reasons = [
        'High consumption rate detected',
        'Seasonal demand increase expected',
        'Lead time uncertainty',
        'Stockout risk detected',
        'Demand volatility observed'
      ]
      
      optimization.push({
        itemId: item.itemId,
        recommendedStock,
        reasoning: reasons[Math.floor(Math.random() * reasons.length)]
      })
    }
    
    return optimization
  }

  // Manual analytics triggers
  async forceKPIUpdate() {
    await this.calculateRealTimeKPIs()
    await this.broadcastAnalyticsUpdate()
  }

  async generateCustomReport(params: {
    startDate: Date
    endDate: Date
    metrics: string[]
    groupBy: 'hour' | 'day' | 'week'
  }) {
    // Generate custom analytics report based on parameters
    // This would be implemented based on specific requirements
    console.log('Generating custom report:', params)
    
    return {
      message: 'Custom report generation not yet implemented',
      params
    }
  }
}

export default AnalyticsEngine