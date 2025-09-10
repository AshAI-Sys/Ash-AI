import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { subscription, userAgent, timestamp } = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Store push subscription in database
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          user_id: session.user.id,
          endpoint: subscription.endpoint
        }
      },
      update: {
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent,
        is_active: true,
        lastUsed: new Date()
      },
      create: {
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userAgent,
        is_active: true,
        lastUsed: new Date()
      }
    })

    console.log('🔔 Push subscription stored:', pushSubscription.id)

    return NextResponse.json({
      success: true,
      subscriptionId: pushSubscription.id
    })

  } catch (_error) {
    console.error('Failed to store push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to store subscription' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's active push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        user_id: session.user.id,
        is_active: true
      },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        created_at: true,
        lastUsed: true
      }
    })

    return NextResponse.json({
      subscriptions,
      count: subscriptions.length
    })

  } catch (_error) {
    console.error('Failed to get push subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to get subscriptions' },
      { status: 500 }
    )
  }
}