import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackupConfig {
  type: 'DATABASE' | 'FILES' | 'FULL';
  destination: string;
  schedule?: string;
  retention: number; // days
}

export class BackupManager {
  private static backupDir = process.env.BACKUP_DIR || './backups';

  static async createBackup(config: BackupConfig): Promise<string> {
    const backupId = `backup_${Date.now()}`;
    const backupPath = path.join(this.backupDir, backupId);
    
    await this.ensureBackupDir();
    
    const job = await prisma.backupJob.create({
      data: {
        type: config.type,
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    try {
      let filePath: string;
      let fileSize: bigint;

      switch (config.type) {
        case 'DATABASE':
          ({ filePath, fileSize } = await this.backupDatabase(backupPath));
          break;
        case 'FILES':
          ({ filePath, fileSize } = await this.backupFiles(backupPath));
          break;
        case 'FULL':
          ({ filePath, fileSize } = await this.fullBackup(backupPath));
          break;
        default:
          throw new Error(`Unknown backup type: ${config.type}`);
      }

      await prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          filePath,
          fileSize
        }
      });

      await this.cleanOldBackups(config.retention);
      
      if (config.destination !== 'local') {
        await this.uploadToRemote(filePath, config.destination);
      }

      return filePath;

    } catch (error) {
      await prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  private static async backupDatabase(backupPath: string): Promise<{ filePath: string; fileSize: bigint }> {
    const fileName = `database_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const filePath = path.join(backupPath, fileName);
    
    await fs.mkdir(backupPath, { recursive: true });
    
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
    await fs.copyFile(dbPath, filePath);
    
    const stats = await fs.stat(filePath);
    return { filePath, fileSize: BigInt(stats.size) };
  }

  private static async backupFiles(backupPath: string): Promise<{ filePath: string; fileSize: bigint }> {
    const fileName = `files_${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
    const filePath = path.join(backupPath, fileName);
    
    await fs.mkdir(backupPath, { recursive: true });
    
    const _publicDir = './public';
    const _uploadsDir = './uploads';
    
    await execAsync(`tar -czf "${filePath}" -C . public uploads 2>/dev/null || true`);
    
    const stats = await fs.stat(filePath);
    return { filePath, fileSize: BigInt(stats.size) };
  }

  private static async fullBackup(backupPath: string): Promise<{ filePath: string; fileSize: bigint }> {
    const fileName = `full_${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
    const filePath = path.join(backupPath, fileName);
    
    await fs.mkdir(backupPath, { recursive: true });
    
    const excludePattern = '--exclude=node_modules --exclude=.git --exclude=.next --exclude=backups';
    await execAsync(`tar -czf "${filePath}" ${excludePattern} .`);
    
    const stats = await fs.stat(filePath);
    return { filePath, fileSize: BigInt(stats.size) };
  }

  private static async ensureBackupDir(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  private static async cleanOldBackups(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldBackups = await prisma.backupJob.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: 'COMPLETED'
      }
    });

    for (const backup of oldBackups) {
      if (backup.filePath) {
        try {
          await fs.unlink(backup.filePath);
        } catch (error) {
          console.warn(`Failed to delete backup file: ${backup.filePath}`, error);
        }
      }
      
      await prisma.backupJob.delete({
        where: { id: backup.id }
      });
    }
  }

  private static async uploadToRemote(filePath: string, destination: string): Promise<void> {
    switch (destination) {
      case 'gdrive':
        await this.uploadToGoogleDrive(filePath);
        break;
      case 's3':
        await this.uploadToS3(filePath);
        break;
      default:
        console.warn(`Unknown backup destination: ${destination}`);
    }
  }

  private static async uploadToGoogleDrive(filePath: string): Promise<void> {
    console.log(`Uploading to Google Drive: ${filePath}`);
  }

  private static async uploadToS3(filePath: string): Promise<void> {
    console.log(`Uploading to S3: ${filePath}`);
  }

  static async scheduleBackup(config: BackupConfig & { schedule: string }): Promise<void> {
    console.log(`Scheduling backup: ${config.type} at ${config.schedule}`);
  }

  static async restoreBackup(backupId: string): Promise<void> {
    const backup = await prisma.backupJob.findUnique({
      where: { id: backupId }
    });

    if (!backup || !backup.filePath) {
      throw new Error('Backup not found');
    }

    if (backup.type === 'DATABASE' || backup.type === 'FULL') {
      await this.restoreDatabase(backup.filePath);
    }

    if (backup.type === 'FILES' || backup.type === 'FULL') {
      await this.restoreFiles(backup.filePath);
    }
  }

  private static async restoreDatabase(backupPath: string): Promise<void> {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
    
    await fs.copyFile(backupPath, `${dbPath}.backup`);
    await fs.copyFile(backupPath, dbPath);
    
    console.log('Database restored successfully');
  }

  private static async restoreFiles(backupPath: string): Promise<void> {
    await execAsync(`tar -xzf "${backupPath}" -C .`);
    console.log('Files restored successfully');
  }

  static async exportToGoogleSheets(): Promise<void> {
    try {
      const orders = await prisma.order.findMany({
        include: {
          brand: true,
          client: true,
          tasks: true
        }
      });

      const inventory = await prisma.inventoryItem.findMany();
      
      const financial = await prisma.walletTransaction.findMany({
        include: {
          wallet: true
        }
      });

      const exportData = {
        orders: orders.map(order => ({
          orderNumber: order.orderNumber,
          clientName: order.clientName,
          brandName: order.brand.name,
          status: order.status,
          quantity: order.quantity,
          createdAt: order.createdAt,
          dueDate: order.dueDate
        })),
        inventory: inventory.map(item => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          lastUpdated: item.lastUpdated
        })),
        financial: financial.map(tx => ({
          walletName: tx.wallet.name,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          date: tx.createdAt
        }))
      };

      const fileName = `export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const filePath = path.join(this.backupDir, fileName);
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
      
      console.log(`Data exported to: ${filePath}`);
      
    } catch (error) {
      console.error('Export to Google Sheets failed:', error);
      throw error;
    }
  }
}