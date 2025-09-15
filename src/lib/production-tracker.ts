// 🎖️ REAL-TIME PRODUCTION TRACKING SYSTEM
// Commander Protocol: Live production monitoring and machine telemetry
// Neural ERP - ASH AI Production Intelligence Engine

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

// Production Stage Status Types
export type ProductionStageStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'DELAYED'
  | 'BLOCKED';

export type ProductionStage =
  | 'CUTTING'
  | 'PRINTING'
  | 'SEWING'
  | 'QUALITY_CONTROL'
  | 'FINISHING'
  | 'PACKING';

// Real-time Production Event Types
export interface ProductionEvent {
  id: string;
  order_id: string;
  stage: ProductionStage;
  status: ProductionStageStatus;
  machine_id?: string;
  operator_id: string;
  pieces_completed: number;
  pieces_total: number;
  start_time: Date;
  end_time?: Date;
  efficiency_score: number;
  quality_score: number;
  notes?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

// Machine Telemetry Data
export interface MachineMetrics {
  machine_id: string;
  workspace_id?: string;
  machine_type: string;
  status: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'ERROR' | 'OFFLINE';
  current_order_id?: string;
  current_stage?: ProductionStage;
  operator_id?: string;
  efficiency: number;
  uptime_hours: number;
  pieces_per_hour: number;
  power_consumption: number;
  temperature?: number;
  vibration_level?: number;
  last_maintenance: Date;
  next_maintenance: Date;
  error_count: number;
  total_pieces_today: number;
  timestamp: Date;
}

// Production Line Analytics
export interface ProductionLineMetrics {
  line_id: string;
  line_name: string;
  stage: ProductionStage;
  active_orders: number;
  total_operators: number;
  active_operators: number;
  machines_running: number;
  machines_total: number;
  efficiency_average: number;
  pieces_per_hour: number;
  quality_score: number;
  bottleneck_stage?: ProductionStage;
  estimated_completion: Date;
  timestamp: Date;
}

class ProductionTracker {
  private static instance: ProductionTracker;
  private eventListeners: Map<string, Function[]> = new Map();
  private activeTracking: Map<string, ProductionEvent> = new Map();

  static getInstance(): ProductionTracker {
    if (!ProductionTracker.instance) {
      ProductionTracker.instance = new ProductionTracker();
    }
    return ProductionTracker.instance;
  }

  // Real-time Production Event Tracking
  async startProductionStage(data: {
    order_id: string;
    stage: ProductionStage;
    operator_id: string;
    machine_id?: string;
    pieces_total: number;
    metadata?: Record<string, any>;
  }): Promise<ProductionEvent> {
    const event: ProductionEvent = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order_id: data.order_id,
      stage: data.stage,
      status: 'IN_PROGRESS',
      operator_id: data.operator_id,
      machine_id: data.machine_id,
      pieces_completed: 0,
      pieces_total: data.pieces_total,
      start_time: new Date(),
      efficiency_score: 0,
      quality_score: 100,
      metadata: data.metadata || {},
      timestamp: new Date()
    };

    // Store in active tracking
    this.activeTracking.set(event.id, event);

    // Update database
    await this.updateProductionStageInDB(event);

    // Emit real-time event
    this.emitEvent('production_started', event);

    console.log(`🎖️ [PRODUCTION TRACKER] Started ${event.stage} for Order ${event.order_id}`);
    return event;
  }

  // Update Production Progress
  async updateProductionProgress(event_id: string, data: {
    pieces_completed?: number;
    status?: ProductionStageStatus;
    efficiency_score?: number;
    quality_score?: number;
    notes?: string;
    metadata?: Record<string, any>;
  }): Promise<ProductionEvent | null> {
    const event = this.activeTracking.get(event_id);
    if (!event) {
      console.error(`🚨 [PRODUCTION TRACKER] Event ${event_id} not found`);
      return null;
    }

    // Update event data
    if (data.pieces_completed !== undefined) event.pieces_completed = data.pieces_completed;
    if (data.status) event.status = data.status;
    if (data.efficiency_score !== undefined) event.efficiency_score = data.efficiency_score;
    if (data.quality_score !== undefined) event.quality_score = data.quality_score;
    if (data.notes) event.notes = data.notes;
    if (data.metadata) event.metadata = { ...event.metadata, ...data.metadata };

    event.timestamp = new Date();

    // Mark as completed if finished
    if (data.status === 'COMPLETED' || event.pieces_completed >= event.pieces_total) {
      event.status = 'COMPLETED';
      event.end_time = new Date();
      this.activeTracking.delete(event_id);
    }

    // Update database
    await this.updateProductionStageInDB(event);

    // Emit real-time event
    this.emitEvent('production_updated', event);

    console.log(`🎖️ [PRODUCTION TRACKER] Updated ${event.stage} progress: ${event.pieces_completed}/${event.pieces_total}`);
    return event;
  }

