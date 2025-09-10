// Workflow Automation System - CLIENT_UPDATED_PLAN.md Implementation
// Automated order processing, status updates, and notifications

import { prisma } from './prisma'
import { logError } from './error-handler'

export interface AutomationRule {
  id: string
  name: string
  trigger: 'time_based' | 'status_change' | 'condition_met'
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  enabled: boolean
  priority: number
}

export interface AutomationCondition {
  type: 'order_status' | 'time_elapsed' | 'production_complete' | 'quality_passed'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'
  value: any
  field?: string
}

export interface AutomationAction {
  type: 'update_status' | 'send_notification' | 'create_task' | 'schedule_reminder'
  parameters: Record<string, any>
}

export class WorkflowAutomationEngine {
  private rules: AutomationRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    this.rules = [
      {
        id: 'auto_design_approval_reminder',
        name: 'Auto Design Approval Reminder',
        trigger: 'time_based',
        conditions: [
          {
            type: 'order_status',
            operator: 'equals',
            value: 'DESIGN_APPROVAL'
          },
          {
            type: 'time_elapsed',
            operator: 'greater_than',
            value: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
          }
        ],
        actions: [
          {
            type: 'send_notification',
            parameters: {
              recipient_type: 'CLIENT',
              message: 'Design approval pending - please review your order',
              priority: 'high'
            }
          }
        ],
        enabled: true,
        priority: 1
      },
      {
        id: 'auto_production_start',
        name: 'Auto Production Start',
        trigger: 'status_change',
        conditions: [
          {
            type: 'order_status',
            operator: 'equals',
            value: 'CONFIRMED'
          }
        ],
        actions: [
          {
            type: 'update_status',
            parameters: {
              new_status: 'PRODUCTION_PLANNED'
            }
          },
          {
            type: 'create_task',
            parameters: {
              task_type: 'MATERIAL_PROCUREMENT',
              assignee_role: 'WAREHOUSE_MANAGER',
              priority: 'high'
            }
          }
        ],
        enabled: true,
        priority: 2
      },
      {
        id: 'auto_quality_check',
        name: 'Auto Quality Check Trigger',
        trigger: 'condition_met',
        conditions: [
          {
            type: 'production_complete',
            operator: 'equals',
            value: true
          }
        ],
        actions: [
          {
            type: 'update_status',
            parameters: {
              new_status: 'QC'
            }
          },
          {
            type: 'create_task',
            parameters: {
              task_type: 'QUALITY_INSPECTION',
              assignee_role: 'QC_INSPECTOR',
              priority: 'high'
            }
          }
        ],
        enabled: true,
        priority: 3
      },
      {
        id: 'auto_delivery_ready',
        name: 'Auto Delivery Ready',
        trigger: 'condition_met',
        conditions: [
          {
            type: 'quality_passed',
            operator: 'equals',
            value: true
          }
        ],
        actions: [
          {
            type: 'update_status',
            parameters: {
              new_status: 'READY_FOR_DELIVERY'
            }
          },
          {
            type: 'send_notification',
            parameters: {
              recipient_type: 'CLIENT',
              message: 'Your order is ready for delivery!',
              priority: 'high'
            }
          }
        ],
        enabled: true,
        priority: 4
      }
    ]
  }

  async processAutomation(order_id: string, trigger: string, context: any = {}) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: order_id },
        include: {
          items: true,
          client: true,
          routing_steps: true
        }
      })

      if (!order) {
        throw new Error(`Order ${order_id} not found`)
      }

      const applicableRules = this.rules.filter(rule => 
        rule.enabled && rule.trigger === trigger
      ).sort((a, b) => a.priority - b.priority)

      for (const rule of applicableRules) {
        const conditionsMet = await this.evaluateConditions(rule.conditions, order, context)
        
        if (conditionsMet) {
          await this.executeActions(rule.actions, order, context)
          
          // Log automation execution
          await this.logAutomationExecution(rule.id, order_id, 'SUCCESS')
        }
      }

      return { success: true, message: 'Automation processing completed' }
    } catch (_error) {
      logError(error, `Workflow automation for order ${order_id}`)
      await this.logAutomationExecution('unknown', order_id, 'ERROR', error)
      throw error
    }
  }

  private async evaluateConditions(conditions: AutomationCondition[], order: any, context: any): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, order, context)
      if (!result) {
        return false // ALL conditions must be met
      }
    }
    return true
  }

  private async evaluateCondition(condition: AutomationCondition, order: any, context: any): Promise<boolean> {
    switch (condition.type) {
      case 'order_status':
        return this.compareValues(order.status, condition.operator, condition.value)
      
      case 'time_elapsed':
        const timeElapsed = Date.now() - new Date(order.updated_at).getTime()
        return this.compareValues(timeElapsed, condition.operator, condition.value)
      
      case 'production_complete':
        const completedSteps = order.routing_steps?.filter((step: any) => step.status === 'DONE').length || 0
        const totalSteps = order.routing_steps?.length || 0
        return totalSteps > 0 && completedSteps === totalSteps
      
      case 'quality_passed':
        // Check if quality control has passed
        const qcStep = order.routing_steps?.find((step: any) => step.workcenter_type === 'QC')
        return qcStep?.status === 'DONE' && qcStep?.quality_passed === true
      
      default:
        return false
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'contains':
        return String(actual).includes(String(expected))
      default:
        return false
    }
  }

  private async executeActions(actions: AutomationAction[], order: any, context: any) {
    for (const action of actions) {
      await this.executeAction(action, order, context)
    }
  }

  private async executeAction(action: AutomationAction, order: any, context: any) {
    switch (action.type) {
      case 'update_status':
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: action.parameters.new_status,
            updated_at: new Date()
          }
        })
        break

      case 'send_notification':
        await this.sendNotification(order, action.parameters)
        break

      case 'create_task':
        await this.createTask(order, action.parameters)
        break

      case 'schedule_reminder':
        await this.scheduleReminder(order, action.parameters)
        break
    }
  }

  private async sendNotification(order: any, params: any) {
    // Implementation for sending notifications
    // This would integrate with email service, SMS, or in-app notifications
    console.log(`Sending notification for order ${order.po_number}:`, params.message)
    
    // Create task record as notification substitute  
    await prisma.task.create({
      data: {
        workspace_id: order.workspace_id,
        title: `Order ${order.po_number} Update`,
        description: params.message,
        status: 'PENDING'
      }
    })
  }

  private async createTask(order: any, params: any) {
    // Create automated tasks for team members
    await prisma.task.create({
      data: {
        workspace_id: order.workspace_id,
        title: `${params.task_type}: ${order.po_number}`,
        description: `Automated task created for order ${order.po_number}`,
        priority: params.priority || 'MEDIUM',
        status: 'PENDING',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due in 24 hours
      }
    })
  }

  private async scheduleReminder(order: any, params: any) {
    // Schedule reminder for future processing
    // This would integrate with a job queue system like Bull or Agenda
    console.log(`Scheduling reminder for order ${order.po_number}:`, params)
  }

  private async logAutomationExecution(ruleId: string, order_id: string, status: string, error?: any) {
    try {
      // Log automation execution to console for now (automationLog model doesn't exist)
      console.log(`Automation executed - Rule: ${ruleId}, Order: ${order_id}, Status: ${status}`, error?.message || '')
    } catch (logError) {
      console.error('Failed to log automation execution:', logError)
    }
  }

  // Public methods for rule management
  async getRules(): Promise<AutomationRule[]> {
    return this.rules.filter(rule => rule.enabled)
  }

  async addRule(rule: AutomationRule): Promise<void> {
    this.rules.push(rule)
  }

  async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<void> {
    const index = this.rules.findIndex(rule => rule.id === ruleId)
    if (index >= 0) {
      this.rules[index] = { ...this.rules[index], ...updates }
    }
  }

  async removeRule(ruleId: string): Promise<void> {
    this.rules = this.rules.filter(rule => rule.id !== ruleId)
  }
}

// Global automation engine instance
export const automationEngine = new WorkflowAutomationEngine()

// Helper function to trigger automation
export async function triggerWorkflowAutomation(order_id: string, trigger: string, context: any = {}) {
  return await automationEngine.processAutomation(order_id, trigger, context)
}