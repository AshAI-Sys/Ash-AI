import { prisma } from '@/lib/db'
import { createAgent } from './ashley-agents'
// Ashley AI Alert System
// Comprehensive alert rules and management for the apparel system


export type AlertSeverity = 'P1' | 'P2' | 'P3'
export type AlertCategory = 'PRODUCTION' | 'FINANCE' | 'INVENTORY' | 'HR' | 'DATA'
export type AlertStatus = 'OPEN' | 'ACK' | 'RESOLVED' | 'IGNORED'

export interface AlertRule {
  id: string
  name: string
  category: AlertCategory
  severity: AlertSeverity
  description: string
  condition: (data: Record<string, unknown>) => Promise<boolean>
  generateAlert: (data: Record<string, unknown>) => Promise<AlertPayload>
  enabled: boolean
}

export interface AlertPayload {
  title: string
  summary: string
  impact?: Record<string, unknown>
  signals?: Record<string, unknown>
  recommendation?: string
  actions?: Record<string, unknown>
  links?: Record<string, unknown>
  entity_ref?: Record<string, unknown>
}

// Alert Rules Configuration
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'deadline_risk',
    name: 'Deadline Risk',
    category: 'PRODUCTION',
    severity: 'P2',
    description: 'ETA > due by >6h → propose split/outsourcing',
    enabled: true,
    condition: async (data) => {
      const orders = await prisma.order.findMany({
        where: {
          status: { in: ['IN_PRODUCTION', 'READY_FOR_QC'] },
          deadline: { not: null }
        },
        include: {
          tasks: {
            where: {
              status: { in: ['OPEN', 'IN_PROGRESS'] }
            }
          }
        }
      })

      // Check if any order has ETA > deadline by more than 6 hours
      for (const order of orders) {
        if (order.deadline) {
          const estimatedCompletionTime = calculateETA(order.tasks)
          const timeDiff = new Date(estimatedCompletionTime).getTime() - new Date(order.deadline).getTime()
          if (timeDiff > 6 * 60 * 60 * 1000) { // 6 hours in milliseconds
            return true
          }
        }
      }
      return false
    },
    generateAlert: async (data) => {
      const kai = createAgent('kai')
      const analysis = await kai.analyzeDeadlineRisk(data.orderId)
      
      return {
        title: 'Order Deadline Risk Detected',
        summary: `Order ${data.orderNumber} is at risk of missing deadline by >6 hours`,
        impact: {
          orderCount: 1,
          delayHours: data.delayHours,
          clientImpact: 'HIGH'
        },
        recommendation: 'Consider task splitting, outsourcing, or client communication',
        actions: {
          split_order: { label: 'Split Order', endpoint: '/api/orders/split' },
          outsource: { label: 'Find Subcontractor', endpoint: '/api/subcontractors/recommend' },
          notify_client: { label: 'Notify Client', endpoint: '/api/notifications/client' }
        },
        entity_ref: { type: 'order', id: data.orderId }
      }
    }
  },

  {
    id: 'reject_spike',
    name: 'Quality Reject Spike',
    category: 'PRODUCTION',
    severity: 'P2',
    description: '3-day vs 30-day reject rate +4 pts → lock recipe & training',
    enabled: true,
    condition: async (data) => {
      const now = new Date()
      const threeDaysAgo = new Date(new Date(now).getTime() - 3 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000)

      const recent3Days = await prisma.qCRecord.aggregate({
        where: {
          created_at: { gte: threeDaysAgo }
        },
        _avg: { rejected_qty: true },
        _count: true
      })

      const recent30Days = await prisma.qCRecord.aggregate({
        where: {
          created_at: { gte: thirtyDaysAgo }
        },
        _avg: { rejected_qty: true },
        _count: true
      })

      if (recent3Days._count && recent30Days._count) {
        const rate3Day = (recent3Days._avg.rejected_qty || 0) / recent3Days._count * 100
        const rate30Day = (recent30Days._avg.rejected_qty || 0) / recent30Days._count * 100
        
        return (rate3Day - rate30Day) >= 4 // 4 point increase
      }
      return false
    },
    generateAlert: async (data) => ({
      title: 'Quality Reject Rate Spike',
      summary: 'Reject rate increased by 4+ points compared to 30-day average',
      impact: {
        rejectRateIncrease: data.rateIncrease,
        affectedOrders: data.orderCount,
        costImpact: 'MEDIUM'
      },
      recommendation: 'Lock current recipe, conduct training session, review process',
      actions: {
        lock_recipe: { label: 'Lock Recipe', endpoint: '/api/production/lock-recipe' },
        schedule_training: { label: 'Schedule Training', endpoint: '/api/training/schedule' },
        review_process: { label: 'Review Process', endpoint: '/api/qc/review' }
      },
      entity_ref: { type: 'quality', period: '3days' }
    })
  },

  {
    id: 'negative_margin',
    name: 'Negative Margin Forecast',
    category: 'FINANCE',
    severity: 'P1',
    description: 'Projected margin < target or < 0 → pricing/material/logistics plan',
    enabled: true,
    condition: async (data) => {
      const orders = await prisma.order.findMany({
        where: {
          status: { in: ['IN_PRODUCTION', 'READY_FOR_QC'] }
        },
        include: {
          order_costs: true
        }
      })

      for (const order of orders) {
        const totalCosts = order.order_costs.reduce((sum, cost) => sum + cost.amount, 0)
        // Assuming selling price is stored somewhere or calculated
        const estimatedMargin = calculateOrderMargin(order, totalCosts)
        if (estimatedMargin < 0) {
          return true
        }
      }
      return false
    },
    generateAlert: async (data) => ({
      title: 'Negative Margin Forecast',
      summary: `Order ${data.orderNumber} projected to have negative margin`,
      impact: {
        projectedLoss: data.projectedLoss,
        affectedRevenue: data.revenue,
        urgency: 'CRITICAL'
      },
      recommendation: 'Review pricing strategy, optimize material costs, or adjust logistics',
      actions: {
        adjust_pricing: { label: 'Adjust Pricing', endpoint: '/api/pricing/adjust' },
        optimize_materials: { label: 'Optimize Materials', endpoint: '/api/materials/optimize' },
        review_logistics: { label: 'Review Logistics', endpoint: '/api/logistics/review' }
      },
      entity_ref: { type: 'order', id: data.orderId }
    })
  },

  {
    id: 'inventory_negative',
    name: 'Negative Inventory',
    category: 'INVENTORY',
    severity: 'P1',
    description: 'Inventory balance went negative or QR missing',
    enabled: true,
    condition: async (data) => {
      const negativeBatches = await prisma.inventoryBatch.findMany({
        where: {
          balance_qty: { lt: 0 },
          is_active: true
        }
      })

      const missingQR = await prisma.inventoryBatch.findMany({
        where: {
          qr_tag_id: null,
          is_active: true,
          received_at: { not: null }
        }
      })

      return negativeBatches.length > 0 || missingQR.length > 0
    },
    generateAlert: async (data) => ({
      title: 'Inventory Issues Detected',
      summary: 'Negative inventory balances or missing QR codes found',
      impact: {
        negativeBatches: data.negativeBatches,
        missingQRCount: data.missingQR,
        operationalRisk: 'HIGH'
      },
      recommendation: 'Audit inventory, regenerate QR codes, investigate discrepancies',
      actions: {
        audit_inventory: { label: 'Start Audit', endpoint: '/api/inventory/audit' },
        generate_qr: { label: 'Generate QR Codes', endpoint: '/api/inventory/qr/batch' },
        investigate: { label: 'Investigate', endpoint: '/api/inventory/investigate' }
      },
      entity_ref: { type: 'inventory', issues: data.issues }
    })
  },

  {
    id: 'idle_wip',
    name: 'Idle Work in Progress',
    category: 'PRODUCTION',
    severity: 'P3',
    description: 'In-progress tasks with no updates >12h in work hours',
    enabled: true,
    condition: async (data) => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
      
      const idleTasks = await prisma.task.findMany({
        where: {
          status: 'IN_PROGRESS',
          updated_at: { lt: twelveHoursAgo }
        }
      })

      return idleTasks.length > 0
    },
    generateAlert: async (data) => ({
      title: 'Idle Work in Progress',
      summary: `${data.idleTaskCount} tasks have been idle for >12 hours`,
      impact: {
        idleTaskCount: data.idleTaskCount,
        productionDelay: 'MEDIUM',
        resourceUtilization: 'LOW'
      },
      recommendation: 'Check task status, reassign if needed, or update progress',
      actions: {
        check_status: { label: 'Check Status', endpoint: '/api/tasks/check' },
        reassign: { label: 'Reassign Tasks', endpoint: '/api/tasks/reassign' },
        contact_assignee: { label: 'Contact Assignee', endpoint: '/api/notifications/assignee' }
      },
      entity_ref: { type: 'tasks', ids: data.taskIds }
    })
  },

  {
    id: 'suspect_timein',
    name: 'Suspect Time-in',
    category: 'HR',
    severity: 'P3',
    description: '>4h no completed tasks after time-in',
    enabled: true,
    condition: async (data) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const timeRecords = await prisma.timeRecord.findMany({
        where: {
          date: { gte: today },
          clock_in: { not: null },
          clock_out: null
        },
        include: {
          employee: {
            include: {
              assigned_tasks: {
                where: {
                  completed_at: { gte: today }
                }
              }
            }
          }
        }
      })

      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
      
      return timeRecords.some(record => 
        record.clock_in && 
        record.clock_in < fourHoursAgo && 
        record.employee.assigned_tasks.length === 0
      )
    },
    generateAlert: async (data) => ({
      title: 'Suspect Time-in Activity',
      summary: 'Employees clocked in >4h with no task completions',
      impact: {
        suspectEmployees: data.employeeCount,
        productivityConcern: 'MEDIUM',
        payrollImpact: 'LOW'
      },
      recommendation: 'Verify employee activity, check task assignments, or investigate',
      actions: {
        verify_activity: { label: 'Verify Activity', endpoint: '/api/hr/verify' },
        check_assignments: { label: 'Check Assignments', endpoint: '/api/tasks/employee' },
        investigate: { label: 'Investigate', endpoint: '/api/hr/investigate' }
      },
      entity_ref: { type: 'employees', ids: data.employeeIds }
    })
  }
]

