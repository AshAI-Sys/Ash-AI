import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export interface ProductionAlert {
  id: string
  type: 'BOTTLENECK' | 'OVERDUE' | 'QUALITY' | 'CAPACITY' | 'INVENTORY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  affectedEntity: string
  actionRequired: string
  created_at: Date
  data?: unknown
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can access alerts
    if (!['ADMIN', 'MANAGER'].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity') // Filter by severity
    const type = searchParams.get('type') // Filter by alert type

    // Generate real-time alerts
    const alerts = await generateProductionAlerts()

    // Filter alerts if requested
    let filteredAlerts = alerts
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity)
    }
    
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type)
    }

    // Sort by severity and creation time
    const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
    filteredAlerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      alerts: filteredAlerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
        low: alerts.filter(a => a.severity === 'LOW').length
      }
    })

  } catch (_error) {
    console.error('Production alerts error:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateProductionAlerts(): Promise<ProductionAlert[]> {
  const alerts: ProductionAlert[] = []
  const now = new Date()
  
  // Check for overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'PENDING'] },
      due_date: { lt: now }
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { due_date: 'asc' }
  })

  overdueTasks.forEach(task => {
    const daysOverdue = Math.ceil((new Date(now).getTime() - new Date(task.due_date!).getTime()) / (1000 * 3600 * 24))
    
    let severity: ProductionAlert['severity'] = 'LOW'
    if (daysOverdue > 5) severity = 'CRITICAL'
    else if (daysOverdue > 3) severity = 'HIGH'
    else if (daysOverdue > 1) severity = 'MEDIUM'

    alerts.push({
      id: `overdue-${task.id}`,
      type: 'OVERDUE',
      severity,
      title: `Task Overdue: ${task.title}`,
      description: `Task "${task.title}" is ${daysOverdue} day(s) overdue`,
      affectedEntity: `Task ${task.id}`,
      actionRequired: `Contact ${task.assigned_to || 'unassigned'} to resolve delay`,
      created_at: now,
      data: {
        taskId: task.id,
        title: task.title,
        assigned_to: task.assigned_to,
        workspace: task.workspace?.name,
        daysOverdue
      }
    })
  })

  // Check for bottlenecks (roles with many pending tasks)
  const roleBottlenecks = await prisma.task.groupBy({
    by: ['assigned_to'],
    where: {
      status: 'PENDING',
      created_at: { gte: new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000) } // Last 24 hours
    },
    _count: { id: true },
    having: { id: { _count: { gt: 5 } } }, // More than 5 pending tasks
    orderBy: { _count: { id: 'desc' } }
  })

  roleBottlenecks.forEach(bottleneck => {
    let severity: ProductionAlert['severity'] = 'MEDIUM'
    if (bottleneck._count.id > 15) severity = 'CRITICAL'
    else if (bottleneck._count.id > 10) severity = 'HIGH'

    alerts.push({
      id: `bottleneck-${bottleneck.assigned_to || 'unassigned'}`,
      type: 'BOTTLENECK',
      severity,
      title: `Production Bottleneck: ${bottleneck.assigned_to || 'Unassigned'}`,
      description: `${bottleneck._count.id} pending tasks assigned to ${bottleneck.assigned_to || 'unassigned users'}`,
      affectedEntity: bottleneck.assigned_to || 'unassigned',
      actionRequired: 'Consider reallocating resources or hiring temporary staff',
      created_at: now,
      data: {
        assigned_to: bottleneck.assigned_to,
        pendingCount: bottleneck._count.id
      }
    })
  })

  // Check for quality issues
  const recentQCFailures = await prisma.qCRecord.findMany({
    where: {
      passed: false,
      created_at: { gte: new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    },
    include: {
      task: {
        include: {
          order: { select: { orderNumber: true } },
          assigned_user: { select: { name: true, role: true } }
        }
      }
    }
  })

  if (recentQCFailures.length > 0) {
    const qcFailureRate = await calculateQCFailureRate()
    
    let severity: ProductionAlert['severity'] = 'LOW'
    if (qcFailureRate > 20) severity = 'CRITICAL'
    else if (qcFailureRate > 15) severity = 'HIGH'
    else if (qcFailureRate > 10) severity = 'MEDIUM'

    if (qcFailureRate > 10) {
      alerts.push({
        id: `quality-${new Date(now).getTime()}`,
        type: 'QUALITY',
        severity,
        title: `High Quality Failure Rate`,
        description: `QC failure rate is ${qcFailureRate.toFixed(1)}% (${recentQCFailures.length} failures in last 7 days)`,
        affectedEntity: 'Quality Control',
        actionRequired: 'Review production processes and provide additional training',
        created_at: now,
        data: {
          failureRate: qcFailureRate,
          recentFailures: recentQCFailures.length,
          failures: recentQCFailures.map(f => ({
            order_id: f.task.order_id,
            orderNumber: f.task.order?.orderNumber,
            task_type: f.task.task_type,
            assigned_to: f.task.assigned_user?.name
          }))
        }
      })
    }
  }

  // Check for capacity issues (overloaded users)
  const overloadedUsers = await getOverloadedUsers()
  
  overloadedUsers.forEach(user => {
    let severity: ProductionAlert['severity'] = 'MEDIUM'
    if (user.utilization > 150) severity = 'CRITICAL'
    else if (user.utilization > 120) severity = 'HIGH'

    alerts.push({
      id: `capacity-${user.id}`,
      type: 'CAPACITY',
      severity,
      title: `User Overloaded: ${user.name}`,
      description: `${user.name} has ${user.utilization.toFixed(0)}% capacity utilization (${user.activeTasks} active tasks)`,
      affectedEntity: user.name,
      actionRequired: 'Redistribute tasks or provide additional support',
      created_at: now,
      data: {
        user_id: user.id,
        userName: user.name,
        role: user.role,
        utilization: user.utilization,
        activeTasks: user.activeTasks
      }
    })
  })

  // Check for low inventory
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      quantity: { lte: prisma.raw('reorderPoint') }
    },
    include: {
      brand: { select: { name: true } }
    }
  })

  lowStockItems.forEach(item => {
    let severity: ProductionAlert['severity'] = 'MEDIUM'
    if (item.quantity === 0) severity = 'CRITICAL'
    else if (item.quantity <= item.reorderPoint * 0.5) severity = 'HIGH'

    alerts.push({
      id: `inventory-${item.id}`,
      type: 'INVENTORY',
      severity,
      title: item.quantity === 0 ? `Out of Stock: ${item.name}` : `Low Stock: ${item.name}`,
      description: `${item.name} has ${item.quantity} units remaining (reorder point: ${item.reorderPoint})`,
      affectedEntity: item.name,
      actionRequired: 'Order new stock immediately to avoid production delays',
      created_at: now,
      data: {
        itemId: item.id,
        itemName: item.name,
        currentQuantity: item.quantity,
        reorderPoint: item.reorderPoint,
        brandName: item.brand?.name
      }
    })
  })

  return alerts
}

