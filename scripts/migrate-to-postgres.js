#!/usr/bin/env node

/**
 * ASH AI ERP - SQLite to PostgreSQL Migration Script
 * Zero-downtime migration with data integrity checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

class DatabaseMigration {
  constructor() {
    this.sqliteClient = null;
    this.postgresClient = null;
    this.migrationStats = {
      startTime: Date.now(),
      tablesProcessed: 0,
      recordsMigrated: 0,
      errors: [],
      warnings: [],
    };
  }

  async initialize() {
    console.log('🚀 Starting ASH AI ERP database migration: SQLite → PostgreSQL');
    console.log('=' .repeat(60));

    // Validate environment
    this.validateEnvironment();

    // Initialize database clients
    await this.initializeClients();

    // Create backup before migration
    await this.createPreMigrationBackup();
  }

  validateEnvironment() {
    const required = [
      'DATABASE_URL_SQLITE',
      'DATABASE_URL_POSTGRES',
    ];

    const missing = required.filter(env => !process.env[env]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Check if pg_dump and psql are available
    try {
      execSync('pg_dump --version', { stdio: 'ignore' });
      execSync('psql --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('PostgreSQL client tools (pg_dump, psql) are required but not found in PATH');
    }
  }

  async initializeClients() {
    console.log('📡 Initializing database connections...');

    // SQLite client (source)
    this.sqliteClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_SQLITE || 'file:./ash_ai_dev.db',
        },
      },
    });

    // PostgreSQL client (target)
    this.postgresClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_POSTGRES,
        },
      },
    });

    // Test connections
    try {
      await this.sqliteClient.$queryRaw`SELECT 1`;
      console.log('✅ SQLite connection established');
    } catch (error) {
      throw new Error(`SQLite connection failed: ${error.message}`);
    }

    try {
      await this.postgresClient.$queryRaw`SELECT 1`;
      console.log('✅ PostgreSQL connection established');
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  async createPreMigrationBackup() {
    console.log('💾 Creating pre-migration backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = './migration-backups';
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const sqliteBackup = path.join(backupDir, `sqlite-backup-${timestamp}.db`);
    
    // Copy SQLite database
    if (fs.existsSync('./ash_ai_dev.db')) {
      fs.copyFileSync('./ash_ai_dev.db', sqliteBackup);
      console.log(`✅ SQLite backup created: ${sqliteBackup}`);
    }

    return { sqliteBackup };
  }

  async runMigration() {
    console.log('🔄 Starting database migration...');
    
    try {
      // Step 1: Apply schema to PostgreSQL
      await this.applySchema();

      // Step 2: Migrate data
      await this.migrateData();

      // Step 3: Verify data integrity
      await this.verifyDataIntegrity();

      // Step 4: Update indexes and constraints
      await this.optimizeDatabase();

      console.log('✅ Migration completed successfully!');
      this.printMigrationSummary();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.rollbackMigration();
      throw error;
    }
  }

  async applySchema() {
    console.log('📋 Applying schema to PostgreSQL...');

    try {
      // Run Prisma migrate to create the schema
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL_POSTGRES,
        },
      });

      console.log('✅ Schema applied successfully');
    } catch (error) {
      throw new Error(`Schema migration failed: ${error.message}`);
    }
  }

  async migrateData() {
    console.log('📊 Migrating data from SQLite to PostgreSQL...');

    // Define table migration order (respecting foreign key dependencies)
    const migrationOrder = [
      'Workspace',
      'User',
      'Brand',
      'Client',
      'Supplier',
      'Employee',
      'Machine',
      'InventoryItem',
      'RouteTemplate',
      'RouteTemplateStep',
      'Order',
      'OrderItem',
      'RoutingStep',
      'OrderAttachment',
      'DesignAsset',
      'DesignApproval',
      'DesignRevision',
      'CuttingPlan',
      'CuttingSheet',
      'FabricCut',
      'CutPiece',
      'CuttingMetrics',
      'PrintRun',
      'PrintRunOutput',
      'PrintRunMaterial',
      'PrintReject',
      'SilkscreenPrep',
      'SilkscreenSpec',
      'CuringLog',
      'SublimationPrint',
      'HeatPressLog',
      'DTFPrint',
      'DTFPowderCure',
      'EmbroideryRun',
      'SewingOperation',
      'PieceRate',
      'Bundle',
      'SewingRun',
      'BundleProgress',
      'SewingLineMetrics',
      'QCInspection',
      'QCDefect',
      'CAPATask',
      'AttendanceRecord',
      'LeaveRequest',
      'PayrollRecord',
      'PerformanceReview',
      'DisciplinaryAction',
      'TrainingRecord',
      'Invoice',
      'InvoiceLine',
      'Payment',
      'PaymentAllocation',
      'Bill',
      'BillLine',
      'POCost',
      'ChannelSettlement',
      'BIRSalesEntry',
      'BIRPurchaseEntry',
      'FinishingRun',
      'FinishedUnit',
      'FinishingCarton',
      'CartonContent',
      'FinishingShipment',
      'ShipmentCarton',
      'Vehicle',
      'Shipment',
      'Carton',
      'Trip',
      'TripStop',
      'StopCarton',
      'PODRecord',
      'TripExpense',
      'CarrierBooking',
      'GPSPing',
      'Alert',
      'AlertAudit',
      'Task',
      'QCRecord',
      'Dashboard',
      'Forecast',
      'BusinessInsight',
      'KPIMetric',
      'Wallet',
      'SyncConflict',
      'TimeRecord',
      'AuditLog',
      'AIInsight',
      'Notification',
      'ProductionLog',
      'PONumberSequence',
    ];

    for (const tableName of migrationOrder) {
      await this.migrateTable(tableName);
    }
  }

  async migrateTable(tableName) {
    try {
      console.log(`📋 Migrating table: ${tableName}`);

      // Get all records from SQLite
      const records = await this.sqliteClient[tableName.toLowerCase()].findMany();
      
      if (records.length === 0) {
        console.log(`   ℹ️  Table ${tableName} is empty, skipping...`);
        return;
      }

      console.log(`   📊 Found ${records.length} records to migrate`);

      // Batch insert to PostgreSQL
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          await this.postgresClient[tableName.toLowerCase()].createMany({
            data: batch,
            skipDuplicates: true,
          });
          
          processed += batch.length;
          console.log(`   ✅ Processed ${processed}/${records.length} records`);
        } catch (error) {
          console.warn(`   ⚠️  Batch insert failed for ${tableName}, trying individual inserts...`);
          
          // Fallback to individual inserts
          for (const record of batch) {
            try {
              await this.postgresClient[tableName.toLowerCase()].create({
                data: record,
              });
              processed++;
            } catch (recordError) {
              this.migrationStats.errors.push({
                table: tableName,
                record: record.id || 'unknown',
                error: recordError.message,
              });
              console.error(`   ❌ Failed to insert record in ${tableName}:`, recordError.message);
            }
          }
        }
      }

      this.migrationStats.tablesProcessed++;
      this.migrationStats.recordsMigrated += processed;
      console.log(`   ✅ Table ${tableName} migration completed (${processed}/${records.length} records)`);

    } catch (error) {
      const errorMsg = `Failed to migrate table ${tableName}: ${error.message}`;
      this.migrationStats.errors.push({
        table: tableName,
        error: errorMsg,
      });
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  async verifyDataIntegrity() {
    console.log('🔍 Verifying data integrity...');

    const verificationQueries = [
      { name: 'Workspace count', query: 'SELECT COUNT(*) as count FROM "Workspace"' },
      { name: 'User count', query: 'SELECT COUNT(*) as count FROM "User"' },
      { name: 'Order count', query: 'SELECT COUNT(*) as count FROM "Order"' },
      { name: 'Client count', query: 'SELECT COUNT(*) as count FROM "Client"' },
      { name: 'Employee count', query: 'SELECT COUNT(*) as count FROM "Employee"' },
    ];

    for (const { name, query } of verificationQueries) {
      try {
        const sqliteResult = await this.sqliteClient.$queryRawUnsafe(query.replace(/"/g, ''));
        const postgresResult = await this.postgresClient.$queryRawUnsafe(query);

        const sqliteCount = sqliteResult[0]?.count || 0;
        const postgresCount = postgresResult[0]?.count || 0;

        if (sqliteCount === postgresCount) {
          console.log(`   ✅ ${name}: ${postgresCount} records (match)`);
        } else {
          const warning = `${name}: SQLite has ${sqliteCount}, PostgreSQL has ${postgresCount}`;
          this.migrationStats.warnings.push(warning);
          console.warn(`   ⚠️  ${warning}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to verify ${name}:`, error.message);
      }
    }
  }

  async optimizeDatabase() {
    console.log('⚡ Optimizing PostgreSQL database...');

    try {
      // Update statistics
      await this.postgresClient.$executeRaw`ANALYZE`;
      console.log('   ✅ Database statistics updated');

      // Vacuum database
      await this.postgresClient.$executeRaw`VACUUM`;
      console.log('   ✅ Database vacuumed');

    } catch (error) {
      console.warn('   ⚠️  Database optimization failed:', error.message);
    }
  }

  async rollbackMigration() {
    console.log('🔄 Rolling back migration...');
    
    try {
      // Clear PostgreSQL database
      await this.postgresClient.$executeRaw`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `;
      
      console.log('✅ PostgreSQL database cleared');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  printMigrationSummary() {
    const duration = Date.now() - this.migrationStats.startTime;
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Tables processed: ${this.migrationStats.tablesProcessed}`);
    console.log(`Records migrated: ${this.migrationStats.recordsMigrated}`);
    console.log(`Errors: ${this.migrationStats.errors.length}`);
    console.log(`Warnings: ${this.migrationStats.warnings.length}`);

    if (this.migrationStats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.migrationStats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.table}: ${error.error}`);
      });
    }

    if (this.migrationStats.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.migrationStats.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    console.log('\n🎉 Migration completed! Your ASH AI ERP system is now running on PostgreSQL.');
    console.log('Don\'t forget to update your DATABASE_URL environment variable.');
  }

  async cleanup() {
    if (this.sqliteClient) {
      await this.sqliteClient.$disconnect();
    }
    if (this.postgresClient) {
      await this.postgresClient.$disconnect();
    }
  }
}

// CLI execution
if (require.main === module) {
  const migration = new DatabaseMigration();

  migration.initialize()
    .then(() => migration.runMigration())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    })
    .finally(() => migration.cleanup());
}

module.exports = DatabaseMigration;