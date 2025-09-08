// Ashley AI Service - Production Intelligence & Advisory System
// Implements Stage 1 validation and advisory features from CLIENT_UPDATED_PLAN

interface OrderValidationRequest {
  method: 'SILKSCREEN' | 'SUBLIMATION' | 'DTF' | 'EMBROIDERY'
  productType: string
  totalQty: number
  sizeCurve: Record<string, number>
  targetDeliveryDate: string
  routingTemplate: string
  designAssets?: { id: string; url: string; type: string; [key: string]: unknown }[]
  brandId: string
}

interface AshleyAdvisory {
  type: 'INFO' | 'WARNING' | 'ERROR'
  title: string
  message: string
  suggestion?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  category: 'ROUTING' | 'CAPACITY' | 'QUALITY' | 'COMMERCIAL' | 'TIMELINE'
}

interface CapacityAnalysis {
  workcenter: string
  requiredMinutes: number
  availableMinutes: number
  utilizationPct: number
  bottleneck: boolean
  suggestions: string[]
}

interface PrintabilityCheck {
  designId: string
  result: 'PASS' | 'WARN' | 'FAIL'
  issues: string[]
  recommendations: string[]
}

class AshleyAI {
  private static instance: AshleyAI
  
  static getInstance(): AshleyAI {
    if (!AshleyAI.instance) {
      AshleyAI.instance = new AshleyAI()
    }
    return AshleyAI.instance
  }

