import { prisma } from '@/lib/db'
import { transitionOrderStatus } from './order-state-machine'

export interface AshEvent {
  eventType: string
  entityType: string
  entityId: string
  payload: Record<string, any>
}

export interface SystemEvent {
  id: string
  event_type: string
  entity_type: string
  entity_id: string
  data: any
  status: 'OPEN' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  retry_count?: number
  created_at: Date
  processed_at?: Date
  error_message?: string
}

export class AshEventBus {
  private static handlers: Map<string, Array<(payload: any) => Promise<void>>> = new Map()
  private static isProcessing = false

  /**
   * Register event handler for specific event type
   */
  static on(eventType: string, handler: (payload: any) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }

  /**
   * Emit an ASH AI event to the event bus
   */
  static async emit(eventType: string, payload: Record<string, any>): Promise<void> {
    try {
      // Extract entity info from payload or event type
      const { entityId, entityType = eventType.split('.')[1] } = payload
      
      // Store in database for persistence and audit
      await prisma.systemEvent.create({
        data: {
          id: require('nanoid').nanoid(),
          event_type: eventType,
          entity_type: entityType || 'system',
          entity_id: entityId || 'system',
          data: payload,
          status: 'OPEN',
          created_at: new Date()
        }
      })

      // For real-time processing, trigger immediate handlers
      await AshEventBus.processEvent(eventType, payload)

    } catch (_error) {
      console.error('Error emitting ASH event:', _error)
    }
  }

  /**
   * Process an event immediately (real-time handlers)
   */
  private static async processEvent(eventType: string, payload: Record<string, any>): Promise<void> {
    try {
      // Execute registered handlers
      const handlers = this.handlers.get(eventType) || []
      for (const handler of handlers) {
        await handler(payload)
      }

      // Execute default built-in handlers
      switch (eventType) {
        case 'ash.po.created':
        case 'ash.order.created':
          await AshEventBus.handleOrderCreated(payload)
          break
        case 'ash.design.uploaded':
          await AshEventBus.handleDesignUploaded(payload)
          break
        case 'ash.design.approved':
          await AshEventBus.handleDesignApproved(payload)
          break
        case 'ash.fabric.issued':
          await AshEventBus.handleFabricIssued(payload)
          break
        case 'ash.cutting.lay_planned':
          await AshEventBus.handleLayPlanned(payload)
          break
        case 'ash.cutting.bundle_updated':
          await AshEventBus.handleBundleUpdated(payload)
          break
        case 'ash.qc.inspection_completed':
          await AshEventBus.handleQCCompleted(payload)
          break
        case 'ash.routing.applied':
        case 'ash.routing.customized':
          await AshEventBus.handleRoutingChanged(payload)
          break
        case 'ash.order.status_changed':
          await AshEventBus.handleOrderStatusChanged(payload)
          break
        default:
          // Log unhandled events for monitoring
          console.log(`Unhandled ASH event: ${eventType}`)
      }
    } catch (_error) {
      console.error(`Error processing event ${eventType}:`, _error)
    }
  }

  /**
   * Handler for order creation
   */
  private static async handleOrderCreated(payload: any): Promise<void> {
    const { order_id, poNumber, method, brand_id, actorId } = payload

    // Update order status progression
    await prisma.order.update({
      where: { id: order_id },
      data: { status: 'CONFIRMED' }
    })

    // Create AI insight for order tracking
    await prisma.aIInsight.create({
      data: {
        type: 'FORECAST',
        title: `New ${method} Order Created`,
        description: `Order ${poNumber} created and routing established. Monitor for capacity constraints.`,
        priority: 'MEDIUM',
        data: { order_id, method, brand_id }
      }
    })

    console.log(`ASH: Order ${poNumber} created and workflow initiated`)
  }

  /**
   * Handler for design upload
   */
  private static async handleDesignUploaded(payload: any): Promise<void> {
    const { asset_id, order_id, design_type, uploaded_by } = payload

    console.log(`ASH: Design uploaded for order ${order_id} - ${design_type}`)

    // Create AI insight for design review
    await prisma.aIInsight.create({
      data: {
        id: require('nanoid').nanoid(),
        type: 'REVIEW_REQUIRED',
        title: 'New Design Uploaded - Review Required',
        description: `${design_type} design uploaded and requires client approval before production.`,
        priority: 'HIGH',
        data: { order_id, asset_id, design_type, uploaded_by }
      }
    })

    // Emit notification event
    await AshEventBus.emit('ash.notification.client_design_ready', {
      entityType: 'design_asset',
      entityId: asset_id,
      order_id,
      client_notification: true
    })
  }

