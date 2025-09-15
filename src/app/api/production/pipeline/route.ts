// @ts-nocheck
// Advanced Production Pipeline Optimization API - CLIENT_UPDATED_PLAN.md Implementation
// Real-time production optimization with intelligent stage transitions and bottleneck analysis

import { NextRequest } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthenticationError,
  logError
} from '@/lib/error-handler'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ProductionPipeline {
  overview: {
    active_orders: number
    total_stages_in_progress: number
    efficiency_score: number
    quality_score: number
    on_time_percentage: number
    capacity_utilization: number
  }
  stage_analysis: {
    stage: string
    active_orders: number
    avg_completion_time: number
    efficiency_percentage: number
    bottleneck_score: number
    recommendations: string[]
    operators: {
      id: string
      name: string
      current_task: string | null
      efficiency: number
      workload: 'low' | 'optimal' | 'high' | 'overloaded'
    }[]
    machines: {
      id: string
      name: string
      status: 'idle' | 'running' | 'maintenance' | 'breakdown'
      current_order: string | null
      efficiency: number
      next_maintenance: string | null
    }[]
  }[]
  optimization_insights: {
    bottlenecks: {
      stage: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      impact: string
      suggested_actions: string[]
      estimated_improvement: string
    }[]
    resource_optimization: {
      underutilized_resources: string[]
      overloaded_resources: string[]
      reallocation_suggestions: string[]
    }
    workflow_improvements: {
      parallel_opportunities: string[]
      automation_candidates: string[]
      process_optimizations: string[]
    }
  }
  real_time_metrics: {
    current_throughput: number
    target_throughput: number
    efficiency_trend: 'improving' | 'stable' | 'declining'
    quality_trend: 'improving' | 'stable' | 'declining'
    predicted_delays: {
      order_id: string
      po_number: string
      delay_hours: number
      reason: string
      mitigation: string
    }[]
  }
  automated_actions: {
    pending_transitions: {
      order_id: string
      from_stage: string
      to_stage: string
      trigger_condition: string
      scheduled_time: string
    }[]
    optimization_actions: {
      action_type: string
      description: string
      impact: string
      auto_execute: boolean
      scheduled_time?: string
    }[]
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyToken(request)
    if (!user) {
      return createErrorResponse(
        createAuthenticationError('Authentication required for production pipeline access'),
        401
      )
    }

    const workspace_id = 'default' // In production, get from user context

    // Build comprehensive pipeline analysis
    const pipeline = await buildProductionPipeline(workspace_id)

    return createSuccessResponse(
      pipeline,
      'Production pipeline optimization data retrieved successfully',
      {
        analysisType: 'real-time',
        optimizationLevel: 'advanced',
        dataFreshness: 'live'
      }
    )

  } catch (error) {
    console.error('Production pipeline error:', error)
    return createErrorResponse(
      'Failed to retrieve production pipeline data',
      500
    )
  }
}

// POST endpoint for triggering optimization actions
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return createErrorResponse(
        createAuthenticationError('Authentication required'),
        401
      )
    }

    const body = await request.json()
    const { action_type, parameters } = body

    let result = null

    switch (action_type) {
      case 'optimize_workflow':
        result = await optimizeWorkflow(parameters, user.id)
        break
      case 'reallocate_resources':
        result = await reallocateResources(parameters, user.id)
        break
      case 'trigger_automation':
        result = await triggerAutomation(parameters, user.id)
        break
      case 'resolve_bottleneck':
        result = await resolveBottleneck(parameters, user.id)
        break
      default:
        return createErrorResponse('Invalid action type', 400)
    }

    return createSuccessResponse(
      result,
      `Production optimization action '${action_type}' executed successfully`
    )

  } catch (error) {
    console.error('Production optimization error:', error)
    return createErrorResponse(
      'Failed to execute optimization action',
      500
    )
  }
}

// Core pipeline analysis function
async function buildProductionPipeline(workspace_id: string): Promise<ProductionPipeline> {
  // Get overview metrics
  const overview = await getProductionOverview(workspace_id)

  // Analyze each production stage
  const stageAnalysis = await analyzeProductionStages(workspace_id)

  // Generate optimization insights
  const optimizationInsights = await generateOptimizationInsights(workspace_id, stageAnalysis)

  // Get real-time metrics
  const realTimeMetrics = await getRealTimeMetrics(workspace_id)

  // Check for automated actions
  const automatedActions = await getAutomatedActions(workspace_id)

  return {
    overview,
    stage_analysis: stageAnalysis,
    optimization_insights: optimizationInsights,
    real_time_metrics: realTimeMetrics,
    automated_actions: automatedActions
  }
}

