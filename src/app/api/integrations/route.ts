import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const active = searchParams.get("active")
    const provider = searchParams.get("provider")
    
    const where: any = {}
    
    if (type) {
      where.type = type
    }
    
    if (status) {
      where.status = status
    }
    
    if (active !== null) {
      where.isActive = active === "true"
    }
    
    if (provider) {
      where.provider = {
        contains: provider,
        mode: "insensitive"
      }
    }

    const integrations = await prisma.integration.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        webhooks: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            url: true,
            events: true,
            successCount: true,
            failureCount: true
          }
        },
        logs: {
          orderBy: {
            created_at: "desc"
          },
          take: 5,
          select: {
            id: true,
            action: true,
            status: true,
            errorMessage: true,
            created_at: true
          }
        },
        _count: {
          select: {
            webhooks: true,
            logs: true,
            automationRules: true
          }
        }
      },
      orderBy: [
        { status: "asc" },
        { updated_at: "desc" }
      ]
    })

    // Enrich integrations with health status
    const enrichedIntegrations = integrations.map(integration => {
      const recentLogs = integration.logs.slice(0, 10)
      const errorLogs = recentLogs.filter(log => log.status === "ERROR")
      const successLogs = recentLogs.filter(log => log.status === "SUCCESS")
      
      const healthScore = recentLogs.length > 0 ? 
        (successLogs.length / recentLogs.length) * 100 : 100
      
      const healthStatus = healthScore >= 90 ? "HEALTHY" : 
                          healthScore >= 70 ? "WARNING" : "CRITICAL"
      
      const totalWebhookCalls = integration.webhooks.reduce((sum, webhook) => 
        sum + webhook.successCount + webhook.failureCount, 0)
      
      const webhookSuccessRate = totalWebhookCalls > 0 ? 
        integration.webhooks.reduce((sum, webhook) => sum + webhook.successCount, 0) / totalWebhookCalls * 100 : 0

      return {
        ...integration,
        healthStatus,
        healthScore: Math.round(healthScore),
        errorCount: errorLogs.length,
        lastError: errorLogs[0]?.errorMessage || null,
        lastSync: integration.lastSync || integration.updatedAt,
        webhookSuccessRate: Math.round(webhookSuccessRate),
        totalWebhookCalls
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedIntegrations
    })

  } catch (_error) {
    console.error("Error fetching integrations:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch integrations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      type,
      provider,
      config,
      credentials,
      apiVersion,
      rateLimits,
      syncFrequency = "HOURLY",
      createdBy
    } = body

    if (!name || !type || !provider || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Name, type, provider, and creator are required" },
        { status: 400 }
      )
    }

    // Check if integration name already exists
    const existingIntegration = await prisma.integration.findUnique({
      where: { name }
    })

    if (existingIntegration) {
      return NextResponse.json(
        { success: false, error: "Integration with this name already exists" },
        { status: 409 }
      )
    }

    // Validate integration type
    const validTypes = [
      "ECOMMERCE", "MARKETPLACE", "SOCIAL_MEDIA", "ACCOUNTING", "CRM",
      "INVENTORY", "SHIPPING", "PAYMENT", "EMAIL_MARKETING", "ANALYTICS", "CUSTOM_API"
    ]
    
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid integration type" },
        { status: 400 }
      )
    }

    // Test connection before creating integration
    const connectionTest = await testIntegrationConnection(type, provider, config, credentials)
    
    const integration = await prisma.integration.create({
      data: {
        name,
        type,
        provider,
        status: connectionTest.success ? "CONNECTED" : "ERROR",
        config: config || {},
        credentials: credentials || {},
        apiVersion,
        rateLimits: rateLimits || {},
        syncFrequency,
        createdBy,
        lastSync: connectionTest.success ? new Date() : null
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Log the creation
    await prisma.integrationLog.create({
      data: {
        integrationId: integration.id,
        action: "INTEGRATION_CREATED",
        status: connectionTest.success ? "SUCCESS" : "ERROR",
        responseData: connectionTest,
        errorMessage: connectionTest.success ? null : connectionTest.error,
        createdBy
      }
    })

    return NextResponse.json({
      success: true,
      data: integration,
      connectionTest
    })

  } catch (_error) {
    console.error("Error creating integration:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create integration" },
      { status: 500 }
    )
  }
}

// Test integration connection (mock implementation)
async function testIntegrationConnection(type: string, provider: string, config: any, credentials: any) {
  try {
    // In a real implementation, this would test actual API connections
    // For demo purposes, we'll simulate connection testing
    
    const testScenarios = {
      "Shopify": { success: true, responseTime: 245 },
      "WooCommerce": { success: true, responseTime: 180 },
      "Amazon": { success: false, error: "Invalid API credentials" },
      "Facebook": { success: true, responseTime: 320 },
      "QuickBooks": { success: true, responseTime: 450 },
      "PayPal": { success: true, responseTime: 290 }
    }

    const scenario = testScenarios[provider] || { success: true, responseTime: 200 }
    
    if (scenario.success) {
      return {
        success: true,
        responseTime: scenario.responseTime,
        message: `Successfully connected to ${provider}`,
        timestamp: new Date().toISOString(),
        connectionDetails: {
          endpoint: `https://api.${provider.toLowerCase()}.com`,
          version: config?.apiVersion || "v1",
          rateLimit: config?.rateLimits?.perHour || 1000
        }
      }
    } else {
      return {
        success: false,
        error: scenario.error,
        message: `Failed to connect to ${provider}`,
        timestamp: new Date().toISOString()
      }
    }

  } catch (_error) {
    return {
      success: false,
      error: `Connection test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }
  }
}