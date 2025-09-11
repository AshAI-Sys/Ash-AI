/**
 * ASH AI ERP - Multi-Channel Notification Automation System
 * Email, SMS, and in-app notifications with templating and scheduling
 */

import { db } from './db'
import { OrderStatus, Role } from '@prisma/client'
import nodemailer from 'nodemailer'
import twilio from 'twilio'

export interface NotificationTemplate {
  id: string
  name: string
  type: 'EMAIL' | 'SMS' | 'IN_APP'
  subject?: string
  body: string
  variables: string[]
  category: 'ORDER_STATUS' | 'TASK_ASSIGNMENT' | 'REMINDER' | 'ALERT' | 'MARKETING'
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH'
  enabled: boolean
  config?: Record<string, any>
}

export interface NotificationRecipient {
  id: string
  type: 'USER' | 'CLIENT' | 'ROLE' | 'GROUP'
  channels: NotificationChannel[]
  preferences: Record<string, boolean>
}

export interface ScheduledNotification {
  id: string
  templateId: string
  recipientId: string
  channels: string[]
  variables: Record<string, any>
  scheduledFor: Date
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  attempts: number
  lastAttempt?: Date
  errorMessage?: string
}

export class NotificationAutomation {
  private static instance: NotificationAutomation
  private emailTransporter?: nodemailer.Transporter
  private twilioClient?: any
  private templates: Map<string, NotificationTemplate> = new Map()

  static getInstance(): NotificationAutomation {
    if (!NotificationAutomation.instance) {
      NotificationAutomation.instance = new NotificationAutomation()
    }
    return NotificationAutomation.instance
  }

  // Initialize notification services
  async initialize() {
    console.log('📧 Initializing Notification Automation...')
    
    await this.initializeEmailService()
    await this.initializeSMSService()
    await this.loadTemplates()
    
    console.log('✅ Notification automation initialized')
  }

  // Initialize email service
  private async initializeEmailService() {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.ASH_SMTP_HOST || process.env.SMTP_HOST,
        port: parseInt(process.env.ASH_SMTP_PORT || process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.ASH_SMTP_USER || process.env.SMTP_USER,
          pass: process.env.ASH_SMTP_PASS || process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      // Test email connection
      await this.emailTransporter.verify()
      console.log('✅ Email service connected')
    } catch (error) {
      console.warn('⚠️ Email service not available:', error)
    }
  }

  // Initialize SMS service
  private async initializeSMSService() {
    try {
      const accountSid = process.env.ASH_TWILIO_SID || process.env.TWILIO_SID
      const authToken = process.env.ASH_TWILIO_TOKEN || process.env.TWILIO_TOKEN

      if (accountSid && authToken) {
        this.twilioClient = twilio(accountSid, authToken)
        console.log('✅ SMS service connected')
      } else {
        console.warn('⚠️ SMS service not configured')
      }
    } catch (error) {
      console.warn('⚠️ SMS service not available:', error)
    }
  }

  // Load notification templates
  private async loadTemplates() {
    try {
      const templates = await db.notificationTemplate.findMany({
        where: { enabled: true }
      })

      this.templates.clear()
      templates.forEach(template => {
        this.templates.set(template.id, {
          id: template.id,
          name: template.name,
          type: template.type as any,
          subject: template.subject || undefined,
          body: template.body,
          variables: JSON.parse(template.variables as string || '[]'),
          category: template.category as any
        })
      })

      console.log(`📋 Loaded ${this.templates.size} notification templates`)
    } catch (error) {
      console.error('Failed to load templates:', error)
      await this.createDefaultTemplates()
    }
  }

