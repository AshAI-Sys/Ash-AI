import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskPipelineService } from '@/lib/taskPipeline'
import { Role, TaskStatus, OrderStatus, Prisma } from '@prisma/client'

// GET /api/tasks/[id] - Get specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            brand: true,
            created_by: {
              select: { id: true, name: true }
            }
          }
        },
        assignee: {
          select: { id: true, name: true, role: true }
        },
        taskCosts: true,
        qcRecords: {
          include: {
            inspector: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check if user can access this task
    const canAccess = 
      session.user.role === Role.ADMIN ||
      session.user.role === Role.MANAGER ||
      task.assignedTo === session.user.id

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ task })

  } catch (_error) {
    console.error('Error fetching task:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/tasks/[id] - Update task status and handle workflow transitions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, rejectReason, notes, assignedTo } = body

    // Validate action
    const validActions = ['start', 'complete', 'reject', 'hold', 'reassign']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const { id } = await params
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            brand: true
          }
        },
        assignee: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check permissions
    const canModify = 
      session.user.role === Role.ADMIN ||
      session.user.role === Role.MANAGER ||
      (task.assignedTo === session.user.id && ['start', 'complete', 'reject'].includes(action))

    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let updateData: Prisma.TaskUpdateInput = {}
    let orderStatusUpdate: OrderStatus | null = null

    switch (action) {
      case 'start':
        if (task.status !== TaskStatus.PENDING) {
          return NextResponse.json(
            { error: 'Task cannot be started' },
            { status: 400 }
          )
        }
        updateData = {
          status: TaskStatus.IN_PROGRESS,
          startedAt: new Date()
        }
        break

      case 'complete':
        if (task.status !== TaskStatus.IN_PROGRESS) {
          return NextResponse.json(
            { error: 'Task must be in progress to complete' },
            { status: 400 }
          )
        }
        updateData = {
          status: TaskStatus.COMPLETED,
          completedAt: new Date()
        }
        break

      case 'reject':
        if (!rejectReason) {
          return NextResponse.json(
            { error: 'Reject reason is required' },
            { status: 400 }
          )
        }
        updateData = {
          status: TaskStatus.REJECTED,
          rejectedAt: new Date(),
          rejectReason
        }
        break

      case 'hold':
        updateData = {
          status: TaskStatus.ON_HOLD
        }
        break

      case 'reassign':
        if (!assignedTo) {
          return NextResponse.json(
            { error: 'assignedTo is required for reassignment' },
            { status: 400 }
          )
        }
        // Validate new assignee
        const newAssignee = await prisma.user.findUnique({
          where: { id: assignedTo }
        })
        if (!newAssignee) {
          return NextResponse.json(
            { error: 'New assignee not found' },
            { status: 404 }
          )
        }
        updateData = {
          assignedTo,
          status: TaskStatus.PENDING // Reset to pending for new assignee
        }
        break
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the task
      const updatedTask = await tx.task.update({
        where: { id },
        data: updateData,
        include: {
          order: {
            include: {
              brand: true,
              tasks: true
            }
          },
          assignee: {
            select: { id: true, name: true, role: true }
          }
        }
      })

      // Handle workflow transitions when task is completed
      if (action === 'complete') {
        // Get all tasks for this order
        const orderTasks = await tx.task.findMany({
          where: { order_id: task.order_id },
          orderBy: { priority: 'desc' }
        })

        // Check if this was a QC task
        if (task.taskType === 'QUALITY_CONTROL') {
          orderStatusUpdate = OrderStatus.QC_PASSED
        }

        // Check if this was the finishing task (last task)
        const finishingTask = orderTasks.find(t => t.taskType === 'FINISHING')
        if (finishingTask && finishingTask.id === task.id) {
          orderStatusUpdate = OrderStatus.READY_FOR_DELIVERY
        }

        // Find and activate next tasks in the pipeline
        const completedTaskTypes = orderTasks
          .filter(t => t.status === TaskStatus.COMPLETED)
          .map(t => t.taskType)
        
        const nextTasks = TaskPipelineService.getNextAvailableTasks(
          task.taskType,
          task.order.printMethod
        )

        // Activate next tasks if dependencies are met
        for (const nextTaskType of nextTasks) {
          const canStart = TaskPipelineService.canStartTask(
            nextTaskType,
            completedTaskTypes,
            task.order.printMethod
          )

          if (canStart) {
            await tx.task.updateMany({
              where: {
                order_id: task.order_id,
                taskType: nextTaskType,
                status: TaskStatus.PENDING
              },
              data: {
                status: TaskStatus.PENDING
              }
            })
          }
        }
      }

      // Handle task rejection - may need to return order to previous status
      if (action === 'reject') {
        if (task.taskType === 'QUALITY_CONTROL') {
          orderStatusUpdate = OrderStatus.QC_FAILED
        }
      }

      // Update order status if needed
      if (orderStatusUpdate) {
        await tx.order.update({
          where: { id: task.order_id },
          data: { status: orderStatusUpdate }
        })
      }

      return updatedTask
    })

    return NextResponse.json({
      message: `Task ${action}ed successfully`,
      task: result,
      orderStatusUpdated: orderStatusUpdate
    })

  } catch (_error) {
    console.error('Error updating task:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Delete task (admin/manager only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can delete tasks
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    
    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Task deleted successfully'
    })

  } catch (_error) {
    console.error('Error deleting task:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}