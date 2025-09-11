#!/usr/bin/env node

/**
 * ASH AI ERP - Automated PostgreSQL Database Backup System
 * Daily backup with compression, rotation, and cloud storage upload
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Database connection
  DATABASE_URL: process.env.DATABASE_URL || process.env.ASH_DATABASE_URL,
  
  // Backup settings
  BACKUP_DIR: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups'),
  RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
  COMPRESS: process.env.BACKUP_COMPRESS !== 'false',
  
  // Cloud storage (optional)
  CLOUD_BACKUP: process.env.CLOUD_BACKUP_ENABLED === 'true',
  AWS_BUCKET: process.env.AWS_BACKUP_BUCKET,
  CLOUD_RETENTION_DAYS: parseInt(process.env.CLOUD_BACKUP_RETENTION_DAYS || '30'),
  
  // Notification settings
  NOTIFICATIONS_ENABLED: process.env.BACKUP_NOTIFICATIONS === 'true',
  WEBHOOK_URL: process.env.BACKUP_WEBHOOK_URL,
  
  // Security
  ENCRYPT_BACKUPS: process.env.ENCRYPT_BACKUPS === 'true',
  ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY,
};

class DatabaseBackupManager {
  constructor() {
    this.ensureBackupDirectory();
    this.validateConfiguration();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
      fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
      console.log(`Created backup directory: ${CONFIG.BACKUP_DIR}`);
    }
  }

  validateConfiguration() {
    if (!CONFIG.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    if (CONFIG.ENCRYPT_BACKUPS && !CONFIG.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is required when ENCRYPT_BACKUPS is enabled');
    }

    if (CONFIG.CLOUD_BACKUP && !CONFIG.AWS_BUCKET) {
      throw new Error('AWS_BACKUP_BUCKET is required when CLOUD_BACKUP is enabled');
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `ash-ai-backup-${timestamp}`;
    const backupPath = path.join(CONFIG.BACKUP_DIR, `${backupName}.sql`);
    
    console.log(`Starting backup: ${backupName}`);
    
    try {
      // Create database dump
      const startTime = Date.now();
      
      // Extract database connection details
      const dbUrl = new URL(CONFIG.DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port || 5432;
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      // Set environment variables for pg_dump
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      // Create pg_dump command
      const dumpCommand = [
        'pg_dump',
        `-h ${host}`,
        `-p ${port}`,
        `-U ${username}`,
        `-d ${database}`,
        '--verbose',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        `--file="${backupPath}"`,
      ].join(' ');

      console.log('Executing pg_dump...');
      execSync(dumpCommand, { env, stdio: 'inherit' });

      const dumpTime = Date.now() - startTime;
      console.log(`Database dump completed in ${dumpTime}ms`);

      // Get initial file size
      const stats = fs.statSync(backupPath);
      let finalPath = backupPath;
      let finalSize = stats.size;

      // Compress if enabled
      if (CONFIG.COMPRESS) {
        console.log('Compressing backup...');
        const compressStart = Date.now();
        const compressedPath = `${backupPath}.gz`;
        
        execSync(`gzip "${backupPath}"`);
        
        finalPath = compressedPath;
        finalSize = fs.statSync(compressedPath).size;
        
        const compressTime = Date.now() - compressStart;
        const compressionRatio = ((stats.size - finalSize) / stats.size * 100).toFixed(1);
        console.log(`Compression completed in ${compressTime}ms (${compressionRatio}% reduction)`);
      }

      // Encrypt if enabled
      if (CONFIG.ENCRYPT_BACKUPS) {
        console.log('Encrypting backup...');
        const encryptStart = Date.now();
        const encryptedPath = `${finalPath}.enc`;
        
        this.encryptFile(finalPath, encryptedPath, CONFIG.ENCRYPTION_KEY);
        fs.unlinkSync(finalPath); // Remove unencrypted file
        
        finalPath = encryptedPath;
        finalSize = fs.statSync(encryptedPath).size;
        
        const encryptTime = Date.now() - encryptStart;
        console.log(`Encryption completed in ${encryptTime}ms`);
      }

      // Generate checksum
      const checksum = this.generateChecksum(finalPath);
      
      // Create backup metadata
      const metadata = {
        name: backupName,
        timestamp: new Date().toISOString(),
        database: database,
        originalSize: stats.size,
        finalSize: finalSize,
        compressed: CONFIG.COMPRESS,
        encrypted: CONFIG.ENCRYPT_BACKUPS,
        checksum: checksum,
        duration: Date.now() - startTime,
      };

      // Save metadata
      const metadataPath = `${finalPath}.meta.json`;
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log('Backup completed successfully:');
      console.log(`  File: ${path.basename(finalPath)}`);
      console.log(`  Size: ${this.formatBytes(finalSize)}`);
      console.log(`  Duration: ${metadata.duration}ms`);
      console.log(`  Checksum: ${checksum}`);

      // Upload to cloud storage if enabled
      if (CONFIG.CLOUD_BACKUP) {
        await this.uploadToCloud(finalPath, metadataPath, metadata);
      }

      // Send notification if enabled
      if (CONFIG.NOTIFICATIONS_ENABLED) {
        await this.sendNotification('success', metadata);
      }

      // Clean up old backups
      this.cleanupOldBackups();

      return metadata;

    } catch (error) {
      console.error('Backup failed:', error);
      
      if (CONFIG.NOTIFICATIONS_ENABLED) {
        await this.sendNotification('failure', { error: error.message });
      }
      
      throw error;
    }
  }

  encryptFile(inputPath, outputPath, key) {
    const algorithm = 'aes-256-cbc';
    const inputBuffer = fs.readFileSync(inputPath);
    
    // Generate random IV
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    const encrypted = Buffer.concat([
      iv,
      cipher.update(inputBuffer),
      cipher.final()
    ]);
    
    fs.writeFileSync(outputPath, encrypted);
  }

  generateChecksum(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async uploadToCloud(backupPath, metadataPath, metadata) {
    if (!CONFIG.AWS_BUCKET) {
      console.log('Skipping cloud upload - no bucket configured');
      return;
    }

    try {
      console.log('Uploading to cloud storage...');
      const uploadStart = Date.now();

      // Use AWS CLI for upload (requires aws cli to be installed and configured)
      const backupKey = `ash-ai-backups/${path.basename(backupPath)}`;
      const metadataKey = `ash-ai-backups/${path.basename(metadataPath)}`;

      // Upload backup file
      execSync(`aws s3 cp "${backupPath}" "s3://${CONFIG.AWS_BUCKET}/${backupKey}" --storage-class STANDARD_IA`);
      
      // Upload metadata
      execSync(`aws s3 cp "${metadataPath}" "s3://${CONFIG.AWS_BUCKET}/${metadataKey}"`);

      const uploadTime = Date.now() - uploadStart;
      console.log(`Cloud upload completed in ${uploadTime}ms`);
      console.log(`  Backup: s3://${CONFIG.AWS_BUCKET}/${backupKey}`);
      console.log(`  Metadata: s3://${CONFIG.AWS_BUCKET}/${metadataKey}`);

    } catch (error) {
      console.error('Cloud upload failed:', error);
      // Don't throw - local backup is still valid
    }
  }

  async sendNotification(status, data) {
    if (!CONFIG.WEBHOOK_URL) {
      console.log('Skipping notification - no webhook URL configured');
      return;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        service: 'ASH AI Backup',
        status: status,
        data: data,
      };

      // Use curl for simplicity (could be replaced with a proper HTTP client)
      const curlCommand = `curl -X POST "${CONFIG.WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d '${JSON.stringify(payload)}'`;

      execSync(curlCommand);
      console.log('Notification sent successfully');

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  cleanupOldBackups() {
    console.log('Cleaning up old backups...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.RETENTION_DAYS);

    const files = fs.readdirSync(CONFIG.BACKUP_DIR);
    let deletedCount = 0;

    files.forEach(file => {
      if (!file.startsWith('ash-ai-backup-')) return;

      const filePath = path.join(CONFIG.BACKUP_DIR, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`  Deleted: ${file}`);
      }
    });

    console.log(`Cleanup completed - removed ${deletedCount} old backup files`);

    // Also cleanup cloud storage if enabled
    if (CONFIG.CLOUD_BACKUP) {
      this.cleanupCloudBackups();
    }
  }

  cleanupCloudBackups() {
    try {
      console.log('Cleaning up old cloud backups...');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.CLOUD_RETENTION_DAYS);

      // List and delete old files from S3
      const listCommand = `aws s3 ls "s3://${CONFIG.AWS_BUCKET}/ash-ai-backups/" --recursive`;
      const result = execSync(listCommand, { encoding: 'utf8' });
      
      const lines = result.split('\n').filter(line => line.trim());
      let deletedCount = 0;

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) return;

        const dateStr = parts[0];
        const timeStr = parts[1];
        const fileKey = parts[3];
        
        if (!fileKey.includes('ash-ai-backup-')) return;

        const fileDate = new Date(`${dateStr} ${timeStr}`);
        if (fileDate < cutoffDate) {
          const deleteCommand = `aws s3 rm "s3://${CONFIG.AWS_BUCKET}/${fileKey}"`;
          execSync(deleteCommand);
          deletedCount++;
          console.log(`  Deleted from cloud: ${fileKey}`);
        }
      });

      console.log(`Cloud cleanup completed - removed ${deletedCount} old backup files`);

    } catch (error) {
      console.error('Cloud cleanup failed:', error);
    }
  }

  async restore(backupPath, targetDatabase) {
    console.log(`Starting restore from: ${backupPath}`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    try {
      // Decrypt if needed
      let sqlPath = backupPath;
      if (backupPath.endsWith('.enc')) {
        console.log('Decrypting backup...');
        const decryptedPath = backupPath.replace('.enc', '');
        this.decryptFile(backupPath, decryptedPath, CONFIG.ENCRYPTION_KEY);
        sqlPath = decryptedPath;
      }

      // Decompress if needed
      if (sqlPath.endsWith('.gz')) {
        console.log('Decompressing backup...');
        execSync(`gunzip "${sqlPath}"`);
        sqlPath = sqlPath.replace('.gz', '');
      }

      // Execute restore
      const dbUrl = new URL(targetDatabase || CONFIG.DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port || 5432;
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      const restoreCommand = [
        'psql',
        `-h ${host}`,
        `-p ${port}`,
        `-U ${username}`,
        `-d ${database}`,
        `--file="${sqlPath}"`,
      ].join(' ');

      console.log('Executing restore...');
      execSync(restoreCommand, { env, stdio: 'inherit' });

      console.log('Restore completed successfully');

    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  decryptFile(inputPath, outputPath, key) {
    const algorithm = 'aes-256-cbc';
    const encryptedBuffer = fs.readFileSync(inputPath);
    
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    
    const decipher = crypto.createDecipher(algorithm, key);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    fs.writeFileSync(outputPath, decrypted);
  }
}

// CLI Interface
if (require.main === module) {
  const backup = new DatabaseBackupManager();
  
  const command = process.argv[2];
  
  if (command === 'restore') {
    const backupPath = process.argv[3];
    const targetDb = process.argv[4];
    
    if (!backupPath) {
      console.error('Usage: node daily-backup.js restore <backup-path> [target-database]');
      process.exit(1);
    }
    
    backup.restore(backupPath, targetDb)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Restore failed:', error);
        process.exit(1);
      });
  } else {
    // Default: create backup
    backup.createBackup()
      .then((metadata) => {
        console.log('Backup completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Backup failed:', error);
        process.exit(1);
      });
  }
}

module.exports = DatabaseBackupManager;