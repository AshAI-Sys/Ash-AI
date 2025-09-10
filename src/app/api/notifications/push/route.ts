import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import webpush from 'web-push'

// Configure web-push with fallback keys for development
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BMxD5VpJv7XE-NbV4jUNLG7lP9r5M-hqhKvNq5m3lJ7A8tY1v2d2mN7sW3pK5rB9cV8fG4h6j2l8n9qR1tU3vW5yZ'
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'example-private-key-for-development-only'

if (vapidPublicKey && vapidPrivateKey && vapidPublicKey !== 'BMxD5VpJv7XE-NbV4jUNLG7lP9r5M-hqhKvNq5m3lJ7A8tY1v2d2mN7sW3pK5rB9cV8fG4h6j2l8n9qR1tU3vW5yZ') {
  webpush.setVapidDetails(
    'mailto:admin@sorbetes.com',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { subscription, payload, targetUsers } = await request.json()

    if (!payload) {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      )
    }

    let subscriptions = []

    if (subscription) {
      // Send to specific subscription
      subscriptions = [subscription]
    } else if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      const userSubscriptions = await prisma.pushSubscription.findMany({
        where: {
          user_id: { in: targetUsers },
          is_active: true
        }
      })
      
      subscriptions = userSubscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey
        }
      }))
    } else {
      // Send to all users in the same workspace
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { workspace: true }
      })

      if (user?.workspace) {
        const workspaceSubscriptions = await prisma.pushSubscription.findMany({
          where: {
            user: {
              workspace_id: user.workspace_id
            },
            is_active: true
          }
        })

        subscriptions = workspaceSubscriptions.map(sub => ({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey
          }
        }))
      }
    }

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found' },
        { status: 404 }
      )
    }

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload))
          return { success: true, endpoint: sub.endpoint }
        } catch (_error) {
          console.error('Failed to send push notification:', error)
          
          // If subscription is invalid, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.updateMany({
              where: { endpoint: sub.endpoint },
              data: { is_active: false }
            })
          }
          
          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    // Store notification in database
    await prisma.notification.create({
      data: {
        user_id: session.user.id,
        title: payload.title,
        message: payload.body,
        type: payload.data?.type || 'system_alert',
        data: payload.data ? JSON.stringify(payload.data) : null,
        priority: payload.requireInteraction ? 'high' : 'medium',
        isRead: false
      }
    })

    console.log(`🔔 Push notifications sent: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      results: results.map(r => 
        r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }
      )
    })

  } catch (_error) {
    console.error('Failed to send push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}

// Send notification to specific users
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userIds, title, body, data, type = 'system_alert', priority = 'medium' } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      )
    }

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Get active subscriptions for target users
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        user_id: { in: userIds },
        is_active: true
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found for target users' },
        { status: 404 }
      )
    }

    const payload = {
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        type,
        ...data
      },
      requireInteraction: priority === 'urgent' || priority === 'high',
      vibrate: priority === 'urgent' ? [500, 200, 500] : [200, 100, 200]
    }

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dhKey,
              auth: sub.authKey
            }
          }

          await webpush.sendNotification(subscription, JSON.stringify(payload))
          
          // Store notification for this user
          await prisma.notification.create({
            data: {
              user_id: sub.user_id,
              title,
              message: body,
              type,
              data: data ? JSON.stringify(data) : null,
              priority,
              isRead: false
            }
          })

          return { 
            success: true, 
            user_id: sub.user_id, 
            userName: sub.user.name,
            endpoint: sub.endpoint 
          }
        } catch (_error) {
          console.error(`Failed to send notification to user ${sub.user_id}:`, error)
          
          // Mark invalid subscriptions as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { is_active: false }
            })
          }
          
          return { 
            success: false, 
            user_id: sub.user_id, 
            userName: sub.user.name,
            error: error.message 
          }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    console.log(`🔔 Targeted notifications sent: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      results: results.map(r => 
        r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }
      )
    })

  } catch (_error) {
    console.error('Failed to send targeted notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}