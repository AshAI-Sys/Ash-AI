// @ts-nocheck
/**
 * ASH AI ERP - Workflow Rules Management API
 * Admin interface for creating and managing workflow automation rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { workflowEngine, WorkflowRule, WorkflowCondition, WorkflowAction } from '@/lib/workflow-engine'

// Validation schemas
const WorkflowConditionSchema = z.object({
  type: z.enum(['TIME_ELAPSED', 'STATUS_REACHED', 'APPROVAL_RECEIVED', 'QC_PASSED', 'MATERIALS_READY', 'TASKS_COMPLETED']),
  parameters: z.record(z.any()).optional(),
  dependencies: z.array(z.string()).optional()
})

const WorkflowActionSchema = z.object({
  type: z.enum(['CHANGE_STATUS', 'CREATE_TASK', 'SEND_NOTIFICATION', 'START_ROUTING_STEP', 'ASSIGN_OPERATOR']),
  parameters: z.record(z.any()),
  delay: z.number().optional()
})

const WorkflowRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  workspace_id: z.string(),
  trigger: WorkflowConditionSchema,
  actions: z.array(WorkflowActionSchema).min(1, 'At least one action is required'),
  enabled: z.boolean().default(true),
  priority: z.number().min(0).max(10).default(5)
})

const WorkflowRuleUpdateSchema = WorkflowRuleSchema.partial().omit(['workspace_id'])

// GET /api/workflows/rules - Get all workflow rules
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    throw Errors.INSUFFICIENT_PERMISSIONS
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || session.user.workspace_id
  const enabled = searchParams.get('enabled')
  const type = searchParams.get('type')

  try {
    // Get rules from workflow engine
    const rules = await workflowEngine.getWorkflowRules(workspaceId)

    // Filter rules based on query parameters
    let filteredRules = rules
    
    if (enabled !== null) {
      filteredRules = filteredRules.filter(rule => 
        rule.enabled === (enabled === 'true')
      )
    }

    if (type) {
      filteredRules = filteredRules.filter(rule => 
        rule.trigger.type === type
      )
    }

    // Get rule statistics
    const statistics = await getRuleStatistics(workspaceId)

    // Get available templates
    const templates = await getRuleTemplates()

    return createSuccessResponse({
      rules: filteredRules.map(rule => ({
        ...rule,
        created_at: rule.created_at?.toISOString(),
        updated_at: rule.updated_at?.toISOString()
      })),
      statistics,
      templates,
      totalCount: filteredRules.length
    }, 'Workflow rules retrieved successfully')

  } catch (error) {
    console.error('Get workflow rules error:', error)
    throw error
  }
})

// POST /api/workflows/rules - Create new workflow rule
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    throw Errors.INSUFFICIENT_PERMISSIONS
  }

  const body = await request.json()
  const ruleData = WorkflowRuleSchema.parse({
    ...body,
    workspace_id: session.user.workspace_id
  })

  try {
    // Validate rule logic
    await validateRuleLogic(ruleData)

    // Create workflow rule
    const newRule = await workflowEngine.createWorkflowRule(ruleData)

    // Log rule creation
    await db.auditLog.create({
      data: {
        workspace_id: ruleData.workspace_id,
        actor_id: session.user.id,
        entity_type: 'WORKFLOW_RULE',
        entity_id: newRule.id,
        action: 'CREATE',
        after_data: JSON.stringify({
          name: ruleData.name,
          enabled: ruleData.enabled,
          priority: ruleData.priority
        })
      }
    })

    return createSuccessResponse({
      rule: {
        ...newRule,
        created_at: newRule.created_at?.toISOString(),
        updated_at: newRule.updated_at?.toISOString()
      }
    }, 'Workflow rule created successfully')

  } catch (error) {
    console.error('Create workflow rule error:', error)
    throw error
  }
})

// PUT /api/workflows/rules/[id] - Update workflow rule
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    throw Errors.INSUFFICIENT_PERMISSIONS
  }

  const ruleId = params.id
  const body = await request.json()
  const updateData = WorkflowRuleUpdateSchema.parse(body)

  try {
    // Get existing rule
    const existingRule = await db.workflowRule.findUnique({
      where: { id: ruleId }
    })

    if (!existingRule) {
      throw Errors.NOT_FOUND
    }

    // Check workspace access
    if (existingRule.workspace_id !== session.user.workspace_id) {
      throw Errors.INSUFFICIENT_PERMISSIONS
    }

    // Validate updated rule logic
    if (updateData.trigger || updateData.actions) {
      const fullRuleData = {
        ...existingRule,
        ...updateData,
        trigger: updateData.trigger || JSON.parse(existingRule.trigger as string),
        actions: updateData.actions || JSON.parse(existingRule.actions as string)
      }
      await validateRuleLogic(fullRuleData)
    }

    // Update workflow rule
    const updatedRule = await workflowEngine.updateWorkflowRule(ruleId, updateData)

    // Log rule update
    await db.auditLog.create({
      data: {
        workspace_id: existingRule.workspace_id,
        actor_id: session.user.id,
        entity_type: 'WORKFLOW_RULE',
        entity_id: ruleId,
        action: 'UPDATE',
        before_data: JSON.stringify({
          name: existingRule.name,
          enabled: existingRule.enabled
        }),
        after_data: JSON.stringify({
          name: updateData.name || existingRule.name,
          enabled: updateData.enabled ?? existingRule.enabled
        })
      }
    })

    return createSuccessResponse({
      rule: {
        ...updatedRule,
        created_at: updatedRule.created_at?.toISOString(),
        updated_at: updatedRule.updated_at?.toISOString()
      }
    }, 'Workflow rule updated successfully')

  } catch (error) {
    console.error('Update workflow rule error:', error)
    throw error
  }
})

// DELETE /api/workflows/rules/[id] - Delete workflow rule
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    throw Errors.INSUFFICIENT_PERMISSIONS
  }

  const ruleId = params.id

  try {
    // Get existing rule
    const existingRule = await db.workflowRule.findUnique({
      where: { id: ruleId }
    })

    if (!existingRule) {
      throw Errors.NOT_FOUND
    }

    // Check workspace access
    if (existingRule.workspace_id !== session.user.workspace_id) {
      throw Errors.INSUFFICIENT_PERMISSIONS
    }

    // Delete workflow rule
    await workflowEngine.deleteWorkflowRule(ruleId)

    // Log rule deletion
    await db.auditLog.create({
      data: {
        workspace_id: existingRule.workspace_id,
        actor_id: session.user.id,
        entity_type: 'WORKFLOW_RULE',
        entity_id: ruleId,
        action: 'DELETE',
        before_data: JSON.stringify({
          name: existingRule.name,
          enabled: existingRule.enabled
        })
      }
    })

    return createSuccessResponse({
      message: 'Workflow rule deleted successfully'
    }, 'Rule deleted')

  } catch (error) {
    console.error('Delete workflow rule error:', error)
    throw error
  }
})

// Helper functions
async function validateRuleLogic(rule: any): Promise<void> {
  const errors: string[] = []

  // Validate trigger
  if (!rule.trigger) {
    errors.push('Trigger is required')
  } else {
    switch (rule.trigger.type) {
      case 'TIME_ELAPSED':
        if (!rule.trigger.parameters?.minutes) {
          errors.push('TIME_ELAPSED trigger requires minutes parameter')
        }
        break
      case 'STATUS_REACHED':
        if (!rule.trigger.parameters?.status) {
          errors.push('STATUS_REACHED trigger requires status parameter')
        }
        break
    }
  }

  // Validate actions
  if (!rule.actions || rule.actions.length === 0) {
    errors.push('At least one action is required')
  } else {
    rule.actions.forEach((action: WorkflowAction, index: number) => {
      switch (action.type) {
        case 'CHANGE_STATUS':
          if (!action.parameters.newStatus) {
            errors.push(`Action ${index + 1}: CHANGE_STATUS requires newStatus parameter`)
          }
          break
        case 'CREATE_TASK':
          if (!action.parameters.title) {
            errors.push(`Action ${index + 1}: CREATE_TASK requires title parameter`)
          }
          break
        case 'SEND_NOTIFICATION':
          if (!action.parameters.message) {
            errors.push(`Action ${index + 1}: SEND_NOTIFICATION requires message parameter`)
          }
          break
      }
    })
  }

  if (errors.length > 0) {
    throw new Error(`Rule validation failed: ${errors.join(', ')}`)
  }
}

async function getRuleStatistics(workspaceId: string) {
  const rules = await workflowEngine.getWorkflowRules(workspaceId)
  
  const stats = {
    total: rules.length,
    enabled: rules.filter(r => r.enabled).length,
    disabled: rules.filter(r => !r.enabled).length,
    byTriggerType: {} as Record<string, number>,
    byPriority: {} as Record<string, number>
  }

  rules.forEach(rule => {
    // Count by trigger type
    const triggerType = rule.trigger.type
    stats.byTriggerType[triggerType] = (stats.byTriggerType[triggerType] || 0) + 1

    // Count by priority
    const priority = rule.priority.toString()
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
  })

  return stats
}

async function getRuleTemplates() {
  return [
    {
      id: 'auto-progress-design',
      name: 'Auto-Progress After Design Upload',
      description: 'Automatically move orders to approval when design is uploaded',
      template: {
        name: 'Auto-Progress After Design Upload',
        description: 'Automatically progress order when design assets are uploaded',
        trigger: {
          type: 'STATUS_REACHED',
          parameters: { status: 'DESIGN_PENDING' }
        },
        actions: [{
          type: 'CHANGE_STATUS',
          parameters: { newStatus: 'DESIGN_APPROVAL' },
          delay: 5000
        }],
        priority: 5
      }
    },
    {
      id: 'notify-client-ready',
      name: 'Notify Client When Ready',
      description: 'Send notification to client when order is ready for delivery',
      template: {
        name: 'Notify Client When Ready',
        description: 'Send client notification when order reaches ready for delivery',
        trigger: {
          type: 'STATUS_REACHED',
          parameters: { status: 'READY_FOR_DELIVERY' }
        },
        actions: [{
          type: 'SEND_NOTIFICATION',
          parameters: {
            type: 'EMAIL',
            message: 'Your order is ready for delivery!',
            channels: ['EMAIL', 'SMS']
          }
        }],
        priority: 8
      }
    },
    {
      id: 'create-qc-task',
      name: 'Auto-Create QC Task',
      description: 'Automatically create QC task when production is complete',
      template: {
        name: 'Auto-Create QC Task',
        description: 'Create QC inspection task when production stage is complete',
        trigger: {
          type: 'STATUS_REACHED',
          parameters: { status: 'QC' }
        },
        actions: [{
          type: 'CREATE_TASK',
          parameters: {
            title: 'Quality Control Inspection',
            description: 'Perform final quality inspection',
            priority: 'HIGH',
            assignedRole: 'QC_INSPECTOR'
          }
        }],
        priority: 7
      }
    },
    {
      id: 'escalate-delayed-orders',
      name: 'Escalate Delayed Orders',
      description: 'Notify management when orders are delayed beyond threshold',
      template: {
        name: 'Escalate Delayed Orders',
        description: 'Escalate orders that have been in the same status too long',
        trigger: {
          type: 'TIME_ELAPSED',
          parameters: { minutes: 2880 } // 48 hours
        },
        actions: [
          {
            type: 'SEND_NOTIFICATION',
            parameters: {
              type: 'ALERT',
              recipientRole: 'MANAGER',
              message: 'Order has been delayed beyond normal threshold',
              priority: 'HIGH'
            }
          },
          {
            type: 'CREATE_TASK',
            parameters: {
              title: 'Review Delayed Order',
              description: 'Investigate and resolve order delay',
              priority: 'CRITICAL',
              assignedRole: 'MANAGER'
            }
          }
        ],
        priority: 9
      }
    },
    {
      id: 'auto-assign-production',
      name: 'Auto-Assign Production Tasks',
      description: 'Automatically assign production tasks to available operators',
      template: {
        name: 'Auto-Assign Production Tasks',
        description: 'Assign production tasks when order enters production',
        trigger: {
          type: 'STATUS_REACHED',
          parameters: { status: 'IN_PROGRESS' }
        },
        actions: [{
          type: 'ASSIGN_OPERATOR',
          parameters: {
            role: 'OPERATOR',
            strategy: 'LEAST_LOADED'
          }
        }],
        priority: 6
      }
    }
  ]
}