// @ts-nocheck
/**
 * Redis Caching Layer for ASH AI ERP
 * High-performance caching for API endpoints and database queries
 */

import Redis from 'ioredis'

// Redis configuration for production
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Connection settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000,
  
  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
}

// Create Redis client
export const redis = new Redis(redisConfig)

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  // API endpoint caching
  API_RESPONSES: {
    prefix: 'api:',
    ttl: 300, // 5 minutes
  },
  
  // Database query caching
  DB_QUERIES: {
    prefix: 'db:',
    ttl: 600, // 10 minutes
  },
  
  // User sessions
  SESSIONS: {
    prefix: 'session:',
    ttl: 3600, // 1 hour
  },
  
  // Dashboard data
  DASHBOARD_DATA: {
    prefix: 'dashboard:',
    ttl: 180, // 3 minutes
  },
  
  // Analytics data
  ANALYTICS: {
    prefix: 'analytics:',
    ttl: 900, // 15 minutes
  },
  
  // Production metrics
  PRODUCTION_METRICS: {
    prefix: 'prod:',
    ttl: 120, // 2 minutes
  },
  
  // Inventory data
  INVENTORY: {
    prefix: 'inv:',
    ttl: 300, // 5 minutes
  },
} as const

export type CacheType = keyof typeof CACHE_CONFIGS

// Redis cache manager class
export class RedisCacheManager {
  private static instance: RedisCacheManager

  static getInstance(): RedisCacheManager {
    if (!RedisCacheManager.instance) {
      RedisCacheManager.instance = new RedisCacheManager()
    }
    return RedisCacheManager.instance
  }

  // Get data from cache
  async get<T = any>(key: string, type: CacheType): Promise<T | null> {
    try {
      const config = CACHE_CONFIGS[type]
      const fullKey = `${config.prefix}${key}`
      const data = await redis.get(fullKey)
      
      if (!data) return null
      
      return JSON.parse(data) as T
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  // Set data in cache
  async set<T = any>(key: string, value: T, type: CacheType, customTTL?: number): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[type]
      const fullKey = `${config.prefix}${key}`
      const ttl = customTTL || config.ttl
      
      await redis.setex(fullKey, ttl, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  }

  // Delete from cache
  async delete(key: string, type: CacheType): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[type]
      const fullKey = `${config.prefix}${key}`
      const result = await redis.del(fullKey)
      return result > 0
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error)
      return false
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern: string, type: CacheType): Promise<number> {
    try {
      const config = CACHE_CONFIGS[type]
      const fullPattern = `${config.prefix}${pattern}`
      const keys = await redis.keys(fullPattern)
      
      if (keys.length === 0) return 0
      
      const result = await redis.del(...keys)
      return result
    } catch (error) {
      console.error(`Redis CLEAR PATTERN error for pattern ${pattern}:`, error)
      return 0
    }
  }

  // Check if key exists
  async exists(key: string, type: CacheType): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[type]
      const fullKey = `${config.prefix}${key}`
      const result = await redis.exists(fullKey)
      return result === 1
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error)
      return false
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    status: 'connected' | 'disconnected'
    memory: {
      used: string
      peak: string
      rss: string
    }
    keyspace: Record<string, any>
    clients: number
  }> {
    try {
      const info = await redis.info()
      const lines = info.split('\r\n')
      
      const stats = {
        status: 'connected' as const,
        memory: {
          used: this.extractValue(lines, 'used_memory_human'),
          peak: this.extractValue(lines, 'used_memory_peak_human'),
          rss: this.extractValue(lines, 'used_memory_rss_human'),
        },
        keyspace: {},
        clients: parseInt(this.extractValue(lines, 'connected_clients') || '0'),
      }

      // Parse keyspace information
      const keyspaceLines = lines.filter(line => line.startsWith('db'))
      keyspaceLines.forEach(line => {
        const [db, info] = line.split(':')
        if (info) {
          const keyCount = info.match(/keys=(\d+)/)
          if (keyCount) {
            stats.keyspace[db] = parseInt(keyCount[1])
          }
        }
      })

      return stats
    } catch (error) {
      console.error('Redis stats error:', error)
      return {
        status: 'disconnected',
        memory: { used: 'N/A', peak: 'N/A', rss: 'N/A' },
        keyspace: {},
        clients: 0,
      }
    }
  }

  private extractValue(lines: string[], key: string): string {
    const line = lines.find(l => l.startsWith(`${key}:`))
    return line ? line.split(':')[1] : 'N/A'
  }
}

// Cache wrapper for API responses
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheKeyFn: (...args: Parameters<T>) => string,
  type: CacheType = 'API_RESPONSES',
  customTTL?: number
) {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const cache = RedisCacheManager.getInstance()
    const cacheKey = cacheKeyFn(...args)

    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey, type)
    if (cachedResult !== null) {
      return cachedResult as Awaited<ReturnType<T>>
    }

    // Execute function and cache result
    const result = await fn(...args)
    await cache.set(cacheKey, result, type, customTTL)

    return result
  }
}

// Cache invalidation helpers
export class CacheInvalidator {
  private static cache = RedisCacheManager.getInstance()

  // Invalidate order-related caches
  static async invalidateOrder(orderId: string) {
    await Promise.all([
      this.cache.clearPattern(`order:${orderId}*`, 'API_RESPONSES'),
      this.cache.clearPattern(`order:${orderId}*`, 'DB_QUERIES'),
      this.cache.clearPattern('dashboard:*', 'DASHBOARD_DATA'),
      this.cache.clearPattern('production:*', 'PRODUCTION_METRICS'),
    ])
  }

  // Invalidate production-related caches
  static async invalidateProduction(workspaceId: string) {
    await Promise.all([
      this.cache.clearPattern(`production:${workspaceId}*`, 'API_RESPONSES'),
      this.cache.clearPattern(`metrics:${workspaceId}*`, 'PRODUCTION_METRICS'),
      this.cache.clearPattern('dashboard:*', 'DASHBOARD_DATA'),
    ])
  }

  // Invalidate inventory-related caches
  static async invalidateInventory(workspaceId: string) {
    await Promise.all([
      this.cache.clearPattern(`inventory:${workspaceId}*`, 'INVENTORY'),
      this.cache.clearPattern(`inv:${workspaceId}*`, 'API_RESPONSES'),
    ])
  }

  // Clear all caches
  static async clearAll() {
    await redis.flushdb()
  }
}

// Redis connection event handlers
redis.on('connect', () => {
  console.log('Redis connection established')
})

redis.on('ready', () => {
  console.log('Redis client ready')
})

redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redis.on('close', () => {
  console.log('Redis connection closed')
})

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...')
})

export default redis