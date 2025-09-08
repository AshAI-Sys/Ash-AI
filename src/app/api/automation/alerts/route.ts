/**
 * Stage 14 Automation - Intelligent Alerts API
 * AI-powered alert system for proactive business monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { secureDb } from '@/lib/db-security'
import { verifyToken } from '@/lib/auth'
import { InputSanitizer } from '@/lib/input-security'
import { securityAuditLogger } from '@/lib/auth-security'
import { z } from 'zod'

const alertRuleSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    'INVENTORY', 'SALES', 'PRODUCTION', 'QUALITY', 'FINANCE', 
    'DELIVERY', 'SYSTEM', 'SECURITY', 'PERFORMANCE'
  ]),
  metric: z.string(),
  condition: z.object({
    operator: z.enum(['>', '<', '>=', '<=', '==', '!=', 'CHANGE_BY_PERCENT', 'TREND_UP', 'TREND_DOWN']),
    value: z.number(),
    comparison_period: z.enum(['5m', '15m', '1h', '1d', '1w', '1m']).optional()
  }),
  threshold: z.object({
    warning: z.number().optional(),
    critical: z.number(),
    recovery: z.number().optional()
  }),
  frequency: z.enum(['REALTIME', 'EVERY_5M', 'EVERY_15M', 'HOURLY', 'DAILY']).default('EVERY_15M'),
  channels: z.array(z.enum(['EMAIL', 'SMS', 'SLACK', 'WEBHOOK', 'IN_APP'])).default(['EMAIL']),
  recipients: z.array(z.string().uuid()),
  is_active: z.boolean().default(true),
  auto_resolve: z.boolean().default(false),
  escalation_rules: z.array(z.object({
    delay_minutes: z.number().min(1),
    channels: z.array(z.string()),
    recipients: z.array(z.string().uuid())
  })).optional()
})

const alertSchema = z.object({
  workspace_id: z.string().uuid(),
  alert_rule_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.enum([
    'INVENTORY', 'SALES', 'PRODUCTION', 'QUALITY', 'FINANCE', 
    'DELIVERY', 'SYSTEM', 'SECURITY', 'PERFORMANCE'
  ]),
  metric_name: z.string(),
  current_value: z.number(),
  threshold_value: z.number(),
  affected_entities: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  auto_resolve: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspace_id')
    const type = url.searchParams.get('type') || 'alerts' // 'alerts' or 'rules'
    const status = url.searchParams.get('status')
    const severity = url.searchParams.get('severity')
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

    if (type === 'rules') {
      // Get alert rules
      const alertRules = await secureDb.getPrisma().alertRule.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              alerts: true
            }
          },
          alerts: {
            where: {
              created_at: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            orderBy: { created_at: 'desc' },
            take: 5
          }
        }
      })

      return NextResponse.json({
        alert_rules: alertRules,
        summary: {
          total_rules: alertRules.length,
          active_rules: alertRules.filter(r => r.is_active).length,
          total_alerts_generated: alertRules.reduce((sum, r) => sum + r._count.alerts, 0)
        }
      })
    }

    // Get alerts
    const whereClause: any = {
      workspace_id: workspaceId
    }

    if (status) {
      whereClause.status = status
    }

    if (severity) {
      whereClause.severity = severity
    }

    if (category) {
      whereClause.category = category
    }

    const alerts = await secureDb.getPrisma().alert.findMany({
      where: whereClause,
      orderBy: [
        { severity: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: offset,
      include: {
        alert_rule: {
          select: {
            name: true,
            category: true
          }
        },
        acknowledgments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Get alert statistics
    const alertStats = await getAlertStatistics(workspaceId)

    return NextResponse.json({
      alerts,
      statistics: alertStats,
      pagination: {
        limit,
        offset,
        total: alerts.length,
        has_more: alerts.length === limit
      }
    })

  } catch (_error) {
    console.error('Alert fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
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

    // Determine if this is creating an alert rule or an alert
    if (sanitizedBody.metric && sanitizedBody.condition) {
      return await createAlertRule(sanitizedBody, user, request)
    } else {
      return await createAlert(sanitizedBody, user, request)
    }

  } catch (_error) {
    console.error('Alert creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const alertId = url.searchParams.get('alert_id')
    const action = url.searchParams.get('action')

    if (!alertId || !action) {
      return NextResponse.json({ error: 'Alert ID and action required' }, { status: 400 })
    }

    // Get alert
    const alert = await secureDb.getPrisma().alert.findFirst({
      where: {
        id: alertId,
        workspace: {
          OR: [
            { owner_id: user.id },
            { members: { some: { user_id: user.id } } }
          ]
        }
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const body = await request.json()
    const sanitizedBody = InputSanitizer.sanitizeObject(body)

    switch (action) {
      case 'acknowledge':
        await acknowledgeAlert(alertId, user.id, sanitizedBody.comment)
        return NextResponse.json({ message: 'Alert acknowledged successfully' })

      case 'resolve':
        await resolveAlert(alertId, user.id, sanitizedBody.resolution_note)
        return NextResponse.json({ message: 'Alert resolved successfully' })

      case 'escalate':
        await escalateAlert(alertId, user.id, sanitizedBody.escalation_reason)
        return NextResponse.json({ message: 'Alert escalated successfully' })

      case 'snooze':
        const snoozeUntil = new Date(Date.now() + (sanitizedBody.snooze_minutes || 60) * 60 * 1000)
        await snoozeAlert(alertId, user.id, snoozeUntil)
        return NextResponse.json({ message: 'Alert snoozed successfully' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (_error) {
    console.error('Alert action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform alert action' },
      { status: 500 }
    )
  }
}

// Create alert rule
async function createAlertRule(ruleData: any, user: any, request: NextRequest) {
  const validatedData = alertRuleSchema.parse(ruleData)

  // Verify workspace access
  const workspace = await secureDb.getPrisma().workspace.findFirst({
    where: {
      id: validatedData.workspace_id,
      OR: [
        { owner_id: user.id },
        { members: { some: { user_id: user.id } } }
      ]
    }
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Create alert rule
  const alertRule = await secureDb.getPrisma().alertRule.create({
    data: {
      workspace_id: validatedData.workspace_id,
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category,
      metric: validatedData.metric,
      condition: validatedData.condition,
      threshold: validatedData.threshold,
      frequency: validatedData.frequency,
      channels: validatedData.channels,
      recipients: validatedData.recipients,
      is_active: validatedData.is_active,
      auto_resolve: validatedData.auto_resolve,
      escalation_rules: validatedData.escalation_rules || [],
      created_by: user.id
    }
  })

  // Start monitoring if active
  if (validatedData.is_active) {
    await startAlertMonitoring(alertRule)
  }

  // Log audit event
  await securityAuditLogger.logSecurityEvent({
    type: 'CONFIGURATION_CHANGE',
    severity: 'MEDIUM',
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    metadata: {
      action: 'ALERT_RULE_CREATED',
      alert_rule_id: alertRule.id,
      workspace_id: validatedData.workspace_id,
      user_id: user.id,
      metric: validatedData.metric
    }
  })

  return NextResponse.json({
    alert_rule: alertRule,
    message: 'Alert rule created successfully'
  }, { status: 201 })
}

// Create manual alert
async function createAlert(alertData: any, user: any, request: NextRequest) {
  const validatedData = alertSchema.parse(alertData)

  // Verify workspace access
  const workspace = await secureDb.getPrisma().workspace.findFirst({
    where: {
      id: validatedData.workspace_id,
      OR: [
        { owner_id: user.id },
        { members: { some: { user_id: user.id } } }
      ]
    }
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  // Create alert
  const alert = await secureDb.getPrisma().alert.create({
    data: {
      workspace_id: validatedData.workspace_id,
      alert_rule_id: validatedData.alert_rule_id,
      title: validatedData.title,
      message: validatedData.message,
      severity: validatedData.severity,
      category: validatedData.category,
      metric_name: validatedData.metric_name,
      current_value: validatedData.current_value,
      threshold_value: validatedData.threshold_value,
      affected_entities: validatedData.affected_entities || [],
      metadata: validatedData.metadata || {},
      status: 'OPEN',
      created_by: user.id
    }
  })

  // Send alert notifications
  await sendAlertNotifications(alert, workspace)

  // Log audit event
  await securityAuditLogger.logSecurityEvent({
    type: 'SECURITY_INCIDENT',
    severity: validatedData.severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    metadata: {
      action: 'ALERT_CREATED',
      alert_id: alert.id,
      workspace_id: validatedData.workspace_id,
      user_id: user.id,
      severity: validatedData.severity,
      category: validatedData.category
    }
  })

  return NextResponse.json({
    alert,
    message: 'Alert created successfully'
  }, { status: 201 })
}

// Alert actions
async function acknowledgeAlert(alertId: string, userId: string, comment?: string) {
  // Create acknowledgment record
  await secureDb.getPrisma().alertAcknowledgment.create({
    data: {
      alert_id: alertId,
      user_id: userId,
      comment: comment || null
    }
  })

  // Update alert status
  await secureDb.getPrisma().alert.update({
    where: { id: alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledged_at: new Date(),
      acknowledged_by: userId
    }
  })
}

async function resolveAlert(alertId: string, userId: string, resolutionNote?: string) {
  await secureDb.getPrisma().alert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolved_at: new Date(),
      resolved_by: userId,
      resolution_note: resolutionNote || null
    }
  })
}

async function escalateAlert(alertId: string, userId: string, escalationReason?: string) {
  // Get current alert
  const alert = await secureDb.getPrisma().alert.findUnique({
    where: { id: alertId },
    include: { alert_rule: true }
  })

  if (!alert) return

  // Create escalation record
  await secureDb.getPrisma().alertEscalation.create({
    data: {
      alert_id: alertId,
      escalated_by: userId,
      reason: escalationReason || null,
      previous_severity: alert.severity
    }
  })

  // Increase severity
  const newSeverity = escalateSeverity(alert.severity)
  
  await secureDb.getPrisma().alert.update({
    where: { id: alertId },
    data: {
      severity: newSeverity,
      escalated_at: new Date(),
      escalated_by: userId
    }
  })

  // Send escalation notifications
  if (alert.alert_rule?.escalation_rules) {
    await sendEscalationNotifications(alert, newSeverity)
  }
}

async function snoozeAlert(alertId: string, userId: string, snoozeUntil: Date) {
  await secureDb.getPrisma().alert.update({
    where: { id: alertId },
    data: {
      status: 'SNOOZED',
      snoozed_until: snoozeUntil,
      snoozed_by: userId
    }
  })
}

// Alert monitoring and evaluation
async function startAlertMonitoring(alertRule: any) {
  console.log(`Starting monitoring for alert rule: ${alertRule.name}`)
  
  // In a real implementation, this would:
  // 1. Register the rule with a monitoring service
  // 2. Set up scheduled evaluation based on frequency
  // 3. Configure metric collection endpoints
}

async function evaluateAlertRule(alertRule: any) {
  try {
    // Get current metric value
    const currentValue = await getCurrentMetricValue(alertRule.metric, alertRule.workspace_id)
    
    // Evaluate condition
    const shouldAlert = evaluateAlertCondition(
      currentValue,
      alertRule.condition,
      alertRule.threshold
    )

    if (shouldAlert) {
      // Create alert
      const alert = await secureDb.getPrisma().alert.create({
        data: {
          workspace_id: alertRule.workspace_id,
          alert_rule_id: alertRule.id,
          title: `${alertRule.name} - Threshold Exceeded`,
          message: generateAlertMessage(alertRule, currentValue),
          severity: getSeverityFromValue(currentValue, alertRule.threshold),
          category: alertRule.category,
          metric_name: alertRule.metric,
          current_value: currentValue,
          threshold_value: alertRule.threshold.critical,
          status: 'OPEN'
        }
      })

      // Send notifications
      const workspace = await secureDb.getPrisma().workspace.findUnique({
        where: { id: alertRule.workspace_id }
      })
      
      if (workspace) {
        await sendAlertNotifications(alert, workspace)
      }
    }

  } catch (_error) {
    console.error(`Failed to evaluate alert rule ${alertRule.id}:`, error)
  }
}

// Notification sending
async function sendAlertNotifications(alert: any, workspace: any) {
  // Get alert rule for channel configuration
  const alertRule = await secureDb.getPrisma().alertRule.findUnique({
    where: { id: alert.alert_rule_id }
  })

  const channels = alertRule?.channels || ['EMAIL']
  const recipients = alertRule?.recipients || []

  for (const channel of channels) {
    for (const recipientId of recipients) {
      try {
        await sendAlertNotification(alert, recipientId, channel, workspace)
      } catch (_error) {
        console.error(`Failed to send alert notification via ${channel} to ${recipientId}:`, error)
      }
    }
  }
}

async function sendAlertNotification(alert: any, recipientId: string, channel: string, workspace: any) {
  switch (channel) {
    case 'EMAIL':
      await sendEmailAlert(alert, recipientId, workspace)
      break
    case 'SMS':
      await sendSMSAlert(alert, recipientId, workspace)
      break
    case 'SLACK':
      await sendSlackAlert(alert, recipientId, workspace)
      break
    case 'WEBHOOK':
      await sendWebhookAlert(alert, recipientId, workspace)
      break
    case 'IN_APP':
      await sendInAppAlert(alert, recipientId, workspace)
      break
    default:
      console.warn(`Unknown alert channel: ${channel}`)
  }
}

async function sendEscalationNotifications(alert: any, newSeverity: string) {
  // Implementation would send notifications to escalation contacts
  console.log(`Sending escalation notifications for alert ${alert.id} with severity ${newSeverity}`)
}

// Helper functions
async function getAlertStatistics(workspaceId: string) {
  const now = new Date()
  const last24h = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalAlerts,
    openAlerts,
    criticalAlerts,
    alerts24h,
    alerts7d,
    resolvedAlerts
  ] = await Promise.all([
    secureDb.getPrisma().alert.count({ where: { workspace_id: workspaceId } }),
    secureDb.getPrisma().alert.count({ where: { workspace_id: workspaceId, status: 'OPEN' } }),
    secureDb.getPrisma().alert.count({ where: { workspace_id: workspaceId, severity: 'CRITICAL', status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
    secureDb.getPrisma().alert.count({ where: { workspace_id: workspaceId, created_at: { gte: last24h } } }),
    secureDb.getPrisma().alert.count({ where: { workspace_id: workspaceId, created_at: { gte: last7d } } }),
    secureDb.getPrisma().alert.count({ where: { workspace_id: workspaceId, status: 'RESOLVED' } })
  ])

  return {
    total_alerts: totalAlerts,
    open_alerts: openAlerts,
    critical_alerts: criticalAlerts,
    alerts_last_24h: alerts24h,
    alerts_last_7d: alerts7d,
    resolved_alerts: resolvedAlerts,
    resolution_rate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0
  }
}

function evaluateAlertCondition(currentValue: number, condition: any, threshold: any): boolean {
  switch (condition.operator) {
    case '>':
      return currentValue > threshold.critical
    case '<':
      return currentValue < threshold.critical
    case '>=':
      return currentValue >= threshold.critical
    case '<=':
      return currentValue <= threshold.critical
    case '==':
      return currentValue === threshold.critical
    case '!=':
      return currentValue !== threshold.critical
    default:
      return false
  }
}

function getSeverityFromValue(value: number, threshold: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (threshold.critical && Math.abs(value - threshold.critical) <= Math.abs(threshold.critical * 0.1)) {
    return 'CRITICAL'
  }
  if (threshold.warning && Math.abs(value - threshold.warning) <= Math.abs(threshold.warning * 0.1)) {
    return 'HIGH'
  }
  return 'MEDIUM'
}

function escalateSeverity(currentSeverity: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (currentSeverity) {
    case 'LOW': return 'MEDIUM'
    case 'MEDIUM': return 'HIGH'
    case 'HIGH': return 'CRITICAL'
    case 'CRITICAL': return 'CRITICAL'
    default: return 'MEDIUM'
  }
}

function generateAlertMessage(alertRule: any, currentValue: number): string {
  return `${alertRule.metric} has reached ${currentValue}, which exceeds the threshold of ${alertRule.threshold.critical}. Immediate attention required.`
}

// Placeholder implementations for metric collection and notification sending
async function getCurrentMetricValue(metric: string, workspaceId: string): Promise<number> {
  // Implementation would query the actual metric from the system
  // This is a placeholder that returns a random value for demonstration
  return Math.random() * 100
}

async function sendEmailAlert(alert: any, recipientId: string, workspace: any) {
  console.log(`Sending email alert to recipient ${recipientId}:`, alert.title)
}

async function sendSMSAlert(alert: any, recipientId: string, workspace: any) {
  console.log(`Sending SMS alert to recipient ${recipientId}:`, alert.title)
}

async function sendSlackAlert(alert: any, recipientId: string, workspace: any) {
  console.log(`Sending Slack alert to recipient ${recipientId}:`, alert.title)
}

async function sendWebhookAlert(alert: any, recipientId: string, workspace: any) {
  console.log(`Sending webhook alert for recipient ${recipientId}:`, alert.title)
}

async function sendInAppAlert(alert: any, recipientId: string, workspace: any) {
  // Create in-app notification
  await secureDb.getPrisma().notification.create({
    data: {
      workspace_id: workspace.id,
      recipient_id: recipientId,
      recipient_type: 'USER',
      title: `Alert: ${alert.title}`,
      message: alert.message,
      type: alert.severity === 'CRITICAL' ? 'ERROR' : 'WARNING',
      category: 'SYSTEM',
      channels: ['IN_APP'],
      data: {
        alert_id: alert.id,
        metric_name: alert.metric_name,
        current_value: alert.current_value,
        threshold_value: alert.threshold_value
      },
      action_required: true,
      action_url: `/alerts/${alert.id}`,
      priority: alert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    }
  })
}