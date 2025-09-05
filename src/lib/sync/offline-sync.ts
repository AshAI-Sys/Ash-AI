export interface SyncData {
  timestamp: number;
  userId: string;
  entity: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  localId?: string;
}

export interface SyncConflict {
  id: string;
  entity: string;
  entityId: string;
  field: string;
  localValue: unknown;
  serverValue: unknown;
}

export class OfflineSync {
  private static SYNC_QUEUE_KEY = 'sync_queue';
  private static LAST_SYNC_KEY = 'last_sync';
  
  static addToSyncQueue(data: SyncData): void {
    if (typeof window === 'undefined') return;
    
    const queue = this.getSyncQueue();
    queue.push(data);
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  static getSyncQueue(): SyncData[] {
    if (typeof window === 'undefined') return [];
    
    const queueStr = localStorage.getItem(this.SYNC_QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  }

  static clearSyncQueue(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
  }

  static async syncToServer(): Promise<{ success: boolean; conflicts: SyncConflict[] }> {
    const queue = this.getSyncQueue();
    if (queue.length === 0) {
      return { success: true, conflicts: [] };
    }

    try {
      const response = await fetch('/api/sync/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: queue })
      });

      const result = await response.json();
      
      if (result.success) {
        this.clearSyncQueue();
        this.updateLastSync();
        return { success: true, conflicts: result.conflicts || [] };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, conflicts: [] };
    }
  }

  static async downloadChanges(since?: number): Promise<SyncData[]> {
    try {
      const lastSync = since || this.getLastSync();
      const response = await fetch(`/api/sync/download?since=${lastSync}`);
      const result = await response.json();
      
      if (result.success) {
        this.updateLastSync();
        return result.changes;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Download changes failed:', error);
      return [];
    }
  }

  static getLastSync(): number {
    if (typeof window === 'undefined') return 0;
    
    const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY);
    return lastSyncStr ? parseInt(lastSyncStr) : 0;
  }

  private static updateLastSync(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
  }

  static async resolveConflict(
    conflictId: string, 
    resolution: 'LOCAL' | 'SERVER' | 'MANUAL',
    manualData?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/sync/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conflictId, 
          resolution,
          manualData 
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return false;
    }
  }

  static isOnline(): boolean {
    return typeof window !== 'undefined' && navigator.onLine;
  }

  static async autoSync(): Promise<void> {
    if (!this.isOnline()) return;

    try {
      await this.syncToServer();
      const downloadChanges = await this.downloadChanges();
      
      if (downloadChanges.length > 0) {
        await this.applyServerChanges(downloadChanges);
      }
    } catch (error) {
      console.error('Auto sync failed:', error);
    }
  }

  private static async applyServerChanges(changes: SyncData[]): Promise<void> {
    for (const change of changes) {
      try {
        await this.applyChange(change);
      } catch (error) {
        console.error(`Failed to apply change for ${change.entity}:${change.entityId}`, error);
      }
    }
  }

  private static async applyChange(change: SyncData): Promise<void> {
    const { entity, entityId, operation, data } = change;
    
    switch (operation) {
      case 'CREATE':
        await this.createEntity(entity, data);
        break;
      case 'UPDATE':
        await this.updateEntity(entity, entityId, data);
        break;
      case 'DELETE':
        await this.deleteEntity(entity, entityId);
        break;
    }
  }

  private static async createEntity(entity: string, _data: Record<string, unknown>): Promise<void> {
    switch (entity.toLowerCase()) {
      case 'task':
        break;
      case 'timerecord':
        break;
      case 'stockmovement':
        break;
      default:
        console.warn(`Unknown entity type for creation: ${entity}`);
    }
  }

  private static async updateEntity(entity: string, _entityId: string, _data: Record<string, unknown>): Promise<void> {
    switch (entity.toLowerCase()) {
      case 'task':
        break;
      case 'timerecord':
        break;
      default:
        console.warn(`Unknown entity type for update: ${entity}`);
    }
  }

  private static async deleteEntity(entity: string, _entityId: string): Promise<void> {
    switch (entity.toLowerCase()) {
      case 'task':
        break;
      default:
        console.warn(`Unknown entity type for deletion: ${entity}`);
    }
  }

  static setupAutoSync(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('Connection restored, syncing...');
      this.autoSync();
    });

    setInterval(() => {
      if (this.isOnline()) {
        this.autoSync();
      }
    }, 30000);
  }
}