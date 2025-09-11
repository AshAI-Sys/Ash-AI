import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client with better connection handling and pooling
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Database health check function with retry logic
export async function checkDatabaseConnection(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'healthy', message: 'Database connection successful' }
    } catch (_error) {
      console.error(`Database connection attempt ${attempt} failed:`, _error)
      
      if (attempt === retries) {
        return { 
          status: 'unhealthy', 
          message: _error instanceof Error ? _error.message : 'Unknown database error' 
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  return { status: 'unhealthy', message: 'Max retries exceeded' }
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