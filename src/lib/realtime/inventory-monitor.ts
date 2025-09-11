import { PrismaClient } from '@prisma/client'
import WebSocketManager, { InventoryUpdate, AlertUpdate } from './websocket-manager'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface InventoryStatus {
  itemId: string
  sku: string
  name: string
  category: string
  currentStock: number
  reservedStock: number
  availableStock: number
  minStock: number
  reorderPoint: number
  unit: string
  location: string
  lastMovement: Date
  movementType?: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  costPerUnit?: number
  totalValue?: number
}

export interface StockMovement {
  id: string
  itemId: string
  sku: string
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  fromLocation?: string
  toLocation?: string
  reason: string
  orderId?: string
  operatorId: string
  timestamp: Date
  batchNumber?: string
  expirationDate?: Date
}

export interface InventorySummary {
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  totalValue: number
  recentMovements: number
  topConsumers: Array<{ sku: string, name: string, consumed: number }>
  criticalItems: Array<{ sku: string, name: string, daysLeft: number }>
}

export interface ConsumptionForecast {
  itemId: string
  sku: string
  dailyConsumption: number
  weeklyForecast: number
  monthlyForecast: number
  daysUntilStockout: number
  recommendedReorder: number
  seasonalFactor: number
}

class InventoryMonitor {
  private static instance: InventoryMonitor
  private wsManager: WebSocketManager
  private monitoringInterval: NodeJS.Timeout | null = null
  private inventoryCache = new Map<string, InventoryStatus>()
  private movementQueue: StockMovement[] = []

  private constructor() {
    this.wsManager = WebSocketManager.getInstance()
  }

