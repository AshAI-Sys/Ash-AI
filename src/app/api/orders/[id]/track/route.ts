// @ts-nocheck
// Real-time Order Tracking API - CLIENT_UPDATED_PLAN.md Implementation
// Advanced order tracking with live updates and AI-powered insights

import { NextRequest } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
  createAuthenticationError
} from '@/lib/error-handler'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderWorkflowEngine } from '@/lib/order-workflow'
import { Role } from '@prisma/client'

interface RealTimeOrderStatus {
  order: {
    id: string
    po_number: string
    status: string
    progress_percentage: number
    company_name: string
    product_name: string
    total_qty: number
    requested_deadline: string
    estimated_completion: string | null
    risk_assessment: 'low' | 'medium' | 'high'
  }
  timeline: {
    status: string
    label: string
    description: string
    timestamp: string | null
    completed: boolean
    current: boolean
    progress_percentage: number
    estimated_duration?: string
    notes?: string
    performer?: {
      name: string
      role: string
    }
  }[]
  current_stage: {
    stage: string
    started_at: string | null
    estimated_completion: string | null
    assigned_to?: {
      id: string
      name: string
      role: string
    }
    routing_steps?: {
      step_name: string
      department: string
      status: string
      estimated_hours: number
      actual_hours?: number
      started_at?: string
      completed_at?: string
    }[]
  }
  production_metrics: {
    total_steps: number
    completed_steps: number
    remaining_steps: number
    efficiency_percentage: number
    quality_score?: number
    on_time_probability: number
  }
  available_actions: {
    status: string
    label: string
    description: string
    requires_role: Role[]
  }[]
  ai_insights: {
    recommendations: string[]
    warnings: string[]
    bottlenecks: string[]
    optimization_suggestions: string[]
  }
  live_updates: {
    last_update: string
    frequency: string
    next_milestone?: string
    estimated_next_update?: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifyToken(request)
    if (!user) {
      return createErrorResponse(
        createAuthenticationError('Authentication required for order tracking'),
        401
      )
    }

    const orderId = params.id

    // Get comprehensive order data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          select: { id: true, name: true, company: true }
        },
        brand: {
          select: { id: true, name: true, code: true }
        },
        orderItems: {
          select: {
            id: true,
            product_name: true,
            quantity: true,
            unit_price: true,
            specifications: true
          }
        },
        statusHistory: {
          select: {
            status: true,
            changed_at: true,
            notes: true,
            changed_by: true,
            user: {
              select: { full_name: true, role: true }
            }
          },
          orderBy: { changed_at: 'desc' }
        },
        productionTracking: {
          select: {
            stage: true,
            status: true,
            started_at: true,
            completed_at: true,
            efficiency_score: true,
            routing_step: {
              select: {
                step_name: true,
                department: true,
                estimated_hours: true,
                actual_hours: true
              }
            }
          },
          orderBy: { started_at: 'desc' }
        },
        routingSteps: {
          select: {
            step_name: true,
            department: true,
            sequence: true,
            status: true,
            estimated_hours: true,
            actual_hours: true,
            started_at: true,
            completed_at: true,
            assigned_to: {
              select: { id: true, full_name: true, role: true }
            }
          },
          orderBy: { sequence: 'asc' }
        },
        qcInspections: {
          select: {
            id: true,
            status: true,
            quality_score: true,
            created_at: true
          },
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

    // Build timeline from status history
    const timeline = buildOrderTimeline(order)

    // Get current production stage
    const currentStage = getCurrentProductionStage(order)

    // Calculate production metrics
    const productionMetrics = calculateProductionMetrics(order)

    // Get available actions for user role
    const availableActions = await OrderWorkflowEngine.getAvailableTransitions(
      orderId,
      user.role
    )

    // Generate AI insights
    const aiInsights = generateAIInsights(order, productionMetrics)

    // Calculate risk assessment
    const riskAssessment = assessOrderRisk(order)

    // Build real-time status response
    const realTimeStatus: RealTimeOrderStatus = {
      order: {
        id: order.id,
        po_number: order.po_number,
        status: order.status,
        progress_percentage: OrderWorkflowEngine.getStatusProgress(order.status),
        company_name: order.company_name || order.client?.company || 'Unknown',
        product_name: order.product_name || 'Unknown Product',
        total_qty: order.total_qty || 0,
        requested_deadline: order.requested_deadline?.toISOString() || order.target_delivery_date?.toISOString() || '',
        estimated_completion: calculateEstimatedCompletion(order),
        risk_assessment: riskAssessment
      },
      timeline,
      current_stage: currentStage,
      production_metrics: productionMetrics,
      available_actions: availableActions.map(action => ({
        status: action.status,
        label: action.label,
        description: action.description,
        requires_role: getRequiredRolesForTransition(order.status, action.status)
      })),
      ai_insights: aiInsights,
      live_updates: {
        last_update: new Date().toISOString(),
        frequency: 'real-time',
        next_milestone: getNextMilestone(order),
        estimated_next_update: getEstimatedNextUpdate(order)
      }
    }

    return createSuccessResponse(
      realTimeStatus,
      'Real-time order tracking data retrieved successfully',
      {
        updateFrequency: 'real-time',
        trackingAccuracy: 'high',
        dataFreshness: 'live'
      }
    )

  } catch (error) {
    console.error('Order tracking error:', error)
    return createErrorResponse(
      'Failed to retrieve real-time order tracking data',
      500
    )
  }
}

