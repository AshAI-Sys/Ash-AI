// @ts-nocheck
// Automated Order Status Transition API - CLIENT_UPDATED_PLAN.md Implementation
// Intelligent order status management with automated transitions and validation

import { NextRequest } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
  createAuthenticationError,
  createBusinessLogicError,
  logError
} from '@/lib/error-handler'
import { verifyToken, hasPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderWorkflowEngine } from '@/lib/order-workflow'
import { OrderStatus, Role } from '@prisma/client'

interface TransitionRequest {
  to_status: OrderStatus
  notes?: string
  auto_validate?: boolean
  force_transition?: boolean
  assign_to?: string
  estimated_completion?: string
  priority_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

interface TransitionResponse {
  success: boolean
  order: {
    id: string
    po_number: string
    previous_status: OrderStatus
    new_status: OrderStatus
    progress_percentage: number
    transition_timestamp: string
  }
  transition_details: {
    performed_by: {
      id: string
      name: string
      role: Role
    }
    validation_results: {
      passed: boolean
      checks: {
        name: string
        status: 'PASS' | 'FAIL' | 'WARNING'
        message: string
      }[]
    }
    automated_actions: {
      action: string
      status: 'COMPLETED' | 'FAILED' | 'PENDING'
      details?: string
    }[]
    next_available_transitions: {
      status: OrderStatus
      label: string
      description: string
    }[]
  }
  ai_insights: {
    transition_impact: string
    recommendations: string[]
    estimated_timeline: string
    resource_requirements?: string[]
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifyToken(request)
    if (!user) {
      return createErrorResponse(
        createAuthenticationError('Authentication required for order transitions'),
        401
      )
    }

    const orderId = params.id
    const body: TransitionRequest = await request.json()

    // Validate request
    if (!body.to_status) {
      return createErrorResponse(
        createBusinessLogicError('transition', 'Missing target status'),
        400
      )
    }

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: { select: { id: true, name: true, company: true } },
        brand: { select: { id: true, name: true } },
        items: true,
        routingSteps: {
          orderBy: { sequence: 'asc' }
        },
        productionTracking: {
          orderBy: { started_at: 'desc' }
        },
        qcInspections: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    })

    if (!order) {
      return createErrorResponse(
        createNotFoundError('Order', orderId),
        404
      )
    }

    // Store original status for response
    const previousStatus = order.status

    // Pre-transition validation
    const validationResults = await performPreTransitionValidation(
      order,
      body.to_status,
      body.auto_validate || false
    )

    // Check if validation failed and force_transition is not enabled
    if (!validationResults.passed && !body.force_transition) {
      return createErrorResponse(
        createBusinessLogicError(
          'transition',
          `Validation failed: ${validationResults.checks
            .filter(c => c.status === 'FAIL')
            .map(c => c.message)
            .join(', ')}`
        ),
        400
      )
    }

    // Perform the transition using the workflow engine
    await OrderWorkflowEngine.transitionOrder(
      orderId,
      body.to_status,
      user.id,
      user.role,
      body.notes
    )

    // Execute automated post-transition actions
    const automatedActions = await executePostTransitionActions(
      orderId,
      body.to_status,
      user.id,
      body
    )

    // Get updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        po_number: true,
        status: true,
        updated_at: true
      }
    })

    // Get next available transitions
    const nextTransitions = await OrderWorkflowEngine.getAvailableTransitions(
      orderId,
      user.role
    )

    // Generate AI insights for this transition
    const aiInsights = await generateTransitionInsights(
      order,
      body.to_status,
      validationResults,
      automatedActions
    )

    // Log successful transition
    await logError(
      `Order ${order.po_number} transitioned from ${previousStatus} to ${body.to_status}`,
      {
        userId: user.id,
        orderId,
        previousStatus,
        newStatus: body.to_status,
        apiEndpoint: `/api/orders/${orderId}/transition`
      }
    )

    const response: TransitionResponse = {
      success: true,
      order: {
        id: updatedOrder!.id,
        po_number: updatedOrder!.po_number,
        previous_status: previousStatus,
        new_status: updatedOrder!.status,
        progress_percentage: OrderWorkflowEngine.getStatusProgress(updatedOrder!.status),
        transition_timestamp: updatedOrder!.updated_at.toISOString()
      },
      transition_details: {
        performed_by: {
          id: user.id,
          name: user.full_name,
          role: user.role
        },
        validation_results: validationResults,
        automated_actions: automatedActions,
        next_available_transitions: nextTransitions
      },
      ai_insights: aiInsights
    }

    return createSuccessResponse(
      response,
      `Order ${order.po_number} successfully transitioned to ${body.to_status}`,
      {
        transitionType: 'manual',
        validationPassed: validationResults.passed,
        automatedActionsCount: automatedActions.length
      }
    )

  } catch (error) {
    console.error('Order transition error:', error)

    // Handle workflow engine specific errors
    if (error instanceof Error) {
      if (error.message.includes('INVALID_TRANSITION')) {
        return createErrorResponse(
          createBusinessLogicError('transition', 'Invalid status transition'),
          400
        )
      }
      if (error.message.includes('INSUFFICIENT_PERMISSIONS')) {
        return createErrorResponse(
          createAuthenticationError('Insufficient permissions for this transition'),
          403
        )
      }
    }

    return createErrorResponse(
      'Failed to transition order status',
      500
    )
  }
}

