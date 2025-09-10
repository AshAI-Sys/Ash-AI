import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { alertEngine } from '@/lib/ai/alert-system'
import { prisma } from '@/lib/prisma'
import { 
// Ashley AI Alerts API Route - SECURE VERSION
  validateInput, 
  schemas, 
  rateLimit, 
  sanitizeError,
  auditLog,
  securityHeaders,
  sanitize
} from '@/lib/security/validation'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let user_id: string | undefined

  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Session validation
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: securityHeaders
      })
    }

    user_id = session.user.id

    // Rate limiting for alert queries
    const rateLimitKey = `alerts:${user_id}:${Math.floor(Date.now() / 60000)}`
    if (!rateLimit.check(rateLimitKey, 120, 60000)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded' 
      }, { 
        status: 429,
        headers: securityHeaders
      })
    }

    const { searchParams } = new URL(request.url)
    
    // Validate and sanitize query parameters
    const status = sanitize.sql(searchParams.get('status') || '')
    const severity = sanitize.sql(searchParams.get('severity') || '')
    const _category = sanitize.sql(searchParams.get('category') || '')
    const limitParam = searchParams.get('limit')
    
    // Validate limit parameter
    let limit = 50 // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json({ error: 'Invalid limit parameter' }, {
          status: 400,
          headers: securityHeaders
        })
      }
      limit = parsedLimit
    }

    // Build safe filter conditions
    const whereClause: Record<string, unknown> = {}
    
    // Only allow valid enum values
    const validStatuses = ['OPEN', 'ACK', 'RESOLVED', 'IGNORED']
    const validSeverities = ['P1', 'P2', 'P3']
    const validCategories = ['PRODUCTION', 'FINANCE', 'INVENTORY', 'HR', 'DATA']
    
    if (status && validStatuses.includes(status)) {
      whereClause.status = status
    }
    if (severity && validSeverities.includes(severity)) {
      whereClause.severity = severity
    }
    if (category && validCategories.includes(category)) {
      whereClause.category = category
    }

    // Mock alerts since Alert table doesn't exist yet
    const mockAlerts = [
      {
        id: '1',
        title: 'Low Stock Alert',
        summary: 'White T-shirts running low (5 remaining)',
        recommendation: 'Reorder 50 units from supplier A',
        severity: 'P2',
        status: 'OPEN',
        category: 'INVENTORY',
        created_at: new Date(),
        entity_ref: {},
        alert_audits: []
      },
      {
        id: '2', 
        title: 'Production Delay',
        summary: 'Order #1023 is 2 days behind schedule',
        recommendation: 'Reassign to available operator or extend deadline',
        severity: 'P1',
        status: 'OPEN',
        category: 'PRODUCTION',
        created_at: new Date(),
        entity_ref: {},
        alert_audits: []
      }
    ]

    const alerts = mockAlerts.filter(alert => {
      if (status && alert.status !== status) return false
      if (severity && alert.severity !== severity) return false
      if (category && alert.category !== category) return false
      return true
    }).slice(0, limit)

    // Mock summary data
    const summary = [
      { severity: 'P1', status: 'OPEN', _count: { id: 1 } },
      { severity: 'P2', status: 'OPEN', _count: { id: 1 } }
    ]

    const summaryFormatted = {
      total: alerts.length,
      byStatus: {
        open: summary.filter(s => s.status === 'OPEN').reduce((sum, s) => sum + s._count.id, 0),
        acknowledged: summary.filter(s => s.status === 'ACK').reduce((sum, s) => sum + s._count.id, 0),
        resolved: summary.filter(s => s.status === 'RESOLVED').reduce((sum, s) => sum + s._count.id, 0)
      },
      bySeverity: {
        P1: summary.filter(s => s.severity === 'P1').reduce((sum, s) => sum + s._count.id, 0),
        P2: summary.filter(s => s.severity === 'P2').reduce((sum, s) => sum + s._count.id, 0),
        P3: summary.filter(s => s.severity === 'P3').reduce((sum, s) => sum + s._count.id, 0)
      }
    }

    // Sanitize alert data before sending to client
    const sanitizedAlerts = alerts.map(alert => ({
      ...alert,
      // Sanitize potentially dangerous content
      title: sanitize.text(alert.title),
      summary: sanitize.text(alert.summary),
      recommendation: alert.recommendation ? sanitize.text(alert.recommendation) : null,
      // Remove sensitive entity references for non-admin users
      entity_ref: session.user.role === Role.ADMIN ? alert.entity_ref : {},
    }))

    await auditLog.log({
      action: 'alerts_viewed',
      user_id,
      ip: clientIP,
      userAgent,
      success: true,
      resource: 'alerts'
    })

    return NextResponse.json({
      alerts: sanitizedAlerts,
      summary: summaryFormatted,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        ...securityHeaders,
        'X-Response-Time': `${Date.now() - startTime}ms`,
      }
    })

  } catch (_error) {
    await auditLog.log({
      action: 'alerts_error',
      user_id,
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown error'
    })

    console.error('Alerts API error:', _error)
    return NextResponse.json({
      error: sanitizeError(_error, process.env.NODE_ENV === 'development')
    }, { 
      status: 500,
      headers: securityHeaders
    })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let user_id: string | undefined

  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Session validation
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: securityHeaders
      })
    }

    user_id = session.user.id

    // Rate limiting for alert actions (more restrictive)
    const rateLimitKey = `alerts_action:${user_id}:${Math.floor(Date.now() / 60000)}`
    if (!rateLimit.check(rateLimitKey, 30, 60000)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { 
        status: 429,
        headers: securityHeaders
      })
    }

    // Input validation
    let body: Record<string, unknown>
    try {
      const rawBody = await request.text()
      if (rawBody.length > 5000) { // 5KB limit for alert actions
        throw new Error('Request body too large')
      }
      body = JSON.parse(rawBody)
    } catch (_error) {
      return NextResponse.json({ error: 'Invalid request format' }, { 
        status: 400,
        headers: securityHeaders
      })
    }

    // Validate input schema
    const validation = validateInput(schemas.alertAction, body)
    if (!validation.success) {
      await auditLog.log({
        action: 'alert_action_invalid_input',
        user_id,
        ip: clientIP,
        success: false,
        error: validation.error
      })
      return NextResponse.json({ error: 'Invalid input parameters' }, { 
        status: 400,
        headers: securityHeaders
      })
    }

    const { action, alertId, note } = validation.data

    // Verify alert exists and user has access
    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    })

    if (!alert) {
      await auditLog.log({
        action: 'alert_action_not_found',
        user_id,
        ip: clientIP,
        success: false,
        error: 'Alert not found'
      })
      return NextResponse.json({ error: 'Alert not found' }, { 
        status: 404,
        headers: securityHeaders
      })
    }

    // Check if alert is already resolved (prevent replay attacks)
    if (alert.status === 'RESOLVED' && action !== 'acknowledge') {
      return NextResponse.json({ error: 'Alert already resolved' }, { 
        status: 400,
        headers: securityHeaders
      })
    }

    let result

    try {
      switch (action) {
        case 'acknowledge':
          result = await alertEngine.acknowledgeAlert(alertId, user_id, note ? sanitize.text(note) : undefined)
          break

        case 'resolve':
          // Only admins and managers can resolve alerts
          if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
            await auditLog.log({
              action: 'alert_resolve_denied',
              user_id,
              ip: clientIP,
              success: false,
              error: 'Insufficient permissions to resolve alerts'
            })
            return NextResponse.json({ error: 'Insufficient permissions' }, { 
              status: 403,
              headers: securityHeaders
            })
          }
          result = await alertEngine.resolveAlert(alertId, user_id, note ? sanitize.text(note) : undefined)
          break

        case 'ignore':
          // Only admins can ignore alerts
          if (session.user.role !== Role.ADMIN) {
            await auditLog.log({
              action: 'alert_ignore_denied',
              user_id,
              ip: clientIP,
              success: false,
              error: 'Only admins can ignore alerts'
            })
            return NextResponse.json({ error: 'Only admins can ignore alerts' }, { 
              status: 403,
              headers: securityHeaders
            })
          }

          await prisma.alert.update({
            where: { id: alertId },
            data: { status: 'IGNORED' }
          })

          await prisma.alertAudit.create({
            data: {
              alert_id: alertId,
              action: 'IGNORE',
              actor_id: user_id,
              note: note ? sanitize.text(note) : null
            }
          })
          result = { success: true }
          break

        case 'process':
          // Only admins can trigger alert processing
          if (session.user.role !== Role.ADMIN) {
            return NextResponse.json({ error: 'Only admins can trigger alert processing' }, { 
              status: 403,
              headers: securityHeaders
            })
          }
          result = await alertEngine.processAlerts()
          break

        default:
          return NextResponse.json({ error: 'Invalid action' }, { 
            status: 400,
            headers: securityHeaders
          })
      }

      await auditLog.log({
        action: `alert_${action}`,
        user_id,
        ip: clientIP,
        userAgent,
        success: true,
        resource: `alert:${alertId}`
      })

      return NextResponse.json({
        success: true,
        result,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          ...securityHeaders,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        }
      })

    } catch (alertError) {
      await auditLog.log({
        action: `alert_${action}_error`,
        user_id,
        ip: clientIP,
        success: false,
        error: alertError instanceof Error ? alertError.message : 'Alert processing error'
      })

      return NextResponse.json({
        error: 'Alert processing failed'
      }, { 
        status: 500,
        headers: securityHeaders
      })
    }

  } catch (_error) {
    await auditLog.log({
      action: 'alert_unexpected_error',
      user_id,
      success: false,
      error: _error instanceof Error ? _error.message : 'Unknown error'
    })

    console.error('Alerts API error:', _error)
    return NextResponse.json({
      error: sanitizeError(_error, process.env.NODE_ENV === 'development')
    }, { 
      status: 500,
      headers: securityHeaders
    })
  }
}

