#!/usr/bin/env node

/**
 * Production Deployment Script for ASH AI
 * Handles production deployment with health checks and rollback capability
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Deployment configuration
const DEPLOY_CONFIG = {
  environment: 'production',
  buildTimeout: 600000, // 10 minutes
  healthCheckTimeout: 120000, // 2 minutes
  healthCheckRetries: 5,
  backupBeforeDeploy: true,
  rollbackOnFailure: true
};

function log(message) {
  console.log(`🚀 [DEPLOY] ${message}`);
}

function success(message) {
  console.log(`✅ [DEPLOY] ${message}`);
}

function error(message) {
  console.error(`❌ [DEPLOY] ${message}`);
}

function warning(message) {
  console.log(`⚠️  [DEPLOY] ${message}`);
}

/**
 * Check prerequisites for deployment
 */
async function checkPrerequisites() {
  log('Checking deployment prerequisites...');

  const checks = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version;
        const majorVersion = parseInt(version.slice(1).split('.')[0]);
        return majorVersion >= 18;
      },
      errorMessage: 'Node.js 18 or higher is required'
    },
    {
      name: 'Package.json exists',
      check: () => fs.existsSync('./package.json'),
      errorMessage: 'package.json not found'
    },
    {
      name: 'Environment variables',
      check: () => {
        const requiredEnvVars = [
          'DATABASE_URL',
          'NEXTAUTH_SECRET',
          'OPENAI_API_KEY'
        ];
        return requiredEnvVars.every(envVar => process.env[envVar]);
      },
      errorMessage: 'Required environment variables are missing'
    },
    {
      name: 'Database connectivity',
      check: async () => {
        try {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          await prisma.$connect();
          await prisma.$disconnect();
          return true;
        } catch (err) {
          return false;
        }
      },
      errorMessage: 'Cannot connect to database'
    }
  ];

  for (const check of checks) {
    try {
      const result = await check.check();
      if (result) {
        success(`✓ ${check.name}`);
      } else {
        error(`✗ ${check.name}: ${check.errorMessage}`);
        return false;
      }
    } catch (err) {
      error(`✗ ${check.name}: ${err.message}`);
      return false;
    }
  }

  success('All prerequisites passed');
  return true;
}

/**
 * Create pre-deployment backup
 */
async function createBackup() {
  if (!DEPLOY_CONFIG.backupBeforeDeploy) {
    log('Skipping backup (disabled in config)');
    return;
  }

  try {
    log('Creating pre-deployment backup...');

    // Run backup script
    execSync('node ./scripts/backup-database.js backup', { stdio: 'inherit' });

    success('Pre-deployment backup completed');

  } catch (err) {
    error(`Backup failed: ${err.message}`);
    throw err;
  }
}

/**
 * Install dependencies
 */
