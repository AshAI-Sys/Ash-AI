import { prisma } from '@/lib/db'

export interface AuditLogEntry {
  userId: string
  action: string
  entity: string
  entityId: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          oldValues: entry.oldValues || null,
          newValues: entry.newValues || null,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          sessionId: entry.sessionId || null
        }
      })
    } catch (_error) {
      console.error('Error logging audit event:', _error)
      // Don't throw - audit logging shouldn't break business logic
    }
  }

  /**
   * Get audit trail for an entity
   */
  static async getAuditTrail(
    entity: string,
    entityId: string,
    limit: number = 100
  ): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: {
        entity,
        entityId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })
  }

  /**
   * Get recent activity across all entities
   */
  static async getRecentActivity(limit: number = 50): Promise<any[]> {
    return await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number
    eventsByAction: Record<string, number>
    eventsByEntity: Record<string, number>
    eventsByUser: Record<string, number>
  }> {
    const where: any = {}
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const [
      totalEvents,
      actionStats,
      entityStats,
      userStats
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      }),
      prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true }
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true }
      })
    ])

    return {
      totalEvents,
      eventsByAction: actionStats.reduce((acc, stat) => {
        acc[stat.action] = stat._count.action
        return acc
      }, {} as Record<string, number>),
      eventsByEntity: entityStats.reduce((acc, stat) => {
        acc[stat.entity] = stat._count.entity
        return acc
      }, {} as Record<string, number>),
      eventsByUser: userStats.reduce((acc, stat) => {
        if (stat.userId) {
          acc[stat.userId] = stat._count.userId
        }
        return acc
      }, {} as Record<string, number>)
    }
  }

  /**
   * Search audit logs
   */
  static async searchAuditLogs(
    query: {
      userId?: string
      action?: string
      entity?: string
      startDate?: Date
      endDate?: Date
    },
    limit: number = 100
  ): Promise<any[]> {
    const where: any = {}
    
    if (query.userId) where.userId = query.userId
    if (query.action) where.action = query.action
    if (query.entity) where.entity = query.entity
    
    if (query.startDate || query.endDate) {
      where.timestamp = {}
      if (query.startDate) where.timestamp.gte = query.startDate
      if (query.endDate) where.timestamp.lte = query.endDate
    }

    return await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })
  }

  /**
   * Clean up old audit logs (for compliance)
   */
  static async cleanupOldLogs(retentionDays: number = 2555): Promise<number> { // 7 years default
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }
}