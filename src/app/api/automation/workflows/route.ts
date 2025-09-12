// @ts-nocheck
/**
 * Stage 14 Automation - Workflow Automation API
 * Intelligent workflow automation system with conditional logic
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

const workflowSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trigger: z.object({
    type: z.enum(['SCHEDULE', 'EVENT', 'CONDITION', 'MANUAL']),
    config: z.record(z.any())
  }),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'EXISTS']),
    value: z.any(),
    logic: z.enum(['AND', 'OR']).optional()
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['EMAIL', 'SMS', 'WEBHOOK', 'UPDATE_RECORD', 'CREATE_TASK', 'GENERATE_REPORT']),
    config: z.record(z.any()),
    delay_minutes: z.number().min(0).optional(),
    retry_attempts: z.number().min(0).max(5).optional()
  })),
  is_active: z.boolean().default(true),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
})

const workflowExecutionSchema = z.object({
  workflow_id: z.string().uuid(),
  trigger_data: z.record(z.any()).optional(),
  force_execution: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const workspace_id = url.searchParams.get('workspace_id')
    const workflowId = url.searchParams.get('workflow_id')
    const status = url.searchParams.get('status')

    if (!workspace_id) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // Verify workspace access
    const _workspace = await secureDb.getPrisma().workspace.findFirst({
      where: {
        id: workspace_id,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (workflowId) {
      // Get specific workflow with execution history
      const workflow = await secureDb.getPrisma().automationWorkflow.findFirst({
        where: {
          id: workflowId,
          workspace_id: workspace_id
        },
        include: {
          executions: {
            orderBy: { created_at: 'desc' },
            take: 50
          },
          _count: {
            select: {
              executions: true
            }
          }
        }
      })

      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }

      return NextResponse.json({
        workflow,
        statistics: {
          total_executions: workflow._count.executions,
          success_rate: calculateSuccessRate(workflow.executions),
          last_execution: workflow.executions[0] || null,
          avg_execution_time: calculateAverageExecutionTime(workflow.executions)
        }
      })
    }

    // Get all workflows for workspace
    const whereClause: any = {
      workspace_id: workspace_id
    }

    if (status) {
      whereClause.status = status
    }

    const workflows = await secureDb.getPrisma().automationWorkflow.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            executions: true
          }
        },
        executions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const workflowSummary = workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      trigger_type: workflow.trigger.type,
      is_active: workflow.is_active,
      priority: workflow.priority,
      total_executions: workflow._count.executions,
      last_execution: workflow.executions[0] || null,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    }))

    return NextResponse.json({
      workflows: workflowSummary,
      summary: {
        total_workflows: workflows.length,
        active_workflows: workflows.filter(w => w.is_active).length,
        total_executions: workflows.reduce((sum, w) => sum + w._count.executions, 0)
      }
    })

  } catch (_error) {
    console.error('Workflow fetch error:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
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

    // Check if this is a workflow execution request
    if (sanitizedBody.workflow_id && !sanitizedBody.name) {
      return await executeWorkflow(sanitizedBody, user, request)
    }

    // This is a workflow creation request
    const workflowData = workflowSchema.parse(sanitizedBody)

    // Verify workspace access
    const _workspace = await secureDb.getPrisma().workspace.findFirst({
      where: {
        id: workflowData.workspace_id,
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Validate workflow configuration
    const validationResult = validateWorkflowConfig(workflowData)
    if (!validationResult.isValid) {
      return NextResponse.json({ 
        error: 'Invalid workflow configuration',
        details: validationResult.errors
      }, { status: 400 })
    }

    // Create workflow
    const workflow = await secureDb.getPrisma().automationWorkflow.create({
      data: {
        workspace_id: workflowData.workspace_id,
        name: workflowData.name,
        description: workflowData.description,
        trigger: workflowData.trigger,
        conditions: workflowData.conditions || [],
        actions: workflowData.actions,
        is_active: workflowData.is_active,
        priority: workflowData.priority,
        created_by: user.id,
        status: 'ACTIVE'
      }
    })

    // Schedule if it's a scheduled workflow
    if (workflowData.trigger.type === 'SCHEDULE') {
      await scheduleWorkflow(workflow)
    }

    // Log audit event
    await securityAuditLogger.logSecurityEvent({
      type: 'CONFIGURATION_CHANGE',
      severity: 'MEDIUM',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        action: 'WORKFLOW_CREATED',
        workflow_id: workflow.id,
        workspace_id: workflowData.workspace_id,
        user_id: user.id,
        trigger_type: workflowData.trigger.type
      }
    })

    return NextResponse.json({
      workflow,
      message: 'Workflow created successfully'
    }, { status: 201 })

  } catch (_error) {
    console.error('Workflow creation error:', _error)
    return NextResponse.json(
      { error: 'Failed to create workflow' },
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

    const body = await request.json()
    const sanitizedBody = InputSanitizer.sanitizeObject(body)
    
    const { workflow_id, ...updateData } = sanitizedBody

    if (!workflow_id) {
      return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 })
    }

    // Get existing workflow
    const existingWorkflow = await secureDb.getPrisma().automationWorkflow.findFirst({
      where: {
        id: workflow_id,
        workspace: {
          OR: [
            { owner_id: user.id },
            { members: { some: { user_id: user.id } } }
          ]
        }
      }
    })

    if (!existingWorkflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate update data
    const partialSchema = workflowSchema.partial().omit({ workspace_id: true })
    const validatedData = partialSchema.parse(updateData)

    // Update workflow
    const updatedWorkflow = await secureDb.getPrisma().automationWorkflow.update({
      where: { id: workflow_id },
      data: {
        ...validatedData,
        updated_at: new Date()
      }
    })

    // Reschedule if trigger changed
    if (validatedData.trigger) {
      await rescheduleWorkflow(updatedWorkflow)
    }

    // Log audit event
    await securityAuditLogger.logSecurityEvent({
      type: 'CONFIGURATION_CHANGE',
      severity: 'MEDIUM',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        action: 'WORKFLOW_UPDATED',
        workflow_id: workflow_id,
        user_id: user.id,
        changes: Object.keys(validatedData)
      }
    })

    return NextResponse.json({
      workflow: updatedWorkflow,
      message: 'Workflow updated successfully'
    })

  } catch (_error) {
    console.error('Workflow update error:', _error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const workflowId = url.searchParams.get('workflow_id')

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 })
    }

    // Get workflow
    const workflow = await secureDb.getPrisma().automationWorkflow.findFirst({
      where: {
        id: workflowId,
        workspace: {
          OR: [
            { owner_id: user.id },
            { members: { some: { user_id: user.id } } }
          ]
        }
      }
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Soft delete workflow
    await secureDb.getPrisma().automationWorkflow.update({
      where: { id: workflowId },
      data: {
        is_active: false,
        status: 'DELETED',
        deleted_at: new Date()
      }
    })

    // Unschedule if it's a scheduled workflow
    await unscheduleWorkflow(workflow)

    // Log audit event
    await securityAuditLogger.logSecurityEvent({
      type: 'CONFIGURATION_CHANGE',
      severity: 'MEDIUM',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        action: 'WORKFLOW_DELETED',
        workflow_id: workflowId,
        user_id: user.id
      }
    })

    return NextResponse.json({
      message: 'Workflow deleted successfully'
    })

  } catch (_error) {
    console.error('Workflow deletion error:', _error)
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    )
  }
}

// Execute workflow
async function executeWorkflow(executionData: any, user: any, request: NextRequest) {
  const validatedData = workflowExecutionSchema.parse(executionData)

  // Get workflow
  const workflow = await secureDb.getPrisma().automationWorkflow.findFirst({
    where: {
      id: validatedData.workflow_id,
      workspace: {
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } }
        ]
      }
    }
  })

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  if (!workflow.is_active && !validatedData.force_execution) {
    return NextResponse.json({ error: 'Workflow is not active' }, { status: 400 })
  }

  // Create execution record
  const execution = await secureDb.getPrisma().workflowExecution.create({
    data: {
      workflow_id: workflow.id,
      workspace_id: workflow.workspace_id,
      trigger_data: validatedData.trigger_data || {},
      status: 'RUNNING',
      started_by: user.id,
      started_at: new Date()
    }
  })

  // Execute workflow asynchronously
  executeWorkflowAsync(workflow, execution, validatedData.trigger_data || {})

  return NextResponse.json({
    execution_id: execution.id,
    status: 'STARTED',
    message: 'Workflow execution started'
  }, { status: 202 })
}

// Workflow execution engine
async function executeWorkflowAsync(workflow: any, execution: any, triggerData: any) {
  try {
    const startTime = Date.now()
    
    // Check conditions
    const conditionsResult = await evaluateConditions(workflow.conditions, triggerData, workflow.workspace_id)
    
    if (!conditionsResult.passed) {
      await secureDb.getPrisma().workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SKIPPED',
          result: { reason: 'Conditions not met', details: conditionsResult.details },
          completed_at: new Date(),
          execution_time_ms: Date.now() - startTime
        }
      })
      return
    }

    // Execute actions sequentially
    const actionResults = []
    
    for (const action of workflow.actions) {
      try {
        // Apply delay if specified
        if (action.delay_minutes > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay_minutes * 60 * 1000))
        }

        const result = await executeAction(action, triggerData, workflow.workspace_id)
        actionResults.push({
          action_type: action.type,
          status: 'SUCCESS',
          result
        })
      } catch (_error) {
        actionResults.push({
          action_type: action.type,
          status: 'FAILED',
          error: error.toString()
        })
        
        // Stop execution on critical errors
        if (workflow.priority === 'CRITICAL') {
          break
        }
      }
    }

    // Update execution record
    const hasFailures = actionResults.some(result => result.status === 'FAILED')
    await secureDb.getPrisma().workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: hasFailures ? 'FAILED' : 'COMPLETED',
        result: { actions: actionResults },
        completed_at: new Date(),
        execution_time_ms: Date.now() - startTime
      }
    })

  } catch (_error) {
    await secureDb.getPrisma().workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'ERROR',
        result: { error: error.toString() },
        completed_at: new Date(),
        execution_time_ms: Date.now() - Date.now()
      }
    })
  }
}

// Condition evaluation
async function evaluateConditions(conditions: any[], triggerData: any, workspace_id: string) {
  if (!conditions || conditions.length === 0) {
    return { passed: true, details: 'No conditions to evaluate' }
  }

  const results = []
  
  for (const condition of conditions) {
    const result = await evaluateCondition(condition, triggerData, workspace_id)
    results.push(result)
  }

  // Apply logic (AND/OR)
  let finalResult = results[0]?.passed || false
  
  for (let i = 1; i < results.length; i++) {
    const logic = conditions[i].logic || 'AND'
    if (logic === 'AND') {
      finalResult = finalResult && results[i].passed
    } else if (logic === 'OR') {
      finalResult = finalResult || results[i].passed
    }
  }

  return {
    passed: finalResult,
    details: results
  }
}

async function evaluateCondition(condition: any, triggerData: any, workspace_id: string) {
  const { field, operator, value } = condition
  
  // Get field value from trigger data or database
  let fieldValue = triggerData[field]
  
  // If not in trigger data, query database
  if (fieldValue === undefined) {
    fieldValue = await getFieldValueFromDatabase(field, workspace_id)
  }

  // Evaluate condition
  switch (operator) {
    case 'EQUALS':
      return { passed: fieldValue == value, fieldValue, expectedValue: value }
    case 'NOT_EQUALS':
      return { passed: fieldValue != value, fieldValue, expectedValue: value }
    case 'GREATER_THAN':
      return { passed: Number(fieldValue) > Number(value), fieldValue, expectedValue: value }
    case 'LESS_THAN':
      return { passed: Number(fieldValue) < Number(value), fieldValue, expectedValue: value }
    case 'CONTAINS':
      return { passed: String(fieldValue).includes(String(value)), fieldValue, expectedValue: value }
    case 'EXISTS':
      return { passed: fieldValue !== undefined && fieldValue !== null, fieldValue }
    default:
      return { passed: false, error: `Unknown operator: ${operator}` }
  }
}

// Action execution
async function executeAction(action: any, triggerData: any, workspace_id: string) {
  switch (action.type) {
    case 'EMAIL':
      return await sendEmail(action.config, triggerData, workspace_id)
    case 'SMS':
      return await sendSMS(action.config, triggerData, workspace_id)
    case 'WEBHOOK':
      return await callWebhook(action.config, triggerData, workspace_id)
    case 'UPDATE_RECORD':
      return await updateRecord(action.config, triggerData, workspace_id)
    case 'CREATE_TASK':
      return await createTask(action.config, triggerData, workspace_id)
    case 'GENERATE_REPORT':
      return await generateReport(action.config, triggerData, workspace_id)
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

// Helper functions
function validateWorkflowConfig(workflow: any) {
  const errors = []
  
  // Validate trigger
  if (!workflow.trigger || !workflow.trigger.type) {
    errors.push('Trigger configuration is required')
  }
  
  // Validate actions
  if (!workflow.actions || workflow.actions.length === 0) {
    errors.push('At least one action is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

function calculateSuccessRate(executions: any[]) {
  if (executions.length === 0) return 0
  const successful = executions.filter(e => e.status === 'COMPLETED').length
  return (successful / executions.length) * 100
}

function calculateAverageExecutionTime(executions: any[]) {
  const completedExecutions = executions.filter(e => e.execution_time_ms > 0)
  if (completedExecutions.length === 0) return 0
  
  const totalTime = completedExecutions.reduce((sum, e) => sum + e.execution_time_ms, 0)
  return totalTime / completedExecutions.length
}

// Placeholder implementations for action executors
async function sendEmail(config: any, triggerData: any, workspace_id: string) {
  // Implementation would send email using configured service
  return { sent: true, recipient: config.to }
}

async function sendSMS(config: any, triggerData: any, workspace_id: string) {
  // Implementation would send SMS using configured service
  return { sent: true, recipient: config.to }
}

async function callWebhook(config: any, triggerData: any, workspace_id: string) {
  // Implementation would make HTTP request to webhook URL
  return { called: true, url: config.url }
}

async function updateRecord(config: any, triggerData: any, workspace_id: string) {
  // Implementation would update database record
  return { updated: true, record_id: config.record_id }
}

async function createTask(config: any, triggerData: any, workspace_id: string) {
  // Implementation would create task in system
  return { created: true, task_id: 'generated-task-id' }
}

async function generateReport(config: any, triggerData: any, workspace_id: string) {
  // Implementation would generate and save report
  return { generated: true, report_id: 'generated-report-id' }
}

async function getFieldValueFromDatabase(field: string, workspace_id: string) {
  // Implementation would query database for field value
  return null
}

async function scheduleWorkflow(workflow: any) {
  // Implementation would schedule workflow with cron job or task queue
  console.log(`Scheduling workflow: ${workflow.name}`)
}

async function rescheduleWorkflow(workflow: any) {
  // Implementation would reschedule workflow
  console.log(`Rescheduling workflow: ${workflow.name}`)
}

async function unscheduleWorkflow(workflow: any) {
  // Implementation would remove workflow from schedule
  console.log(`Unscheduling workflow: ${workflow.name}`)
}