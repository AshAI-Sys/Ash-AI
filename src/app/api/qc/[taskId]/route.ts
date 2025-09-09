import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, TaskStatus, OrderStatus } from '@prisma/client'
import { sanitizeString, validateNumber, isValidUUID, isRateLimited } from '@/lib/validation'

// POST /api/qc/[taskId] - Complete QC inspection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only QC inspectors can complete QC records
    if (session.user.role !== Role.QC_INSPECTOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limiting for QC operations
    if (isRateLimited(session.user.id, 50, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    
    const { taskId } = await params

    // Validate task ID format
    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 })
    }

    const body = await request.json()
    const {
      status, // 'PASS', 'FAIL', 'PARTIAL'
      passedQty,
      rejectedQty,
      rejectReason,
      notes,
      photoUrls = []
    } = body

    // Validate and sanitize input
    const validStatuses = ['PASS', 'FAIL', 'PARTIAL']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (PASS, FAIL, PARTIAL) is required' },
        { status: 400 }
      )
    }

    const sanitizedRejectReason = rejectReason ? sanitizeString(rejectReason, 500) : null
    const sanitizedNotes = notes ? sanitizeString(notes, 1000) : null

    if (status === 'FAIL' && !sanitizedRejectReason) {
      return NextResponse.json(
        { error: 'Reject reason is required for failed inspections' },
        { status: 400 }
      )
    }

    // Validate quantities
    const validPassedQty = validateNumber(passedQty, 0, 100000)
    const validRejectedQty = validateNumber(rejectedQty, 0, 100000)
    
    if (validPassedQty === null || validRejectedQty === null) {
      return NextResponse.json(
        { error: 'Invalid quantity values' },
        { status: 400 }
      )
    }

    // Validate photo URLs if provided
    if (photoUrls && Array.isArray(photoUrls)) {
      const maxPhotos = 20
      if (photoUrls.length > maxPhotos) {
        return NextResponse.json(
          { error: `Maximum ${maxPhotos} photos allowed` },
          { status: 400 }
        )
      }
      
      // Basic URL validation
      for (const url of photoUrls) {
        if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
          return NextResponse.json(
            { error: 'Invalid photo URL format' },
            { status: 400 }
          )
        }
      }
    }

    // Validate task exists and is in progress
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        order: true,
        assignee: true
      }
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

    if (task.status !== TaskStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Task must be in progress to complete QC' },
        { status: 400 }
      )
    }

    // Ensure quantities are valid against order quantity
    const totalQty = task.order.quantity

    if (validPassedQty + validRejectedQty > totalQty) {
      return NextResponse.json(
        { error: 'Total passed and rejected quantities cannot exceed order quantity' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create QC record
      const qcRecord = await tx.qCRecord.create({
        data: {
          taskId: task.id,
          orderId: task.orderId,
          inspectorId: session.user.id,
          status,
          passedQty: validPassedQty,
          rejectedQty: validRejectedQty,
          rejectReason: status === 'FAIL' ? sanitizedRejectReason : null,
          notes: sanitizedNotes,
          photoUrls: (photoUrls && Array.isArray(photoUrls) && photoUrls.length > 0) ? photoUrls.slice(0, 20) : null
        },
        include: {
          inspector: {
            select: { id: true, name: true }
          }
        }
      })

      // Update task status based on QC result
      let taskStatus: TaskStatus
      let orderStatus: OrderStatus | null = null

      if (status === 'PASS') {
        taskStatus = TaskStatus.COMPLETED
        orderStatus = OrderStatus.QC_PASSED
      } else if (status === 'FAIL') {
        taskStatus = TaskStatus.REJECTED
        orderStatus = OrderStatus.QC_FAILED
      } else { // PARTIAL
        taskStatus = TaskStatus.COMPLETED
        orderStatus = OrderStatus.QC_PASSED // Partial pass still moves forward
      }

      // Update task
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          status: taskStatus,
          completedAt: taskStatus === TaskStatus.COMPLETED ? new Date() : null,
          rejectedAt: taskStatus === TaskStatus.REJECTED ? new Date() : null,
          rejectReason: taskStatus === TaskStatus.REJECTED ? rejectReason : null
        }
      })

      // Update order status
      await tx.order.update({
        where: { id: task.orderId },
        data: { status: orderStatus }
      })

      // If QC passed, activate the next task in pipeline (finishing)
      if (status === 'PASS' || status === 'PARTIAL') {
        await tx.task.updateMany({
          where: {
            orderId: task.orderId,
            taskType: 'FINISHING',
            status: TaskStatus.PENDING
          },
          data: {
            status: TaskStatus.PENDING // Make sure finishing task is available
          }
        })
      }

      // If QC failed, we might want to return to previous step
      if (status === 'FAIL') {
        // This would require more complex logic to determine which step to return to
        // For now, we'll just mark the order as QC_FAILED
      }

      return { qcRecord, updatedTask, orderStatus }
    })

    return NextResponse.json({
      message: 'QC inspection completed successfully',
      qcRecord: result.qcRecord,
      taskStatus: result.updatedTask.status,
      orderStatus: result.orderStatus,
      nextStep: status === 'PASS' || status === 'PARTIAL' ? 'FINISHING' : 'REWORK'
    })

  } catch (_error) {
    console.error('Error completing QC inspection:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/qc/[taskId] - Get QC details for specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only QC inspectors, admins, and managers can view QC details
    const canViewQC = [Role.QC_INSPECTOR, Role.ADMIN, Role.MANAGER].includes(session.user.role)
    if (!canViewQC) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { taskId } = await params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
      }
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

    return NextResponse.json({
      task,
      qcHistory: task.qcRecords
    })

  } catch (_error) {
    console.error('Error fetching QC details:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}