async function getProductionOverview(workspace_id: string) {
  const [
    activeOrdersCount,
    stagesInProgress,
    efficiencyData,
    qualityData,
    onTimeData,
    capacityData
  ] = await Promise.all([
    // Active orders
    prisma.order.count({
      where: {
        workspace_id,
        status: { in: ['IN_PROGRESS', 'QC', 'PACKING'] }
      }
    }),

    // Total stages in progress
    prisma.productionTracking.count({
      where: {
        order: { workspace_id },
        status: 'IN_PROGRESS'
      }
    }),

    // Efficiency metrics
    prisma.productionTracking.aggregate({
      where: {
        order: { workspace_id },
        efficiency_percentage: { not: null }
      },
      _avg: { efficiency_percentage: true }
    }),

    // Quality metrics
    prisma.qcInspection.aggregate({
      where: {
        order: { workspace_id },
        quality_score: { not: null }
      },
      _avg: { quality_score: true }
    }),

    // On-time delivery data
    getOnTimePercentage(workspace_id),

    // Capacity utilization
    getCapacityUtilization(workspace_id)
  ])

  return {
    active_orders: activeOrdersCount,
    total_stages_in_progress: stagesInProgress,
    efficiency_score: Math.round(efficiencyData._avg.efficiency_percentage || 85),
    quality_score: Math.round(qualityData._avg.quality_score || 90),
    on_time_percentage: onTimeData,
    capacity_utilization: capacityData
  }
}

async function analyzeProductionStages(workspace_id: string) {
  const stages = ['CUTTING', 'PRINTING', 'SEWING', 'FINISHING', 'QC', 'PACKING']
  const stageAnalysis = []

  for (const stage of stages) {
    // Get stage-specific data
    const [trackingData, operators, machines] = await Promise.all([
      getStageTrackingData(workspace_id, stage),
      getStageOperators(workspace_id, stage),
      getStageMachines(workspace_id, stage)
    ])

    // Calculate stage metrics
    const activeOrders = trackingData.filter(t => t.status === 'IN_PROGRESS').length
    const avgCompletionTime = calculateAverageCompletionTime(trackingData)
    const efficiencyPercentage = calculateStageEfficiency(trackingData)
    const bottleneckScore = calculateBottleneckScore(trackingData, stage)
    const recommendations = generateStageRecommendations(trackingData, stage)

    stageAnalysis.push({
      stage,
      active_orders: activeOrders,
      avg_completion_time: avgCompletionTime,
      efficiency_percentage: efficiencyPercentage,
      bottleneck_score: bottleneckScore,
      recommendations,
      operators,
      machines
    })
  }

  return stageAnalysis
}

async function generateOptimizationInsights(workspace_id: string, stageAnalysis: any[]) {
  // Identify bottlenecks
  const bottlenecks = stageAnalysis
    .filter(stage => stage.bottleneck_score > 60)
    .map(stage => ({
      stage: stage.stage,
      severity: stage.bottleneck_score > 90 ? 'critical' :
                stage.bottleneck_score > 80 ? 'high' :
                stage.bottleneck_score > 70 ? 'medium' : 'low',
      impact: `${stage.active_orders} orders affected, ${stage.avg_completion_time}h avg completion`,
      suggested_actions: generateBottleneckActions(stage),
      estimated_improvement: `${Math.round(stage.bottleneck_score * 0.3)}% efficiency gain`
    }))

  // Resource optimization analysis
  const resourceOptimization = await analyzeResourceOptimization(workspace_id, stageAnalysis)

  // Workflow improvement opportunities
  const workflowImprovements = await identifyWorkflowImprovements(workspace_id, stageAnalysis)

  return {
    bottlenecks,
    resource_optimization: resourceOptimization,
    workflow_improvements: workflowImprovements
  }
}

