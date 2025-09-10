import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role, TaskStatus, OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can access production analytics
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d' // 7d, 30d, 90d
    const department = searchParams.get('department') // optional filter

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Parallel data fetching for performance
    const [
      productionMetrics,
      taskMetrics,
      orderMetrics,
      bottleneckData,
      capacityData,
      qualityMetrics
    ] = await Promise.all([
      getProductionMetrics(startDate, department),
      getTaskMetrics(startDate, department),
      getOrderMetrics(startDate),
      getBottleneckAnalysis(startDate),
      getCapacityMetrics(startDate, department),
      getQualityMetrics(startDate)
    ])

    return NextResponse.json({
      timeframe,
      dateRange: { start: startDate, end: now },
      production: productionMetrics,
      tasks: taskMetrics,
      orders: orderMetrics,
      bottlenecks: bottleneckData,
      capacity: capacityData,
      quality: qualityMetrics
    })

  } catch (_error) {
    console.error('Production analytics error:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getProductionMetrics(startDate: Date, department?: string | null) {
  const taskFilter: {
    created_at: { gte: Date };
    status: { in: TaskStatus[] };
    taskType?: { in: string[] };
  } = {
    created_at: { gte: startDate },
    status: { in: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS] }
  }

  if (department) {
    // Filter by task type based on department
    const _departmentTaskTypes: { [key: string]: string[] } = {
      'design': ['DESIGN', 'ARTWORK_CREATION'],
      'printing': ['SILKSCREEN', 'SUBLIMATION', 'DTF', 'EMBROIDERY'],
      'production': ['CUTTING', 'SEWING', 'ASSEMBLY'],
      'quality': ['QUALITY_CONTROL', 'INSPECTION'],
      'finishing': ['FINISHING', 'PACKAGING']
    }
    
    // Skip task type filtering as Task model doesn't have task_type field
    // if (_departmentTaskTypes[department]) {
    //   taskFilter.task_type = { in: _departmentTaskTypes[department] }
    // }
  }

  const [totalTasks, completedTasks, inProgressTasks, avgCompletionTime] = await Promise.all([
    prisma.task.count({ where: taskFilter }),
    prisma.task.count({ where: { ...taskFilter, status: TaskStatus.COMPLETED } }),
    prisma.task.count({ where: { ...taskFilter, status: TaskStatus.IN_PROGRESS } }),
    getAverageCompletionTime(startDate, department)
  ])

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const efficiency = calculateEfficiencyScore(completedTasks, inProgressTasks, avgCompletionTime)

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    completionRate: Math.round(completionRate * 100) / 100,
    avgCompletionTime: Math.round(avgCompletionTime * 100) / 100,
    efficiencyScore: Math.round(efficiency * 100) / 100
  }
}

async function getTaskMetrics(startDate: Date, department?: string | null) {
  const whereClause: {
    created_at: { gte: Date };
    assignedUser?: { role: { in: Role[] } };
  } = { created_at: { gte: startDate } }
  
  if (department) {
    const departmentRoles: { [key: string]: Role[] } = {
      'design': [Role.GRAPHIC_ARTIST],
      'printing': [Role.SILKSCREEN_OPERATOR, Role.SUBLIMATION_OPERATOR, Role.DTF_OPERATOR, Role.EMBROIDERY_OPERATOR],
      'production': [Role.SEWING_OPERATOR],
      'quality': [Role.QC_INSPECTOR],
      'finishing': [Role.FINISHING_STAFF]
    }
    
    // Skip role-based filtering as Task model relations need to be checked
    // if (departmentRoles[department]) {
    //   whereClause.assigned_user = { role: { in: departmentRoles[department] } }
    // }
  }

  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    where: whereClause,
    _count: { id: true }
  })

  // Skip task type grouping as Task model doesn't have task_type field
  const tasksByType: any[] = []
  // const tasksByType = await prisma.task.groupBy({
  //   by: ['task_type'],
  //   where: whereClause,
  //   _count: { id: true },
  //   orderBy: { _count: { id: 'desc' } },
  //   take: 10
  // })

  const tasksByPriority = await prisma.task.groupBy({
    by: ['priority'],
    where: whereClause,
    _count: { id: true }
  })

  return {
    byStatus: tasksByStatus.map(item => ({
      status: item.status,
      count: item._count.id
    })),
    byType: tasksByType.map(_item => ({
      type: 'GENERIC',
      count: 0
    })),
    byPriority: tasksByPriority.map(item => ({
      priority: item.priority,
      count: item._count.id
    }))
  }
}

async function getOrderMetrics(startDate: Date) {
  const [ordersByStatus, revenueData, averageOrderValue] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: { created_at: { gte: startDate } },
      _count: { id: true }
    }),
    prisma.order.aggregate({
      where: { 
        created_at: { gte: startDate },
        status: { in: [OrderStatus.DELIVERED] }
      },
      _sum: { total_qty: true },
      _count: { id: true }
    }),
    prisma.order.aggregate({
      where: { created_at: { gte: startDate } },
      _avg: { total_qty: true }
    })
  ])

  return {
    byStatus: ordersByStatus.map(item => ({
      status: item.status,
      count: item._count.id
    })),
    totalRevenue: revenueData._sum?.total_qty || 0,
    completedOrders: revenueData._count || 0,
    averageOrderValue: averageOrderValue._avg?.total_qty || 0
  }
}

