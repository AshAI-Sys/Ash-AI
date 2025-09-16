/**
 * System Monitoring and Health Check for ASH AI
 * Provides real-time system health monitoring and alerting
 */

import { prisma } from '../prisma';
import { logError, ErrorType, ErrorSeverity } from '../error-handler';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  services: {
    database: ServiceStatus;
    ai: ServiceStatus;
    storage: ServiceStatus;
    authentication: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeUsers: number;
    errorRate: number;
  };
  alerts: SystemAlert[];
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

export interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export class SystemMonitor {
  private static instance: SystemMonitor;
  private alerts: SystemAlert[] = [];
  private metrics: any = {};

  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * Check overall system health
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();

    try {
      // Check all services in parallel
      const [database, ai, storage, auth] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkAIServiceHealth(),
        this.checkStorageHealth(),
        this.checkAuthenticationHealth()
      ]);

      const services = {
        database: database.status === 'fulfilled' ? database.value : this.createErrorStatus('Database check failed'),
        ai: ai.status === 'fulfilled' ? ai.value : this.createErrorStatus('AI service check failed'),
        storage: storage.status === 'fulfilled' ? storage.value : this.createErrorStatus('Storage check failed'),
        authentication: auth.status === 'fulfilled' ? auth.value : this.createErrorStatus('Auth check failed')
      };

      // Calculate system metrics
      const metrics = await this.calculateSystemMetrics();

      // Determine overall system status
      const status = this.determineSystemStatus(services, metrics);

      // Check for new alerts
      await this.checkForAlerts(services, metrics);

      const health: SystemHealth = {
        status,
        timestamp: new Date(),
        services,
        metrics,
        alerts: this.getActiveAlerts()
      };

      // Log health check completion
      const responseTime = Date.now() - startTime;
      console.log(`System health check completed in ${responseTime}ms - Status: ${status}`);

      return health;

    } catch (error) {
      await logError({
        type: ErrorType.SYSTEM,
        severity: ErrorSeverity.HIGH,
        message: 'System health check failed',
        context: { error: error.message },
        metadata: { duration: Date.now() - startTime }
      });

      // Return critical status if health check itself fails
      return {
        status: 'critical',
        timestamp: new Date(),
        services: {
          database: this.createErrorStatus('Health check failed'),
          ai: this.createErrorStatus('Health check failed'),
          storage: this.createErrorStatus('Health check failed'),
          authentication: this.createErrorStatus('Health check failed')
        },
        metrics: {
          responseTime: Date.now() - startTime,
          memoryUsage: 0,
          cpuUsage: 0,
          activeUsers: 0,
          errorRate: 100
        },
        alerts: this.getActiveAlerts()
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`;

      // Test a simple query
      const userCount = await prisma.user.count();

      const responseTime = Date.now() - startTime;

      // Check if response time is acceptable (< 500ms)
      const status = responseTime > 500 ? 'degraded' : 'up';

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        error: status === 'degraded' ? 'Slow database response' : undefined
      };

    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check AI service health (OpenAI API)
   */
  private async checkAIServiceHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Simple API test - just check if we can create a client
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'down',
          responseTime: 0,
          lastCheck: new Date(),
          error: 'OpenAI API key not configured'
        };
      }

      // In a real implementation, you might make a simple API call here
      // For now, just check configuration
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check storage health (file system, uploads, etc.)
   */
  private async checkStorageHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Check if we can access the public directory
      const fs = require('fs').promises;
      await fs.access('./public');

      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check authentication service health
   */
  private async checkAuthenticationHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Check if NextAuth configuration is valid
      if (!process.env.NEXTAUTH_SECRET) {
        return {
          status: 'down',
          responseTime: 0,
          lastCheck: new Date(),
          error: 'NextAuth secret not configured'
        };
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Calculate system performance metrics
   */
  private async calculateSystemMetrics(): Promise<any> {
    try {
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Get active users (simplified - count recent sessions)
      const activeUsers = await this.getActiveUserCount();

      // Calculate error rate from recent logs
      const errorRate = await this.calculateErrorRate();

      return {
        responseTime: 0, // Will be set by caller
        memoryUsage: memoryUsagePercent,
        cpuUsage: 0, // Would need additional monitoring for real CPU usage
        activeUsers,
        errorRate
      };

    } catch (error) {
      console.warn('Failed to calculate system metrics:', error);
      return {
        responseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeUsers: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Get count of active users (sessions in last hour)
   */
  private async getActiveUserCount(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const activeUsers = await prisma.user.count({
        where: {
          last_login: {
            gte: oneHourAgo
          },
          active: true
        }
      });

      return activeUsers;

    } catch (error) {
      console.warn('Failed to get active user count:', error);
      return 0;
    }
  }

  /**
   * Calculate error rate from recent logs
   */
  private async calculateErrorRate(): Promise<number> {
    try {
      // In a real implementation, you'd query error logs
      // For now, return a mock value
      return 0;

    } catch (error) {
      console.warn('Failed to calculate error rate:', error);
      return 0;
    }
  }

  /**
   * Determine overall system status based on services and metrics
   */
  private determineSystemStatus(services: any, metrics: any): 'healthy' | 'warning' | 'critical' {
    // Count service statuses
    const serviceStatuses = Object.values(services) as ServiceStatus[];
    const downServices = serviceStatuses.filter(s => s.status === 'down').length;
    const degradedServices = serviceStatuses.filter(s => s.status === 'degraded').length;

    // Critical if any core service is down
    if (downServices > 0) {
      return 'critical';
    }

    // Warning if services are degraded or metrics are concerning
    if (degradedServices > 0 || metrics.memoryUsage > 80 || metrics.errorRate > 5) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Check for system alerts based on current status
   */
  private async checkForAlerts(services: any, metrics: any): Promise<void> {
    const now = new Date();

    // Check for high memory usage
    if (metrics.memoryUsage > 90) {
      this.addAlert({
        id: `memory-${now.getTime()}`,
        type: 'performance',
        severity: 'high',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        timestamp: now,
        resolved: false
      });
    }

    // Check for service failures
    Object.entries(services).forEach(([serviceName, status]: [string, any]) => {
      if (status.status === 'down') {
        this.addAlert({
          id: `service-${serviceName}-${now.getTime()}`,
          type: 'error',
          severity: 'critical',
          message: `Service ${serviceName} is down: ${status.error}`,
          timestamp: now,
          resolved: false
        });
      }
    });

    // Check for high error rate
    if (metrics.errorRate > 10) {
      this.addAlert({
        id: `errorrate-${now.getTime()}`,
        type: 'error',
        severity: 'medium',
        message: `High error rate: ${metrics.errorRate}%`,
        timestamp: now,
        resolved: false
      });
    }
  }

  /**
   * Add a new alert to the system
   */
  private addAlert(alert: SystemAlert): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a =>
      a.type === alert.type &&
      a.message === alert.message &&
      !a.resolved
    );

    if (!existingAlert) {
      this.alerts.push(alert);

      // Log the alert
      logError({
        type: ErrorType.SYSTEM,
        severity: alert.severity === 'critical' ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
        message: alert.message,
        context: { alertType: alert.type },
        metadata: { alertId: alert.id }
      });
    }
  }

  /**
   * Get active (unresolved) alerts
   */
  private getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Create error status for failed health checks
   */
  private createErrorStatus(error: string): ServiceStatus {
    return {
      status: 'down',
      responseTime: 0,
      lastCheck: new Date(),
      error
    };
  }

  /**
   * Start continuous monitoring (call this at app startup)
   */
  startMonitoring(intervalMinutes: number = 5): void {
    setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        console.error('Monitoring check failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`System monitoring started - checking every ${intervalMinutes} minutes`);
  }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance();