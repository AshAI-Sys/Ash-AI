import { prisma as db } from './db'
import { Role, TaskStatus, PrintMethod, User, Task, Order, InventoryItem, UsageRecord, QCRecord, OrderCost, TaskCost } from '@prisma/client'

export interface AssignmentSuggestion {
  taskId: string
  suggestedAssignee: string
  assigneeName: string
  confidence: number
  reasoning: string
  estimatedHours: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface ForecastResult {
  orderId: string
  estimatedCompletionDate: Date
  confidence: number
  criticalPath: string[]
  riskFactors: string[]
  recommendations: string[]
}

export interface InventorySuggestion {
  itemId: string
  itemName: string
  action: 'RESTOCK' | 'LIQUIDATE' | 'REPURPOSE'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
  suggestedQuantity?: number
  estimatedCost?: number
}

export interface PricingSuggestion {
  orderId?: string
  brandId?: string
  minimumPrice: number
  suggestedPrice: number
  liquidationPrice: number
  reasoning: string
  profitMargin: number
  competitorAnalysis?: string
}

export interface AnomalyDetection {
  type: 'COST' | 'VENDOR' | 'PERFORMANCE' | 'QUALITY'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  affectedEntity: string
  suggestedAction: string
  confidence: number
}

export interface AIInsight {
  id: string
  type: 'ASSIGNMENT' | 'FORECAST' | 'INVENTORY' | 'PRICING' | 'ANOMALY'
  title: string
  description: string
  data: unknown
  created_at: string | Date
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

class AIService {
  async getAssignmentSuggestions(taskIds?: string[]): Promise<AssignmentSuggestion[]> {
    const tasks = await db.task.findMany({
      where: {
        status: TaskStatus.PENDING,
        ...(taskIds && { id: { in: taskIds } })
      },
      include: {
        order: {
          include: {
            brand: true
          }
        },
        assignee: true
      }
    })

    const users = await db.user.findMany({
      where: { active: true },
      include: {
        assignedTasks: {
          where: {
            status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] }
          }
        },
        qcRecords: {
          take: 50,
          orderBy: { created_at: 'desc' }
        }
      }
    })

    const suggestions: AssignmentSuggestion[] = []