// Alert Engine
export class AlertEngine {
  private rules: AlertRule[]

  constructor() {
    this.rules = ALERT_RULES.filter(rule => rule.enabled)
  }

  async processAlerts() {
    const alerts = []
    
    for (const rule of this.rules) {
      try {
        const shouldAlert = await rule.condition({})
        
        if (shouldAlert) {
          const alertData = await this.gatherAlertData(rule.id)
          const alertPayload = await rule.generateAlert(alertData)
          
          const alert = await this.createAlert(rule, alertPayload)
          alerts.push(alert)
        }
      } catch (_error) {
        console.error(`Error processing alert rule ${rule.id}:`, _error)
      }
    }

    return alerts
  }

  private async createAlert(rule: AlertRule, payload: AlertPayload) {
    return await prisma.alert.create({
      data: {
        severity: rule.severity,
        category: rule.category,
        title: payload.title,
        summary: payload.summary,
        impact: payload.impact || {},
        signals: payload.signals || {},
        recommendation: payload.recommendation,
        actions: payload.actions || {},
        links: payload.links || {},
        entity_ref: payload.entity_ref || {},
        status: 'OPEN'
      }
    })
  }

  private async gatherAlertData(ruleId: string): Promise<Record<string, unknown>> {
    // Gather specific data based on alert rule
    switch (ruleId) {
      case 'deadline_risk':
        return await this.getDeadlineRiskData()
      case 'reject_spike':
        return await this.getRejectSpikeData()
      case 'negative_margin':
        return await this.getNegativeMarginData()
      case 'inventory_negative':
        return await this.getInventoryIssuesData()
      case 'idle_wip':
        return await this.getIdleTasksData()
      case 'suspect_timein':
        return await this.getSuspectTimeData()
      default:
        return {}
    }
  }

