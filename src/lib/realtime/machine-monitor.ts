// @ts-nocheck
// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import WebSocketManager, { MachineUpdate, AlertUpdate } from './websocket-manager'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface MachineStatus {
  machineId: string
  name: string
  workcenter: string
  status: 'running' | 'idle' | 'maintenance' | 'error'
  utilization: number
  performance: number
  availability: number
  oee: number // Overall Equipment Effectiveness
  currentOrder?: string
  operator?: string
  lastUpdate: Date
}

export interface MachinePerformanceMetrics {
  machineId: string
  hourlyThroughput: number
  dailyThroughput: number
  averageCycleTime: number
  downtime: number
  uptimePercentage: number
  qualityRate: number
  speedLoss: number
  availabilityLoss: number
}

export interface MaintenanceAlert {
  machineId: string
  type: 'scheduled' | 'predictive' | 'breakdown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimatedDowntime?: number
  nextServiceDate?: Date
}

class MachineMonitor {
  private static instance: MachineMonitor
  private wsManager: WebSocketManager
  private monitoringInterval: NodeJS.Timeout | null = null
  private machineStatusCache = new Map<string, MachineStatus>()
  private performanceCache = new Map<string, MachinePerformanceMetrics>()

  private constructor() {
    this.wsManager = WebSocketManager.getInstance()
  }