// Helper functions
function buildOrderTimeline(order: any) {
  const statusOrder = [
    'INTAKE',
    'DESIGN_PENDING',
    'DESIGN_APPROVAL',
    'CONFIRMED',
    'PRODUCTION_PLANNED',
    'IN_PROGRESS',
    'QC',
    'PACKING',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'CLOSED'
  ]

  return statusOrder.map((status, index) => {
    const historyEntry = order.statusHistory.find((h: any) => h.status === status)
    const isCompleted = statusOrder.indexOf(order.status) > index
    const isCurrent = order.status === status

    return {
      status,
      label: getStatusLabel(status),
      description: getStatusDescription(status),
      timestamp: historyEntry?.changed_at?.toISOString() || null,
      completed: isCompleted,
      current: isCurrent,
      progress_percentage: (index / (statusOrder.length - 1)) * 100,
      notes: historyEntry?.notes,
      performer: historyEntry?.user ? {
        name: historyEntry.user.full_name,
        role: historyEntry.user.role
      } : undefined
    }
  })
}

function getCurrentProductionStage(order: any) {
  const currentTracking = order.productionTracking[0]
  const currentRouting = order.routingSteps.find((step: any) =>
    step.status === 'IN_PROGRESS' || step.status === 'ASSIGNED'
  )

  return {
    stage: currentTracking?.stage || order.status,
    started_at: currentTracking?.started_at?.toISOString() || null,
    estimated_completion: calculateStageCompletion(order),
    assigned_to: currentRouting?.assigned_to ? {
      id: currentRouting.assigned_to.id,
      name: currentRouting.assigned_to.full_name,
      role: currentRouting.assigned_to.role
    } : undefined,
    routing_steps: order.routingSteps.map((step: any) => ({
      step_name: step.step_name,
      department: step.department,
      status: step.status,
      estimated_hours: step.estimated_hours,
      actual_hours: step.actual_hours,
      started_at: step.started_at?.toISOString(),
      completed_at: step.completed_at?.toISOString()
    }))
  }
}

function calculateProductionMetrics(order: any) {
  const totalSteps = order.routingSteps.length || 1
  const completedSteps = order.routingSteps.filter((step: any) => step.status === 'COMPLETED').length
  const remainingSteps = totalSteps - completedSteps

  // Calculate efficiency from production tracking
  const efficiencyScores = order.productionTracking
    .filter((track: any) => track.efficiency_score)
    .map((track: any) => track.efficiency_score)

  const averageEfficiency = efficiencyScores.length > 0
    ? efficiencyScores.reduce((sum: number, score: number) => sum + score, 0) / efficiencyScores.length
    : 85 // Default efficiency

  // Get quality score from latest QC inspection
  const qualityScore = order.qcInspections[0]?.quality_score

  // Calculate on-time probability
  const onTimeProbability = calculateOnTimeProbability(order, completedSteps, totalSteps)

  return {
    total_steps: totalSteps,
    completed_steps: completedSteps,
    remaining_steps: remainingSteps,
    efficiency_percentage: Math.round(averageEfficiency),
    quality_score: qualityScore,
    on_time_probability: onTimeProbability
  }
}