  /**
   * Handler for design approval
   */
  private static async handleDesignApproved(payload: any): Promise<void> {
    const { order_id, assetId, version, approved_by } = payload

    try {
      // Transition order status using state machine
      await transitionOrderStatus(order_id, 'APPROVE_DESIGN', {
        actor_id: approved_by,
        reason: 'Design approved by client',
        metadata: { asset_id: assetId, version }
      })

      console.log(`ASH: Design approved for order ${order_id}, production can begin`)

      // Emit fabric readiness check
      await AshEventBus.emit('ash.production.ready_for_fabric_issue', {
        entityType: 'order',
        entityId: order_id,
        order_id: order_id
      })

    } catch (_error) {
      console.error('Error processing design approval:', _error)
    }
  }

  /**
   * Handler for fabric issue
   */
  private static async handleFabricIssued(payload: any): Promise<void> {
    const { issue_id, order_id, total_meters, batch_count } = payload

    console.log(`ASH: Fabric issued for order ${order_id} - ${total_meters}m in ${batch_count} batches`)

    // Create AI insight for lay planning optimization
    await prisma.aIInsight.create({
      data: {
        id: require('nanoid').nanoid(),
        type: 'OPTIMIZATION',
        title: 'Lay Planning Optimization Available',
        description: `Fabric issued. Ashley AI can optimize lay planning for maximum efficiency.`,
        priority: 'MEDIUM',
        data: { order_id, issue_id, total_meters, batch_count }
      }
    })

    // Trigger lay planning readiness
    await AshEventBus.emit('ash.cutting.ready_for_lay_planning', {
      entityType: 'fabric_issue',
      entityId: issue_id,
      order_id,
      total_meters
    })
  }

  /**
   * Handler for lay planning
   */
  private static async handleLayPlanned(payload: any): Promise<void> {
    const { lay_plan_id, order_id, efficiency, total_pieces } = payload

    console.log(`ASH: Lay plan created for order ${order_id} - ${efficiency}% efficiency, ${total_pieces} pieces`)

    // Update order progress
    await prisma.order.update({
      where: { id: order_id },
      data: {
        progress_percentage: 25, // Cutting stage is 25% of production
        current_milestone: 'LAY_PLANNED',
        last_milestone_at: new Date()
      }
    })

    // Create efficiency insight
    if (efficiency < 0.8) {
      await prisma.aIInsight.create({
        data: {
          id: require('nanoid').nanoid(),
          type: 'WARNING',
          title: 'Low Lay Efficiency Detected',
          description: `Lay plan efficiency is ${(efficiency * 100).toFixed(1)}%. Consider optimization.`,
          priority: 'MEDIUM',
          data: { order_id, lay_plan_id, efficiency }
        }
      })
    }

    // Trigger cutting readiness
    await AshEventBus.emit('ash.cutting.ready_for_cutting', {
      entityType: 'lay_plan',
      entityId: lay_plan_id,
      order_id,
      efficiency
    })
  }

  /**
   * Handler for bundle updates
   */
  private static async handleBundleUpdated(payload: any): Promise<void> {
    const { bundle_id, bundle_number, old_status, new_status, operator_id } = payload

    console.log(`ASH: Bundle ${bundle_number} status: ${old_status} → ${new_status}`)

    // Check if bundle completion triggers stage completion
    if (new_status === 'COMPLETED') {
      await AshEventBus.checkStageCompletion('CUTTING', payload)
    }

    // Update productivity metrics
    await AshEventBus.updateProductivityMetrics('CUTTING', operator_id, new_status)
  }

  /**
   * Handler for QC completion
   */
  private static async handleQCCompleted(payload: any): Promise<void> {
    const { inspection_id, order_id, pass_rate, defect_count, inspector_id } = payload

    console.log(`ASH: QC completed for order ${order_id} - ${pass_rate}% pass rate, ${defect_count} defects`)

    // Update order progress based on QC results
    const progressPercentage = pass_rate >= 95 ? 85 : 75 // High pass rate means closer to completion
    
    await prisma.order.update({
      where: { id: order_id },
      data: {
        progress_percentage: progressPercentage,
        current_milestone: pass_rate >= 95 ? 'QC_PASSED' : 'QC_REWORK_REQUIRED',
        last_milestone_at: new Date()
      }
    })

    // Create quality insights
    if (pass_rate < 90) {
      await prisma.aIInsight.create({
        data: {
          id: require('nanoid').nanoid(),
          type: 'QUALITY_ALERT',
          title: 'Quality Issue Detected',
          description: `Pass rate of ${pass_rate.toFixed(1)}% is below standard. Review required.`,
          priority: 'HIGH',
          data: { order_id, inspection_id, pass_rate, defect_count }
        }
      })
    }

    // Trigger next stage based on results
    if (pass_rate >= 95) {
      await AshEventBus.emit('ash.packing.ready_for_packing', {
        entityType: 'quality_inspection',
        entityId: inspection_id,
        order_id,
        pass_rate
      })
    } else {
      await AshEventBus.emit('ash.rework.required', {
        entityType: 'quality_inspection',
        entityId: inspection_id,
        order_id,
        defect_count
      })
    }
  }

