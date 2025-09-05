import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET /api/sewing/workflows - Get parallel workflow configurations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')

    // Get routing steps with parallel workflow support
    const routingSteps = await prisma.routingStep.findMany({
      where: {
        ...(orderId && { orderId }),
        ...(status && { status })
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            productType: true,
            status: true
          }
        },
        sewingRuns: {
          select: {
            id: true,
            status: true,
            operatorId: true,
            startedAt: true,
            endedAt: true,
            qtyGood: true,
            operator: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: [
        { orderId: 'asc' },
        { sequence: 'asc' }
      ]
    })

    // Group by order and analyze parallel workflows
    const workflowsByOrder = routingSteps.reduce((acc, step) => {
      const orderId = step.orderId
      
      if (!acc[orderId]) {
        acc[orderId] = {
          order: step.order,
          steps: [],
          parallelGroups: {},
          dependencies: {},
          criticalPath: [],
          overallStatus: 'NOT_STARTED'
        }
      }
      
      acc[orderId].steps.push(step)
      
      // Analyze dependencies for parallel processing
      if (step.dependencies && step.dependencies.length > 0) {
        acc[orderId].dependencies[step.stepName] = step.dependencies
      }
      
      return acc
    }, {} as any)

    // Calculate parallel execution groups and critical paths
    Object.values(workflowsByOrder).forEach((workflow: any) => {
      workflow.parallelGroups = calculateParallelGroups(workflow.steps)
      workflow.criticalPath = calculateCriticalPath(workflow.steps)
      workflow.overallStatus = calculateOverallStatus(workflow.steps)
      workflow.completionMetrics = calculateCompletionMetrics(workflow.steps)
    })

    return NextResponse.json({
      workflows: Object.values(workflowsByOrder),
      totalOrders: Object.keys(workflowsByOrder).length
    })

  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/sewing/workflows/optimize - Optimize parallel workflow execution
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'LINE_LEADER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, optimizationType = 'BALANCED' } = body

    if (!orderId) {
      return NextResponse.json({ 
        error: 'Order ID is required' 
      }, { status: 400 })
    }

    // Get order routing steps and current sewing runs
    const routingSteps = await prisma.routingStep.findMany({
      where: { orderId },
      include: {
        sewingRuns: {
          include: {
            operator: {
              select: { id: true, name: true, skillLevel: true }
            },
            operation: {
              select: { standardMinutes: true, difficulty: true }
            }
          }
        }
      },
      orderBy: { sequence: 'asc' }
    })

    if (routingSteps.length === 0) {
      return NextResponse.json({ 
        error: 'No routing steps found for this order' 
      }, { status: 404 })
    }

    // Get available operators
    const availableOperators = await prisma.user.findMany({
      where: {
        role: { in: ['OPERATOR', 'SENIOR_OPERATOR', 'LINE_LEADER'] },
        status: 'ACTIVE'
      },
      include: {
        _count: {
          select: {
            sewingRuns: {
              where: { status: 'IN_PROGRESS' }
            }
          }
        }
      }
    })

    // Generate optimization recommendations
    const optimization = await generateWorkflowOptimization(
      routingSteps, 
      availableOperators, 
      optimizationType
    )

    // Create optimization record
    const optimizationRecord = await prisma.workflowOptimization.create({
      data: {
        orderId,
        type: optimizationType,
        recommendations: optimization.recommendations,
        estimatedSavings: optimization.estimatedSavings,
        createdBy: session.user.id,
        status: 'PENDING'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'OPTIMIZE_WORKFLOW',
        entityType: 'Order',
        entityId: orderId,
        details: `Generated ${optimizationType} workflow optimization`,
        metadata: {
          optimizationType,
          estimatedSavings: optimization.estimatedSavings,
          recommendationCount: optimization.recommendations.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Workflow optimization generated successfully',
      optimization: {
        id: optimizationRecord.id,
        type: optimizationType,
        estimatedSavings: optimization.estimatedSavings,
        recommendations: optimization.recommendations,
        parallelExecution: optimization.parallelExecution,
        criticalPath: optimization.criticalPath
      }
    })

  } catch (error) {
    console.error('Error optimizing workflow:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions for parallel workflow analysis
function calculateParallelGroups(steps: any[]) {
  const groups: { [key: number]: any[] } = {}
  
  steps.forEach(step => {
    const level = calculateStepLevel(step, steps)
    if (!groups[level]) {
      groups[level] = []
    }
    groups[level].push({
      stepName: step.stepName,
      status: step.status,
      dependencies: step.dependencies || [],
      estimatedMinutes: step.targetQty * (step.standardMinutes || 0)
    })
  })
  
  return groups
}

function calculateStepLevel(step: any, allSteps: any[]): number {
  if (!step.dependencies || step.dependencies.length === 0) {
    return 0
  }
  
  const maxDependencyLevel = Math.max(...step.dependencies.map((depName: string) => {
    const depStep = allSteps.find(s => s.stepName === depName)
    return depStep ? calculateStepLevel(depStep, allSteps) : -1
  }))
  
  return maxDependencyLevel + 1
}

function calculateCriticalPath(steps: any[]) {
  // Find the longest path through the workflow
  const stepMap = steps.reduce((map, step) => {
    map[step.stepName] = step
    return map
  }, {} as any)
  
  const visited = new Set()
  const path: string[] = []
  let maxDuration = 0
  let criticalPath: string[] = []
  
  function findLongestPath(stepName: string, currentPath: string[], currentDuration: number) {
    if (visited.has(stepName)) return
    
    visited.add(stepName)
    currentPath.push(stepName)
    
    const step = stepMap[stepName]
    const stepDuration = step ? (step.targetQty * (step.standardMinutes || 0)) : 0
    const totalDuration = currentDuration + stepDuration
    
    // Find steps that depend on this step
    const dependentSteps = steps.filter(s => 
      s.dependencies && s.dependencies.includes(stepName)
    )
    
    if (dependentSteps.length === 0) {
      // End of path
      if (totalDuration > maxDuration) {
        maxDuration = totalDuration
        criticalPath = [...currentPath]
      }
    } else {
      dependentSteps.forEach(depStep => {
        findLongestPath(depStep.stepName, [...currentPath], totalDuration)
      })
    }
    
    visited.delete(stepName)
  }
  
  // Start from steps with no dependencies
  const startSteps = steps.filter(step => 
    !step.dependencies || step.dependencies.length === 0
  )
  
  startSteps.forEach(step => {
    findLongestPath(step.stepName, [], 0)
  })
  
  return {
    path: criticalPath,
    duration: maxDuration,
    steps: criticalPath.map(stepName => stepMap[stepName])
  }
}

function calculateOverallStatus(steps: any[]) {
  const statuses = steps.map(step => step.status)
  
  if (statuses.every(status => status === 'DONE')) return 'COMPLETED'
  if (statuses.some(status => status === 'IN_PROGRESS')) return 'IN_PROGRESS'
  if (statuses.some(status => status === 'READY')) return 'READY'
  return 'NOT_STARTED'
}

function calculateCompletionMetrics(steps: any[]) {
  const total = steps.length
  const completed = steps.filter(step => step.status === 'DONE').length
  const inProgress = steps.filter(step => step.status === 'IN_PROGRESS').length
  const ready = steps.filter(step => step.status === 'READY').length
  
  return {
    total,
    completed,
    inProgress,
    ready,
    pending: total - completed - inProgress - ready,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  }
}

async function generateWorkflowOptimization(steps: any[], operators: any[], type: string) {
  const recommendations = []
  const estimatedSavings = { time: 0, cost: 0 }
  
  // Analyze current workflow for optimization opportunities
  const parallelGroups = calculateParallelGroups(steps)
  const criticalPath = calculateCriticalPath(steps)
  
  // Find bottlenecks in critical path
  const bottlenecks = criticalPath.steps.filter((step: any) => {
    const estimatedTime = step.targetQty * (step.standardMinutes || 0)
    return estimatedTime > 120 // Steps taking more than 2 hours
  })
  
  bottlenecks.forEach((step: any) => {
    recommendations.push({
      type: 'BOTTLENECK_RESOLUTION',
      stepName: step.stepName,
      priority: 'HIGH',
      description: `Consider splitting ${step.stepName} into smaller batches or assigning additional operators`,
      estimatedTimeSaving: step.targetQty * (step.standardMinutes || 0) * 0.3 // 30% time reduction
    })
  })
  
  // Find parallel execution opportunities
  Object.entries(parallelGroups).forEach(([level, levelSteps]: [string, any]) => {
    if (levelSteps.length > 1) {
      const availableOps = operators.filter(op => op._count.sewingRuns === 0)
      if (availableOps.length >= levelSteps.length) {
        recommendations.push({
          type: 'PARALLEL_EXECUTION',
          level: parseInt(level),
          priority: 'MEDIUM',
          description: `Execute ${levelSteps.length} operations in parallel at level ${level}`,
          steps: levelSteps.map((s: any) => s.stepName),
          estimatedTimeSaving: Math.max(...levelSteps.map((s: any) => s.estimatedMinutes)) - 
                                levelSteps.reduce((sum: number, s: any) => sum + s.estimatedMinutes, 0)
        })
      }
    }
  })
  
  // Operator skill matching recommendations
  steps.forEach(step => {
    const optimalOperators = operators.filter(op => {
      // Match skill level with operation difficulty
      const skillMap = { 'JUNIOR': 1, 'INTERMEDIATE': 2, 'SENIOR': 3, 'EXPERT': 4 }
      const difficultyMap = { 'EASY': 1, 'MEDIUM': 2, 'HARD': 3, 'EXPERT': 4 }
      
      const opSkill = skillMap[op.skillLevel as keyof typeof skillMap] || 2
      const stepDifficulty = difficultyMap[step.difficulty as keyof typeof difficultyMap] || 2
      
      return opSkill >= stepDifficulty && op._count.sewingRuns === 0
    })
    
    if (optimalOperators.length > 0) {
      recommendations.push({
        type: 'OPERATOR_MATCHING',
        stepName: step.stepName,
        priority: 'LOW',
        description: `Assign ${optimalOperators[0].name} to ${step.stepName} for optimal skill match`,
        operator: optimalOperators[0],
        estimatedEfficiencyGain: 15 // 15% efficiency improvement
      })
    }
  })
  
  // Calculate total estimated savings
  estimatedSavings.time = recommendations.reduce((sum, rec) => 
    sum + (rec.estimatedTimeSaving || 0), 0
  )
  estimatedSavings.cost = estimatedSavings.time * 0.5 // $0.50 per minute saved
  
  return {
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
      return priorityOrder[b.priority as keyof typeof priorityOrder] - 
             priorityOrder[a.priority as keyof typeof priorityOrder]
    }),
    estimatedSavings,
    parallelExecution: parallelGroups,
    criticalPath
  }
}