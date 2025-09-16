/**
 * Health Check API Endpoint for ASH AI
 * Provides system health status for monitoring and deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor } from '@/lib/monitoring/system-monitor';

export async function GET(request: NextRequest) {
  try {
    // Perform comprehensive health check
    const health = await systemMonitor.checkSystemHealth();

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'warning' ? 200 : 503;

    // Include additional system information
    const response = {
      status: health.status,
      timestamp: health.timestamp,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      services: health.services,
      metrics: health.metrics,
      alerts: health.alerts
    };

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    // Return critical status if health check itself fails
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date(),
      error: 'Health check failed',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 503 });
  }
}

// Simple ping endpoint for basic availability check
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}