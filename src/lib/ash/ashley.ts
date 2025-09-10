import { prisma } from '@/lib/db'
import { PrintMethod } from '@prisma/client'

export interface AshleyAssessment {
  risk: 'GREEN' | 'AMBER' | 'RED'
  issues: AshleyIssue[]
  actions: string[]
  capacityAnalysis?: CapacityAnalysis[]
  insights: AshleyInsight[]
  assumptions: Record<string, any>
  confidence: number
}

export interface AshleyIssue {
  type: 'CAPACITY' | 'STOCK' | 'SAFETY' | 'TIMING' | 'COST'
  workcenter?: string
  item?: string
  details: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  action?: string
}

export interface CapacityAnalysis {
  workcenter: string
  requiredMinutes: number
  availableMinutes: number
  utilizationPct: number
  bottleneck: boolean
  suggestions: string[]
}

export interface AshleyInsight {
  type: 'ASSIGNMENT' | 'FORECAST' | 'INVENTORY' | 'PRICING' | 'ANOMALY'
  title: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  data: Record<string, any>
}

export interface RouteValidationResult {
  valid: boolean
  blocked: boolean
  risk: 'GREEN' | 'AMBER' | 'RED'
  issues: AshleyIssue[]
  warnings: string[]
}

export class AshleyAI {
  /**
   * Assess order intake and provide recommendations
   */
  static async assessIntake(params: {
    order_id: string
    brand_id: string
    method: PrintMethod
    total_qty: number
    sizeCurve: Record<string, number>
    targetDate?: Date
    routing_steps: any[]
  }): Promise<AshleyAssessment> {
    
    const assessment: AshleyAssessment = {
      risk: 'GREEN',
      issues: [],
      actions: [],
      capacityAnalysis: [],
      insights: [],
      assumptions: {
        workingHoursPerDay: 8,
        workingDaysPerWeek: 6,
        operatorEfficiency: 0.8,
        setupTimeMinutes: 30,
        bufferTimePercent: 0.15
      },
      confidence: 0.85
    }

    try {
      // 1. Capacity Analysis
      const capacityResults = await AshleyAI.analyzeCapacity(params)
      assessment.capacityAnalysis = capacityResults
      
      // Check for capacity issues
      const bottlenecks = capacityResults.filter(c => c.bottleneck || c.utilizationPct > 90)
      if (bottlenecks.length > 0) {
        assessment.risk = 'AMBER'
        for (const bottleneck of bottlenecks) {
          assessment.issues.push({
            type: 'CAPACITY',
            workcenter: bottleneck.workcenter,
            details: `${Math.round(bottleneck.utilizationPct)}% utilization exceeds recommended capacity`,
            severity: bottleneck.utilizationPct > 100 ? 'HIGH' : 'MEDIUM',
            action: bottleneck.suggestions.join(', ')
          })
        }
        assessment.actions.push(...bottlenecks.flatMap(b => b.suggestions))
      }

      // 2. Stock Availability Check
      const stockIssues = await AshleyAI.checkStockAvailability(params)
      if (stockIssues.length > 0) {
        assessment.risk = assessment.risk === 'GREEN' ? 'AMBER' : 'RED'
        assessment.issues.push(...stockIssues)
        assessment.actions.push('Create purchase requests for missing materials')
      }

      // 3. Method/Route Safety Check
      const routeSafety = await AshleyAI.validateRouteSafety(params)
      if (routeSafety.issues.length > 0) {
        if (routeSafety.blocked) {
          assessment.risk = 'RED'
        } else if (assessment.risk === 'GREEN') {
          assessment.risk = 'AMBER'
        }
        assessment.issues.push(...routeSafety.issues)
      }

      // 4. Generate insights based on findings
      if (assessment.issues.length > 0) {
        assessment.insights.push({
          type: 'FORECAST',
          title: 'Production Risk Identified',
          description: `${assessment.issues.length} potential issues found for this order. Review capacity and material requirements.`,
          priority: assessment.risk === 'RED' ? 'HIGH' : 'MEDIUM',
          data: {
            order_id: params.order_id,
            riskLevel: assessment.risk,
            issueCount: assessment.issues.length
          }
        })
      }

      // 5. Timing recommendations
      if (params.targetDate) {
        const timingAdvice = AshleyAI.analyzeTimingFeasibility(params, capacityResults)
        if (!timingAdvice.feasible) {
          assessment.issues.push({
            type: 'TIMING',
            details: timingAdvice.reason,
            severity: 'HIGH',
            action: timingAdvice.recommendation
          })
          assessment.actions.push(timingAdvice.recommendation)
        }
      }

    } catch (_error) {
      console.error('Ashley AI assessment error:', _error)
      assessment.confidence = 0.5
      assessment.insights.push({
        type: 'ANOMALY',
        title: 'Assessment Error',
        description: 'Unable to complete full assessment due to system error',
        priority: 'MEDIUM',
        data: { error: error?.toString() }
      })
    }

    return assessment
  }