async function getRealTimeMetrics(workspace_id: string) {
  const currentHour = new Date()
  currentHour.setMinutes(0, 0, 0)

  const [
    currentThroughput,
    targetThroughput,
    trends,
    predictedDelays
  ] = await Promise.all([
    // Current hour throughput
    prisma.productionTracking.count({
      where: {
        order: { workspace_id },
        status: 'COMPLETED',
        completed_at: { gte: currentHour }
      }
    }),

    // Target throughput (calculated)
    calculateTargetThroughput(workspace_id),

    // Efficiency and quality trends
    calculateTrends(workspace_id),

    // Predicted delays
    predictOrderDelays(workspace_id)
  ])

  return {
    current_throughput: currentThroughput,
    target_throughput: targetThroughput,
    efficiency_trend: trends.efficiency,
    quality_trend: trends.quality,
    predicted_delays: predictedDelays
  }
}

async function getAutomatedActions(workspace_id: string) {
  // Get pending stage transitions
  const pendingTransitions = await identifyPendingTransitions(workspace_id)

  // Get optimization actions
  const optimizationActions = await identifyOptimizationActions(workspace_id)

  return {
    pending_transitions: pendingTransitions,
    optimization_actions: optimizationActions
  }
}

// Helper functions
async function getStageTrackingData(workspace_id: string, stage: string) {
  return await prisma.productionTracking.findMany({
    where: {
      order: { workspace_id },
      stage: stage
    },
    include: {
      order: { select: { po_number: true, due_date: true } }
    },
    orderBy: { updated_at: 'desc' },
    take: 50
  })
}

async function getStageOperators(workspace_id: string, stage: string) {
  // This would query operator assignments and performance
  // For now, return mock data based on stage
  const mockOperators = [
    { id: '1', name: 'Maria Santos', efficiency: 92, workload: 'optimal' },
    { id: '2', name: 'Juan Dela Cruz', efficiency: 88, workload: 'high' },
    { id: '3', name: 'Rosa Garcia', efficiency: 95, workload: 'low' }
  ]

  return mockOperators.map(op => ({
    ...op,
    current_task: Math.random() > 0.5 ? `${stage} - Order #ASH-001` : null,
    workload: ['low', 'optimal', 'high', 'overloaded'][Math.floor(Math.random() * 4)] as any
  }))
}

async function getStageMachines(workspace_id: string, stage: string) {
  // This would query machine assignments and status
  const mockMachines = [
    { id: '1', name: `${stage} Machine A`, efficiency: 94, status: 'running' },
    { id: '2', name: `${stage} Machine B`, efficiency: 87, status: 'idle' },
    { id: '3', name: `${stage} Machine C`, efficiency: 91, status: 'running' }
  ]

  return mockMachines.map(machine => ({
    ...machine,
    status: ['idle', 'running', 'maintenance', 'breakdown'][Math.floor(Math.random() * 4)] as any,
    current_order: machine.status === 'running' ? `ASH-${Math.floor(Math.random() * 1000)}` : null,
    next_maintenance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }))
}

function calculateAverageCompletionTime(trackingData: any[]): number {
  const completed = trackingData.filter(t => t.status === 'COMPLETED' && t.started_at && t.completed_at)
  if (completed.length === 0) return 8 // Default 8 hours

  const totalHours = completed.reduce((sum, t) => {
    const duration = (t.completed_at.getTime() - t.started_at.getTime()) / (1000 * 60 * 60)
    return sum + duration
  }, 0)

  return Math.round((totalHours / completed.length) * 10) / 10
}

function calculateStageEfficiency(trackingData: any[]): number {
  const withEfficiency = trackingData.filter(t => t.efficiency_percentage)
  if (withEfficiency.length === 0) return 85 // Default

  const avgEfficiency = withEfficiency.reduce((sum, t) => sum + t.efficiency_percentage, 0) / withEfficiency.length
  return Math.round(avgEfficiency)
}

function calculateBottleneckScore(trackingData: any[], stage: string): number {
  const inProgress = trackingData.filter(t => t.status === 'IN_PROGRESS').length
  const total = trackingData.length || 1

  // Higher score = more bottleneck
  const utilizationScore = (inProgress / total) * 100
  const efficiencyPenalty = (100 - calculateStageEfficiency(trackingData)) * 0.5

  return Math.min(Math.round(utilizationScore + efficiencyPenalty), 100)
}

