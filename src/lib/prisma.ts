// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Production-ready connection pool configuration
const getConnectionPoolConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '20'),
      poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '20000'),
      transactionOptions: {
        maxWait: 10000, // 10 seconds max wait for production
        timeout: 20000, // 20 seconds timeout for production
        isolationLevel: 'ReadCommitted'
      }
    }
  }

  return {
    transactionOptions: {
      maxWait: 5000, // 5 seconds max wait for development
      timeout: 10000, // 10 seconds timeout for development
      isolationLevel: 'ReadCommitted'
    }
  }
}

// Enhanced Prisma client with production-ready connection pooling
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn', 'info']
      : ['error', 'warn'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    ...getConnectionPoolConfig()
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Database health check function with comprehensive monitoring
export async function checkDatabaseConnection(retries = 3) {
  const startTime = Date.now()

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Comprehensive health check
      await prisma.$queryRaw`SELECT 1 as health_check`

      // Check connection pool status
      const connectionInfo = await getDatabaseConnectionInfo()
      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime,
        connectionInfo,
        timestamp: new Date().toISOString()
      }
    } catch (_error) {
      console.error(`Database connection attempt ${attempt} failed:`, _error)

      if (attempt === retries) {
        return {
          status: 'unhealthy',
          message: _error instanceof Error ? _error.message : 'Unknown database error',
          responseTime: Date.now() - startTime,
          attempt,
          timestamp: new Date().toISOString()
        }
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  return { status: 'unhealthy', message: 'Max retries exceeded' }
}

// Get database connection information for monitoring
export async function getDatabaseConnectionInfo() {
  try {
    if (process.env.DATABASE_URL?.startsWith('postgresql')) {
      // PostgreSQL connection info
      const result = await prisma.$queryRaw`
        SELECT
          count(*) as active_connections,
          current_database() as database_name,
          current_user as username,
          version() as version
        FROM pg_stat_activity
        WHERE state = 'active'
      ` as any[]

      return {
        type: 'postgresql',
        activeConnections: result[0]?.active_connections || 0,
        database: result[0]?.database_name || 'unknown',
        user: result[0]?.username || 'unknown',
        version: result[0]?.version || 'unknown'
      }
    } else {
      // SQLite connection info
      const result = await prisma.$queryRaw`PRAGMA database_list` as any[]
      return {
        type: 'sqlite',
        database: result[0]?.file || 'unknown',
        version: 'SQLite'
      }
    }
  } catch (error) {
    console.warn('Could not fetch database connection info:', error)
    return {
      type: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Connection retry function
export async function ensureDatabaseConnection() {
  const health = await checkDatabaseConnection()
  if (health.status === 'unhealthy') {
    throw new Error(`Database connection failed: ${health.message}`)
  }
  return health
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
}