  /**
   * Analyze capacity for workcenters
   */
  private static async analyzeCapacity(params: {
    method: PrintMethod
    total_qty: number
    routing_steps: any[]
    targetDate?: Date
  }): Promise<CapacityAnalysis[]> {
    
    const analyses: CapacityAnalysis[] = []
    
    // Get capacity assumptions by method
    const capacityRates = AshleyAI.getCapacityRates(params.method)
    
    for (const step of params.routing_steps) {
      const rate = capacityRates[step.workcenter as keyof typeof capacityRates] || 30 // default 30 pcs/hour
      const requiredMinutes = (params.total_qty / rate) * 60
      
      // Get available capacity (simplified - in real system would check schedules)
      const availableMinutes = 8 * 60 * 0.8 // 8 hours * 80% efficiency
      const utilizationPct = (requiredMinutes / availableMinutes) * 100
      
      const suggestions = []
      if (utilizationPct > 100) {
        suggestions.push('Add overtime shift', 'Split production across multiple days', 'Consider subcontracting')
      } else if (utilizationPct > 90) {
        suggestions.push('Monitor closely for delays', 'Prepare backup capacity')
      }

      analyses.push({
        workcenter: step.workcenter,
        requiredMinutes,
        availableMinutes,
        utilizationPct,
        bottleneck: utilizationPct > 95,
        suggestions
      })
    }

    return analyses
  }

  /**
   * Check stock availability for the order
   */
  private static async checkStockAvailability(params: {
    method: PrintMethod
    total_qty: number
    sizeCurve: Record<string, number>
  }): Promise<AshleyIssue[]> {
    
    const issues: AshleyIssue[] = []
    
    try {
      // Get BOM requirements (simplified)
      const bomRequirements = AshleyAI.estimateBOM(params)
      
      for (const requirement of bomRequirements) {
        // Check inventory
        const availableStock = await prisma.inventoryItem.findFirst({
          where: {
            name: { contains: requirement.item },
            quantity: { gte: requirement.requiredQty }
          }
        })

        if (!availableStock) {
          issues.push({
            type: 'STOCK',
            item: requirement.item,
            details: `Insufficient stock: need ${requirement.requiredQty} ${requirement.unit}, available ${availableStock?.quantity || 0}`,
            severity: 'MEDIUM',
            action: 'Create purchase request'
          })
        }
      }
    } catch (_error) {
      console.error('Stock availability check error:', _error)
    }

    return issues
  }

  /**
   * Validate route safety based on method and placement
   */
  private static async validateRouteSafety(params: {
    order_id: string
    method: PrintMethod
    routing_steps: any[]
  }): Promise<RouteValidationResult> {
    
    const result: RouteValidationResult = {
      valid: true,
      blocked: false,
      risk: 'GREEN',
      issues: [],
      warnings: []
    }

    // Check for risky routing combinations
    if (params.method === PrintMethod.SILKSCREEN) {
      const hasSewThenPrint = params.routing_steps.some(step => 
        step.workcenter === 'PRINTING' && 
        step.dependsOn.includes('Sewing')
      )

      if (hasSewThenPrint) {
        // Check if this is a large/AOP placement (would need design info)
        result.warnings.push('Sew-then-print routing requires careful placement validation')
        result.risk = 'AMBER'
        
        // For now, allow but warn - in full system would check actual design placement
        result.issues.push({
          type: 'SAFETY',
          workcenter: 'PRINTING',
          details: 'Printing on sewn garments requires small placements and careful registration',
          severity: 'MEDIUM',
          action: 'Verify placement size and position before proceeding'
        })
      }
    }

    if (params.method === PrintMethod.SUBLIMATION) {
      const cuttingBeforePress = params.routing_steps.some(step =>
        step.workcenter === 'CUTTING' &&
        !params.routing_steps.some(pressStep => 
          pressStep.workcenter === 'HEAT_PRESS' && 
          step.dependsOn.includes(pressStep.name)
        )
      )

      if (cuttingBeforePress) {
        result.issues.push({
          type: 'SAFETY',
          workcenter: 'CUTTING',
          details: 'AOP sublimation should be pressed before cutting to avoid misalignment',
          severity: 'MEDIUM'
        })
        result.risk = 'AMBER'
      }
    }

    return result
  }

