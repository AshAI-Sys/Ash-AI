import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import WebSocketManager from '@/lib/realtime/websocket-manager'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const unread = searchParams.get('unread') === 'true'

    // Get recent alerts from Redis
    let alerts = await redis.lrange('alerts:recent', 0, limit - 1)
    let parsedAlerts = alerts.map(alert => JSON.parse(alert))

    // Apply filters
    if (type) {
      parsedAlerts = parsedAlerts.filter(alert => alert.type === type)
    }

    if (severity) {
      parsedAlerts = parsedAlerts.filter(alert => alert.severity === severity)
    }

    if (unread) {
      // Get read alerts for this user
      const readAlerts = await redis.smembers(`alerts:read:${session.user.id}`)
      parsedAlerts = parsedAlerts.filter(alert => !readAlerts.includes(alert.id))
    }

    // Get alert statistics
    const stats = await getAlertStatistics(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        alerts: parsedAlerts,
        count: parsedAlerts.length,
        filters: { type, severity, unread },
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in alerts GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, alertId, data } = body

    switch (action) {
      case 'mark_read':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' }, 
            { status: 400 }
          )
        }
        
        await redis.sadd(`alerts:read:${session.user.id}`, alertId)
        
        return NextResponse.json({
          success: true,
          message: 'Alert marked as read',
          timestamp: new Date().toISOString()
        })

      case 'mark_all_read':
        const { type: markAllType } = data || {}
        
        // Get recent alerts
        let alerts = await redis.lrange('alerts:recent', 0, 99)
        let alertIds = alerts.map(alert => JSON.parse(alert).id)
        
        // Filter by type if specified
        if (markAllType) {
          const parsedAlerts = alerts.map(alert => JSON.parse(alert))
          alertIds = parsedAlerts
            .filter(alert => alert.type === markAllType)
            .map(alert => alert.id)
        }
        
        if (alertIds.length > 0) {
          await redis.sadd(`alerts:read:${session.user.id}`, ...alertIds)
        }
        
        return NextResponse.json({
          success: true,
          message: `${alertIds.length} alerts marked as read`,
          timestamp: new Date().toISOString()
        })

      case 'create_custom':
        const { type: customType, severity: customSeverity, title, message, orderId, machineId } = data
        
        if (!customType || !customSeverity || !title || !message) {
          return NextResponse.json(
            { error: 'Type, severity, title, and message are required for custom alerts' }, 
            { status: 400 }
          )
        }
        
        if (!['low', 'medium', 'high', 'critical'].includes(customSeverity)) {
          return NextResponse.json(
            { error: 'Invalid severity. Must be: low, medium, high, or critical' }, 
            { status: 400 }
          )
        }
        
        const validTypes = ['bottleneck', 'quality', 'machine', 'inventory', 'delay', 'custom']
        if (!validTypes.includes(customType)) {
          return NextResponse.json(
            { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, 
            { status: 400 }
          )
        }
        
        const wsManager = WebSocketManager.getInstance()
        
        const customAlert = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: customType,
          severity: customSeverity,
          title,
          message,
          orderId,
          machineId,
          timestamp: new Date(),
          createdBy: session.user.id
        }
        
        await wsManager.broadcastAlert(customAlert)
        
        return NextResponse.json({
          success: true,
          data: {
            alert: customAlert,
            message: 'Custom alert created and broadcasted',
            timestamp: new Date().toISOString()
          }
        })

      case 'dismiss':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' }, 
            { status: 400 }
          )
        }
        
        // Mark as read and dismissed
        await redis.sadd(`alerts:read:${session.user.id}`, alertId)
        await redis.sadd(`alerts:dismissed:${session.user.id}`, alertId)
        
        return NextResponse.json({
          success: true,
          message: 'Alert dismissed',
          timestamp: new Date().toISOString()
        })

      case 'snooze':
        if (!alertId || !data?.snoozeMinutes) {
          return NextResponse.json(
            { error: 'Alert ID and snoozeMinutes are required' }, 
            { status: 400 }
          )
        }
        
        const snoozeUntil = new Date(Date.now() + data.snoozeMinutes * 60 * 1000)
        await redis.setex(
          `alerts:snoozed:${session.user.id}:${alertId}`,
          data.snoozeMinutes * 60,
          snoozeUntil.toISOString()
        )
        
        return NextResponse.json({
          success: true,
          message: `Alert snoozed until ${snoozeUntil.toLocaleString()}`,
          timestamp: new Date().toISOString()
        })

      case 'get_preferences':
        const preferences = await getAlertPreferences(session.user.id)
        
        return NextResponse.json({
          success: true,
          data: {
            preferences,
            timestamp: new Date().toISOString()
          }
        })

      case 'update_preferences':
        const { preferences: newPreferences } = data
        
        if (!newPreferences) {
          return NextResponse.json(
            { error: 'Preferences object is required' }, 
            { status: 400 }
          )
        }
        
        await updateAlertPreferences(session.user.id, newPreferences)
        
        return NextResponse.json({
          success: true,
          message: 'Alert preferences updated',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in alerts POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Helper functions
async function getAlertStatistics(userId: string) {
  try {
    // Get all recent alerts
    const alerts = await redis.lrange('alerts:recent', 0, 99)
    const parsedAlerts = alerts.map(alert => JSON.parse(alert))
    
    // Get read and dismissed alerts for user
    const readAlerts = await redis.smembers(`alerts:read:${userId}`)
    const dismissedAlerts = await redis.smembers(`alerts:dismissed:${userId}`)
    
    // Calculate statistics
    const totalAlerts = parsedAlerts.length
    const unreadCount = parsedAlerts.filter(alert => !readAlerts.includes(alert.id)).length
    const criticalCount = parsedAlerts.filter(alert => alert.severity === 'critical').length
    const highCount = parsedAlerts.filter(alert => alert.severity === 'high').length
    
    // Group by type
    const byType = parsedAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = parsedAlerts.filter(alert => 
      new Date(alert.timestamp) > last24Hours
    ).length

    return {
      total: totalAlerts,
      unread: unreadCount,
      critical: criticalCount,
      high: highCount,
      dismissed: dismissedAlerts.length,
      byType,
      recent24h: recentCount
    }
    
  } catch (error) {
    console.error('Error getting alert statistics:', error)
    return {
      total: 0,
      unread: 0,
      critical: 0,
      high: 0,
      dismissed: 0,
      byType: {},
      recent24h: 0
    }
  }
}

async function getAlertPreferences(userId: string) {
  try {
    const preferences = await redis.get(`alert_preferences:${userId}`)
    
    if (preferences) {
      return JSON.parse(preferences)
    }
    
    // Return default preferences
    return {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      severityFilter: ['high', 'critical'], // Only show high and critical by default
      typeFilters: {
        bottleneck: true,
        quality: true,
        machine: true,
        inventory: true,
        delay: true,
        custom: true
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00'
      },
      soundEnabled: true,
      autoMarkReadDelay: 30 // seconds
    }
    
  } catch (error) {
    console.error('Error getting alert preferences:', error)
    return null
  }
}

async function updateAlertPreferences(userId: string, preferences: any) {
  try {
    await redis.setex(
      `alert_preferences:${userId}`,
      86400 * 30, // 30 days TTL
      JSON.stringify(preferences)
    )
    
    return true
    
  } catch (error) {
    console.error('Error updating alert preferences:', error)
    return false
  }
}