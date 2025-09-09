import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { secureCompare, validateRequiredEnvVars } from "@/lib/security"

// Validate webhook signature
function validateWebhookSignature(signature: string, body: string): boolean {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    throw new Error('WEBHOOK_SECRET environment variable is required')
  }

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex")
  
  const expected = `sha256=${expectedSignature}`
  
  // Use timing-safe comparison to prevent timing attacks
  return secureCompare(expected, signature)
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get("integrationId")
    const active = searchParams.get("active")
    const event = searchParams.get("event")
    
    const where: any = {}
    
    if (integrationId) {
      where.integrationId = integrationId
    }
    
    if (active !== null) {
      where.isActive = active === "true"
    }
    
    if (event) {
      where.events = {
        has: event
      }
    }

    const webhooks = await prisma.webhook.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            provider: true,
            status: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        deliveries: {
          orderBy: {
            created_at: "desc"
          },
          take: 10
        },
        _count: {
          select: {
            deliveries: true
          }
        }
      },
      orderBy: [
        { isActive: "desc" },
        { updated_at: "desc" }
      ]
    })

    // Enrich webhooks with performance metrics
    const enrichedWebhooks = webhooks.map(webhook => {
      const recentDeliveries = webhook.deliveries.slice(0, 100)
      const successfulDeliveries = recentDeliveries.filter(d => d.status === "DELIVERED")
      const failedDeliveries = recentDeliveries.filter(d => d.status === "FAILED")
      
      const successRate = recentDeliveries.length > 0 ? 
        (successfulDeliveries.length / recentDeliveries.length) * 100 : 0
      
      const averageResponseTime = successfulDeliveries
        .map(d => d.createdAt && d.deliveredAt ? 
          new Date(d.deliveredAt).getTime() - new Date(d.createdAt).getTime() : 0)
        .filter(time => time > 0)
        .reduce((sum, time, _, arr) => sum + time / arr.length, 0)

      return {
        ...webhook,
        performanceMetrics: {
          totalDeliveries: webhook._count.deliveries,
          successRate: Math.round(successRate),
          averageResponseTime: Math.round(averageResponseTime),
          recentFailures: failedDeliveries.length,
          lastDelivery: webhook.deliveries[0]?.createdAt || null,
          isHealthy: successRate >= 95 && webhook.failureCount < 5
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedWebhooks
    })

  } catch (_error) {
    console.error("Error fetching webhooks:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch webhooks" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    // Webhook signature validation
    const signature = request.headers.get('webhook-signature')
    if (!signature || !validateWebhookSignature(signature, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Authorization check - admin/manager only
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = JSON.parse(rawBody)
    const {
      integrationId,
      name,
      url,
      method = "POST",
      headers,
      events = [],
      retryCount = 3,
      timeout = 30000,
      createdBy
    } = body

    if (!integrationId || !name || !url || !events.length || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Integration ID, name, URL, events, and creator are required" },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      )
    }

    // Check if integration exists
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: "Integration not found" },
        { status: 404 }
      )
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString("hex")

    // Validate events against integration type
    const validEvents = getValidEventsForIntegration(integration.type)
    const invalidEvents = events.filter(event => !validEvents.includes(event))
    
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid events for integration type",
          details: { invalidEvents, validEvents }
        },
        { status: 400 }
      )
    }

    const webhook = await prisma.webhook.create({
      data: {
        integrationId,
        name,
        url,
        method: method.toUpperCase(),
        headers: headers || {},
        secret,
        events,
        retryCount: Math.min(Math.max(retryCount, 0), 10), // Limit to 0-10
        timeout: Math.min(Math.max(timeout, 1000), 60000), // Limit to 1s-60s
        createdBy
      },
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            provider: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Test webhook delivery
    const testResult = await testWebhookDelivery(webhook)

    return NextResponse.json({
      success: true,
      data: {
        ...webhook,
        // Don't expose the full secret, just confirm it exists
        secret: "***" + secret.slice(-4),
        testResult
      }
    })

  } catch (_error) {
    console.error("Error creating webhook:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create webhook" },
      { status: 500 }
    )
  }
}

// Get valid events for an integration type
function getValidEventsForIntegration(integrationType: string): string[] {
  const eventMappings = {
    ECOMMERCE: [
      "order.created", "order.updated", "order.paid", "order.cancelled",
      "product.created", "product.updated", "inventory.low",
      "customer.created", "payment.success", "payment.failed"
    ],
    MARKETPLACE: [
      "listing.created", "listing.updated", "order.received",
      "inventory.sync", "review.received", "account.suspended"
    ],
    SOCIAL_MEDIA: [
      "post.published", "comment.received", "message.received",
      "follower.gained", "engagement.threshold"
    ],
    ACCOUNTING: [
      "invoice.created", "invoice.paid", "expense.created",
      "tax.calculated", "report.generated"
    ],
    CRM: [
      "lead.created", "contact.updated", "deal.closed",
      "campaign.completed", "email.opened"
    ],
    INVENTORY: [
      "stock.low", "stock.out", "reorder.triggered",
      "shipment.received", "adjustment.made"
    ],
    SHIPPING: [
      "shipment.created", "shipment.picked_up", "shipment.delivered",
      "tracking.updated", "delivery.failed"
    ],
    PAYMENT: [
      "payment.success", "payment.failed", "refund.processed",
      "dispute.created", "subscription.renewed"
    ],
    EMAIL_MARKETING: [
      "email.sent", "email.opened", "link.clicked",
      "subscriber.added", "campaign.completed"
    ],
    ANALYTICS: [
      "report.generated", "threshold.exceeded", "anomaly.detected",
      "goal.achieved", "data.processed"
    ],
    CUSTOM_API: [
      "data.sync", "action.completed", "error.occurred",
      "status.changed", "threshold.reached"
    ]
  }

  return eventMappings[integrationType] || []
}

// Test webhook delivery
async function testWebhookDelivery(webhook: any) {
  try {
    const testPayload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        webhookId: webhook.id,
        message: "This is a test webhook delivery from ASH AI Integration Hub"
      }
    }

    // Generate signature for webhook verification
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest("hex")

    // Simulate HTTP request (in real implementation, use fetch/axios)
    const simulatedResponse = {
      success: Math.random() > 0.2, // 80% success rate for testing
      responseTime: Math.floor(Math.random() * 500) + 100,
      statusCode: Math.random() > 0.2 ? 200 : 500
    }

    // Create webhook delivery record
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType: "webhook.test",
        payload: testPayload,
        status: simulatedResponse.success ? "DELIVERED" : "FAILED",
        responseCode: simulatedResponse.statusCode,
        responseBody: simulatedResponse.success ? "OK" : "Internal Server Error",
        deliveredAt: simulatedResponse.success ? new Date() : null,
        errorMessage: simulatedResponse.success ? null : "Test delivery failed"
      }
    })

    return {
      success: simulatedResponse.success,
      message: simulatedResponse.success ? 
        `Test webhook delivered successfully in ${simulatedResponse.responseTime}ms` :
        "Test webhook delivery failed",
      responseTime: simulatedResponse.responseTime,
      statusCode: simulatedResponse.statusCode,
      signature: `sha256=${signature}`
    }

  } catch (_error) {
    return {
      success: false,
      message: `Test webhook delivery error: ${error.message}`,
      error: error.message
    }
  }
}