  // Machine Telemetry Tracking
  async updateMachineMetrics(metrics: Partial<MachineMetrics> & { machine_id: string }): Promise<MachineMetrics> {
    const fullMetrics: MachineMetrics = {
      machine_type: 'GENERIC',
      status: 'IDLE',
      efficiency: 0,
      uptime_hours: 0,
      pieces_per_hour: 0,
      power_consumption: 0,
      last_maintenance: new Date(),
      next_maintenance: new Date(),
      error_count: 0,
      total_pieces_today: 0,
      timestamp: new Date(),
      workspace_id: 'default',
      ...metrics
    };

    // Store in database
    await prisma.machineMetrics.upsert({
      where: {
        workspace_id_machine_id: {
          workspace_id: fullMetrics.workspace_id || 'default',
          machine_id: metrics.machine_id
        }
      },
      create: {
        workspace_id: fullMetrics.workspace_id || 'default',
        machine_id: fullMetrics.machine_id,
        machine_type: fullMetrics.machine_type,
        status: fullMetrics.status,
        efficiency: fullMetrics.efficiency,
        uptime_hours: fullMetrics.uptime_hours,
        pieces_per_hour: fullMetrics.pieces_per_hour,
        power_consumption: fullMetrics.power_consumption,
        temperature: fullMetrics.temperature,
        vibration_level: fullMetrics.vibration_level,
        error_count: fullMetrics.error_count,
        total_pieces_today: fullMetrics.total_pieces_today,
        last_maintenance: fullMetrics.last_maintenance,
        next_maintenance: fullMetrics.next_maintenance,
        current_order_id: fullMetrics.current_order_id,
        current_stage: fullMetrics.current_stage,
        operator_id: fullMetrics.operator_id,
        timestamp: fullMetrics.timestamp
      },
      update: {
        machine_type: fullMetrics.machine_type,
        status: fullMetrics.status,
        efficiency: fullMetrics.efficiency,
        uptime_hours: fullMetrics.uptime_hours,
        pieces_per_hour: fullMetrics.pieces_per_hour,
        power_consumption: fullMetrics.power_consumption,
        temperature: fullMetrics.temperature,
        vibration_level: fullMetrics.vibration_level,
        error_count: fullMetrics.error_count,
        total_pieces_today: fullMetrics.total_pieces_today,
        current_order_id: fullMetrics.current_order_id,
        current_stage: fullMetrics.current_stage,
        operator_id: fullMetrics.operator_id,
        timestamp: fullMetrics.timestamp
      }
    });

    // Emit real-time event
    this.emitEvent('machine_updated', fullMetrics);

    return fullMetrics;
  }

  // Production Line Analytics
  async getProductionLineMetrics(line_id: string): Promise<ProductionLineMetrics | null> {
    try {
      // Get active production stages for this line
      const activeStages = await prisma.productionStage.findMany({
        where: {
          production_line_id: line_id,
          status: {
            in: ['NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'QUALITY_CHECK']
          }
        },
        include: {
          order: true
        }
      });

      // Get machine metrics for this line
      const machines = await prisma.machineMetrics.findMany({
        where: {
          machine_id: {
            startsWith: line_id // Assuming machine IDs are prefixed with line ID
          }
        }
      });

      // Calculate metrics
      const activeOrders = new Set(activeStages.map(stage => stage.order_id)).size;
      const totalOperators = new Set(activeStages.map(stage => stage.assigned_to)).size;
      const activeOperators = activeStages.filter(stage => stage.status === 'IN_PROGRESS').length;
      const machinesRunning = machines.filter(m => m.status === 'RUNNING').length;
      const machinesTotal = machines.length;
      const efficiencyAverage = machines.reduce((sum, m) => sum + m.efficiency, 0) / Math.max(machines.length, 1);
      const piecesPerHour = machines.reduce((sum, m) => sum + m.pieces_per_hour, 0);

      // Identify bottleneck
      const stageCounts = activeStages.reduce((acc, stage) => {
        acc[stage.stage] = (acc[stage.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bottleneckStage = Object.entries(stageCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as ProductionStage;

      const metrics: ProductionLineMetrics = {
        line_id,
        line_name: `Production Line ${line_id}`,
        stage: 'SEWING', // Default or determined by line configuration
        active_orders: activeOrders,
        total_operators: totalOperators,
        active_operators: activeOperators,
        machines_running: machinesRunning,
        machines_total: machinesTotal,
        efficiency_average: efficiencyAverage,
        pieces_per_hour: piecesPerHour,
        quality_score: 95, // Calculate from recent QC data
        bottleneck_stage: bottleneckStage,
        estimated_completion: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        timestamp: new Date()
      };

      return metrics;
    } catch (error) {
      console.error('🚨 [PRODUCTION TRACKER] Error getting line metrics:', error);
      return null;
    }
  }

  // Real-time Dashboard Data
  async getDashboardData() {
    const [
      activeOrders,
      machineMetrics,
      recentEvents
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: {
            in: ['IN_PRODUCTION', 'CUTTING', 'PRINTING', 'SEWING', 'QUALITY_CHECK']
          }
        },
        include: {
          production_stages: {
            where: {
              status: {
                not: 'COMPLETED'
              }
            }
          }
        }
      }),
      prisma.machineMetrics.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50
      }),
      this.getRecentProductionEvents(24) // Last 24 hours
    ]);

    return {
      summary: {
        active_orders: activeOrders.length,
        machines_running: machineMetrics.filter(m => m.status === 'RUNNING').length,
        total_machines: machineMetrics.length,
        average_efficiency: machineMetrics.reduce((sum, m) => sum + m.efficiency, 0) / Math.max(machineMetrics.length, 1),
        pieces_completed_today: machineMetrics.reduce((sum, m) => sum + m.total_pieces_today, 0)
      },
      active_orders: activeOrders,
      machine_metrics: machineMetrics,
      recent_events: recentEvents,
      timestamp: new Date()
    };
  }