    for (const task of tasks) {
      const suitableUsers = users.filter(user => this.isUserSuitableForTask(user, task))
      
      for (const user of suitableUsers) {
        const workload = user.assignedTasks.length
        const rejectRate = this.calculateRejectRate(user.qcRecords)
        const skillMatch = this.calculateSkillMatch(user.role, task.taskType)
        
        const confidence = this.calculateAssignmentConfidence({
          workload,
          rejectRate,
          skillMatch,
          taskPriority: task.priority
        })

        if (confidence > 0.5) {
          suggestions.push({
            taskId: task.id,
            suggestedAssignee: user.id,
            assigneeName: user.name,
            confidence,
            reasoning: this.generateAssignmentReasoning({
              workload,
              rejectRate,
              skillMatch,
              userName: user.name
            }),
            estimatedHours: this.estimateTaskHours(task),
            priority: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW'
          })
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  async forecastProjectCompletion(orderIds?: string[]): Promise<ForecastResult[]> {
    const orders = await db.order.findMany({
      where: {
        status: { not: 'DELIVERED' },
        ...(orderIds && { id: { in: orderIds } })
      },
      include: {
        tasks: {
          include: {
            assignee: true
          }
        },
        brand: true
      }
    })

    const forecasts: ForecastResult[] = []

    for (const order of orders) {
      const { criticalPath, estimatedDays } = this.calculateCriticalPath(order)
      const riskFactors = this.identifyRiskFactors(order)
      
      const estimatedCompletionDate = new Date()
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDays)

      forecasts.push({
        orderId: order.id,
        estimatedCompletionDate,
        confidence: this.calculateForecastConfidence(order, riskFactors),
        criticalPath,
        riskFactors,
        recommendations: this.generateRecommendations(order, riskFactors)
      })
    }

    return forecasts
  }

  async getInventorySuggestions(): Promise<InventorySuggestion[]> {
    const items = await db.inventoryItem.findMany({
      include: {
        stockMovements: {
          take: 100,
          orderBy: { created_at: 'desc' }
        },
        usageRecords: {
          take: 50,
          orderBy: { usedAt: 'desc' }
        }
      }
    })

    const suggestions: InventorySuggestion[] = []

    for (const item of items) {
      const analysis = this.analyzeInventoryItem(item)
      
      if (analysis.action !== 'NONE') {
        suggestions.push({
          itemId: item.id,
          itemName: item.name,
          action: analysis.action as 'RESTOCK' | 'LIQUIDATE' | 'REPURPOSE',
          priority: analysis.priority as 'HIGH' | 'MEDIUM' | 'LOW',
          reasoning: analysis.reasoning,
          suggestedQuantity: analysis.suggestedQuantity,
          estimatedCost: analysis.estimatedCost
        })
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  async getPricingSuggestions(orderIds?: string[]): Promise<PricingSuggestion[]> {
    const orders = await db.order.findMany({
      where: orderIds ? { id: { in: orderIds } } : {},
      include: {
        orderCosts: true,
        brand: true,
        tasks: {
          include: {
            taskCosts: true
          }
        }
      }
    })

    const suggestions: PricingSuggestion[] = []

    for (const order of orders) {
      const totalCost = this.calculateTotalOrderCost(order)
      const marketAnalysis = await this.analyzeMarketPricing(order)
      
      suggestions.push({
        orderId: order.id,
        brandId: order.brandId,
        minimumPrice: totalCost * 1.1, // 10% markup minimum
        suggestedPrice: totalCost * 1.4, // 40% markup suggested
        liquidationPrice: totalCost * 0.9, // 10% loss max for liquidation
        reasoning: this.generatePricingReasoning(totalCost, marketAnalysis),
        profitMargin: ((totalCost * 1.4 - totalCost) / (totalCost * 1.4)) * 100,
        competitorAnalysis: marketAnalysis.analysis
      })
    }

    return suggestions
  }

  async detectAnomalies(): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    // Cost anomalies
    const costAnomalies = await this.detectCostAnomalies()
    anomalies.push(...costAnomalies)

    // Vendor anomalies
    const vendorAnomalies = await this.detectVendorAnomalies()
    anomalies.push(...vendorAnomalies)

    // Performance anomalies
    const performanceAnomalies = await this.detectPerformanceAnomalies()
    anomalies.push(...performanceAnomalies)

    // Quality anomalies
    const qualityAnomalies = await this.detectQualityAnomalies()
    anomalies.push(...qualityAnomalies)

    return anomalies.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  // Helper methods
  private isUserSuitableForTask(user: User, task: Task): boolean {
    const roleTaskMapping: Record<string, string[]> = {
      GRAPHIC_ARTIST: ['DESIGN', 'MOCKUP', 'COLOR_SEPARATION'],
      SILKSCREEN_OPERATOR: ['SILKSCREEN_SETUP', 'SILKSCREEN_PRINT'],
      SUBLIMATION_OPERATOR: ['SUBLIMATION_SETUP', 'SUBLIMATION_PRINT'],
      DTF_OPERATOR: ['DTF_SETUP', 'DTF_PRINT'],
      EMBROIDERY_OPERATOR: ['EMBROIDERY_SETUP', 'EMBROIDERY_STITCH'],
      SEWING_OPERATOR: ['SEWING', 'ASSEMBLY'],
      QC_INSPECTOR: ['QUALITY_CHECK', 'FINAL_INSPECTION'],
      FINISHING_STAFF: ['FINISHING', 'PACKAGING'],
      WAREHOUSE_STAFF: ['INVENTORY', 'STOCK_MANAGEMENT'],
    }

    const suitableTasks = roleTaskMapping[user.role] || []
    return suitableTasks.includes(task.taskType) || user.role === 'ADMIN' || user.role === 'MANAGER'
  }

  private calculateRejectRate(qcRecords: QCRecord[]): number {
    if (qcRecords.length === 0) return 0
    
    const totalChecks = qcRecords.length
    const rejections = qcRecords.filter(record => record.status === 'FAIL').length
    return rejections / totalChecks
  }

  private calculateSkillMatch(userRole: Role, taskType: string): number {
    const roleTaskMapping: Record<string, Record<string, number>> = {
      GRAPHIC_ARTIST: {
        DESIGN: 1.0,
        MOCKUP: 1.0,
        COLOR_SEPARATION: 1.0,
        default: 0.2
      },
      SILKSCREEN_OPERATOR: {
        SILKSCREEN_SETUP: 1.0,
        SILKSCREEN_PRINT: 1.0,
        default: 0.1
      },
      // Add more mappings...
    }

    const taskScores = roleTaskMapping[userRole] || { default: 0.5 }
    return taskScores[taskType] || taskScores.default || 0.3
  }

  private calculateAssignmentConfidence(factors: {
    workload: number
    rejectRate: number
    skillMatch: number
    taskPriority: number
  }): number {
    const workloadScore = Math.max(0, 1 - (factors.workload / 10)) // Lower is better
    const qualityScore = Math.max(0, 1 - factors.rejectRate) // Lower reject rate is better
    const skillScore = factors.skillMatch
    const priorityWeight = (factors.taskPriority + 1) / 10

    return (workloadScore * 0.3 + qualityScore * 0.4 + skillScore * 0.3) * priorityWeight
  }

  private generateAssignmentReasoning(factors: {
    workload: number
    rejectRate: number
    skillMatch: number
    userName: string
  }): string {
    const reasons: string[] = []
    
    if (factors.workload < 3) reasons.push('Low current workload')
    if (factors.rejectRate < 0.1) reasons.push('Excellent quality record')
    if (factors.skillMatch > 0.8) reasons.push('Perfect skill match')
    if (factors.skillMatch > 0.6) reasons.push('Good skill match')
    
    return `${factors.userName}: ${reasons.join(', ')}`
  }

  private estimateTaskHours(task: Task): number {
    const baseHours: Record<string, number> = {
      DESIGN: 4,
      MOCKUP: 2,
      SILKSCREEN_SETUP: 1,
      SILKSCREEN_PRINT: 3,
      SEWING: 6,
      QUALITY_CHECK: 1,
      default: 3
    }

    return baseHours[task.taskType] || baseHours.default
  }

  private calculateCriticalPath(order: Order & { tasks: Task[] }): { criticalPath: string[], estimatedDays: number } {
    const taskSequence = this.getTaskSequence(order.printMethod)
    let totalDays = 0
    
    for (const taskType of taskSequence) {
      const task = order.tasks.find((t: Task) => t.taskType === taskType)
      if (task) {
        totalDays += this.estimateTaskDays(task)
      }
    }

    return {
      criticalPath: taskSequence,
      estimatedDays: totalDays
    }
  }

  private getTaskSequence(printMethod: PrintMethod): string[] {
    const sequences: Record<PrintMethod, string[]> = {
      SILKSCREEN: ['DESIGN', 'SILKSCREEN_SETUP', 'SILKSCREEN_PRINT', 'SEWING', 'QUALITY_CHECK', 'FINISHING'],
      SUBLIMATION: ['DESIGN', 'SUBLIMATION_SETUP', 'SUBLIMATION_PRINT', 'SEWING', 'QUALITY_CHECK', 'FINISHING'],
      DTF: ['DESIGN', 'DTF_SETUP', 'DTF_PRINT', 'SEWING', 'QUALITY_CHECK', 'FINISHING'],
      EMBROIDERY: ['DESIGN', 'EMBROIDERY_SETUP', 'EMBROIDERY_STITCH', 'SEWING', 'QUALITY_CHECK', 'FINISHING'],
      NONE: ['SEWING', 'QUALITY_CHECK', 'FINISHING']
    }

    return sequences[printMethod] || sequences.NONE
  }

  private estimateTaskDays(task: Task): number {
    const baseDays: Record<string, number> = {
      DESIGN: 1,
      SILKSCREEN_SETUP: 0.5,
      SILKSCREEN_PRINT: 1,
      SEWING: 2,
      QUALITY_CHECK: 0.5,
      FINISHING: 1,
      default: 1
    }

    return baseDays[task.taskType] || baseDays.default
  }

  private identifyRiskFactors(order: Order & { tasks: Task[] }): string[] {
    const risks: string[] = []
    
    if (order.dueDate && new Date(order.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      risks.push('Tight deadline (less than 7 days)')
    }
    
    const pendingTasks = order.tasks.filter((t: Task) => t.status === 'OPEN')
    if (pendingTasks.length > 5) {
      risks.push('Many unassigned tasks')
    }

    if (order.quantity > 100) {
      risks.push('Large order volume')
    }

    return risks
  }

  private calculateForecastConfidence(order: Order & { tasks: Task[] }, riskFactors: string[]): number {
    let confidence = 0.8
    confidence -= riskFactors.length * 0.1
    
    const assignedTasks = order.tasks.filter((t: Task) => t.assignedTo).length
    const totalTasks = order.tasks.length
    if (totalTasks > 0) {
      confidence *= (assignedTasks / totalTasks)
    }

    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private generateRecommendations(order: Order & { tasks: Task[] }, riskFactors: string[]): string[] {
    const recommendations: string[] = []
    
    if (riskFactors.includes('Tight deadline (less than 7 days)')) {
      recommendations.push('Consider outsourcing some operations')
      recommendations.push('Assign high-priority rating to all tasks')
    }
    
    if (riskFactors.includes('Many unassigned tasks')) {
      recommendations.push('Assign tasks immediately to available operators')
    }

    return recommendations
  }

  private analyzeInventoryItem(item: InventoryItem & { usageRecords?: UsageRecord[] }): InventorySuggestion {
    const monthlyUsage = this.calculateMonthlyUsage(item.usageRecords)
    const daysOfStock = item.quantity / (monthlyUsage / 30)
    
    if (daysOfStock < 7) {
      return {
        action: 'RESTOCK',
        priority: daysOfStock < 3 ? 'HIGH' : 'MEDIUM',
        reasoning: `Only ${Math.round(daysOfStock)} days of stock remaining`,
        suggestedQuantity: Math.ceil(monthlyUsage * 2),
        estimatedCost: item.unitCost * Math.ceil(monthlyUsage * 2)
      }
    }
    
    if (daysOfStock > 180 && monthlyUsage < 5) {
      return {
        action: 'LIQUIDATE',
        priority: 'MEDIUM',
        reasoning: `${Math.round(daysOfStock)} days of stock, very slow-moving`,
        suggestedQuantity: Math.floor(item.quantity * 0.5)
      }
    }

    return { action: 'NONE' }
  }

  private calculateMonthlyUsage(usageRecords: UsageRecord[]): number {
    if (usageRecords.length === 0) return 0
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return usageRecords
      .filter(record => new Date(record.usedAt) >= thirtyDaysAgo)
      .reduce((sum, record) => sum + record.quantityUsed, 0)
  }

  private calculateTotalOrderCost(order: Order & { orderCosts: OrderCost[]; tasks: (Task & { taskCosts: TaskCost[] })[] }): number {
    const orderCosts = order.orderCosts.reduce((sum: number, cost: OrderCost) => sum + cost.amount, 0)
    const taskCosts = order.tasks.reduce((sum: number, task: Task & { taskCosts: TaskCost[] }) => 
      sum + task.taskCosts.reduce((taskSum: number, cost: TaskCost) => taskSum + cost.amount, 0), 0)
    
    return orderCosts + taskCosts
  }

  private async analyzeMarketPricing(order: Order): Promise<{ analysis: string }> {
    // Simplified market analysis - in real implementation, this would use external APIs
    return {
      analysis: `Market analysis for ${order.apparelType} suggests pricing range of $${(order.quantity * 15).toFixed(2)} - $${(order.quantity * 25).toFixed(2)}`
    }
  }

  private generatePricingReasoning(totalCost: number, marketAnalysis: { analysis: string }): string {
    return `Based on total cost of $${totalCost.toFixed(2)} and ${marketAnalysis.analysis}`
  }

  private async detectCostAnomalies(): Promise<AnomalyDetection[]> {
    // Detect unusual cost patterns
    const recentOrders = await db.order.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        orderCosts: true
      }
    })

    const anomalies: AnomalyDetection[] = []
    
    // Example: Detect orders with unusually high costs
    const avgCost = recentOrders.reduce((sum, order) => 
      sum + order.orderCosts.reduce((orderSum, cost) => orderSum + cost.amount, 0), 0
    ) / recentOrders.length

    for (const order of recentOrders) {
      const orderCost = order.orderCosts.reduce((sum, cost) => sum + cost.amount, 0)
      if (orderCost > avgCost * 2) {
        anomalies.push({
          type: 'COST',
          severity: 'HIGH',
          description: `Order ${order.orderNumber} has unusually high cost`,
          affectedEntity: order.id,
          suggestedAction: 'Review cost breakdown and verify accuracy',
          confidence: 0.85
        })
      }
    }

    return anomalies
  }

  private async detectVendorAnomalies(): Promise<AnomalyDetection[]> {
    // Detect vendor pricing anomalies
    return []
  }

  private async detectPerformanceAnomalies(): Promise<AnomalyDetection[]> {
    // Detect performance issues
    return []
  }

  private async detectQualityAnomalies(): Promise<AnomalyDetection[]> {
    // Detect quality issues
    const qcRecords = await db.qCRecord.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        inspector: true,
        order: true
      }
    })

    const anomalies: AnomalyDetection[] = []
    
    // Group by inspector and calculate reject rates
    const inspectorStats = qcRecords.reduce((acc, record) => {
      const inspectorId = record.inspectorId
      if (!acc[inspectorId]) {
        acc[inspectorId] = { total: 0, failures: 0, name: record.inspector.name }
      }
      acc[inspectorId].total++
      if (record.status === 'FAIL') {
        acc[inspectorId].failures++
      }
      return acc
    }, {} as Record<string, { total: number, failures: number, name: string }>)

    // Detect unusually high reject rates
    for (const [inspectorId, stats] of Object.entries(inspectorStats)) {
      const rejectRate = stats.failures / stats.total
      if (rejectRate > 0.3 && stats.total > 5) {
        anomalies.push({
          type: 'QUALITY',
          severity: rejectRate > 0.5 ? 'HIGH' : 'MEDIUM',
          description: `High reject rate (${(rejectRate * 100).toFixed(1)}%) detected`,
          affectedEntity: inspectorId,
          suggestedAction: 'Review quality standards and training needs',
          confidence: 0.9
        })
      }
    }

    return anomalies
  }
}

export const aiService = new AIService()