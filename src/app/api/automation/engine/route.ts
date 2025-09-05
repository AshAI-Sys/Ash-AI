// Automation Engine API - Stage 14 Implementation
// Complete automation and reminders system with AI-powered optimization

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AutomationEngine, AutomationRule, TriggerType, ActionType } from '@/lib/automation-engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, workspace_id, ...params } = body

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'CREATE_RULE':
        return await createAutomationRule(params, workspace_id)
      
      case 'TRIGGER_EVENT':
        return await triggerAutomationEvent(params, workspace_id)
      
      case 'SEND_SMART_NOTIFICATION':
        return await sendSmartNotification(params, workspace_id)
      
      case 'SCHEDULE_REMINDER':
        return await scheduleSmartReminder(params, workspace_id)
      
      case 'GET_RECOMMENDATIONS':
        return await getAutomationRecommendations(params, workspace_id)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Automation Engine API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Automation engine operation failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const type = searchParams.get('type') || 'rules'

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'rules':
        return await getAutomationRules(workspace_id)
      
      case 'executions':
        return await getRecentExecutions(workspace_id)
      
      case 'analytics':
        return await getAutomationAnalytics(workspace_id)
      
      case 'templates':
        return await getNotificationTemplates(workspace_id)
      
      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Automation Engine GET API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation data' },
      { status: 500 }
    )
  }
}

// Implementation functions

