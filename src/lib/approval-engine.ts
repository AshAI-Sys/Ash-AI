// @ts-nocheck
import { prisma } from '@/lib/prisma'
import { Role, OrderStatus } from '@prisma/client'
import { workflowEngine } from '@/lib/workflow-engine'

export interface ApprovalRequest {
  id: string
  entityId: string
  entityType: 'ORDER' | 'PRODUCTION_CHANGE' | 'BUDGET_REQUEST' | 'DESIGN_CHANGE'
  requestType: 'HIGH_VALUE_ORDER' | 'RUSH_ORDER' | 'CUSTOM_DESIGN' | 'BUDGET_INCREASE' | 'DEADLINE_EXTENSION'
  requestedBy: string
  approverRole: Role
  approverUserId?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  title: string
  description: string
  requestData: Record<string, any>
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  comments?: string
  expiresAt?: Date
  autoApprovalCriteria?: AutoApprovalCriteria
}

export interface AutoApprovalCriteria {
  enabled: boolean
  conditions: ApprovalCondition[]
  fallbackToManual: boolean
  bypassRoles: Role[]
}

export interface ApprovalCondition {
  field: string
  operator: 'EQUALS' | 'LESS_THAN' | 'GREATER_THAN' | 'IN_RANGE' | 'EXISTS'
  value: any
  weight: number
}

export interface ApprovalRule {
  id: string
  name: string
  entityType: string
  requestType: string
  requiredRole: Role
  autoApproval: AutoApprovalCriteria
  escalationRules: EscalationRule[]
  enabled: boolean
}

export interface EscalationRule {
  condition: 'TIME_ELAPSED' | 'NO_RESPONSE' | 'REJECTED'
  threshold: number // hours for TIME_ELAPSED
  action: 'ESCALATE_TO_HIGHER' | 'AUTO_APPROVE' | 'AUTO_REJECT' | 'NOTIFY_ADMIN'
  targetRole?: Role
}

export class ApprovalEngine {
  private static instance: ApprovalEngine
  private approvalRules: ApprovalRule[] = []

  static getInstance(): ApprovalEngine {
    if (!ApprovalEngine.instance) {
      ApprovalEngine.instance = new ApprovalEngine()
    }
    return ApprovalEngine.instance
  }

  constructor() {
    this.initializeApprovalRules()
  }

