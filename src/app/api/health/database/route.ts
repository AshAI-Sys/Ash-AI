/**
 * Database Health Monitoring API Endpoint
 * Provides comprehensive database health and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { ConnectionPoolMonitor } from '@/lib/connection-pool'
import { RedisCacheManager } from '@/lib/redis-cache'
import { prisma } from '@/lib/prisma'

interface DatabaseHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  database: {
    connection: 'connected' | 'disconnected'
    latency: number
    queries: {
      total: number
      successful: number
      failed: number
    }
    pool: {
      status: 'healthy' | 'warning' | 'critical'
      totalConnections: number
      idleConnections: number
      waitingClients: number
      maxConnections: number
      utilizationPercent: number
    }
  }
  cache: {
    redis: {
      status: 'connected' | 'disconnected'
      memory: {
        used: string
        peak: string
        rss: string
      }
      keyspace: Record<string, number>
      clients: number
    }
  }
  performance: {
    avgQueryTime: number
    slowQueries: number
    cacheHitRatio: number
  }
  system: {
    uptime: number
    nodeVersion: string
    memoryUsage: NodeJS.MemoryUsage
  }
}

let healthMetrics = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  queryTimes: [] as number[],
  slowQueries: 0,
  cacheHits: 0,
  cacheRequests: 0,
  startTime: Date.now(),
}

export async function GET(request: NextRequest): Promise<NextResponse<DatabaseHealthResponse>> {
  const startTime = Date.now()

  try {
    // Test database connectivity with a simple query
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1 as test`
    const dbLatency = Date.now() - dbStart

    healthMetrics.totalQueries++
    healthMetrics.successfulQueries++
    healthMetrics.queryTimes.push(dbLatency)

    // Keep only last 100 query times for rolling average
    if (healthMetrics.queryTimes.length > 100) {
      healthMetrics.queryTimes = healthMetrics.queryTimes.slice(-100)
    }

    // Check for slow queries (> 1000ms)
    if (dbLatency > 1000) {
      healthMetrics.slowQueries++
    }

    // Get connection pool status
    const poolMonitor = ConnectionPoolMonitor.getInstance()
    const poolHealth = await poolMonitor.checkConnectionHealth()

    // Get Redis cache status
    const cacheManager = RedisCacheManager.getInstance()
    const cacheStats = await cacheManager.getStats()

    // Calculate performance metrics
    const avgQueryTime = healthMetrics.queryTimes.reduce((a, b) => a + b, 0) / healthMetrics.queryTimes.length || 0
    const cacheHitRatio = healthMetrics.cacheRequests > 0 
      ? (healthMetrics.cacheHits / healthMetrics.cacheRequests) * 100 
      : 0

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (poolHealth.status === 'critical' || cacheStats.status === 'disconnected' || avgQueryTime > 2000) {
      overallStatus = 'unhealthy'
    } else if (poolHealth.status === 'warning' || avgQueryTime > 1000) {
      overallStatus = 'degraded'
    }

    const response: DatabaseHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: {
        connection: 'connected',
        latency: dbLatency,
        queries: {
          total: healthMetrics.totalQueries,
          successful: healthMetrics.successfulQueries,
          failed: healthMetrics.failedQueries,
        },
        pool: {
          status: poolHealth.status,
          totalConnections: poolHealth.metrics.totalConnections,
          idleConnections: poolHealth.metrics.idleConnections,
          waitingClients: poolHealth.metrics.waitingClients,
          maxConnections: poolHealth.metrics.maxConnections || 20,
          utilizationPercent: Math.round(
            (poolHealth.metrics.totalConnections / (poolHealth.metrics.maxConnections || 20)) * 100
          ),
        },
      },
      cache: {
        redis: cacheStats,
      },
      performance: {
        avgQueryTime: Math.round(avgQueryTime),
        slowQueries: healthMetrics.slowQueries,
        cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
      },
      system: {
        uptime: Math.round((Date.now() - healthMetrics.startTime) / 1000),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      },
    }

    // Set appropriate HTTP status based on health
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    healthMetrics.totalQueries++
    healthMetrics.failedQueries++

    const errorResponse: DatabaseHealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connection: 'disconnected',
        latency: Date.now() - startTime,
        queries: {
          total: healthMetrics.totalQueries,
          successful: healthMetrics.successfulQueries,
          failed: healthMetrics.failedQueries,
        },
        pool: {
          status: 'critical',
          totalConnections: 0,
          idleConnections: 0,
          waitingClients: 0,
          maxConnections: 20,
          utilizationPercent: 0,
        },
      },
      cache: {
        redis: {
          status: 'disconnected',
          memory: { used: 'N/A', peak: 'N/A', rss: 'N/A' },
          keyspace: {},
          clients: 0,
        },
      },
      performance: {
        avgQueryTime: 0,
        slowQueries: healthMetrics.slowQueries,
        cacheHitRatio: 0,
      },
      system: {
        uptime: Math.round((Date.now() - healthMetrics.startTime) / 1000),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      },
    }

    console.error('Database health check failed:', error)

    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

// Reset health metrics (for testing purposes)
export async function POST(): Promise<NextResponse> {
  healthMetrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    queryTimes: [],
    slowQueries: 0,
    cacheHits: 0,
    cacheRequests: 0,
    startTime: Date.now(),
  }

  return NextResponse.json({ 
    message: 'Health metrics reset successfully',
    timestamp: new Date().toISOString(),
  })
}