  static getInstance(): MachineMonitor {
    if (!MachineMonitor.instance) {
      MachineMonitor.instance = new MachineMonitor()
    }
    return MachineMonitor.instance
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    // Monitor machines every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.updateMachineStatus()
      await this.calculatePerformanceMetrics()
      await this.checkMaintenanceAlerts()
      await this.detectAnomalies()
    }, 30000)

    console.log('Machine monitoring started')
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    console.log('Machine monitoring stopped')
  }

  private async updateMachineStatus() {
    try {
      const machines = await prisma.machine.findMany({
        where: { is_active: true },
        include: {
          _count: {
            select: {
              routingSteps: {
                where: {
                  status: 'IN_PROGRESS'
                }
              }
            }
          }
        }
      })

      for (const machine of machines) {
        const status = await this.calculateMachineStatus(machine)
        const previousStatus = this.machineStatusCache.get(machine.id)
        
        this.machineStatusCache.set(machine.id, status)

        // Check if status changed significantly
        if (this.shouldBroadcastMachineUpdate(previousStatus, status)) {
          const update: MachineUpdate = {
            machineId: machine.id,
            status: status.status,
            utilization: status.utilization,
            lastUpdate: status.lastUpdate
          }

          await this.wsManager.broadcastMachineUpdate(update)
        }

        // Check for status change alerts
        if (previousStatus && previousStatus.status !== status.status) {
          await this.handleStatusChange(machine, previousStatus.status, status.status)
        }
      }

    } catch (error) {
      console.error('Error updating machine status:', error)
    }
  }

  private async calculateMachineStatus(machine: any): Promise<MachineStatus> {
    const now = new Date()
    
    // Simulate machine data - in production this would come from IoT sensors
    const isRunning = machine._count.routingSteps > 0
    const utilizationRate = await this.calculateUtilization(machine.id)
    const performanceRate = await this.calculatePerformance(machine.id)
    const availabilityRate = await this.calculateAvailability(machine.id)
    
    // Determine status based on various factors
    let status: 'running' | 'idle' | 'maintenance' | 'error' = 'idle'
    
    if (isRunning && utilizationRate > 20) {
      status = 'running'
    } else if (await this.isInMaintenance(machine.id)) {
      status = 'maintenance'
    } else if (await this.hasError(machine.id)) {
      status = 'error'
    }

    // Get current operator and order
    const currentStep = await prisma.routingStep.findFirst({
      where: {
        status: 'IN_PROGRESS',
        workcenter: machine.workcenter
      },
      include: {
        order: true
      }
    })

    return {
      machineId: machine.id,
      name: machine.name,
      workcenter: machine.workcenter,
      status,
      utilization: utilizationRate,
      performance: performanceRate,
      availability: availabilityRate,
      oee: (utilizationRate * performanceRate * availabilityRate) / 10000, // OEE calculation
      currentOrder: currentStep?.order.po_number,
      operator: await this.getCurrentOperator(machine.id),
      lastUpdate: now
    }
  }

  private async calculateUtilization(machineId: string): Promise<number> {
    try {
      // Get machine running time in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const runningMinutes = await this.getRunningTime(machineId, oneHourAgo, new Date())
      return Math.min((runningMinutes / 60) * 100, 100) // Convert to percentage
      
    } catch (error) {
      console.error('Error calculating utilization:', error)
      return 0
    }
  }

  private async calculatePerformance(machineId: string): Promise<number> {
    try {
      // Compare actual throughput vs theoretical maximum
      const actualThroughput = await this.getActualThroughput(machineId)
      const theoreticalMax = await this.getTheoreticalMaxThroughput(machineId)
      
      return theoreticalMax > 0 ? Math.min((actualThroughput / theoreticalMax) * 100, 100) : 100
      
    } catch (error) {
      console.error('Error calculating performance:', error)
      return 100
    }
  }

  private async calculateAvailability(machineId: string): Promise<number> {
    try {
      // Calculate availability based on planned vs actual running time
      const plannedHours = 8 // 8-hour shift
      const actualAvailableHours = await this.getAvailableHours(machineId)
      
      return Math.min((actualAvailableHours / plannedHours) * 100, 100)
      
    } catch (error) {
      console.error('Error calculating availability:', error)
      return 100
    }
  }

  private async getRunningTime(machineId: string, startTime: Date, endTime: Date): Promise<number> {
    // In a real implementation, this would query IoT data or production logs
    // For now, simulate based on routing steps
    
    const steps = await prisma.routingStep.findMany({
      where: {
        status: 'DONE',
        actual_start: { gte: startTime },
        actual_end: { lte: endTime }
      }
    })

    let totalMinutes = 0
    for (const step of steps) {
      if (step.actual_start && step.actual_end) {
        const duration = (new Date(step.actual_end).getTime() - new Date(step.actual_start).getTime()) / (1000 * 60)
        totalMinutes += duration
      }
    }

    return totalMinutes
  }

  private async getActualThroughput(machineId: string): Promise<number> {
    // Get completed pieces in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const completed = await prisma.routingStep.count({
      where: {
        status: 'DONE',
        actual_end: { gte: oneHourAgo }
      }
    })

    return completed
  }

  private async getTheoreticalMaxThroughput(machineId: string): Promise<number> {
    // This would be based on machine specifications
    // For now, return a simulated value based on workcenter type
    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    })

    const maxRates = {
      'PRINTING': 50,
      'CUTTING': 30,
      'SEWING': 20,
      'QC': 100,
      'PACKING': 80
    }

    return maxRates[machine?.workcenter as keyof typeof maxRates] || 25
  }

  private async getAvailableHours(machineId: string): Promise<number> {
    // Calculate available hours minus maintenance and breakdowns
    const maintenanceTime = await this.getMaintenanceTime(machineId)
    const breakdownTime = await this.getBreakdownTime(machineId)
    
    return Math.max(8 - (maintenanceTime + breakdownTime), 0)
  }

  private async getMaintenanceTime(machineId: string): Promise<number> {
    // Check maintenance records for today
    // For simulation, return random value
    return Math.random() * 0.5 // 0-30 minutes
  }

  private async getBreakdownTime(machineId: string): Promise<number> {
    // Check breakdown logs for today
    // For simulation, return random value
    return Math.random() * 0.25 // 0-15 minutes
  }

  private async isInMaintenance(machineId: string): Promise<boolean> {
    // Check if machine is scheduled for maintenance
    const maintenance = await redis.get(`maintenance:${machineId}`)
    return maintenance === 'true'
  }

  private async hasError(machineId: string): Promise<boolean> {
    // Check for error conditions
    const error = await redis.get(`error:${machineId}`)
    return error === 'true'
  }

  private async getCurrentOperator(machineId: string): Promise<string | undefined> {
    // Get current operator for the machine
    const operator = await redis.get(`operator:${machineId}`)
    return operator || undefined
  }

  private shouldBroadcastMachineUpdate(previous: MachineStatus | undefined, current: MachineStatus): boolean {
    if (!previous) return true
    
    // Broadcast if status changed
    if (previous.status !== current.status) return true
    
    // Broadcast if utilization changed by more than 10%
    if (Math.abs(previous.utilization - current.utilization) >= 10) return true
    
    // Broadcast if OEE changed significantly
    if (Math.abs(previous.oee - current.oee) >= 5) return true

    return false
  }

  private async handleStatusChange(machine: any, oldStatus: string, newStatus: string) {
    let alertType: 'machine' = 'machine'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let message = ''

    switch (newStatus) {
      case 'error':
        severity = 'critical'
        message = `Machine ${machine.name} has encountered an error and requires immediate attention`
        break
      case 'maintenance':
        severity = 'medium'
        message = `Machine ${machine.name} is now in maintenance mode`
        break
      case 'idle':
        if (oldStatus === 'running') {
          severity = 'low'
          message = `Machine ${machine.name} has stopped running`
        }
        break
      case 'running':
        if (oldStatus === 'error' || oldStatus === 'maintenance') {
          severity = 'low'
          message = `Machine ${machine.name} is back online and running`
        }
        break
    }

    if (message) {
      const alert: AlertUpdate = {
        id: `machine_${machine.id}_${Date.now()}`,
        type: alertType,
        severity,
        title: `Machine Status Change: ${machine.name}`,
        message,
        machineId: machine.id,
        timestamp: new Date()
      }

      await this.wsManager.broadcastAlert(alert)
    }
  }

  private async calculatePerformanceMetrics() {
    try {
      const machines = await prisma.machine.findMany({
        where: { is_active: true }
      })

      for (const machine of machines) {
        const metrics = await this.calculateMachinePerformanceMetrics(machine.id)
        this.performanceCache.set(machine.id, metrics)
        
        // Cache metrics in Redis for API access
        await redis.setex(
          `machine:performance:${machine.id}`,
          300, // 5 minutes TTL
          JSON.stringify(metrics)
        )
      }

    } catch (error) {
      console.error('Error calculating performance metrics:', error)
    }
  }

  private async calculateMachinePerformanceMetrics(machineId: string): Promise<MachinePerformanceMetrics> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const hourlyThroughput = await this.getThroughputForPeriod(machineId, oneHourAgo, now)
    const dailyThroughput = await this.getThroughputForPeriod(machineId, oneDayAgo, now)
    
    return {
      machineId,
      hourlyThroughput,
      dailyThroughput,
      averageCycleTime: await this.getAverageCycleTime(machineId),
      downtime: await this.getDowntime(machineId),
      uptimePercentage: await this.getUptimePercentage(machineId),
      qualityRate: await this.getQualityRate(machineId),
      speedLoss: await this.getSpeedLoss(machineId),
      availabilityLoss: await this.getAvailabilityLoss(machineId)
    }
  }

  private async getThroughputForPeriod(machineId: string, startTime: Date, endTime: Date): Promise<number> {
    // Calculate throughput based on completed routing steps
    const completed = await prisma.routingStep.count({
      where: {
        status: 'DONE',
        actual_end: {
          gte: startTime,
          lte: endTime
        }
      }
    })

    return completed
  }

  private async getAverageCycleTime(machineId: string): Promise<number> {
    // Calculate average time per piece
    const recentSteps = await prisma.routingStep.findMany({
      where: {
        status: 'DONE',
        actual_start: { not: null },
        actual_end: { not: null }
      },
      take: 20,
      orderBy: { actual_end: 'desc' }
    })

    if (recentSteps.length === 0) return 0

    const totalTime = recentSteps.reduce((sum, step) => {
      const start = new Date(step.actual_start!).getTime()
      const end = new Date(step.actual_end!).getTime()
      return sum + (end - start)
    }, 0)

    return totalTime / recentSteps.length / 1000 / 60 // Convert to minutes
  }

  private async getDowntime(machineId: string): Promise<number> {
    // Calculate downtime in minutes for today
    return await this.getMaintenanceTime(machineId) + await this.getBreakdownTime(machineId)
  }

  private async getUptimePercentage(machineId: string): Promise<number> {
    const totalMinutes = 8 * 60 // 8-hour shift
    const downtime = await this.getDowntime(machineId)
    return Math.max(((totalMinutes - downtime) / totalMinutes) * 100, 0)
  }

  private async getQualityRate(machineId: string): Promise<number> {
    // In production, this would be calculated from QC data
    return 98.5 // Simulated quality rate
  }

  private async getSpeedLoss(machineId: string): Promise<number> {
    const actual = await this.getActualThroughput(machineId)
    const theoretical = await this.getTheoreticalMaxThroughput(machineId)
    return theoretical > 0 ? ((theoretical - actual) / theoretical) * 100 : 0
  }

  private async getAvailabilityLoss(machineId: string): Promise<number> {
    const downtime = await this.getDowntime(machineId)
    const totalTime = 8 * 60 // 8-hour shift in minutes
    return (downtime / totalTime) * 100
  }

  private async checkMaintenanceAlerts() {
    try {
      const machines = await prisma.machine.findMany({
        where: { is_active: true }
      })

      for (const machine of machines) {
        await this.checkPredictiveMaintenance(machine)
        await this.checkScheduledMaintenance(machine)
      }

    } catch (error) {
      console.error('Error checking maintenance alerts:', error)
    }
  }

  private async checkPredictiveMaintenance(machine: any) {
    const status = this.machineStatusCache.get(machine.id)
    if (!status) return

    // Check for maintenance indicators
    if (status.performance < 70 || status.availability < 80) {
      const alertKey = `maintenance:predictive:${machine.id}`
      const recentAlert = await redis.get(alertKey)
      if (recentAlert) return

      const alert: AlertUpdate = {
        id: `predictive_${machine.id}_${Date.now()}`,
        type: 'machine',
        severity: 'medium',
        title: `Predictive Maintenance Alert: ${machine.name}`,
        message: `Performance degradation detected. Consider scheduling maintenance.`,
        machineId: machine.id,
        timestamp: new Date()
      }

      await this.wsManager.broadcastAlert(alert)
      await redis.setex(alertKey, 86400, 'sent') // Don't repeat for 24 hours
    }
  }

  private async checkScheduledMaintenance(machine: any) {
    // Check if scheduled maintenance is due
    const nextMaintenance = await redis.get(`schedule:maintenance:${machine.id}`)
    if (!nextMaintenance) return

    const maintenanceDate = new Date(nextMaintenance)
    const daysBefore = 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds
    
    if (Date.now() > maintenanceDate.getTime() - daysBefore) {
      const alertKey = `maintenance:scheduled:${machine.id}`
      const recentAlert = await redis.get(alertKey)
      if (recentAlert) return

      const alert: AlertUpdate = {
        id: `scheduled_${machine.id}_${Date.now()}`,
        type: 'machine',
        severity: 'medium',
        title: `Scheduled Maintenance Due: ${machine.name}`,
        message: `Scheduled maintenance is due on ${maintenanceDate.toLocaleDateString()}`,
        machineId: machine.id,
        timestamp: new Date()
      }

      await this.wsManager.broadcastAlert(alert)
      await redis.setex(alertKey, 86400, 'sent')
    }
  }

  private async detectAnomalies() {
    // Detect anomalous machine behavior
    for (const [machineId, status] of this.machineStatusCache) {
      const performance = this.performanceCache.get(machineId)
      if (!performance) continue

      // Detect sudden performance drops
      if (status.performance < 50 && status.status === 'running') {
        await this.createAnomalyAlert(machineId, 'performance', `Sudden performance drop to ${Math.round(status.performance)}%`)
      }

      // Detect unusual cycle times
      if (performance.averageCycleTime > 0) {
        const expectedCycleTime = await this.getExpectedCycleTime(machineId)
        if (performance.averageCycleTime > expectedCycleTime * 1.5) {
          await this.createAnomalyAlert(machineId, 'cycle_time', `Cycle time increased to ${Math.round(performance.averageCycleTime)} minutes`)
        }
      }
    }
  }

  private async getExpectedCycleTime(machineId: string): Promise<number> {
    // Get historical average cycle time
    const cacheKey = `expected_cycle_time:${machineId}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      return parseFloat(cached)
    }

    // Calculate from historical data and cache
    const avgTime = await this.getAverageCycleTime(machineId)
    await redis.setex(cacheKey, 3600, avgTime.toString())
    
    return avgTime || 10 // Default 10 minutes
  }

  private async createAnomalyAlert(machineId: string, type: string, message: string) {
    const alertKey = `anomaly:${type}:${machineId}`
    const recentAlert = await redis.get(alertKey)
    if (recentAlert) return

    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    })

    if (!machine) return

    const alert: AlertUpdate = {
      id: `anomaly_${machineId}_${Date.now()}`,
      type: 'machine',
      severity: 'high',
      title: `Anomaly Detected: ${machine.name}`,
      message,
      machineId,
      timestamp: new Date()
    }

    await this.wsManager.broadcastAlert(alert)
    await redis.setex(alertKey, 3600, 'sent') // Don't repeat for 1 hour
  }

  // Public API methods
  async getMachineStatus(machineId: string): Promise<MachineStatus | null> {
    return this.machineStatusCache.get(machineId) || null
  }

  async getAllMachineStatuses(): Promise<MachineStatus[]> {
    return Array.from(this.machineStatusCache.values())
  }

  async getMachinePerformance(machineId: string): Promise<MachinePerformanceMetrics | null> {
    try {
      const cached = await redis.get(`machine:performance:${machineId}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting machine performance:', error)
      return null
    }
  }

  // Manual control methods
  async setMachineStatus(machineId: string, status: 'maintenance' | 'error' | 'running' | 'idle') {
    await redis.set(`manual_status:${machineId}`, status)
    
    // Force immediate update
    await this.updateMachineStatus()
  }

  async setMachineOperator(machineId: string, operatorId: string) {
    await redis.set(`operator:${machineId}`, operatorId)
  }

  async scheduleMaintenence(machineId: string, date: Date) {
    await redis.set(`schedule:maintenance:${machineId}`, date.toISOString())
  }
}

export default MachineMonitor