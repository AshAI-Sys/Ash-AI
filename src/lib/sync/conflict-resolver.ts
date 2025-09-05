import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit/audit-logger';

export interface ConflictResolution {
  conflictId: string;
  resolution: 'LOCAL' | 'SERVER' | 'MANUAL';
  manualData?: Record<string, unknown>;
  resolvedBy: string;
  reason?: string;
}

export interface ConflictData {
  id: string;
  entity: string;
  entityId: string;
  field: string;
  localValue: unknown;
  serverValue: unknown;
  createdAt: Date;
}

export class ConflictResolver {
  static async getConflicts(userId?: string): Promise<ConflictData[]> {
    const where = userId ? { 
      OR: [
        { entity: 'Task', entityId: { in: await this.getUserTaskIds(userId) } },
        { entity: 'TimeRecord', entityId: { in: await this.getUserTimeRecordIds(userId) } }
      ]
    } : {};

    const conflicts = await prisma.syncConflict.findMany({
      where: {
        resolved: false,
        ...where
      },
      orderBy: { createdAt: 'asc' }
    });

    return conflicts.map(conflict => ({
      id: conflict.id,
      entity: conflict.entity,
      entityId: conflict.entityId,
      field: conflict.field,
      localValue: conflict.localValue,
      serverValue: conflict.serverValue,
      createdAt: conflict.createdAt
    }));
  }

