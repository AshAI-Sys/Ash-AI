#!/usr/bin/env node

/**
 * Database Setup Script for ASH AI
 * Sets up PostgreSQL database for production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
  user: 'ash_ai_user',
  password: 'ash_ai_secure_password_2024',
  host: 'localhost',
  port: 5432,
  database: 'ash_ai_production',
  shadowDatabase: 'ash_ai_shadow'
};

function log(message) {
  console.log(`🔧 [DB SETUP] ${message}`);
}

function error(message) {
  console.error(`❌ [DB SETUP] ${message}`);
}

function success(message) {
  console.log(`✅ [DB SETUP] ${message}`);
}

async function checkPostgreSQL() {
  try {
    execSync('psql --version', { stdio: 'pipe' });
    success('PostgreSQL is installed');
    return true;
  } catch (err) {
    error('PostgreSQL is not installed or not in PATH');
    log('Please install PostgreSQL: https://www.postgresql.org/download/');
    return false;
  }
}

async function createDatabase() {
  try {
    log('Creating PostgreSQL databases...');

    // Create user
    try {
      execSync(`psql -U postgres -c "CREATE USER ${DB_CONFIG.user} WITH PASSWORD '${DB_CONFIG.password}';"`);
      success(`Created user: ${DB_CONFIG.user}`);
    } catch (err) {
      log(`User ${DB_CONFIG.user} might already exist`);
    }

    // Create main database
    try {
      execSync(`psql -U postgres -c "CREATE DATABASE ${DB_CONFIG.database} OWNER ${DB_CONFIG.user};"`);
      success(`Created database: ${DB_CONFIG.database}`);
    } catch (err) {
      log(`Database ${DB_CONFIG.database} might already exist`);
    }

    // Create shadow database for migrations
    try {
      execSync(`psql -U postgres -c "CREATE DATABASE ${DB_CONFIG.shadowDatabase} OWNER ${DB_CONFIG.user};"`);
      success(`Created shadow database: ${DB_CONFIG.shadowDatabase}`);
    } catch (err) {
      log(`Shadow database ${DB_CONFIG.shadowDatabase} might already exist`);
    }

    // Grant privileges
    execSync(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_CONFIG.database} TO ${DB_CONFIG.user};"`);
    execSync(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_CONFIG.shadowDatabase} TO ${DB_CONFIG.user};"`);

    success('Database privileges granted');

  } catch (err) {
    error(`Failed to create databases: ${err.message}`);
    throw err;
  }
}

async function runMigrations() {
  try {
    log('Running Prisma migrations...');

    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    success('Prisma client generated');

    // Run database migrations
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
    success('Database schema deployed');

    // Run initial data seeding
    if (fs.existsSync('./scripts/seed-database.js')) {
      log('Running database seeding...');
      execSync('node ./scripts/seed-database.js', { stdio: 'inherit' });
      success('Database seeded with initial data');
    }

  } catch (err) {
    error(`Migration failed: ${err.message}`);
    throw err;
  }
}

async function verifyConnection() {
  try {
    log('Verifying database connection...');

    const testScript = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      async function test() {
        try {
          await prisma.$connect();
          console.log('✅ Database connection successful');
          process.exit(0);
        } catch (err) {
          console.error('❌ Database connection failed:', err.message);
          process.exit(1);
        } finally {
          await prisma.$disconnect();
        }
      }

      test();
    `;

    fs.writeFileSync('./temp-db-test.js', testScript);
    execSync('node ./temp-db-test.js', { stdio: 'inherit' });
    fs.unlinkSync('./temp-db-test.js');

    success('Database setup completed successfully!');

  } catch (err) {
    error(`Connection verification failed: ${err.message}`);
    throw err;
  }
}

async function main() {
  try {
    log('Starting ASH AI database setup...');

    // Check PostgreSQL installation
    const pgInstalled = await checkPostgreSQL();
    if (!pgInstalled) {
      process.exit(1);
    }

    // Create databases
    await createDatabase();

    // Run migrations
    await runMigrations();

    // Verify connection
    await verifyConnection();

    success('🎉 Database setup completed successfully!');
    log('');
    log('Next steps:');
    log('1. Start your application: npm run dev');
    log('2. Access Prisma Studio: npx prisma studio');
    log('3. Create your first admin user through the application');

  } catch (err) {
    error(`Setup failed: ${err.message}`);
    log('');
    log('Troubleshooting:');
    log('1. Ensure PostgreSQL is running: brew services start postgresql (macOS) or systemctl start postgresql (Linux)');
    log('2. Check PostgreSQL connection: psql -U postgres');
    log('3. Verify environment variables in .env.local');

    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main, DB_CONFIG };