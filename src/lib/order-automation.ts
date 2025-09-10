// Order Workflow Automation - CLIENT_UPDATED_PLAN.md Implementation
// Automate order status changes, notifications, and routing decisions

import { prisma } from './prisma'
import { OrderStatus, RoutingStepStatus, WorkcenterType } from '@prisma/client'
import { logError } from './error-handler'
import { productionTracker } from './realtime-tracking'
import { sendNotification } from './notification-system'

export interface OrderAutomationRule {
  id: string
  name: string
  trigger: 'STATUS_CHANGE' | 'TIME_BASED' | 'ROUTING_COMPLETE' | 'QUALITY_FAIL'
  conditions: Record<string, any>
  actions: AutomationAction[]
  active: boolean
}

export interface AutomationAction {
  type: 'UPDATE_STATUS' | 'SEND_NOTIFICATION' | 'CREATE_TASK' | 'UPDATE_ROUTING' | 'SCHEDULE_NEXT'
  parameters: Record<string, any>
}

export class OrderWorkflowAutomation {
  private rules: Map<string, OrderAutomationRule> = new Map()

  constructor() {
    this.initializeDefaultRules()
    this.startAutomationEngine()
  }

  private initializeDefaultRules() {
    // Rule 1: Auto-advance from INTAKE to DESIGN_REVIEW when client info complete
    this.addRule({
      id: 'intake-to-design',
      name: 'Auto advance from Intake to Design Review',
      trigger: 'STATUS_CHANGE',
      conditions: {
        fromStatus: 'INTAKE',
        hasClientInfo: true,
        hasSpecifications: true
      },
      actions: [
        {
          type: 'UPDATE_STATUS',
          parameters: { status: 'DESIGN_REVIEW' }
        },
        {
          type: 'SEND_NOTIFICATION',
          parameters: {
            recipients: ['GRAPHIC_ARTIST'],
            template: 'new_design_request',
            message: 'New order ready for design review'
          }
        },
        {
          type: 'CREATE_TASK',
          parameters: {
            title: 'Design Review Required',
            assignedRole: 'GRAPHIC_ARTIST',
            priority: 'MEDIUM'
          }
        }
      ],
      active: true
    })

    // Rule 2: Auto-advance from DESIGN_APPROVED to PRODUCTION_PLANNED
    this.addRule({
      id: 'design-to-production',
      name: 'Auto advance to Production Planning',
      trigger: 'STATUS_CHANGE',
      conditions: {
        fromStatus: 'DESIGN_APPROVED',
        hasApprovedDesign: true
      },
      actions: [
        {
          type: 'UPDATE_STATUS',
          parameters: { status: 'PRODUCTION_PLANNED' }
        },
        {
          type: 'UPDATE_ROUTING',
          parameters: { action: 'GENERATE_ROUTING_STEPS' }
        },
        {
          type: 'SEND_NOTIFICATION',
          parameters: {
            recipients: ['MANAGER', 'PRODUCTION_MANAGER'],
            template: 'production_ready',
            message: 'Order approved and ready for production'
          }
        }
      ],
      active: true
    })

    // Rule 3: Auto-advance routing steps when previous completes
    this.addRule({
      id: 'routing-step-advance',
      name: 'Auto advance routing steps',
      trigger: 'ROUTING_COMPLETE',
      conditions: {
        stepStatus: 'DONE',
        qualityPassed: true
      },
      actions: [
        {
          type: 'SCHEDULE_NEXT',
          parameters: { action: 'START_NEXT_ROUTING_STEP' }
        },
        {
          type: 'SEND_NOTIFICATION',
          parameters: {
            recipients: ['OPERATOR'],
            template: 'step_ready',
            message: 'Next production step is ready to start'
          }
        }
      ],
      active: true
    })

    // Rule 4: Quality Control Automation
    this.addRule({
      id: 'qc-automation',
      name: 'Quality Control Routing',
      trigger: 'ROUTING_COMPLETE',
      conditions: {
        stepType: 'SEWING',
        status: 'DONE'
      },
      actions: [
        {
          type: 'UPDATE_ROUTING',
          parameters: { 
            action: 'CREATE_QC_STEP',
            inspectionType: 'FINAL_INSPECTION'
          }
        },
        {
          type: 'SEND_NOTIFICATION',
          parameters: {
            recipients: ['QC_INSPECTOR'],
            template: 'qc_required',
            message: 'Quality inspection required'
          }
        }
      ],
      active: true
    })

    // Rule 5: Order Completion Automation
    this.addRule({
      id: 'order-completion',
      name: 'Auto complete orders',
      trigger: 'ROUTING_COMPLETE',
      conditions: {
        allStepsComplete: true,
        qcPassed: true,
        packingComplete: true
      },
      actions: [
        {
          type: 'UPDATE_STATUS',
          parameters: { status: 'COMPLETED' }
        },
        {
          type: 'SEND_NOTIFICATION',
          parameters: {
            recipients: ['CLIENT'],
            template: 'order_completed',
            message: 'Your order is ready for pickup/delivery'
          }
        },
        {
          type: 'CREATE_TASK',
          parameters: {
            title: 'Schedule Delivery',
            assignedRole: 'LOGISTICS',
            priority: 'HIGH'
          }
        }
      ],
      active: true
    })
  }

