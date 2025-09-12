// @ts-nocheck
// Fallback in-memory cache for when Redis is not available

class FallbackCache {
  private static instance: FallbackCache
  private cache = new Map<string, { value: string, expiry: number }>()
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Clean expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  static getInstance(): FallbackCache {
    if (!FallbackCache.instance) {
      FallbackCache.instance = new FallbackCache()
    }
    return FallbackCache.instance
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  // Redis-like methods
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, { value, expiry: Date.now() + (24 * 60 * 60 * 1000) }) // 24 hour default
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    this.cache.set(key, { value, expiry: Date.now() + (seconds * 1000) })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async lpush(key: string, ...values: string[]): Promise<void> {
    const existing = await this.get(key)
    const list = existing ? JSON.parse(existing) : []
    list.unshift(...values)
    await this.set(key, JSON.stringify(list))
  }

  async lrange(key: string, start: number, end: number): Promise<string[]> {
    const existing = await this.get(key)
    if (!existing) return []
    
    const list = JSON.parse(existing)
    if (end === -1) return list.slice(start)
    return list.slice(start, end + 1)
  }

  async ltrim(key: string, start: number, end: number): Promise<void> {
    const existing = await this.get(key)
    if (!existing) return
    
    const list = JSON.parse(existing)
    const trimmed = end === -1 ? list.slice(start) : list.slice(start, end + 1)
    await this.set(key, JSON.stringify(trimmed))
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    const existing = await this.get(key)
    const set = new Set(existing ? JSON.parse(existing) : [])
    members.forEach(member => set.add(member))
    await this.set(key, JSON.stringify([...set]))
  }

  async smembers(key: string): Promise<string[]> {
    const existing = await this.get(key)
    return existing ? JSON.parse(existing) : []
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: [...this.cache.keys()],
      isRedis: false,
      uptime: 'In-memory cache'
    }
  }

  // Clear all cache
  clear() {
    this.cache.clear()
  }

  // Destroy instance
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

export default FallbackCache