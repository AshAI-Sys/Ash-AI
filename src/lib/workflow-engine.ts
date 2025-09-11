/**
 * ASH AI ERP - Intelligent Workflow Automation Engine
 * Automated order progression, task assignment, and notification system
 */

import { db } from './db'
import { OrderStatus, Role, TaskStatus, RoutingStepStatus } from '@prisma/client'
import { CacheInvalidator } from './redis-cache'
import { NotificationAutomation } from './notification-automation'
import { TaskAutoAssignment } from './task-automation'

export interface WorkflowCondition {
  type: 'TIME_ELAPSED' | 'STATUS_REACHED' | 'APPROVAL_RECEIVED' | 'QC_PASSED' | 'MATERIALS_READY' | 'TASKS_COMPLETED'
  parameters?: Record<string, any>
  dependencies?: string[]
}

export interface WorkflowAction {
  type: 'CHANGE_STATUS' | 'CREATE_TASK' | 'SEND_NOTIFICATION' | 'START_ROUTING_STEP' | 'ASSIGN_OPERATOR'
  parameters: Record<string, any>
  delay?: number // milliseconds
}

export interface WorkflowRule {
  id: string
  name: string
  description: string
  workspace_id: string
  trigger: WorkflowCondition
  actions: WorkflowAction[]
  enabled: boolean
  priority: number
  created_at: Date
  updated_at: Date
}

export interface AutoProgressCondition {
  orderId: string
  currentStatus: OrderStatus
  targetStatus: OrderStatus
  checkType: 'DESIGN_APPROVED' | 'MATERIALS_READY' | 'QC_PASSED' | 'TASKS_COMPLETED' | 'TIME_THRESHOLD'
  metadata?: Record<string, any>
}

