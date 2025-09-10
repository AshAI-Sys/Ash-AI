import { prisma as db } from './db'
import { AuditLog, User } from '@prisma/client'
import { NextRequest } from 'next/server'

export interface AuditLogData {
  user_id?: string
  action: string
  entity: string
  entityId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface AuditSearchFilters {
  user_id?: string
  action?: string
  entity?: string
  entityId?: string
  dateFrom?: Date
  dateTo?: Date
  ipAddress?: string
}

export interface AuditAnalytics {
  totalLogs: number
  uniqueUsers: number
  topActions: Array<{
    action: string
    count: number
  }>
  topEntities: Array<{
    entity: string
    count: number
  }>
  userActivity: Array<{
    user_id: string
    userName: string
    actionCount: number
    lastActivity: Date
  }>
  suspiciousActivity: Array<{
    type: 'MULTIPLE_LOGINS' | 'HIGH_VOLUME' | 'UNUSUAL_HOURS' | 'FAILED_ATTEMPTS'
    user_id?: string
    count: number
    details: string
  }>
}

class AuditLogger {
  private sensitiveFields = new Set([
    'password', 'secret', 'token', 'key', 'apiKey', 'apiSecret'
  ])

  async log(data: AuditLogData): Promise<AuditLog> {
    const cleanedOldValues = this.sanitizeData(data.oldValues)
    const cleanedNewValues = this.sanitizeData(data.newValues)

    return db.auditLog.create({
      data: {
        user_id: data.user_id,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldValues: cleanedOldValues as any,
        newValues: cleanedNewValues as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        timestamp: new Date()
      }
    })
  }

  async logFromRequest(
    request: NextRequest,
    data: {
      user_id?: string
      action: string
      entity: string
      entityId?: string
      oldValues?: Record<string, any>
      newValues?: Record<string, any>
      sessionId?: string
    }
  ): Promise<AuditLog> {
    const ipAddress = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || undefined

    return this.log({
      ...data,
      ipAddress,
      userAgent
    })
  }

