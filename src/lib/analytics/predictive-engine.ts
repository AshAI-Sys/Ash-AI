import { PrismaClient } from '@prisma/client'
import WebSocketManager from '@/lib/realtime/websocket-manager'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface MaintenancePrediction {
  id: string
  machineId: string
  machineName: string
  predictedFailureDate: Date
  failureType: string
  probability: number // 0-100%
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendedAction: string
  estimatedDowntime: number // hours
  estimatedCost: number // PHP
  preventiveMaintenanceWindow: {
    start: Date
    end: Date
    duration: number // hours
  }
  indicators: Array<{
    metric: string
    currentValue: number
    threshold: number
    deviation: number
  }>
}

export interface DemandForecast {
  id: string
  productType: string
  method: string
  forecastPeriod: {
    start: Date
    end: Date
    granularity: 'daily' | 'weekly' | 'monthly'
  }
  predictions: Array<{
    date: Date
    predictedDemand: number
    confidence: number
    factors: Array<{ name: string, impact: number }>
  }>
  seasonalityFactors: Array<{ period: string, factor: number }>
  trendAnalysis: {
    direction: 'increasing' | 'decreasing' | 'stable'
    strength: number
    changeRate: number // units per period
  }
}

export interface InventoryOptimization {
  id: string
  itemId: string
  sku: string
  currentStock: number
  recommendations: {
    optimalStockLevel: number
    reorderPoint: number
    orderQuantity: number
    safetyStock: number
  }
  reasoning: {
    demandVariability: number
    leadTimeVariability: number
    serviceLevel: number // %
    carryingCost: number
    orderingCost: number
  }
  costImpact: {
    currentCost: number
    optimizedCost: number
    savings: number
    paybackPeriod: number // months
  }
  riskAssessment: {
    stockoutRisk: number // %
    excessStockRisk: number // %
    obsolescenceRisk: number // %
  }
}

export interface QualityPrediction {
  id: string
  orderId: string
  batchId: string
  predictedDefectRate: number
  qualityScore: number // 0-100
  riskFactors: Array<{
    factor: string
    riskLevel: number
    mitigation: string
  }>
  recommendations: Array<{
    action: string
    priority: 'low' | 'medium' | 'high'
    expectedImprovement: number
  }>
  inspectionSchedule: Array<{
    checkpoint: string
    recommendedTime: Date
    criticalityLevel: number
  }>
}

export interface CapacityForecast {
  id: string
  forecastPeriod: {
    start: Date
    end: Date
  }
  workcenters: Array<{
    name: string
    type: string
    currentCapacity: number
    projectedDemand: number
    utilizationRate: number
    bottleneckRisk: number
    recommendations: string[]
  }>
  overallCapacityUtilization: number
  predictedBottlenecks: Array<{
    workcenter: string
    expectedDate: Date
    severity: number
    mitigationOptions: string[]
  }>
}

class PredictiveEngine {
  private static instance: PredictiveEngine
  private wsManager: WebSocketManager
  private predictionInterval: NodeJS.Timeout | null = null
  private maintenancePredictions = new Map<string, MaintenancePrediction>()
  private demandForecasts = new Map<string, DemandForecast>()
  private inventoryOptimizations = new Map<string, InventoryOptimization>()

  private constructor() {
    this.wsManager = WebSocketManager.getInstance()
  }

  static getInstance(): PredictiveEngine {
    if (!PredictiveEngine.instance) {
      PredictiveEngine.instance = new PredictiveEngine()
    }
    return PredictiveEngine.instance
  }