function generateAIInsights(order: any, metrics: any) {
  const insights = {
    recommendations: [] as string[],
    warnings: [] as string[],
    bottlenecks: [] as string[],
    optimization_suggestions: [] as string[]
  }

  // Efficiency insights
  if (metrics.efficiency_percentage < 70) {
    insights.warnings.push('Production efficiency is below target (70%)')
    insights.optimization_suggestions.push('Consider reassigning tasks to more experienced operators')
  }

  // Timeline insights
  const daysUntilDeadline = Math.ceil(
    (new Date(order.requested_deadline || order.target_delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilDeadline < 3 && order.status !== 'DELIVERED') {
    insights.warnings.push('Order is approaching deadline with high risk of delay')
    insights.recommendations.push('Prioritize this order and allocate additional resources')
  }

  // Quality insights
  if (metrics.quality_score && metrics.quality_score < 85) {
    insights.warnings.push('Quality score is below standard (85%)')
    insights.recommendations.push('Implement additional quality control measures')
  }

  // Bottleneck detection
  const inProgressSteps = order.routingSteps.filter((step: any) => step.status === 'IN_PROGRESS')
  if (inProgressSteps.length > 1) {
    insights.bottlenecks.push('Multiple steps running simultaneously may indicate resource conflicts')
  }

  // Optimization suggestions
  if (metrics.remaining_steps > 5) {
    insights.optimization_suggestions.push('Consider parallel processing for non-dependent steps')
  }

  return insights
}

function assessOrderRisk(order: any): 'low' | 'medium' | 'high' {
  const now = new Date()
  const deadline = new Date(order.requested_deadline || order.target_delivery_date)
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const progress = OrderWorkflowEngine.getStatusProgress(order.status)

  if (daysUntilDeadline < 0) return 'high' // Overdue
  if (daysUntilDeadline <= 3 && progress < 80) return 'high'
  if (daysUntilDeadline <= 7 && progress < 50) return 'medium'
  if (daysUntilDeadline <= 14 && progress < 25) return 'medium'

  return 'low'
}

function calculateEstimatedCompletion(order: any): string | null {
  if (!order.requested_deadline && !order.target_delivery_date) return null

  const progress = OrderWorkflowEngine.getStatusProgress(order.status)
  const deadline = new Date(order.requested_deadline || order.target_delivery_date)
  const totalDays = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const remainingWork = (100 - progress) / 100
  const estimatedDays = Math.ceil(totalDays * remainingWork)

  if (estimatedDays <= 0) return 'Overdue'
  if (estimatedDays === 1) return 'Tomorrow'
  if (estimatedDays <= 7) return `${estimatedDays} days`

  return `${Math.ceil(estimatedDays / 7)} weeks`
}

function calculateStageCompletion(order: any): string | null {
  const currentStep = order.routingSteps.find((step: any) => step.status === 'IN_PROGRESS')
  if (!currentStep) return null

  if (currentStep.estimated_hours && currentStep.actual_hours) {
    const progressHours = currentStep.actual_hours / currentStep.estimated_hours
    const remainingHours = Math.max(0, currentStep.estimated_hours - currentStep.actual_hours)
    return `${remainingHours.toFixed(1)} hours remaining`
  }

  return '2-4 hours (estimated)'
}

function getNextMilestone(order: any): string | undefined {
  const nextStatuses = {
    'INTAKE': 'Design Review',
    'DESIGN_PENDING': 'Client Approval',
    'DESIGN_APPROVAL': 'Production Start',
    'CONFIRMED': 'Production Planning',
    'PRODUCTION_PLANNED': 'Manufacturing',
    'IN_PROGRESS': 'Quality Control',
    'QC': 'Packing',
    'PACKING': 'Delivery',
    'READY_FOR_DELIVERY': 'Completion'
  } as Record<string, string>

  return nextStatuses[order.status]
}

function getEstimatedNextUpdate(order: any): string | undefined {
  // In a real implementation, this would be more sophisticated
  const now = new Date()
  const nextUpdate = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
  return nextUpdate.toISOString()
}

function getRequiredRolesForTransition(fromStatus: string, toStatus: string): Role[] {
  // This would match the workflow transitions
  return ['ADMIN', 'MANAGER'] as Role[]
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'INTAKE': 'Order Intake',
    'DESIGN_PENDING': 'Design in Progress',
    'DESIGN_APPROVAL': 'Awaiting Design Approval',
    'CONFIRMED': 'Order Confirmed',
    'PRODUCTION_PLANNED': 'Production Planned',
    'IN_PROGRESS': 'In Production',
    'QC': 'Quality Control',
    'PACKING': 'Packing',
    'READY_FOR_DELIVERY': 'Ready for Delivery',
    'DELIVERED': 'Delivered',
    'CLOSED': 'Order Closed'
  }

  return labels[status] || status
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    'INTAKE': 'Order has been received and is being processed',
    'DESIGN_PENDING': 'Design team is working on the order requirements',
    'DESIGN_APPROVAL': 'Design is complete and waiting for client approval',
    'CONFIRMED': 'Design approved, order confirmed for production',
    'PRODUCTION_PLANNED': 'Production schedule has been created',
    'IN_PROGRESS': 'Order is currently in production',
    'QC': 'Products are undergoing quality control inspection',
    'PACKING': 'Products are being packed for shipment',
    'READY_FOR_DELIVERY': 'Order is ready to be shipped',
    'DELIVERED': 'Order has been delivered to the client',
    'CLOSED': 'Order has been completed and closed'
  }

  return descriptions[status] || status
}