async function calculateQCFailureRate(): Promise<number> {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
  const [totalQC, failedQC] = await Promise.all([
    prisma.qCRecord.count({
      where: { created_at: { gte: last7Days } }
    }),
    prisma.qCRecord.count({
      where: { 
        created_at: { gte: last7Days },
        passed: false 
      }
    })
  ])

  return totalQC > 0 ? (failedQC / totalQC) * 100 : 0
}

async function getOverloadedUsers() {
  const users = await prisma.user.findMany({
    where: { 
      active: true,
      role: { 
        in: [
          Role.GRAPHIC_ARTIST,
          'SILKSCREEN_OPERATOR',
          'SUBLIMATION_OPERATOR',
          'DTF_OPERATOR',
          'EMBROIDERY_OPERATOR',
          'SEWING_OPERATOR',
          'QC_INSPECTOR',
          Role.FINISHING_STAFF
        ] 
      }
    },
    include: {
      assignedTasks: {
        where: {
          status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.PENDING] }
        }
      }
    }
  })

  return users
    .map(user => {
      const activeTasks = user.assignedTasks.length
      const workload = activeTasks * 8 // Assume 8 hours per task
      const weeklyCapacity = 40 // 40 hours per week
      const utilization = (workload / weeklyCapacity) * 100

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        activeTasks,
        workload,
        utilization
      }
    })
    .filter(user => user.utilization > 100) // Only overloaded users
    .sort((a, b) => b.utilization - a.utilization)
}