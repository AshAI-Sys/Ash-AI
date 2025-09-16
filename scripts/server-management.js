#!/usr/bin/env node
// ASH AI - Complete Server Management System
// Comprehensive solution for development server management

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

class ServerManager {
  constructor() {
    this.projectPath = process.cwd();
    this.logFile = path.join(this.projectPath, 'server.log');
    this.pidFile = path.join(this.projectPath, '.server.pid');
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(`🎖️ ${message}`);
    fs.appendFileSync(this.logFile, logMessage);
  }

  async findAvailablePort(startPort = 3000) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.on('error', () => {
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  async killAllNodeProcesses() {
    return new Promise((resolve) => {
      this.log('🚨 TERMINATING ALL NODE PROCESSES...');
      
      // Windows-specific process termination
      exec('taskkill /f /im node.exe', (error) => {
        if (error && !error.message.includes('not found')) {
          this.log(`⚠️ Process termination warning: ${error.message}`);
        }
        
        // Additional cleanup for stubborn processes
        exec('wmic process where "name=\'node.exe\'" delete', () => {
          setTimeout(() => {
            this.log('✅ All Node processes terminated');
            resolve();
          }, 1000);
        });
      });
    });
  }

  async cleanCache() {
    this.log('🧹 COMPREHENSIVE CACHE CLEANUP...');
    
    const pathsToClean = [
      '.next',
      'node_modules/.cache',
      '.eslintcache',
      'tsconfig.tsbuildinfo'
    ];

    for (const pathToClean of pathsToClean) {
      const fullPath = path.join(this.projectPath, pathToClean);
      try {
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          this.log(`✅ Cleaned: ${pathToClean}`);
        }
      } catch (error) {
        this.log(`⚠️ Could not clean ${pathToClean}: ${error.message}`);
      }
    }
  }

  async validateProject() {
    this.log('🔍 VALIDATING PROJECT STRUCTURE...');
    
    const criticalFiles = [
      'package.json',
      'next.config.js',
      'src/app/layout.tsx',
      'src/app/page.tsx'
    ];

    const missingFiles = [];
    for (const file of criticalFiles) {
      if (!fs.existsSync(path.join(this.projectPath, file))) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      this.log(`❌ MISSING CRITICAL FILES: ${missingFiles.join(', ')}`);
      return false;
    }

    this.log('✅ Project structure validated');
    return true;
  }

  async startServer(attempt = 1) {
    return new Promise(async (resolve, reject) => {
      this.log(`🚀 STARTING SERVER (Attempt ${attempt}/${this.maxRetries})...`);
      
      const port = await this.findAvailablePort();
      this.log(`🎯 Using port: ${port}`);
      
      const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PORT: port.toString() }
      });

      // Store PID for cleanup
      fs.writeFileSync(this.pidFile, serverProcess.pid.toString());

      let serverReady = false;
      let errorBuffer = '';
      
      const timeout = setTimeout(() => {
        if (!serverReady) {
          this.log('⏰ Server startup timeout');
          serverProcess.kill();
          if (attempt < this.maxRetries) {
            setTimeout(() => {
              this.startServer(attempt + 1).then(resolve).catch(reject);
            }, this.retryDelay);
          } else {
            reject(new Error('Server startup failed after maximum retries'));
          }
        }
      }, 30000);

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.log(`📊 ${output.trim()}`);
        
        if (output.includes('Ready in') || output.includes('Local:')) {
          serverReady = true;
          clearTimeout(timeout);
          this.log(`🎉 SERVER READY ON PORT ${port}`);
          resolve({ port, process: serverProcess });
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorBuffer += error;
        this.log(`⚠️ ${error.trim()}`);
        
        if (error.includes('EADDRINUSE')) {
          this.log('🔄 Port in use, retrying with different port...');
          clearTimeout(timeout);
          if (attempt < this.maxRetries) {
            setTimeout(() => {
              this.startServer(attempt + 1).then(resolve).catch(reject);
            }, this.retryDelay);
          }
        }
      });

      serverProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (!serverReady) {
          this.log(`💥 Server process closed with code: ${code}`);
          if (attempt < this.maxRetries) {
            setTimeout(() => {
              this.startServer(attempt + 1).then(resolve).catch(reject);
            }, this.retryDelay);
          } else {
            reject(new Error(`Server failed to start: ${errorBuffer}`));
          }
        }
      });
    });
  }

  async fullSystemRestart() {
    this.log('🎖️ INITIATING FULL SYSTEM RESTART PROTOCOL');
    this.log('='.repeat(60));
    
    try {
      // Step 1: Kill all processes
      await this.killAllNodeProcesses();
      
      // Step 2: Validate project
      const isValid = await this.validateProject();
      if (!isValid) {
        throw new Error('Project validation failed');
      }
      
      // Step 3: Clean cache
      await this.cleanCache();
      
      // Step 4: Wait for system stabilization
      this.log('⏳ System stabilization period...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 5: Start server
      const result = await this.startServer();
      
      this.log('='.repeat(60));
      this.log('🎉 FULL SYSTEM RESTART COMPLETED SUCCESSFULLY');
      this.log(`🌐 Server URL: http://localhost:${result.port}`);
      this.log(`📁 Project: ${this.projectPath}`);
      this.log(`📝 Logs: ${this.logFile}`);
      this.log('='.repeat(60));
      
      return result;
      
    } catch (error) {
      this.log(`❌ SYSTEM RESTART FAILED: ${error.message}`);
      throw error;
    }
  }

  async monitorServer(serverProcess) {
    this.log('🔍 STARTING SERVER MONITORING...');
    
    setInterval(() => {
      if (serverProcess && !serverProcess.killed) {
        this.log('✅ Server health check: OPERATIONAL');
      } else {
        this.log('⚠️ Server health check: DOWN - Attempting restart...');
        this.fullSystemRestart().catch(console.error);
      }
    }, 30000); // Check every 30 seconds
  }
}

// Main execution
if (require.main === module) {
  const manager = new ServerManager();
  
  manager.fullSystemRestart()
    .then((result) => {
      manager.monitorServer(result.process);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        manager.log('🛑 Graceful shutdown initiated...');
        if (fs.existsSync(manager.pidFile)) {
          fs.unlinkSync(manager.pidFile);
        }
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('💥 CRITICAL SYSTEM FAILURE:', error.message);
      process.exit(1);
    });
}

module.exports = ServerManager;