  /**
   * Handler for order status changes
   */
  private static async handleOrderStatusChanged(payload: any): Promise<void> {
    const { order_id, old_status, new_status, actor_id } = payload

    console.log(`ASH: Order ${order_id} status: ${old_status} → ${new_status}`)

    // Create timeline entry
    await prisma.orderTimeline.create({
      data: {
        id: require('nanoid').nanoid(),
        order_id,
        event_type: 'STATUS_CHANGE',
        title: `Status Changed to ${new_status}`,
        description: `Order status transitioned from ${old_status} to ${new_status}`,
        actor_id,
        metadata: { old_status, new_status }
      }
    })

    // Emit client notification if significant milestone
    const significantStatuses = ['DESIGN_APPROVAL', 'IN_PROGRESS', 'QC', 'READY_FOR_DELIVERY', 'DELIVERED']
    if (significantStatuses.includes(new_status)) {
      await AshEventBus.emit('ash.notification.order_status_update', {
        entityType: 'order',
        entityId: order_id,
        order_id,
        status: new_status,
        client_notification: true
      })
    }
  }

  /**
   * Handler for routing changes
   */
  private static async handleRoutingChanged(payload: any): Promise<void> {
    const { order_id, actorId } = payload

    // Run Ashley capacity re-analysis
    // This would trigger Ashley AI to re-evaluate capacity constraints
    console.log(`ASH: Routing changed for order ${order_id}, re-analyzing capacity`)

    // Create AI insight for management
    await prisma.aIInsight.create({
      data: {
        type: 'ASSIGNMENT',
        title: 'Routing Changed - Review Required',
        description: `Production routing was modified. Review capacity impact and task assignments.`,
        priority: 'HIGH',
        data: { order_id, changedBy: actorId }
      }
    })
  }