  // Create default notification templates
  private async createDefaultTemplates() {
    const defaultTemplates = [
      // Order Status Templates
      {
        name: 'Order Status Update - Design Pending',
        type: 'EMAIL',
        category: 'ORDER_STATUS',
        subject: 'Order Update: {{orderNumber}} - Design in Progress',
        body: `
        <h2>Order Status Update</h2>
        <p>Dear {{clientName}},</p>
        <p>Your order <strong>{{orderNumber}}</strong> has been moved to the design phase.</p>
        <p><strong>Order Details:</strong></p>
        <ul>
          <li>Product: {{productType}}</li>
          <li>Quantity: {{quantity}}</li>
          <li>Expected Delivery: {{expectedDelivery}}</li>
        </ul>
        <p>Our design team is now working on your requirements. You will receive another update once the design is ready for approval.</p>
        <p>Track your order: <a href="{{trackingUrl}}">{{trackingUrl}}</a></p>
        <p>Best regards,<br>ASH AI Production Team</p>
        `,
        variables: ['clientName', 'orderNumber', 'productType', 'quantity', 'expectedDelivery', 'trackingUrl']
      },
      {
        name: 'Order Status Update - Ready for Delivery',
        type: 'EMAIL',
        category: 'ORDER_STATUS',
        subject: 'Order Ready: {{orderNumber}} - Ready for Pickup/Delivery',
        body: `
        <h2>Order Ready for Delivery</h2>
        <p>Dear {{clientName}},</p>
        <p>Great news! Your order <strong>{{orderNumber}}</strong> is now ready for delivery.</p>
        <p><strong>Order Details:</strong></p>
        <ul>
          <li>Product: {{productType}}</li>
          <li>Quantity: {{quantity}}</li>
          <li>Quality Status: ✅ Passed</li>
        </ul>
        <p><strong>Delivery Information:</strong></p>
        <p>{{deliveryDetails}}</p>
        <p>Track your delivery: <a href="{{trackingUrl}}">{{trackingUrl}}</a></p>
        <p>Thank you for choosing ASH AI!</p>
        `,
        variables: ['clientName', 'orderNumber', 'productType', 'quantity', 'deliveryDetails', 'trackingUrl']
      },
      {
        name: 'Order Delay Alert',
        type: 'SMS',
        category: 'ORDER_STATUS',
        body: 'ASH AI Alert: Order {{orderNumber}} is experiencing a delay. New estimated delivery: {{newDeliveryDate}}. We apologize for the inconvenience. Track: {{trackingUrl}}',
        variables: ['orderNumber', 'newDeliveryDate', 'trackingUrl']
      },
      // Task Assignment Templates
      {
        name: 'Task Assignment - Production',
        type: 'IN_APP',
        category: 'TASK_ASSIGNMENT',
        subject: 'New Task Assigned: {{taskTitle}}',
        body: 'You have been assigned a new production task: {{taskTitle}} for order {{orderNumber}}. Priority: {{priority}}. Due: {{dueDate}}',
        variables: ['taskTitle', 'orderNumber', 'priority', 'dueDate']
      },
      {
        name: 'Task Assignment - QC',
        type: 'EMAIL',
        category: 'TASK_ASSIGNMENT',
        subject: 'QC Task Assignment: {{orderNumber}}',
        body: `
        <h2>Quality Control Task Assignment</h2>
        <p>Hello {{operatorName}},</p>
        <p>You have been assigned a quality control task for order <strong>{{orderNumber}}</strong>.</p>
        <p><strong>Task Details:</strong></p>
        <ul>
          <li>Product: {{productType}}</li>
          <li>Quantity to inspect: {{quantity}}</li>
          <li>Priority: {{priority}}</li>
          <li>Due Date: {{dueDate}}</li>
        </ul>
        <p>Please complete the inspection and update the system accordingly.</p>
        <p>Access task: <a href="{{taskUrl}}">{{taskUrl}}</a></p>
        `,
        variables: ['operatorName', 'orderNumber', 'productType', 'quantity', 'priority', 'dueDate', 'taskUrl']
      },
      // Reminder Templates
      {
        name: 'Payment Reminder',
        type: 'EMAIL',
        category: 'REMINDER',
        subject: 'Payment Reminder: Invoice {{invoiceNumber}}',
        body: `
        <h2>Payment Reminder</h2>
        <p>Dear {{clientName}},</p>
        <p>This is a friendly reminder that payment for invoice <strong>{{invoiceNumber}}</strong> is due.</p>
        <p><strong>Invoice Details:</strong></p>
        <ul>
          <li>Amount: {{amount}}</li>
          <li>Due Date: {{dueDate}}</li>
          <li>Order: {{orderNumber}}</li>
        </ul>
        <p>Please process the payment at your earliest convenience.</p>
        <p>View invoice: <a href="{{invoiceUrl}}">{{invoiceUrl}}</a></p>
        `,
        variables: ['clientName', 'invoiceNumber', 'amount', 'dueDate', 'orderNumber', 'invoiceUrl']
      }
    ]

    for (const template of defaultTemplates) {
      try {
        await db.notificationTemplate.create({
          data: {
            name: template.name,
            type: template.type,
            category: template.category,
            subject: template.subject,
            body: template.body,
            variables: JSON.stringify(template.variables),
            enabled: true
          }
        })
      } catch (error) {
        console.warn(`Failed to create template ${template.name}:`, error)
      }
    }

    await this.loadTemplates()
  }

