/**
 * ASH AI ERP - Automated Order Progression API
 * Enables manual triggering and monitoring of automated order workflows
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, OrderStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { workflowEngine } from '@/lib/workflow-engine'
import { taskAutoAssignment } from '@/lib/task-automation'
import { notificationAutomation } from '@/lib/notification-automation'

// Validation schemas
const AutoProgressRequestSchema = z.object({
  force: z.boolean().default(false),
  skipValidation: z.boolean().default(false),
  reason: z.string().optional(),
  notify: z.boolean().default(true)
})

const AutoProgressConfigSchema = z.object({
  enabled: z.boolean(),
  progressionRules: z.array(z.object({
    fromStatus: z.nativeEnum(OrderStatus),
    toStatus: z.nativeEnum(OrderStatus),
    conditions: z.array(z.string()),
    delay: z.number().optional()
  })),
  notifications: z.object({
    client: z.boolean().default(true),
    team: z.boolean().default(true),
    channels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP'])).default(['EMAIL'])
  })
})

// POST /api/orders/[id]/auto-progress - Trigger automated progression
export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw Errors.UNAUTHORIZED
  }

  const orderId = params.id
  const body = await request.json()
  const { force, skipValidation, reason, notify } = AutoProgressRequestSchema.parse(body)

  try {
    // Get current order
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        routing_steps: { where: { status: { not: 'DONE' } } },
        design_assets: true,
        qc_inspections: true,
        tasks: { where: { status: { not: 'COMPLETED' } } }
      }
    })

    if (!order) {
      throw Errors.ORDER_NOT_FOUND
    }

    // Check permissions
    const userRole = session.user.role as Role
    if (!['ADMIN', 'MANAGER'].includes(userRole) && !force) {
      throw Errors.INSUFFICIENT_PERMISSIONS
    }

    // Determine next possible status
    const nextStatus = await determineNextStatus(order, skipValidation)
    if (!nextStatus) {
      return createSuccessResponse({
        currentStatus: order.status,
        nextStatus: null,
        message: 'Order cannot be auto-progressed at this time',
        blockers: await getProgressionBlockers(order)
      }, 'Auto-progression analysis completed')
    }

    // Execute auto-progression
    const progressionResult = await executeAutoProgression(
      orderId,
      order.status,
      nextStatus,
      session.user.id,
      reason,
      notify
    )

    // Get updated order
    const updatedOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        client: { select: { name: true } },
        tasks: { where: { status: { not: 'COMPLETED' } } }
      }
    })

    return createSuccessResponse({
      previousStatus: order.status,
      currentStatus: nextStatus,
      order: updatedOrder,
      progressionResult,
      automationSummary: {
        tasksCreated: progressionResult.tasksCreated,
        notificationsSent: progressionResult.notificationsSent,
        nextPossibleProgression: await getNextPossibleProgression(orderId)
      }
    }, 'Order auto-progressed successfully')

  } catch (error) {
    console.error('Auto-progression error:', error)
    throw error
  }
})

// GET /api/orders/[id]/auto-progress - Get auto-progression status and possibilities
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw Errors.UNAUTHORIZED
  }

  const orderId = params.id

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        routing_steps: true,
        design_assets: true,
        qc_inspections: true,
        tasks: true
      }
    })

    if (!order) {
      throw Errors.ORDER_NOT_FOUND
    }

    // Analyze current automation status
    const automationStatus = await analyzeAutomationStatus(order)
    const progressionRules = await getApplicableProgressionRules(order.status)
    const blockers = await getProgressionBlockers(order)
    const nextStatuses = await getPossibleNextStatuses(order)

    return createSuccessResponse({
      currentStatus: order.status,
      automationEnabled: automationStatus.enabled,
      canAutoProgress: automationStatus.canProgress,
      nextPossibleStatuses: nextStatuses,
      progressionRules,
      blockers,
      automation: {
        pendingTasks: automationStatus.pendingTasks,
        completedSteps: automationStatus.completedSteps,
        requiredApprovals: automationStatus.requiredApprovals,
        estimatedProgressionTime: automationStatus.estimatedTime
      },
      recommendations: await getAutomationRecommendations(order)
    }, 'Auto-progression status retrieved')

  } catch (error) {
    console.error('Auto-progression status error:', error)
    throw error
  }
})

// PUT /api/orders/[id]/auto-progress - Configure auto-progression settings
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    throw Errors.INSUFFICIENT_PERMISSIONS
  }

  const orderId = params.id
  const body = await request.json()
  const config = AutoProgressConfigSchema.parse(body)

  try {
    // Update order auto-progression configuration
    await db.order.update({
      where: { id: orderId },
      data: {
        automation_config: JSON.stringify(config)
      }
    })

    // Create/update workflow rules for this order
    if (config.enabled) {
      await createOrderWorkflowRules(orderId, config.progressionRules)
    } else {
      await disableOrderWorkflowRules(orderId)
    }

    return createSuccessResponse({
      orderId,
      config,
      message: 'Auto-progression configuration updated'
    }, 'Configuration saved successfully')

  } catch (error) {
    console.error('Auto-progression config error:', error)
    throw error
  }
})

// Helper functions
async function determineNextStatus(order: any, skipValidation: boolean): Promise<OrderStatus | null> {
  const currentStatus = order.status as OrderStatus
  
  // Define progression rules
  const progressionMap: Record<OrderStatus, OrderStatus> = {
    'INTAKE': 'DESIGN_PENDING',
    'DESIGN_PENDING': 'DESIGN_APPROVAL',
    'DESIGN_APPROVAL': 'CONFIRMED',
    'CONFIRMED': 'PRODUCTION_PLANNED',
    'PRODUCTION_PLANNED': 'IN_PROGRESS',
    'IN_PROGRESS': 'QC',
    'QC': 'PACKING',
    'PACKING': 'READY_FOR_DELIVERY',
    'READY_FOR_DELIVERY': 'DELIVERED',
    'DELIVERED': 'CLOSED',
    'CLOSED': null,
    'ON_HOLD': null,
    'CANCELLED': null
  }

  const nextStatus = progressionMap[currentStatus]
  if (!nextStatus) return null

  if (skipValidation) return nextStatus

  // Check if conditions are met for progression
  const conditionsMet = await checkProgressionConditions(order, nextStatus)
  return conditionsMet ? nextStatus : null
}

async function checkProgressionConditions(order: any, targetStatus: OrderStatus): Promise<boolean> {
  switch (targetStatus) {
    case 'DESIGN_APPROVAL':
      // Need at least one design asset
      return order.design_assets?.length > 0

    case 'CONFIRMED':
      // Need approved design
      return order.design_assets?.some((asset: any) => asset.approval_status === 'APPROVED')

    case 'IN_PROGRESS':
      // Need production plan
      return order.routing_steps?.length > 0

    case 'QC':
      // All routing steps should be done
      const incompleteSteps = order.routing_steps?.filter((step: any) => step.status !== 'DONE')
      return incompleteSteps?.length === 0

    case 'PACKING':
      // QC should be passed
      return order.qc_inspections?.some((qc: any) => qc.status === 'PASSED')

    case 'READY_FOR_DELIVERY':
      // All tasks should be completed
      return order.tasks?.length === 0

    default:
      return true
  }
}

async function executeAutoProgression(
  orderId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  userId: string,
  reason?: string,
  notify: boolean = true
) {
  const result = {
    success: false,
    tasksCreated: 0,
    notificationsSent: 0,
    errors: [] as string[]
  }

  try {
    // Update order status
    await db.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        updated_at: new Date()
      }
    })

    // Create audit log
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (order) {
      await db.auditLog.create({
        data: {
          workspace_id: order.workspace_id,
          actor_id: userId,
          entity_type: 'ORDER',
          entity_id: orderId,
          action: 'STATUS_CHANGE',
          before_data: JSON.stringify({ status: fromStatus }),
          after_data: JSON.stringify({ 
            status: toStatus, 
            reason: reason || 'Automated progression',
            automated: true 
          })
        }
      })
    }

    // Create tasks for new status
    try {
      await taskAutoAssignment.createTasksForStatus(orderId, toStatus)
      result.tasksCreated = await db.task.count({
        where: {
          metadata: {
            path: ['orderId'],
            equals: orderId
          },
          created_at: {
            gte: new Date(Date.now() - 5000) // Last 5 seconds
          }
        }
      })
    } catch (error) {
      result.errors.push(`Task creation failed: ${error.message}`)
    }

    // Send notifications
    if (notify) {
      try {
        await notificationAutomation.sendOrderStatusNotification(
          orderId,
          fromStatus,
          toStatus,
          userId,
          reason
        )
        result.notificationsSent = 1
      } catch (error) {
        result.errors.push(`Notification failed: ${error.message}`)
      }
    }

    result.success = true
    return result

  } catch (error) {
    result.errors.push(`Progression failed: ${error.message}`)
    return result
  }
}

async function getProgressionBlockers(order: any): Promise<string[]> {
  const blockers: string[] = []
  const currentStatus = order.status as OrderStatus

  switch (currentStatus) {
    case 'DESIGN_PENDING':
      if (!order.design_assets?.length) {
        blockers.push('No design assets uploaded')
      }
      break

    case 'DESIGN_APPROVAL':
      const unapproved = order.design_assets?.filter((asset: any) => 
        asset.approval_status !== 'APPROVED'
      )
      if (unapproved?.length > 0) {
        blockers.push('Design assets pending approval')
      }
      break

    case 'IN_PROGRESS':
      const incompleteSteps = order.routing_steps?.filter((step: any) => 
        step.status !== 'DONE'
      )
      if (incompleteSteps?.length > 0) {
        blockers.push(`${incompleteSteps.length} production steps incomplete`)
      }
      break

    case 'QC':
      const qcPending = order.qc_inspections?.filter((qc: any) => 
        qc.status === 'PENDING'
      )
      if (qcPending?.length > 0) {
        blockers.push('QC inspection pending')
      }
      break

    case 'PACKING':
      const incompleteTasks = order.tasks?.filter((task: any) => 
        task.status !== 'COMPLETED'
      )
      if (incompleteTasks?.length > 0) {
        blockers.push(`${incompleteTasks.length} tasks pending completion`)
      }
      break
  }

  return blockers
}

async function analyzeAutomationStatus(order: any) {
  const config = order.automation_config 
    ? JSON.parse(order.automation_config) 
    : { enabled: true }

  const pendingTasks = order.tasks?.filter((task: any) => 
    task.status !== 'COMPLETED'
  ).length || 0

  const completedSteps = order.routing_steps?.filter((step: any) => 
    step.status === 'DONE'
  ).length || 0

  const totalSteps = order.routing_steps?.length || 0

  return {
    enabled: config.enabled !== false,
    canProgress: pendingTasks === 0,
    pendingTasks,
    completedSteps,
    totalSteps,
    requiredApprovals: order.design_assets?.filter((asset: any) => 
      asset.approval_status === 'PENDING'
    ).length || 0,
    estimatedTime: calculateEstimatedProgressionTime(order)
  }
}

function calculateEstimatedProgressionTime(order: any): string {
  const pendingTasks = order.tasks?.filter((task: any) => 
    task.status !== 'COMPLETED'
  ) || []

  const totalHours = pendingTasks.reduce((sum: number, task: any) => {
    const metadata = task.metadata ? JSON.parse(task.metadata) : {}
    return sum + (metadata.estimatedHours || 2)
  }, 0)

  if (totalHours === 0) return 'Ready for progression'
  if (totalHours < 4) return `${totalHours} hours remaining`
  
  const days = Math.ceil(totalHours / 8)
  return `${days} day${days > 1 ? 's' : ''} remaining`
}

async function getApplicableProgressionRules(status: OrderStatus) {
  // Return workflow rules that apply to current status
  return workflowEngine.getWorkflowRules('default').then(rules => 
    rules.filter(rule => 
      rule.trigger.type === 'STATUS_REACHED' && 
      rule.trigger.parameters?.status === status
    )
  )
}

async function getPossibleNextStatuses(order: any): Promise<OrderStatus[]> {
  const nextStatus = await determineNextStatus(order, false)
  return nextStatus ? [nextStatus] : []
}

async function getNextPossibleProgression(orderId: string): Promise<Date | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { tasks: { where: { status: { not: 'COMPLETED' } } } }
  })

  if (!order || order.tasks.length === 0) return new Date()

  // Calculate when all pending tasks might be completed
  const dueDates = order.tasks
    .map(task => task.due_date)
    .filter(date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  return dueDates[dueDates.length - 1] || null
}

async function getAutomationRecommendations(order: any): Promise<string[]> {
  const recommendations: string[] = []
  const blockers = await getProgressionBlockers(order)

  if (blockers.length > 0) {
    recommendations.push('Resolve current blockers to enable auto-progression')
  }

  const pendingTasks = order.tasks?.filter((task: any) => 
    task.status !== 'COMPLETED' && !task.assigned_to
  ).length || 0

  if (pendingTasks > 0) {
    recommendations.push(`${pendingTasks} tasks need assignment`)
  }

  if (order.status === 'DESIGN_APPROVAL' && !order.design_assets?.length) {
    recommendations.push('Upload design assets to proceed')
  }

  return recommendations
}

async function createOrderWorkflowRules(orderId: string, rules: any[]) {
  // Implementation for creating order-specific workflow rules
  for (const rule of rules) {
    await workflowEngine.createWorkflowRule({
      name: `Order ${orderId} - ${rule.fromStatus} to ${rule.toStatus}`,
      description: `Auto-progression rule for order ${orderId}`,
      workspace_id: 'default',
      trigger: {
        type: 'STATUS_REACHED',
        parameters: { orderId, status: rule.fromStatus }
      },
      actions: [{
        type: 'CHANGE_STATUS',
        parameters: { 
          orderId, 
          newStatus: rule.toStatus,
          reason: 'Automated progression based on rule'
        },
        delay: rule.delay || 0
      }],
      enabled: true,
      priority: 1
    })
  }
}

async function disableOrderWorkflowRules(orderId: string) {
  // Implementation for disabling order-specific workflow rules
  const rules = await workflowEngine.getWorkflowRules('default')
  const orderRules = rules.filter(rule => 
    rule.name.includes(`Order ${orderId}`)
  )

  for (const rule of orderRules) {
    await workflowEngine.updateWorkflowRule(rule.id, { enabled: false })
  }
}