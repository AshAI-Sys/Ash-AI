'use client'

// 📱 ASH AI - Advanced PWA Offline Sync Manager
// Comprehensive offline data synchronization and caching system

interface SyncQueue {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: string
  data: any
  timestamp: Date
  retries: number
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface OfflineStorage {
  orders: any[]
  production: any[]
  qc: any[]
  inventory: any[]
  sync_queue: SyncQueue[]
  user_data: any
  last_sync: Date
}

class OfflineSyncManager {
  private dbName = 'ash-ai-offline'
  private version = 1
  private db: IDBDatabase | null = null
  private syncInProgress = false
  private syncCallbacks: ((progress: number, status: string) => void)[] = []

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'))
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('🗄️ Offline database initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Orders store
        if (!db.objectStoreNames.contains('orders')) {
          const ordersStore = db.createObjectStore('orders', { keyPath: 'id' })
          ordersStore.createIndex('status', 'status', { unique: false })
          ordersStore.createIndex('clientId', 'clientId', { unique: false })
          ordersStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Production tracking store
        if (!db.objectStoreNames.contains('production')) {
          const productionStore = db.createObjectStore('production', { keyPath: 'id' })
          productionStore.createIndex('orderId', 'orderId', { unique: false })
          productionStore.createIndex('stage', 'stage', { unique: false })
          productionStore.createIndex('status', 'status', { unique: false })
        }

        // QC inspections store
        if (!db.objectStoreNames.contains('qc')) {
          const qcStore = db.createObjectStore('qc', { keyPath: 'id' })
          qcStore.createIndex('orderId', 'orderId', { unique: false })
          qcStore.createIndex('status', 'status', { unique: false })
          qcStore.createIndex('inspector', 'inspector', { unique: false })
        }

        // Inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' })
          inventoryStore.createIndex('sku', 'sku', { unique: false })
          inventoryStore.createIndex('category', 'category', { unique: false })
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          syncStore.createIndex('priority', 'priority', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
          syncStore.createIndex('type', 'type', { unique: false })
        }

        // User data and settings
        if (!db.objectStoreNames.contains('user_data')) {
          db.createObjectStore('user_data', { keyPath: 'key' })
        }

        // Sync metadata
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'key' })
        }
      }
    })
  }

  // Store data offline with automatic sync queuing
  async storeData(entity: string, data: any, operation: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const transaction = this.db.transaction([entity, 'sync_queue'], 'readwrite')
    
    try {
      // Store the actual data
      const entityStore = transaction.objectStore(entity)
      if (operation === 'DELETE') {
        await entityStore.delete(data.id)
      } else {
        await entityStore.put(data)
      }

      // Add to sync queue for online sync
      const syncStore = transaction.objectStore('sync_queue')
      const syncItem: SyncQueue = {
        id: `${entity}_${data.id}_${Date.now()}`,
        type: operation,
        entity,
        data,
        timestamp: new Date(),
        retries: 0,
        priority: this.determinePriority(entity, operation)
      }
      
      await syncStore.put(syncItem)
      
      console.log(`📱 Stored ${entity} offline:`, operation, data.id)
    } catch (error) {
      console.error('Failed to store data offline:', error)
      throw error
    }
  }

  // Retrieve data from offline storage
  async getData(entity: string, filters?: any): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([entity], 'readonly')
      const store = transaction.objectStore(entity)
      const request = store.getAll()

      request.onsuccess = () => {
        let results = request.result

        // Apply filters if provided
        if (filters) {
          results = results.filter(item => {
            return Object.keys(filters).every(key => {
              if (filters[key] === undefined) return true
              return item[key] === filters[key]
            })
          })
        }

        resolve(results)
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Sync with server when online
  async syncWithServer(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return

    this.syncInProgress = true
    this.notifyProgress(0, 'Starting sync...')

    try {
      // Get all pending sync items
      const syncQueue = await this.getSyncQueue()
      const totalItems = syncQueue.length

      if (totalItems === 0) {
        this.notifyProgress(100, 'Already up to date')
        return
      }

      console.log(`🔄 Syncing ${totalItems} items with server`)

      // Sort by priority and timestamp
      syncQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })

      let processed = 0
      const maxRetries = 3

      for (const item of syncQueue) {
        try {
          await this.syncItem(item)
          await this.removeSyncItem(item.id)
          processed++
          
          const progress = Math.round((processed / totalItems) * 100)
          this.notifyProgress(progress, `Synced ${processed}/${totalItems} items`)

        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
          
          // Increment retry count
          item.retries++
          if (item.retries >= maxRetries) {
            console.error(`Max retries exceeded for item ${item.id}, removing from queue`)
            await this.removeSyncItem(item.id)
          } else {
            await this.updateSyncItem(item)
          }
        }
      }

      // Update last sync timestamp
      await this.updateSyncMetadata('last_sync', new Date())
      
      this.notifyProgress(100, 'Sync completed successfully')
      console.log('✅ Offline sync completed')

    } catch (error) {
      console.error('Sync failed:', error)
      this.notifyProgress(0, 'Sync failed')
      throw error
    } finally {
      this.syncInProgress = false
    }
  }

  // Sync individual item with server
  private async syncItem(item: SyncQueue): Promise<void> {
    const endpoint = this.getApiEndpoint(item.entity, item.type, item.data.id)
    const method = this.getHttpMethod(item.type)
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      }
    }

    if (method !== 'DELETE') {
      config.body = JSON.stringify(item.data)
    }

    const response = await fetch(endpoint, config)
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }

    // Handle response and update local data if needed
    if (method !== 'DELETE') {
      const updatedData = await response.json()
      await this.updateLocalData(item.entity, updatedData)
    }
  }

  // Auto-sync when connection is restored
  setupAutoSync(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('📶 Connection restored, starting sync...')
      this.syncWithServer().catch(console.error)
    })

    window.addEventListener('offline', () => {
      console.log('📵 Connection lost, switching to offline mode')
    })

    // Periodic sync when online
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncWithServer().catch(console.error)
      }
    }, 30000) // Sync every 30 seconds
  }

  // Cache critical data for offline access
  async cacheEssentialData(): Promise<void> {
    if (!navigator.onLine) return

    try {
      console.log('📥 Caching essential data for offline access...')

      // Cache user's active orders
      const ordersResponse = await fetch('/api/orders?limit=50&status=active')
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json()
        await this.bulkStore('orders', orders)
      }

      // Cache production data
      const productionResponse = await fetch('/api/production/tracking?active=true')
      if (productionResponse.ok) {
        const production = await productionResponse.json()
        await this.bulkStore('production', production)
      }

      // Cache QC inspections
      const qcResponse = await fetch('/api/qc/inspections?status=pending,in_progress')
      if (qcResponse.ok) {
        const qc = await qcResponse.json()
        await this.bulkStore('qc', qc)
      }

      // Cache inventory summary
      const inventoryResponse = await fetch('/api/inventory?summary=true')
      if (inventoryResponse.ok) {
        const inventory = await inventoryResponse.json()
        await this.bulkStore('inventory', inventory)
      }

      console.log('✅ Essential data cached successfully')
    } catch (error) {
      console.error('Failed to cache essential data:', error)
    }
  }

  // Background sync using Service Worker
  registerBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        return registration.sync.register('background-sync')
      }).catch(error => {
        console.error('Background sync registration failed:', error)
      })
    }
  }

  // Utility methods
  private determinePriority(entity: string, operation: string): 'low' | 'medium' | 'high' | 'critical' {
    if (entity === 'qc' && operation === 'CREATE') return 'critical'
    if (entity === 'orders' && operation === 'UPDATE') return 'high'
    if (entity === 'production' && operation === 'UPDATE') return 'high'
    if (entity === 'inventory' && operation === 'UPDATE') return 'medium'
    return 'low'
  }

  private getApiEndpoint(entity: string, operation: string, id?: string): string {
    const baseUrl = '/api'
    switch (entity) {
      case 'orders':
        return operation === 'CREATE' ? `${baseUrl}/orders` : `${baseUrl}/orders/${id}`
      case 'production':
        return operation === 'CREATE' ? `${baseUrl}/production/tracking` : `${baseUrl}/production/tracking/${id}`
      case 'qc':
        return operation === 'CREATE' ? `${baseUrl}/qc/inspections` : `${baseUrl}/qc/inspections/${id}`
      case 'inventory':
        return operation === 'CREATE' ? `${baseUrl}/inventory` : `${baseUrl}/inventory/${id}`
      default:
        return `${baseUrl}/${entity}${id ? `/${id}` : ''}`
    }
  }

  private getHttpMethod(operation: string): string {
    switch (operation) {
      case 'CREATE': return 'POST'
      case 'UPDATE': return 'PUT'
      case 'DELETE': return 'DELETE'
      default: return 'POST'
    }
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from session storage or other secure storage
    return sessionStorage.getItem('auth_token') || ''
  }

  private async getSyncQueue(): Promise<SyncQueue[]> {
    return this.getData('sync_queue')
  }

  private async removeSyncItem(id: string): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    await store.delete(id)
  }

  private async updateSyncItem(item: SyncQueue): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    await store.put(item)
  }

  private async updateLocalData(entity: string, data: any): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([entity], 'readwrite')
    const store = transaction.objectStore(entity)
    await store.put(data)
  }

  private async bulkStore(entity: string, items: any[]): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([entity], 'readwrite')
    const store = transaction.objectStore(entity)
    
    for (const item of items) {
      await store.put(item)
    }
  }

  private async updateSyncMetadata(key: string, value: any): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['sync_metadata'], 'readwrite')
    const store = transaction.objectStore('sync_metadata')
    await store.put({ key, value })
  }

  private notifyProgress(progress: number, status: string): void {
    this.syncCallbacks.forEach(callback => callback(progress, status))
  }

  onSyncProgress(callback: (progress: number, status: string) => void): void {
    this.syncCallbacks.push(callback)
  }

  // Public API
  isOnline(): boolean {
    return navigator.onLine
  }

  isSyncing(): boolean {
    return this.syncInProgress
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const metadata = await this.getData('sync_metadata')
      const lastSync = metadata.find(item => item.key === 'last_sync')
      return lastSync ? new Date(lastSync.value) : null
    } catch {
      return null
    }
  }

  async clearOfflineData(): Promise<void> {
    if (!this.db) return

    const stores = ['orders', 'production', 'qc', 'inventory', 'sync_queue']
    const transaction = this.db.transaction(stores, 'readwrite')
    
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName)
      await store.clear()
    }
    
    console.log('🗑️ Offline data cleared')
  }
}

// Global instance
export const offlineSyncManager = new OfflineSyncManager()

// Initialize on module load
if (typeof window !== 'undefined') {
  offlineSyncManager.initialize().catch(console.error)
}

export default offlineSyncManager