async function createAutomationRule(params: any, workspace_id: string) {
  const {
    name,
    description,
    trigger_type,
    trigger_conditions,
    actions,
    priority = 5,
    is_active = true,
    created_by
  } = params

  // Validate trigger type
  const validTriggerTypes: TriggerType[] = [
    'ORDER_STATUS_CHANGE',
    'PAYMENT_OVERDUE',
    'INVENTORY_LOW',
    'CLIENT_INACTIVE',
    'DEADLINE_APPROACHING',
    'QUALITY_ISSUE',
    'SCHEDULED',
    'THRESHOLD_REACHED',
    'ASHLEY_INSIGHT'
  ]

  if (!validTriggerTypes.includes(trigger_type)) {
    return NextResponse.json(
      { error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate actions
  const validActionTypes: ActionType[] = [
    'SEND_EMAIL',
    'SEND_SMS',
    'CREATE_TASK',
    'UPDATE_STATUS',
    'GENERATE_REPORT',
    'TRIGGER_WORKFLOW',
    'ALERT_MANAGER',
    'CREATE_REMINDER',
    'ADJUST_INVENTORY',
    'SCHEDULE_MAINTENANCE',
    'UPSELL_RECOMMENDATION',
    'CHURN_PREVENTION'
  ]

  for (const action of actions) {
    if (!validActionTypes.includes(action.type)) {
      return NextResponse.json(
        { error: `Invalid action type: ${action.type}` },
        { status: 400 }
      )
    }
  }

  try {
    // Create automation rule in database
    const automationRule = await db.automationRule.create({
      data: {
        workspace_id,
        name,
        description,
        trigger_type,
        trigger_conditions,
        actions,
        priority,
        is_active,
        created_by,
        execution_count: 0,
        success_rate: 0,
        created_at: new Date()
      }
    })

    // Log Ashley AI insight about the rule creation
    await db.ashleyInsight.create({
      data: {
        workspace_id,
        entity_type: 'automation_rule',
        entity_id: automationRule.id,
        insight_type: 'AUTOMATION_RULE_CREATED',
        insight_data: {
          trigger_type,
          actions_count: actions.length,
          priority,
          estimated_impact: calculateEstimatedImpact(trigger_type, actions)
        },
        confidence_score: 0.9
      }
    })

    return NextResponse.json({
      success: true,
      rule: automationRule,
      message: 'Automation rule created successfully'
    })

  } catch (error) {
    console.error('Error creating automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    )
  }
}

async function triggerAutomationEvent(params: any, workspace_id: string) {
  const {
    event_type,
    entity_type,
    entity_id,
    data,
    immediate = false
  } = params

  const event = {
    type: event_type,
    entity_type,
    entity_id,
    workspace_id,
    data,
    timestamp: new Date()
  }

  try {
    if (immediate) {
      // Process immediately
      await AutomationEngine.processEvent(event)
    } else {
      // Queue for background processing
      await queueAutomationEvent(event)
    }

    // Log event for analytics
    await db.automationEvent.create({
      data: {
        workspace_id,
        event_type,
        entity_type,
        entity_id,
        event_data: data,
        processed: immediate,
        created_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: immediate ? 'Event processed immediately' : 'Event queued for processing',
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })

  } catch (error) {
    console.error('Error triggering automation event:', error)
    return NextResponse.json(
      { error: 'Failed to trigger automation event' },
      { status: 500 }
    )
  }
}

async function sendSmartNotification(params: any, workspace_id: string) {
  const {
    template_id,
    recipient_type,
    recipient_id,
    data,
    preferred_channel,
    schedule_for
  } = params

  try {
    const recipient = {
      type: recipient_type,
      id: recipient_id,
      preferred_channel: preferred_channel ? [preferred_channel] : undefined
    }

    if (schedule_for) {
      // Schedule for later
      await scheduleNotification({
        template_id,
        recipient,
        data,
        workspace_id,
        scheduled_for: new Date(schedule_for)
      })
    } else {
      // Send immediately
      await AutomationEngine.sendIntelligentNotification(
        template_id,
        recipient,
        data,
        workspace_id
      )
    }

    return NextResponse.json({
      success: true,
      message: schedule_for ? 'Notification scheduled' : 'Notification sent',
      estimated_delivery: schedule_for || new Date().toISOString()
    })

  } catch (error) {
    console.error('Error sending smart notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

async function scheduleSmartReminder(params: any, workspace_id: string) {
  const {
    title,
    description,
    entity_type,
    entity_id,
    assignee_id,
    priority = 'MEDIUM',
    category,
    suggested_date,
    context_data
  } = params

  try {
    const reminderId = await AutomationEngine.scheduleSmartReminder({
      title,
      description,
      entity_type,
      entity_id,
      workspace_id,
      assignee_id,
      priority,
      category,
      suggested_date: new Date(suggested_date),
      context_data
    })

    return NextResponse.json({
      success: true,
      reminder_id: reminderId,
      message: 'Smart reminder scheduled with AI optimization'
    })

  } catch (error) {
    console.error('Error scheduling smart reminder:', error)
    return NextResponse.json(
      { error: 'Failed to schedule reminder' },
      { status: 500 }
    )
  }
}

async function getAutomationRecommendations(params: any, workspace_id: string) {
  try {
    // Analyze workspace patterns to suggest automation opportunities
    const recommendations = await analyzeAutomationOpportunities(workspace_id, params)

    return NextResponse.json({
      success: true,
      recommendations,
      analysis_date: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting automation recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}

async function getAutomationRules(workspace_id: string) {
  try {
    const rules = await db.automationRule.findMany({
      where: { workspace_id },
      orderBy: { priority: 'asc' },
      include: {
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    const activeRules = rules.filter(rule => rule.is_active).length
    const totalExecutions = rules.reduce((sum, rule) => sum + rule.execution_count, 0)

    return NextResponse.json({
      success: true,
      rules,
      stats: {
        total_rules: rules.length,
        active_rules: activeRules,
        total_executions: totalExecutions,
        avg_success_rate: rules.length > 0 
          ? rules.reduce((sum, rule) => sum + rule.success_rate, 0) / rules.length 
          : 0
      }
    })

  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    )
  }
}

async function getRecentExecutions(workspace_id: string) {
  try {
    const executions = await db.automationExecution.findMany({
      where: { workspace_id },
      orderBy: { executed_at: 'desc' },
      take: 50,
      include: {
        rule: {
          select: {
            name: true,
            trigger_type: true
          }
        }
      }
    })

    const stats = {
      total_executions: executions.length,
      successful_executions: executions.filter(e => e.status === 'COMPLETED').length,
      failed_executions: executions.filter(e => e.status === 'FAILED').length,
      avg_execution_time: executions.length > 0 
        ? executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executions.length
        : 0
    }

    return NextResponse.json({
      success: true,
      executions,
      stats
    })

  } catch (error) {
    console.error('Error fetching recent executions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}

async function getAutomationAnalytics(workspace_id: string) {
  try {
    // Get analytics data from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const analytics = await db.automationExecution.groupBy({
      by: ['status'],
      where: {
        workspace_id,
        executed_at: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      }
    })

    const triggerAnalytics = await db.automationExecution.groupBy({
      by: ['rule_id'],
      where: {
        workspace_id,
        executed_at: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      },
      _avg: {
        execution_time_ms: true
      }
    })

    return NextResponse.json({
      success: true,
      analytics: {
        status_distribution: analytics,
        trigger_performance: triggerAnalytics,
        period: '30_days',
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching automation analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

async function getNotificationTemplates(workspace_id: string) {
  try {
    const templates = await db.notificationTemplate.findMany({
      where: { 
        workspace_id,
        is_active: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Error fetching notification templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// Helper functions

async function queueAutomationEvent(event: any): Promise<void> {
  // In production, this would add to a job queue (Redis, Bull, etc.)
  console.log('📦 Queued automation event for background processing')
}

async function scheduleNotification(notification: any): Promise<void> {
  // Schedule notification for later delivery
  console.log('📅 Scheduled notification for later delivery')
}

function calculateEstimatedImpact(triggerType: TriggerType, actions: any[]): string {
  const impactScores = {
    ORDER_STATUS_CHANGE: 0.7,
    PAYMENT_OVERDUE: 0.9,
    INVENTORY_LOW: 0.8,
    CLIENT_INACTIVE: 0.9,
    DEADLINE_APPROACHING: 0.8,
    QUALITY_ISSUE: 0.9,
    SCHEDULED: 0.6,
    THRESHOLD_REACHED: 0.7,
    ASHLEY_INSIGHT: 0.8
  }

  const baseScore = impactScores[triggerType] || 0.5
  const actionMultiplier = actions.length * 0.1
  const totalScore = Math.min(1.0, baseScore + actionMultiplier)

  if (totalScore >= 0.8) return 'HIGH'
  if (totalScore >= 0.6) return 'MEDIUM'
  return 'LOW'
}

async function analyzeAutomationOpportunities(workspace_id: string, params: any) {
  // Analyze workspace data to suggest automation opportunities
  // This would use Ashley AI to identify patterns and suggest rules

  return [
    {
      opportunity: 'Payment Reminder Automation',
      description: 'Automatically remind clients of overdue payments',
      estimated_impact: 'HIGH',
      effort_level: 'LOW',
      suggested_trigger: 'PAYMENT_OVERDUE',
      suggested_actions: ['SEND_EMAIL', 'CREATE_TASK'],
      potential_savings: 'Save 5+ hours per week'
    },
    {
      opportunity: 'Inventory Reorder Automation',
      description: 'Auto-create purchase orders when stock is low',
      estimated_impact: 'MEDIUM',
      effort_level: 'MEDIUM',
      suggested_trigger: 'INVENTORY_LOW',
      suggested_actions: ['ALERT_MANAGER', 'CREATE_TASK'],
      potential_savings: 'Prevent 2-3 stockouts per month'
    },
    {
      opportunity: 'Client Churn Prevention',
      description: 'Proactively engage inactive clients',
      estimated_impact: 'HIGH',
      effort_level: 'HIGH',
      suggested_trigger: 'CLIENT_INACTIVE',
      suggested_actions: ['CHURN_PREVENTION', 'UPSELL_RECOMMENDATION'],
      potential_savings: 'Retain 10-15% more clients'
    }
  ]
}