  // Send order status notification
  async sendOrderStatusNotification(
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    changedBy: string,
    reason?: string
  ) {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          client: true,
          brand: true,
          items: true
        }
      })

      if (!order) return

      // Determine notification templates based on new status
      const templates = this.getTemplatesForStatus(toStatus)
      
      for (const template of templates) {
        // Prepare variables
        const variables = this.prepareOrderVariables(order, toStatus, reason)

        // Send to client
        if (template.category === 'ORDER_STATUS') {
          await this.scheduleNotification({
            templateId: template.id,
            recipientId: order.client_id,
            recipientType: 'CLIENT',
            channels: this.getChannelsForStatus(toStatus),
            variables,
            priority: this.getPriorityForStatus(toStatus),
            scheduledFor: new Date()
          })
        }

        // Send to internal team
        const teamRoles = this.getTeamRolesForStatus(toStatus)
        for (const role of teamRoles) {
          await this.scheduleNotification({
            templateId: template.id,
            recipientId: role,
            recipientType: 'ROLE',
            channels: ['IN_APP'],
            variables,
            priority: 'NORMAL',
            scheduledFor: new Date()
          })
        }
      }

    } catch (error) {
      console.error('Failed to send order status notification:', error)
    }
  }

  // Schedule a notification
  async scheduleNotification({
    templateId,
    recipientId,
    recipientType = 'USER',
    channels,
    variables,
    priority = 'NORMAL',
    scheduledFor = new Date()
  }: {
    templateId: string
    recipientId: string
    recipientType?: 'USER' | 'CLIENT' | 'ROLE'
    channels: string[]
    variables: Record<string, any>
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    scheduledFor?: Date
  }) {
    try {
      const notification = await db.scheduledNotification.create({
        data: {
          template_id: templateId,
          recipient_id: recipientId,
          recipient_type: recipientType,
          channels: JSON.stringify(channels),
          variables: JSON.stringify(variables),
          priority,
          scheduled_for: scheduledFor,
          status: 'PENDING',
          attempts: 0
        }
      })

      // If scheduled for immediate delivery, process now
      if (scheduledFor <= new Date()) {
        await this.processNotification(notification.id)
      }

      return notification
    } catch (error) {
      console.error('Failed to schedule notification:', error)
    }
  }

  // Process pending notifications
  async processPendingNotifications() {
    const pendingNotifications = await db.scheduledNotification.findMany({
      where: {
        status: 'PENDING',
        scheduled_for: {
          lte: new Date()
        },
        attempts: {
          lt: 3 // Max 3 attempts
        }
      },
      orderBy: {
        priority: 'desc'
      },
      take: 50 // Process 50 at a time
    })

    for (const notification of pendingNotifications) {
      await this.processNotification(notification.id)
    }
  }

  // Process individual notification
  private async processNotification(notificationId: string) {
    try {
      const notification = await db.scheduledNotification.findUnique({
        where: { id: notificationId }
      })

      if (!notification) return

      const template = this.templates.get(notification.template_id)
      if (!template) {
        await this.markNotificationFailed(notificationId, 'Template not found')
        return
      }

      const channels = JSON.parse(notification.channels as string)
      const variables = JSON.parse(notification.variables as string)

      // Update attempt count
      await db.scheduledNotification.update({
        where: { id: notificationId },
        data: {
          attempts: notification.attempts + 1,
          last_attempt: new Date()
        }
      })

      // Get recipients
      const recipients = await this.getRecipients(
        notification.recipient_id,
        notification.recipient_type as any
      )

      let allSuccessful = true

      for (const recipient of recipients) {
        for (const channel of channels) {
          try {
            await this.sendNotificationViaChannel(
              template,
              recipient,
              channel,
              variables
            )
          } catch (error) {
            console.error(`Failed to send via ${channel} to ${recipient.id}:`, error)
            allSuccessful = false
          }
        }
      }

      // Update notification status
      if (allSuccessful) {
        await db.scheduledNotification.update({
          where: { id: notificationId },
          data: {
            status: 'SENT',
            sent_at: new Date()
          }
        })
      } else {
        await this.markNotificationFailed(notificationId, 'Partial delivery failure')
      }

    } catch (error) {
      console.error(`Failed to process notification ${notificationId}:`, error)
      await this.markNotificationFailed(notificationId, error.message)
    }
  }

  // Send notification via specific channel
  private async sendNotificationViaChannel(
    template: NotificationTemplate,
    recipient: any,
    channel: string,
    variables: Record<string, any>
  ) {
    const content = this.renderTemplate(template, variables)

    switch (channel) {
      case 'EMAIL':
        await this.sendEmail(recipient, content)
        break

      case 'SMS':
        await this.sendSMS(recipient, content)
        break

      case 'IN_APP':
        await this.sendInAppNotification(recipient, content)
        break

      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }
  }

  // Send email notification
  private async sendEmail(recipient: any, content: any) {
    if (!this.emailTransporter) {
      throw new Error('Email service not available')
    }

    const email = recipient.email || recipient.emails?.[0]
    if (!email) {
      throw new Error('No email address available')
    }

    await this.emailTransporter.sendMail({
      from: process.env.ASH_SMTP_USER || 'noreply@ash-ai.com',
      to: email,
      subject: content.subject,
      html: content.body,
      text: this.stripHtml(content.body)
    })
  }

  // Send SMS notification
  private async sendSMS(recipient: any, content: any) {
    if (!this.twilioClient) {
      throw new Error('SMS service not available')
    }

    const phone = recipient.phone || recipient.phones?.[0]
    if (!phone) {
      throw new Error('No phone number available')
    }

    await this.twilioClient.messages.create({
      body: content.body,
      from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      to: phone
    })
  }

  // Send in-app notification
  private async sendInAppNotification(recipient: any, content: any) {
    await db.notification.create({
      data: {
        workspace_id: recipient.workspace_id,
        recipient_id: recipient.id,
        title: content.subject || 'Notification',
        message: content.body,
        priority: 'NORMAL',
        status: 'PENDING',
        channels: JSON.stringify(['IN_APP'])
      }
    })
  }

  // Render template with variables
  private renderTemplate(template: NotificationTemplate, variables: Record<string, any>) {
    let subject = template.subject || ''
    let body = template.body

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, String(value))
      body = body.replace(regex, String(value))
    }

    return { subject, body }
  }

  // Get recipients based on type
  private async getRecipients(recipientId: string, recipientType: string) {
    switch (recipientType) {
      case 'USER':
        const user = await db.user.findUnique({ where: { id: recipientId } })
        return user ? [user] : []

      case 'CLIENT':
        const client = await db.client.findUnique({ where: { id: recipientId } })
        return client ? [client] : []

      case 'ROLE':
        const users = await db.user.findMany({ where: { role: recipientId as Role } })
        return users

      default:
        return []
    }
  }

  // Helper methods
  private getTemplatesForStatus(status: OrderStatus): NotificationTemplate[] {
    const statusTemplateMap: Record<OrderStatus, string[]> = {
      'DESIGN_PENDING': ['Order Status Update - Design Pending'],
      'READY_FOR_DELIVERY': ['Order Status Update - Ready for Delivery'],
      'DELIVERED': ['Order Status Update - Delivered'],
      // Add more mappings as needed
      'INTAKE': [],
      'DESIGN_APPROVAL': [],
      'CONFIRMED': [],
      'PRODUCTION_PLANNED': [],
      'IN_PROGRESS': [],
      'QC': [],
      'PACKING': [],
      'CLOSED': [],
      'ON_HOLD': ['Order Delay Alert'],
      'CANCELLED': []
    }

    const templateNames = statusTemplateMap[status] || []
    return Array.from(this.templates.values()).filter(t => 
      templateNames.includes(t.name)
    )
  }

  private getChannelsForStatus(status: OrderStatus): string[] {
    const urgentStatuses = ['ON_HOLD', 'CANCELLED', 'READY_FOR_DELIVERY']
    return urgentStatuses.includes(status) ? ['EMAIL', 'SMS'] : ['EMAIL']
  }

  private getPriorityForStatus(status: OrderStatus): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    const urgentStatuses = ['ON_HOLD', 'CANCELLED']
    const highStatuses = ['READY_FOR_DELIVERY', 'DELIVERED']
    
    if (urgentStatuses.includes(status)) return 'URGENT'
    if (highStatuses.includes(status)) return 'HIGH'
    return 'NORMAL'
  }

  private getTeamRolesForStatus(status: OrderStatus): Role[] {
    const roleMap: Record<OrderStatus, Role[]> = {
      'DESIGN_PENDING': ['GRAPHIC_ARTIST'],
      'IN_PROGRESS': ['OPERATOR', 'SEWING_OPERATOR'],
      'QC': ['QC', 'QC_INSPECTOR'],
      'PACKING': ['WAREHOUSE', 'WAREHOUSE_STAFF'],
      'READY_FOR_DELIVERY': ['DRIVER'],
      // Add defaults
      'INTAKE': ['ADMIN'],
      'DESIGN_APPROVAL': ['ADMIN'],
      'CONFIRMED': ['ADMIN'],
      'PRODUCTION_PLANNED': ['ADMIN'],
      'DELIVERED': ['ADMIN'],
      'CLOSED': ['ADMIN'],
      'ON_HOLD': ['ADMIN'],
      'CANCELLED': ['ADMIN']
    }

    return roleMap[status] || ['ADMIN']
  }

  private prepareOrderVariables(order: any, status: OrderStatus, reason?: string) {
    return {
      clientName: order.client?.name || 'Valued Customer',
      orderNumber: order.po_number,
      productType: order.product_type,
      quantity: order.total_qty,
      expectedDelivery: order.target_delivery_date?.toLocaleDateString(),
      trackingUrl: `${process.env.ASH_APP_URL}/client-portal/orders/${order.id}`,
      currentStatus: status,
      reason: reason || '',
      deliveryDetails: 'Details will be provided by our delivery team'
    }
  }

  private async markNotificationFailed(notificationId: string, errorMessage: string) {
    await db.scheduledNotification.update({
      where: { id: notificationId },
      data: {
        status: 'FAILED',
        error_message: errorMessage
      }
    })
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }

  // Public method for custom notifications
  async sendCustomNotification({
    workspaceId,
    recipientId,
    title,
    message,
    type = 'INFO',
    channels = ['IN_APP']
  }: {
    workspaceId: string
    recipientId: string
    title: string
    message: string
    type?: string
    channels?: string[]
  }) {
    // Create temporary template
    const tempTemplate: NotificationTemplate = {
      id: 'temp',
      name: 'Custom Notification',
      type: 'IN_APP',
      subject: title,
      body: message,
      variables: [],
      category: 'ALERT'
    }

    await this.scheduleNotification({
      templateId: tempTemplate.id,
      recipientId,
      channels,
      variables: {},
      priority: 'NORMAL'
    })
  }
}

// Export singleton instance
export const notificationAutomation = NotificationAutomation.getInstance()

// Initialize on import (server-side only)
if (typeof window === 'undefined') {
  notificationAutomation.initialize().catch(console.error)
}