  /**
   * Handler for bundle creation
   */
  private static async handleBundleCreated(payload: any): Promise<void> {
    const { order_id, bundleIds, total_qty } = payload

    // Mark cutting step as DONE if all bundles created
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        bundles: true,
        routing_steps: {
          where: { workcenter: 'CUTTING' }
        }
      }
    })

    if (order && order.bundles.length > 0) {
      const totalBundleQty = order.bundles.reduce((sum, bundle) => sum + bundle.qty, 0)
      
      if (totalBundleQty >= order.quantity) {
        // Mark cutting complete and ready next steps
        await prisma.routingStep.updateMany({
          where: {
            order_id,
            workcenter: 'CUTTING',
            status: 'IN_PROGRESS'
          },
          data: { status: 'DONE' }
        })

        // Enable next steps that depend on cutting
        await prisma.routingStep.updateMany({
          where: {
            order_id,
            dependsOn: { hasEvery: ['cutting'] },
            status: 'PLANNED'
          },
          data: { status: 'READY' }
        })
      }
    }

    console.log(`ASH: Bundles created for order ${order_id}`)
  }

  /**
   * Get unprocessed events for batch processing
   */
  static async getUnprocessedEvents(limit: number = 100): Promise<AshEvent[]> {
    const events = await prisma.eventLog.findMany({
      where: { processed: false },
      orderBy: { created_at: 'asc' },
      take: limit
    })

    return events.map(event => ({
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event.payload as Record<string, any>
    }))
  }

  /**
   * Mark events as processed
   */
  static async markEventsProcessed(eventIds: string[]): Promise<void> {
    await prisma.eventLog.updateMany({
      where: { id: { in: eventIds } },
      data: { processed: true }
    })
  }

  /**
   * Check if a production stage is completed
   */
  private static async checkStageCompletion(stage: string, payload: any): Promise<void> {
    try {
      const { order_id, lay_plan_id } = payload

      switch (stage) {
        case 'CUTTING': {
          // Check if all bundles for this order are completed
          const layPlan = await prisma.layPlan.findUnique({
            where: { id: lay_plan_id },
            include: { cutting_bundles: true }
          })

          if (layPlan && layPlan.cutting_bundles.length > 0) {
            const completedBundles = layPlan.cutting_bundles.filter(b => 
              ['COMPLETED', 'QC_PASSED'].includes(b.status)
            )

            if (completedBundles.length === layPlan.cutting_bundles.length) {
              // All bundles completed - trigger next stage
              await AshEventBus.emit('ash.cutting.stage_completed', {
                entityType: 'order',
                entityId: order_id,
                order_id,
                lay_plan_id,
                total_bundles: layPlan.cutting_bundles.length
              })

              // Transition order status
              await transitionOrderStatus(order_id, 'COMPLETE_CUTTING', {
                actor_id: 'system',
                reason: 'All cutting bundles completed',
                metadata: { lay_plan_id, bundles_completed: layPlan.cutting_bundles.length }
              })
            }
          }
          break
        }
      }
    } catch (_error) {
      console.error('Error checking stage completion:', _error)
    }
  }

  /**
   * Update productivity metrics for operators
   */
  private static async updateProductivityMetrics(workcenter: string, operatorId: string, status: string): Promise<void> {
    try {
      // Update operator productivity stats
      if (status === 'COMPLETED') {
        // This would update productivity metrics in the database
        console.log(`ASH: Updated productivity metrics for operator ${operatorId} in ${workcenter}`)
      }
    } catch (_error) {
      console.error('Error updating productivity metrics:', _error)
    }
  }

  /**
   * Start background event processing
   */
  static startProcessing(intervalMs: number = 10000): void {
    if (this.isProcessing) return

    this.isProcessing = true
    console.log('ASH Event Bus: Starting background processing')

    setInterval(async () => {
      try {
        const pendingEvents = await prisma.systemEvent.findMany({
          where: { status: 'OPEN' },
          orderBy: { created_at: 'asc' },
          take: 20
        })

        for (const event of pendingEvents) {
          await prisma.systemEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSING' }
          })

          try {
            await this.processEvent(event.event_type, event.data)
            
            await prisma.systemEvent.update({
              where: { id: event.id },
              data: { 
                status: 'COMPLETED',
                processed_at: new Date()
              }
            })
          } catch (_error) {
            await prisma.systemEvent.update({
              where: { id: event.id },
              data: { 
                status: 'FAILED',
                error_message: error instanceof Error ? error.message : 'Unknown error'
              }
            })
          }
        }
      } catch (_error) {
        console.error('Error in background event processing:', _error)
      }
    }, intervalMs)
  }

  /**
   * Stop background processing
   */
  static stopProcessing(): void {
    this.isProcessing = false
    console.log('ASH Event Bus: Stopped background processing')
  }

  /**
   * Get event statistics for monitoring
   */
  static async getEventStats(timeframeHours: number = 24): Promise<{
    total_events: number
    events_by_type: Record<string, number>
    events_by_status: Record<string, number>
    failed_events: number
    processing_rate: number
  }> {
    const since = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

    const [eventStats, statusStats, failedCount, totalCount] = await Promise.all([
      prisma.systemEvent.groupBy({
        by: ['event_type'],
        where: { created_at: { gte: since } },
        _count: true
      }),
      prisma.systemEvent.groupBy({
        by: ['status'],
        where: { created_at: { gte: since } },
        _count: true
      }),
      prisma.systemEvent.count({
        where: { 
          created_at: { gte: since },
          status: 'FAILED' 
        }
      }),
      prisma.systemEvent.count({
        where: { created_at: { gte: since } }
      })
    ])

    const completedCount = statusStats.find(s => s.status === 'COMPLETED')?._count || 0
    const processingRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    return {
      total_events: totalCount,
      events_by_type: eventStats.reduce((acc, stat) => {
        acc[stat.event_type] = stat._count
        return acc
      }, {} as Record<string, number>),
      events_by_status: statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count
        return acc
      }, {} as Record<string, number>),
      failed_events: failedCount,
      processing_rate: processingRate
    }
  }

  /**
   * Get event history for an entity
   */
  static async getEntityEvents(entityId: string, limit: number = 50): Promise<SystemEvent[]> {
    const events = await prisma.systemEvent.findMany({
      where: { entity_id: entityId },
      orderBy: { created_at: 'desc' },
      take: limit
    })

    return events as SystemEvent[]
  }

  /**
   * Register default event handlers on startup
   */
  static registerDefaultHandlers(): void {
    // Order lifecycle events
    this.on('ash.order.milestone_reached', async (payload) => {
      console.log(`Milestone reached: ${payload.milestone} for order ${payload.order_id}`)
    })

    // System capacity monitoring
    this.on('ash.system.capacity_warning', async (payload) => {
      console.log(`Capacity warning: ${payload.workcenter} at ${payload.utilization}%`)
      
      // Create capacity alert insight
      await prisma.aIInsight.create({
        data: {
          id: require('nanoid').nanoid(),
          type: 'CAPACITY_ALERT',
          title: `${payload.workcenter} Capacity Warning`,
          description: `Workcenter utilization at ${payload.utilization}%. Consider load balancing.`,
          priority: 'HIGH',
          data: payload
        }
      })
    })

    // Client notifications
    this.on('ash.notification.client_design_ready', async (payload) => {
      console.log(`Notifying client about new design for order ${payload.order_id}`)
      // Integration with email/SMS service would go here
    })

    this.on('ash.notification.order_status_update', async (payload) => {
      console.log(`Notifying client about status update: ${payload.status} for order ${payload.order_id}`)
      // Integration with notification service would go here
    })
  }
}