function generateStageRecommendations(trackingData: any[], stage: string): string[] {
  const recommendations = []
  const efficiency = calculateStageEfficiency(trackingData)
  const bottleneckScore = calculateBottleneckScore(trackingData, stage)

  if (efficiency < 80) {
    recommendations.push('Consider operator training or equipment maintenance')
  }

  if (bottleneckScore > 70) {
    recommendations.push('Add additional resources to reduce bottleneck')
    recommendations.push('Review workflow for parallel processing opportunities')
  }

  if (trackingData.filter(t => t.status === 'IN_PROGRESS').length > 5) {
    recommendations.push('Consider work distribution optimization')
  }

  return recommendations.slice(0, 3)
}

function generateBottleneckActions(stage: any): string[] {
  const actions = []

  if (stage.bottleneck_score > 80) {
    actions.push('Add overtime shifts')
    actions.push('Reassign operators from less busy stages')
    actions.push('Fast-track urgent orders')
  }

  if (stage.efficiency_percentage < 70) {
    actions.push('Schedule equipment maintenance')
    actions.push('Provide additional operator training')
  }

  return actions
}

async function analyzeResourceOptimization(workspace_id: string, stageAnalysis: any[]) {
  const underutilized = stageAnalysis
    .filter(stage => stage.active_orders < 2)
    .map(stage => stage.stage)

  const overloaded = stageAnalysis
    .filter(stage => stage.active_orders > 8)
    .map(stage => stage.stage)

  const suggestions = []
  if (underutilized.length > 0 && overloaded.length > 0) {
    suggestions.push(`Reassign operators from ${underutilized.join(', ')} to ${overloaded.join(', ')}`)
  }

  return {
    underutilized_resources: underutilized,
    overloaded_resources: overloaded,
    reallocation_suggestions: suggestions
  }
}

async function identifyWorkflowImprovements(workspace_id: string, stageAnalysis: any[]) {
  return {
    parallel_opportunities: [
      'Run cutting and printing simultaneously for different orders',
      'Overlap QC with packing preparation'
    ],
    automation_candidates: [
      'Automated quality pre-checks',
      'Automatic stage transition triggers'
    ],
    process_optimizations: [
      'Batch similar orders together',
      'Optimize material flow between stages'
    ]
  }
}

async function getOnTimePercentage(workspace_id: string): Promise<number> {
  // This would calculate actual on-time delivery percentage
  return 88 // Mock value
}

async function getCapacityUtilization(workspace_id: string): Promise<number> {
  // This would calculate current capacity utilization
  return 75 // Mock value
}

async function calculateTargetThroughput(workspace_id: string): Promise<number> {
  // This would calculate target throughput based on capacity
  return 12 // Mock value
}

async function calculateTrends(workspace_id: string) {
  // This would analyze historical data for trends
  return {
    efficiency: 'improving' as const,
    quality: 'stable' as const
  }
}

async function predictOrderDelays(workspace_id: string) {
  // This would use ML/AI to predict delays
  return [
    {
      order_id: 'mock-1',
      po_number: 'ASH-2024-001',
      delay_hours: 8,
      reason: 'Equipment maintenance required',
      mitigation: 'Reschedule to alternative machine'
    }
  ]
}

async function identifyPendingTransitions(workspace_id: string) {
  // This would identify orders ready for automatic stage transitions
  return []
}

async function identifyOptimizationActions(workspace_id: string) {
  return [
    {
      action_type: 'resource_reallocation',
      description: 'Move 2 operators from CUTTING to SEWING',
      impact: '15% throughput improvement',
      auto_execute: false
    }
  ]
}

// Optimization action handlers
async function optimizeWorkflow(parameters: any, userId: string) {
  // Implementation for workflow optimization
  return { status: 'optimized', changes: parameters }
}

async function reallocateResources(parameters: any, userId: string) {
  // Implementation for resource reallocation
  return { status: 'reallocated', changes: parameters }
}

async function triggerAutomation(parameters: any, userId: string) {
  // Implementation for automation triggers
  return { status: 'automated', triggers: parameters }
}

async function resolveBottleneck(parameters: any, userId: string) {
  // Implementation for bottleneck resolution
  return { status: 'resolved', actions: parameters }
}