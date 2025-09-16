#!/usr/bin/env node

/**
 * Database Backup Script for ASH AI
 * Creates automated backups with retention policy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Backup configuration
const BACKUP_CONFIG = {
  backupDir: './backups',
  retentionDays: 30,
  compressionLevel: 9,
  encryptBackups: true,
  maxBackupSize: '1GB'
};

// Database configuration from environment
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ash_ai_production',
  username: process.env.DB_USER || 'ash_ai_user',
  password: process.env.DB_PASSWORD || 'ash_ai_secure_password_2024'
};

function log(message) {
  console.log(`🔄 [BACKUP] ${message}`);
}

function success(message) {
  console.log(`✅ [BACKUP] ${message}`);
}

function error(message) {
  console.error(`❌ [BACKUP] ${message}`);
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
    fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
    log(`Created backup directory: ${BACKUP_CONFIG.backupDir}`);
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `ash_ai_backup_${timestamp}.sql`;
}

/**
 * Create database backup using pg_dump
 */
async function createBackup() {
  try {
    ensureBackupDirectory();

    const backupFilename = generateBackupFilename();
    const backupPath = path.join(BACKUP_CONFIG.backupDir, backupFilename);

    log('Starting database backup...');

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };

    // Create pg_dump command
    const dumpCommand = [
      'pg_dump',
      '-h', DB_CONFIG.host,
      '-p', DB_CONFIG.port,
      '-U', DB_CONFIG.username,
      '-d', DB_CONFIG.database,
      '--verbose',
      '--clean',
      '--if-exists',
      '--create',
      '--format=custom',
      '-f', backupPath
    ].join(' ');

    // Execute backup
    execSync(dumpCommand, { env, stdio: 'pipe' });

    // Get backup file size
    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    success(`Database backup created: ${backupFilename} (${fileSizeInMB} MB)`);

    // Compress backup if enabled
    let finalBackupPath = backupPath;
    if (BACKUP_CONFIG.compressionLevel > 0) {
      finalBackupPath = await compressBackup(backupPath);
    }

    // Encrypt backup if enabled
    if (BACKUP_CONFIG.encryptBackups) {
      finalBackupPath = await encryptBackup(finalBackupPath);
    }

    // Generate checksum
    const checksum = generateChecksum(finalBackupPath);
    fs.writeFileSync(`${finalBackupPath}.sha256`, checksum);

    // Create backup metadata
    const metadata = {
      filename: path.basename(finalBackupPath),
      originalSize: stats.size,
      compressedSize: fs.statSync(finalBackupPath).size,
      checksum: checksum,
      timestamp: new Date().toISOString(),
      database: DB_CONFIG.database,
      compressed: BACKUP_CONFIG.compressionLevel > 0,
      encrypted: BACKUP_CONFIG.encryptBackups
    };

    fs.writeFileSync(`${finalBackupPath}.meta.json`, JSON.stringify(metadata, null, 2));

    success(`Backup completed successfully: ${path.basename(finalBackupPath)}`);
    return finalBackupPath;

  } catch (err) {
    error(`Backup failed: ${err.message}`);
    throw err;
  }
}

/**
 * Compress backup file using gzip
 */
async function compressBackup(backupPath) {
  try {
    log('Compressing backup...');

    const gzipPath = `${backupPath}.gz`;
    execSync(`gzip -${BACKUP_CONFIG.compressionLevel} "${backupPath}"`);

    // gzip removes the original file and creates .gz file
    const compressedStats = fs.statSync(gzipPath);
    const compressedSizeInMB = (compressedStats.size / (1024 * 1024)).toFixed(2);

    success(`Backup compressed: ${compressedSizeInMB} MB`);
    return gzipPath;

  } catch (err) {
    error(`Compression failed: ${err.message}`);
    throw err;
  }
}

/**
 * Encrypt backup file using AES-256
 */
async function encryptBackup(backupPath) {
  try {
    log('Encrypting backup...');

    // Generate encryption key from environment or create random key
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    const input = fs.createReadStream(backupPath);
    const encryptedPath = `${backupPath}.enc`;
    const output = fs.createWriteStream(encryptedPath);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);

      output.on('finish', () => {
        // Remove unencrypted file
        fs.unlinkSync(backupPath);

        // Save encryption info (without the key!)
        const encryptionInfo = {
          algorithm: 'aes-256-cbc',
          iv: iv.toString('hex'),
          keyHint: encryptionKey.toString('hex').substring(0, 8) + '...',
          encrypted: true
        };

        fs.writeFileSync(`${encryptedPath}.enc.json`, JSON.stringify(encryptionInfo, null, 2));

        success('Backup encrypted successfully');
        resolve(encryptedPath);
      });

      output.on('error', reject);
      input.on('error', reject);
    });

  } catch (err) {
    error(`Encryption failed: ${err.message}`);
    throw err;
  }
}

