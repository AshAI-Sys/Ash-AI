import { PrismaClient } from '@prisma/client'
import WebSocketManager, { ProductionUpdate, AlertUpdate } from './websocket-manager'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface ProductionMetrics {
  orderId: string
  poNumber: string
  totalSteps: number
  completedSteps: number
  currentStep: string
  overallProgress: number
  estimatedCompletion: Date
  actualDuration?: number
  plannedDuration: number
  efficiency: number
  bottlenecks: string[]
  isDelayed: boolean
  delayReason?: string
}

export interface WorkcenterMetrics {
  workcenterId: string
  name: string
  type: string
  currentOrders: number
  totalCapacity: number
  utilizationRate: number
  averageCycleTime: number
  throughputToday: number
  qualityRate: number
  activeOperators: number
}

export interface ProductionSummary {
  totalActiveOrders: number
  onTimeDelivery: number
  overallEfficiency: number
  bottleneckWorkcenters: string[]
  completedOrdersToday: number
  qualityPassRate: number
  averageLeadTime: number
  capacityUtilization: number
}

class ProductionTracker {
  private static instance: ProductionTracker
  private wsManager: WebSocketManager
  private trackingInterval: NodeJS.Timeout | null = null
  private metricsCache = new Map<string, ProductionMetrics>()

  private constructor() {
    this.wsManager = WebSocketManager.getInstance()
  }

  static getInstance(): ProductionTracker {
    if (!ProductionTracker.instance) {
      ProductionTracker.instance = new ProductionTracker()
    }
    return ProductionTracker.instance
  }

  startTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
    }

    // Track production every 5 seconds
    this.trackingInterval = setInterval(async () => {
      await this.trackProductionProgress()
      await this.detectBottlenecks()
      await this.updateWorkcenterMetrics()
    }, 5000)

    console.log('Production tracking started')
  }

  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
      this.trackingInterval = null
    }
    console.log('Production tracking stopped')
  }

  private async trackProductionProgress() {
    try {
      // Get all active orders with their routing steps
      const activeOrders = await prisma.order.findMany({
        where: {
          status: {
            in: ['IN_PROGRESS', 'PRODUCTION_PLANNED', 'QC']
          }
        },
        include: {
          routing_steps: {
            orderBy: { sequence: 'asc' }
          },
          brand: true,
          client: true
        }
      })

      for (const order of activeOrders) {
        const metrics = await this.calculateOrderMetrics(order)
        this.metricsCache.set(order.id, metrics)

        // Check for significant changes and broadcast
        const shouldBroadcast = await this.shouldBroadcastUpdate(order.id, metrics)
        if (shouldBroadcast) {
          await this.broadcastProductionUpdate(order, metrics)
        }

        // Check for delays and create alerts
        if (metrics.isDelayed) {
          await this.createDelayAlert(order, metrics)
        }
      }

      // Update production summary
      await this.updateProductionSummary(activeOrders)

    } catch (error) {
      console.error('Error tracking production progress:', error)
    }
  }

  private async calculateOrderMetrics(order: any): Promise<ProductionMetrics> {
    const routingSteps = order.routing_steps
    const completedSteps = routingSteps.filter((step: any) => step.status === 'DONE').length
    const totalSteps = routingSteps.length
    const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

    // Find current step
    const currentStepData = routingSteps.find((step: any) => 
      step.status === 'IN_PROGRESS' || step.status === 'READY'
    )
    const currentStep = currentStepData?.name || 'Completed'

    // Calculate planned vs actual duration
    const createdAt = new Date(order.created_at)
    const now = new Date()
    const actualDuration = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) // hours
    
    // Estimate completion based on remaining steps and average cycle times
    const estimatedCompletion = await this.estimateCompletion(order, routingSteps, completedSteps)
    
    // Calculate efficiency
    const plannedDuration = this.getPlannedDuration(order)
    const efficiency = plannedDuration > 0 ? Math.min((plannedDuration / actualDuration) * 100, 100) : 100

    // Detect bottlenecks for this order
    const bottlenecks = await this.detectOrderBottlenecks(order.id, routingSteps)

    // Check if delayed
    const isDelayed = actualDuration > plannedDuration || overallProgress < this.getExpectedProgress(order)

    return {
      orderId: order.id,
      poNumber: order.po_number,
      totalSteps,
      completedSteps,
      currentStep,
      overallProgress,
      estimatedCompletion,
      actualDuration,
      plannedDuration,
      efficiency,
      bottlenecks,
      isDelayed,
      delayReason: isDelayed ? this.getDelayReason(order, routingSteps) : undefined
    }
  }

  private async estimateCompletion(order: any, routingSteps: any[], completedSteps: number): Promise<Date> {
    const remainingSteps = routingSteps.slice(completedSteps)
    let totalRemainingHours = 0

    for (const step of remainingSteps) {
      const avgCycleTime = await this.getAverageCycleTime(step.workcenter, order.method)
      totalRemainingHours += avgCycleTime || 8 // Default 8 hours if no data
    }

    const estimatedCompletion = new Date()
    estimatedCompletion.setHours(estimatedCompletion.getHours() + totalRemainingHours)
    
    return estimatedCompletion
  }

  private async getAverageCycleTime(workcenter: string, method: string): Promise<number> {
    try {
      const cacheKey = `cycletime:${workcenter}:${method}`
      const cached = await redis.get(cacheKey)
      
      if (cached) {
        return parseFloat(cached)
      }

      // Calculate from recent orders
      const recentCompletedSteps = await prisma.routingStep.findMany({
        where: {
          workcenter,
          status: 'DONE',
          updated_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          order: {
            where: { method }
          }
        },
        take: 50
      })

      if (recentCompletedSteps.length === 0) return 8 // Default

      const avgHours = recentCompletedSteps.reduce((sum, step) => {
        if (!step.actual_start || !step.actual_end) return sum + 8
        const duration = (new Date(step.actual_end).getTime() - new Date(step.actual_start).getTime()) / (1000 * 60 * 60)
        return sum + duration
      }, 0) / recentCompletedSteps.length

      await redis.setex(cacheKey, 3600, avgHours.toString()) // Cache for 1 hour
      return avgHours

    } catch (error) {
      console.error('Error calculating cycle time:', error)
      return 8 // Default
    }
  }

  private getPlannedDuration(order: any): number {
    // Calculate based on order complexity and method
    const baseHours = {
      'SILKSCREEN': 48,
      'SUBLIMATION': 36,
      'DTF': 24,
      'EMBROIDERY': 72
    }
    
    const complexityMultiplier = Math.max(1, Math.log10(order.total_qty / 100))
    return (baseHours[order.method as keyof typeof baseHours] || 48) * complexityMultiplier
  }

  private getExpectedProgress(order: any): number {
    const createdAt = new Date(order.created_at)
    const plannedDuration = this.getPlannedDuration(order)
    const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    
    return Math.min((hoursElapsed / plannedDuration) * 100, 95) // Cap at 95%
  }

  private getDelayReason(order: any, routingSteps: any[]): string {
    const stuckSteps = routingSteps.filter((step: any) => {
      if (step.status !== 'IN_PROGRESS') return false
      const startTime = new Date(step.actual_start || step.updated_at)
      const hoursInProgress = (Date.now() - startTime.getTime()) / (1000 * 60 * 60)
      return hoursInProgress > 12 // Stuck for more than 12 hours
    })

    if (stuckSteps.length > 0) {
      return `Bottleneck at ${stuckSteps[0].name} (${stuckSteps[0].workcenter})`
    }

    return 'Behind schedule'
  }

  private async detectOrderBottlenecks(orderId: string, routingSteps: any[]): Promise<string[]> {
    const bottlenecks: string[] = []

    for (const step of routingSteps) {
      if (step.status === 'IN_PROGRESS') {
        const startTime = new Date(step.actual_start || step.updated_at)
        const hoursInProgress = (Date.now() - startTime.getTime()) / (1000 * 60 * 60)
        
        // Check if step is taking too long
        const expectedDuration = await this.getAverageCycleTime(step.workcenter, '')
        if (hoursInProgress > expectedDuration * 1.5) {
          bottlenecks.push(`${step.name} (${step.workcenter})`)
        }
      }
    }

    return bottlenecks
  }

  private async shouldBroadcastUpdate(orderId: string, newMetrics: ProductionMetrics): Promise<boolean> {
    const cached = this.metricsCache.get(orderId)
    if (!cached) return true

    // Broadcast if progress changed by 5% or more
    if (Math.abs(newMetrics.overallProgress - cached.overallProgress) >= 5) return true
    
    // Broadcast if current step changed
    if (newMetrics.currentStep !== cached.currentStep) return true
    
    // Broadcast if delay status changed
    if (newMetrics.isDelayed !== cached.isDelayed) return true

    return false
  }

  private async broadcastProductionUpdate(order: any, metrics: ProductionMetrics) {
    const update: ProductionUpdate = {
      orderId: order.id,
      workcenterId: metrics.currentStep,
      status: order.status,
      progress: metrics.overallProgress,
      timestamp: new Date(),
      operatorId: undefined // Would be set if we track operators
    }

    await this.wsManager.broadcastProductionUpdate(update)
  }

  private async createDelayAlert(order: any, metrics: ProductionMetrics) {
    // Check if we already alerted for this order recently
    const alertKey = `alert:delay:${order.id}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return // Don't spam alerts

    const alert: AlertUpdate = {
      id: `delay_${order.id}_${Date.now()}`,
      type: 'delay',
      severity: metrics.overallProgress < 25 ? 'critical' : 'high',
      title: `Order ${order.po_number} Delayed`,
      message: `${metrics.delayReason}. Current progress: ${Math.round(metrics.overallProgress)}%`,
      orderId: order.id,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 3600, 'sent') // Don't repeat for 1 hour
  }

  private async updateProductionSummary(activeOrders: any[]) {
    const metrics = Array.from(this.metricsCache.values())
    
    const summary: ProductionSummary = {
      totalActiveOrders: activeOrders.length,
      onTimeDelivery: this.calculateOnTimeDelivery(metrics),
      overallEfficiency: this.calculateOverallEfficiency(metrics),
      bottleneckWorkcenters: await this.getBottleneckWorkcenters(),
      completedOrdersToday: await this.getCompletedOrdersToday(),
      qualityPassRate: await this.getQualityPassRate(),
      averageLeadTime: await this.getAverageLeadTime(),
      capacityUtilization: await this.getCapacityUtilization()
    }

    await redis.setex('production:summary', 300, JSON.stringify(summary))
  }

  private calculateOnTimeDelivery(metrics: ProductionMetrics[]): number {
    if (metrics.length === 0) return 100
    const onTime = metrics.filter(m => !m.isDelayed).length
    return (onTime / metrics.length) * 100
  }

  private calculateOverallEfficiency(metrics: ProductionMetrics[]): number {
    if (metrics.length === 0) return 100
    const totalEfficiency = metrics.reduce((sum, m) => sum + m.efficiency, 0)
    return totalEfficiency / metrics.length
  }

  private async getBottleneckWorkcenters(): Promise<string[]> {
    // Implementation would analyze workcenters with highest utilization and lowest throughput
    return []
  }

  private async getCompletedOrdersToday(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const count = await prisma.order.count({
      where: {
        status: 'DELIVERED',
        updated_at: {
          gte: today
        }
      }
    })

    return count
  }

  private async getQualityPassRate(): Promise<number> {
    // Implementation would calculate from QC data
    return 98.5 // Placeholder
  }

  private async getAverageLeadTime(): Promise<number> {
    // Implementation would calculate from recent completed orders
    return 72 // Placeholder in hours
  }

  private async getCapacityUtilization(): Promise<number> {
    // Implementation would calculate from machine and operator data
    return 85.5 // Placeholder percentage
  }

  // Detect system-wide bottlenecks
  private async detectBottlenecks() {
    try {
      const workcenters = await prisma.routingStep.groupBy({
        by: ['workcenter'],
        where: {
          status: {
            in: ['READY', 'IN_PROGRESS']
          }
        },
        _count: {
          workcenter: true
        },
        orderBy: {
          _count: {
            workcenter: 'desc'
          }
        }
      })

      // Alert for workcenters with too many queued steps
      for (const wc of workcenters) {
        if (wc._count.workcenter > 5) { // Threshold
          await this.createBottleneckAlert(wc.workcenter, wc._count.workcenter)
        }
      }

    } catch (error) {
      console.error('Error detecting bottlenecks:', error)
    }
  }

  private async createBottleneckAlert(workcenter: string, queuedCount: number) {
    const alertKey = `alert:bottleneck:${workcenter}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return

    const alert: AlertUpdate = {
      id: `bottleneck_${workcenter}_${Date.now()}`,
      type: 'bottleneck',
      severity: queuedCount > 10 ? 'critical' : 'high',
      title: `Bottleneck Detected: ${workcenter}`,
      message: `${queuedCount} orders queued at ${workcenter} station`,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 1800, 'sent') // Don't repeat for 30 minutes
  }

  private async updateWorkcenterMetrics() {
    // Implementation would update individual workcenter performance metrics
    // This is called less frequently than order tracking
  }

  // Public methods for API access
  async getOrderMetrics(orderId: string): Promise<ProductionMetrics | null> {
    return this.metricsCache.get(orderId) || null
  }

  async getProductionSummary(): Promise<ProductionSummary | null> {
    try {
      const cached = await redis.get('production:summary')
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting production summary:', error)
      return null
    }
  }

  // Manual update trigger for immediate broadcast
  async forceProductionUpdate(orderId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          routing_steps: {
            orderBy: { sequence: 'asc' }
          }
        }
      })

      if (order) {
        const metrics = await this.calculateOrderMetrics(order)
        this.metricsCache.set(order.id, metrics)
        await this.broadcastProductionUpdate(order, metrics)
      }
    } catch (error) {
      console.error('Error forcing production update:', error)
    }
  }
}

export default ProductionTracker