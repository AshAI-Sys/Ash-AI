import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { AshEventBus } from '@/lib/ash/event-bus'
import { AuditLogger } from '@/lib/ash/audit'
import { RoutingTemplateService } from '@/lib/ash/routing-templates'

// POST /api/ash/orders/[id]/routing/apply-template - Apply routing template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Manager and Admin can change routing templates
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const orderId = id
    const body = await request.json()
    const { routeTemplateKey } = body

    if (!routeTemplateKey) {
      return NextResponse.json(
        { error: 'routeTemplateKey is required' },
        { status: 400 }
      )
    }

    // Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        routingSteps: true,
        brand: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get the routing template
    const template = await prisma.routingTemplate.findUnique({
      where: { templateKey: routeTemplateKey }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Routing template not found' },
        { status: 404 }
      )
    }

    // Check if any steps are already in progress
    const stepsInProgress = order.routingSteps.filter(
      step => ['IN_PROGRESS', 'DONE'].includes(step.status)
    )

    if (stepsInProgress.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot change routing template: some steps are already in progress',
          stepsInProgress: stepsInProgress.map(s => s.name)
        },
        { status: 409 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Store old routing steps for audit
      const oldSteps = order.routingSteps

      // Delete existing PLANNED routing steps
      await tx.routingStep.deleteMany({
        where: {
          orderId,
          status: 'PLANNED'
        }
      })

      // Create new routing steps from template
      const newSteps = await RoutingTemplateService.createRoutingSteps(
        tx,
        orderId,
        template,
        order.dueDate || undefined
      )

      return { oldSteps, newSteps }
    })

    // Log audit event
    await AuditLogger.log({
      userId: session.user.id,
      action: 'APPLY_TEMPLATE',
      entity: 'routing_step',
      entityId: orderId,
      oldValues: { steps: result.oldSteps },
      newValues: { steps: result.newSteps, template: routeTemplateKey }
    })

    // Emit event
    await AshEventBus.emit('ash.routing.applied', {
      orderId,
      templateKey: routeTemplateKey,
      actorId: session.user.id,
      stepsCreated: result.newSteps.length
    })

    return NextResponse.json({
      message: 'Routing template applied successfully',
      steps: result.newSteps
    })

  } catch (error) {
    console.error('Error applying routing template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}