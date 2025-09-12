// @ts-nocheck
import { prisma } from '@/lib/db'
import { TaskStatus, Role } from '@prisma/client'
// Production Pipeline System for Ashley AI
// Handles different production workflows based on process type


export interface PipelineStep {
  step: string
  role: Role
  estimatedHours: number
  dependencies?: string[]
  required: boolean
  description: string
}

// Production Pipeline Definitions
export const PRODUCTION_PIPELINES = {
  SILKSCREEN: [
    {
      step: 'GRAPHIC_DESIGN',
      role: Role.GRAPHIC_ARTIST,
      estimatedHours: 4,
      required: true,
      description: 'Create artwork and color separations'
    },
    {
      step: 'SCREEN_MAKING',
      role: Role.SCREEN_MAKING,
      estimatedHours: 2,
      dependencies: ['GRAPHIC_DESIGN'],
      required: true,
      description: 'Prepare screens and frames'
    },
    {
      step: 'SILKSCREEN_PRINTING',
      role: Role.SILKSCREEN_OPERATOR,
      estimatedHours: 6,
      dependencies: ['SCREEN_MAKING'],
      required: true,
      description: 'Print designs using silkscreen method'
    },
    {
      step: 'SEWING',
      role: Role.SEWING_OPERATOR,
      estimatedHours: 8,
      dependencies: ['SILKSCREEN_PRINTING'],
      required: true,
      description: 'Sew printed pieces into garments'
    },
    {
      step: 'QUALITY_CONTROL',
      role: Role.QC_INSPECTOR,
      estimatedHours: 2,
      dependencies: ['SEWING'],
      required: true,
      description: 'Inspect quality and approve/reject'
    },
    {
      step: 'FINISHING',
      role: Role.FINISHING_STAFF,
      estimatedHours: 3,
      dependencies: ['QUALITY_CONTROL'],
      required: true,
      description: 'Pack, label, and prepare for delivery'
    },
    {
      step: 'DELIVERY',
      role: Role.DRIVER,
      estimatedHours: 4,
      dependencies: ['FINISHING'],
      required: true,
      description: 'Deliver completed order to client'
    }
  ],

  DTF: [
    {
      step: 'GRAPHIC_DESIGN',
      role: Role.GRAPHIC_ARTIST,
      estimatedHours: 3,
      required: true,
      description: 'Create artwork for DTF printing'
    },
    {
      step: 'DTF_PRINTING',
      role: Role.DTF_OPERATOR,
      estimatedHours: 4,
      dependencies: ['GRAPHIC_DESIGN'],
      required: true,
      description: 'Print design on DTF film'
    },
    {
      step: 'SEWING',
      role: Role.SEWING_OPERATOR,
      estimatedHours: 6,
      dependencies: ['DTF_PRINTING'],
      required: false,
      description: 'Sew garments if required'
    },
    {
      step: 'QUALITY_CONTROL',
      role: Role.QC_INSPECTOR,
      estimatedHours: 1.5,
      dependencies: ['DTF_PRINTING', 'SEWING'],
      required: true,
      description: 'Inspect quality and approve/reject'
    },
    {
      step: 'FINISHING',
      role: Role.FINISHING_STAFF,
      estimatedHours: 2,
      dependencies: ['QUALITY_CONTROL'],
      required: true,
      description: 'Pack and prepare for delivery'
    },
    {
      step: 'DELIVERY',
      role: Role.DRIVER,
      estimatedHours: 4,
      dependencies: ['FINISHING'],
      required: true,
      description: 'Deliver completed order to client'
    }
  ],

  SUBLIMATION: [
    {
      step: 'GRAPHIC_DESIGN',
      role: Role.GRAPHIC_ARTIST,
      estimatedHours: 3,
      required: true,
      description: 'Create artwork for sublimation printing'
    },
    {
      step: 'SUBLIMATION_PRINTING',
      role: Role.SUBLIMATION_OPERATOR,
      estimatedHours: 5,
      dependencies: ['GRAPHIC_DESIGN'],
      required: true,
      description: 'Print using sublimation method'
    },
    {
      step: 'SEWING',
      role: Role.SEWING_OPERATOR,
      estimatedHours: 6,
      dependencies: ['SUBLIMATION_PRINTING'],
      required: false,
      description: 'Sew garments if required'
    },
    {
      step: 'QUALITY_CONTROL',
      role: Role.QC_INSPECTOR,
      estimatedHours: 1.5,
      dependencies: ['SUBLIMATION_PRINTING', 'SEWING'],
      required: true,
      description: 'Inspect quality and approve/reject'
    },
    {
      step: 'FINISHING',
      role: Role.FINISHING_STAFF,
      estimatedHours: 2,
      dependencies: ['QUALITY_CONTROL'],
      required: true,
      description: 'Pack and prepare for delivery'
    },
    {
      step: 'DELIVERY',
      role: Role.DRIVER,
      estimatedHours: 4,
      dependencies: ['FINISHING'],
      required: true,
      description: 'Deliver completed order to client'
    }
  ],

  EMBROIDERY: [
    {
      step: 'GRAPHIC_DESIGN',
      role: Role.GRAPHIC_ARTIST,
      estimatedHours: 5,
      required: true,
      description: 'Create embroidery design and digitization'
    },
    {
      step: 'EMBROIDERY',
      role: Role.EMBROIDERY_OPERATOR,
      estimatedHours: 8,
      dependencies: ['GRAPHIC_DESIGN'],
      required: true,
      description: 'Embroider design on garments'
    },
    {
      step: 'SEWING',
      role: Role.SEWING_OPERATOR,
      estimatedHours: 6,
      dependencies: ['EMBROIDERY'],
      required: false,
      description: 'Additional sewing if required'
    },
    {
      step: 'QUALITY_CONTROL',
      role: Role.QC_INSPECTOR,
      estimatedHours: 2,
      dependencies: ['EMBROIDERY', 'SEWING'],
      required: true,
      description: 'Inspect embroidery quality'
    },
    {
      step: 'FINISHING',
      role: Role.FINISHING_STAFF,
      estimatedHours: 2.5,
      dependencies: ['QUALITY_CONTROL'],
      required: true,
      description: 'Trim threads, pack, and prepare'
    },
    {
      step: 'DELIVERY',
      role: Role.DRIVER,
      estimatedHours: 4,
      dependencies: ['FINISHING'],
      required: true,
      description: 'Deliver completed order to client'
    }
  ]
} as const

