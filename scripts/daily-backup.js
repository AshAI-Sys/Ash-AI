#!/usr/bin/env node

import { BackupManager } from '../src/lib/backup/backup-manager.js';

async function runDailyBackup() {
  try {
    console.log('Starting daily backup...');
    
    const config = {
      type: 'FULL',
      destination: process.env.BACKUP_DESTINATION || 'local',
      retention: parseInt(process.env.BACKUP_RETENTION || '30')
    };

    const backupPath = await BackupManager.createBackup(config);
    
    console.log(`Daily backup completed successfully: ${backupPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Daily backup failed:', error);
    process.exit(1);
  }
}

runDailyBackup();

export { runDailyBackup };