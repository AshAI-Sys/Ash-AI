// @ts-nocheck
/**
 * PostgreSQL Connection Pool Configuration for ASH AI ERP
 * Production-grade connection pooling with automatic scaling
 */

import { Pool, PoolConfig } from 'pg'
import { PrismaClient } from '@prisma/client'

// Connection pool configuration
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Production connection limits
  max: parseInt(process.env.DB_POOL_MAX_CONNECTIONS || '20'),
  min: parseInt(process.env.DB_POOL_MIN_CONNECTIONS || '5'),
  
  // Connection timeout settings
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'), // 10 seconds
  
  // Keep-alive settings for production
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  
  // Statement timeout
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'), // 60 seconds
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds
}

// Create the connection pool
export const connectionPool = new Pool(poolConfig)

// Enhanced Prisma client with connection pooling
export const prismaWithPool = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
  
  errorFormat: 'pretty',
  
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Connection pool monitoring
export class ConnectionPoolMonitor {
  private static instance: ConnectionPoolMonitor
  private poolStats = {
    totalConnections: 0,
    idleConnections: 0,
    waitingClients: 0,
    lastCheck: new Date(),
  }

  static getInstance(): ConnectionPoolMonitor {
    if (!ConnectionPoolMonitor.instance) {
      ConnectionPoolMonitor.instance = new ConnectionPoolMonitor()
    }
    return ConnectionPoolMonitor.instance
  }

  async getPoolStatus() {
    const totalCount = connectionPool.totalCount
    const idleCount = connectionPool.idleCount
    const waitingCount = connectionPool.waitingCount

    this.poolStats = {
      totalConnections: totalCount,
      idleConnections: idleCount,
      waitingClients: waitingCount,
      lastCheck: new Date(),
    }

    return {
      ...this.poolStats,
      maxConnections: poolConfig.max,
      minConnections: poolConfig.min,
      isHealthy: totalCount < (poolConfig.max || 20) * 0.9, // Alert if using 90%+ of pool
    }
  }

  async checkConnectionHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    message: string
    metrics: typeof this.poolStats & { maxConnections?: number; minConnections?: number }
  }> {
    try {
      const poolStatus = await this.getPoolStatus()
      const utilizationPercent = (poolStatus.totalConnections / (poolStatus.maxConnections || 20)) * 100

      if (utilizationPercent > 90) {
        return {
          status: 'critical',
          message: `Connection pool at ${utilizationPercent.toFixed(1)}% capacity`,
          metrics: poolStatus,
        }
      } else if (utilizationPercent > 75) {
        return {
          status: 'warning',
          message: `Connection pool at ${utilizationPercent.toFixed(1)}% capacity`,
          metrics: poolStatus,
        }
      } else {
        return {
          status: 'healthy',
          message: `Connection pool healthy (${utilizationPercent.toFixed(1)}% used)`,
          metrics: poolStatus,
        }
      }
    } catch (error) {
      return {
        status: 'critical',
        message: `Connection pool check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metrics: this.poolStats,
      }
    }
  }
}

// Connection pool event listeners
connectionPool.on('connect', (client) => {
  console.log('New database connection established')
})

connectionPool.on('error', (err, client) => {
  console.error('Database connection error:', err)
})

connectionPool.on('remove', (client) => {
  console.log('Database connection removed from pool')
})

// Graceful shutdown function
export async function gracefulShutdown() {
  console.log('Shutting down database connections...')
  
  try {
    await prismaWithPool.$disconnect()
    await connectionPool.end()
    console.log('Database connections closed successfully')
  } catch (error) {
    console.error('Error closing database connections:', error)
  }
}

// Process event listeners for graceful shutdown
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export default connectionPool