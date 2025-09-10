// Notification System - CLIENT_UPDATED_PLAN.md Implementation
// Handle all system notifications, emails, and real-time alerts

import { prisma } from './prisma'
import { Role } from '@prisma/client'
import { logError } from './error-handler'

export interface NotificationRequest {
  recipient_type: 'USER' | 'ROLE' | 'CLIENT'
  recipient_id: string
  title: string
  message: string
  related_entity_type?: string
  related_entity_id?: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  channels?: NotificationChannel[]
  metadata?: Record<string, any>
}

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH'

export interface NotificationTemplate {
  id: string
  name: string
  subject: string
  body: string
  channels: NotificationChannel[]
  variables: string[]
}

export class NotificationSystem {
  private templates: Map<string, NotificationTemplate> = new Map()

  constructor() {
    this.initializeTemplates()
  }

  private initializeTemplates() {
    // Order-related templates
    this.addTemplate({
      id: 'new_design_request',
      name: 'New Design Request',
      subject: 'New Order Ready for Design Review',
      body: 'Order {po_number} requires design review. Client: {client_name}, Due Date: {due_date}',
      channels: ['IN_APP', 'EMAIL'],
      variables: ['po_number', 'client_name', 'due_date']
    })

    this.addTemplate({
      id: 'production_ready',
      name: 'Production Ready',
      subject: 'Order Approved - Ready for Production',
      body: 'Order {po_number} has been approved and is ready for production planning.',
      channels: ['IN_APP', 'EMAIL'],
      variables: ['po_number']
    })

    this.addTemplate({
      id: 'step_ready',
      name: 'Production Step Ready',
      subject: 'Next Production Step Ready',
      body: 'Order {po_number}: {step_name} is ready to start. Please check the production queue.',
      channels: ['IN_APP', 'PUSH'],
      variables: ['po_number', 'step_name']
    })

    this.addTemplate({
      id: 'qc_required',
      name: 'Quality Inspection Required',
      subject: 'Quality Control Needed',
      body: 'Order {po_number} requires quality inspection. Please perform {inspection_type}.',
      channels: ['IN_APP', 'EMAIL'],
      variables: ['po_number', 'inspection_type']
    })

    this.addTemplate({
      id: 'order_completed',
      name: 'Order Completed',
      subject: 'Your Order is Ready!',
      body: 'Great news! Your order {po_number} is completed and ready for pickup/delivery.',
      channels: ['EMAIL', 'SMS'],
      variables: ['po_number']
    })

    this.addTemplate({
      id: 'order_delayed',
      name: 'Order Delayed',
      subject: 'Order Delay Notification',
      body: 'We need to update you on order {po_number}. New estimated completion: {new_date}',
      channels: ['EMAIL', 'IN_APP'],
      variables: ['po_number', 'new_date']
    })
  }

  private addTemplate(template: NotificationTemplate) {
    this.templates.set(template.id, template)
  }

  async sendNotification(request: NotificationRequest): Promise<void> {
    try {
      // Get recipients
      const recipients = await this.resolveRecipients(request.recipient_type, request.recipient_id)

      for (const recipient of recipients) {
        // Create notification record
        const notification = await prisma.notification.create({
          data: {
            workspace_id: 'workspace-1', // Should get from context
            recipient_id: recipient.id,
            title: request.title,
            message: request.message,
            priority: request.priority,
            channels: request.channels || ['IN_APP'],
            related_entity_type: request.related_entity_type,
            related_entity_id: request.related_entity_id,
            metadata: request.metadata,
            status: 'PENDING',
            created_at: new Date()
          }
        })

        // Send through each channel
        const channels = request.channels || ['IN_APP']
        for (const channel of channels) {
          await this.sendThroughChannel(notification.id, recipient, channel, request)
        }
      }
    } catch (_error) {
      logError(error, 'Failed to send notification')
      throw error
    }
  }