  /**
   * Stage 1: Order Intake Validation
   * Validates order parameters and provides real-time advisories
   */
  async validateOrderIntake(request: OrderValidationRequest): Promise<AshleyAdvisory[]> {
    const advisories: AshleyAdvisory[] = []

    // 1. Routing Method Validation
    await this.validateRoutingMethod(request, advisories)

    // 2. Capacity & Timeline Validation
    await this.validateCapacityAndTimeline(request, advisories)

    // 3. Size Curve & Quantity Validation
    this.validateSizeCurveConsistency(request, advisories)

    // 4. Commercial Validation
    await this.validateCommercialFeasibility(request, advisories)

    // 5. Best-Seller Detection
    await this.detectBestSellerOpportunity(request, advisories)

    return advisories.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  private async validateRoutingMethod(
    request: OrderValidationRequest, 
    advisories: AshleyAdvisory[]
  ): Promise<void> {
    // Silkscreen routing validation
    if (request.method === 'SILKSCREEN') {
      if (request.routingTemplate === 'SILK_OPTION_B') {
        advisories.push({
          type: 'WARNING',
          title: 'Non-Standard Routing Selected',
          message: 'Cut → Sew → Print routing increases complexity and risk.',
          suggestion: 'Consider standard Cut → Print → Sew → QC → Pack routing unless specifically required.',
          severity: 'MEDIUM',
          category: 'ROUTING'
        })
      }
    }

    // Sublimation large order validation
    if (request.method === 'SUBLIMATION' && request.totalQty > 500) {
      advisories.push({
        type: 'WARNING',
        title: 'Large AOP Order Detected',
        message: 'Large all-over-print orders require careful fabric handling and extended print time.',
        suggestion: 'Ensure GA → Print → Heat Press → Cut → Sew routing is used for optimal results.',
        severity: 'HIGH',
        category: 'ROUTING'
      })
    }

    // DTF capacity check
    if (request.method === 'DTF' && request.totalQty > 200) {
      advisories.push({
        type: 'INFO',
        title: 'DTF High Volume',
        message: 'High volume DTF orders may require additional curing time.',
        suggestion: 'Schedule extra time for proper adhesion curing.',
        severity: 'LOW',
        category: 'QUALITY'
      })
    }
  }

  private async validateCapacityAndTimeline(
    request: OrderValidationRequest, 
    advisories: AshleyAdvisory[]
  ): Promise<void> {
    const deliveryDate = new Date(request.targetDeliveryDate)
    const today = new Date()
    const daysDiff = Math.ceil((new Date(deliveryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))

    // Rush order detection
    if (daysDiff < 7) {
      advisories.push({
        type: 'ERROR',
        title: 'Rush Order Alert',
        message: `Delivery date is in ${daysDiff} days. Minimum lead time is 7 days for quality assurance.`,
        suggestion: 'Consider extending delivery date or upgrading to express processing with additional fees.',
        severity: 'HIGH',
        category: 'TIMELINE'
      })
    }

    // Capacity analysis simulation
    const capacityAnalysis = await this.analyzeCapacity(request)
    
    for (const analysis of capacityAnalysis) {
      if (analysis.bottleneck) {
        advisories.push({
          type: 'WARNING',
          title: `Bottleneck Detected: ${analysis.workcenter}`,
          message: `${analysis.workcenter} utilization will be ${analysis.utilizationPct.toFixed(1)}% with this order.`,
          suggestion: analysis.suggestions.join(' '),
          severity: 'MEDIUM',
          category: 'CAPACITY'
        })
      }
    }
  }

  private validateSizeCurveConsistency(
    request: OrderValidationRequest, 
    advisories: AshleyAdvisory[]
  ): void {
    const sizeCurveTotal = Object.values(request.sizeCurve).reduce((a, b) => a + b, 0)
    
    if (sizeCurveTotal !== request.totalQty) {
      advisories.push({
        type: 'ERROR',
        title: 'Size Curve Mismatch',
        message: `Size breakdown total (${sizeCurveTotal}) doesn't match total quantity (${request.totalQty}).`,
        suggestion: 'Adjust individual size quantities to match the total quantity.',
        severity: 'HIGH',
        category: 'QUALITY'
      })
    }

    // Unusual size distribution warning
    const maxSize = Math.max(...Object.values(request.sizeCurve))
    const totalQty = request.totalQty
    
    if (maxSize / totalQty > 0.7) {
      const dominantSize = Object.entries(request.sizeCurve).find(([_, qty]) => qty === maxSize)?.[0]
      advisories.push({
        type: 'INFO',
        title: 'Unusual Size Distribution',
        message: `${((maxSize / totalQty) * 100).toFixed(1)}% of order is size ${dominantSize}.`,
        suggestion: 'Verify size distribution is correct. Consider fabric utilization optimization.',
        severity: 'LOW',
        category: 'QUALITY'
      })
    }
  }

  private async validateCommercialFeasibility(
    request: OrderValidationRequest, 
    advisories: AshleyAdvisory[]
  ): Promise<void> {
    // Simulate cost analysis
    const _estimatedCost = await this.estimateProductionCost(request)
    
    // Low quantity high setup warning
    if (request.totalQty < 50 && request.method === 'SILKSCREEN') {
      advisories.push({
        type: 'WARNING',
        title: 'Low Quantity Silkscreen',
        message: 'Small silkscreen orders have high setup costs relative to quantity.',
        suggestion: 'Consider DTF method for small quantities or increase order size for better economics.',
        severity: 'MEDIUM',
        category: 'COMMERCIAL'
      })
    }
  }

  private async detectBestSellerOpportunity(
    request: OrderValidationRequest, 
    advisories: AshleyAdvisory[]
  ): Promise<void> {
    // Simulate best-seller analysis
    const isBestSellerCandidate = await this.analyzeBestSellerPotential(request)
    
    if (isBestSellerCandidate) {
      advisories.push({
        type: 'INFO',
        title: 'Best-Seller Potential Detected',
        message: 'This design/product combination shows high reorder probability.',
        suggestion: 'Consider suggesting inventory planning or bulk pricing to client.',
        severity: 'LOW',
        category: 'COMMERCIAL'
      })
    }
  }

  /**
   * Capacity Analysis
   * Simulates production capacity requirements and identifies bottlenecks
   */
  private async analyzeCapacity(request: OrderValidationRequest): Promise<CapacityAnalysis[]> {
    const analyses: CapacityAnalysis[] = []

    // Simulate capacity calculations based on method and quantity
    const baseMinutesPerPiece = {
      SILKSCREEN: 0.5,
      SUBLIMATION: 0.8,
      DTF: 0.3,
      EMBROIDERY: 2.0
    }

    const requiredMinutes = request.totalQty * baseMinutesPerPiece[request.method]
    
    // Simulate workcenter availability (8 hours = 480 minutes per day)
    const dailyCapacity = 480
    const currentUtilization = 0.7 // 70% current utilization
    const availableMinutes = dailyCapacity * (1 - currentUtilization)

    analyses.push({
      workcenter: request.method,
      requiredMinutes,
      availableMinutes,
      utilizationPct: (requiredMinutes / dailyCapacity) * 100,
      bottleneck: requiredMinutes > availableMinutes,
      suggestions: requiredMinutes > availableMinutes 
        ? ['Schedule across multiple days', 'Consider overtime shift', 'Prioritize based on delivery date']
        : ['Capacity available within normal hours']
    })

    return analyses
  }

  /**
   * Cost Estimation
   * Provides rough cost estimates for commercial validation
   */
  private async estimateProductionCost(request: OrderValidationRequest): Promise<number> {
    const baseCosts = {
      SILKSCREEN: 25,  // Base setup + per piece
      SUBLIMATION: 30,
      DTF: 15,
      EMBROIDERY: 45
    }

    const perPieceCosts = {
      SILKSCREEN: 8,
      SUBLIMATION: 12,
      DTF: 6,
      EMBROIDERY: 25
    }

    const setupCost = baseCosts[request.method]
    const variableCost = perPieceCosts[request.method] * request.totalQty

    return setupCost + variableCost
  }

  /**
   * Best-Seller Analysis
   * Analyzes patterns to predict reorder probability
   */
  private async analyzeBestSellerPotential(request: OrderValidationRequest): Promise<boolean> {
    // Simulate analysis based on product type, method, and brand patterns
    const bestSellerPatterns = [
      'T-Shirt',
      'Jersey'
    ]

    const methodPreference = {
      'T-Shirt': ['SILKSCREEN', 'DTF'],
      'Jersey': ['SUBLIMATION'],
      'Hoodie': ['EMBROIDERY', 'DTF'],
      'Uniform': ['EMBROIDERY']
    }

    const isGoodProductType = bestSellerPatterns.includes(request.productType)
    const isPreferredMethod = methodPreference[request.productType as keyof typeof methodPreference]?.includes(request.method)

    return isGoodProductType && !!isPreferredMethod && request.totalQty >= 100
  }

  /**
   * Design Printability Analysis
   * Validates design files for production feasibility
   */
  async analyzeDesignPrintability(designFile: File, method: string): Promise<PrintabilityCheck> {
    // Simulate design analysis
    const mockAnalysis: PrintabilityCheck = {
      designId: `design_${Date.now()}`,
      result: 'PASS',
      issues: [],
      recommendations: []
    }

    // Simulate common design issues
    if (Math.random() < 0.3) { // 30% chance of issues for demo
      mockAnalysis.result = 'WARN'
      mockAnalysis.issues.push('Design contains gradients that may not reproduce well in silkscreen')
      mockAnalysis.recommendations.push('Consider simplifying gradients or switching to DTF method')
    }

    if (method === 'SILKSCREEN' && Math.random() < 0.2) {
      mockAnalysis.issues.push('Design has fine details below minimum line weight (0.5pt)')
      mockAnalysis.recommendations.push('Increase line weights to minimum 0.75pt for silkscreen production')
    }

    return mockAnalysis
  }

  /**
   * Real-time Order Monitoring
   * Provides insights during order execution
   */
  async getOrderInsights(_orderId: string): Promise<AshleyAdvisory[]> {
    // This would connect to real production data
    return [
      {
        type: 'INFO',
        title: 'Production On Track',
        message: 'Order is progressing normally within expected timeframes.',
        severity: 'LOW',
        category: 'TIMELINE'
      }
    ]
  }
}

export const ashleyAI = AshleyAI.getInstance()
export type { AshleyAdvisory, OrderValidationRequest, CapacityAnalysis, PrintabilityCheck }