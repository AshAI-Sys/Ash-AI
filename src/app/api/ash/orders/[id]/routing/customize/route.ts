import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AshEventBus } from '@/lib/ash/event-bus'
import { AuditLogger } from '@/lib/ash/audit'
import { AshleyAI } from '@/lib/ash/ashley'

interface RoutingStep {
  name: string;
  workcenter: string;
  sequence: number;
  [key: string]: unknown;
}

// POST /api/ash/orders/[id]/routing/customize - Customize routing steps
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Manager and Admin can customize routing
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const order_id = id
    const body = await request.json()
    const { steps } = body

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'steps array is required' },
        { status: 400 }
      )
    }

    // Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        routing_steps: true,
        brand: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if any steps are already in progress
    const stepsInProgress = order.routing_steps.filter(
      (step: any) => ['IN_PROGRESS', 'DONE'].includes(step.status)
    )

    if (stepsInProgress.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot customize routing: some steps are already in progress',
          stepsInProgress: stepsInProgress.map(s => s.name)
        },
        { status: 409 }
      )
    }

    // Validate step structure and detect cycles
    const validation = validateRoutingSteps(steps)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Run Ashley AI route safety check
    const routeCheck = await AshleyAI.validateRouteCustomization({
      order_id,
      method: order.method,
      customSteps: steps
    })

    if (routeCheck.blocked) {
      return NextResponse.json(
        { 
          error: 'Route customization blocked by Ashley AI',
          issues: routeCheck.issues,
          risk: routeCheck.risk
        },
        { status: 409 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Store old routing steps for audit
      const oldSteps = order.routing_steps

      // Delete existing PLANNED routing steps
      await tx.routingStep.deleteMany({
        where: {
          order_id: order_id,
          status: 'PLANNED'
        }
      })

      // Create custom routing steps
      const newSteps = []
      for (const stepData of steps) {
        const step = await tx.routingStep.create({
          data: {
            order_id: order_id,
            name: stepData.name,
            workcenter: stepData.workcenter,
            sequence: stepData.sequence,
            depends_on: stepData.dependsOn || [],
            join_type: stepData.joinType,
            standard_spec: stepData.standard_spec || {},
            expected_inputs: stepData.expectedInputs || {},
            expected_outputs: stepData.expectedOutputs || {},
            can_run_parallel: stepData.canRunParallel || false,
            planned_start: stepData.plannedStart ? new Date(stepData.plannedStart) : undefined,
            planned_end: stepData.plannedEnd ? new Date(stepData.plannedEnd) : undefined,
            status: 'PLANNED'
          }
        })
        newSteps.push(step)
      }

      return { oldSteps, newSteps }
    })

    // Log audit event
    await AuditLogger.log({
      user_id: session.user.id,
      action: 'CUSTOMIZE_ROUTING',
      entity: 'routing_step',
      entityId: order_id,
      oldValues: { steps: result.oldSteps },
      newValues: { steps: result.newSteps, customization: true }
    })

    // Emit event
    await AshEventBus.emit('ash.routing.customized', {
      order_id,
      actorId: session.user.id,
      stepsCreated: result.newSteps.length,
      ashleyWarnings: routeCheck.warnings || []
    })

    return NextResponse.json({
      message: 'Routing customized successfully',
      steps: result.newSteps,
      ashleyCheck: routeCheck
    })

  } catch (_error) {
    console.error('Error customizing routing:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validate routing steps structure and detect cycles
function validateRoutingSteps(steps: RoutingStep[]): { valid: boolean; error?: string } {
  // Check required fields
  for (const step of steps) {
    if (!step.name || !step.workcenter || step.sequence === undefined) {
      return {
        valid: false,
        error: 'Each step must have name, workcenter, and sequence'
      }
    }
  }

  // Check for duplicate sequences
  const sequences = steps.map(s => s.sequence)
  if (new Set(sequences).size !== sequences.length) {
    return {
      valid: false,
      error: 'Duplicate sequence numbers found'
    }
  }

  // Build dependency graph and check for cycles
  const graph = new Map<string, string[]>()
  const stepNames = new Set(steps.map(s => s.name))

  for (const step of steps) {
    graph.set(step.name, (step as any).dependsOn || [])
    
    // Check if all dependencies exist
    for (const dep of ((step as any).dependsOn || [])) {
      if (!stepNames.has(dep)) {
        return {
          valid: false,
          error: `Dependency '${dep}' not found for step '${step.name}'`
        }
      }
    }
  }

  // Detect cycles using DFS
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(node: string): boolean {
    if (recursionStack.has(node)) return true
    if (visited.has(node)) return false

    visited.add(node)
    recursionStack.add(node)

    const dependencies = graph.get(node) || []
    for (const dep of dependencies) {
      if (hasCycle(dep)) return true
    }

    recursionStack.delete(node)
    return false
  }

  for (const stepName of stepNames) {
    if (hasCycle(stepName)) {
      return {
        valid: false,
        error: 'Circular dependency detected in routing steps'
      }
    }
  }

  return { valid: true }
}