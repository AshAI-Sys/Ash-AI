// import { ashAI, type OrderData } from './ai-engine'
// Real-Time Production Optimization Engine
// Monitors production metrics and provides instant recommendations


export interface ProductionMetrics {
  timestamp: string
  operatorId: string
  operatorName: string
  operationType: string
  currentOrder: string
  targetQty: number
  completedQty: number
  defectQty: number
  efficiency: number
  machineId: string
  machineStatus: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'ERROR'
  cycleTime: number // minutes per unit
  standardTime: number // standard minutes per unit
  temperature?: number
  humidity?: number
}

export interface ProductionAlert {
  id: string
  type: 'EFFICIENCY' | 'QUALITY' | 'CAPACITY' | 'MAINTENANCE' | 'DELAY' | 'OPPORTUNITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  recommendation: string
  affectedOrders: string[]
  estimatedImpact: string
  autoActions: string[]
  timestamp: string
  resolved: boolean
}

export interface OptimizationRecommendation {
  id: string
  type: 'SCHEDULE_CHANGE' | 'RESOURCE_REALLOCATION' | 'PRIORITY_ADJUSTMENT' | 'PROCESS_IMPROVEMENT'
  title: string
  description: string
  expectedBenefit: string
  implementationSteps: string[]
  confidence: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export class RealTimeProductionOptimizer {
  private alerts: ProductionAlert[] = []
  private recommendations: OptimizationRecommendation[] = []
  private metrics: ProductionMetrics[] = []
  private thresholds = {
    efficiencyLow: 75,
    efficiencyCritical: 60,
    qualityDefectRate: 5,
    machineUtilization: 85,
    cycleTimeVariance: 15 // percentage
  }

  // Real-time metrics analysis
  public analyzeProductionMetrics(metrics: ProductionMetrics[]): {
    alerts: ProductionAlert[]
    recommendations: OptimizationRecommendation[]
    summary: any
  } {
    this.metrics = metrics
    this.alerts = []
    this.recommendations = []

    // Analyze each metric type
    this.analyzeEfficiency()
    this.analyzeQuality()
    this.analyzeCapacity()
    this.analyzeMaintenance()
    this.identifyOptimizationOpportunities()

    const summary = this.generateSummary()

    return {
      alerts: this.alerts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      recommendations: this.recommendations.sort((a, b) => this.getUrgencyWeight(b.urgency) - this.getUrgencyWeight(a.urgency)),
      summary
    }
  }

  private analyzeEfficiency(): void {
    const currentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
    )

    // Operator efficiency analysis
    const operatorPerformance = this.groupBy(currentMetrics, 'operatorId')
    
    Object.entries(operatorPerformance).forEach(([operatorId, metrics]) => {
      const avgEfficiency = metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length
      const operator = metrics[0]

      if (avgEfficiency < this.thresholds.efficiencyCritical) {
        this.alerts.push({
          id: `eff_critical_${operatorId}_${Date.now()}`,
          type: 'EFFICIENCY',
          severity: 'CRITICAL',
          title: `Critical Efficiency Drop - ${operator.operatorName}`,
          description: `Operator efficiency at ${Math.round(avgEfficiency)}%, well below normal performance`,
          recommendation: 'Immediate supervisor intervention required. Check for equipment issues or provide assistance.',
          affectedOrders: [...new Set(metrics.map(m => m.currentOrder))],
          estimatedImpact: `Potential 2-4 hour delay on affected orders`,
          autoActions: ['Notify supervisor', 'Send help request'],
          timestamp: new Date().toISOString(),
          resolved: false
        })
      } else if (avgEfficiency < this.thresholds.efficiencyLow) {
        this.alerts.push({
          id: `eff_low_${operatorId}_${Date.now()}`,
          type: 'EFFICIENCY',
          severity: 'MEDIUM',
          title: `Low Efficiency Alert - ${operator.operatorName}`,
          description: `Operator efficiency at ${Math.round(avgEfficiency)}%, below standard`,
          recommendation: 'Monitor closely and consider providing additional support or training',
          affectedOrders: [...new Set(metrics.map(m => m.currentOrder))],
          estimatedImpact: `May cause 30-60 minute delays`,
          autoActions: ['Monitor for improvement'],
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }
    })

    // Machine efficiency analysis
    const machinePerformance = this.groupBy(currentMetrics, 'machineId')
    
    Object.entries(machinePerformance).forEach(([machineId, metrics]) => {
      const avgCycleTime = metrics.reduce((sum, m) => sum + m.cycleTime, 0) / metrics.length
      const standardTime = metrics[0].standardTime
      const variance = ((avgCycleTime - standardTime) / standardTime) * 100

      if (variance > this.thresholds.cycleTimeVariance) {
        this.alerts.push({
          id: `machine_slow_${machineId}_${Date.now()}`,
          type: 'EFFICIENCY',
          severity: 'HIGH',
          title: `Machine Running Slow - ${machineId}`,
          description: `Cycle time ${Math.round(variance)}% above standard (${avgCycleTime.toFixed(1)}min vs ${standardTime}min)`,
          recommendation: 'Check machine calibration, inspect for wear, consider maintenance',
          affectedOrders: [...new Set(metrics.map(m => m.currentOrder))],
          estimatedImpact: `${Math.round(variance)}% production slowdown`,
          autoActions: ['Schedule maintenance check'],
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }
    })
  }

  private analyzeQuality(): void {
    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    )

    // Quality analysis by operation type
    const operationQuality = this.groupBy(recentMetrics, 'operationType')
    
    Object.entries(operationQuality).forEach(([operation, metrics]) => {
      const total_qty = metrics.reduce((sum, m) => sum + m.completedQty, 0)
      const totalDefects = metrics.reduce((sum, m) => sum + m.defectQty, 0)
      const defectRate = total_qty > 0 ? (totalDefects / total_qty) * 100 : 0

      if (defectRate > this.thresholds.qualityDefectRate) {
        this.alerts.push({
          id: `quality_${operation}_${Date.now()}`,
          type: 'QUALITY',
          severity: defectRate > 10 ? 'CRITICAL' : 'HIGH',
          title: `High Defect Rate - ${operation}`,
          description: `Defect rate at ${defectRate.toFixed(1)}% (${totalDefects}/${total_qty} units)`,
          recommendation: 'Stop production, investigate root cause, implement quality controls',
          affectedOrders: [...new Set(metrics.map(m => m.currentOrder))],
          estimatedImpact: `Risk of customer rejection, potential rework needed`,
          autoActions: ['Alert QC supervisor', 'Initiate quality review'],
          timestamp: new Date().toISOString(),
          resolved: false
        })

        // Add process improvement recommendation
        this.recommendations.push({
          id: `quality_improve_${operation}_${Date.now()}`,
          type: 'PROCESS_IMPROVEMENT',
          title: `Quality Control Enhancement for ${operation}`,
          description: `Implement additional QC checkpoints to prevent defects in ${operation}`,
          expectedBenefit: `Reduce defect rate from ${defectRate.toFixed(1)}% to <3%`,
          implementationSteps: [
            'Add mid-process quality check',
            'Retrain operators on quality standards',
            'Implement statistical process control',
            'Regular equipment calibration'
          ],
          confidence: 88,
          urgency: 'HIGH'
        })
      }
    })
  }

  private analyzeCapacity(): void {
    // Current capacity utilization
    const activeMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - 15 * 60 * 1000 && // Last 15 minutes
      m.machineStatus === 'RUNNING'
    )

    const totalMachines = new Set(this.metrics.map(m => m.machineId)).size
    const activeMachines = new Set(activeMetrics.map(m => m.machineId)).size
    const utilization = (activeMachines / totalMachines) * 100

    if (utilization > this.thresholds.machineUtilization) {
      this.alerts.push({
        id: `capacity_high_${Date.now()}`,
        type: 'CAPACITY',
        severity: utilization > 95 ? 'CRITICAL' : 'HIGH',
        title: `High Capacity Utilization`,
        description: `Production capacity at ${Math.round(utilization)}% (${activeMachines}/${totalMachines} machines active)`,
        recommendation: 'Consider overtime shifts, outsourcing non-critical work, or deferring lower-priority orders',
        affectedOrders: [],
        estimatedImpact: `Risk of delays on new orders`,
        autoActions: ['Alert production manager'],
        timestamp: new Date().toISOString(),
        resolved: false
      })

      // Add resource allocation recommendation
      this.recommendations.push({
        id: `capacity_optimize_${Date.now()}`,
        type: 'RESOURCE_REALLOCATION',
        title: 'Optimize High-Capacity Period',
        description: 'Redistribute workload to prevent bottlenecks during peak capacity',
        expectedBenefit: 'Prevent delays and maintain quality standards',
        implementationSteps: [
          'Identify non-urgent orders for rescheduling',
          'Add overtime shift for critical operations',
          'Cross-train operators for flexibility',
          'Consider outsourcing overflow work'
        ],
        confidence: 85,
        urgency: 'HIGH'
      })
    }
  }

  private analyzeMaintenance(): void {
    // Predictive maintenance analysis
    const machineMetrics = this.groupBy(this.metrics, 'machineId')

    Object.entries(machineMetrics).forEach(([machineId, metrics]) => {
      const recentMetrics = metrics.filter(m => 
        new Date(m.timestamp).getTime() > Date.now() - 2 * 60 * 60 * 1000 // Last 2 hours
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      if (recentMetrics.length < 3) return

      // Analyze efficiency trend
      const efficiencyTrend = recentMetrics.slice(0, 6).map(m => m.efficiency)
      const isDecreasingEfficiency = this.isDecreasingTrend(efficiencyTrend)
      const avgEfficiency = efficiencyTrend.reduce((a, b) => a + b, 0) / efficiencyTrend.length

      // Analyze cycle time trend
      const cycleTimeTrend = recentMetrics.slice(0, 6).map(m => m.cycleTime)
      const isIncreasingCycleTime = this.isIncreasingTrend(cycleTimeTrend)

      if ((isDecreasingEfficiency && avgEfficiency < 80) || isIncreasingCycleTime) {
        this.alerts.push({
          id: `maintenance_needed_${machineId}_${Date.now()}`,
          type: 'MAINTENANCE',
          severity: 'MEDIUM',
          title: `Predictive Maintenance Alert - ${machineId}`,
          description: `Machine showing signs of performance degradation: ${
            isDecreasingEfficiency ? `efficiency trending down (${avgEfficiency.toFixed(1)}%)` : ''
          } ${isIncreasingCycleTime ? 'cycle time increasing' : ''}`,
          recommendation: 'Schedule preventive maintenance before performance degrades further',
          affectedOrders: [...new Set(metrics.slice(0, 3).map(m => m.currentOrder))],
          estimatedImpact: `Prevent 4-8 hour downtime if maintenance is deferred`,
          autoActions: ['Schedule maintenance window'],
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }
    })
  }

  private identifyOptimizationOpportunities(): void {
    // Identify underutilized operators
    const operatorMetrics = this.groupBy(
      this.metrics.filter(m => new Date(m.timestamp).getTime() > Date.now() - 60 * 60 * 1000),
      'operatorId'
    )

    Object.entries(operatorMetrics).forEach(([operatorId, metrics]) => {
      const workingTime = metrics.length * 10 // Assuming 10-minute intervals
      const totalTime = 60 // Last hour
      const utilization = (workingTime / totalTime) * 100
      const avgEfficiency = metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length

      if (utilization < 70 && avgEfficiency > 90) {
        this.recommendations.push({
          id: `optimize_operator_${operatorId}_${Date.now()}`,
          type: 'RESOURCE_REALLOCATION',
          title: `Optimize High-Performing Operator`,
          description: `Operator ${metrics[0].operatorName} has high efficiency (${avgEfficiency.toFixed(1)}%) but low utilization (${utilization.toFixed(1)}%)`,
          expectedBenefit: 'Increase overall production capacity by 10-15%',
          implementationSteps: [
            'Assign additional orders to this operator',
            'Use as trainer for underperforming operators',
            'Consider for complex or priority orders'
          ],
          confidence: 82,
          urgency: 'MEDIUM'
        })
      }
    })

    // Batch processing opportunities
    const operationTypes = this.groupBy(this.metrics, 'operationType')
    Object.entries(operationTypes).forEach(([operation, metrics]) => {
      const uniqueOrders = new Set(metrics.map(m => m.currentOrder)).size
      const totalSetups = uniqueOrders // Assuming one setup per order

      if (totalSetups > 5 && operation.includes('SCREEN')) { // Multiple silkscreen setups
        this.recommendations.push({
          id: `batch_${operation}_${Date.now()}`,
          type: 'SCHEDULE_CHANGE',
          title: `Batch Processing Opportunity - ${operation}`,
          description: `${totalSetups} different setups detected for ${operation}. Batching similar orders can reduce setup time.`,
          expectedBenefit: 'Reduce setup time by 30-40%, increase throughput by 15%',
          implementationSteps: [
            'Group orders by color and design similarity',
            'Schedule similar orders consecutively',
            'Minimize screen changes between orders'
          ],
          confidence: 90,
          urgency: 'MEDIUM'
        })
      }
    })
  }

  private generateSummary() {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'CRITICAL').length
    const highAlerts = this.alerts.filter(a => a.severity === 'HIGH').length
    const urgentRecommendations = this.recommendations.filter(r => r.urgency === 'URGENT' || r.urgency === 'HIGH').length

    const currentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - 30 * 60 * 1000
    )
    
    const avgEfficiency = currentMetrics.length > 0 
      ? currentMetrics.reduce((sum, m) => sum + m.efficiency, 0) / currentMetrics.length 
      : 0

    const activeMachines = new Set(
      this.metrics.filter(m => m.machineStatus === 'RUNNING').map(m => m.machineId)
    ).size
    
    const totalMachines = new Set(this.metrics.map(m => m.machineId)).size

    return {
      timestamp: new Date().toISOString(),
      overallEfficiency: Math.round(avgEfficiency),
      machineUtilization: Math.round((activeMachines / totalMachines) * 100),
      criticalIssues: criticalAlerts,
      highPriorityIssues: highAlerts,
      optimizationOpportunities: urgentRecommendations,
      status: criticalAlerts > 0 ? 'CRITICAL' : 
              highAlerts > 0 ? 'ATTENTION_NEEDED' :
              urgentRecommendations > 0 ? 'OPTIMIZATION_AVAILABLE' : 'OPTIMAL'
    }
  }

  // Utility methods
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key])
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }

  private isDecreasingTrend(values: number[]): boolean {
    if (values.length < 3) return false
    let decreaseCount = 0
    for (let i = 1; i < values.length; i++) {
      if (values[i] < values[i-1]) decreaseCount++
    }
    return decreaseCount >= values.length * 0.6 // 60% or more decreasing
  }

  private isIncreasingTrend(values: number[]): boolean {
    if (values.length < 3) return false
    let increaseCount = 0
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i-1]) increaseCount++
    }
    return increaseCount >= values.length * 0.6 // 60% or more increasing
  }

  private getSeverityWeight(severity: string): number {
    const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    return weights[severity as keyof typeof weights] || 0
  }

  private getUrgencyWeight(urgency: string): number {
    const weights = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    return weights[urgency as keyof typeof weights] || 0
  }
}

// Singleton instance
export const productionOptimizer = new RealTimeProductionOptimizer()