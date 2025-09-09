import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'
// My Queue API Route - Role-based task management

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    // Build the where clause based on user role
    const whereClause: { assigned_to: string; status?: TaskStatus | { in: TaskStatus[] }; due_at?: { lt: Date } } = {
      assigned_to: session.user.id
    }

    // Apply filter
    switch (filter) {
      case 'pending':
        whereClause.status = TaskStatus.PENDING
        break
      case 'in-progress':
        whereClause.status = TaskStatus.IN_PROGRESS
        break
      case 'overdue':
        whereClause.due_at = {
          lt: new Date()
        }
        whereClause.status = {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
        }
        break
      default:
        // All tasks - no additional filter needed
        break
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            brand: {
              select: {
                name: true,
                code: true
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            full_name: true,
            role: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // High priority first
        { due_at: 'asc' },    // Then by due date
        { created_at: 'desc' } // Then most recent
      ]
    })

    // Get task summary statistics
    const stats = await prisma.task.groupBy({
      by: ['status'],
      where: {
        assigned_to: session.user.id
      },
      _count: {
        id: true
      }
    })

    const summary = {
      total: tasks.length,
      pending: stats.find(s => s.status === TaskStatus.PENDING)?._count.id || 0,
      inProgress: stats.find(s => s.status === TaskStatus.IN_PROGRESS)?._count.id || 0,
      completed: stats.find(s => s.status === TaskStatus.COMPLETED)?._count.id || 0,
      overdue: tasks.filter(task => 
        task.due_at && 
        new Date(task.due_at).getTime() < Date.now() &&
        [TaskStatus.PENDING, TaskStatus.IN_PROGRESS].includes(task.status)
      ).length
    }

    return NextResponse.json({
      tasks,
      summary,
      filter,
      timestamp: new Date().toISOString()
    })

  } catch (_error) {
    console.error('My Queue API error:', _error)
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
    const { action, taskIds, notes } = body

    if (!action || !taskIds || !Array.isArray(taskIds)) {
      return NextResponse.json({ error: 'Action and taskIds array are required' }, { status: 400 })
    }

    let updateData: { status: TaskStatus; started_at?: Date; updated_at: Date; completed_at?: Date } = { status: TaskStatus.PENDING, updated_at: now }
    const now = new Date()

    switch (action) {
      case 'start_batch':
        updateData = {
          status: TaskStatus.IN_PROGRESS,
          started_at: now,
          updated_at: now
        }
        break
      case 'pause_batch':
        updateData = {
          status: TaskStatus.PAUSED,
          updated_at: now
        }
        break
      case 'complete_batch':
        updateData = {
          status: TaskStatus.COMPLETED,
          completed_at: now,
          updated_at: now
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid batch action' }, { status: 400 })
    }

    // Update multiple tasks
    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        assigned_to: session.user.id // Security: only update user's own tasks
      },
      data: updateData
    })

    // Log the batch action
    const taskLogs = taskIds.map(taskId => ({
      task_id: taskId,
      actor_id: session.user.id,
      action: action,
      details: {
        batch_operation: true,
        notes: notes || null,
        timestamp: now.toISOString()
      }
    }))

    await prisma.taskLog.createMany({
      data: taskLogs
    })

    return NextResponse.json({
      success: true,
      updated_count: result.count,
      timestamp: now.toISOString()
    })

  } catch (_error) {
    console.error('My Queue batch action error:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}