  static getInstance(): InventoryMonitor {
    if (!InventoryMonitor.instance) {
      InventoryMonitor.instance = new InventoryMonitor()
    }
    return InventoryMonitor.instance
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    // Monitor inventory every 60 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.updateInventoryStatus()
      await this.processStockMovements()
      await this.checkReorderPoints()
      await this.updateConsumptionForecasts()
      await this.detectAnomalies()
    }, 60000)

    console.log('Inventory monitoring started')
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    console.log('Inventory monitoring stopped')
  }

  private async updateInventoryStatus() {
    try {
      const items = await prisma.inventoryItem.findMany({
        orderBy: { updated_at: 'desc' }
      })

      for (const item of items) {
        const status = await this.calculateInventoryStatus(item)
        const previousStatus = this.inventoryCache.get(item.id)
        
        this.inventoryCache.set(item.id, status)

        // Check if significant change occurred
        if (this.shouldBroadcastInventoryUpdate(previousStatus, status)) {
          const update: InventoryUpdate = {
            itemId: item.id,
            sku: item.sku,
            currentStock: status.currentStock,
            consumed: previousStatus ? previousStatus.currentStock - status.currentStock : 0,
            location: status.location,
            timestamp: new Date()
          }

          await this.wsManager.broadcastInventoryUpdate(update)
        }

        // Check for low stock alerts
        if (status.currentStock <= status.reorderPoint && status.currentStock > 0) {
          await this.createLowStockAlert(status)
        }

        // Check for out of stock alerts
        if (status.currentStock <= 0 && previousStatus && previousStatus.currentStock > 0) {
          await this.createOutOfStockAlert(status)
        }
      }

      // Update inventory summary
      await this.updateInventorySummary()

    } catch (error) {
      console.error('Error updating inventory status:', error)
    }
  }

  private async calculateInventoryStatus(item: any): Promise<InventoryStatus> {
    // Get reserved stock (allocated to orders but not yet consumed)
    const reservedStock = await this.getReservedStock(item.id)
    
    // Get recent movements
    const lastMovement = await this.getLastMovement(item.id)
    
    // Calculate costs
    const costPerUnit = await this.getLatestCost(item.id)
    const totalValue = parseFloat(item.quantity.toString()) * (costPerUnit || 0)

    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      currentStock: parseFloat(item.quantity.toString()),
      reservedStock,
      availableStock: Math.max(parseFloat(item.quantity.toString()) - reservedStock, 0),
      minStock: parseFloat(item.min_stock.toString()),
      reorderPoint: parseFloat(item.reorderPoint.toString()),
      unit: item.unit,
      location: await this.getItemLocation(item.id),
      lastMovement: lastMovement?.timestamp || item.updated_at,
      movementType: lastMovement?.type,
      costPerUnit,
      totalValue
    }
  }

  private async getReservedStock(itemId: string): Promise<number> {
    // Calculate reserved stock from active orders
    try {
      const reservations = await redis.get(`reserved:${itemId}`)
      return reservations ? parseFloat(reservations) : 0
    } catch (error) {
      console.error('Error getting reserved stock:', error)
      return 0
    }
  }

  private async getLastMovement(itemId: string): Promise<StockMovement | null> {
    try {
      const cached = await redis.get(`last_movement:${itemId}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting last movement:', error)
      return null
    }
  }

  private async getLatestCost(itemId: string): Promise<number | undefined> {
    try {
      const cost = await redis.get(`cost:${itemId}`)
      return cost ? parseFloat(cost) : undefined
    } catch (error) {
      console.error('Error getting latest cost:', error)
      return undefined
    }
  }

  private async getItemLocation(itemId: string): Promise<string> {
    try {
      const location = await redis.get(`location:${itemId}`)
      return location || 'Warehouse'
    } catch (error) {
      console.error('Error getting item location:', error)
      return 'Warehouse'
    }
  }

  private shouldBroadcastInventoryUpdate(previous: InventoryStatus | undefined, current: InventoryStatus): boolean {
    if (!previous) return true

    // Broadcast if stock level changed
    if (previous.currentStock !== current.currentStock) return true
    
    // Broadcast if location changed
    if (previous.location !== current.location) return true
    
    // Broadcast if crossed reorder point
    if ((previous.currentStock > previous.reorderPoint && current.currentStock <= current.reorderPoint) ||
        (previous.currentStock <= previous.reorderPoint && current.currentStock > current.reorderPoint)) {
      return true
    }

    return false
  }

  // Stock Movement Management
  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<string> {
    const fullMovement: StockMovement = {
      ...movement,
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    // Add to processing queue
    this.movementQueue.push(fullMovement)
    
    // Cache the movement
    await redis.setex(
      `movement:${fullMovement.id}`,
      86400, // 24 hours TTL
      JSON.stringify(fullMovement)
    )

    // Update last movement cache
    await redis.setex(
      `last_movement:${movement.itemId}`,
      3600, // 1 hour TTL
      JSON.stringify(fullMovement)
    )

    // Process immediately for real-time updates
    await this.processStockMovement(fullMovement)

    return fullMovement.id
  }

  private async processStockMovements() {
    while (this.movementQueue.length > 0) {
      const movement = this.movementQueue.shift()!
      await this.processStockMovement(movement)
    }
  }

  private async processStockMovement(movement: StockMovement) {
    try {
      // Update database
      await this.updateDatabaseStock(movement)
      
      // Update caches
      await this.updateStockCaches(movement)
      
      // Broadcast update
      const update: InventoryUpdate = {
        itemId: movement.itemId,
        sku: movement.sku,
        currentStock: await this.getCurrentStock(movement.itemId),
        consumed: movement.type === 'OUT' ? movement.quantity : -movement.quantity,
        location: movement.toLocation || movement.fromLocation || 'Warehouse',
        timestamp: movement.timestamp
      }

      await this.wsManager.broadcastInventoryUpdate(update)

      // Log movement
      console.log(`Stock movement processed: ${movement.type} ${movement.quantity} ${movement.sku}`)

    } catch (error) {
      console.error('Error processing stock movement:', error)
    }
  }

  private async updateDatabaseStock(movement: StockMovement) {
    const quantityChange = movement.type === 'IN' ? movement.quantity : -movement.quantity

    await prisma.inventoryItem.update({
      where: { id: movement.itemId },
      data: {
        quantity: {
          increment: quantityChange
        },
        updated_at: movement.timestamp
      }
    })
  }

  private async updateStockCaches(movement: StockMovement) {
    // Update current stock cache
    const currentStock = await this.getCurrentStock(movement.itemId)
    await redis.setex(`stock:${movement.itemId}`, 300, currentStock.toString())

    // Update movement history
    await redis.lpush(`movements:${movement.itemId}`, JSON.stringify(movement))
    await redis.ltrim(`movements:${movement.itemId}`, 0, 99) // Keep last 100 movements
  }

  private async getCurrentStock(itemId: string): Promise<number> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId }
    })
    return item ? parseFloat(item.quantity.toString()) : 0
  }

  // Reorder Point Management
  private async checkReorderPoints() {
    try {
      const lowStockItems = Array.from(this.inventoryCache.values()).filter(
        item => item.currentStock <= item.reorderPoint && item.currentStock > 0
      )

      for (const item of lowStockItems) {
        await this.processReorderAlert(item)
      }

      // Update reorder summary
      await this.updateReorderSummary(lowStockItems)

    } catch (error) {
      console.error('Error checking reorder points:', error)
    }
  }

  private async processReorderAlert(item: InventoryStatus) {
    const alertKey = `reorder:${item.itemId}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return // Don't spam alerts

    // Calculate recommended reorder quantity
    const forecast = await this.getConsumptionForecast(item.itemId)
    const recommendedOrder = Math.max(
      forecast?.recommendedReorder || 0,
      item.minStock * 2 // Minimum 2x min stock
    )

    const alert: AlertUpdate = {
      id: `reorder_${item.itemId}_${Date.now()}`,
      type: 'inventory',
      severity: item.currentStock <= item.minStock ? 'high' : 'medium',
      title: `Reorder Required: ${item.name}`,
      message: `Stock level: ${item.currentStock} ${item.unit}. Recommended order: ${recommendedOrder} ${item.unit}`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 43200, 'sent') // Don't repeat for 12 hours
  }

  private async createLowStockAlert(item: InventoryStatus) {
    const alertKey = `low_stock:${item.itemId}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return

    const alert: AlertUpdate = {
      id: `lowstock_${item.itemId}_${Date.now()}`,
      type: 'inventory',
      severity: 'medium',
      title: `Low Stock Warning: ${item.name}`,
      message: `Current stock: ${item.currentStock} ${item.unit} (Reorder point: ${item.reorderPoint} ${item.unit})`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 21600, 'sent') // Don't repeat for 6 hours
  }

  private async createOutOfStockAlert(item: InventoryStatus) {
    const alert: AlertUpdate = {
      id: `outofstock_${item.itemId}_${Date.now()}`,
      type: 'inventory',
      severity: 'critical',
      title: `Out of Stock: ${item.name}`,
      message: `Item is completely out of stock. Production may be affected.`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
  }

  private async updateReorderSummary(lowStockItems: InventoryStatus[]) {
    const summary = {
      totalLowStock: lowStockItems.length,
      criticalItems: lowStockItems.filter(item => item.currentStock <= item.minStock),
      totalValue: lowStockItems.reduce((sum, item) => sum + (item.totalValue || 0), 0),
      categories: this.groupByCategory(lowStockItems),
      lastUpdate: new Date()
    }

    await redis.setex('inventory:reorder_summary', 300, JSON.stringify(summary))
  }

  private groupByCategory(items: InventoryStatus[]): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Consumption Forecasting
  private async updateConsumptionForecasts() {
    try {
      const items = Array.from(this.inventoryCache.values())
      
      for (const item of items) {
        const forecast = await this.calculateConsumptionForecast(item)
        
        // Cache forecast
        await redis.setex(
          `forecast:${item.itemId}`,
          3600, // 1 hour TTL
          JSON.stringify(forecast)
        )
      }

    } catch (error) {
      console.error('Error updating consumption forecasts:', error)
    }
  }

  private async calculateConsumptionForecast(item: InventoryStatus): Promise<ConsumptionForecast> {
    // Get consumption history
    const dailyConsumption = await this.getDailyConsumption(item.itemId)
    const seasonalFactor = await this.getSeasonalFactor(item.itemId)
    
    const adjustedDailyConsumption = dailyConsumption * seasonalFactor
    const weeklyForecast = adjustedDailyConsumption * 7
    const monthlyForecast = adjustedDailyConsumption * 30
    
    const daysUntilStockout = adjustedDailyConsumption > 0 
      ? Math.floor(item.availableStock / adjustedDailyConsumption)
      : 999
    
    // Calculate recommended reorder quantity (30 days supply + safety stock)
    const recommendedReorder = Math.max(
      monthlyForecast + (item.minStock * 0.5),
      item.minStock * 2
    )

    return {
      itemId: item.itemId,
      sku: item.sku,
      dailyConsumption: adjustedDailyConsumption,
      weeklyForecast,
      monthlyForecast,
      daysUntilStockout,
      recommendedReorder,
      seasonalFactor
    }
  }

  private async getDailyConsumption(itemId: string): Promise<number> {
    try {
      // Calculate from last 30 days of movements
      const movements = await redis.lrange(`movements:${itemId}`, 0, -1)
      const outMovements = movements
        .map(m => JSON.parse(m))
        .filter((m: StockMovement) => {
          const daysDiff = (Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60 * 60 * 24)
          return m.type === 'OUT' && daysDiff <= 30
        })

      if (outMovements.length === 0) return 0

      const totalConsumption = outMovements.reduce((sum: number, m: StockMovement) => sum + m.quantity, 0)
      const days = Math.min(30, outMovements.length) // Don't divide by more days than we have data

      return totalConsumption / days

    } catch (error) {
      console.error('Error calculating daily consumption:', error)
      return 0
    }
  }

  private async getSeasonalFactor(itemId: string): Promise<number> {
    // Simplified seasonal factor calculation
    // In production, this would be based on historical data analysis
    const month = new Date().getMonth()
    
    // Example: higher consumption in busy months (adjustable per item category)
    const seasonalFactors = [
      1.0, 1.0, 1.1, 1.2, 1.3, 1.2, // Jan-Jun
      1.1, 1.1, 1.2, 1.3, 1.4, 1.2  // Jul-Dec
    ]
    
    return seasonalFactors[month] || 1.0
  }

  private async getConsumptionForecast(itemId: string): Promise<ConsumptionForecast | null> {
    try {
      const cached = await redis.get(`forecast:${itemId}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting consumption forecast:', error)
      return null
    }
  }

  // Anomaly Detection
  private async detectAnomalies() {
    try {
      const items = Array.from(this.inventoryCache.values())
      
      for (const item of items) {
        await this.checkConsumptionAnomalies(item)
        await this.checkStockAnomalies(item)
      }

    } catch (error) {
      console.error('Error detecting anomalies:', error)
    }
  }

  private async checkConsumptionAnomalies(item: InventoryStatus) {
    const forecast = await this.getConsumptionForecast(item.itemId)
    if (!forecast) return

    // Check for unusual consumption patterns
    const recentConsumption = await this.getRecentConsumption(item.itemId, 24) // Last 24 hours
    const expectedDailyConsumption = forecast.dailyConsumption

    if (expectedDailyConsumption > 0 && recentConsumption > expectedDailyConsumption * 2) {
      await this.createConsumptionAnomalyAlert(item, recentConsumption, expectedDailyConsumption)
    }
  }

  private async getRecentConsumption(itemId: string, hours: number): Promise<number> {
    try {
      const movements = await redis.lrange(`movements:${itemId}`, 0, -1)
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
      
      return movements
        .map(m => JSON.parse(m))
        .filter((m: StockMovement) => 
          m.type === 'OUT' && new Date(m.timestamp) > cutoffTime
        )
        .reduce((sum: number, m: StockMovement) => sum + m.quantity, 0)

    } catch (error) {
      console.error('Error getting recent consumption:', error)
      return 0
    }
  }

  private async createConsumptionAnomalyAlert(item: InventoryStatus, actual: number, expected: number) {
    const alertKey = `anomaly:consumption:${item.itemId}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return

    const alert: AlertUpdate = {
      id: `consumption_anomaly_${item.itemId}_${Date.now()}`,
      type: 'inventory',
      severity: 'high',
      title: `Unusual Consumption: ${item.name}`,
      message: `Consumed ${actual} ${item.unit} in last 24h (expected: ${expected.toFixed(1)} ${item.unit})`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 7200, 'sent') // Don't repeat for 2 hours
  }

  private async checkStockAnomalies(item: InventoryStatus) {
    // Check for unexpected stock changes without recorded movements
    const expectedStock = await this.calculateExpectedStock(item.itemId)
    const actualStock = item.currentStock

    if (Math.abs(expectedStock - actualStock) > item.currentStock * 0.1) { // 10% variance
      await this.createStockDiscrepancyAlert(item, expectedStock, actualStock)
    }
  }

  private async calculateExpectedStock(itemId: string): Promise<number> {
    // Calculate expected stock based on movements
    try {
      const movements = await redis.lrange(`movements:${itemId}`, 0, -1)
      const lastHourMovements = movements
        .map(m => JSON.parse(m))
        .filter((m: StockMovement) => {
          const hoursDiff = (Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60 * 60)
          return hoursDiff <= 1
        })

      const netChange = lastHourMovements.reduce((sum: number, m: StockMovement) => {
        return sum + (m.type === 'IN' ? m.quantity : -m.quantity)
      }, 0)

      const currentStock = await this.getCurrentStock(itemId)
      return currentStock - netChange

    } catch (error) {
      console.error('Error calculating expected stock:', error)
      return 0
    }
  }

  private async createStockDiscrepancyAlert(item: InventoryStatus, expected: number, actual: number) {
    const alertKey = `anomaly:discrepancy:${item.itemId}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return

    const alert: AlertUpdate = {
      id: `discrepancy_${item.itemId}_${Date.now()}`,
      type: 'inventory',
      severity: 'medium',
      title: `Stock Discrepancy: ${item.name}`,
      message: `Expected: ${expected} ${item.unit}, Actual: ${actual} ${item.unit}. Inventory audit recommended.`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 14400, 'sent') // Don't repeat for 4 hours
  }

  // Summary and Reporting
  private async updateInventorySummary() {
    const items = Array.from(this.inventoryCache.values())
    
    const summary: InventorySummary = {
      totalItems: items.length,
      lowStockItems: items.filter(item => item.currentStock <= item.reorderPoint).length,
      outOfStockItems: items.filter(item => item.currentStock <= 0).length,
      totalValue: items.reduce((sum, item) => sum + (item.totalValue || 0), 0),
      recentMovements: await this.getRecentMovementsCount(24), // Last 24 hours
      topConsumers: await this.getTopConsumers(10),
      criticalItems: await this.getCriticalItems(5)
    }

    await redis.setex('inventory:summary', 300, JSON.stringify(summary))
  }

  private async getRecentMovementsCount(hours: number): Promise<number> {
    // Count total movements across all items in last X hours
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    let totalMovements = 0

    for (const item of this.inventoryCache.values()) {
      const movements = await redis.lrange(`movements:${item.itemId}`, 0, -1)
      const recentCount = movements
        .map(m => JSON.parse(m))
        .filter((m: StockMovement) => new Date(m.timestamp) > cutoffTime)
        .length

      totalMovements += recentCount
    }

    return totalMovements
  }

  private async getTopConsumers(limit: number): Promise<Array<{ sku: string, name: string, consumed: number }>> {
    const consumption: Array<{ sku: string, name: string, consumed: number }> = []

    for (const item of this.inventoryCache.values()) {
      const consumed = await this.getRecentConsumption(item.itemId, 24)
      if (consumed > 0) {
        consumption.push({
          sku: item.sku,
          name: item.name,
          consumed
        })
      }
    }

    return consumption
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, limit)
  }

  private async getCriticalItems(limit: number): Promise<Array<{ sku: string, name: string, daysLeft: number }>> {
    const critical: Array<{ sku: string, name: string, daysLeft: number }> = []

    for (const item of this.inventoryCache.values()) {
      const forecast = await this.getConsumptionForecast(item.itemId)
      if (forecast && forecast.daysUntilStockout <= 30) {
        critical.push({
          sku: item.sku,
          name: item.name,
          daysLeft: forecast.daysUntilStockout
        })
      }
    }

    return critical
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, limit)
  }

  // Public API methods
  async getInventoryStatus(itemId: string): Promise<InventoryStatus | null> {
    return this.inventoryCache.get(itemId) || null
  }

  async getAllInventoryStatuses(): Promise<InventoryStatus[]> {
    return Array.from(this.inventoryCache.values())
  }

  async getInventorySummary(): Promise<InventorySummary | null> {
    try {
      const cached = await redis.get('inventory:summary')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting inventory summary:', error)
      return null
    }
  }

  async getStockMovements(itemId: string, limit: number = 50): Promise<StockMovement[]> {
    try {
      const movements = await redis.lrange(`movements:${itemId}`, 0, limit - 1)
      return movements.map(m => JSON.parse(m))
    } catch (error) {
      console.error('Error getting stock movements:', error)
      return []
    }
  }

  // Manual operations
  async adjustStock(itemId: string, quantity: number, reason: string, operatorId: string): Promise<string> {
    return this.recordStockMovement({
      itemId,
      sku: this.inventoryCache.get(itemId)?.sku || '',
      type: 'ADJUSTMENT',
      quantity: Math.abs(quantity),
      reason,
      operatorId
    })
  }

  async transferStock(itemId: string, quantity: number, fromLocation: string, toLocation: string, operatorId: string): Promise<string> {
    return this.recordStockMovement({
      itemId,
      sku: this.inventoryCache.get(itemId)?.sku || '',
      type: 'TRANSFER',
      quantity,
      fromLocation,
      toLocation,
      reason: 'Stock transfer',
      operatorId
    })
  }

  async receiveStock(itemId: string, quantity: number, batchNumber: string, cost: number, operatorId: string): Promise<string> {
    // Update cost cache
    await redis.setex(`cost:${itemId}`, 86400, cost.toString())

    return this.recordStockMovement({
      itemId,
      sku: this.inventoryCache.get(itemId)?.sku || '',
      type: 'IN',
      quantity,
      reason: 'Stock received',
      operatorId,
      batchNumber
    })
  }

  async consumeStock(itemId: string, quantity: number, orderId: string, operatorId: string): Promise<string> {
    return this.recordStockMovement({
      itemId,
      sku: this.inventoryCache.get(itemId)?.sku || '',
      type: 'OUT',
      quantity,
      reason: 'Production consumption',
      orderId,
      operatorId
    })
  }
}

export default InventoryMonitor