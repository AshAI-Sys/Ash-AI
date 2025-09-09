import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskPipelineService } from '@/lib/taskPipeline'
import { Role, TaskStatus, Prisma } from '@prisma/client'

// GET /api/tasks - Fetch tasks with role-based filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const myTasks = searchParams.get('myTasks') === 'true'

    const where: Prisma.TaskWhereInput = {}

    // Role-based filtering
    if (session.user.role === Role.ADMIN || session.user.role === Role.MANAGER) {
      // Admins and managers can see all tasks
      if (status) where.status = status
      if (assignedTo) where.assignedTo = assignedTo
    } else {
      // Other users only see their own tasks
      where.assignedTo = session.user.id
      if (status) where.status = status
    }

    // If specifically requesting "my tasks"
    if (myTasks) {
      where.assignedTo = session.user.id
    }

    const [tasksData, total] = await Promise.all([
      prisma.task.findMany({
        where,
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
          qcRecords: true
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { created_at: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.task.count({ where })
    ])

    // Enhance tasks with pipeline information
    const tasks = tasksData.map(task => ({
      ...task,
      requiresMaterials: TaskPipelineService.getRequiredMaterials(task.taskType, task.order.printMethod),
      qualityCheckpoints: TaskPipelineService.getQualityCheckpoints(task.taskType, task.order.printMethod),
      canOutsource: TaskPipelineService.getOutsourceableTasks(task.order.printMethod).includes(task.taskType)
    }))

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (_error) {
    console.error('Error fetching tasks:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create new task (usually done automatically by order creation)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can manually create tasks
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      orderId,
      assignedTo,
      taskType,
      description,
      priority = 0,
      dueDate
    } = body

    // Validate required fields
    if (!orderId || !taskType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Validate assignee exists if provided
    if (assignedTo) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedTo }
      })
      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found' },
          { status: 404 }
        )
      }
    }

    const task = await prisma.task.create({
      data: {
        orderId,
        assignedTo,
        taskType,
        description,
        priority: parseInt(priority),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: TaskStatus.PENDING
      },
      include: {
        order: {
          include: {
            brand: true
          }
        },
        assignee: {
          select: { id: true, name: true, role: true }
        }
      }
    })

    return NextResponse.json({
      message: 'Task created successfully',
      task
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating task:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}