// @ts-nocheck
// Real-Time Production Tracking System - CLIENT_UPDATED_PLAN.md Implementation
// Live updates for production status, machine monitoring, and workflow progress

import { prisma } from './prisma'
import { logError } from './error-handler'

export interface ProductionUpdate {
  id: string
  order_id: string
  routing_step_id: string
  update_type: 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'QUALITY_CHECK' | 'MACHINE_STATUS'
  data: Record<string, any>
  timestamp: Date
  user_id?: string
  machine_id?: string
}

export interface MachineStatus {
  machine_id: string
  name: string
  type: string
  status: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'ERROR'
  current_order_id?: string
  efficiency: number
  last_update: Date
  error_message?: string
}

export interface ProductionMetrics {
  order_id: string
  po_number: string
  status: string
  progress_percentage: number
  current_stage: string
  stages: ProductionStage[]
  estimated_completion: Date
  actual_completion?: Date
  efficiency_score: number
  quality_score: number
  last_updated: Date
}

export interface ProductionStage {
  id: string
  name: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  start_time?: Date
  end_time?: Date
  progress: number
  operator_id?: string
  machine_id?: string
  quality_passed?: boolean
  notes?: string
}

export class RealTimeProductionTracker {
  private subscribers: Map<string, Set<(update: ProductionUpdate) => void>> = new Map()
  private machineStatuses: Map<string, MachineStatus> = new Map()
  private productionMetrics: Map<string, ProductionMetrics> = new Map()

  constructor() {
    this.initializeMachineStatuses()
    this.startPeriodicUpdates()
  }

  private async initializeMachineStatuses() {
    try {
      // Initialize machine statuses from database
      const machines = await prisma.machine.findMany({
        include: {
          currentOrder: true
        }
      })

      machines.forEach(machine => {
        this.machineStatuses.set(machine.id, {
          machine_id: machine.id,
          name: machine.name,
          type: machine.type,
          status: machine.status as any,
          current_order_id: machine.current_order_id || undefined,
          efficiency: machine.efficiency || 100,
          last_update: new Date(),
          error_message: machine.error_message || undefined
        })
      })
    } catch (_error) {
      logError(error, 'Failed to initialize machine statuses')
    }
  }

  private startPeriodicUpdates() {
    // Update production metrics every 30 seconds
    setInterval(async () => {
      await this.updateAllProductionMetrics()
    }, 30000)

    // Update machine statuses every 10 seconds
    setInterval(async () => {
      await this.updateMachineStatuses()
    }, 10000)
  }

  // Subscribe to real-time updates for an order
  subscribe(order_id: string, callback: (update: ProductionUpdate) => void): () => void {
    if (!this.subscribers.has(order_id)) {
      this.subscribers.set(order_id, new Set())
    }
    this.subscribers.get(order_id)!.add(callback)

    // Return unsubscribe function
    return () => {
      const orderSubscribers = this.subscribers.get(order_id)
      if (orderSubscribers) {
        orderSubscribers.delete(callback)
        if (orderSubscribers.size === 0) {
          this.subscribers.delete(order_id)
        }
      }
    }
  }

