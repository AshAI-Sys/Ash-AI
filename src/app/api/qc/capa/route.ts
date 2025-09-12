// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/qc/capa - Get CAPA tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const ownerId = searchParams.get('ownerId')
    const assigneeId = searchParams.get('assigneeId')
    const order_id = searchParams.get('order_id')
    const overdue = searchParams.get('overdue') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const capaTasks = await prisma.cAPATask.findMany({
      where: {
        workspace_id: 'default',
        ...(status && { status: status as any }),
        ...(priority && { priority }),
        ...(ownerId && { ownerId }),
        ...(assigneeId && { assigneeId }),
        ...(order_id && { order_id }),
        ...(overdue && {
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'VERIFIED', 'CANCELLED'] }
        })
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            clientName: true,
            productType: true
          }
        },
        sourceInspection: {
          select: {
            id: true,
            stage: true,
            disposition: true,
            actualDefects: true
          }
        },
        owner: {
          select: {
            name: true,
            role: true
          }
        },
        assignee: {
          select: {
            name: true,
            role: true
          }
        },
        verifier: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Calculate analytics
    const analytics = {
      total: capaTasks.length,
      byStatus: capaTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      }, {} as any),
      byPriority: capaTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1
        return acc
      }, {} as any),
      overdue: capaTasks.filter(task => 
        task.dueDate && task.dueDate < new Date() && 
        !['DONE', 'VERIFIED', 'CANCELLED'].includes(task.status)
      ).length,
      dueThisWeek: capaTasks.filter(task => {
        if (!task.dueDate) return false
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        return task.dueDate <= weekFromNow && task.dueDate >= new Date()
      }).length
    }

    return NextResponse.json({
      capaTasks,
      analytics,
      total: capaTasks.length
    })

  } catch (_error) {
    console.error('Error fetching CAPA tasks:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/qc/capa - Create new CAPA task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'MANAGER', 'QC_INSPECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      order_id,
      sourceInspectionId,
      title,
      description,
      rootCause,
      correctiveAction,
      preventiveAction,
      ownerId,
      assigneeId,
      dueDate,
      priority = 'MEDIUM'
    } = body

    // Validate required fields
    if (!title || !ownerId) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, ownerId' 
      }, { status: 400 })
    }

    // Validate owner exists
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, role: true }
    })

    if (!owner) {
      return NextResponse.json({ 
        error: 'Owner not found' 
      }, { status: 404 })
    }

    // Validate assignee if provided
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true }
      })

      if (!assignee) {
        return NextResponse.json({ 
          error: 'Assignee not found' 
        }, { status: 404 })
      }
    }

    // Validate source inspection if provided
    if (sourceInspectionId) {
      const inspection = await prisma.qCInspection.findUnique({
        where: { id: sourceInspectionId },
        select: { id: true, order_id: true }
      })

      if (!inspection) {
        return NextResponse.json({ 
          error: 'Source inspection not found' 
        }, { status: 404 })
      }

      // If inspection has order_id, use it
      if (!order_id && inspection.order_id) {
        order_id = inspection.order_id
      }
    }

    const capaTask = await prisma.cAPATask.create({
      data: {
        workspace_id: 'default',
        order_id,
        sourceInspectionId,
        title,
        description,
        rootCause,
        correctiveAction,
        preventiveAction,
        ownerId,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        created_by: session.user.id
      },
      include: {
        order: {
          select: { orderNumber: true }
        },
        owner: {
          select: { name: true }
        },
        assignee: {
          select: { name: true }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: 'CREATE_CAPA_TASK',
        entityType: 'CAPATask',
        entityId: capaTask.id,
        details: `Created CAPA task: ${title}`,
        metadata: {
          order_id,
          sourceInspectionId,
          ownerId,
          assigneeId,
          priority,
          dueDate,
          orderNumber: capaTask.order?.orderNumber
        }
      }
    })

    // Create task for tracking in main task system
    if (order_id) {
      await prisma.task.create({
        data: {
          order_id,
          assignedTo: assigneeId || ownerId,
          taskType: 'CAPA',
          description: `CAPA: ${title}`,
          priority: priority === 'HIGH' ? 5 : priority === 'MEDIUM' ? 3 : 1,
          dueDate: dueDate ? new Date(dueDate) : null,
          metadata: {
            capaTaskId: capaTask.id,
            sourceInspectionId
          }
        }
      })
    }

    // Generate Ashley AI insight for high-priority CAPAs
    if (priority === 'HIGH') {
      await prisma.aIInsight.create({
        data: {
          type: 'ASSIGNMENT',
          priority: 'HIGH',
          title: `High-Priority CAPA Created`,
          message: `High-priority corrective action required: ${title}. Owner: ${capaTask.owner.name}${capaTask.assignee ? `, Assignee: ${capaTask.assignee.name}` : ''}`,
          entityType: 'capa_task',
          entityId: capaTask.id,
          actionRequired: true,
          metadata: {
            capaId: capaTask.id,
            order_id,
            priority,
            dueDate,
            orderNumber: capaTask.order?.orderNumber
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'CAPA task created successfully',
      capaTask: {
        id: capaTask.id,
        title: capaTask.title,
        priority: capaTask.priority,
        status: capaTask.status,
        ownerId: capaTask.ownerId,
        assigneeId: capaTask.assigneeId,
        dueDate: capaTask.dueDate,
        orderNumber: capaTask.order?.orderNumber
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating CAPA task:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}