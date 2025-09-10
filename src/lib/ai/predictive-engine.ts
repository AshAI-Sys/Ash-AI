// 🤖 ASH AI - Advanced Predictive Analytics Engine  
// Machine Learning models for production optimization and business intelligence

import { OpenAI } from 'openai'
import { prisma } from '@/lib/prisma'

interface PredictionResult {
  confidence: number // 0-1
  prediction: any
  factors: string[]
  recommendations: string[]
  timeframe: string
  modelVersion: string
}

interface ProductionMetrics {
  efficiency: number
  defectRate: number
  throughput: number
  bottlenecks: string[]
  resourceUtilization: number
}

interface DemandForecast {
  product: string
  predictedDemand: number
  seasonality: number
  trend: 'increasing' | 'decreasing' | 'stable'
  confidenceInterval: [number, number]
}

class PredictiveAnalyticsEngine {
  private openai: OpenAI
  private modelCache: Map<string, any> = new Map()

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.ASH_OPENAI_API_KEY || process.env.OPENAI_API_KEY
    })
  }

  // 📊 PRODUCTION EFFICIENCY PREDICTION
  async predictProductionEfficiency(
    order_id: string, 
    historicalData?: any[]
  ): Promise<PredictionResult> {
    try {
      // Get historical production data
      const history = historicalData || await this.getProductionHistory(order_id)
      
      // Extract features for prediction
      const features = this.extractProductionFeatures(history)
      
      // Use AI model for prediction
      const prompt = `
        Analyze production data and predict efficiency:
        
        Historical Data:
        ${JSON.stringify(features, null, 2)}
        
        Predict:
        1. Expected efficiency percentage (0-100%)
        2. Potential bottlenecks
        3. Resource utilization optimization
        4. Timeline for completion
        5. Risk factors
        
        Return JSON with: efficiency, bottlenecks, recommendations, riskLevel
      `

      const response = await this.openai.chat.completions.create({
        model: process.env.ASH_AI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are Ashley AI, an expert production efficiency analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        confidence: this.calculateConfidence(features.dataPoints),
        prediction: {
          efficiency: analysis.efficiency,
          bottlenecks: analysis.bottlenecks,
          estimatedCompletion: analysis.timeline,
          riskLevel: analysis.riskLevel
        },
        factors: this.identifyKeyFactors(features),
        recommendations: analysis.recommendations || [],
        timeframe: '48-72 hours',
        modelVersion: 'v2.1-production'
      }
    } catch (_error) {
      console.error('Production efficiency prediction failed:', error)
      throw new Error('Failed to predict production efficiency')
    }
  }

  // 📈 DEMAND FORECASTING
  async forecastDemand(
    productCategory: string,
    timeHorizon: number = 90 // days
  ): Promise<DemandForecast[]> {
    try {
      // Get historical sales data
      const salesHistory = await this.getSalesHistory(productCategory, timeHorizon * 4) // 4x timeframe for analysis
      
      // Prepare data for AI analysis
      const prompt = `
        Analyze sales data and forecast demand:
        
        Product Category: ${productCategory}
        Forecast Period: ${timeHorizon} days
        Historical Sales Data:
        ${JSON.stringify(salesHistory, null, 2)}
        
        Consider:
        - Seasonal patterns
        - Market trends
        - Economic factors
        - Fashion cycles
        - External events
        
        Return JSON array of forecasts with: product, predictedDemand, seasonality, trend, confidenceInterval
      `

      const response = await this.openai.chat.completions.create({
        model: process.env.ASH_AI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are Ashley AI, specializing in demand forecasting for apparel manufacturing.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })

      const forecast = JSON.parse(response.choices[0].message.content || '{"forecasts": []}')
      
      return forecast.forecasts || []
    } catch (_error) {
      console.error('Demand forecasting failed:', error)
      throw new Error('Failed to forecast demand')
    }
  }

  // 🚨 QUALITY PREDICTION & ANOMALY DETECTION
  async predictQualityIssues(
    order_id: string,
    productionStage: string
  ): Promise<PredictionResult> {
    try {
      // Get QC history and production parameters
      const qcHistory = await this.getQCHistory(order_id)
      const productionData = await this.getStageParameters(order_id, productionStage)
      
      const prompt = `
        Predict quality issues based on production parameters:
        
        Order ID: ${order_id}
        Production Stage: ${productionStage}
        QC History: ${JSON.stringify(qcHistory)}
        Production Parameters: ${JSON.stringify(productionData)}
        
        Analyze:
        - Defect probability by type
        - Critical control points
        - Process variations
        - Environmental factors
        
        Return JSON with: defectProbability, criticalPoints, preventiveActions, monitoringRequirements
      `

      const response = await this.openai.chat.completions.create({
        model: process.env.ASH_AI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are Ashley AI, a quality control expert with deep knowledge of textile manufacturing.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Low temperature for quality predictions
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        confidence: this.calculateQualityConfidence(qcHistory),
        prediction: analysis,
        factors: this.identifyQualityFactors(productionData),
        recommendations: analysis.preventiveActions || [],
        timeframe: 'Next 24 hours',
        modelVersion: 'v2.1-quality'
      }
    } catch (_error) {
      console.error('Quality prediction failed:', error)
      throw new Error('Failed to predict quality issues')
    }
  }

  // 💰 COST OPTIMIZATION ANALYSIS
  async analyzeCostOptimization(
    order_id: string,
    currentCosts: any
  ): Promise<PredictionResult> {
    try {
      const historicalCosts = await this.getCostHistory(order_id)
      const marketRates = await this.getMarketRates()
      
      const prompt = `
        Analyze cost optimization opportunities:
        
        Current Costs: ${JSON.stringify(currentCosts)}
        Historical Cost Data: ${JSON.stringify(historicalCosts)}
        Market Rates: ${JSON.stringify(marketRates)}
        
        Find optimization opportunities in:
        - Material sourcing
        - Labor allocation
        - Energy efficiency
        - Waste reduction
        - Process improvements
        
        Return JSON with: potentialSavings, optimizationAreas, implementationPlan, roi
      `

      const response = await this.openai.chat.completions.create({
        model: process.env.ASH_AI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are Ashley AI, a cost optimization specialist for manufacturing operations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        confidence: 0.8, // Cost analysis typically has high confidence
        prediction: analysis,
        factors: ['material_prices', 'labor_rates', 'energy_costs', 'waste_levels'],
        recommendations: analysis.implementationPlan || [],
        timeframe: '30-60 days',
        modelVersion: 'v2.1-cost'
      }
    } catch (_error) {
      console.error('Cost optimization analysis failed:', error)
      throw new Error('Failed to analyze cost optimization')
    }
  }

  // 🎯 CAPACITY PLANNING PREDICTION
  async predictCapacityRequirements(
    timeHorizon: number = 30, // days
    demandForecast?: DemandForecast[]
  ): Promise<PredictionResult> {
    try {
      const currentCapacity = await this.getCurrentCapacity()
      const forecast = demandForecast || await this.forecastDemand('all', timeHorizon)
      
      const prompt = `
        Predict capacity requirements:
        
        Time Horizon: ${timeHorizon} days
        Current Capacity: ${JSON.stringify(currentCapacity)}
        Demand Forecast: ${JSON.stringify(forecast)}
        
        Calculate:
        - Required capacity by workcenter
        - Bottleneck predictions
        - Staffing requirements
        - Equipment utilization
        - Overflow scenarios
        
        Return JSON with: requiredCapacity, bottlenecks, staffingPlan, equipmentNeeds
      `

      const response = await this.openai.chat.completions.create({
        model: process.env.ASH_AI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are Ashley AI, expert in production capacity planning and resource optimization.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        confidence: 0.85,
        prediction: analysis,
        factors: ['demand_growth', 'seasonal_variation', 'equipment_availability', 'labor_constraints'],
        recommendations: this.generateCapacityRecommendations(analysis),
        timeframe: `${timeHorizon} days`,
        modelVersion: 'v2.1-capacity'
      }
    } catch (_error) {
      console.error('Capacity planning prediction failed:', error)
      throw new Error('Failed to predict capacity requirements')
    }
  }

  // 🏆 PERFORMANCE BENCHMARKING
  async benchmarkPerformance(
    order_id: string,
    metrics: ProductionMetrics
  ): Promise<PredictionResult> {
    try {
      const industryBenchmarks = await this.getIndustryBenchmarks()
      const peerComparison = await this.getPeerPerformanceData()
      
      const prompt = `
        Benchmark production performance:
        
        Current Metrics: ${JSON.stringify(metrics)}
        Industry Benchmarks: ${JSON.stringify(industryBenchmarks)}
        Peer Comparison: ${JSON.stringify(peerComparison)}
        
        Analyze:
        - Performance gaps
        - Improvement opportunities
        - Best practice recommendations
        - Competitive positioning
        
        Return JSON with: performanceScore, gaps, improvements, competitiveAnalysis
      `

      const response = await this.openai.chat.completions.create({
        model: process.env.ASH_AI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are Ashley AI, performance benchmarking expert for manufacturing operations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        confidence: 0.75,
        prediction: analysis,
        factors: ['efficiency_gap', 'quality_variance', 'cost_differential', 'time_to_market'],
        recommendations: analysis.improvements || [],
        timeframe: 'Continuous improvement',
        modelVersion: 'v2.1-benchmark'
      }
    } catch (_error) {
      console.error('Performance benchmarking failed:', error)
      throw new Error('Failed to benchmark performance')
    }
  }

  // HELPER METHODS
  private async getProductionHistory(order_id: string) {
    return await prisma.productionLog.findMany({
      where: { order_id },
      orderBy: { created_at: 'desc' },
      take: 100
    })
  }

  private async getSalesHistory(category: string, days: number) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return await prisma.order.findMany({
      where: {
        productType: category,
        created_at: { gte: startDate },
        status: { in: ['DELIVERED', 'COMPLETED'] }
      },
      select: {
        id: true,
        total_qty: true,
        commercials: true,
        created_at: true,
        deliveredAt: true
      }
    })
  }

  private async getQCHistory(order_id: string) {
    return await prisma.qcInspection.findMany({
      where: { order_id },
      include: {
        defects: true,
        samples: true
      }
    })
  }

  private async getCurrentCapacity() {
    // Mock implementation - in real scenario, this would query actual capacity data
    return {
      cutting: { available: 1000, utilization: 0.75 },
      printing: { available: 800, utilization: 0.82 },
      sewing: { available: 1200, utilization: 0.88 },
      qc: { available: 400, utilization: 0.65 },
      packing: { available: 600, utilization: 0.70 }
    }
  }

  private extractProductionFeatures(history: any[]) {
    return {
      dataPoints: history.length,
      averageEfficiency: history.reduce((sum, h) => sum + (h.efficiency || 0), 0) / history.length,
      defectTrend: this.calculateTrend(history.map(h => h.defectRate || 0)),
      throughputVariation: this.calculateVariation(history.map(h => h.throughput || 0)),
      seasonalFactors: this.identifySeasonalPatterns(history)
    }
  }

  private calculateConfidence(dataPoints: number): number {
    // More data points = higher confidence, but with diminishing returns
    return Math.min(0.95, 0.3 + (dataPoints / 100) * 0.65)
  }

  private calculateQualityConfidence(qcHistory: any[]): number {
    const consistencyScore = this.calculateConsistencyScore(qcHistory)
    const dataQuality = Math.min(1, qcHistory.length / 50) // Prefer 50+ data points
    return (consistencyScore + dataQuality) / 2
  }

  private identifyKeyFactors(features: any): string[] {
    const factors = []
    if (features.averageEfficiency < 0.8) factors.push('low_historical_efficiency')
    if (features.defectTrend > 0) factors.push('increasing_defect_rate')
    if (features.throughputVariation > 0.2) factors.push('throughput_instability')
    return factors
  }

  private identifyQualityFactors(productionData: any): string[] {
    // Analyze production parameters that affect quality
    return ['temperature_variation', 'material_consistency', 'operator_skill', 'equipment_maintenance']
  }

  private generateCapacityRecommendations(analysis: any): string[] {
    const recommendations = []
    
    if (analysis.bottlenecks?.length > 0) {
      recommendations.push(`Address bottlenecks in: ${analysis.bottlenecks.join(', ')}`)
    }
    
    if (analysis.staffingPlan?.shortfall > 0) {
      recommendations.push(`Hire ${analysis.staffingPlan.shortfall} additional staff`)
    }
    
    recommendations.push('Consider cross-training to improve flexibility')
    recommendations.push('Implement predictive maintenance to reduce downtime')
    
    return recommendations
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    const first = values.slice(0, Math.floor(values.length / 2))
    const last = values.slice(Math.floor(values.length / 2))
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length
    const lastAvg = last.reduce((a, b) => a + b, 0) / last.length
    return (lastAvg - firstAvg) / firstAvg
  }

  private calculateVariation(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance) / mean // Coefficient of variation
  }

  private identifySeasonalPatterns(history: any[]): any {
    // Simple seasonal analysis - in production, use more sophisticated time series analysis
    const monthlyData = history.reduce((acc, item) => {
      const month = new Date(item.created_at).getMonth()
      acc[month] = (acc[month] || []).concat(item)
      return acc
    }, {} as any)
    
    return Object.keys(monthlyData).map(month => ({
      month: parseInt(month),
      avgEfficiency: monthlyData[month].reduce((sum: number, item: any) => sum + (item.efficiency || 0), 0) / monthlyData[month].length
    }))
  }

  private calculateConsistencyScore(qcHistory: any[]): number {
    if (qcHistory.length === 0) return 0.5
    
    const passRates = qcHistory.map(qc => qc.status === 'PASSED' ? 1 : 0)
    const avgPassRate = passRates.reduce((a, b) => a + b, 0) / passRates.length
    const variation = this.calculateVariation(passRates.map((_, i) => avgPassRate))
    
    return Math.max(0, 1 - variation) // Lower variation = higher consistency
  }

  // Mock methods for data that would come from external sources
  private async getStageParameters(order_id: string, stage: string) {
    return { temperature: 25, humidity: 45, pressure: 1013, speed: 100 }
  }

  private async getCostHistory(order_id: string) {
    return { materials: 1000, labor: 500, overhead: 200, total: 1700 }
  }

  private async getMarketRates() {
    return { fabricCost: 12.5, laborRate: 250, energyCost: 8.5 }
  }

  private async getIndustryBenchmarks() {
    return { efficiency: 0.85, defectRate: 0.02, throughput: 120 }
  }

  private async getPeerPerformanceData() {
    return { avgEfficiency: 0.78, avgDefectRate: 0.035, avgThroughput: 95 }
  }
}

export const predictiveEngine = new PredictiveAnalyticsEngine()
export type { PredictionResult, ProductionMetrics, DemandForecast }