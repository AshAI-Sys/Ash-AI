// ASH AI - Advanced Intelligence Engine
// Accurate AI predictions and analysis for apparel production

export interface OrderData {
  id: string
  status: string
  totalQty: number
  createdAt: string
  targetDeliveryDate: string
  method: string
  complexity: number
  clientHistory?: ClientHistory
  productType: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  sizeCurve?: Record<string, number>
  variants?: Array<{ color: string; qty: number }>
}

export interface ClientHistory {
  totalOrders: number
  avgOrderValue: number
  onTimeDeliveryRate: number
  qualityIssueRate: number
  paymentReliability: number
  lastOrderDate: string
}

export interface ProductionMetrics {
  averageProductionTime: number
  qualityPassRate: number
  operatorEfficiency: number
  machineUptime: number
  defectRate: number
  currentCapacity: number
  maxCapacity: number
}

export interface AIInsight {
  type: 'RISK' | 'OPPORTUNITY' | 'OPTIMIZATION' | 'PREDICTION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  confidence: number
  recommendation: string
  impact: string
  data: any
}

export class ASHAIEngine {
  private productionMetrics: ProductionMetrics = {
    averageProductionTime: 7.2, // days
    qualityPassRate: 94.5,
    operatorEfficiency: 87.3,
    machineUptime: 91.2,
    defectRate: 2.8,
    currentCapacity: 75,
    maxCapacity: 100
  }

  // AI-powered delivery prediction
  public predictDeliveryDate(order: OrderData): {
    estimatedDate: string
    confidence: number
    factors: string[]
    risks: string[]
  } {
    const factors: string[] = []
    const risks: string[] = []
    let baseProductionDays = 0
    let confidence = 95

    // Base production time by method and complexity
    const methodMultipliers = {
      'SILKSCREEN': 1.0,
      'DTF': 1.2,
      'SUBLIMATION': 1.4,
      'EMBROIDERY': 1.8
    }

    const productTypeBase = {
      'Tee': 3,
      'Hoodie': 5,
      'Jersey': 4,
      'Uniform': 6,
      'Custom': 7
    }

    baseProductionDays = (productTypeBase[order.productType as keyof typeof productTypeBase] || 5) * 
                        (methodMultipliers[order.method as keyof typeof methodMultipliers] || 1.2)

    // Quantity impact
    if (order.totalQty > 500) {
      baseProductionDays += Math.ceil(order.totalQty / 500) * 2
      factors.push(`Large quantity (${order.totalQty}) adds ${Math.ceil(order.totalQty / 500) * 2} days`)
    }

    // Complexity impact
    const complexityMultiplier = 1 + (order.complexity || 5) / 10
    baseProductionDays *= complexityMultiplier
    factors.push(`Complexity level ${order.complexity || 5}/10`)

    // Variant complexity
    if (order.variants && order.variants.length > 3) {
      baseProductionDays += 1
      factors.push(`Multiple variants (${order.variants.length}) adds complexity`)
    }

    // Size curve complexity
    if (order.sizeCurve && Object.keys(order.sizeCurve).length > 5) {
      baseProductionDays += 0.5
      factors.push('Complex size distribution')
    }

    // Current capacity impact
    const capacityUtilization = this.productionMetrics.currentCapacity / this.productionMetrics.maxCapacity
    if (capacityUtilization > 0.8) {
      baseProductionDays *= 1.3
      confidence -= 15
      risks.push(`High capacity utilization (${Math.round(capacityUtilization * 100)}%)`)
    }

    // Quality considerations
    if (this.productionMetrics.qualityPassRate < 90) {
      baseProductionDays += 1
      confidence -= 10
      risks.push('Recent quality issues may cause delays')
    }

    // Machine uptime considerations  
    if (this.productionMetrics.machineUptime < 85) {
      baseProductionDays += 2
      confidence -= 20
      risks.push('Machine reliability concerns')
    }

    // Client history impact
    if (order.clientHistory) {
      if (order.clientHistory.onTimeDeliveryRate < 80) {
        baseProductionDays += 1
        risks.push('Client historically has tight deadlines')
      }
      if (order.clientHistory.qualityIssueRate > 10) {
        baseProductionDays += 1
        risks.push('Client has high quality standards')
      }
      factors.push(`Client reliability score: ${Math.round(order.clientHistory.paymentReliability)}%`)
    }

    // Priority adjustment
    if (order.priority === 'HIGH') {
      baseProductionDays *= 0.8
      factors.push('High priority - expedited processing')
    }

    // Current date calculations
    const startDate = new Date()
    const estimatedDate = new Date(startDate)
    estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(baseProductionDays))