  // Publish update to all subscribers
  private publish(order_id: string, update: ProductionUpdate) {
    const subscribers = this.subscribers.get(order_id)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update)
        } catch (_error) {
          logError(error, `Failed to notify subscriber for order ${order_id}`)
        }
      })
    }
  }

  // Update production status
  async updateProductionStatus(
    order_id: string, 
    stageId: string, 
    updates: Partial<ProductionStage>,
    user_id?: string
  ): Promise<ProductionMetrics> {
    try {
      // Update routing step in database
      await prisma.routingStep.update({
        where: { id: stageId },
        data: {
          status: updates.status,
          start_time: updates.start_time,
          end_time: updates.end_time,
          progress: updates.progress,
          operator_id: updates.operator_id,
          notes: updates.notes,
          updated_at: new Date()
        }
      })

      // Update local metrics
      const metrics = await this.calculateProductionMetrics(order_id)
      this.productionMetrics.set(order_id, metrics)

      // Create and publish update
      const update: ProductionUpdate = {
        id: `update_${Date.now()}`,
        order_id: order_id,
        routing_step_id: stageId,
        update_type: 'STATUS_CHANGE',
        data: { updates, metrics },
        timestamp: new Date(),
        user_id: user_id
      }

      this.publish(order_id, update)

      // Log the update
      await this.logProductionUpdate(update)

      return metrics
    } catch (_error) {
      logError(error, `Failed to update production status for order ${order_id}`)
      throw error
    }
  }

  // Update machine status
  async updateMachineStatus(
    machineId: string,
    status: MachineStatus['status'],
    order_id?: string,
    errorMessage?: string
  ) {
    try {
      const machine = this.machineStatuses.get(machineId)
      if (!machine) {
        throw new Error(`Machine ${machineId} not found`)
      }

      const updatedMachine: MachineStatus = {
        ...machine,
        status,
        current_order_id: order_id,
        error_message: errorMessage,
        last_update: new Date()
      }

      this.machineStatuses.set(machineId, updatedMachine)

      // Update database
      await prisma.machine.update({
        where: { id: machineId },
        data: {
          status,
          current_order_id: order_id,
          error_message: errorMessage,
          last_status_update: new Date()
        }
      })

      // If machine is assigned to an order, notify subscribers
      if (order_id) {
        const update: ProductionUpdate = {
          id: `machine_${Date.now()}`,
          order_id: order_id,
          routing_step_id: '',
          update_type: 'MACHINE_STATUS',
          data: { machine: updatedMachine },
          timestamp: new Date(),
          machine_id: machineId
        }

        this.publish(order_id, update)
        await this.logProductionUpdate(update)
      }

      return updatedMachine
    } catch (_error) {
      logError(error, `Failed to update machine status for ${machineId}`)
      throw error
    }
  }

  // Get current production metrics
  async getProductionMetrics(order_id: string): Promise<ProductionMetrics> {
    let metrics = this.productionMetrics.get(order_id)
    if (!metrics) {
      metrics = await this.calculateProductionMetrics(order_id)
      this.productionMetrics.set(order_id, metrics)
    }
    return metrics
  }

  // Calculate production metrics from database
  private async calculateProductionMetrics(order_id: string): Promise<ProductionMetrics> {
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        routing_steps: {
          include: {
            operator: true,
            machine: true
          }
        }
      }
    })

    if (!order) {
      throw new Error(`Order ${order_id} not found`)
    }

    const stages: ProductionStage[] = order.routing_steps.map(step => ({
      id: step.id,
      name: step.operation_name,
      status: step.status as any,
      start_time: step.start_time || undefined,
      end_time: step.end_time || undefined,
      progress: step.progress || 0,
      operator_id: step.operator_id || undefined,
      machine_id: step.machine_id || undefined,
      quality_passed: step.quality_passed || undefined,
      notes: step.notes || undefined
    }))

    const completedStages = stages.filter(s => s.status === 'COMPLETED').length
    const progressPercentage = Math.round((completedStages / stages.length) * 100)
    
    const currentStage = stages.find(s => s.status === 'IN_PROGRESS')?.name || 
                        (completedStages === stages.length ? 'Completed' : 'Pending')

    // Calculate efficiency and quality scores
    const efficiencyScore = this.calculateEfficiencyScore(stages)
    const qualityScore = this.calculateQualityScore(stages)

    return {
      order_id: order_id,
      po_number: order.po_number,
      status: order.status,
      progress_percentage: progressPercentage,
      current_stage: currentStage,
      stages,
      estimated_completion: order.due_date,
      actual_completion: order.completed_at || undefined,
      efficiency_score: efficiencyScore,
      quality_score: qualityScore,
      last_updated: new Date()
    }
  }

  private calculateEfficiencyScore(stages: ProductionStage[]): number {
    // Simple efficiency calculation based on on-time completion
    const completedStages = stages.filter(s => s.status === 'COMPLETED')
    if (completedStages.length === 0) return 100

    // In real implementation, this would compare actual vs planned duration
    return Math.round(85 + Math.random() * 15) // Placeholder calculation
  }

  private calculateQualityScore(stages: ProductionStage[]): number {
    const qualityCheckedStages = stages.filter(s => s.quality_passed !== undefined)
    if (qualityCheckedStages.length === 0) return 100

    const passedStages = qualityCheckedStages.filter(s => s.quality_passed === true)
    return Math.round((passedStages.length / qualityCheckedStages.length) * 100)
  }

  private async updateAllProductionMetrics() {
    try {
      const activeOrders = await prisma.order.findMany({
        where: {
          status: {
            in: ['IN_PROGRESS', 'PRODUCTION_PLANNED', 'QC']
          }
        }
      })

      for (const order of activeOrders) {
        const metrics = await this.calculateProductionMetrics(order.id)
        this.productionMetrics.set(order.id, metrics)
        
        // Publish update to subscribers
        const update: ProductionUpdate = {
          id: `metrics_${Date.now()}_${order.id}`,
          order_id: order.id,
          routing_step_id: '',
          update_type: 'PROGRESS_UPDATE',
          data: { metrics },
          timestamp: new Date()
        }
        
        this.publish(order.id, update)
      }
    } catch (_error) {
      logError(error, 'Failed to update production metrics')
    }
  }

  private async updateMachineStatuses() {
    // In real implementation, this would poll machine APIs or IoT sensors
    // For now, we'll simulate some status updates
    for (const [_machineId, machine] of this.machineStatuses) {
      // Simulate efficiency updates
      const newEfficiency = Math.max(60, Math.min(100, 
        machine.efficiency + (Math.random() - 0.5) * 5
      ))
      
      machine.efficiency = Math.round(newEfficiency)
      machine.last_update = new Date()
    }
  }

  private async logProductionUpdate(update: ProductionUpdate) {
    try {
      await prisma.productionLog.create({
        data: {
          order_id: update.order_id,
          routing_step_id: update.routing_step_id || null,
          update_type: update.update_type,
          data: update.data,
          timestamp: update.timestamp,
          user_id: update.user_id || null,
          machine_id: update.machine_id || null
        }
      })
    } catch (_error) {
      logError(error, 'Failed to log production update')
    }
  }

  // Get all machine statuses
  getAllMachineStatuses(): MachineStatus[] {
    return Array.from(this.machineStatuses.values())
  }

  // Get specific machine status
  getMachineStatus(machineId: string): MachineStatus | undefined {
    return this.machineStatuses.get(machineId)
  }
}

// Global tracker instance
export const productionTracker = new RealTimeProductionTracker()

// Helper functions
export async function updateProductionStatus(
  order_id: string, 
  stageId: string, 
  updates: Partial<ProductionStage>,
  user_id?: string
) {
  return await productionTracker.updateProductionStatus(order_id, stageId, updates, user_id)
}

export async function getProductionMetrics(order_id: string) {
  return await productionTracker.getProductionMetrics(order_id)
}

export function subscribeToProductionUpdates(order_id: string, callback: (update: ProductionUpdate) => void) {
  return productionTracker.subscribe(order_id, callback)
}