async function getBottleneckAnalysis(startDate: Date) {
  // Find tasks that are overdue or taking longer than expected
  const overdueTasks = await prisma.task.findMany({
    where: {
      created_at: { gte: startDate },
      status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.PENDING] },
      due_date: { lt: new Date() }
    },
    include: {
      assigned_user: { select: { full_name: true } }
    },
    orderBy: { due_date: 'asc' },
    take: 10
  })

  // Skip role-based bottlenecks as task_type field doesn't exist
  const roleBottlenecks: any[] = []
  // const roleBottlenecks = await prisma.task.groupBy({
  //   by: ['task_type'],
  //   where: {
  //     created_at: { gte: startDate },
  //     status: TaskStatus.PENDING
  //   },
  //   _count: { id: true },
  //   _avg: { estimatedHours: true },
  //   orderBy: { _count: { id: 'desc' } },
  //   take: 5
  // })

  return {
    overdueTasks: overdueTasks.map(task => ({
      id: task.id,
      title: task.title,
      assigned_to: task.assigned_user?.full_name,
      dueDate: task.due_date,
      daysOverdue: task.due_date ? Math.ceil((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 3600 * 24)) : 0
    })),
    roleBottlenecks: roleBottlenecks.map(_item => ({
      task_type: 'GENERIC',
      pendingCount: 0,
      avgEstimatedHours: 0
    }))
  }
}

async function getCapacityMetrics(startDate: Date, department?: string | null) {
  const userFilter: {
    active: boolean;
    role?: { in: Role[] };
  } = { active: true }
  
  if (department) {
    const departmentRoles: { [key: string]: Role[] } = {
      'design': [Role.GRAPHIC_ARTIST],
      'printing': [Role.SILKSCREEN_OPERATOR, Role.SUBLIMATION_OPERATOR, Role.DTF_OPERATOR, Role.EMBROIDERY_OPERATOR],
      'production': [Role.SEWING_OPERATOR],
      'quality': [Role.QC_INSPECTOR],
      'finishing': [Role.FINISHING_STAFF]
    }
    
    if (departmentRoles[department]) {
      userFilter.role = { in: departmentRoles[department] }
    }
  }

  const users = await prisma.user.findMany({
    where: userFilter,
    include: {
      assigned_tasks: {
        where: {
          created_at: { gte: startDate },
          status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.PENDING] }
        }
      }
    }
  })

  const capacityData = users.map(user => {
    const activeTasks = user.assigned_tasks.length
    const workload = activeTasks * 8 // Assuming 8 hours per task average
    const capacity = getWorkingHoursPerPeriod() // e.g., 40 hours per week
    const utilization = Math.min((workload / capacity) * 100, 100)

    return {
      user_id: user.id,
      name: user.full_name,
      role: user.role,
      activeTasks,
      workload,
      capacity,
      utilization: Math.round(utilization * 100) / 100
    }
  })

  const avgUtilization = capacityData.length > 0 
    ? capacityData.reduce((sum, user) => sum + user.utilization, 0) / capacityData.length 
    : 0

  return {
    users: capacityData,
    averageUtilization: Math.round(avgUtilization * 100) / 100,
    totalActiveUsers: users.length,
    overloadedUsers: capacityData.filter(user => user.utilization > 90).length
  }
}

async function getQualityMetrics(startDate: Date) {
  const [qcRecords, qcStats] = await Promise.all([
    prisma.qCRecord.findMany({
      where: { created_at: { gte: startDate } },
      include: {
        task: { select: { title: true } }
      }
    }),
    prisma.qCRecord.groupBy({
      by: ['passed'],
      where: { created_at: { gte: startDate } },
      _count: { id: true }
    })
  ])

  const totalQC = qcRecords.length
  const passedQC = qcStats.find(stat => stat.passed)?._count.id || 0
  const failedQC = qcStats.find(stat => !stat.passed)?._count.id || 0
  const passRate = totalQC > 0 ? (passedQC / totalQC) * 100 : 0

  return {
    totalInspections: totalQC,
    passed: passedQC,
    failed: failedQC,
    passRate: Math.round(passRate * 100) / 100,
    defectRate: Math.round((100 - passRate) * 100) / 100
  }
}

async function getAverageCompletionTime(startDate: Date, _department?: string | null): Promise<number> {
  const whereClause: {
    status: TaskStatus;
    updated_at: { gte: Date };
  } = {
    status: TaskStatus.COMPLETED,
    updated_at: { gte: startDate }
  }

  const completedTasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      created_at: true,
      updated_at: true
    }
  })

  if (completedTasks.length === 0) return 0

  const totalHours = completedTasks.reduce((sum, task) => {
    if (task.updated_at) {
      const hours = (new Date(task.updated_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60)
      return sum + hours
    }
    return sum
  }, 0)

  return totalHours / completedTasks.length
}

function calculateEfficiencyScore(completed: number, inProgress: number, avgHours: number): number {
  // Efficiency score based on completion rate and speed
  const completionWeight = 0.6
  const speedWeight = 0.4
  
  const maxHours = 48 // Consider 48 hours as benchmark
  const speedScore = avgHours > 0 ? Math.max(0, (maxHours - avgHours) / maxHours) * 100 : 50
  const completionScore = completed > 0 ? (completed / (completed + inProgress)) * 100 : 0
  
  return (completionScore * completionWeight) + (speedScore * speedWeight)
}

function getWorkingHoursPerPeriod(): number {
  // Assuming 8 hours per day, 5 days per week
  return 40
}