  async logCreate(
    entity: string,
    entityId: string,
    newValues: Record<string, any>,
    user_id?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id,
      action: 'CREATE',
      entity,
      entityId,
      newValues,
      metadata
    })
  }

  async logUpdate(
    entity: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    user_id?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id,
      action: 'UPDATE',
      entity,
      entityId,
      oldValues,
      newValues,
      metadata
    })
  }

  async logDelete(
    entity: string,
    entityId: string,
    oldValues: Record<string, any>,
    user_id?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id,
      action: 'DELETE',
      entity,
      entityId,
      oldValues,
      metadata
    })
  }

  async logLogin(
    user_id: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id: success ? user_id : undefined,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      entity: 'USER',
      entityId: user_id,
      ipAddress,
      userAgent,
      metadata
    })
  }

  async logLogout(
    user_id: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id,
      action: 'LOGOUT',
      entity: 'USER',
      entityId: user_id,
      ipAddress,
      userAgent,
      metadata
    })
  }

  async logPermissionChange(
    targetUserId: string,
    adminUserId: string,
    oldRole: string,
    newRole: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id: adminUserId,
      action: 'PERMISSION_CHANGE',
      entity: 'USER',
      entityId: targetUserId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      metadata
    })
  }

  async logDataExport(
    user_id: string,
    entity: string,
    exportType: string,
    recordCount: number,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      user_id,
      action: 'DATA_EXPORT',
      entity,
      newValues: {
        exportType,
        recordCount
      },
      metadata
    })
  }

  async logSystemEvent(
    event: string,
    entity: string,
    details: Record<string, any>,
    user_id?: string
  ): Promise<AuditLog> {
    return this.log({
      user_id,
      action: `SYSTEM_${event}`,
      entity,
      newValues: details
    })
  }

  async searchLogs(
    filters: AuditSearchFilters,
    page: number = 1,
    limit: number = 100
  ): Promise<{
    logs: Array<AuditLog & { user?: User | null }>
    total: number
    page: number
    totalPages: number
  }> {
    const where: any = {}

    if (filters.user_id) where.user_id = filters.user_id
    if (filters.action) where.action = filters.action
    if (filters.entity) where.entity = filters.entity
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.ipAddress) where.ipAddress = filters.ipAddress

    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {}
      if (filters.dateFrom) where.timestamp.gte = filters.dateFrom
      if (filters.dateTo) where.timestamp.lte = filters.dateTo
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
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
        skip: (page - 1) * limit,
        take: limit
      }),
      db.auditLog.count({ where })
    ])

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async getAnalytics(
    dateFrom: Date,
    dateTo: Date
  ): Promise<AuditAnalytics> {
    const logs = await db.auditLog.findMany({
      where: {
        timestamp: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      include: {
        user: true
      }
    })

    const totalLogs = logs.length
    const uniqueUsers = new Set(logs.map(log => log.user_id).filter(Boolean)).size

    // Top actions
    const actionCounts = new Map<string, number>()
    logs.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1)
    })

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top entities
    const entityCounts = new Map<string, number>()
    logs.forEach(log => {
      entityCounts.set(log.entity, (entityCounts.get(log.entity) || 0) + 1)
    })

    const topEntities = Array.from(entityCounts.entries())
      .map(([entity, count]) => ({ entity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // User activity
    const userActivity = new Map<string, { userName: string, actionCount: number, lastActivity: Date }>()
    logs.forEach(log => {
      if (log.user_id && log.user) {
        const existing = userActivity.get(log.user_id)
        const activity = {
          userName: log.user.name,
          actionCount: (existing?.actionCount || 0) + 1,
          lastActivity: existing ? 
            (log.timestamp > existing.lastActivity ? log.timestamp : existing.lastActivity) :
            log.timestamp
        }
        userActivity.set(log.user_id, activity)
      }
    })

    const userActivityArray = Array.from(userActivity.entries())
      .map(([user_id, data]) => ({ user_id, ...data }))
      .sort((a, b) => b.actionCount - a.actionCount)

    // Suspicious activity detection
    const suspiciousActivity = await this.detectSuspiciousActivity(logs)

    return {
      totalLogs,
      uniqueUsers,
      topActions,
      topEntities,
      userActivity: userActivityArray,
      suspiciousActivity
    }
  }

  async getUserActivity(
    user_id: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<Array<AuditLog>> {
    return db.auditLog.findMany({
      where: {
        user_id,
        timestamp: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      orderBy: { timestamp: 'desc' }
    })
  }

  async getEntityHistory(
    entity: string,
    entityId: string
  ): Promise<Array<AuditLog & { user?: User | null }>> {
    return db.auditLog.findMany({
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
      orderBy: { timestamp: 'asc' }
    })
  }

  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await db.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }

  private sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined

    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private getClientIP(request: NextRequest): string | undefined {
    // Try various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    return realIp || cfConnectingIp || undefined
  }

  private async detectSuspiciousActivity(logs: AuditLog[]): Promise<Array<{
    type: 'MULTIPLE_LOGINS' | 'HIGH_VOLUME' | 'UNUSUAL_HOURS' | 'FAILED_ATTEMPTS'
    user_id?: string
    count: number
    details: string
  }>> {
    const suspicious: Array<{
      type: 'MULTIPLE_LOGINS' | 'HIGH_VOLUME' | 'UNUSUAL_HOURS' | 'FAILED_ATTEMPTS'
      user_id?: string
      count: number
      details: string
    }> = []

    // Multiple logins from different IPs
    const userIPs = new Map<string, Set<string>>()
    logs.filter(log => log.action === 'LOGIN_SUCCESS' && log.user_id && log.ipAddress)
      .forEach(log => {
        if (!userIPs.has(log.user_id!)) {
          userIPs.set(log.user_id!, new Set())
        }
        userIPs.get(log.user_id!)!.add(log.ipAddress!)
      })

    userIPs.forEach((ips, user_id) => {
      if (ips.size > 5) { // More than 5 different IPs
        suspicious.push({
          type: 'MULTIPLE_LOGINS',
          user_id,
          count: ips.size,
          details: `User logged in from ${ips.size} different IP addresses`
        })
      }
    })

    // High volume of actions
    const userActionCounts = new Map<string, number>()
    logs.forEach(log => {
      if (log.user_id) {
        userActionCounts.set(log.user_id, (userActionCounts.get(log.user_id) || 0) + 1)
      }
    })

    userActionCounts.forEach((count, user_id) => {
      if (count > 1000) { // More than 1000 actions
        suspicious.push({
          type: 'HIGH_VOLUME',
          user_id,
          count,
          details: `User performed ${count} actions in the selected period`
        })
      }
    })

    // Unusual hours (activity between midnight and 6 AM)
    const nightActivity = logs.filter(log => {
      const hour = log.timestamp.getHours()
      return hour >= 0 && hour < 6 && log.user_id
    })

    const nightActivityByUser = new Map<string, number>()
    nightActivity.forEach(log => {
      if (log.user_id) {
        nightActivityByUser.set(log.user_id, (nightActivityByUser.get(log.user_id) || 0) + 1)
      }
    })

    nightActivityByUser.forEach((count, user_id) => {
      if (count > 20) { // More than 20 actions during night hours
        suspicious.push({
          type: 'UNUSUAL_HOURS',
          user_id,
          count,
          details: `User had ${count} actions during night hours (12 AM - 6 AM)`
        })
      }
    })

    // Failed login attempts
    const failedAttempts = logs.filter(log => log.action === 'LOGIN_FAILURE')
    const failedByIP = new Map<string, number>()
    const failedByUser = new Map<string, number>()

    failedAttempts.forEach(log => {
      if (log.ipAddress) {
        failedByIP.set(log.ipAddress, (failedByIP.get(log.ipAddress) || 0) + 1)
      }
      if (log.entityId) { // entityId contains the attempted user_id
        failedByUser.set(log.entityId, (failedByUser.get(log.entityId) || 0) + 1)
      }
    })

    failedByIP.forEach((count, ip) => {
      if (count > 10) { // More than 10 failed attempts from same IP
        suspicious.push({
          type: 'FAILED_ATTEMPTS',
          count,
          details: `${count} failed login attempts from IP ${ip}`
        })
      }
    })

    failedByUser.forEach((count, user_id) => {
      if (count > 5) { // More than 5 failed attempts for same user
        suspicious.push({
          type: 'FAILED_ATTEMPTS',
          user_id,
          count,
          details: `${count} failed login attempts for user account`
        })
      }
    })

    return suspicious
  }

  // Middleware helper for automatic logging
  createMiddleware() {
    return {
      logRequest: async (
        request: NextRequest,
        user_id?: string,
        action?: string,
        entity?: string
      ) => {
        if (action && entity) {
          await this.logFromRequest(request, {
            user_id,
            action,
            entity
          })
        }
      }
    }
  }
}

export const auditLogger = new AuditLogger()