export class ProductionPipelineManager {
  
  /**
   * Generate tasks for an order based on its process type
   */
  async generateOrderTasks(order_id: string) {
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { brand: true }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    const pipeline = PRODUCTION_PIPELINES[order.process_type]
    if (!pipeline) {
      throw new Error(`No pipeline defined for process type: ${order.process_type}`)
    }

    // Clear existing tasks if any
    await prisma.task.deleteMany({
      where: { order_id: order_id }
    })

    // Calculate due dates for each step
    const orderDeadline = order.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks default
    const tasks = this.calculateTaskSchedule(pipeline, orderDeadline)

    // Create tasks in database
    const createdTasks = []
    for (let i = 0; i < tasks.length; i++) {
      const step = pipeline[i]
      const taskData = tasks[i]

      const task = await prisma.task.create({
        data: {
          order_id: order_id,
          step: step.step,
          title: `${step.step.replace('_', ' ')} - ${order.design_name}`,
          task_type: step.step,
          assigned_role: step.role,
          status: i === 0 ? TaskStatus.PENDING : TaskStatus.PENDING, // First task is ready, others wait
          priority: this.calculatePriority(order, step),
          due_at: taskData.dueDate,
          estimated_hours: step.estimatedHours,
          notes: step.description,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      createdTasks.push(task)
    }

    // Auto-assign first task to available user
    await this.autoAssignNextTask(order_id)

    return createdTasks
  }

  /**
   * Calculate task schedule working backwards from deadline
   */
  private calculateTaskSchedule(pipeline: readonly PipelineStep[], deadline: Date) {
    const tasks = []
    let currentDate = new Date(deadline)

    // Work backwards through the pipeline
    for (let i = pipeline.length - 1; i >= 0; i--) {
      const step = pipeline[i]
      
      // Calculate start time for this step
      const stepStart = new Date(new Date(currentDate).getTime() - (step.estimatedHours * 60 * 60 * 1000))
      
      tasks.unshift({
        dueDate: new Date(currentDate),
        startDate: stepStart,
        estimatedHours: step.estimatedHours
      })

      // Move deadline back for next step (with 2-hour buffer)
      currentDate = new Date(new Date(stepStart).getTime() - (2 * 60 * 60 * 1000))
    }

    return tasks
  }

  /**
   * Calculate task priority based on order and step
   */
  private calculatePriority(order: { deadline?: string; priority?: string }, step: PipelineStep): number {
    let priority = 5 // Base priority

    // Increase priority based on order deadline
    if (order.deadline) {
      const daysUntilDeadline = (new Date(order.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      if (daysUntilDeadline <= 1) priority += 3
      else if (daysUntilDeadline <= 3) priority += 2
      else if (daysUntilDeadline <= 7) priority += 1
    }

    // Increase priority for critical steps
    if (['QUALITY_CONTROL', 'DELIVERY'].includes(step.step)) {
      priority += 1
    }

    // Order priority modifier
    priority += (order.priority || 0)

    return Math.min(10, Math.max(1, priority))
  }

  /**
   * Complete a task and unlock next step
   */
  async completeTask(taskId: string, user_id: string, notes?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { order: true }
    })

    if (!task) {
      throw new Error('Task not found')
    }

    // Mark task as completed
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        updated_at: new Date()
      }
    })

    // Log the completion
    await prisma.taskLog.create({
      data: {
        task_id: taskId,
        actor_id: user_id,
        action: 'COMPLETE',
        details: {
          completion_time: new Date().toISOString(),
          notes: notes || null
        }
      }
    })

    // Auto-assign next task
    await this.autoAssignNextTask(task.order_id)

    // Check if order is complete
    await this.checkOrderCompletion(task.order_id)
  }

