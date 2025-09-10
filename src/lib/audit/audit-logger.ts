import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export interface AuditContext {
  user_id?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  request?: NextRequest;
}

export interface AuditEvent {
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_CHANGE' | 'SYSTEM' | 'SECURITY';
}

export class AuditLogger {
  private static sensitiveFields = [
    'password', 'secret', 'token', 'key', 'hash', 'salt',
    'apiKey', 'privateKey', 'backupCodes', 'twoFactorSecret'
  ];

  static async log(event: AuditEvent, context: AuditContext = {}): Promise<void> {
    try {
      const sanitizedOldValues = this.sanitizeValues(event.oldValues);
      const sanitizedNewValues = this.sanitizeValues(event.newValues);

      await prisma.auditLog.create({
        data: {
          user_id: context.user_id,
          action: event.action,
          entity: event.entity,
          entityId: event.entityId,
          oldValues: sanitizedOldValues,
          newValues: sanitizedNewValues,
          ipAddress: this.extractIpAddress(context),
          userAgent: this.extractUserAgent(context),
          sessionId: this.extractSessionId(context),
          timestamp: new Date()
        }
      });

      if (event.severity === 'CRITICAL' || event.category === 'SECURITY') {
        await this.alertSecurityTeam(event, context);
      }

    } catch (_error) {
      console.error('Audit logging failed:', _error);
      await this.fallbackLogging(event, context, _error);
    }
  }

  static async logLogin(user_id: string, success: boolean, context: AuditContext): Promise<void> {
    await this.log({
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entity: 'User',
      entityId: user_id,
      metadata: { success },
      severity: success ? 'LOW' : 'MEDIUM',
      category: 'AUTHENTICATION'
    }, context);
  }

  static async logLogout(user_id: string, context: AuditContext): Promise<void> {
    await this.log({
      action: 'LOGOUT',
      entity: 'User',
      entityId: user_id,
      severity: 'LOW',
      category: 'AUTHENTICATION'
    }, context);
  }

  static async log2FASetup(user_id: string, success: boolean, context: AuditContext): Promise<void> {
    await this.log({
      action: success ? '2FA_ENABLED' : '2FA_SETUP_FAILED',
      entity: 'TwoFactorAuth',
      entityId: user_id,
      metadata: { success },
      severity: success ? 'MEDIUM' : 'HIGH',
      category: 'SECURITY'
    }, context);
  }

  static async log2FADisable(user_id: string, context: AuditContext): Promise<void> {
    await this.log({
      action: '2FA_DISABLED',
      entity: 'TwoFactorAuth',
      entityId: user_id,
      severity: 'HIGH',
      category: 'SECURITY'
    }, context);
  }

  static async logDataCreate(
    entity: string,
    entityId: string,
    data: Record<string, any>,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log({
      action: 'CREATE',
      entity,
      entityId,
      newValues: data,
      severity: 'LOW',
      category: 'DATA_CHANGE'
    }, { ...context, user_id });
  }

  static async logDataUpdate(
    entity: string,
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    const changes = this.getChanges(oldData, newData);
    
    await this.log({
      action: 'UPDATE',
      entity,
      entityId,
      oldValues: changes.old,
      newValues: changes.new,
      severity: this.determineSeverity(entity, changes),
      category: 'DATA_CHANGE'
    }, { ...context, user_id });
  }

  static async logDataDelete(
    entity: string,
    entityId: string,
    data: Record<string, any>,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log({
      action: 'DELETE',
      entity,
      entityId,
      oldValues: data,
      severity: 'MEDIUM',
      category: 'DATA_CHANGE'
    }, { ...context, user_id });
  }

  static async logAccessDenied(
    resource: string,
    action: string,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log({
      action: 'ACCESS_DENIED',
      entity: resource,
      metadata: { attemptedAction: action },
      severity: 'MEDIUM',
      category: 'AUTHORIZATION'
    }, { ...context, user_id });
  }

  static async logFinancialTransaction(
    transactionType: string,
    amount: number,
    walletId: string,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log({
      action: transactionType,
      entity: 'WalletTransaction',
      entityId: walletId,
      metadata: { amount, transactionType },
      severity: amount > 10000 ? 'HIGH' : 'MEDIUM',
      category: 'DATA_CHANGE'
    }, { ...context, user_id });
  }