  private addRule(rule: OrderAutomationRule) {
    this.rules.set(rule.id, rule)
  }

  private startAutomationEngine() {
    // Check for time-based rules every minute
    setInterval(() => {
      this.processTimeBased Automation()
    }, 60000)
  }

  // Main automation processor
  async processOrderEvent(
    orderId: string,
    eventType: OrderAutomationRule['trigger'],
    eventData: Record<string, any>
  ) {
    try {
      const applicableRules = Array.from(this.rules.values())
        .filter(rule => rule.active && rule.trigger === eventType)

      for (const rule of applicableRules) {
        if (await this.evaluateConditions(orderId, rule.conditions, eventData)) {
          await this.executeActions(orderId, rule.actions, eventData)
          
          // Log automation execution
          await this.logAutomationExecution(orderId, rule, eventData)
        }
      }
    } catch (_error) {
      logError(error, `Failed to process automation for order ${orderId}`)
    }
  }

  private async evaluateConditions(
    orderId: string,
    conditions: Record<string, any>,
    eventData: Record<string, any>
  ): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        routing_steps: true,
        design_assets: true,
        qc_inspections: true,
        client: true
      }
    })

    if (!order) return false

    // Evaluate each condition
    for (const [key, expectedValue] of Object.entries(conditions)) {
      switch (key) {
        case 'fromStatus':
          if (eventData.previousStatus !== expectedValue) return false
          break
        case 'hasClientInfo':
          if (expectedValue && (!order.client || !order.commercials)) return false
          break
        case 'hasSpecifications':
          if (expectedValue && !order.variants) return false
          break
        case 'hasApprovedDesign':
          const approvedDesign = order.design_assets.some(d => d.approval_status === 'APPROVED')
          if (expectedValue && !approvedDesign) return false
          break
        case 'stepStatus':
          if (eventData.stepStatus !== expectedValue) return false
          break
        case 'qualityPassed':
          if (expectedValue && eventData.qualityPassed !== true) return false
          break
        case 'stepType':
          if (eventData.stepType !== expectedValue) return false
          break
        case 'allStepsComplete':
          const allComplete = order.routing_steps.every(step => step.status === 'DONE')
          if (expectedValue && !allComplete) return false
          break
        case 'qcPassed':
          const latestQC = order.qc_inspections
            .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]
          if (expectedValue && (!latestQC || latestQC.result !== 'ACCEPT')) return false
          break
        case 'packingComplete':
          const packingStep = order.routing_steps.find(s => s.workcenter === 'PACKING')
          if (expectedValue && (!packingStep || packingStep.status !== 'DONE')) return false
          break
      }
    }

    return true
  }

  private async executeActions(
    orderId: string,
    actions: AutomationAction[],
    eventData: Record<string, any>
  ) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'UPDATE_STATUS':
            await this.updateOrderStatus(orderId, action.parameters.status)
            break
          case 'SEND_NOTIFICATION':
            await this.sendAutomationNotification(orderId, action.parameters)
            break
          case 'CREATE_TASK':
            await this.createAutomationTask(orderId, action.parameters)
            break
          case 'UPDATE_ROUTING':
            await this.updateRouting(orderId, action.parameters, eventData)
            break
          case 'SCHEDULE_NEXT':
            await this.scheduleNextStep(orderId, eventData)
            break
        }
      } catch (_error) {
        logError(error, `Failed to execute action ${action.type} for order ${orderId}`)
      }
    }
  }

  private async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        updated_at: new Date()
      }
    })

    // Notify real-time tracking system
    await productionTracker.updateProductionStatus(orderId, '', {
      status: 'COMPLETED'
    })
  }

  private async sendAutomationNotification(
    orderId: string,
    parameters: Record<string, any>
  ) {
    const { recipients, template, message } = parameters

    for (const recipient of recipients) {
      await sendNotification({
        recipient_type: 'ROLE',
        recipient_id: recipient,
        title: `Order Automation: ${template}`,
        message: message,
        related_entity_type: 'ORDER',
        related_entity_id: orderId,
        priority: 'NORMAL'
      })
    }
  }

  private async createAutomationTask(
    orderId: string,
    parameters: Record<string, any>
  ) {
    await prisma.task.create({
      data: {
        workspace_id: 'workspace-1', // Should get from order context
        title: parameters.title,
        description: `Automated task for order ${orderId}`,
        status: 'OPEN',
        priority: parameters.priority || 'MEDIUM',
        created_by: 'automation-system'
      }
    })
  }

  private async updateRouting(
    orderId: string,
    parameters: Record<string, any>,
    eventData: Record<string, any>
  ) {
    const { action } = parameters

    switch (action) {
      case 'GENERATE_ROUTING_STEPS':
        await this.generateProductionRouting(orderId)
        break
      case 'CREATE_QC_STEP':
        await this.createQCStep(orderId, parameters.inspectionType)
        break
    }
  }

  private async generateProductionRouting(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) return

    // Generate routing steps based on product method
    const routingSteps = this.getDefaultRoutingSteps(order.method)

    for (let i = 0; i < routingSteps.length; i++) {
      const step = routingSteps[i]
      await prisma.routingStep.create({
        data: {
          order_id: orderId,
          name: step.name,
          workcenter: step.workcenter,
          sequence: i + 1,
          depends_on: step.depends_on || [],
          standard_spec: step.standard_spec || {},
          status: i === 0 ? 'READY' : 'PLANNED'
        }
      })
    }
  }

  private async createQCStep(orderId: string, inspectionType: string) {
    const lastStep = await prisma.routingStep.findFirst({
      where: { order_id: orderId },
      orderBy: { sequence: 'desc' }
    })

    await prisma.routingStep.create({
      data: {
        order_id: orderId,
        name: 'Quality Control',
        workcenter: 'QC',
        sequence: (lastStep?.sequence || 0) + 1,
        standard_spec: {
          inspection_type: inspectionType,
          sample_size: 'normal',
          aql_level: '2.5'
        },
        status: 'READY'
      }
    })
  }

  private async scheduleNextStep(orderId: string, eventData: Record<string, any>) {
    const currentStep = await prisma.routingStep.findUnique({
      where: { id: eventData.stepId }
    })

    if (!currentStep) return

    // Find next step in sequence
    const nextStep = await prisma.routingStep.findFirst({
      where: {
        order_id: orderId,
        sequence: { gt: currentStep.sequence },
        status: 'PLANNED'
      },
      orderBy: { sequence: 'asc' }
    })

    if (nextStep) {
      await prisma.routingStep.update({
        where: { id: nextStep.id },
        data: { 
          status: 'READY',
          planned_start: new Date()
        }
      })

      // Notify production tracker
      await productionTracker.updateProductionStatus(orderId, nextStep.id, {
        status: 'PENDING'
      })
    }
  }

  private getDefaultRoutingSteps(method: string) {
    // This would be more sophisticated in production
    const routingTemplates = {
      'SILKSCREEN': [
        { name: 'Design', workcenter: 'DESIGN' as WorkcenterType, depends_on: [] },
        { name: 'Screen Making', workcenter: 'PRINTING' as WorkcenterType, depends_on: ['Design'] },
        { name: 'Cutting', workcenter: 'CUTTING' as WorkcenterType, depends_on: [] },
        { name: 'Printing', workcenter: 'PRINTING' as WorkcenterType, depends_on: ['Screen Making', 'Cutting'] },
        { name: 'Sewing', workcenter: 'SEWING' as WorkcenterType, depends_on: ['Printing'] },
        { name: 'Quality Control', workcenter: 'QC' as WorkcenterType, depends_on: ['Sewing'] },
        { name: 'Packing', workcenter: 'PACKING' as WorkcenterType, depends_on: ['Quality Control'] }
      ],
      'DTF': [
        { name: 'Design', workcenter: 'DESIGN' as WorkcenterType, depends_on: [] },
        { name: 'DTF Printing', workcenter: 'PRINTING' as WorkcenterType, depends_on: ['Design'] },
        { name: 'Cutting', workcenter: 'CUTTING' as WorkcenterType, depends_on: [] },
        { name: 'Heat Press', workcenter: 'HEAT_PRESS' as WorkcenterType, depends_on: ['DTF Printing', 'Cutting'] },
        { name: 'Sewing', workcenter: 'SEWING' as WorkcenterType, depends_on: ['Heat Press'] },
        { name: 'Quality Control', workcenter: 'QC' as WorkcenterType, depends_on: ['Sewing'] },
        { name: 'Packing', workcenter: 'PACKING' as WorkcenterType, depends_on: ['Quality Control'] }
      ]
    }

    return routingTemplates[method] || routingTemplates['SILKSCREEN']
  }

  private async processTimeBasedAutomation() {
    // Process any time-based automation rules
    const timeBasedRules = Array.from(this.rules.values())
      .filter(rule => rule.active && rule.trigger === 'TIME_BASED')

    // Implementation would check for overdue orders, scheduled tasks, etc.
  }

  private async logAutomationExecution(
    orderId: string,
    rule: OrderAutomationRule,
    eventData: Record<string, any>
  ) {
    await prisma.auditLog.create({
      data: {
        workspace_id: 'workspace-1',
        entity_type: 'ORDER',
        entity_id: orderId,
        action: 'AUTOMATION_EXECUTED',
        changes: {
          rule_id: rule.id,
          rule_name: rule.name,
          event_data: eventData,
          timestamp: new Date()
        }
      }
    })
  }
}

// Global automation instance
export const orderAutomation = new OrderWorkflowAutomation()

// Helper functions for external use
export async function processOrderStatusChange(
  orderId: string,
  newStatus: OrderStatus,
  previousStatus?: OrderStatus
) {
  await orderAutomation.processOrderEvent(orderId, 'STATUS_CHANGE', {
    newStatus,
    previousStatus
  })
}

export async function processRoutingStepComplete(
  orderId: string,
  stepId: string,
  stepData: Record<string, any>
) {
  await orderAutomation.processOrderEvent(orderId, 'ROUTING_COMPLETE', {
    stepId,
    ...stepData
  })
}