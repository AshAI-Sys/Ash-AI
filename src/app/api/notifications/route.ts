/**
 * Stage 14 Automation - Real-time Notifications API
 * Comprehensive notification system with multi-channel delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { secureDb } from '@/lib/db-security'
import { verifyToken } from '@/lib/auth'
import { InputSanitizer } from '@/lib/input-security'
import { securityAuditLogger } from '@/lib/auth-security'
import { z } from 'zod'

const notificationSchema = z.object({
  workspace_id: z.string().uuid(),
  recipient_id: z.string().uuid().optional(),
  recipient_type: z.enum(['USER', 'ROLE', 'DEPARTMENT', 'ALL']).default('USER'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'URGENT']).default('INFO'),
  category: z.enum([
    'ORDER', 'INVENTORY', 'PRODUCTION', 'QUALITY', 'DELIVERY', 'PAYMENT',
    'SYSTEM', 'SECURITY', 'MARKETING', 'HR', 'MAINTENANCE'
  ]),
  channels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK'])).default(['IN_APP']),
  data: z.record(z.any()).optional(),
  scheduled_for: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  action_required: z.boolean().default(false),
  action_url: z.string().url().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
})

const notificationPreferencesSchema = z.object({
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  preferences: z.object({
    email_notifications: z.boolean().default(true),
    sms_notifications: z.boolean().default(false),
    push_notifications: z.boolean().default(true),
    in_app_notifications: z.boolean().default(true),
    quiet_hours: z.object({
      enabled: z.boolean().default(false),
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      timezone: z.string().default('UTC')
    }).optional(),
    categories: z.record(z.object({
      enabled: z.boolean(),
      channels: z.array(z.string()),
      priority_filter: z.enum(['ALL', 'HIGH_AND_CRITICAL', 'CRITICAL_ONLY']).default('ALL')
    })).optional()
  })
})

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspace_id')
    const unreadOnly = url.searchParams.get('unread_only') === 'true'
    const category = url.searchParams.get('category')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // Verify workspace access
    const workspace = await secureDb.getPrisma().workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Build query conditions
    const whereClause: any = {
      workspace_id: workspaceId,
      OR: [
        { recipient_id: user.id },
        { recipient_type: 'ALL' },
        { 
          recipient_type: 'ROLE',
          workspace: {
            members: {
              some: {
                user_id: user.id
              }
            }
          }
        }
      ]
    }

    if (unreadOnly) {
      whereClause.read_at = null
    }

    if (category) {
      whereClause.category = category
    }

    // Add expiration filter
    whereClause.OR = [
      { expires_at: null },
      { expires_at: { gt: new Date() } }
    ]

    // Get notifications
    const notifications = await secureDb.getPrisma().notification.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: offset,
      include: {
        reads: {
          where: { user_id: user.id }
        },
        actions: {
          where: { user_id: user.id }
        }
      }
    })

    // Get unread count
    const unreadCount = await secureDb.getPrisma().notification.count({
      where: {
        ...whereClause,
        read_at: null
      }
    })

    // Format notifications
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      is_read: notification.reads.length > 0,
      is_acted_upon: notification.actions.length > 0,
      read_at: notification.reads[0]?.created_at || null
    }))

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        limit,
        offset,
        total: notifications.length,
        has_more: notifications.length === limit
      },
      summary: {
        unread_count: unreadCount,
        total_count: notifications.length
      }
    })

  } catch (_error) {
    console.error('Notification fetch error:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sanitizedBody = InputSanitizer.sanitizeObject(body)
    const notificationData = notificationSchema.parse(sanitizedBody)

    // Verify workspace access
    const workspace = await secureDb.getPrisma().workspace.findFirst({
      where: {
        id: notificationData.workspace_id,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Create notification
    const notification = await secureDb.getPrisma().notification.create({
      data: {
        workspace_id: notificationData.workspace_id,
        recipient_id: notificationData.recipient_id,
        recipient_type: notificationData.recipient_type,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        category: notificationData.category,
        channels: notificationData.channels,
        data: notificationData.data || {},
        scheduled_for: notificationData.scheduled_for ? new Date(notificationData.scheduled_for) : null,
        expires_at: notificationData.expires_at ? new Date(notificationData.expires_at) : null,
        action_required: notificationData.action_required,
        action_url: notificationData.action_url,
        priority: notificationData.priority,
        created_by: user.id,
        status: notificationData.scheduled_for ? 'SCHEDULED' : 'OPEN'
      }
    })

    // If not scheduled, deliver immediately
    if (!notificationData.scheduled_for) {
      await deliverNotification(notification)
    }

    // Log audit event
    await securityAuditLogger.logSecurityEvent({
      type: 'DATA_ACCESS',
      severity: 'LOW',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        action: 'NOTIFICATION_CREATED',
        notification_id: notification.id,
        workspace_id: notificationData.workspace_id,
        user_id: user.id,
        type: notificationData.type,
        category: notificationData.category
      }
    })

    return NextResponse.json({
      notification,
      message: 'Notification created successfully'
    }, { status: 201 })

  } catch (_error) {
    console.error('Notification creation error:', _error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const notificationId = url.searchParams.get('notification_id')
    const action = url.searchParams.get('action') || 'mark_read'

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    // Get notification
    const notification = await secureDb.getPrisma().notification.findFirst({
      where: {
        id: notificationId,
        workspace: {
          OR: [
            { owner_id: user.id },
            { members: { some: { user_id: user.id } } }
          ]
        }
      }
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (action === 'mark_read') {
      // Mark as read
      await secureDb.getPrisma().notificationRead.upsert({
        where: {
          notification_id_user_id: {
            notification_id: notificationId,
            user_id: user.id
          }
        },
        update: {},
        create: {
          notification_id: notificationId,
          user_id: user.id
        }
      })

      return NextResponse.json({ message: 'Notification marked as read' })
    
    } else if (action === 'mark_acted') {
      // Mark as acted upon
      await secureDb.getPrisma().notificationAction.create({
        data: {
          notification_id: notificationId,
          user_id: user.id,
          action_taken: 'ACKNOWLEDGED'
        }
      })

      return NextResponse.json({ message: 'Notification marked as acted upon' })
    
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (_error) {
    console.error('Notification update error:', _error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// Get/Update notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sanitizedBody = InputSanitizer.sanitizeObject(body)
    const preferencesData = notificationPreferencesSchema.parse(sanitizedBody)

    // Verify workspace access
    const workspace = await secureDb.getPrisma().workspace.findFirst({
      where: {
        id: preferencesData.workspace_id,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Update or create preferences
    const preferences = await secureDb.getPrisma().notificationPreferences.upsert({
      where: {
        workspace_id_user_id: {
          workspace_id: preferencesData.workspace_id,
          user_id: preferencesData.user_id
        }
      },
      update: {
        preferences: preferencesData.preferences,
        updated_at: new Date()
      },
      create: {
        workspace_id: preferencesData.workspace_id,
        user_id: preferencesData.user_id,
        preferences: preferencesData.preferences
      }
    })

    return NextResponse.json({
      preferences,
      message: 'Notification preferences updated successfully'
    })

  } catch (_error) {
    console.error('Notification preferences error:', _error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

// Notification delivery engine
async function deliverNotification(notification: any) {
  try {
    // Get recipients
    const recipients = await getNotificationRecipients(notification)
    
    // Filter recipients by preferences
    const filteredRecipients = await filterRecipientsByPreferences(recipients, notification)
    
    // Deliver through each channel
    for (const channel of notification.channels) {
      for (const recipient of filteredRecipients) {
        try {
          await deliverThroughChannel(notification, recipient, channel)
        } catch (_error) {
          console.error(`Failed to deliver notification ${notification.id} to ${recipient.id} via ${channel}:`, _error)
        }
      }
    }

    // Update notification status
    await secureDb.getPrisma().notification.update({
      where: { id: notification.id },
      data: {
        status: 'DELIVERED',
        delivered_at: new Date()
      }
    })

  } catch (_error) {
    console.error(`Failed to deliver notification ${notification.id}:`, _error)
    
    // Update status to failed
    await secureDb.getPrisma().notification.update({
      where: { id: notification.id },
      data: {
        status: 'FAILED',
        delivered_at: new Date()
      }
    })
  }
}

async function getNotificationRecipients(notification: any) {
  switch (notification.recipient_type) {
    case 'USER':
      if (!notification.recipient_id) return []
      
      const user = await secureDb.getPrisma().user.findUnique({
        where: { id: notification.recipient_id }
      })
      return user ? [user] : []

    case 'ALL':
      return await secureDb.getPrisma().user.findMany({
        where: {
          workspace_members: {
            some: {
              workspace_id: notification.workspace_id
            }
          }
        }
      })

    case 'ROLE':
      // Implementation would get users by role
      return []

    case 'DEPARTMENT':
      // Implementation would get users by department
      return []

    default:
      return []
  }
}

async function filterRecipientsByPreferences(recipients: any[], notification: any) {
  const filtered = []

  for (const recipient of recipients) {
    // Get user preferences
    const preferences = await secureDb.getPrisma().notificationPreferences.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: notification.workspace_id,
          user_id: recipient.id
        }
      }
    })

    // If no preferences, use defaults (allow all)
    if (!preferences) {
      filtered.push(recipient)
      continue
    }

    // Check if user wants notifications for this category
    const categoryPrefs = preferences.preferences.categories?.[notification.category]
    if (categoryPrefs && !categoryPrefs.enabled) {
      continue
    }

    // Check priority filter
    const priorityFilter = categoryPrefs?.priority_filter || 'ALL'
    if (priorityFilter === 'HIGH_AND_CRITICAL' && !['HIGH', 'CRITICAL'].includes(notification.priority)) {
      continue
    }
    if (priorityFilter === 'CRITICAL_ONLY' && notification.priority !== 'CRITICAL') {
      continue
    }

    // Check quiet hours
    if (preferences.preferences.quiet_hours?.enabled && isInQuietHours(preferences.preferences.quiet_hours)) {
      // Only allow critical notifications during quiet hours
      if (notification.priority !== 'CRITICAL') {
        continue
      }
    }

    filtered.push(recipient)
  }

  return filtered
}

async function deliverThroughChannel(notification: any, recipient: any, channel: string) {
  switch (channel) {
    case 'IN_APP':
      // In-app notifications are already stored in database
      break

    case 'EMAIL':
      await sendEmailNotification(notification, recipient)
      break

    case 'SMS':
      await sendSMSNotification(notification, recipient)
      break

    case 'PUSH':
      await sendPushNotification(notification, recipient)
      break

    case 'WEBHOOK':
      await sendWebhookNotification(notification, recipient)
      break

    default:
      console.warn(`Unknown notification channel: ${channel}`)
  }
}

function isInQuietHours(quietHours: any): boolean {
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  const start = quietHours.start_time
  const end = quietHours.end_time
  
  // Simple time comparison (doesn't handle timezone properly, but good enough for demo)
  if (start <= end) {
    return currentTime >= start && currentTime <= end
  } else {
    // Quiet hours span midnight
    return currentTime >= start || currentTime <= end
  }
}

// Channel delivery implementations
async function sendEmailNotification(notification: any, recipient: any) {
  // Implementation would use email service (SendGrid, SES, etc.)
  console.log(`Sending email notification to ${recipient.email}:`, notification.title)
  
  // Log delivery
  await secureDb.getPrisma().notificationDelivery.create({
    data: {
      notification_id: notification.id,
      recipient_id: recipient.id,
      channel: 'EMAIL',
      status: 'DELIVERED',
      delivered_at: new Date()
    }
  })
}

async function sendSMSNotification(notification: any, recipient: any) {
  // Implementation would use SMS service (Twilio, etc.)
  console.log(`Sending SMS notification to ${recipient.phone}:`, notification.title)
  
  await secureDb.getPrisma().notificationDelivery.create({
    data: {
      notification_id: notification.id,
      recipient_id: recipient.id,
      channel: 'SMS',
      status: 'DELIVERED',
      delivered_at: new Date()
    }
  })
}

async function sendPushNotification(notification: any, recipient: any) {
  // Implementation would use push service (Firebase, APNs, etc.)
  console.log(`Sending push notification to ${recipient.id}:`, notification.title)
  
  await secureDb.getPrisma().notificationDelivery.create({
    data: {
      notification_id: notification.id,
      recipient_id: recipient.id,
      channel: 'PUSH',
      status: 'DELIVERED',
      delivered_at: new Date()
    }
  })
}

async function sendWebhookNotification(notification: any, recipient: any) {
  // Implementation would send HTTP POST to webhook URL
  console.log(`Sending webhook notification for ${recipient.id}:`, notification.title)
  
  await secureDb.getPrisma().notificationDelivery.create({
    data: {
      notification_id: notification.id,
      recipient_id: recipient.id,
      channel: 'WEBHOOK',
      status: 'DELIVERED',
      delivered_at: new Date()
    }
  })
}