// Background job endpoint to process alerts - SECURED
export async function PUT(request: NextRequest) {
  try {
    // Verify cron job authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET
    
    if (!expectedToken) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      await auditLog.log({
        action: 'alert_cron_unauthorized',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        success: false,
        error: 'Invalid cron authorization'
      })
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: securityHeaders
      })
    }

    console.log('Processing Ashley AI alerts via cron...')
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Alert processing timeout')), 30000)
    )
    
    const processPromise = alertEngine.processAlerts()
    
    const newAlerts = await Promise.race([processPromise, timeoutPromise])
    
    await auditLog.log({
      action: 'alert_cron_processed',
      success: true,
      resource: 'alert_system'
    })
    
    return NextResponse.json({
      success: true,
      newAlerts: Array.isArray(newAlerts) ? newAlerts.length : 0,
      timestamp: new Date().toISOString()
    }, {
      headers: securityHeaders
    })

  } catch (_error) {
    await auditLog.log({
      action: 'alert_cron_error',
      success: false,
      error: _error instanceof Error ? _error.message : 'Cron processing error'
    })

    console.error('Alert processing error:', _error)
    return NextResponse.json({
      error: 'Alert processing failed'
    }, { 
      status: 500,
      headers: securityHeaders
    })
  }
}

// Disable other HTTP methods
export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: securityHeaders
  })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { 
    status: 405,
    headers: securityHeaders
  })
}