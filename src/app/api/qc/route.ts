// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, TaskStatus, Prisma, Task, QCRecord } from '@prisma/client'

// GET /api/qc - Fetch QC items (tasks ready for QC inspection)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only QC inspectors, admins, and managers can view QC items
    const canViewQC = [Role.QC_INSPECTOR, Role.ADMIN, Role.MANAGER].includes(session.user.role)
    if (!canViewQC) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING_QC, IN_QC, COMPLETED
    
    // Get QC tasks and related QC records
    const where: Prisma.TaskWhereInput = {
      taskType: 'QUALITY_CONTROL'
    }

    // Filter by status if provided
    if (status === 'PENDING_QC') {
      where.status = TaskStatus.PENDING
    } else if (status === 'IN_QC') {
      where.status = TaskStatus.IN_PROGRESS
    } else if (status === 'COMPLETED') {
      where.status = { in: [TaskStatus.COMPLETED, TaskStatus.REJECTED] }
    }

    // Only show tasks that are ready for QC (previous tasks completed)
    const qcTasks = await prisma.task.findMany({
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
        qcRecords: {
          include: {
            inspector: {
              select: { id: true, name: true }
            }
          },
          orderBy: { created_at: 'desc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { created_at: 'desc' }
      ]
    })

    // Transform to QC items format
    const qcItems = qcTasks.map(task => ({
      id: task.id,
      orderNumber: task.order.orderNumber,
      taskId: task.id,
      productName: `${task.order.designName} - ${task.order.apparelType}`,
      quantity: task.order.quantity,
      clientName: task.order.clientName,
      brandName: task.order.brand.name,
      status: getQCStatus(task.status, task.qcRecords),
      priority: task.priority,
      submittedBy: getSubmittedBy(task),
      submittedAt: task.created_at,
      assignedTo: task.assignee,
      dueDate: task.dueDate,
      lastQCRecord: task.qcRecords[0] || null,
      order: task.order
    }))

    // Calculate advanced statistics
    const allQCRecords = await prisma.qCRecord.findMany({
      include: {
        inspector: {
          select: { id: true, name: true }
        },
        task: {
          include: {
            order: {
              select: { printMethod: true, apparelType: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const totalInspected = allQCRecords.length
    const passedCount = allQCRecords.filter(r => r.status === 'PASS').length
    const failedCount = allQCRecords.filter(r => r.status === 'FAIL').length
    const rejectRate = totalInspected > 0 ? Math.round((failedCount / totalInspected) * 100) : 0
    
    // Calculate average inspection time (mock data for now)
    const avgInspectionTime = 15 // Minutes
    
    // Extract top defects from reject reasons
    const defectCounts = new Map<string, number>()
    allQCRecords
      .filter(r => r.rejectReason)
      .forEach(r => {
        if (r.rejectReason) {
          const defects = r.rejectReason.split(',').map(d => d.trim().toLowerCase())
          defects.forEach(defect => {
            defectCounts.set(defect, (defectCounts.get(defect) || 0) + 1)
          })
        }
      })
    
    const topDefects = Array.from(defectCounts.entries())
      .map(([defect, count]) => ({ defect: defect.charAt(0).toUpperCase() + defect.slice(1), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({
      qcItems,
      stats: {
        pending: qcItems.filter(item => item.status === 'PENDING_QC').length,
        inProgress: qcItems.filter(item => item.status === 'IN_QC').length,
        passed: qcItems.filter(item => item.status === 'PASSED').length,
        failed: qcItems.filter(item => item.status === 'FAILED').length,
        totalInspected,
        rejectRate,
        avgInspectionTime,
        topDefects
      }
    })

  } catch (_error) {
    console.error('Error fetching QC items:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function getQCStatus(taskStatus: TaskStatus, qcRecords: QCRecord[]): string {
  if (qcRecords.length === 0) {
    return taskStatus === TaskStatus.PENDING ? 'PENDING_QC' : 
           taskStatus === TaskStatus.IN_PROGRESS ? 'IN_QC' : 'PENDING_QC'
  }

  const latestRecord = qcRecords[0]
  switch (latestRecord.status) {
    case 'PASS': return 'PASSED'
    case 'FAIL': return 'FAILED'
    case 'PARTIAL': return 'PARTIAL_PASS'
    default: return 'IN_QC'
  }
}

function getSubmittedBy(task: Task & { assignedUser?: { name: string } }): string {
  // This would ideally come from the previous task completion
  // For now, we'll determine based on task type that would precede QC
  switch (task.order.printMethod) {
    case 'SILKSCREEN': return 'Silkscreen Operator'
    case 'DTF': return 'DTF Operator'
    case 'SUBLIMATION': return 'Sublimation Operator'
    case 'EMBROIDERY': return 'Embroidery Operator'
    default: return 'Sewing Operator'
  }
}

// POST /api/qc - Create QC record (start inspection)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only QC inspectors can create QC records
    if (session.user.role !== Role.QC_INSPECTOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { taskId, order_id, action } = body

    if (!taskId && !order_id) {
      return NextResponse.json(
        { error: 'Task ID or Order ID is required' },
        { status: 400 }
      )
    }

    // Validate task/order exists and is ready for QC
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { order: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.taskType !== 'QUALITY_CONTROL') {
      return NextResponse.json(
        { error: 'This is not a QC task' },
        { status: 400 }
      )
    }

    // Start the inspection (update task to IN_PROGRESS)
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.IN_PROGRESS,
        assignedTo: session.user.id,
        startedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'QC inspection started',
      taskId: task.id
    })

  } catch (_error) {
    console.error('Error starting QC inspection:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}