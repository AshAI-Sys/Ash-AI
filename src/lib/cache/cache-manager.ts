// @ts-nocheck
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheItem<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const tags = options.tags || [];

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    });

    // Schedule cleanup
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateByPattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  getStats(): {
    size: number;
    hitRate: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need hit tracking for actual implementation
      keys: Array.from(this.cache.keys())
    };
  }

  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Application-specific cache layers
export class AppCache {
  private static cache = CacheManager.getInstance();

  // Dashboard data cache
  static async getDashboardData(): Promise<unknown> {
    const key = 'dashboard:stats';
    let data = this.cache.get(key);
    
    if (!data) {
      // This would be replaced with actual data fetching
      data = await this.fetchDashboardData();
      this.cache.set(key, data, {
        ttl: 2 * 60 * 1000, // 2 minutes
        tags: ['dashboard', 'stats']
      });
    }
    
    return data;
  }

  private static async fetchDashboardData() {
    // Mock implementation - replace with actual data fetching
    return {
      orders: { total: 150, pending: 25 },
      tasks: { total: 89, overdue: 5 },
      inventory: { lowStock: 12, outOfStock: 3 }
    };
  }

  // Orders cache
  static cacheOrder(order_id: string, orderData: unknown): void {
    this.cache.set(`order:${order_id}`, orderData, {
      ttl: 10 * 60 * 1000, // 10 minutes
      tags: ['orders', `order-${order_id}`]
    });
  }

  static getOrder(order_id: string): unknown | null {
    return this.cache.get(`order:${order_id}`);
  }

  static invalidateOrder(order_id: string): void {
    this.cache.delete(`order:${order_id}`);
    this.cache.invalidateByTag(`order-${order_id}`);
  }

  // User session cache
  static cacheUserSession(user_id: string, sessionData: unknown): void {
    this.cache.set(`user:${user_id}`, sessionData, {
      ttl: 30 * 60 * 1000, // 30 minutes
      tags: ['users', `user-${user_id}`]
    });
  }

  static getUserSession(user_id: string): unknown | null {
    return this.cache.get(`user:${user_id}`);
  }

  // Inventory cache
  static cacheInventoryItem(itemId: string, itemData: unknown): void {
    this.cache.set(`inventory:${itemId}`, itemData, {
      ttl: 15 * 60 * 1000, // 15 minutes
      tags: ['inventory', `item-${itemId}`]
    });
  }

  static getInventoryItem(itemId: string): unknown | null {
    return this.cache.get(`inventory:${itemId}`);
  }

  static invalidateInventory(): void {
    this.cache.invalidateByTag('inventory');
  }

  // Search results cache
  static cacheSearchResults(query: string, results: unknown): void {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    this.cache.set(key, results, {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['search']
    });
  }

  static getSearchResults(query: string): unknown | null {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return this.cache.get(key);
  }

  // API response cache
  static cacheApiResponse(endpoint: string, params: Record<string, unknown>, data: unknown): void {
    const key = `api:${endpoint}:${this.hashParams(params)}`;
    this.cache.set(key, data, {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['api', endpoint]
    });
  }

  static getApiResponse(endpoint: string, params: Record<string, unknown>): unknown | null {
    const key = `api:${endpoint}:${this.hashParams(params)}`;
    return this.cache.get(key);
  }

  static invalidateApiCache(endpoint?: string): void {
    if (endpoint) {
      this.cache.invalidateByTag(endpoint);
    } else {
      this.cache.invalidateByTag('api');
    }
  }

  private static hashParams(params: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(params)).toString('base64');
  }

  // Cache warming
  static async warmCache(): Promise<void> {
    console.log('Warming cache...');
    
    // Warm dashboard data
    await this.getDashboardData();
    
    // Warm frequently accessed data
    await this.warmFrequentData();
    
    console.log('Cache warmed successfully');
  }

  private static async warmFrequentData(): Promise<void> {
    // Mock implementation - replace with actual data warming
    const frequentQueries = [
      'recent-orders',
      'pending-tasks',
      'low-stock-items',
      'active-users'
    ];
    
    for (const query of frequentQueries) {
      // Simulate data fetching and caching
      const data = { query, timestamp: Date.now() };
      this.cache.set(`warm:${query}`, data, {
        ttl: 15 * 60 * 1000,
        tags: ['warm-data']
      });
    }
  }

  // Cache statistics
  static getStats(): {
    size: number;
    keys: string[];
    tags: Record<string, number>;
  } {
    const stats = this.cache.getStats();
    const tagCounts: Record<string, number> = {};
    
    // Count items by tag (simplified implementation)
    for (const key of stats.keys) {
      const item = this.cache.get(key);
      if (item && typeof item === 'object' && 'tags' in item) {
        const tags = (item as { tags: string[] }).tags;
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    
    return {
      ...stats,
      tags: tagCounts
    };
  }

  // Cleanup expired entries
  static cleanup(): number {
    return this.cache.cleanup();
  }

  // Clear all cache
  static clearAll(): void {
    this.cache.clear();
  }
}

// Browser storage cache for client-side
export class BrowserCache {
  static set(key: string, data: unknown, ttlMinutes = 5): void {
    if (typeof window === 'undefined') return;
    
    const item = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    };
    
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(item));
    } catch (_error) {
      console.warn('Failed to set browser cache:', error);
    }
  }

  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const itemStr = localStorage.getItem(`cache:${key}`);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check if expired
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`cache:${key}`);
        return null;
      }
      
      return item.data;
    } catch (_error) {
      console.warn('Failed to get browser cache:', error);
      return null;
    }
  }

  static delete(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cache:${key}`);
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache:')) {
        localStorage.removeItem(key);
      }
    });
  }

  static cleanup(): number {
    if (typeof window === 'undefined') return 0;
    
    let cleaned = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('cache:')) {
        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            if (Date.now() - item.timestamp > item.ttl) {
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (_error) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });
    
    return cleaned;
  }
}

// Auto cleanup setup
if (typeof window !== 'undefined') {
  // Clean up expired cache entries every 5 minutes
  setInterval(() => {
    BrowserCache.cleanup();
  }, 5 * 60 * 1000);
}

// Server-side cleanup setup
if (typeof process !== 'undefined') {
  setInterval(() => {
    AppCache.cleanup();
  }, 5 * 60 * 1000);
}