    return {
      estimatedDate: estimatedDate.toISOString(),
      confidence: Math.max(60, Math.min(95, confidence)),
      factors,
      risks
    }
  }

  // AI Risk Assessment
  public assessOrderRisk(order: OrderData): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    riskScore: number
    riskFactors: string[]
    mitigations: string[]
  } {
    let riskScore = 0
    const riskFactors: string[] = []
    const mitigations: string[] = []

    const targetDate = new Date(order.targetDeliveryDate)
    const created = new Date(order.createdAt)
    const timeToDelivery = (new Date(targetDate).getTime() - new Date(created).getTime()) / (1000 * 60 * 60 * 24)

    // Time pressure analysis
    const prediction = this.predictDeliveryDate(order)
    const predictedDate = new Date(prediction.estimatedDate)
    const daysDifference = (new Date(targetDate).getTime() - new Date(predictedDate).getTime()) / (1000 * 60 * 60 * 24)

    if (daysDifference < 0) {
      riskScore += 40
      riskFactors.push(`Delivery date ${Math.abs(Math.round(daysDifference))} days too tight`)
      mitigations.push('Consider negotiating extended deadline or reducing scope')
    } else if (daysDifference < 2) {
      riskScore += 20
      riskFactors.push('Very tight timeline')
      mitigations.push('Prioritize this order and monitor closely')
    }

    // Quantity risk
    if (order.totalQty > 1000) {
      riskScore += 15
      riskFactors.push(`Large quantity (${order.totalQty}) increases complexity`)
      mitigations.push('Consider batch production and staggered delivery')
    }

    // Method complexity risk
    if (order.method === 'EMBROIDERY' || order.method === 'SUBLIMATION') {
      riskScore += 10
      riskFactors.push(`${order.method} requires specialized skills`)
      mitigations.push('Ensure skilled operators are available')
    }

    // Capacity risk
    const capacityUtil = this.productionMetrics.currentCapacity / this.productionMetrics.maxCapacity
    if (capacityUtil > 0.85) {
      riskScore += 25
      riskFactors.push(`High capacity utilization (${Math.round(capacityUtil * 100)}%)`)
      mitigations.push('Consider outsourcing or overtime shifts')
    }

    // Quality risk
    if (this.productionMetrics.defectRate > 5) {
      riskScore += 20
      riskFactors.push(`High defect rate (${this.productionMetrics.defectRate}%)`)
      mitigations.push('Implement additional QC checkpoints')
    }

    // Client history risk
    if (order.clientHistory) {
      if (order.clientHistory.qualityIssueRate > 15) {
        riskScore += 15
        riskFactors.push('Client has high quality rejection rate')
        mitigations.push('Extra quality checks and client communication')
      }
      if (order.clientHistory.paymentReliability < 80) {
        riskScore += 10
        riskFactors.push('Client payment reliability concerns')
        mitigations.push('Request advance payment or credit check')
      }
    }

    // Variant complexity risk
    if (order.variants && order.variants.length > 5) {
      riskScore += 10
      riskFactors.push(`Multiple variants (${order.variants.length}) increase error risk`)
      mitigations.push('Create detailed production checklist')
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    if (riskScore >= 60) riskLevel = 'CRITICAL'
    else if (riskScore >= 40) riskLevel = 'HIGH'
    else if (riskScore >= 20) riskLevel = 'MEDIUM'
    else riskLevel = 'LOW'

    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      riskFactors,
      mitigations
    }
  }

  // Production optimization recommendations
  public optimizeProduction(orders: OrderData[]): AIInsight[] {
    const insights: AIInsight[] = []

    // Capacity optimization
    const totalQty = orders.reduce((sum, order) => sum + order.totalQty, 0)
    const capacityUtilization = this.productionMetrics.currentCapacity / this.productionMetrics.maxCapacity

    if (capacityUtilization > 0.9) {
      insights.push({
        type: 'OPTIMIZATION',
        severity: 'HIGH',
        title: 'Production Capacity Critical',
        description: `Current capacity at ${Math.round(capacityUtilization * 100)}%. Risk of delays.`,
        confidence: 92,
        recommendation: 'Consider adding shift capacity or outsourcing non-critical orders',
        impact: 'Could prevent 2-3 day delays on current orders',
        data: { utilization: capacityUtilization, totalOrders: orders.length }
      })
    }

    // Method optimization
    const methodCounts = orders.reduce((acc, order) => {
      acc[order.method] = (acc[order.method] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dominantMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]
    if (dominantMethod && dominantMethod[1] > orders.length * 0.6) {
      insights.push({
        type: 'OPTIMIZATION',
        severity: 'MEDIUM',
        title: 'Production Method Clustering',
        description: `${dominantMethod[1]} orders use ${dominantMethod[0]}. Consider batch processing.`,
        confidence: 85,
        recommendation: 'Group similar method orders together for efficiency',
        impact: 'Could reduce setup time by 15-20%',
        data: { method: dominantMethod[0], count: dominantMethod[1] }
      })
    }

    // Quality prediction
    if (this.productionMetrics.defectRate > 3) {
      const highRiskOrders = orders.filter(order => {
        const risk = this.assessOrderRisk(order)
        return risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL'
      })

      if (highRiskOrders.length > 0) {
        insights.push({
          type: 'RISK',
          severity: 'HIGH',
          title: 'Quality Risk Detected',
          description: `${highRiskOrders.length} orders at risk due to current defect rate of ${this.productionMetrics.defectRate}%`,
          confidence: 88,
          recommendation: 'Implement additional QC checks for high-risk orders',
          impact: 'Could prevent quality issues and client complaints',
          data: { riskOrders: highRiskOrders.length, defectRate: this.productionMetrics.defectRate }
        })
      }
    }

    // Delivery predictions
    const urgentOrders = orders.filter(order => {
      const prediction = this.predictDeliveryDate(order)
      const targetDate = new Date(order.targetDeliveryDate)
      const predictedDate = new Date(prediction.estimatedDate)
      return targetDate < predictedDate
    })

    if (urgentOrders.length > 0) {
      insights.push({
        type: 'PREDICTION',
        severity: 'CRITICAL',
        title: 'Delivery Delays Predicted',
        description: `${urgentOrders.length} orders predicted to miss delivery dates`,
        confidence: 91,
        recommendation: 'Prioritize these orders and consider rush production',
        impact: 'Critical for client satisfaction and payment terms',
        data: { delayedOrders: urgentOrders.map(o => o.id) }
      })
    }

    // Opportunity detection
    const lowComplexityOrders = orders.filter(order => (order.complexity || 5) < 3)
    if (lowComplexityOrders.length > orders.length * 0.4) {
      insights.push({
        type: 'OPPORTUNITY',
        severity: 'MEDIUM',
        title: 'Efficiency Opportunity',
        description: `${lowComplexityOrders.length} low-complexity orders can be fast-tracked`,
        confidence: 82,
        recommendation: 'Create express lane for simple orders to improve turnaround',
        impact: 'Could improve client satisfaction and free capacity',
        data: { fastTrackOrders: lowComplexityOrders.length }
      })
    }

    return insights.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  // Smart resource allocation
  public allocateResources(orders: OrderData[]): {
    allocation: Record<string, any>
    recommendations: string[]
    efficiency: number
  } {
    const recommendations: string[] = []
    
    // Method-based operator allocation
    const methodWorkload = orders.reduce((acc, order) => {
      const hours = this.estimateProductionHours(order)
      acc[order.method] = (acc[order.method] || 0) + hours
      return acc
    }, {} as Record<string, number>)

    const totalHours = Object.values(methodWorkload).reduce((sum, hours) => sum + hours, 0)
    const efficiency = Math.min(100, (this.productionMetrics.operatorEfficiency * (this.productionMetrics.currentCapacity / 100)))

    if (methodWorkload['EMBROIDERY'] > totalHours * 0.3) {
      recommendations.push('Consider additional embroidery operators or outsourcing')
    }

    if (methodWorkload['SILKSCREEN'] > totalHours * 0.4) {
      recommendations.push('Optimize screen printing setup for batch processing')
    }

    return {
      allocation: methodWorkload,
      recommendations,
      efficiency
    }
  }

  // Smart pricing recommendations
  public recommendPricing(order: OrderData): {
    suggestedPrice: number
    confidence: number
    factors: string[]
    competitiveAnalysis: string
  } {
    const factors: string[] = []
    let basePrice = 0
    let confidence = 85

    // Base pricing by method and complexity
    const methodPricing = {
      'SILKSCREEN': 150,
      'DTF': 180,
      'SUBLIMATION': 200,
      'EMBROIDERY': 250
    }

    basePrice = methodPricing[order.method as keyof typeof methodPricing] || 175
    factors.push(`Base ${order.method} rate: ₱${basePrice}`)

    // Quantity discounts
    if (order.totalQty > 100) {
      const discount = Math.min(0.25, order.totalQty / 1000)
      basePrice *= (1 - discount)
      factors.push(`Volume discount: ${Math.round(discount * 100)}%`)
    }

    // Complexity premium
    const complexityPremium = ((order.complexity || 5) - 3) * 0.1
    if (complexityPremium > 0) {
      basePrice *= (1 + complexityPremium)
      factors.push(`Complexity premium: ${Math.round(complexityPremium * 100)}%`)
    }

    // Rush order premium
    const targetDate = new Date(order.targetDeliveryDate)
    const prediction = this.predictDeliveryDate(order)
    const predictedDate = new Date(prediction.estimatedDate)
    const daysDiff = (new Date(targetDate).getTime() - new Date(predictedDate).getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff < 3) {
      basePrice *= 1.2
      factors.push('Rush delivery premium: 20%')
      confidence -= 10
    }

    // Client history pricing
    if (order.clientHistory) {
      if (order.clientHistory.totalOrders > 10) {
        basePrice *= 0.95
        factors.push('Loyalty discount: 5%')
      }
      if (order.clientHistory.paymentReliability < 80) {
        basePrice *= 1.1
        factors.push('Payment risk premium: 10%')
        confidence -= 15
      }
    }

    const competitiveAnalysis = this.getCompetitiveAnalysis(basePrice, order.method)

    return {
      suggestedPrice: Math.round(basePrice),
      confidence,
      factors,
      competitiveAnalysis
    }
  }

  // Helper methods
  private estimateProductionHours(order: OrderData): number {
    const baseHours = {
      'SILKSCREEN': 0.5,
      'DTF': 0.7,
      'SUBLIMATION': 0.9,
      'EMBROIDERY': 1.2
    }

    const methodHours = baseHours[order.method as keyof typeof baseHours] || 0.6
    const complexityMultiplier = 1 + ((order.complexity || 5) / 10)
    
    return order.totalQty * methodHours * complexityMultiplier
  }

  private getCompetitiveAnalysis(price: number, method: string): string {
    const marketRates = {
      'SILKSCREEN': { low: 120, avg: 150, high: 180 },
      'DTF': { low: 150, avg: 180, high: 220 },
      'SUBLIMATION': { low: 170, avg: 200, high: 240 },
      'EMBROIDERY': { low: 200, avg: 250, high: 300 }
    }

    const market = marketRates[method as keyof typeof marketRates] || marketRates['SILKSCREEN']
    
    if (price < market.low) return 'Below market rate - consider increasing'
    if (price > market.high) return 'Above market rate - may lose to competitors'
    if (price > market.avg) return 'Premium pricing - justify with quality/service'
    return 'Competitive market positioning'
  }

  // Update production metrics (called periodically)
  public updateMetrics(newMetrics: Partial<ProductionMetrics>): void {
    this.productionMetrics = { ...this.productionMetrics, ...newMetrics }
  }
}

// Singleton instance
export const ashAI = new ASHAIEngine()