  private initializeApprovalRules() {
    this.approvalRules = [
      // High Value Order Approval
      {
        id: 'high-value-order',
        name: 'High Value Order Approval',
        entityType: 'ORDER',
        requestType: 'HIGH_VALUE_ORDER',
        requiredRole: 'MANAGER',
        autoApproval: {
          enabled: true,
          conditions: [
            { field: 'client.creditRating', operator: 'GREATER_THAN', value: 'A', weight: 0.4 },
            { field: 'order.totalValue', operator: 'LESS_THAN', value: 100000, weight: 0.3 },
            { field: 'client.paymentHistory', operator: 'EQUALS', value: 'EXCELLENT', weight: 0.3 }
          ],
          fallbackToManual: true,
          bypassRoles: ['ADMIN']
        },
        escalationRules: [
          {
            condition: 'TIME_ELAPSED',
            threshold: 4, // 4 hours
            action: 'ESCALATE_TO_HIGHER',
            targetRole: 'ADMIN'
          },
          {
            condition: 'TIME_ELAPSED',
            threshold: 24, // 24 hours
            action: 'NOTIFY_ADMIN'
          }
        ],
        enabled: true
      },

      // Rush Order Approval
      {
        id: 'rush-order',
        name: 'Rush Order Approval',
        entityType: 'ORDER',
        requestType: 'RUSH_ORDER',
        requiredRole: 'PRODUCTION_MANAGER',
        autoApproval: {
          enabled: true,
          conditions: [
            { field: 'production.currentCapacity', operator: 'LESS_THAN', value: 80, weight: 0.5 },
            { field: 'order.rushFee', operator: 'GREATER_THAN', value: 0.2, weight: 0.3 },
            { field: 'client.priority', operator: 'IN_RANGE', value: ['HIGH', 'VIP'], weight: 0.2 }
          ],
          fallbackToManual: false,
          bypassRoles: ['ADMIN', 'MANAGER']
        },
        escalationRules: [
          {
            condition: 'TIME_ELAPSED',
            threshold: 1, // 1 hour for rush orders
            action: 'AUTO_APPROVE'
          }
        ],
        enabled: true
      },

      // Design Change Approval
      {
        id: 'design-change',
        name: 'Design Change Approval',
        entityType: 'ORDER',
        requestType: 'DESIGN_CHANGE',
        requiredRole: 'DESIGN_MANAGER',
        autoApproval: {
          enabled: true,
          conditions: [
            { field: 'change.impactLevel', operator: 'EQUALS', value: 'MINOR', weight: 0.6 },
            { field: 'change.costImpact', operator: 'LESS_THAN', value: 1000, weight: 0.4 }
          ],
          fallbackToManual: true,
          bypassRoles: ['ADMIN']
        },
        escalationRules: [
          {
            condition: 'TIME_ELAPSED',
            threshold: 2, // 2 hours
            action: 'ESCALATE_TO_HIGHER',
            targetRole: 'MANAGER'
          }
        ],
        enabled: true
      },

      // Budget Increase Approval
      {
        id: 'budget-increase',
        name: 'Budget Increase Approval',
        entityType: 'ORDER',
        requestType: 'BUDGET_INCREASE',
        requiredRole: 'ADMIN',
        autoApproval: {
          enabled: true,
          conditions: [
            { field: 'increase.percentage', operator: 'LESS_THAN', value: 10, weight: 0.5 },
            { field: 'increase.amount', operator: 'LESS_THAN', value: 5000, weight: 0.5 }
          ],
          fallbackToManual: true,
          bypassRoles: []
        },
        escalationRules: [
          {
            condition: 'TIME_ELAPSED',
            threshold: 8, // 8 hours
            action: 'NOTIFY_ADMIN'
          }
        ],
        enabled: true
      }
    ]
  }

