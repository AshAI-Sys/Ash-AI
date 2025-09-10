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
  created_at: Date;
}

export class ConflictResolver {
  static async getConflicts(user_id?: string): Promise<ConflictData[]> {
    const where = user_id ? { 
      OR: [
        { entity: 'Task', entity_id: { in: await this.getUserTaskIds(user_id) } },
        { entity: 'TimeRecord', entity_id: { in: await this.getUserTimeRecordIds(user_id) } }
      ]
    } : {};

    const conflicts = await prisma.syncConflict.findMany({
      where: {
        resolved: false,
        ...where
      },
      orderBy: { created_at: 'asc' }
    });

    return conflicts.map(conflict => ({
      id: conflict.id,
      entity: conflict.entity_type,
      entityId: conflict.entity_id,
      field: 'data', // Generic field since conflict_data is a JSON field
      localValue: conflict.local_value,
      serverValue: conflict.server_value,
      created_at: conflict.created_at
    }));
  }

  static async resolveConflict(
    resolution: ConflictResolution,
    user_id: string
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
          finalData = conflict.local_value;
          break;
        case 'SERVER':
          finalData = conflict.server_value;
          break;
        case 'MANUAL':
          finalData = resolution.manualData;
          break;
        default:
          return { success: false, error: 'Invalid resolution type' };
      }

      await this.applyResolution(conflict, finalData, user_id);

      await prisma.syncConflict.update({
        where: { id: resolution.conflictId },
        data: {
          resolved: true,
          resolved_by: user_id,
          resolved_at: new Date()
        }
      });

      await AuditLogger.log({
        action: 'CONFLICT_RESOLVED',
        entity: 'SyncConflict',
        entityId: resolution.conflictId,
        metadata: {
          originalEntity: conflict.entity_type,
          originalEntityId: conflict.entity_id,
          field: 'data',
          resolutionType,
          localValue: conflict.local_value,
          serverValue: conflict.server_value,
          finalValue: finalData,
          reason: resolution.reason
        },
        severity: 'MEDIUM',
        category: 'SYSTEM'
      }, { user_id: user_id });

      return { success: true };

    } catch (_error) {
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
    user_id: string
  ): Promise<{ resolved: number; failed: number; errors: string[] }> {
    let resolved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const conflictId of conflictIds) {
      const result = await this.resolveConflict({
        conflictId,
        resolution: defaultResolution,
        resolvedBy: user_id
      }, user_id);

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
    conflict: { entity_type: string; entity_id: string },
    finalData: unknown,
    user_id: string
  ): Promise<void> {
    const { entity_type, entity_id } = conflict;

    switch (entity_type.toLowerCase()) {
      case 'task':
        await this.updateTaskField(entity_id, 'status', finalData, user_id);
        break;
      case 'timerecord':
        await this.updateTimeRecordField(entity_id, 'duration', finalData, user_id);
        break;
      case 'inventoryitem':
        await this.updateInventoryField(entity_id, 'quantity', finalData, user_id);
        break;
      case 'qcrecord':
        await this.updateQCRecordField(entity_id, 'status', finalData, user_id);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity_type}`);
    }
  }

  private static async updateTaskField(
    taskId: string,
    field: string,
    value: unknown,
    user_id: string
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
      user_id
    );
  }

  private static async updateTimeRecordField(
    recordId: string,
    field: string,
    value: unknown,
    user_id: string
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
      user_id
    );
  }

  private static async updateInventoryField(
    itemId: string,
    field: string,
    value: unknown,
    user_id: string
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
      user_id
    );
  }

  private static async updateQCRecordField(
    recordId: string,
    field: string,
    value: unknown,
    user_id: string
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
      user_id
    );
  }

  private static async getUserTaskIds(user_id: string): Promise<string[]> {
    const tasks = await prisma.task.findMany({
      where: { assigned_to: user_id },
      select: { id: true }
    });
    return tasks.map(task => task.id);
  }

  private static async getUserTimeRecordIds(user_id: string): Promise<string[]> {
    const records = await prisma.timeRecord.findMany({
      where: { employee_id: user_id },
      select: { id: true }
    });
    return records.map(record => record.id);
  }

  static async detectAutomaticResolution(conflict: ConflictData): Promise<'LOCAL' | 'SERVER' | null> {
    const { entity, field, localValue, serverValue } = conflict;

    if (field === 'lastActivity' || field === 'updatedAt') {
      return new Date(localValue as string | number | Date) > new Date(serverValue as string | number | Date) ? 'LOCAL' : 'SERVER';
    }

    if (field === 'status' && entity === 'Task') {
      const statusPriority = {
        'OPEN': 1,
        'IN_PROGRESS': 2,
        'COMPLETED': 3,
        'REJECTED': 2,
        'ON_HOLD': 1
      };
      
      const localPriority = statusPriority[localValue as keyof typeof statusPriority] || 0;
      const serverPriority = statusPriority[serverValue as keyof typeof statusPriority] || 0;
      
      if (localPriority > serverPriority) return 'LOCAL';
      if (serverPriority > localPriority) return 'SERVER';
    }

    if (field === 'quantity' && typeof localValue === 'number' && typeof serverValue === 'number') {
      return localValue > serverValue ? 'LOCAL' : 'SERVER';
    }

    return null;
  }

  static async autoResolveConflicts(user_id: string): Promise<{ resolved: number; remaining: number }> {
    const conflicts = await this.getConflicts(user_id);
    let resolved = 0;

    for (const conflict of conflicts) {
      const autoResolution = await this.detectAutomaticResolution(conflict);
      
      if (autoResolution) {
        const result = await this.resolveConflict({
          conflictId: conflict.id,
          resolution: autoResolution,
          resolvedBy: user_id,
          reason: 'Automatic resolution'
        }, user_id);

        if (result.success) {
          resolved++;
        }
      }
    }

    const remainingConflicts = await this.getConflicts(user_id);
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
        entity_type: true,
        created_at: true
      },
      orderBy: { created_at: 'asc' }
    });

    const byEntity: Record<string, number> = {};
    conflicts.forEach(conflict => {
      byEntity[conflict.entity_type] = (byEntity[conflict.entity_type] || 0) + 1;
    });

    return {
      total: conflicts.length,
      byEntity,
      oldestConflict: conflicts.length > 0 ? conflicts[0].created_at : undefined
    };
  }
}