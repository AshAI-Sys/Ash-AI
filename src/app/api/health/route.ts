/**
 * Health Check API Endpoint for ASH AI
 * Provides system health status for monitoring and deployment
 */

import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  try {
    // Simple health check without monitoring system
    const response = {
      status: 'healthy',
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };

    return NextResponse.json(response, { status: 200 });

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