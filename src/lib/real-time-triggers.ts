// @ts-nocheck
// Real-time Workflow Triggers for ASH AI ERP System
// Automatically generates notifications based on production events and order changes

export interface WorkflowTriggerEvent {
  type: 'order_status_change' | 'production_stage_complete' | 'design_uploaded' | 'quality_alert' | 'delivery_scheduled'
  entity_id: string
  entity_type: 'order' | 'routing_step' | 'design_asset' | 'quality_check' | 'delivery'
  old_data?: any
  new_data: any
  workspace_id: string
  triggered_by: string
  timestamp: Date
}

export interface NotificationTarget {
  type: 'user' | 'client' | 'role' | 'broadcast'
  target_id?: string
  channels: string[]
}

export class RealTimeWorkflowTriggers {
  
  // Main trigger processor - call this when any significant event occurs
  static async processTrigger(event: WorkflowTriggerEvent): Promise<void> {
    console.log('🔔 Processing workflow trigger:', event.type, event.entity_id)

    try {
      const notifications = await this.generateNotifications(event)
      
      for (const notification of notifications) {
        await this.sendNotification(notification)
      }

      // Log trigger processing for analytics
      await this.logTriggerEvent(event, notifications.length)

    } catch (error) {
      console.error('Failed to process workflow trigger:', error)
    }
  }

  // Generate appropriate notifications based on event type
  private static async generateNotifications(event: WorkflowTriggerEvent) {
    const notifications: any[] = []

    switch (event.type) {
      case 'order_status_change':
        notifications.push(...await this.handleOrderStatusChange(event))
        break

      case 'production_stage_complete':
        notifications.push(...await this.handleProductionStageComplete(event))
        break

      case 'design_uploaded':
        notifications.push(...await this.handleDesignUploaded(event))
        break

      case 'quality_alert':
        notifications.push(...await this.handleQualityAlert(event))
        break

      case 'delivery_scheduled':
        notifications.push(...await this.handleDeliveryScheduled(event))
        break
    }

    return notifications
  }

  // Handle order status change notifications
  private static async handleOrderStatusChange(event: WorkflowTriggerEvent) {
    const notifications: any[] = []
    const { old_data, new_data } = event

    // Notify client about important status changes
    const clientNotificationStatuses = [
      'DESIGN_APPROVAL', 'IN_PROGRESS', 'QC', 'READY_FOR_DELIVERY', 'DELIVERED'
    ]

    if (clientNotificationStatuses.includes(new_data.status)) {
      notifications.push({
        type: 'order_status_change',
        channel: 'client-portal',
        target: { type: 'client', target_id: new_data.client_id },
        priority: this.getStatusChangePriority(old_data?.status, new_data.status),
        message: this.generateOrderStatusMessage(new_data),
        data: {
          order_id: event.entity_id,
          po_number: new_data.po_number,
          old_status: old_data?.status,
          new_status: new_data.status,
          progress_percentage: this.calculateProgressPercentage(new_data.status)
        }
      })
    }

    // Notify internal teams about critical status changes
    const internalNotificationStatuses = [
      'PRODUCTION_PLANNED', 'IN_PROGRESS', 'QC', 'BLOCKED'
    ]

    if (internalNotificationStatuses.includes(new_data.status)) {
      notifications.push({
        type: 'order_status_change',
        channel: 'internal',
        target: { type: 'role', target_id: 'PRODUCTION_MANAGER' },
        priority: new_data.status === 'BLOCKED' ? 'high' : 'normal',
        message: `Order ${new_data.po_number} status updated to ${new_data.status}`,
        data: {
          order_id: event.entity_id,
          po_number: new_data.po_number,
          old_status: old_data?.status,
          new_status: new_data.status,
          requires_action: new_data.status === 'BLOCKED'
        }
      })
    }

    return notifications
  }