  static async resolveConflict(
    resolution: ConflictResolution,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const conflict = await prisma.syncConflict.findUnique({
        where: { id: resolution.conflictId }
      });

      if (!conflict) {
        return { success: false, error: 'Conflict not found' };
      }

      if (conflict.resolved) {
        return { success: false, error: 'Conflict already resolved' };
      }

      let finalData: unknown;
      const resolutionType = resolution.resolution;

      switch (resolution.resolution) {
        case 'LOCAL':
          finalData = conflict.localValue;
          break;
        case 'SERVER':
          finalData = conflict.serverValue;
          break;
        case 'MANUAL':
          finalData = resolution.manualData;
          break;
        default:
          return { success: false, error: 'Invalid resolution type' };
      }

      await this.applyResolution(conflict, finalData, userId);

      await prisma.syncConflict.update({
        where: { id: resolution.conflictId },
        data: {
          resolved: true,
          resolution: resolutionType,
          resolvedBy: userId,
          resolvedAt: new Date()
        }
      });

      await AuditLogger.log({
        action: 'CONFLICT_RESOLVED',
        entity: 'SyncConflict',
        entityId: resolution.conflictId,
        metadata: {
          originalEntity: conflict.entity,
          originalEntityId: conflict.entityId,
          field: conflict.field,
          resolutionType,
          localValue: conflict.localValue,
          serverValue: conflict.serverValue,
          finalValue: finalData,
          reason: resolution.reason
        },
        severity: 'MEDIUM',
        category: 'SYSTEM'
      }, { userId });

      return { success: true };

    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Resolution failed' 
      };
    }
  }

  static async resolveAllConflicts(
    conflictIds: string[],
    defaultResolution: 'LOCAL' | 'SERVER',
    userId: string
  ): Promise<{ resolved: number; failed: number; errors: string[] }> {
    let resolved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const conflictId of conflictIds) {
      const result = await this.resolveConflict({
        conflictId,
        resolution: defaultResolution,
        resolvedBy: userId
      }, userId);

      if (result.success) {
        resolved++;
      } else {
        failed++;
        errors.push(`${conflictId}: ${result.error}`);
      }
    }

    return { resolved, failed, errors };
  }

  private static async applyResolution(
    conflict: { entity: string; entityId: string; field: string },
    finalData: unknown,
    userId: string
  ): Promise<void> {
    const { entity, entityId, field } = conflict;

    switch (entity.toLowerCase()) {
      case 'task':
        await this.updateTaskField(entityId, field, finalData, userId);
        break;
      case 'timerecord':
        await this.updateTimeRecordField(entityId, field, finalData, userId);
        break;
      case 'inventoryitem':
        await this.updateInventoryField(entityId, field, finalData, userId);
        break;
      case 'qcrecord':
        await this.updateQCRecordField(entityId, field, finalData, userId);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  private static async updateTaskField(
    taskId: string,
    field: string,
    value: unknown,
    userId: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    updateData[field] = value;

    const oldTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    await AuditLogger.logDataUpdate(
      'Task',
      taskId,
      oldTask || {},
      updateData,
      userId
    );
  }

  private static async updateTimeRecordField(
    recordId: string,
    field: string,
    value: unknown,
    userId: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    updateData[field] = value;

    const oldRecord = await prisma.timeRecord.findUnique({
      where: { id: recordId }
    });

    await prisma.timeRecord.update({
      where: { id: recordId },
      data: updateData
    });

    await AuditLogger.logDataUpdate(
      'TimeRecord',
      recordId,
      oldRecord || {},
      updateData,
      userId
    );
  }

  private static async updateInventoryField(
    itemId: string,
    field: string,
    value: unknown,
    userId: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    updateData[field] = value;

    const oldItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId }
    });

    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData
    });

    await AuditLogger.logDataUpdate(
      'InventoryItem',
      itemId,
      oldItem || {},
      updateData,
      userId
    );
  }

  private static async updateQCRecordField(
    recordId: string,
    field: string,
    value: unknown,
    userId: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    updateData[field] = value;

    const oldRecord = await prisma.qCRecord.findUnique({
      where: { id: recordId }
    });

    await prisma.qCRecord.update({
      where: { id: recordId },
      data: updateData
    });

    await AuditLogger.logDataUpdate(
      'QCRecord',
      recordId,
      oldRecord || {},
      updateData,
      userId
    );
  }

  private static async getUserTaskIds(userId: string): Promise<string[]> {
    const tasks = await prisma.task.findMany({
      where: { assignedTo: userId },
      select: { id: true }
    });
    return tasks.map(task => task.id);
  }

  private static async getUserTimeRecordIds(userId: string): Promise<string[]> {
    const records = await prisma.timeRecord.findMany({
      where: { employeeId: userId },
      select: { id: true }
    });
    return records.map(record => record.id);
  }

  static async detectAutomaticResolution(conflict: ConflictData): Promise<'LOCAL' | 'SERVER' | null> {
    const { entity, field, localValue, serverValue } = conflict;

    if (field === 'lastActivity' || field === 'updatedAt') {
      return new Date(localValue) > new Date(serverValue) ? 'LOCAL' : 'SERVER';
    }

    if (field === 'status' && entity === 'Task') {
      const statusPriority = {
        'PENDING': 1,
        'IN_PROGRESS': 2,
        'COMPLETED': 3,
        'REJECTED': 2,
        'ON_HOLD': 1
      };
      
      const localPriority = statusPriority[localValue] || 0;
      const serverPriority = statusPriority[serverValue] || 0;
      
      if (localPriority > serverPriority) return 'LOCAL';
      if (serverPriority > localPriority) return 'SERVER';
    }

    if (field === 'quantity' && typeof localValue === 'number' && typeof serverValue === 'number') {
      return localValue > serverValue ? 'LOCAL' : 'SERVER';
    }

    return null;
  }

  static async autoResolveConflicts(userId: string): Promise<{ resolved: number; remaining: number }> {
    const conflicts = await this.getConflicts(userId);
    let resolved = 0;

    for (const conflict of conflicts) {
      const autoResolution = await this.detectAutomaticResolution(conflict);
      
      if (autoResolution) {
        const result = await this.resolveConflict({
          conflictId: conflict.id,
          resolution: autoResolution,
          resolvedBy: userId,
          reason: 'Automatic resolution'
        }, userId);

        if (result.success) {
          resolved++;
        }
      }
    }

    const remainingConflicts = await this.getConflicts(userId);
    return { resolved, remaining: remainingConflicts.length };
  }

  static async getConflictSummary(): Promise<{
    total: number;
    byEntity: Record<string, number>;
    oldestConflict?: Date;
  }> {
    const conflicts = await prisma.syncConflict.findMany({
      where: { resolved: false },
      select: {
        entity: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const byEntity: Record<string, number> = {};
    conflicts.forEach(conflict => {
      byEntity[conflict.entity] = (byEntity[conflict.entity] || 0) + 1;
    });

    return {
      total: conflicts.length,
      byEntity,
      oldestConflict: conflicts.length > 0 ? conflicts[0].createdAt : undefined
    };
  }
}