  /**
   * Auto-assign next available task to appropriate user
   */
  async autoAssignNextTask(order_id: string) {
    // Find next pending task
    const nextTask = await prisma.task.findFirst({
      where: {
        order_id: order_id,
        status: TaskStatus.PENDING
      },
      orderBy: { created_at: 'asc' }
    })

    if (!nextTask || !nextTask.assigned_role) return

    // Find available user with the required role
    const availableUser = await prisma.user.findFirst({
      where: {
        role: nextTask.assigned_role,
        active: true
      },
      // TODO: Add workload consideration here
    })

    if (availableUser) {
      await prisma.task.update({
        where: { id: nextTask.id },
        data: {
          assigned_to: availableUser.id,
          updated_at: new Date()
        }
      })

      // Log the assignment
      await prisma.taskLog.create({
        data: {
          task_id: nextTask.id,
          actor_id: 'system', // System auto-assignment
          action: 'ASSIGN',
          details: {
            assigned_to: availableUser.id,
            auto_assigned: true,
            timestamp: new Date().toISOString()
          }
        }
      })
    }
  }

  /**
   * Check if all tasks are complete and update order status
   */
  async checkOrderCompletion(order_id: string) {
    const incompleteTasks = await prisma.task.count({
      where: {
        order_id: order_id,
        status: { not: TaskStatus.COMPLETED }
      }
    })

    if (incompleteTasks === 0) {
      await prisma.order.update({
        where: { id: order_id },
        data: {
          status: 'DELIVERED',
          updated_at: new Date()
        }
      })

      console.log(`Order ${order_id} completed successfully`)
    }
  }

  /**
   * Get pipeline progress for an order
   */
  async getOrderProgress(order_id: string) {
    const tasks = await prisma.task.findMany({
      where: { order_id: order_id },
      include: {
        assignee: {
          select: { id: true, full_name: true, role: true }
        }
      },
      orderBy: { created_at: 'asc' }
    })

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length

    return {
      tasks,
      progress: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    }
  }

  /**
   * Reassign task to different user
   */
  async reassignTask(taskId: string, newUserId: string, actorId: string, reason?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      throw new Error('Task not found')
    }

    const newUser = await prisma.user.findUnique({
      where: { id: newUserId }
    })

    if (!newUser || newUser.role !== task.assigned_role) {
      throw new Error('User not found or role mismatch')
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        assigned_to: newUserId,
        updated_at: new Date()
      }
    })

    // Log the reassignment
    await prisma.taskLog.create({
      data: {
        task_id: taskId,
        actor_id: actorId,
        action: 'REASSIGN',
        details: {
          previous_assignee: task.assigned_to,
          new_assignee: newUserId,
          reason: reason || 'Manual reassignment',
          timestamp: new Date().toISOString()
        }
      }
    })
  }
}

// Export singleton instance
export const productionPipeline = new ProductionPipelineManager()