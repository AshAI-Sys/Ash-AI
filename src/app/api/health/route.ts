// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  createHealthCheckError,
  logError,
  ErrorType,
  ErrorSeverity
} from '@/lib/error-handler'
import { checkDatabaseConnection } from '@/lib/prisma'

// System Health Check - CLIENT_UPDATED_PLAN.md Implementation
// Comprehensive health monitoring for all ASH AI components

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const dbHealth = await checkDatabaseConnection()
    
    // Additional health checks
    const health = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.ASH_APP_VERSION || 'v2024.1.0-quantum',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth,
        api: { status: 'healthy', message: 'API is responsive' },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      },
      features: {
        order_management: true,
        production_tracking: true,
        quality_control: true,
        ai_assistant: !!process.env.OPENAI_API_KEY,
        real_time_updates: true,
        workflow_automation: true
      },
      performance: {
        uptime: Math.round(process.uptime()),
        memory_usage: process.memoryUsage(),
        node_version: process.version
      }
    }

    return createSuccessResponse(health, 'System health check completed')
  } catch (_error) {
    const healthError = createHealthCheckError(
      'system',
      _error instanceof Error ? _error.message : 'Unknown error',
      {
        apiEndpoint: '/api/health',
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    )
    return createErrorResponse(healthError, 503)
  }
}

// POST /api/health - Run comprehensive system diagnostics
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    }

    // Test database connection
    const dbTestStart = Date.now()
    try {
      const dbHealth = await checkDatabaseConnection()
      diagnostics.tests.push({
        name: 'Database Connection',
        status: dbHealth.status === 'healthy' ? 'PASS' : 'FAIL',
        duration: Date.now() - dbTestStart,
        details: dbHealth.message
      })
    } catch (_error) {
      diagnostics.tests.push({
        name: 'Database Connection',
        status: 'FAIL',
        duration: Date.now() - dbTestStart,
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test AI integration
    const aiTestStart = Date.now()
    if (process.env.OPENAI_API_KEY) {
      diagnostics.tests.push({
        name: 'AI Integration',
        status: 'PASS',
        duration: Date.now() - aiTestStart,
        details: 'OpenAI API key configured'
      })
    } else {
      diagnostics.tests.push({
        name: 'AI Integration',
        status: 'WARN',
        duration: Date.now() - aiTestStart,
        details: 'OpenAI API key not configured - AI features disabled'
      })
    }

    const totalDuration = Date.now() - startTime
    const passedTests = diagnostics.tests.filter(t => t.status === 'PASS').length
    const totalTests = diagnostics.tests.length

    const result = {
      ...diagnostics,
      summary: {
        total_duration: totalDuration,
        tests_passed: passedTests,
        tests_total: totalTests,
        success_rate: Math.round((passedTests / totalTests) * 100),
        overall_status: passedTests === totalTests ? 'HEALTHY' : 
                       passedTests >= totalTests * 0.8 ? 'WARNING' : 'CRITICAL'
      }
    }

    return createSuccessResponse(result, 'System diagnostics completed')
  } catch (_error) {
    const healthError = createHealthCheckError(
      'diagnostics',
      _error instanceof Error ? _error.message : 'Unknown error',
      {
        apiEndpoint: '/api/health',
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    )
    return createErrorResponse(healthError, 500)
  }
}