  static async logInventoryChange(
    itemId: string,
    type: string,
    quantity: number,
    reason: string,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log({
      action: 'INVENTORY_MOVEMENT',
      entity: 'StockMovement',
      entityId: itemId,
      metadata: { type, quantity, reason },
      severity: 'LOW',
      category: 'DATA_CHANGE'
    }, { ...context, user_id });
  }

  static async logSystemEvent(
    event: string,
    metadata?: Record<string, any>,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  ): Promise<void> {
    await this.log({
      action: event,
      entity: 'System',
      metadata,
      severity,
      category: 'SYSTEM'
    });
  }

  static async logSecurityEvent(
    event: string,
    entityId?: string,
    metadata?: Record<string, any>,
    user_id?: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log({
      action: event,
      entity: 'Security',
      entityId,
      metadata,
      severity: 'HIGH',
      category: 'SECURITY'
    }, { ...context, user_id });
  }

  private static sanitizeValues(values?: Record<string, any>): Record<string, any> | null {
    if (!values) return null;

    const sanitized = { ...values };
    
    for (const field of this.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && this.looksLikeSensitiveData(value)) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private static looksLikeSensitiveData(value: string): boolean {
    const patterns = [
      /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64
      /^[a-f0-9]{32,}$/i, // Hex hash
      /^[A-Z0-9]{32,}$/, // API keys
      /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/ // bcrypt hash
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  private static getChanges(
    oldData: Record<string, any>,
    newData: Record<string, any>
  ): { old: Record<string, any>; new: Record<string, any> } {
    const changes = { old: {}, new: {} };

    for (const key of Object.keys({ ...oldData, ...newData })) {
      if (oldData[key] !== newData[key]) {
        changes.old[key] = oldData[key];
        changes.new[key] = newData[key];
      }
    }

    return changes;
  }

  private static determineSeverity(
    entity: string,
    changes: { old: Record<string, any>; new: Record<string, any> }
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalFields = ['password', 'role', 'active', 'enabled'];
    const highImpactFields = ['status', 'amount', 'quantity', 'price'];

    const changedFields = Object.keys(changes.new);

    if (criticalFields.some(field => changedFields.includes(field))) {
      return 'CRITICAL';
    }

    if (highImpactFields.some(field => changedFields.includes(field))) {
      return 'HIGH';
    }

    if (['User', 'Order', 'Invoice', 'Payment'].includes(entity)) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private static extractIpAddress(context: AuditContext): string {
    if (context.ipAddress) return context.ipAddress;
    if (context.request) {
      return context.request.headers.get('x-forwarded-for') || 
             context.request.headers.get('x-forwarded-for') || 
             context.request.headers.get('x-real-ip') ||
             'unknown';
    }
    return 'unknown';
  }

  private static extractUserAgent(context: AuditContext): string {
    if (context.userAgent) return context.userAgent;
    if (context.request) {
      return context.request.headers.get('user-agent') || 'unknown';
    }
    return 'unknown';
  }

  private static extractSessionId(context: AuditContext): string {
    if (context.sessionId) return context.sessionId;
    if (context.request) {
      return context.request.cookies.get('next-auth.session-token')?.value || 'unknown';
    }
    return 'unknown';
  }

  private static async alertSecurityTeam(event: AuditEvent, context: AuditContext): Promise<void> {
    console.warn('SECURITY ALERT:', {
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      user_id: context.user_id,
      ipAddress: this.extractIpAddress(context),
      timestamp: new Date().toISOString()
    });

    // In production, send to monitoring system, email, Slack, etc.
  }

  private static async fallbackLogging(
    event: AuditEvent,
    context: AuditContext,
    _error: any
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      context: {
        user_id: context.user_id,
        ipAddress: this.extractIpAddress(context),
        userAgent: this.extractUserAgent(context)
      },
      error: _error.message
    };

    console.error('AUDIT LOG (FALLBACK):', JSON.stringify(logEntry));
    
    // In production, write to file system or external logging service
  }

  static async getAuditTrail(
    entityType?: string,
    entityId?: string,
    user_id?: string,
    dateRange?: { from: Date; to: Date },
    limit: number = 100
  ) {
    const where: any = {};

    if (entityType) where.entity = entityType;
    if (entityId) where.entityId = entityId;
    if (user_id) where.user_id = user_id;
    if (dateRange) {
      where.timestamp = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }
}