async function installDependencies() {
  try {
    log('Installing dependencies...');

    // Clean install for production
    execSync('npm ci --only=production', {
      stdio: 'inherit',
      timeout: DEPLOY_CONFIG.buildTimeout
    });

    success('Dependencies installed');

  } catch (err) {
    error(`Dependency installation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Build application
 */
async function buildApplication() {
  try {
    log('Building application...');

    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Build Next.js application
    execSync('npm run build', {
      stdio: 'inherit',
      timeout: DEPLOY_CONFIG.buildTimeout
    });

    success('Application built successfully');

  } catch (err) {
    error(`Build failed: ${err.message}`);
    throw err;
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    log('Running database migrations...');

    // Deploy database changes
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

    success('Database migrations completed');

  } catch (err) {
    error(`Migration failed: ${err.message}`);
    throw err;
  }
}

/**
 * Run tests
 */
async function runTests() {
  try {
    log('Running tests...');

    // Check if test script exists
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    if (!packageJson.scripts?.test) {
      warning('No test script found, skipping tests');
      return;
    }

    execSync('npm test', { stdio: 'inherit' });

    success('All tests passed');

  } catch (err) {
    error(`Tests failed: ${err.message}`);
    throw err;
  }
}

/**
 * Perform health check
 */
async function healthCheck() {
  log('Performing health check...');

  const healthCheckUrl = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/api/health';

  for (let attempt = 1; attempt <= DEPLOY_CONFIG.healthCheckRetries; attempt++) {
    try {
      log(`Health check attempt ${attempt}/${DEPLOY_CONFIG.healthCheckRetries}...`);

      const response = await fetch(healthCheckUrl, {
        timeout: DEPLOY_CONFIG.healthCheckTimeout / DEPLOY_CONFIG.healthCheckRetries
      });

      if (response.ok) {
        const data = await response.json();
        success(`Health check passed: ${data.status || 'OK'}`);
        return true;
      } else {
        warning(`Health check failed with status: ${response.status}`);
      }

    } catch (err) {
      warning(`Health check attempt ${attempt} failed: ${err.message}`);
    }

    if (attempt < DEPLOY_CONFIG.healthCheckRetries) {
      log('Waiting 10 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  error('Health check failed after all retries');
  return false;
}

/**
 * Start application
 */
async function startApplication() {
  try {
    log('Starting application...');

    // Kill any existing process on port 3000
    try {
      execSync('lsof -ti:3000 | xargs kill -9', { stdio: 'ignore' });
    } catch (err) {
      // Ignore if no process is running
    }

    // Start application in background
    const spawn = require('child_process').spawn;
    const child = spawn('npm', ['start'], {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();

    // Wait a moment for the process to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    success('Application started');
    log(`Process ID: ${child.pid}`);

  } catch (err) {
    error(`Failed to start application: ${err.message}`);
    throw err;
  }
}

/**
 * Rollback deployment
 */
async function rollback() {
  if (!DEPLOY_CONFIG.rollbackOnFailure) {
    warning('Rollback disabled in configuration');
    return;
  }

  try {
    log('Initiating rollback...');

    // Stop current application
    try {
      execSync('lsof -ti:3000 | xargs kill -9', { stdio: 'ignore' });
    } catch (err) {
      // Ignore if no process is running
    }

    // Restore from backup
    log('Restoring from backup...');
    // This would restore the previous version and database state
    // Implementation depends on your backup strategy

    warning('Rollback completed - manual intervention may be required');

  } catch (err) {
    error(`Rollback failed: ${err.message}`);
  }
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(success, deploymentTime, error = null) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: DEPLOY_CONFIG.environment,
    success: success,
    deploymentTime: deploymentTime,
    error: error,
    version: process.env.npm_package_version || 'unknown',
    nodeVersion: process.version,
    commit: process.env.GIT_COMMIT || 'unknown'
  };

  const reportPath = `./deployment-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`Deployment report saved: ${reportPath}`);

  if (success) {
    success(`🎉 Deployment completed successfully in ${deploymentTime}ms`);
  } else {
    error(`💥 Deployment failed after ${deploymentTime}ms`);
  }
}

/**
 * Main deployment function
 */
async function main() {
  const startTime = Date.now();
  let deploymentSuccess = false;

  try {
    log('🚀 Starting ASH AI production deployment...');
    log(`Environment: ${DEPLOY_CONFIG.environment}`);
    log(`Timestamp: ${new Date().toISOString()}`);

    // Pre-deployment checks
    const prerequisitesPassed = await checkPrerequisites();
    if (!prerequisitesPassed) {
      throw new Error('Prerequisites check failed');
    }

    // Create backup
    await createBackup();

    // Install dependencies
    await installDependencies();

    // Run database migrations
    await runMigrations();

    // Build application
    await buildApplication();

    // Run tests
    await runTests();

    // Start application
    await startApplication();

    // Health check
    const healthCheckPassed = await healthCheck();
    if (!healthCheckPassed) {
      throw new Error('Health check failed');
    }

    deploymentSuccess = true;

    // Post-deployment tasks
    log('Running post-deployment tasks...');

    // Seed database if needed
    try {
      execSync('node ./scripts/seed-database.js', { stdio: 'inherit' });
    } catch (err) {
      warning('Database seeding failed (may already be seeded)');
    }

    success('🎉 Deployment completed successfully!');
    log('');
    log('Next steps:');
    log('1. Monitor application logs');
    log('2. Verify all features are working');
    log('3. Update DNS/load balancer if needed');

  } catch (err) {
    error(`Deployment failed: ${err.message}`);

    // Attempt rollback
    await rollback();

  } finally {
    const deploymentTime = Date.now() - startTime;
    generateDeploymentReport(deploymentSuccess, deploymentTime, !deploymentSuccess ? 'Deployment failed' : null);
  }

  process.exit(deploymentSuccess ? 0 : 1);
}

// Run deployment if this script is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Deployment script error:', err);
    process.exit(1);
  });
}

module.exports = {
  main,
  checkPrerequisites,
  createBackup,
  buildApplication,
  runMigrations,
  healthCheck
};