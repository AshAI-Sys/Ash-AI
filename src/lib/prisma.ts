import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Enhanced Prisma client with better connection handling
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

// Database health check function
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', message: 'Database connection successful' }
  } catch (_error) {
    console.error('Database connection failed:', error)
    return { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
}