  // Handle production stage completion notifications
  private static async handleProductionStageComplete(event: WorkflowTriggerEvent) {
    const notifications: any[] = []
    const { new_data } = event

    // Notify client about major stage completions
    const clientNotificationStages = ['CUTTING', 'PRINTING', 'SEWING', 'QC']
    
    if (clientNotificationStages.includes(new_data.workcenter)) {
      notifications.push({
        type: 'production_update',
        channel: 'client-portal',
        target: { type: 'client', target_id: new_data.order.client_id },
        priority: 'normal',
        message: `${new_data.workcenter.toLowerCase()} stage completed for order ${new_data.order.po_number}`,
        data: {
          order_id: new_data.order_id,
          po_number: new_data.order.po_number,
          stage: new_data.workcenter,
          next_stage: this.getNextStage(new_data.workcenter),
          efficiency: new_data.efficiency_percentage || null
        }
      })
    }

    // Notify next stage operators
    const nextStage = this.getNextStage(new_data.workcenter)
    if (nextStage) {
      notifications.push({
        type: 'stage_ready',
        channel: 'production',
        target: { type: 'role', target_id: `${nextStage}_OPERATOR` },
        priority: 'normal',
        message: `Order ${new_data.order.po_number} ready for ${nextStage.toLowerCase()}`,
        data: {
          order_id: new_data.order_id,
          po_number: new_data.order.po_number,
          previous_stage: new_data.workcenter,
          current_stage: nextStage
        }
      })
    }

    return notifications
  }

  // Handle design upload notifications
  private static async handleDesignUploaded(event: WorkflowTriggerEvent) {
    const notifications: any[] = []
    const { new_data } = event

    if (new_data.approval_status === 'PENDING_CLIENT_APPROVAL') {
      notifications.push({
        type: 'design_approval_needed',
        channel: 'client-portal',
        target: { type: 'client', target_id: new_data.order.client_id },
        priority: 'high',
        message: `New design uploaded for order ${new_data.order.po_number} - approval required`,
        data: {
          order_id: new_data.order_id,
          po_number: new_data.order.po_number,
          design_id: event.entity_id,
          file_name: new_data.file_name,
          version: new_data.version,
          type: new_data.type
        }
      })
    }

    return notifications
  }

  // Handle quality alert notifications
  private static async handleQualityAlert(event: WorkflowTriggerEvent) {
    const notifications: any[] = []
    const { new_data } = event

    // High priority notification for quality issues
    notifications.push({
      type: 'quality_alert',
      channel: 'quality-control',
      target: { type: 'role', target_id: 'QC_MANAGER' },
      priority: 'high',
      message: `Quality alert for order ${new_data.order.po_number}: ${new_data.issue_description}`,
      data: {
        order_id: new_data.order_id,
        po_number: new_data.order.po_number,
        defect_type: new_data.defect_type,
        severity: new_data.severity,
        stage: new_data.stage
      }
    })

    // Notify client for major quality issues
    if (new_data.severity === 'HIGH') {
      notifications.push({
        type: 'quality_issue',
        channel: 'client-portal',
        target: { type: 'client', target_id: new_data.order.client_id },
        priority: 'high',
        message: `Quality issue detected in your order ${new_data.order.po_number} - our team is addressing it`,
        data: {
          order_id: new_data.order_id,
          po_number: new_data.order.po_number,
          estimated_delay: new_data.estimated_delay_hours
        }
      })
    }

    return notifications
  }

  // Handle delivery scheduled notifications
  private static async handleDeliveryScheduled(event: WorkflowTriggerEvent) {
    const notifications: any[] = []
    const { new_data } = event

    // Notify client about delivery scheduling
    notifications.push({
      type: 'delivery_scheduled',
      channel: 'client-portal',
      target: { type: 'client', target_id: new_data.order.client_id },
      priority: 'normal',
      message: `Delivery scheduled for order ${new_data.order.po_number}`,
      data: {
        order_id: new_data.order_id,
        po_number: new_data.order.po_number,
        delivery_date: new_data.scheduled_at,
        tracking_number: new_data.tracking_number,
        driver: new_data.driver_name
      }
    })

    return notifications
  }