  async sendFromTemplate(
    templateId: string,
    recipient_type: NotificationRequest['recipient_type'],
    recipient_id: string,
    variables: Record<string, string>,
    priority: NotificationRequest['priority'] = 'NORMAL'
  ): Promise<void> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Notification template ${templateId} not found`)
    }

    // Replace variables in template
    let title = template.subject
    let message = template.body

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`
      title = title.replace(new RegExp(placeholder, 'g'), value)
      message = message.replace(new RegExp(placeholder, 'g'), value)
    }

    await this.sendNotification({
      recipient_type,
      recipient_id,
      title,
      message,
      priority,
      channels: template.channels,
      metadata: { template_id: templateId, variables }
    })
  }

  private async resolveRecipients(type: string, id: string) {
    switch (type) {
      case 'USER':
        const user = await prisma.user.findUnique({ where: { id } })
        return user ? [user] : []

      case 'ROLE':
        return await prisma.user.findMany({
          where: { role: id as Role, active: true }
        })

      case 'CLIENT':
        const clientUsers = await prisma.clientUser.findMany({
          where: { client_id: id },
          include: { client: true }
        })
        return clientUsers.map(cu => ({
          id: cu.id,
          email: cu.email,
          full_name: cu.name,
          role: 'CLIENT' as Role
        }))

      default:
        return []
    }
  }

  private async sendThroughChannel(
    notificationId: string,
    recipient: any,
    channel: NotificationChannel,
    request: NotificationRequest
  ) {
    try {
      switch (channel) {
        case 'IN_APP':
          await this.sendInAppNotification(notificationId, recipient, request)
          break
        case 'EMAIL':
          await this.sendEmailNotification(recipient, request)
          break
        case 'SMS':
          await this.sendSMSNotification(recipient, request)
          break
        case 'PUSH':
          await this.sendPushNotification(recipient, request)
          break
      }

      // Mark as delivered
      await this.markNotificationDelivered(notificationId, channel)
    } catch (_error) {
      logError(error, `Failed to send ${channel} notification to ${recipient.id}`)
      await this.markNotificationFailed(notificationId, channel, error.message)
    }
  }

  private async sendInAppNotification(notificationId: string, recipient: any, request: NotificationRequest) {
    // In-app notifications are just stored in database and picked up by UI
    // Real-time updates would be handled by WebSocket or Server-Sent Events
    console.log(`📱 In-app notification sent to ${recipient.full_name}: ${request.title}`)
  }

  private async sendEmailNotification(recipient: any, request: NotificationRequest) {
    // Integration with email service (SendGrid, AWS SES, etc.)
    // For now, we'll just log it
    console.log(`📧 Email sent to ${recipient.email}: ${request.title}`)
    
    // In production:
    // await emailService.send({
    //   to: recipient.email,
    //   subject: request.title,
    //   html: this.formatEmailContent(request.message, request.metadata)
    // })
  }

  private async sendSMSNotification(recipient: any, request: NotificationRequest) {
    // Integration with SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS sent to ${recipient.phone || 'N/A'}: ${request.title}`)
  }

  private async sendPushNotification(recipient: any, request: NotificationRequest) {
    // Integration with push notification service
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: recipient.id }
    })

    for (const subscription of subscriptions) {
      console.log(`🔔 Push notification sent to device: ${request.title}`)
      // await webpush.sendNotification(subscription, JSON.stringify({
      //   title: request.title,
      //   body: request.message,
      //   icon: '/icon-192x192.png',
      //   badge: '/badge-72x72.png'
      // }))
    }
  }

  private async markNotificationDelivered(notificationId: string, channel: NotificationChannel) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'DELIVERED',
        delivered_at: new Date(),
        delivery_details: {
          channel,
          delivered: true
        }
      }
    })
  }

  private async markNotificationFailed(notificationId: string, channel: NotificationChannel, error: string) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'FAILED',
        delivery_details: {
          channel,
          delivered: false,
          error
        }
      }
    })
  }

  // Get user notifications
  async getUserNotifications(userId: string, unreadOnly = false) {
    return await prisma.notification.findMany({
      where: {
        recipient_id: userId,
        ...(unreadOnly && { read_at: null })
      },
      orderBy: { created_at: 'desc' },
      take: 50
    })
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipient_id: userId
      },
      data: {
        read_at: new Date()
      }
    })
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        recipient_id: userId,
        read_at: null
      },
      data: {
        read_at: new Date()
      }
    })
  }
}

// Global notification system instance
export const notificationSystem = new NotificationSystem()

// Helper function for external use
export async function sendNotification(request: NotificationRequest) {
  return await notificationSystem.sendNotification(request)
}

export async function sendNotificationFromTemplate(
  templateId: string,
  recipientType: NotificationRequest['recipient_type'],
  recipientId: string,
  variables: Record<string, string>,
  priority?: NotificationRequest['priority']
) {
  return await notificationSystem.sendFromTemplate(templateId, recipientType, recipientId, variables, priority)
}