// Event emitter helpers for common events
export const EventEmitters = {
  orderCreated: (order_id: string, po_number: string, method: string, actorId: string) =>
    AshEventBus.emit('ash.order.created', {
      entityType: 'order',
      entityId: order_id,
      order_id: order_id,
      po_number: poNumber,
      method,
      actor_id: actorId
    }),

  designUploaded: (assetId: string, order_id: string, designType: string, uploadedBy: string) =>
    AshEventBus.emit('ash.design.uploaded', {
      entityType: 'design_asset',
      entityId: assetId,
      asset_id: assetId,
      order_id: order_id,
      design_type: designType,
      uploaded_by: uploadedBy
    }),

  designApproved: (assetId: string, order_id: string, approvedBy: string) =>
    AshEventBus.emit('ash.design.approved', {
      entityType: 'design_asset',
      entityId: assetId,
      assetId,
      order_id,
      approved_by: approvedBy
    }),

  fabricIssued: (issueId: string, order_id: string, totalMeters: number, batchCount: number) =>
    AshEventBus.emit('ash.fabric.issued', {
      entityType: 'fabric_issue',
      entityId: issueId,
      issue_id: issueId,
      order_id: order_id,
      total_meters: totalMeters,
      batch_count: batchCount
    }),

  layPlanned: (layPlanId: string, order_id: string, efficiency: number, totalPieces: number) =>
    AshEventBus.emit('ash.cutting.lay_planned', {
      entityType: 'lay_plan',
      entityId: layPlanId,
      lay_plan_id: layPlanId,
      order_id: order_id,
      efficiency,
      total_pieces: totalPieces
    }),

  bundleUpdated: (bundleId: string, bundleNumber: string, oldStatus: string, newStatus: string, operatorId: string, layPlanId?: string) =>
    AshEventBus.emit('ash.cutting.bundle_updated', {
      entityType: 'cutting_bundle',
      entityId: bundleId,
      bundle_id: bundleId,
      bundle_number: bundleNumber,
      old_status: oldStatus,
      new_status: newStatus,
      operator_id: operatorId,
      lay_plan_id: layPlanId
    }),

  qcCompleted: (inspectionId: string, order_id: string, passRate: number, defectCount: number, inspectorId: string) =>
    AshEventBus.emit('ash.qc.inspection_completed', {
      entityType: 'quality_inspection',
      entityId: inspectionId,
      inspection_id: inspectionId,
      order_id: order_id,
      pass_rate: passRate,
      defect_count: defectCount,
      inspector_id: inspectorId
    }),

  orderStatusChanged: (order_id: string, oldStatus: string, newStatus: string, actorId: string) =>
    AshEventBus.emit('ash.order.status_changed', {
      entityType: 'order',
      entityId: order_id,
      order_id: order_id,
      old_status: oldStatus,
      new_status: newStatus,
      actor_id: actorId
    }),

  capacityWarning: (workcenter: string, utilization: number, recommendations: string[]) =>
    AshEventBus.emit('ash.system.capacity_warning', {
      entityType: 'system',
      entityId: 'capacity_monitor',
      workcenter,
      utilization,
      recommendations
    })
}

// Initialize default handlers
AshEventBus.registerDefaultHandlers()

// Export EventBus as alias for compatibility
export const EventBus = AshEventBus