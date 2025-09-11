/**
 * ASH AI ERP - Notification Dispatcher API
 * Manual and automated notification sending with templating support
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler, createSuccessResponse, Errors } from '@/lib/api-error-handler'
import { notificationAutomation } from '@/lib/notification-automation'

// Validation schemas
const SendNotificationSchema = z.object({
  recipients: z.array(z.object({
    id: z.string(),
    type: z.enum(['USER', 'CLIENT', 'ROLE', 'EMAIL'])
  })).min(1, 'At least one recipient is required'),
  template: z.object({
    id: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().min(1, 'Message body is required'),
    type: z.enum(['EMAIL', 'SMS', 'IN_APP']).default('IN_APP')
  }),
  channels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP', 'PUSH'])).default(['IN_APP']),
  variables: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
})

const BulkNotificationSchema = z.object({
  filter: z.object({
    role: z.nativeEnum(Role).optional(),
    workspace_id: z.string().optional(),
    active: z.boolean().optional()
  }).optional(),
  template: z.object({
    id: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().min(1, 'Message body is required'),
    type: z.enum(['EMAIL', 'SMS', 'IN_APP']).default('IN_APP')
  }),
  channels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP', 'PUSH'])).default(['IN_APP']),
  variables: z.record(z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  scheduledFor: z.string().datetime().optional()
})

const NotificationTestSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.any()).optional(),
  channels: z.array(z.enum(['EMAIL', 'SMS', 'IN_APP'])).default(['IN_APP'])
})

// POST /api/notifications/send - Send notification to specific recipients
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw Errors.UNAUTHORIZED
  }

  const body = await request.json()
  const notificationData = SendNotificationSchema.parse(body)

  try {
    const results = {
      sent: 0,
      failed: 0,
      notifications: [] as any[],
      errors: [] as string[]
    }

    // Process each recipient
    for (const recipient of notificationData.recipients) {
      try {
        // Schedule notification
        const scheduledFor = notificationData.scheduledFor 
          ? new Date(notificationData.scheduledFor)
          : new Date()

        let templateId = notificationData.template.id
        
        // Create temporary template if no template ID provided
        if (!templateId) {
          const tempTemplate = await createTemporaryTemplate(notificationData.template)
          templateId = tempTemplate.id
        }

        const notification = await notificationAutomation.scheduleNotification({
          templateId,
          recipientId: recipient.id,
          recipientType: recipient.type as any,
          channels: notificationData.channels,
          variables: notificationData.variables || {},
          priority: notificationData.priority,
          scheduledFor
        })

        if (notification) {
          results.notifications.push({
            id: notification.id,
            recipient: recipient,
            status: 'SCHEDULED',
            scheduledFor: scheduledFor.toISOString()
          })
          results.sent++
        } else {
          results.failed++
          results.errors.push(`Failed to schedule notification for ${recipient.id}`)
        }

      } catch (error) {
        results.failed++
        results.errors.push(`Failed to send to ${recipient.id}: ${error.message}`)
      }
    }

    // Log notification activity
    await db.auditLog.create({
      data: {
        workspace_id: session.user.workspace_id,
        actor_id: session.user.id,
        entity_type: 'NOTIFICATION',
        entity_id: 'BATCH',
        action: 'SEND',
        after_data: JSON.stringify({
          recipients: notificationData.recipients.length,
          channels: notificationData.channels,
          priority: notificationData.priority,
          sent: results.sent,
          failed: results.failed
        })
      }
    })

    return createSuccessResponse({
      summary: {
        totalRecipients: notificationData.recipients.length,
        sent: results.sent,
        failed: results.failed,
        successRate: `${Math.round((results.sent / notificationData.recipients.length) * 100)}%`
      },
      notifications: results.notifications,
      errors: results.errors
    }, `Notifications processed: ${results.sent} sent, ${results.failed} failed`)

  } catch (error) {
    console.error('Send notification error:', error)
    throw error
  }
})

// POST /api/notifications/send/bulk - Send bulk notifications
export const POST_BULK = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    throw Errors.INSUFFICIENT_PERMISSIONS
  }

  const body = await request.json()
  const bulkData = BulkNotificationSchema.parse(body)

  try {
    // Get recipients based on filter
    const recipients = await getRecipientsFromFilter(bulkData.filter, session.user.workspace_id)

    if (recipients.length === 0) {
      return createSuccessResponse({
        summary: { totalRecipients: 0, sent: 0, failed: 0, successRate: '0%' },
        message: 'No recipients found matching the filter criteria'
      }, 'No recipients found')
    }

    // Convert recipients to notification format
    const notificationRecipients = recipients.map(recipient => ({
      id: recipient.id,
      type: 'USER' as const
    }))

    // Use the regular send function
    const sendResult = await sendNotifications({
      recipients: notificationRecipients,
      template: bulkData.template,
      channels: bulkData.channels,
      variables: bulkData.variables,
      priority: bulkData.priority,
      scheduledFor: bulkData.scheduledFor
    }, session.user)

    return createSuccessResponse(sendResult, 'Bulk notifications sent')

  } catch (error) {
    console.error('Bulk notification error:', error)
    throw error
  }
})

// POST /api/notifications/send/test - Test notification template
export const POST_TEST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw Errors.UNAUTHORIZED
  }

  const body = await request.json()
  const testData = NotificationTestSchema.parse(body)

  try {
    // Send test notification to current user
    const notification = await notificationAutomation.scheduleNotification({
      templateId: testData.templateId,
      recipientId: session.user.id,
      channels: testData.channels,
      variables: testData.variables || {},
      priority: 'LOW'
    })

    return createSuccessResponse({
      notification: {
        id: notification?.id,
        status: 'SENT',
        recipient: session.user.email,
        channels: testData.channels,
        timestamp: new Date().toISOString()
      },
      message: 'Test notification sent successfully'
    }, 'Test notification sent')

  } catch (error) {
    console.error('Test notification error:', error)
    throw error
  }
})

// GET /api/notifications/send/status - Get notification sending status
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw Errors.UNAUTHORIZED
  }

  const { searchParams } = new URL(request.url)
  const notificationId = searchParams.get('id')
  const since = searchParams.get('since')

  try {
    if (notificationId) {
      // Get specific notification status
      const notification = await db.scheduledNotification.findUnique({
        where: { id: notificationId }
      })

      if (!notification) {
        throw Errors.NOT_FOUND
      }

      return createSuccessResponse({
        notification: {
          id: notification.id,
          status: notification.status,
          attempts: notification.attempts,
          lastAttempt: notification.last_attempt?.toISOString(),
          sentAt: notification.sent_at?.toISOString(),
          errorMessage: notification.error_message,
          channels: JSON.parse(notification.channels as string),
          priority: notification.priority
        }
      }, 'Notification status retrieved')
    } else {
      // Get recent notification activity
      const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const notifications = await db.scheduledNotification.findMany({
        where: {
          created_at: { gte: sinceDate }
        },
        orderBy: { created_at: 'desc' },
        take: 100
      })

      const stats = {
        total: notifications.length,
        sent: notifications.filter(n => n.status === 'SENT').length,
        pending: notifications.filter(n => n.status === 'PENDING').length,
        failed: notifications.filter(n => n.status === 'FAILED').length,
        byChannel: {} as Record<string, number>,
        byPriority: {} as Record<string, number>
      }

      notifications.forEach(n => {
        const channels = JSON.parse(n.channels as string)
        channels.forEach((channel: string) => {
          stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1
        })
        stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1
      })

      return createSuccessResponse({
        statistics: stats,
        recentNotifications: notifications.slice(0, 20).map(n => ({
          id: n.id,
          status: n.status,
          priority: n.priority,
          channels: JSON.parse(n.channels as string),
          createdAt: n.created_at.toISOString(),
          sentAt: n.sent_at?.toISOString()
        }))
      }, 'Notification activity retrieved')
    }

  } catch (error) {
    console.error('Get notification status error:', error)
    throw error
  }
})

// Helper functions
async function createTemporaryTemplate(template: any) {
  return await db.notificationTemplate.create({
    data: {
      name: `Temp-${Date.now()}`,
      type: template.type,
      category: 'CUSTOM',
      subject: template.subject || 'Notification',
      body: template.body,
      variables: JSON.stringify([]),
      enabled: true,
      temporary: true
    }
  })
}

async function getRecipientsFromFilter(filter: any = {}, workspaceId: string) {
  const where: any = {
    workspace_id: workspaceId,
    active: true
  }

  if (filter.role) {
    where.role = filter.role
  }

  if (filter.active !== undefined) {
    where.active = filter.active
  }

  return await db.user.findMany({
    where,
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      phone: true
    }
  })
}

async function sendNotifications(data: any, user: any) {
  const results = {
    sent: 0,
    failed: 0,
    notifications: [] as any[],
    errors: [] as string[]
  }

  for (const recipient of data.recipients) {
    try {
      const scheduledFor = data.scheduledFor 
        ? new Date(data.scheduledFor)
        : new Date()

      let templateId = data.template.id
      
      if (!templateId) {
        const tempTemplate = await createTemporaryTemplate(data.template)
        templateId = tempTemplate.id
      }

      const notification = await notificationAutomation.scheduleNotification({
        templateId,
        recipientId: recipient.id,
        recipientType: recipient.type as any,
        channels: data.channels,
        variables: data.variables || {},
        priority: data.priority,
        scheduledFor
      })

      if (notification) {
        results.notifications.push({
          id: notification.id,
          recipient: recipient,
          status: 'SCHEDULED',
          scheduledFor: scheduledFor.toISOString()
        })
        results.sent++
      } else {
        results.failed++
        results.errors.push(`Failed to schedule notification for ${recipient.id}`)
      }

    } catch (error) {
      results.failed++
      results.errors.push(`Failed to send to ${recipient.id}: ${error.message}`)
    }
  }

  return {
    summary: {
      totalRecipients: data.recipients.length,
      sent: results.sent,
      failed: results.failed,
      successRate: `${Math.round((results.sent / data.recipients.length) * 100)}%`
    },
    notifications: results.notifications,
    errors: results.errors
  }
}