import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const active = searchParams.get("active")
    const search = searchParams.get("search")
    
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (active !== null) {
      where.isActive = active === "true"
    }
    
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: search,
            mode: "insensitive"
          }
        }
      ]
    }

    const workflows = await prisma.workflow.findMany({
      where,
      include: {
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
          take: 5,
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            duration: true,
            errorMessage: true
          }
        },
        automationRules: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            triggerCount: true
          }
        },
        _count: {
          select: {
            executions: true,
            automationRules: true
          }
        }
      },
      orderBy: [
        { status: "asc" },
        { updatedAt: "desc" }
      ]
    })

    // Enrich workflows with performance metrics
    const enrichedWorkflows = workflows.map(workflow => {
      const recentExecutions = workflow.executions
      const successfulExecutions = recentExecutions.filter(e => e.status === "SUCCESS")
      const failedExecutions = recentExecutions.filter(e => e.status === "FAILED")
      
      const successRate = workflow.runCount > 0 ? 
        (workflow.successCount / workflow.runCount) * 100 : 0
      
      const averageExecutionTime = successfulExecutions
        .filter(e => e.duration)
        .reduce((sum, e, _, arr) => sum + (e.duration || 0) / arr.length, 0)

      const lastExecution = workflow.executions[0]
      const isHealthy = successRate >= 90 && failedExecutions.length <= 1

      return {
        ...workflow,
        performanceMetrics: {
          successRate: Math.round(successRate),
          averageExecutionTime: Math.round(averageExecutionTime),
          recentFailures: failedExecutions.length,
          lastExecution: lastExecution?.startedAt || null,
          lastExecutionStatus: lastExecution?.status || null,
          isHealthy,
          totalAutomationRules: workflow._count.automationRules
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedWorkflows
    })

  } catch (error) {
    console.error("Error fetching workflows:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch workflows" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      trigger,
      steps,
      createdBy
    } = body

    if (!name || !trigger || !steps || !Array.isArray(steps) || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Name, trigger, steps (array), and creator are required" },
        { status: 400 }
      )
    }

    // Validate trigger configuration
    const triggerValidation = validateTrigger(trigger)
    if (!triggerValidation.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid trigger configuration", details: triggerValidation.errors },
        { status: 400 }
      )
    }

    // Validate workflow steps
    const stepsValidation = validateWorkflowSteps(steps)
    if (!stepsValidation.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid workflow steps", details: stepsValidation.errors },
        { status: 400 }
      )
    }

    // Check if workflow name already exists
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { name }
    })

    if (existingWorkflow) {
      return NextResponse.json(
        { success: false, error: "Workflow with this name already exists" },
        { status: 409 }
      )
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        trigger,
        steps,
        status: "DRAFT", // Start as draft
        createdBy
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Test workflow if it's marked as active
    let testResult = null
    if (trigger.autoStart !== false) {
      testResult = await testWorkflow(workflow)
    }

    return NextResponse.json({
      success: true,
      data: workflow,
      testResult
    })

  } catch (error) {
    console.error("Error creating workflow:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create workflow" },
      { status: 500 }
    )
  }
}

// Validate trigger configuration
function validateTrigger(trigger: any) {
  const errors: string[] = []
  
  if (!trigger.type) {
    errors.push("Trigger type is required")
  }
  
  const validTriggerTypes = [
    "webhook", "schedule", "event", "manual", "integration_sync", 
    "order_status", "inventory_change", "kpi_threshold"
  ]
  
  if (trigger.type && !validTriggerTypes.includes(trigger.type)) {
    errors.push(`Invalid trigger type. Must be one of: ${validTriggerTypes.join(", ")}`)
  }
  
  // Type-specific validation
  switch (trigger.type) {
    case "webhook":
      if (!trigger.webhookId) {
        errors.push("Webhook ID is required for webhook triggers")
      }
      break
    case "schedule":
      if (!trigger.cron && !trigger.interval) {
        errors.push("Either cron expression or interval is required for schedule triggers")
      }
      break
    case "event":
      if (!trigger.eventType) {
        errors.push("Event type is required for event triggers")
      }
      break
    case "kpi_threshold":
      if (!trigger.kpiId || trigger.threshold === undefined) {
        errors.push("KPI ID and threshold are required for KPI threshold triggers")
      }
      break
  }
  
  return { valid: errors.length === 0, errors }
}

