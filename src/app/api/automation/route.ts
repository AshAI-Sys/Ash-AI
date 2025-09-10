import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get("integrationId")
    const workflowId = searchParams.get("workflowId")
    const active = searchParams.get("active")
    const priority = searchParams.get("priority")
    
    const where: any = {}
    
    if (integrationId) {
      where.integrationId = integrationId
    }
    
    if (workflowId) {
      where.workflowId = workflowId
    }
    
    if (active !== null) {
      where.is_active = active === "true"
    }
    
    if (priority) {
      where.priority = parseInt(priority)
    }

    const automationRules = await prisma.automationRule.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            provider: true,
            status: true
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
            status: true,
            successCount: true,
            failureCount: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        executions: {
          orderBy: {
            startedAt: "desc"
          },
          take: 10,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true
          }
        },
        _count: {
          select: {
            executions: true
          }
        }
      },
      orderBy: [
        { priority: "desc" },
        { is_active: "desc" },
        { updated_at: "desc" }
      ]
    })

    // Enrich automation rules with performance metrics
    const enrichedRules = automationRules.map(rule => {
      const recentExecutions = rule.executions
      const successfulExecutions = recentExecutions.filter(e => e.status === "SUCCESS")
      const failedExecutions = recentExecutions.filter(e => e.status === "FAILED")
      
      const successRate = rule.triggerCount > 0 ? 
        (successfulExecutions.length / Math.min(rule.triggerCount, recentExecutions.length)) * 100 : 0
      
      const lastExecution = recentExecutions[0]
      const isHealthy = successRate >= 95 && failedExecutions.length <= 1

      return {
        ...rule,
        performanceMetrics: {
          successRate: Math.round(successRate),
          recentFailures: failedExecutions.length,
          lastExecution: lastExecution?.startedAt || null,
          lastExecutionStatus: lastExecution?.status || null,
          totalExecutions: rule._count.executions,
          isHealthy
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedRules
    })

  } catch (_error) {
    console.error("Error fetching automation rules:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch automation rules" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication required
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Authorization - only admin, manager can create automation rules
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      integrationId,
      workflowId,
      conditions,
      actions,
      priority = 1,
      createdBy
    } = body

    if (!name || !conditions || !actions || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Name, conditions, actions, and creator are required" },
        { status: 400 }
      )
    }

    // Either integrationId or workflowId must be provided
    if (!integrationId && !workflowId) {
      return NextResponse.json(
        { success: false, error: "Either integration ID or workflow ID is required" },
        { status: 400 }
      )
    }

    // Validate conditions
    const conditionsValidation = validateConditions(conditions)
    if (!conditionsValidation.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid conditions", details: conditionsValidation.errors },
        { status: 400 }
      )
    }

    // Validate actions
    const actionsValidation = validateActions(actions)
    if (!actionsValidation.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid actions", details: actionsValidation.errors },
        { status: 400 }
      )
    }

    // Check if integration/workflow exists
    if (integrationId) {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      })
      if (!integration) {
        return NextResponse.json(
          { success: false, error: "Integration not found" },
          { status: 404 }
        )
      }
    }

    if (workflowId) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      })
      if (!workflow) {
        return NextResponse.json(
          { success: false, error: "Workflow not found" },
          { status: 404 }
        )
      }
    }

    // Check if rule name already exists
    const existingRule = await prisma.automationRule.findUnique({
      where: { name }
    })

    if (existingRule) {
      return NextResponse.json(
        { success: false, error: "Automation rule with this name already exists" },
        { status: 409 }
      )
    }

    const automationRule = await prisma.automationRule.create({
      data: {
        name,
        description,
        integrationId,
        workflowId,
        conditions,
        actions,
        priority: Math.min(Math.max(priority, 1), 10), // Limit priority to 1-10
        createdBy
      },
      include: {
        integration: {
          select: {
            id: true,
            type: true,
            provider: true
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Test automation rule
    const testResult = await testAutomationRule(automationRule)

    return NextResponse.json({
      success: true,
      data: automationRule,
      testResult
    })

  } catch (_error) {
    console.error("Error creating automation rule:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create automation rule" },
      { status: 500 }
    )
  }
}

// Validate conditions
function validateConditions(conditions: any) {
  const errors: string[] = []
  
  if (!conditions.rules || !Array.isArray(conditions.rules)) {
    errors.push("Conditions must contain a 'rules' array")
    return { valid: false, errors }
  }
  
  if (conditions.rules.length === 0) {
    errors.push("At least one condition rule is required")
  }
  
  conditions.rules.forEach((rule: any, index: number) => {
    if (!rule.field) {
      errors.push(`Rule ${index + 1}: Field is required`)
    }
    
    if (!rule.operator) {
      errors.push(`Rule ${index + 1}: Operator is required`)
    }
    
    const validOperators = [
      "equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal",
      "less_than_or_equal", "contains", "not_contains", "starts_with", "ends_with",
      "in", "not_in", "is_null", "is_not_null", "regex_match"
    ]
    
    if (rule.operator && !validOperators.includes(rule.operator)) {
      errors.push(`Rule ${index + 1}: Invalid operator. Must be one of: ${validOperators.join(", ")}`)
    }
    
    // Some operators require a value
    const operatorsRequiringValue = [
      "equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal",
      "less_than_or_equal", "contains", "not_contains", "starts_with", "ends_with",
      "in", "not_in", "regex_match"
    ]
    
    if (rule.operator && operatorsRequiringValue.includes(rule.operator) && rule.value === undefined) {
      errors.push(`Rule ${index + 1}: Value is required for operator '${rule.operator}'`)
    }
  })
  
  return { valid: errors.length === 0, errors }
}

// Validate actions
function validateActions(actions: any[]) {
  const errors: string[] = []
  
  if (!Array.isArray(actions)) {
    errors.push("Actions must be an array")
    return { valid: false, errors }
  }
  
  if (actions.length === 0) {
    errors.push("At least one action is required")
  }
  
  actions.forEach((action, index) => {
    if (!action.type) {
      errors.push(`Action ${index + 1}: Type is required`)
    }
    
    const validActionTypes = [
      "send_email", "send_notification", "create_order", "update_order",
      "update_inventory", "trigger_webhook", "run_workflow", "log_event",
      "create_task", "update_kpi", "generate_report"
    ]
    
    if (action.type && !validActionTypes.includes(action.type)) {
      errors.push(`Action ${index + 1}: Invalid action type. Must be one of: ${validActionTypes.join(", ")}`)
    }
    
    // Type-specific validation
    switch (action.type) {
      case "send_email":
        if (!action.config?.to || !action.config?.subject) {
          errors.push(`Action ${index + 1}: 'to' and 'subject' are required for send_email actions`)
        }
        break
      case "trigger_webhook":
        if (!action.config?.url) {
          errors.push(`Action ${index + 1}: URL is required for trigger_webhook actions`)
        }
        break
      case "run_workflow":
        if (!action.config?.workflowId) {
          errors.push(`Action ${index + 1}: Workflow ID is required for run_workflow actions`)
        }
        break
      case "update_inventory":
        if (!action.config?.inventoryId || action.config?.quantity === undefined) {
          errors.push(`Action ${index + 1}: Inventory ID and quantity are required for update_inventory actions`)
        }
        break
    }
  })
  
  return { valid: errors.length === 0, errors }
}

// Test automation rule
async function testAutomationRule(rule: any) {
  try {
    // Create test execution record
    const testExecution = await prisma.automationExecution.create({
      data: {
        ruleId: rule.id,
        status: "RUNNING",
        inputData: {
          test: true,
          message: "Test execution of automation rule",
          timestamp: new Date().toISOString()
        }
      }
    })

    // Simulate condition evaluation
    const conditionsResult = evaluateConditions(rule.conditions, {
      // Mock data for testing
      order: { status: "pending", total: 150.00 },
      inventory: { quantity: 50, threshold: 10 },
      customer: { tier: "premium", orders_count: 5 }
    })

    let executionSuccess = true
    const actionResults = []

    if (conditionsResult.matched) {
      // Execute actions (simulate)
      for (const [index, action] of rule.actions.entries()) {
        const actionResult = await executeAction(action, testExecution.inputData)
        actionResults.push({
          actionIndex: index,
          actionType: action.type,
          success: actionResult.success,
          message: actionResult.message
        })

        if (!actionResult.success) {
          executionSuccess = false
        }
      }
    } else {
      actionResults.push({
        message: "Conditions not met, no actions executed",
        conditionsResult
      })
    }

    // Update execution record
    await prisma.automationExecution.update({
      where: { id: testExecution.id },
      data: {
        status: executionSuccess ? "SUCCESS" : "FAILED",
        outputData: {
          conditionsMatched: conditionsResult.matched,
          actionsExecuted: actionResults.length,
          results: actionResults
        },
        errorMessage: executionSuccess ? null : "One or more actions failed during test execution",
        completedAt: new Date()
      }
    })

    return {
      success: executionSuccess,
      executionId: testExecution.id,
      message: executionSuccess ? 
        "Test automation rule executed successfully" :
        "Test automation rule failed during execution",
      conditionsMatched: conditionsResult.matched,
      actionResults
    }

  } catch (_error) {
    return {
      success: false,
      message: `Test automation rule execution error: ${error.message}`,
      error: error.message
    }
  }
}

// Evaluate conditions (mock implementation)
function evaluateConditions(conditions: any, data: any) {
  try {
    const { rules, operator = "AND" } = conditions
    
    const results = rules.map((rule: any) => {
      const fieldValue = getFieldValue(data, rule.field)
      return evaluateRule(fieldValue, rule.operator, rule.value)
    })
    
    const matched = operator === "AND" ? 
      results.every(result => result) : 
      results.some(result => result)
    
    return { matched, results }
  } catch (_error) {
    return { matched: false, error: error.message }
  }
}

// Get field value from data object
function getFieldValue(data: any, field: string) {
  return field.split('.').reduce((obj, key) => obj?.[key], data)
}

// Evaluate individual rule
function evaluateRule(fieldValue: any, operator: string, expectedValue: any) {
  switch (operator) {
    case "equals":
      return fieldValue === expectedValue
    case "not_equals":
      return fieldValue !== expectedValue
    case "greater_than":
      return fieldValue > expectedValue
    case "less_than":
      return fieldValue < expectedValue
    case "greater_than_or_equal":
      return fieldValue >= expectedValue
    case "less_than_or_equal":
      return fieldValue <= expectedValue
    case "contains":
      return String(fieldValue).includes(String(expectedValue))
    case "not_contains":
      return !String(fieldValue).includes(String(expectedValue))
    case "starts_with":
      return String(fieldValue).startsWith(String(expectedValue))
    case "ends_with":
      return String(fieldValue).endsWith(String(expectedValue))
    case "in":
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
    case "not_in":
      return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue)
    case "is_null":
      return fieldValue == null
    case "is_not_null":
      return fieldValue != null
    case "regex_match":
      try {
        return new RegExp(expectedValue).test(String(fieldValue))
      } catch {
        return false
      }
    default:
      return false
  }
}

// Execute action (mock implementation)
async function executeAction(action: any, inputData: any) {
  try {
    // Simulate different action types
    switch (action.type) {
      case "send_email":
        return {
          success: Math.random() > 0.1, // 90% success rate
          message: `Email sent to ${action.config?.to}`
        }
      
      case "send_notification":
        return {
          success: Math.random() > 0.05, // 95% success rate
          message: `Notification sent: ${action.config?.message}`
        }
      
      case "trigger_webhook":
        return {
          success: Math.random() > 0.15, // 85% success rate
          message: `Webhook triggered: ${action.config?.url}`
        }
      
      case "update_inventory":
        return {
          success: Math.random() > 0.1, // 90% success rate
          message: `Inventory updated: ${action.config?.inventoryId}`
        }
      
      case "create_task":
        return {
          success: Math.random() > 0.05, // 95% success rate
          message: `Task created: ${action.config?.title}`
        }
      
      case "log_event":
        return {
          success: true, // Logging always succeeds
          message: `Event logged: ${action.config?.event}`
        }
      
      default:
        return {
          success: true,
          message: `Action ${action.type} executed`
        }
    }
  } catch (_error) {
    return {
      success: false,
      message: `Action execution failed: ${error.message}`
    }
  }
}