  // Event System
  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emitEvent(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`🚨 [PRODUCTION TRACKER] Event listener error:`, error);
      }
    });
  }

  // Database Operations
  private async updateProductionStageInDB(event: ProductionEvent) {
    try {
      await prisma.productionStage.upsert({
        where: {
          order_id_stage_name: {
            order_id: event.order_id,
            stage_name: event.stage
          }
        },
        create: {
          workspace_id: 'default',
          order_id: event.order_id,
          stage_name: event.stage,
          stage: event.stage,
          status: event.status,
          assigned_to: event.operator_id,
          machine_id: event.machine_id,
          pieces_completed: event.pieces_completed,
          pieces_total: event.pieces_total,
          start_time: event.start_time,
          started_at: event.start_time,
          end_time: event.end_time,
          completed_at: event.end_time,
          efficiency_score: event.efficiency_score,
          quality_score: event.quality_score,
          notes: event.notes
        },
        update: {
          status: event.status,
          pieces_completed: event.pieces_completed,
          start_time: event.start_time,
          started_at: event.start_time,
          end_time: event.end_time,
          completed_at: event.end_time,
          efficiency_score: event.efficiency_score,
          quality_score: event.quality_score,
          notes: event.notes
        }
      });
    } catch (error) {
      console.error('🚨 [PRODUCTION TRACKER] Database update error:', error);
    }
  }

  private async getRecentProductionEvents(hours: number): Promise<ProductionEvent[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stages = await prisma.productionStage.findMany({
      where: {
        OR: [
          { start_time: { gte: since } },
          { end_time: { gte: since } }
        ]
      },
      orderBy: { start_time: 'desc' },
      take: 100
    });

    return stages.map(stage => ({
      id: `prod_${stage.id}`,
      order_id: stage.order_id,
      stage: stage.stage as ProductionStage,
      status: stage.status as ProductionStageStatus,
      machine_id: stage.machine_id || undefined,
      operator_id: stage.assigned_to,
      pieces_completed: stage.pieces_completed || 0,
      pieces_total: stage.pieces_total || 0,
      start_time: stage.start_time,
      end_time: stage.end_time || undefined,
      efficiency_score: stage.efficiency_score || 0,
      quality_score: stage.quality_score || 100,
      notes: stage.notes || undefined,
      metadata: {},
      timestamp: stage.start_time
    }));
  }
}

// Export singleton instance
export const productionTracker = ProductionTracker.getInstance();

// Utility Functions
export const ProductionUtils = {
  calculateEfficiency(startTime: Date, endTime: Date, piecesCompleted: number, expectedPiecesPerHour: number): number {
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const expectedPieces = hoursWorked * expectedPiecesPerHour;
    return Math.min(100, (piecesCompleted / expectedPieces) * 100);
  },

  getStageSequence(): ProductionStage[] {
    return ['CUTTING', 'PRINTING', 'SEWING', 'QUALITY_CONTROL', 'FINISHING', 'PACKING'];
  },

  getNextStage(currentStage: ProductionStage): ProductionStage | null {
    const sequence = this.getStageSequence();
    const currentIndex = sequence.indexOf(currentStage);
    return currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
  },

  formatDuration(startTime: Date, endTime?: Date): string {
    const end = endTime || new Date();
    const diffMs = end.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
};

console.log('🎖️ [PRODUCTION TRACKER] Real-time production tracking system initialized');