  async requestApproval(request: Partial<ApprovalRequest>): Promise<ApprovalRequest> {
    const approvalRequest: ApprovalRequest = {
      id: `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityId: request.entityId!,
      entityType: request.entityType!,
      requestType: request.requestType!,
      requestedBy: request.requestedBy!,
      approverRole: request.approverRole!,
      status: 'PENDING',
      priority: request.priority || 'MEDIUM',
      title: request.title!,
      description: request.description!,
      requestData: request.requestData || {},
      submittedAt: new Date(),
      expiresAt: request.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
    }

    // Find matching approval rule
    const rule = this.findApprovalRule(approvalRequest)
    if (rule) {
      approvalRequest.autoApprovalCriteria = rule.autoApproval

      // Check for auto-approval
      if (rule.autoApproval.enabled) {
        const autoApprovalResult = await this.evaluateAutoApproval(approvalRequest, rule)
        if (autoApprovalResult.approved) {
          approvalRequest.status = 'APPROVED'
          approvalRequest.reviewedAt = new Date()
          approvalRequest.reviewedBy = 'system-auto-approval'
          approvalRequest.comments = `Auto-approved: ${autoApprovalResult.reason}`
        }
      }

      // Set up escalation if still pending
      if (approvalRequest.status === 'PENDING') {
        this.scheduleEscalation(approvalRequest, rule.escalationRules)
      }
    }

    // Save to database
    await this.saveApprovalRequest(approvalRequest)

    // Send notifications
    await this.sendApprovalNotifications(approvalRequest)

    // Trigger workflow if auto-approved
    if (approvalRequest.status === 'APPROVED') {
      await this.triggerApprovalWorkflow(approvalRequest)
    }

    return approvalRequest
  }

  async processApproval(
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    comments?: string
  ): Promise<ApprovalRequest> {
    const approval = await this.getApprovalRequest(approvalId)
    if (!approval) {
      throw new Error('Approval request not found')
    }

    if (approval.status !== 'PENDING') {
      throw new Error('Approval request is no longer pending')
    }

    // Update approval
    approval.status = decision
    approval.reviewedAt = new Date()
    approval.reviewedBy = reviewerId
    approval.comments = comments

    // Save updated approval
    await this.saveApprovalRequest(approval)

    // Send notifications
    await this.sendApprovalResultNotifications(approval)

    // Trigger workflow actions
    if (decision === 'APPROVED') {
      await this.triggerApprovalWorkflow(approval)
    } else {
      await this.triggerRejectionWorkflow(approval)
    }

    return approval
  }

  private findApprovalRule(request: ApprovalRequest): ApprovalRule | undefined {
    return this.approvalRules.find(rule =>
      rule.enabled &&
      rule.entityType === request.entityType &&
      rule.requestType === request.requestType
    )
  }

  private async evaluateAutoApproval(
    request: ApprovalRequest,
    rule: ApprovalRule
  ): Promise<{ approved: boolean; reason: string; score: number }> {
    const conditions = rule.autoApproval.conditions
    let totalScore = 0
    let maxScore = 0
    const results: string[] = []

    for (const condition of conditions) {
      maxScore += condition.weight
      const entityData = await this.getEntityData(request.entityId, request.entityType)
      const fieldValue = this.getFieldValue(entityData, condition.field)

      if (this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
        totalScore += condition.weight
        results.push(`✓ ${condition.field}: ${fieldValue}`)
      } else {
        results.push(`✗ ${condition.field}: ${fieldValue} (expected ${condition.value})`)
      }
    }

    const score = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
    const approved = score >= 70 // 70% threshold for auto-approval

    return {
      approved,
      reason: `Auto-approval score: ${score.toFixed(1)}% (${results.join(', ')})`,
      score
    }
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'EQUALS':
        return fieldValue === expectedValue
      case 'LESS_THAN':
        return Number(fieldValue) < Number(expectedValue)
      case 'GREATER_THAN':
        return Number(fieldValue) > Number(expectedValue)
      case 'IN_RANGE':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
      case 'EXISTS':
        return fieldValue !== null && fieldValue !== undefined
      default:
        return false
    }
  }

  private async getEntityData(entityId: string, entityType: string): Promise<any> {
    switch (entityType) {
      case 'ORDER':
        return await prisma.order.findUnique({
          where: { id: entityId },
          include: {
            client: true,
            brand: true,
            routing_steps: true
          }
        })
      default:
        return {}
    }
  }

  private getFieldValue(entityData: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], entityData)
  }

  private scheduleEscalation(request: ApprovalRequest, escalationRules: EscalationRule[]): void {
    for (const rule of escalationRules) {
      if (rule.condition === 'TIME_ELAPSED') {
        // In a real implementation, you would use a job queue like Bull or Agenda
        setTimeout(async () => {
          await this.handleEscalation(request.id, rule)
        }, rule.threshold * 60 * 60 * 1000) // Convert hours to milliseconds
      }
    }
  }

  private async handleEscalation(approvalId: string, escalationRule: EscalationRule): Promise<void> {
    const approval = await this.getApprovalRequest(approvalId)
    if (!approval || approval.status !== 'PENDING') {
      return // Already processed
    }

    switch (escalationRule.action) {
      case 'ESCALATE_TO_HIGHER':
        if (escalationRule.targetRole) {
          approval.approverRole = escalationRule.targetRole
          await this.saveApprovalRequest(approval)
          await this.sendEscalationNotification(approval)
        }
        break

      case 'AUTO_APPROVE':
        approval.status = 'APPROVED'
        approval.reviewedAt = new Date()
        approval.reviewedBy = 'system-escalation'
        approval.comments = 'Auto-approved due to escalation policy'
        await this.saveApprovalRequest(approval)
        await this.triggerApprovalWorkflow(approval)
        break

      case 'AUTO_REJECT':
        approval.status = 'REJECTED'
        approval.reviewedAt = new Date()
        approval.reviewedBy = 'system-escalation'
        approval.comments = 'Auto-rejected due to escalation policy'
        await this.saveApprovalRequest(approval)
        await this.triggerRejectionWorkflow(approval)
        break

      case 'NOTIFY_ADMIN':
        await this.sendAdminNotification(approval)
        break
    }
  }

  private async saveApprovalRequest(request: ApprovalRequest): Promise<void> {
    try {
      await prisma.approval.upsert({
        where: { id: request.id },
        create: {
          id: request.id,
          entityId: request.entityId,
          entityType: request.entityType,
          requestType: request.requestType,
          requestedBy: request.requestedBy,
          approverRole: request.approverRole,
          approverUserId: request.approverUserId,
          status: request.status,
          priority: request.priority,
          title: request.title,
          description: request.description,
          requestData: JSON.stringify(request.requestData),
          submittedAt: request.submittedAt,
          reviewedAt: request.reviewedAt,
          reviewedBy: request.reviewedBy,
          comments: request.comments,
          expiresAt: request.expiresAt
        },
        update: {
          status: request.status,
          reviewedAt: request.reviewedAt,
          reviewedBy: request.reviewedBy,
          comments: request.comments,
          approverRole: request.approverRole,
          approverUserId: request.approverUserId
        }
      })
    } catch (error) {
      console.error('Failed to save approval request:', error)
    }
  }

  private async getApprovalRequest(approvalId: string): Promise<ApprovalRequest | null> {
    try {
      const approval = await prisma.approval.findUnique({
        where: { id: approvalId }
      })

      if (!approval) return null

      return {
        ...approval,
        requestData: JSON.parse(approval.requestData || '{}'),
        approverRole: approval.approverRole as Role,
        status: approval.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED',
        priority: approval.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        entityType: approval.entityType as 'ORDER' | 'PRODUCTION_CHANGE' | 'BUDGET_REQUEST' | 'DESIGN_CHANGE',
        requestType: approval.requestType as any
      }
    } catch (error) {
      console.error('Failed to get approval request:', error)
      return null
    }
  }

  private async sendApprovalNotifications(request: ApprovalRequest): Promise<void> {
    // Find users with the required role
    const approvers = await prisma.user.findMany({
      where: { role: request.approverRole }
    })

    for (const approver of approvers) {
      await prisma.notification.create({
        data: {
          userId: approver.id,
          type: 'APPROVAL_REQUEST',
          title: `Approval Required: ${request.title}`,
          message: request.description,
          entityId: request.entityId,
          entityType: request.entityType,
          priority: request.priority,
          read: false,
          createdAt: new Date(),
          data: JSON.stringify({
            approvalId: request.id,
            requestType: request.requestType
          })
        }
      })
    }
  }

  private async sendApprovalResultNotifications(approval: ApprovalRequest): Promise<void> {
    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: approval.requestedBy,
        type: approval.status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED',
        title: `${approval.status}: ${approval.title}`,
        message: approval.comments || `Your request has been ${approval.status.toLowerCase()}`,
        entityId: approval.entityId,
        entityType: approval.entityType,
        priority: 'HIGH',
        read: false,
        createdAt: new Date()
      }
    })
  }

  private async sendEscalationNotification(approval: ApprovalRequest): Promise<void> {
    const escalatedApprovers = await prisma.user.findMany({
      where: { role: approval.approverRole }
    })

    for (const approver of escalatedApprovers) {
      await prisma.notification.create({
        data: {
          userId: approver.id,
          type: 'APPROVAL_ESCALATED',
          title: `Escalated Approval: ${approval.title}`,
          message: `This approval request has been escalated to ${approval.approverRole}`,
          entityId: approval.entityId,
          entityType: approval.entityType,
          priority: 'URGENT',
          read: false,
          createdAt: new Date(),
          data: JSON.stringify({
            approvalId: approval.id,
            originalRequester: approval.requestedBy
          })
        }
      })
    }
  }

  private async sendAdminNotification(approval: ApprovalRequest): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'ADMIN_ALERT',
          title: `Overdue Approval: ${approval.title}`,
          message: `Approval request has been pending for too long and requires admin attention`,
          entityId: approval.entityId,
          entityType: approval.entityType,
          priority: 'URGENT',
          read: false,
          createdAt: new Date(),
          data: JSON.stringify({
            approvalId: approval.id,
            overdueHours: Math.floor((Date.now() - approval.submittedAt.getTime()) / (1000 * 60 * 60))
          })
        }
      })
    }
  }

  private async triggerApprovalWorkflow(approval: ApprovalRequest): Promise<void> {
    switch (approval.requestType) {
      case 'HIGH_VALUE_ORDER':
        await workflowEngine.triggerApprovalReceived(approval.entityId, 'ORDER', approval.reviewedBy || 'system')
        break

      case 'RUSH_ORDER':
        // Trigger rush production workflow
        await this.updateOrderPriority(approval.entityId, 'HIGH')
        break

      case 'DESIGN_CHANGE':
        // Trigger design update workflow
        await this.updateOrderStatus(approval.entityId, 'DESIGN_PENDING')
        break

      case 'BUDGET_INCREASE':
        // Update budget and continue workflow
        await this.updateOrderBudget(approval.entityId, approval.requestData.newBudget)
        break
    }
  }

  private async triggerRejectionWorkflow(approval: ApprovalRequest): Promise<void> {
    // Handle rejection workflows
    switch (approval.requestType) {
      case 'HIGH_VALUE_ORDER':
        await this.updateOrderStatus(approval.entityId, 'ON_HOLD')
        break

      case 'RUSH_ORDER':
        // Revert to normal priority
        await this.updateOrderPriority(approval.entityId, 'MEDIUM')
        break
    }
  }

  private async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { status }
    })
  }

  private async updateOrderPriority(orderId: string, priority: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { priority_level: priority }
    })
  }

  private async updateOrderBudget(orderId: string, newBudget: number): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: { budget: newBudget }
    })
  }

  // Public API methods
  async getPendingApprovals(userId: string, role: Role): Promise<ApprovalRequest[]> {
    const approvals = await prisma.approval.findMany({
      where: {
        status: 'PENDING',
        approverRole: role,
        expiresAt: { gt: new Date() }
      },
      orderBy: [
        { priority: 'desc' },
        { submittedAt: 'asc' }
      ]
    })

    return approvals.map(approval => ({
      ...approval,
      requestData: JSON.parse(approval.requestData || '{}'),
      approverRole: approval.approverRole as Role,
      status: approval.status as any,
      priority: approval.priority as any,
      entityType: approval.entityType as any,
      requestType: approval.requestType as any
    }))
  }

  async getApprovalHistory(entityId: string): Promise<ApprovalRequest[]> {
    const approvals = await prisma.approval.findMany({
      where: { entityId },
      orderBy: { submittedAt: 'desc' }
    })

    return approvals.map(approval => ({
      ...approval,
      requestData: JSON.parse(approval.requestData || '{}'),
      approverRole: approval.approverRole as Role,
      status: approval.status as any,
      priority: approval.priority as any,
      entityType: approval.entityType as any,
      requestType: approval.requestType as any
    }))
  }
}

// Singleton instance
export const approvalEngine = ApprovalEngine.getInstance()