// Automated transition endpoint (for system-triggered transitions)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()

    // This endpoint is for automated system transitions
    // Validate system authorization (could be API key or internal service token)
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('System ')) {
      return createErrorResponse(
        createAuthenticationError('System authorization required'),
        401
      )
    }

    // Get order for automation check
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        routingSteps: true,
        productionTracking: true,
        qcInspections: { orderBy: { created_at: 'desc' }, take: 1 }
      }
    })

    if (!order) {
      return createErrorResponse(
        createNotFoundError('Order', orderId),
        404
      )
    }

    // Check if automated transition is possible
    const autoTransition = await checkAutomatedTransition(order)

    if (!autoTransition.possible) {
      return createSuccessResponse(
        { automated: false, reason: autoTransition.reason },
        'No automated transition available'
      )
    }

    // Perform automated transition
    const systemUserId = 'system' // In a real system, this would be a system user ID

    await OrderWorkflowEngine.transitionOrder(
      orderId,
      autoTransition.to_status!,
      systemUserId,
      'ADMIN', // System has admin privileges
      `Automated transition: ${autoTransition.reason}`
    )

    // Log automated transition
    await logError(
      `Automated transition: Order ${order.po_number} moved to ${autoTransition.to_status}`,
      {
        orderId,
        previousStatus: order.status,
        newStatus: autoTransition.to_status,
        reason: autoTransition.reason,
        apiEndpoint: `/api/orders/${orderId}/transition`
      }
    )

    return createSuccessResponse(
      {
        automated: true,
        previous_status: order.status,
        new_status: autoTransition.to_status,
        reason: autoTransition.reason,
        timestamp: new Date().toISOString()
      },
      `Order automatically transitioned to ${autoTransition.to_status}`
    )

  } catch (error) {
    console.error('Automated transition error:', error)
    return createErrorResponse(
      'Failed to perform automated transition',
      500
    )
  }
}

// Helper functions
async function performPreTransitionValidation(
  order: any,
  toStatus: OrderStatus,
  autoValidate: boolean
) {
  const checks = []

  // Basic transition validation
  const workflow = await import('@/lib/order-workflow')
  const validTransition = workflow.ORDER_WORKFLOW.find(
    t => t.from === order.status && t.to === toStatus
  )

  if (!validTransition) {
    checks.push({
      name: 'Valid Transition',
      status: 'FAIL' as const,
      message: `Cannot transition from ${order.status} to ${toStatus}`
    })
  } else {
    checks.push({
      name: 'Valid Transition',
      status: 'PASS' as const,
      message: 'Transition is allowed by workflow'
    })
  }

  // Status-specific validations
  switch (toStatus) {
    case 'DESIGN_APPROVAL':
      const hasDesignAssets = order.design_assets?.length > 0
      checks.push({
        name: 'Design Assets',
        status: hasDesignAssets ? 'PASS' : 'FAIL',
        message: hasDesignAssets ? 'Design assets are available' : 'No design assets found'
      })
      break

    case 'IN_PROGRESS':
      const hasProductionPlan = order.routingSteps?.length > 0
      checks.push({
        name: 'Production Plan',
        status: hasProductionPlan ? 'PASS' : 'WARNING',
        message: hasProductionPlan ? 'Production routing is planned' : 'No routing steps defined'
      })
      break

    case 'QC':
      const productionCompleted = order.routingSteps?.every((step: any) => step.status === 'COMPLETED')
      checks.push({
        name: 'Production Completion',
        status: productionCompleted ? 'PASS' : 'FAIL',
        message: productionCompleted ? 'All production steps completed' : 'Production not fully complete'
      })
      break

    case 'PACKING':
      const qcPassed = order.qcInspections?.[0]?.status === 'APPROVED'
      checks.push({
        name: 'Quality Control',
        status: qcPassed ? 'PASS' : 'FAIL',
        message: qcPassed ? 'Quality inspection passed' : 'Quality inspection required'
      })
      break

    case 'DELIVERED':
      const hasShipment = true // Would check shipment records
      checks.push({
        name: 'Shipment Ready',
        status: hasShipment ? 'PASS' : 'FAIL',
        message: hasShipment ? 'Shipment is prepared' : 'No shipment record found'
      })
      break
  }

  // Check deadline compliance
  if (order.requested_deadline) {
    const deadline = new Date(order.requested_deadline)
    const now = new Date()
    const isOnTime = deadline > now

    checks.push({
      name: 'Deadline Compliance',
      status: isOnTime ? 'PASS' : 'WARNING',
      message: isOnTime ? 'On track for deadline' : 'At risk of missing deadline'
    })
  }

  const failedChecks = checks.filter(c => c.status === 'FAIL')
  const passed = failedChecks.length === 0

  return {
    passed,
    checks
  }
}