// Validate workflow steps
function validateWorkflowSteps(steps: any[]) {
  const errors: string[] = []
  
  if (steps.length === 0) {
    errors.push("At least one workflow step is required")
  }
  
  steps.forEach((step, index) => {
    if (!step.id) {
      errors.push(`Step ${index + 1}: Step ID is required`)
    }
    
    if (!step.type) {
      errors.push(`Step ${index + 1}: Step type is required`)
    }
    
    const validStepTypes = [
      "http_request", "database_query", "send_email", "send_notification",
      "data_transform", "condition", "delay", "integration_action",
      "create_order", "update_inventory", "generate_report"
    ]
    
    if (step.type && !validStepTypes.includes(step.type)) {
      errors.push(`Step ${index + 1}: Invalid step type. Must be one of: ${validStepTypes.join(", ")}`)
    }
    
    // Type-specific validation
    switch (step.type) {
      case "http_request":
        if (!step.config?.url) {
          errors.push(`Step ${index + 1}: URL is required for HTTP request steps`)
        }
        break
      case "database_query":
        if (!step.config?.query) {
          errors.push(`Step ${index + 1}: Query is required for database query steps`)
        }
        break
      case "send_email":
        if (!step.config?.to || !step.config?.subject) {
          errors.push(`Step ${index + 1}: 'to' and 'subject' are required for send email steps`)
        }
        break
      case "condition":
        if (!step.config?.condition) {
          errors.push(`Step ${index + 1}: Condition expression is required for condition steps`)
        }
        break
      case "delay":
        if (!step.config?.duration) {
          errors.push(`Step ${index + 1}: Duration is required for delay steps`)
        }
        break
    }
  })
  
  return { valid: errors.length === 0, errors }
}

// Test workflow execution
async function testWorkflow(workflow: any) {
  try {
    const testExecution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: "RUNNING",
        inputData: {
          test: true,
          message: "Test execution of workflow"
        }
      }
    })

    // Simulate workflow execution
    const steps = workflow.steps
    let allStepsSuccessful = true
    const stepResults = []

    for (const [index, step] of steps.entries()) {
      const stepExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: testExecution.id,
          stepId: step.id,
          stepName: step.name || `Step ${index + 1}`,
          status: "RUNNING",
          inputData: step.config || {}
        }
      })

      // Simulate step execution (in real implementation, this would execute actual logic)
      const stepSuccess = Math.random() > 0.1 // 90% success rate for testing
      const duration = Math.floor(Math.random() * 1000) + 100

      await prisma.workflowStepExecution.update({
        where: { id: stepExecution.id },
        data: {
          status: stepSuccess ? "SUCCESS" : "FAILED",
          outputData: stepSuccess ? { result: "Step completed successfully" } : null,
          errorMessage: stepSuccess ? null : "Simulated step failure",
          completedAt: new Date(),
          duration
        }
      })

      stepResults.push({
        stepId: step.id,
        stepName: step.name || `Step ${index + 1}`,
        success: stepSuccess,
        duration
      })

      if (!stepSuccess) {
        allStepsSuccessful = false
        break // Stop on first failure
      }
    }

    // Update workflow execution
    const totalDuration = stepResults.reduce((sum, step) => sum + step.duration, 0)
    
    await prisma.workflowExecution.update({
      where: { id: testExecution.id },
      data: {
        status: allStepsSuccessful ? "SUCCESS" : "FAILED",
        outputData: allStepsSuccessful ? { message: "Workflow test completed successfully" } : null,
        errorMessage: allStepsSuccessful ? null : "One or more steps failed during test execution",
        completedAt: new Date(),
        duration: totalDuration
      }
    })

    return {
      success: allStepsSuccessful,
      executionId: testExecution.id,
      message: allStepsSuccessful ? 
        `Test workflow completed successfully in ${totalDuration}ms` :
        "Test workflow failed during execution",
      stepResults,
      totalDuration
    }

  } catch (error) {
    return {
      success: false,
      message: `Test workflow execution error: ${error.message}`,
      error: error.message
    }
  }
}