/**
 * Generate SHA-256 checksum for backup file
 */
function generateChecksum(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups() {
  try {
    log('Cleaning up old backups...');

    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    const backupFiles = files.filter(file => file.startsWith('ash_ai_backup_'));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_CONFIG.retentionDays);

    let deletedCount = 0;

    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_CONFIG.backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        // Delete backup file and associated files
        fs.unlinkSync(filePath);

        // Delete associated files (checksum, metadata, encryption info)
        const associatedFiles = [
          `${filePath}.sha256`,
          `${filePath}.meta.json`,
          `${filePath}.enc.json`
        ];

        associatedFiles.forEach(assocFile => {
          if (fs.existsSync(assocFile)) {
            fs.unlinkSync(assocFile);
          }
        });

        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      success(`Deleted ${deletedCount} old backup(s)`);
    } else {
      log('No old backups to delete');
    }

  } catch (err) {
    error(`Cleanup failed: ${err.message}`);
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath) {
  try {
    log('Verifying backup integrity...');

    // Check if checksum file exists
    const checksumPath = `${backupPath}.sha256`;
    if (!fs.existsSync(checksumPath)) {
      throw new Error('Checksum file not found');
    }

    // Calculate current checksum
    const currentChecksum = generateChecksum(backupPath);
    const expectedChecksum = fs.readFileSync(checksumPath, 'utf8').trim();

    if (currentChecksum === expectedChecksum) {
      success('Backup integrity verified');
      return true;
    } else {
      error('Backup integrity check failed - checksums do not match');
      return false;
    }

  } catch (err) {
    error(`Verification failed: ${err.message}`);
    return false;
  }
}

/**
 * List all available backups
 */
async function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_CONFIG.backupDir);
    const backupFiles = files
      .filter(file => file.startsWith('ash_ai_backup_') && (file.endsWith('.sql') || file.endsWith('.gz') || file.endsWith('.enc')))
      .map(file => {
        const filePath = path.join(BACKUP_CONFIG.backupDir, file);
        const stats = fs.statSync(filePath);
        const metaPath = `${filePath}.meta.json`;

        let metadata = {};
        if (fs.existsSync(metaPath)) {
          metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        }

        return {
          filename: file,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          created: stats.mtime.toISOString(),
          ...metadata
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    console.log('\n📋 Available Backups:');
    console.log('===================');

    if (backupFiles.length === 0) {
      console.log('No backups found.');
    } else {
      backupFiles.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.filename}`);
        console.log(`   Size: ${backup.size}`);
        console.log(`   Created: ${backup.created}`);
        console.log(`   Compressed: ${backup.compressed ? 'Yes' : 'No'}`);
        console.log(`   Encrypted: ${backup.encrypted ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    return backupFiles;

  } catch (err) {
    error(`Failed to list backups: ${err.message}`);
    return [];
  }
}

/**
 * Main backup function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'backup';

    switch (command) {
      case 'backup':
        log('Starting ASH AI database backup...');
        const backupPath = await createBackup();
        await verifyBackup(backupPath);
        await cleanupOldBackups();
        success('Backup process completed successfully!');
        break;

      case 'list':
        await listBackups();
        break;

      case 'cleanup':
        await cleanupOldBackups();
        break;

      case 'verify':
        const verifyPath = args[1];
        if (!verifyPath) {
          error('Please provide backup file path to verify');
          process.exit(1);
        }
        await verifyBackup(verifyPath);
        break;

      default:
        console.log('Usage: node backup-database.js [command]');
        console.log('Commands:');
        console.log('  backup  - Create a new backup (default)');
        console.log('  list    - List all available backups');
        console.log('  cleanup - Clean up old backups');
        console.log('  verify <path> - Verify backup integrity');
        break;
    }

  } catch (err) {
    error(`Backup process failed: ${err.message}`);
    process.exit(1);
  }
}

// Run backup if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  createBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackup,
  BACKUP_CONFIG
};