export class WorkflowEngine {
  private static instance: WorkflowEngine
  private rules: Map<string, WorkflowRule> = new Map()
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine()
    }
    return WorkflowEngine.instance
  }

  // Initialize workflow engine
  async initialize() {
    console.log('🚀 Initializing Workflow Automation Engine...')
    await this.loadWorkflowRules()
    this.startAutomationLoop()
    console.log('✅ Workflow Engine initialized with', this.rules.size, 'rules')
  }

  // Load workflow rules from database
  private async loadWorkflowRules() {
    try {
      const rules = await db.workflowRule.findMany({
        where: { enabled: true },
        orderBy: { priority: 'desc' }
      })

      this.rules.clear()
      rules.forEach(rule => {
        this.rules.set(rule.id, {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          workspace_id: rule.workspace_id,
          trigger: JSON.parse(rule.trigger as string),
          actions: JSON.parse(rule.actions as string),
          enabled: rule.enabled,
          priority: rule.priority,
          created_at: rule.created_at,
          updated_at: rule.updated_at
        })
      })
    } catch (error) {
      console.error('Failed to load workflow rules:', error)
    }
  }

  // Start the automation loop
  private startAutomationLoop() {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(async () => {
      await this.processAutomationCycle()
    }, 30000) // Run every 30 seconds

    console.log('⚡ Workflow automation loop started')
  }

  // Stop the automation loop
  stopAutomationLoop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('⏹️ Workflow automation loop stopped')
  }

  // Main automation cycle
  private async processAutomationCycle() {
    try {
      console.log('🔄 Running automation cycle...')

      // Process automatic order progressions
      await this.processAutoOrderProgressions()

      // Process workflow rules
      await this.processWorkflowRules()

      // Process task auto-assignments
      await this.processTaskAutoAssignments()

      // Process notification automation
      await this.processNotificationAutomation()

      // Clean up completed tasks
      await this.cleanupCompletedTasks()

    } catch (error) {
      console.error('Automation cycle error:', error)
    }
  }

  // Automatic order status progression
  private async processAutoOrderProgressions() {
    // Get orders that might be ready for auto-progression
    const candidates = await db.order.findMany({
      where: {
        status: {
          in: [
            'DESIGN_PENDING',
            'DESIGN_APPROVAL', 
            'CONFIRMED',
            'PRODUCTION_PLANNED',
            'IN_PROGRESS',
            'QC',
            'PACKING'
          ]
        },
        updated_at: {
          lte: new Date(Date.now() - 5 * 60 * 1000) // At least 5 minutes old
        }
      },
      include: {
        design_assets: true,
        routing_steps: { where: { status: { not: 'DONE' } } },
        qc_inspections: true,
        tasks: { where: { status: { not: 'COMPLETED' } } }
      }
    })

    for (const order of candidates) {
      await this.checkAutoProgression(order)
    }
  }

  // Check if an order can be auto-progressed
  private async checkAutoProgression(order: any) {
    const orderId = order.id
    const currentStatus = order.status

    try {
      // Design approval auto-progression
      if (currentStatus === 'DESIGN_APPROVAL') {
        const approvedAssets = order.design_assets?.filter((asset: any) => 
          asset.approval_status === 'APPROVED'
        )
        
        if (approvedAssets?.length > 0) {
          await this.autoProgressOrder(orderId, 'CONFIRMED', 'SYSTEM', 'Design automatically approved')
          return
        }
      }

      // Production completion auto-progression
      if (currentStatus === 'IN_PROGRESS') {
        const completedSteps = order.routing_steps?.filter((step: any) => 
          step.status === 'DONE'
        ).length || 0
        const totalSteps = order.routing_steps?.length || 0

        if (totalSteps > 0 && completedSteps === totalSteps) {
          await this.autoProgressOrder(orderId, 'QC', 'SYSTEM', 'All production steps completed')
          return
        }
      }

      // QC completion auto-progression
      if (currentStatus === 'QC') {
        const passedInspections = order.qc_inspections?.filter((qc: any) => 
          qc.status === 'PASSED'
        )
        
        if (passedInspections?.length > 0) {
          await this.autoProgressOrder(orderId, 'PACKING', 'SYSTEM', 'QC inspection passed')
          return
        }
      }

      // Task completion auto-progression
      const incompleteTasks = order.tasks?.length || 0
      if (incompleteTasks === 0 && this.shouldProgressFromTasks(currentStatus)) {
        const nextStatus = this.getNextStatusAfterTasks(currentStatus)
        if (nextStatus) {
          await this.autoProgressOrder(orderId, nextStatus, 'SYSTEM', 'All required tasks completed')
        }
      }

    } catch (error) {
      console.error(`Auto-progression error for order ${orderId}:`, error)
    }
  }

  // Auto-progress an order
  private async autoProgressOrder(
    orderId: string, 
    newStatus: OrderStatus, 
    userId: string, 
    reason: string
  ) {
    try {
      const order = await db.order.findUnique({ where: { id: orderId } })
      if (!order) return

      // Update order status
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            updated_at: new Date()
          }
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            workspace_id: order.workspace_id,
            actor_id: 'SYSTEM',
            entity_type: 'ORDER',
            entity_id: orderId,
            action: 'STATUS_CHANGE',
            before_data: JSON.stringify({ status: order.status }),
            after_data: JSON.stringify({ status: newStatus, reason, automated: true })
          }
        })
      })

      // Trigger notifications
      await NotificationAutomation.getInstance().sendOrderStatusNotification(
        orderId,
        order.status,
        newStatus,
        'SYSTEM',
        reason
      )

      // Create follow-up tasks
      await TaskAutoAssignment.getInstance().createTasksForStatus(orderId, newStatus)

      // Invalidate cache
      await CacheInvalidator.invalidateOrder(orderId)

      console.log(`✅ Auto-progressed order ${order.po_number} from ${order.status} to ${newStatus}`)

    } catch (error) {
      console.error(`Failed to auto-progress order ${orderId}:`, error)
    }
  }

  // Process workflow rules
  private async processWorkflowRules() {
    for (const rule of this.rules.values()) {
      try {
        await this.evaluateWorkflowRule(rule)
      } catch (error) {
        console.error(`Workflow rule ${rule.name} error:`, error)
      }
    }
  }

  // Evaluate a specific workflow rule
  private async evaluateWorkflowRule(rule: WorkflowRule) {
    const { trigger, actions, workspace_id } = rule

    // Check trigger conditions
    const shouldTrigger = await this.evaluateTriggerCondition(trigger, workspace_id)
    
    if (shouldTrigger) {
      console.log(`🎯 Triggering workflow rule: ${rule.name}`)

      // Execute actions
      for (const action of actions) {
        try {
          await this.executeWorkflowAction(action, workspace_id)
        } catch (error) {
          console.error(`Action execution error in rule ${rule.name}:`, error)
        }
      }
    }
  }

  // Evaluate trigger conditions
  private async evaluateTriggerCondition(
    condition: WorkflowCondition, 
    workspaceId: string
  ): Promise<boolean> {
    switch (condition.type) {
      case 'TIME_ELAPSED':
        return await this.checkTimeElapsedCondition(condition, workspaceId)
      
      case 'STATUS_REACHED':
        return await this.checkStatusReachedCondition(condition, workspaceId)
      
      case 'APPROVAL_RECEIVED':
        return await this.checkApprovalReceivedCondition(condition, workspaceId)
      
      case 'QC_PASSED':
        return await this.checkQCPassedCondition(condition, workspaceId)
      
      case 'TASKS_COMPLETED':
        return await this.checkTasksCompletedCondition(condition, workspaceId)

      default:
        return false
    }
  }

  // Execute workflow actions
  private async executeWorkflowAction(action: WorkflowAction, workspaceId: string) {
    // Add delay if specified
    if (action.delay) {
      await new Promise(resolve => setTimeout(resolve, action.delay))
    }

    switch (action.type) {
      case 'CHANGE_STATUS':
        await this.executeStatusChangeAction(action, workspaceId)
        break

      case 'CREATE_TASK':
        await this.executeCreateTaskAction(action, workspaceId)
        break

      case 'SEND_NOTIFICATION':
        await this.executeSendNotificationAction(action, workspaceId)
        break

      case 'START_ROUTING_STEP':
        await this.executeStartRoutingStepAction(action, workspaceId)
        break

      case 'ASSIGN_OPERATOR':
        await this.executeAssignOperatorAction(action, workspaceId)
        break
    }
  }

  // Execute status change action
  private async executeStatusChangeAction(action: WorkflowAction, workspaceId: string) {
    const { orderId, newStatus, reason } = action.parameters
    
    if (orderId && newStatus) {
      await this.autoProgressOrder(orderId, newStatus, 'SYSTEM', reason || 'Workflow automation')
    }
  }

  // Execute create task action
  private async executeCreateTaskAction(action: WorkflowAction, workspaceId: string) {
    const { title, description, assignedTo, priority, dueDate, orderId } = action.parameters

    await db.task.create({
      data: {
        workspace_id: workspaceId,
        title,
        description,
        assigned_to: assignedTo,
        priority: priority || 'MEDIUM',
        due_date: dueDate ? new Date(dueDate) : undefined,
        metadata: orderId ? JSON.stringify({ orderId }) : undefined,
        created_by: 'SYSTEM'
      }
    })
  }

  // Execute send notification action
  private async executeSendNotificationAction(action: WorkflowAction, workspaceId: string) {
    const { type, recipientId, title, message, channels } = action.parameters

    await NotificationAutomation.getInstance().sendCustomNotification({
      workspaceId,
      recipientId,
      title,
      message,
      type: type || 'INFO',
      channels: channels || ['IN_APP']
    })
  }

  // Helper functions for trigger conditions
  private async checkTimeElapsedCondition(condition: WorkflowCondition, workspaceId: string): Promise<boolean> {
    const { orderId, minutes } = condition.parameters || {}
    
    if (!orderId || !minutes) return false

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { updated_at: true }
    })

    if (!order) return false

    const elapsed = Date.now() - order.updated_at.getTime()
    return elapsed >= (minutes * 60 * 1000)
  }

  private async checkStatusReachedCondition(condition: WorkflowCondition, workspaceId: string): Promise<boolean> {
    const { orderId, status } = condition.parameters || {}
    
    if (!orderId || !status) return false

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })

    return order?.status === status
  }

  private async checkTasksCompletedCondition(condition: WorkflowCondition, workspaceId: string): Promise<boolean> {
    const { orderId } = condition.parameters || {}
    
    if (!orderId) return false

    const incompleteTasks = await db.task.count({
      where: {
        workspace_id: workspaceId,
        metadata: {
          path: ['orderId'],
          equals: orderId
        },
        status: { not: 'COMPLETED' }
      }
    })

    return incompleteTasks === 0
  }

  // Process task auto-assignments
  private async processTaskAutoAssignments() {
    await TaskAutoAssignment.getInstance().processAutoAssignments()
  }

  // Process notification automation
  private async processNotificationAutomation() {
    await NotificationAutomation.getInstance().processPendingNotifications()
  }

  // Cleanup completed tasks
  private async cleanupCompletedTasks() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
    
    await db.task.deleteMany({
      where: {
        status: 'COMPLETED',
        completed_at: {
          lte: cutoffDate
        }
      }
    })
  }

  // Helper methods
  private shouldProgressFromTasks(status: OrderStatus): boolean {
    return ['DESIGN_PENDING', 'CONFIRMED', 'PRODUCTION_PLANNED'].includes(status)
  }

  private getNextStatusAfterTasks(status: OrderStatus): OrderStatus | null {
    const progressionMap: Record<string, OrderStatus> = {
      'DESIGN_PENDING': 'DESIGN_APPROVAL',
      'CONFIRMED': 'PRODUCTION_PLANNED',
      'PRODUCTION_PLANNED': 'IN_PROGRESS'
    }
    
    return progressionMap[status] || null
  }

  // Public methods for manual control
  async createWorkflowRule(rule: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>) {
    const newRule = await db.workflowRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        workspace_id: rule.workspace_id,
        trigger: JSON.stringify(rule.trigger),
        actions: JSON.stringify(rule.actions),
        enabled: rule.enabled,
        priority: rule.priority
      }
    })

    await this.loadWorkflowRules() // Reload rules
    return newRule
  }

  async updateWorkflowRule(id: string, updates: Partial<WorkflowRule>) {
    const updatedRule = await db.workflowRule.update({
      where: { id },
      data: {
        ...updates,
        trigger: updates.trigger ? JSON.stringify(updates.trigger) : undefined,
        actions: updates.actions ? JSON.stringify(updates.actions) : undefined,
        updated_at: new Date()
      }
    })

    await this.loadWorkflowRules() // Reload rules
    return updatedRule
  }

  async deleteWorkflowRule(id: string) {
    await db.workflowRule.delete({ where: { id } })
    this.rules.delete(id)
  }

  async getWorkflowRules(workspaceId: string) {
    return Array.from(this.rules.values()).filter(rule => rule.workspace_id === workspaceId)
  }

  // Check additional conditions (stubs for future implementation)
  private async checkApprovalReceivedCondition(condition: WorkflowCondition, workspaceId: string): Promise<boolean> {
    // Implementation for checking approvals
    return false
  }

  private async checkQCPassedCondition(condition: WorkflowCondition, workspaceId: string): Promise<boolean> {
    // Implementation for checking QC status
    return false
  }

  private async executeStartRoutingStepAction(action: WorkflowAction, workspaceId: string) {
    // Implementation for starting routing steps
  }

  private async executeAssignOperatorAction(action: WorkflowAction, workspaceId: string) {
    // Implementation for operator assignment
  }
}

// Singleton instance
export const workflowEngine = WorkflowEngine.getInstance()

// Initialize on import
if (typeof window === 'undefined') {
  // Only initialize on server side
  workflowEngine.initialize().catch(console.error)
}