  /**
   * Validate route customization
   */
  static async validateRouteCustomization(params: {
    order_id: string
    method: PrintMethod
    customSteps: any[]
  }): Promise<RouteValidationResult> {
    
    // Run the same safety checks as intake
    const routeSafety = await AshleyAI.validateRouteSafety({
      order_id: params.order_id,
      method: params.method,
      routing_steps: params.customSteps
    })

    // Additional customization-specific checks
    if (params.method === PrintMethod.SILKSCREEN && params.customSteps.length > 0) {
      const sewThenPrintSteps = params.customSteps.filter(step =>
        step.workcenter === 'PRINTING' && 
        step.dependsOn.some((dep: string) => 
          params.customSteps.find(s => s.name === dep)?.workcenter === 'SEWING'
        )
      )

      if (sewThenPrintSteps.length > 0) {
        // This would be a blocking condition for large placements
        routeSafety.blocked = false // For now, allow with strong warning
        routeSafety.risk = 'RED'
        routeSafety.warnings.push('HIGH RISK: Sew-then-print routing requires manual approval for large placements')
      }
    }

    return routeSafety
  }

  /**
   * Get capacity rates by workcenter for different methods
   */
  private static getCapacityRates(method: PrintMethod): Record<string, number> {
    const baseRates = {
      CUTTING: 25, // pcs/hour
      PRINTING: 20,
      HEAT_PRESS: 30,
      SEWING: 8,
      EMB: 12,
      QC: 60,
      PACKING: 40
    }

    // Adjust rates based on method complexity
    switch (method) {
      case PrintMethod.SUBLIMATION:
        return { ...baseRates, HEAT_PRESS: 25, PRINTING: 15 }
      case PrintMethod.DTF:
        return { ...baseRates, PRINTING: 18, HEAT_PRESS: 35 }
      case PrintMethod.EMBROIDERY:
        return { ...baseRates, EMB: 8 }
      default:
        return baseRates
    }
  }

  /**
   * Estimate BOM requirements
   */
  private static estimateBOM(params: {
    method: PrintMethod
    total_qty: number
    sizeCurve: Record<string, number>
  }): Array<{ item: string; requiredQty: number; unit: string }> {
    
    const bom = []
    
    // Base fabric requirements
    const avgFabricPerPc = 0.6 // kg per piece (rough estimate)
    bom.push({
      item: 'Fabric',
      requiredQty: params.total_qty * avgFabricPerPc * 1.05, // 5% wastage
      unit: 'kg'
    })

    // Method-specific materials
    switch (params.method) {
      case PrintMethod.SILKSCREEN:
        bom.push({
          item: 'Plastisol Ink',
          requiredQty: Math.ceil(params.total_qty * 0.008), // 8g per print
          unit: 'kg'
        })
        break
      case PrintMethod.SUBLIMATION:
        bom.push({
          item: 'Transfer Paper',
          requiredQty: Math.ceil(params.total_qty * 0.1), // 0.1m2 per print
          unit: 'm2'
        })
        break
      case PrintMethod.DTF:
        bom.push({
          item: 'DTF Film',
          requiredQty: Math.ceil(params.total_qty * 0.05),
          unit: 'm2'
        })
        break
    }

    return bom
  }

  /**
   * Analyze timing feasibility
   */
  private static analyzeTimingFeasibility(
    params: { targetDate?: Date; total_qty: number },
    capacityAnalysis: CapacityAnalysis[]
  ): { feasible: boolean; reason: string; recommendation: string } {
    
    if (!params.targetDate) {
      return { feasible: true, reason: '', recommendation: '' }
    }

    const totalRequiredMinutes = capacityAnalysis.reduce((sum, analysis) => sum + analysis.requiredMinutes, 0)
    const availableMinutes = (new Date(params.targetDate).getTime() - Date.now()) / (1000 * 60)

    if (totalRequiredMinutes > availableMinutes) {
      return {
        feasible: false,
        reason: `Requires ${Math.ceil(totalRequiredMinutes / 60)} hours but only ${Math.ceil(availableMinutes / 60)} hours available`,
        recommendation: 'Extend deadline or reduce quantity'
      }
    }

    return { feasible: true, reason: '', recommendation: '' }
  }
}