  // Send notification through appropriate channels
  private static async sendNotification(notification: any) {
    try {
      // Send through WebSocket/SSE
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: notification.channel,
          type: notification.type,
          message: notification.message,
          data: notification.data,
          target_user_id: notification.target.type === 'user' ? notification.target.target_id : null,
          target_client_id: notification.target.type === 'client' ? notification.target.target_id : null,
          order_id: notification.data?.order_id,
          priority: notification.priority
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`)
      }

      console.log('✅ Notification sent successfully:', notification.type)

    } catch (error) {
      console.error('❌ Failed to send notification:', error)
    }
  }

  // Helper functions
  private static getStatusChangePriority(oldStatus: string, newStatus: string): 'low' | 'normal' | 'high' {
    const highPriorityStatuses = ['DESIGN_APPROVAL', 'READY_FOR_DELIVERY', 'DELIVERED']
    const normalPriorityStatuses = ['IN_PROGRESS', 'QC']
    
    if (highPriorityStatuses.includes(newStatus)) return 'high'
    if (normalPriorityStatuses.includes(newStatus)) return 'normal'
    return 'low'
  }

  private static generateOrderStatusMessage(orderData: any): string {
    const statusMessages = {
      'DESIGN_APPROVAL': `Design ready for approval - Order ${orderData.po_number}`,
      'IN_PROGRESS': `Production started for Order ${orderData.po_number}`,
      'QC': `Quality control in progress for Order ${orderData.po_number}`,
      'READY_FOR_DELIVERY': `Order ${orderData.po_number} is ready for delivery`,
      'DELIVERED': `Order ${orderData.po_number} has been delivered successfully`
    }
    
    return statusMessages[orderData.status as keyof typeof statusMessages] || 
           `Order ${orderData.po_number} status updated to ${orderData.status}`
  }

  private static calculateProgressPercentage(status: string): number {
    const statusProgress = {
      'INTAKE': 5,
      'DESIGN_PENDING': 15,
      'DESIGN_APPROVAL': 25,
      'PRODUCTION_PLANNED': 35,
      'IN_PROGRESS': 60,
      'QC': 80,
      'PACKING': 90,
      'READY_FOR_DELIVERY': 95,
      'DELIVERED': 100
    }
    
    return statusProgress[status as keyof typeof statusProgress] || 0
  }

  private static getNextStage(currentStage: string): string | null {
    const stageSequence = ['CUTTING', 'PRINTING', 'SEWING', 'QC', 'PACKING', 'DELIVERY']
    const currentIndex = stageSequence.indexOf(currentStage)
    
    return currentIndex !== -1 && currentIndex < stageSequence.length - 1 
      ? stageSequence[currentIndex + 1] 
      : null
  }

  private static async logTriggerEvent(event: WorkflowTriggerEvent, notificationCount: number) {
    // In production, store trigger analytics in database
    console.log('📊 Trigger analytics:', {
      event_type: event.type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      notifications_sent: notificationCount,
      timestamp: event.timestamp
    })
  }
}

// Convenience functions for common trigger scenarios
export class WorkflowTriggerHelpers {
  
  static async triggerOrderStatusChange(
    orderId: string, 
    oldStatus: string, 
    newStatus: string, 
    orderData: any,
    workspaceId: string,
    triggeredBy: string
  ) {
    await RealTimeWorkflowTriggers.processTrigger({
      type: 'order_status_change',
      entity_id: orderId,
      entity_type: 'order',
      old_data: { status: oldStatus },
      new_data: { ...orderData, status: newStatus },
      workspace_id: workspaceId,
      triggered_by: triggeredBy,
      timestamp: new Date()
    })
  }

  static async triggerProductionStageComplete(
    routingStepId: string,
    stageData: any,
    workspaceId: string,
    triggeredBy: string
  ) {
    await RealTimeWorkflowTriggers.processTrigger({
      type: 'production_stage_complete',
      entity_id: routingStepId,
      entity_type: 'routing_step',
      new_data: stageData,
      workspace_id: workspaceId,
      triggered_by: triggeredBy,
      timestamp: new Date()
    })
  }

  static async triggerDesignUpload(
    designId: string,
    designData: any,
    workspaceId: string,
    triggeredBy: string
  ) {
    await RealTimeWorkflowTriggers.processTrigger({
      type: 'design_uploaded',
      entity_id: designId,
      entity_type: 'design_asset',
      new_data: designData,
      workspace_id: workspaceId,
      triggered_by: triggeredBy,
      timestamp: new Date()
    })
  }
}