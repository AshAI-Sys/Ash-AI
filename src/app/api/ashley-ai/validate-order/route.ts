import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateOrderIntake, OrderValidationData } from '@/lib/ashley-ai/manufacturing-validations'
import { prisma } from '@/lib/prisma'
import {
  getAuthenticatedUser,
  hasPermission,
  getOrderWithWorkspaceCheck,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validateUUID,
  sanitizeInput,
  checkRateLimit
} from '@/lib/auth-helpers'

// Schema for order validation request
const validateOrderSchema = z.object({
  order_id: z.string().uuid(),
  trigger: z.enum(['create', 'routing_change', 'qty_change', 'date_change', 'method_change']).optional()
})

// POST /api/ashley-ai/validate-order - Validate order with Ashley AI
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Permission check
    if (!hasPermission(user, 'ashley-ai.validate')) {
      return forbiddenResponse('Insufficient permissions to use Ashley AI validation')
    }

    // Rate limiting
    if (!checkRateLimit(`ashley-ai-validate-${user.id}`, 30, 60000)) {
      return NextResponse.json(
        { error: 'Too many validation requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const sanitizedBody = sanitizeInput(body)
    const { order_id, trigger = 'create' } = validateOrderSchema.parse(sanitizedBody)

    // Validate and get order with workspace check
    const order = await getOrderWithWorkspaceCheck(order_id, user.workspace_id)
    if (!order) {
      return notFoundResponse('Order')
    }

    // Get additional order details for validation
    const orderDetails = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        routing_steps: {
          orderBy: { sequence: 'asc' }
        },
        brand: true
      }
    })

    // Prepare validation data
    const validationData: OrderValidationData = {
      order_id: orderDetails!.id,
      method: orderDetails!.method,
      total_qty: orderDetails!.total_qty,
      size_curve: orderDetails!.size_curve as Record<string, number>,
      variants: orderDetails!.variants as Array<{ color: string; qty: number }> || undefined,
      addons: orderDetails!.addons as string[] || undefined,
      target_delivery_date: orderDetails!.target_delivery_date.toISOString(),
      commercials: orderDetails!.commercials as any || undefined,
      routing_steps: orderDetails!.routing_steps.map(step => ({
        name: step.name,
        workcenter: step.workcenter,
        sequence: step.sequence,
        depends_on: step.depends_on as string[] || []
      }))
    }

    // Run Ashley AI validation
    const validationResult = await validateOrderIntake(validationData)

    // Store validation result in database
    await prisma.aIInsight.create({
      data: {
        workspace_id: user.workspace_id,
        type: 'ORDER_VALIDATION',
        priority: validationResult.risk === 'RED' ? 'HIGH' :
                  validationResult.risk === 'AMBER' ? 'MEDIUM' : 'LOW',
        title: `Order Validation - ${orderDetails!.po_number}`,
        message: validationResult.risk === 'GREEN' ?
                 'Order validation passed successfully' :
                 `Order validation ${validationResult.risk.toLowerCase()} - ${validationResult.issues.length} issues found`,
        entity_id: order_id,
        confidence: validationResult.risk === 'GREEN' ? 0.9 :
                   validationResult.risk === 'AMBER' ? 0.7 : 0.4,
        insights: JSON.parse(JSON.stringify({
          trigger,
          risk_level: validationResult.risk,
          issues: validationResult.issues,
          advice: validationResult.advice,
          assumptions: validationResult.assumptions,
          blocking: validationResult.blocking || false,
          validated_at: new Date().toISOString()
        })),
        metadata: JSON.parse(JSON.stringify({
          order_po: orderDetails!.po_number,
          method: orderDetails!.method,
          total_qty: orderDetails!.total_qty,
          target_date: orderDetails!.target_delivery_date.toISOString(),
          validated_by: user.id
        }))
      }
    })

    // Emit event for notifications
    if (validationResult.risk === 'RED' || validationResult.blocking) {
      // eventEmitter.emit('ash.ashley.validation.critical', {
      //   order_id,
      //   risk: validationResult.risk,
      //   issues: validationResult.issues
      // })
    }

    return NextResponse.json({
      order_id,
      validation_result: validationResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in Ashley AI order validation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ashley AI validation failed' },
      { status: 500 }
    )
  }
}

// GET /api/ashley-ai/validate-order?order_id=... - Get latest validation results
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Permission check
    if (!hasPermission(user, 'ashley-ai.validate')) {
      return forbiddenResponse('Insufficient permissions to view Ashley AI validations')
    }

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id parameter is required' },
        { status: 400 }
      )
    }

    // Validate UUID
    try {
      validateUUID(order_id)
    } catch {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      )
    }

    // Verify order exists and user has access
    const order = await getOrderWithWorkspaceCheck(order_id, user.workspace_id)
    if (!order) {
      return notFoundResponse('Order')
    }

    // Get latest validation result with workspace filtering
    const latestValidation = await prisma.aIInsight.findFirst({
      where: {
        type: 'ORDER_VALIDATION',
        entity_id: order_id,
        workspace_id: user.workspace_id
      },
      orderBy: { created_at: 'desc' }
    })

    if (!latestValidation) {
      return NextResponse.json(
        { error: 'No validation results found for this order' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      order_id,
      validation_result: latestValidation.insights,
      confidence: latestValidation.confidence,
      created_at: latestValidation.created_at
    })

  } catch (error) {
    console.error('Error fetching validation results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch validation results' },
      { status: 500 }
    )
  }
}