  private async getDeadlineRiskData() {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['IN_PRODUCTION', 'READY_FOR_QC'] },
        deadline: { not: null }
      },
      include: {
        tasks: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
        }
      }
    })

    const riskyOrder = orders.find(order => {
      if (order.deadline) {
        const eta = calculateETA(order.tasks)
        return new Date(eta).getTime() > new Date(order.deadline).getTime() + (6 * 60 * 60 * 1000)
      }
      return false
    })

    if (riskyOrder) {
      return {
        orderId: riskyOrder.id,
        orderNumber: riskyOrder.po_no,
        delayHours: calculateDelayHours(riskyOrder)
      }
    }

    return {}
  }

  private async getRejectSpikeData() {
    // Implementation for reject spike data gathering
    const now = new Date()
    const threeDaysAgo = new Date(new Date(now).getTime() - 3 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000)

    const recent3Days = await prisma.qCRecord.aggregate({
      where: { created_at: { gte: threeDaysAgo } },
      _avg: { rejected_qty: true },
      _count: true
    })

    const recent30Days = await prisma.qCRecord.aggregate({
      where: { created_at: { gte: thirtyDaysAgo } },
      _avg: { rejected_qty: true },
      _count: true
    })

    return {
      rateIncrease: 4, // This would be calculated
      orderCount: recent3Days._count
    }
  }

  private async getNegativeMarginData() {
    // Implementation for negative margin data
    return {
      orderId: 'sample-order-id',
      orderNumber: 'ORD-001',
      projectedLoss: 1500,
      revenue: 10000
    }
  }

  private async getInventoryIssuesData() {
    const negativeBatches = await prisma.inventoryBatch.count({
      where: { balance_qty: { lt: 0 }, is_active: true }
    })

    const missingQR = await prisma.inventoryBatch.count({
      where: {
        qr_tag_id: null,
        is_active: true,
        received_at: { not: null }
      }
    })

    return {
      negativeBatches,
      missingQR,
      issues: ['negative_balance', 'missing_qr']
    }
  }

  private async getIdleTasksData() {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    
    const idleTasks = await prisma.task.findMany({
      where: {
        status: 'IN_PROGRESS',
        updated_at: { lt: twelveHoursAgo }
      }
    })

    return {
      idleTaskCount: idleTasks.length,
      taskIds: idleTasks.map(task => task.id)
    }
  }

  private async getSuspectTimeData() {
    // Implementation for suspect time-in data
    return {
      employeeCount: 2,
      employeeIds: ['emp-1', 'emp-2']
    }
  }

  async acknowledgeAlert(alertId: string, userId: string, note?: string) {
    await prisma.alert.update({
      where: { id: alertId },
      data: { status: 'ACK' }
    })

    await prisma.alertAudit.create({
      data: {
        alert_id: alertId,
        action: 'ACK',
        actor_id: userId,
        note: note || null
      }
    })
  }

  async resolveAlert(alertId: string, userId: string, note?: string) {
    await prisma.alert.update({
      where: { id: alertId },
      data: { 
        status: 'RESOLVED',
        resolved_at: new Date()
      }
    })

    await prisma.alertAudit.create({
      data: {
        alert_id: alertId,
        action: 'RESOLVE',
        actor_id: userId,
        note: note || null
      }
    })
  }
}

// Utility functions
function calculateETA(tasks: Array<Record<string, unknown>>): Date {
  // Simple ETA calculation - can be enhanced with ML
  const totalHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 8), 0)
  return new Date(Date.now() + totalHours * 60 * 60 * 1000)
}

function calculateDelayHours(order: Record<string, unknown>): number {
  if (!order.deadline) return 0
  const eta = calculateETA(order.tasks)
  return Math.max(0, (new Date(eta).getTime() - new Date(order.deadline).getTime()) / (60 * 60 * 1000))
}

function calculateOrderMargin(order: Record<string, unknown>, totalCosts: number): number {
  // Simplified margin calculation - enhance with actual pricing
  const estimatedPrice = order.quantity * 100 // $100 per unit assumption
  return ((estimatedPrice - totalCosts) / estimatedPrice) * 100
}

// Export singleton instance
export const alertEngine = new AlertEngine()