  async startPredictions() {
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval)
    }

    // Run predictions every 10 minutes
    this.predictionInterval = setInterval(async () => {
      await this.generateMaintenancePredictions()
      await this.generateDemandForecasts()
      await this.optimizeInventoryLevels()
      await this.predictQualityIssues()
      await this.forecastCapacityNeeds()
      await this.broadcastPredictionUpdates()
    }, 600000)

    console.log('🔮 Predictive Engine started')
  }

  stopPredictions() {
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval)
      this.predictionInterval = null
    }
    console.log('🔮 Predictive Engine stopped')
  }

  // Predictive Maintenance
  private async generateMaintenancePredictions() {
    try {
      // Get all active machines
      const machines = await prisma.machine.findMany({
        where: { is_active: true }
      })

      for (const machine of machines) {
        const prediction = await this.predictMachineMaintenance(machine)
        if (prediction) {
          this.maintenancePredictions.set(machine.id, prediction)
          
          // Cache prediction
          await redis.setex(`maintenance_pred:${machine.id}`, 3600, JSON.stringify(prediction))
          
          // Send alert if critical maintenance needed
          if (prediction.severity === 'critical' || prediction.probability > 80) {
            await this.sendMaintenanceAlert(prediction)
          }
        }
      }

      console.log(`🔧 Generated ${this.maintenancePredictions.size} maintenance predictions`)

    } catch (error) {
      console.error('Error generating maintenance predictions:', error)
    }
  }

  private async predictMachineMaintenance(machine: any): Promise<MaintenancePrediction | null> {
    // Simulate machine condition analysis
    const machineAge = this.calculateMachineAge(machine.created_at)
    const usageIntensity = await this.getMachineUsageIntensity(machine.id)
    const lastMaintenanceDate = await this.getLastMaintenanceDate(machine.id)
    
    // Calculate failure probability based on various factors
    let probability = 10 // Base 10% probability
    
    // Age factor (older machines more likely to fail)
    if (machineAge > 5) probability += 15
    else if (machineAge > 3) probability += 8
    
    // Usage intensity factor
    if (usageIntensity > 0.8) probability += 20
    else if (usageIntensity > 0.6) probability += 10
    
    // Maintenance history factor
    const daysSinceLastMaintenance = lastMaintenanceDate ? 
      Math.floor((Date.now() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24)) : 365
    
    if (daysSinceLastMaintenance > 90) probability += 25
    else if (daysSinceLastMaintenance > 60) probability += 15
    
    // Random variation
    probability += Math.random() * 10 - 5 // ±5% random factor
    
    probability = Math.min(95, Math.max(5, probability)) // Clamp between 5-95%

    if (probability < 30) return null // Don't create predictions for low probability

    // Determine failure type and severity
    const failureTypes = ['bearing_wear', 'belt_deterioration', 'motor_overheating', 'calibration_drift']
    const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)]
    
    const severity = probability > 70 ? 'critical' : 
                    probability > 50 ? 'high' : 
                    probability > 30 ? 'medium' : 'low'

    // Calculate predicted failure date
    const daysToFailure = Math.floor((100 - probability) * 2) // Higher probability = sooner failure
    const predictedFailureDate = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000)

    // Preventive maintenance window (before predicted failure)
    const preventiveWindow = {
      start: new Date(predictedFailureDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks before
      end: new Date(predictedFailureDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
      duration: this.getMaintenanceDuration(failureType)
    }

    return {
      id: `maint_pred_${machine.id}_${Date.now()}`,
      machineId: machine.id,
      machineName: machine.name,
      predictedFailureDate,
      failureType,
      probability,
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
      recommendedAction: this.getMaintenanceRecommendation(failureType, severity),
      estimatedDowntime: this.getEstimatedDowntime(failureType, severity),
      estimatedCost: this.getMaintenanceCost(failureType, severity),
      preventiveMaintenanceWindow: preventiveWindow,
      indicators: [
        { metric: 'machine_age', currentValue: machineAge, threshold: 3, deviation: machineAge - 3 },
        { metric: 'usage_intensity', currentValue: usageIntensity * 100, threshold: 60, deviation: (usageIntensity * 100) - 60 },
        { metric: 'days_since_maintenance', currentValue: daysSinceLastMaintenance, threshold: 60, deviation: daysSinceLastMaintenance - 60 }
      ]
    }
  }

  private calculateMachineAge(createdAt: Date): number {
    return (Date.now() - new Date(createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  }

  private async getMachineUsageIntensity(machineId: string): Promise<number> {
    // Simulate usage intensity calculation (0-1 scale)
    return 0.4 + Math.random() * 0.5 // 40-90% usage
  }

  private async getLastMaintenanceDate(machineId: string): Promise<Date | null> {
    // Simulate last maintenance date
    const daysAgo = Math.floor(Math.random() * 120) // 0-120 days ago
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  }

  private getMaintenanceDuration(failureType: string): number {
    const durations = {
      'bearing_wear': 4,
      'belt_deterioration': 2,
      'motor_overheating': 6,
      'calibration_drift': 1
    }
    return durations[failureType as keyof typeof durations] || 3
  }

  private getMaintenanceRecommendation(failureType: string, severity: string): string {
    const recommendations = {
      'bearing_wear': 'Replace worn bearings and lubrication system check',
      'belt_deterioration': 'Replace drive belts and check tension settings',
      'motor_overheating': 'Clean motor vents, check coolant system, inspect electrical connections',
      'calibration_drift': 'Recalibrate sensors and control systems'
    }
    
    const baseRecommendation = recommendations[failureType as keyof typeof recommendations] || 'General maintenance required'
    
    if (severity === 'critical') {
      return `URGENT: ${baseRecommendation}. Schedule immediately to prevent breakdown.`
    }
    
    return baseRecommendation
  }

  private getEstimatedDowntime(failureType: string, severity: string): number {
    const baseDowntime = {
      'bearing_wear': 8,
      'belt_deterioration': 3,
      'motor_overheating': 12,
      'calibration_drift': 2
    }
    
    const base = baseDowntime[failureType as keyof typeof baseDowntime] || 6
    const severityMultiplier = severity === 'critical' ? 1.5 : severity === 'high' ? 1.2 : 1.0
    
    return Math.round(base * severityMultiplier)
  }

  private getMaintenanceCost(failureType: string, severity: string): number {
    const baseCosts = {
      'bearing_wear': 8000,
      'belt_deterioration': 3000,
      'motor_overheating': 15000,
      'calibration_drift': 5000
    }
    
    const base = baseCosts[failureType as keyof typeof baseCosts] || 8000
    const severityMultiplier = severity === 'critical' ? 2.0 : severity === 'high' ? 1.5 : 1.0
    
    return Math.round(base * severityMultiplier)
  }

  // Demand Forecasting
  private async generateDemandForecasts() {
    try {
      const productTypes = await this.getProductTypes()
      
      for (const productType of productTypes) {
        const forecast = await this.forecastDemand(productType)
        if (forecast) {
          this.demandForecasts.set(`${productType.type}_${productType.method}`, forecast)
          
          // Cache forecast
          await redis.setex(`demand_forecast:${productType.type}_${productType.method}`, 7200, JSON.stringify(forecast))
        }
      }

      console.log(`📈 Generated ${this.demandForecasts.size} demand forecasts`)

    } catch (error) {
      console.error('Error generating demand forecasts:', error)
    }
  }

  private async getProductTypes(): Promise<Array<{ type: string, method: string }>> {
    // Get unique product type and method combinations
    return [
      { type: 'T-Shirt', method: 'SILKSCREEN' },
      { type: 'T-Shirt', method: 'SUBLIMATION' },
      { type: 'T-Shirt', method: 'DTF' },
      { type: 'Polo', method: 'EMBROIDERY' },
      { type: 'Hoodie', method: 'SILKSCREEN' }
    ]
  }

  private async forecastDemand(productType: { type: string, method: string }): Promise<DemandForecast> {
    const forecastId = `forecast_${productType.type}_${productType.method}_${Date.now()}`
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Generate daily predictions
    const predictions = []
    let baselinedemand = 15 + Math.random() * 10 // 15-25 base orders per day
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      
      // Seasonal factors
      const dayOfWeek = date.getDay()
      const weekdayFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 1.0 // Weekend reduction
      
      // Monthly trends
      const month = date.getMonth()
      const seasonalFactor = [0.8, 0.9, 1.1, 1.2, 1.3, 1.1, 0.9, 0.8, 1.0, 1.2, 1.4, 1.3][month]
      
      // Random variation
      const randomFactor = 0.8 + Math.random() * 0.4 // ±20% variation
      
      const predictedDemand = Math.round(baselinedemand * weekdayFactor * seasonalFactor * randomFactor)
      const confidence = 80 + Math.random() * 15 // 80-95% confidence
      
      predictions.push({
        date,
        predictedDemand,
        confidence,
        factors: [
          { name: 'seasonal', impact: (seasonalFactor - 1) * 100 },
          { name: 'day_of_week', impact: (weekdayFactor - 1) * 100 },
          { name: 'market_volatility', impact: (randomFactor - 1) * 100 }
        ]
      })
      
      // Slight trend over time
      baselinedemand *= 1.002 // 0.2% daily growth
    }

    return {
      id: forecastId,
      productType: productType.type,
      method: productType.method,
      forecastPeriod: {
        start: startDate,
        end: endDate,
        granularity: 'daily'
      },
      predictions,
      seasonalityFactors: [
        { period: 'Q1', factor: 0.9 },
        { period: 'Q2', factor: 1.2 },
        { period: 'Q3', factor: 0.8 },
        { period: 'Q4', factor: 1.3 }
      ],
      trendAnalysis: {
        direction: 'increasing',
        strength: 0.7,
        changeRate: 2.5 // 2.5 units per month
      }
    }
  }

  // Inventory Optimization
  private async optimizeInventoryLevels() {
    try {
      // Get inventory items that need optimization
      const items = await this.getInventoryItemsForOptimization()
      
      for (const item of items) {
        const optimization = await this.calculateInventoryOptimization(item)
        if (optimization) {
          this.inventoryOptimizations.set(item.id, optimization)
          
          // Cache optimization
          await redis.setex(`inventory_opt:${item.id}`, 3600, JSON.stringify(optimization))
        }
      }

      console.log(`📦 Generated ${this.inventoryOptimizations.size} inventory optimizations`)

    } catch (error) {
      console.error('Error optimizing inventory levels:', error)
    }
  }

  private async getInventoryItemsForOptimization(): Promise<any[]> {
    // Simulate inventory items
    return [
      { id: 'item_1', sku: 'FABRIC-COTTON-WHITE', currentStock: 500, reorderPoint: 100 },
      { id: 'item_2', sku: 'INK-BLACK-500ML', currentStock: 25, reorderPoint: 10 },
      { id: 'item_3', sku: 'THREAD-POLY-BLACK', currentStock: 150, reorderPoint: 50 }
    ]
  }

  private async calculateInventoryOptimization(item: any): Promise<InventoryOptimization> {
    // Simulate demand and lead time analysis
    const avgDemand = 20 + Math.random() * 30 // 20-50 units per period
    const demandVariability = 0.15 + Math.random() * 0.25 // 15-40% CV
    const avgLeadTime = 7 + Math.random() * 14 // 7-21 days
    const leadTimeVariability = 0.1 + Math.random() * 0.2 // 10-30% CV
    const serviceLevel = 95 // 95% service level target
    
    // Economic Order Quantity (EOQ) calculation
    const annualDemand = avgDemand * 365 / 30 // Convert to annual
    const orderingCost = 500 // PHP per order
    const carryingCostRate = 0.25 // 25% per year
    const unitCost = 50 + Math.random() * 100 // PHP 50-150 per unit
    const carryingCost = unitCost * carryingCostRate
    
    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / carryingCost)
    
    // Safety stock calculation
    const zScore = 1.645 // For 95% service level
    const demandDuringLeadTime = avgDemand * (avgLeadTime / 30)
    const demandStdDev = avgDemand * demandVariability
    const leadTimeStdDev = avgLeadTime * leadTimeVariability
    
    const safetyStock = zScore * Math.sqrt(
      Math.pow(demandStdDev, 2) * Math.pow(avgLeadTime, 2) +
      Math.pow(avgDemand, 2) * Math.pow(leadTimeStdDev, 2)
    )
    
    const optimalStockLevel = demandDuringLeadTime + safetyStock
    const reorderPoint = demandDuringLeadTime + safetyStock * 0.8
    
    // Cost analysis
    const currentCost = item.currentStock * carryingCost + (annualDemand / item.currentStock) * orderingCost
    const optimizedCost = optimalStockLevel * carryingCost + (annualDemand / eoq) * orderingCost
    const savings = currentCost - optimizedCost
    
    return {
      id: `inv_opt_${item.id}_${Date.now()}`,
      itemId: item.id,
      sku: item.sku,
      currentStock: item.currentStock,
      recommendations: {
        optimalStockLevel: Math.round(optimalStockLevel),
        reorderPoint: Math.round(reorderPoint),
        orderQuantity: Math.round(eoq),
        safetyStock: Math.round(safetyStock)
      },
      reasoning: {
        demandVariability: Math.round(demandVariability * 100),
        leadTimeVariability: Math.round(leadTimeVariability * 100),
        serviceLevel,
        carryingCost: Math.round(carryingCost),
        orderingCost
      },
      costImpact: {
        currentCost: Math.round(currentCost),
        optimizedCost: Math.round(optimizedCost),
        savings: Math.round(savings),
        paybackPeriod: savings > 0 ? Math.round(12 / (savings / currentCost * 12)) : 999
      },
      riskAssessment: {
        stockoutRisk: Math.round((100 - serviceLevel) * (item.currentStock / optimalStockLevel)),
        excessStockRisk: Math.round(Math.max(0, (item.currentStock - optimalStockLevel) / optimalStockLevel * 100)),
        obsolescenceRisk: Math.round(Math.min(50, (item.currentStock - avgDemand * 6) / avgDemand * 10))
      }
    }
  }

  // Quality Prediction
  private async predictQualityIssues(): Promise<QualityPrediction[]> {
    try {
      const activeOrders = await this.getActiveOrders()
      const predictions: QualityPrediction[] = []
      
      for (const order of activeOrders) {
        const prediction = await this.predictOrderQuality(order)
        if (prediction && prediction.predictedDefectRate > 0.02) { // Only flag if >2% defect rate
          predictions.push(prediction)
          
          // Cache prediction
          await redis.setex(`quality_pred:${order.id}`, 3600, JSON.stringify(prediction))
        }
      }

      console.log(`🎯 Generated ${predictions.length} quality predictions`)
      return predictions

    } catch (error) {
      console.error('Error predicting quality issues:', error)
      return []
    }
  }

  private async getActiveOrders(): Promise<any[]> {
    // Simulate active orders
    return [
      { id: 'order_1', method: 'SILKSCREEN', complexity: 0.7, operator_skill: 0.8 },
      { id: 'order_2', method: 'EMBROIDERY', complexity: 0.9, operator_skill: 0.6 },
      { id: 'order_3', method: 'DTF', complexity: 0.5, operator_skill: 0.9 }
    ]
  }

  private async predictOrderQuality(order: any): Promise<QualityPrediction | null> {
    // Quality prediction based on multiple factors
    let defectRate = 0.02 // Base 2% defect rate
    
    // Method complexity factor
    const methodComplexity = {
      'SILKSCREEN': 1.0,
      'SUBLIMATION': 0.8,
      'DTF': 0.6,
      'EMBROIDERY': 1.4
    }
    
    defectRate *= methodComplexity[order.method as keyof typeof methodComplexity] || 1.0
    
    // Order complexity factor
    defectRate *= (0.5 + order.complexity) // 0.5-1.5 multiplier
    
    // Operator skill factor (inverse relationship)
    defectRate *= (1.5 - order.operator_skill) // Higher skill = lower defect rate
    
    // Random environmental factors
    defectRate *= (0.8 + Math.random() * 0.4) // ±20% variation
    
    const qualityScore = Math.max(0, Math.min(100, 100 - (defectRate * 100 * 20))) // Convert to 0-100 score
    
    if (defectRate < 0.02) return null // No prediction needed for low risk
    
    const riskFactors = []
    if (order.complexity > 0.7) riskFactors.push({ factor: 'high_complexity', riskLevel: 70, mitigation: 'Assign experienced operator' })
    if (order.operator_skill < 0.7) riskFactors.push({ factor: 'operator_inexperience', riskLevel: 60, mitigation: 'Provide additional supervision' })
    if (order.method === 'EMBROIDERY') riskFactors.push({ factor: 'complex_method', riskLevel: 50, mitigation: 'Extra quality checkpoints' })
    
    return {
      id: `quality_pred_${order.id}_${Date.now()}`,
      orderId: order.id,
      batchId: `batch_${order.id}`,
      predictedDefectRate: Math.round(defectRate * 1000) / 10, // Round to 1 decimal
      qualityScore: Math.round(qualityScore),
      riskFactors,
      recommendations: [
        { action: 'Increase inspection frequency', priority: 'high', expectedImprovement: 30 },
        { action: 'Review operator training', priority: 'medium', expectedImprovement: 20 }
      ],
      inspectionSchedule: [
        { checkpoint: '25% completion', recommendedTime: new Date(Date.now() + 6 * 60 * 60 * 1000), criticalityLevel: 80 },
        { checkpoint: '75% completion', recommendedTime: new Date(Date.now() + 18 * 60 * 60 * 1000), criticalityLevel: 90 }
      ]
    }
  }

  // Capacity Forecasting
  private async forecastCapacityNeeds(): Promise<CapacityForecast> {
    const workcenters = [
      { name: 'CUTTING', type: 'cutting', currentCapacity: 200, dailyDemand: 180 },
      { name: 'PRINTING', type: 'printing', currentCapacity: 150, dailyDemand: 170 },
      { name: 'SEWING', type: 'sewing', currentCapacity: 120, dailyDemand: 140 },
      { name: 'QC', type: 'quality', currentCapacity: 250, dailyDemand: 160 }
    ]

    const forecastData = workcenters.map(wc => {
      const utilizationRate = Math.min(100, (wc.dailyDemand / wc.currentCapacity) * 100)
      const bottleneckRisk = Math.max(0, utilizationRate - 85) * 2 // Risk increases above 85%
      
      return {
        name: wc.name,
        type: wc.type,
        currentCapacity: wc.currentCapacity,
        projectedDemand: wc.dailyDemand,
        utilizationRate: Math.round(utilizationRate),
        bottleneckRisk: Math.round(bottleneckRisk),
        recommendations: utilizationRate > 90 ? 
          [`Add additional ${wc.type} capacity`, 'Cross-train operators', 'Optimize workflow'] :
          ['Monitor utilization trends', 'Maintain current capacity']
      }
    })

    const overallUtilization = forecastData.reduce((sum, wc) => sum + wc.utilizationRate, 0) / forecastData.length
    
    const bottlenecks = forecastData
      .filter(wc => wc.bottleneckRisk > 20)
      .map(wc => ({
        workcenter: wc.name,
        expectedDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000), // Within 2 weeks
        severity: wc.bottleneckRisk,
        mitigationOptions: [
          'Increase shift hours',
          'Add temporary capacity',
          'Redistribute workload'
        ]
      }))

    const forecast: CapacityForecast = {
      id: `capacity_forecast_${Date.now()}`,
      forecastPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      workcenters: forecastData,
      overallCapacityUtilization: Math.round(overallUtilization),
      predictedBottlenecks: bottlenecks
    }

    // Cache forecast
    await redis.setex('capacity_forecast', 3600, JSON.stringify(forecast))

    return forecast
  }

  // Notification and Alert Methods
  private async sendMaintenanceAlert(prediction: MaintenancePrediction) {
    const alert = {
      id: `maintenance_alert_${prediction.id}`,
      type: 'machine' as const,
      severity: prediction.severity === 'critical' ? 'critical' as const : 'high' as const,
      title: `Predictive Maintenance Alert: ${prediction.machineName}`,
      message: `${prediction.failureType} predicted with ${prediction.probability}% probability by ${prediction.predictedFailureDate.toLocaleDateString()}`,
      machineId: prediction.machineId,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
  }

  private async broadcastPredictionUpdates() {
    const updateData = {
      maintenancePredictions: Array.from(this.maintenancePredictions.values()).slice(0, 5),
      demandForecasts: Array.from(this.demandForecasts.values()).slice(0, 3),
      inventoryOptimizations: Array.from(this.inventoryOptimizations.values()).slice(0, 5),
      timestamp: new Date().toISOString()
    }

    // This would be broadcasted via WebSocket
    console.log('📡 Prediction updates broadcasted')
  }

  // Public API Methods
  async getMaintenancePredictions(machineId?: string): Promise<MaintenancePrediction[]> {
    if (machineId) {
      const prediction = this.maintenancePredictions.get(machineId)
      return prediction ? [prediction] : []
    }
    
    return Array.from(this.maintenancePredictions.values())
      .sort((a, b) => b.probability - a.probability) // Sort by probability desc
  }

  async getDemandForecast(productType?: string, method?: string): Promise<DemandForecast[]> {
    if (productType && method) {
      const forecast = this.demandForecasts.get(`${productType}_${method}`)
      return forecast ? [forecast] : []
    }
    
    return Array.from(this.demandForecasts.values())
  }

  async getInventoryOptimizations(itemId?: string): Promise<InventoryOptimization[]> {
    if (itemId) {
      const optimization = this.inventoryOptimizations.get(itemId)
      return optimization ? [optimization] : []
    }
    
    return Array.from(this.inventoryOptimizations.values())
      .sort((a, b) => b.costImpact.savings - a.costImpact.savings) // Sort by savings desc
  }

  async getQualityPredictions(orderId?: string): Promise<QualityPrediction[]> {
    try {
      if (orderId) {
        const cached = await redis.get(`quality_pred:${orderId}`)
        return cached ? [JSON.parse(cached)] : []
      }
      
      // Get all quality predictions
      const keys = await redis.keys('quality_pred:*')
      const predictions = []
      
      for (const key of keys) {
        const cached = await redis.get(key)
        if (cached) predictions.push(JSON.parse(cached))
      }
      
      return predictions.sort((a, b) => b.predictedDefectRate - a.predictedDefectRate)
      
    } catch (error) {
      console.error('Error getting quality predictions:', error)
      return []
    }
  }

  async getCapacityForecast(): Promise<CapacityForecast | null> {
    try {
      const cached = await redis.get('capacity_forecast')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting capacity forecast:', error)
      return null
    }
  }

  async getPredictiveDashboard(): Promise<any> {
    const [maintenance, demand, inventory, quality, capacity] = await Promise.all([
      this.getMaintenancePredictions(),
      this.getDemandForecast(),
      this.getInventoryOptimizations(),
      this.getQualityPredictions(),
      this.getCapacityForecast()
    ])

    return {
      summary: {
        criticalMaintenance: maintenance.filter(m => m.severity === 'critical').length,
        demandTrend: demand.length > 0 ? demand[0].trendAnalysis.direction : 'stable',
        inventorySavings: inventory.reduce((sum, i) => sum + i.costImpact.savings, 0),
        qualityRisk: quality.filter(q => q.predictedDefectRate > 5).length,
        capacityBottlenecks: capacity?.predictedBottlenecks.length || 0
      },
      maintenance: maintenance.slice(0, 5),
      demand: demand.slice(0, 3),
      inventory: inventory.slice(0, 5),
      quality: quality.slice(0, 5),
      capacity,
      timestamp: new Date().toISOString()
    }
  }
}

export default PredictiveEngine