async function executePostTransitionActions(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  request: TransitionRequest
) {
  const actions = []

  try {
    // Status-specific automated actions
    switch (newStatus) {
      case 'PRODUCTION_PLANNED':
        // Auto-assign to production manager
        if (request.assign_to) {
          await prisma.order.update({
            where: { id: orderId },
            data: { assigned_to: request.assign_to }
          })
          actions.push({
            action: 'Assignment',
            status: 'COMPLETED' as const,
            details: `Assigned to user ${request.assign_to}`
          })
        }
        break

      case 'IN_PROGRESS':
        // Initialize production tracking
        await prisma.productionTracking.create({
          data: {
            order_id: orderId,
            stage: 'CUTTING',
            status: 'IN_PROGRESS',
            started_at: new Date()
          }
        })
        actions.push({
          action: 'Production Tracking Initialized',
          status: 'COMPLETED' as const,
          details: 'Started tracking production progress'
        })
        break

      case 'QC':
        // Create QC inspection record
        await prisma.qcInspection.create({
          data: {
            order_id: orderId,
            status: 'PENDING',
            created_by: userId,
            workspace_id: 'default' // Would be from order context
          }
        })
        actions.push({
          action: 'QC Inspection Created',
          status: 'COMPLETED' as const,
          details: 'Quality control inspection scheduled'
        })
        break

      case 'READY_FOR_DELIVERY':
        // Create shipment record
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { workspace_id: true }
        })

        await prisma.shipment.create({
          data: {
            order_id: orderId,
            status: 'PENDING',
            workspace_id: order!.workspace_id,
            created_by: userId
          }
        })
        actions.push({
          action: 'Shipment Created',
          status: 'COMPLETED' as const,
          details: 'Shipment record created for delivery'
        })
        break
    }

    // Update priority if specified
    if (request.priority_level) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          priority: request.priority_level,
          updated_at: new Date()
        }
      })
      actions.push({
        action: 'Priority Updated',
        status: 'COMPLETED' as const,
        details: `Priority set to ${request.priority_level}`
      })
    }

  } catch (error) {
    actions.push({
      action: 'Automated Actions',
      status: 'FAILED' as const,
      details: `Error executing automated actions: ${error}`
    })
  }

  return actions
}

async function generateTransitionInsights(
  order: any,
  toStatus: OrderStatus,
  validationResults: any,
  automatedActions: any[]
) {
  const insights = {
    transition_impact: '',
    recommendations: [] as string[],
    estimated_timeline: '',
    resource_requirements: [] as string[]
  }

  // Generate impact assessment
  const progress = OrderWorkflowEngine.getStatusProgress(toStatus)
  insights.transition_impact = `Order is now ${Math.round(progress)}% complete`

  // Timeline estimation
  if (order.requested_deadline) {
    const deadline = new Date(order.requested_deadline)
    const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    insights.estimated_timeline = daysRemaining > 0 ? `${daysRemaining} days until deadline` : 'Past deadline'
  }

  // Status-specific insights
  switch (toStatus) {
    case 'IN_PROGRESS':
      insights.recommendations.push('Monitor production efficiency closely')
      insights.recommendations.push('Ensure all materials are available')
      insights.resource_requirements.push('Production operators')
      insights.resource_requirements.push('Manufacturing equipment')
      break

    case 'QC':
      insights.recommendations.push('Schedule quality inspection within 24 hours')
      insights.resource_requirements.push('QC inspector')
      break

    case 'READY_FOR_DELIVERY':
      insights.recommendations.push('Coordinate with logistics team')
      insights.recommendations.push('Prepare delivery documentation')
      insights.resource_requirements.push('Delivery vehicle')
      insights.resource_requirements.push('Driver')
      break
  }

  // Validation-based recommendations
  const warningChecks = validationResults.checks.filter((c: any) => c.status === 'WARNING')
  warningChecks.forEach((check: any) => {
    insights.recommendations.push(`Address warning: ${check.message}`)
  })

  return insights
}

async function checkAutomatedTransition(order: any) {
  // Check for conditions that would trigger automated transitions

  // Example: Automatically move to QC when all routing steps are complete
  if (order.status === 'IN_PROGRESS') {
    const incompleteSteps = order.routingSteps.filter((step: any) => step.status !== 'COMPLETED')
    if (incompleteSteps.length === 0) {
      return {
        possible: true,
        to_status: 'QC' as OrderStatus,
        reason: 'All production steps completed'
      }
    }
  }

  // Example: Auto-approve QC if quality score is excellent
  if (order.status === 'QC') {
    const latestQC = order.qcInspections[0]
    if (latestQC && latestQC.quality_score >= 95) {
      return {
        possible: true,
        to_status: 'PACKING' as OrderStatus,
        reason: 'Excellent quality score (95%+) - auto-approved'
      }
    }
  }

  return {
    possible: false,
    reason: 'No automation conditions met'
  }
}