// @ts-nocheck
/**
 * ASH AI - Real-time Sewing Performance API
 * Provides live performance data, operator status, and Ashley AI insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/sewing/realtime - Get real-time sewing performance data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Mock real-time data (in production, this would come from live database queries and websockets)
    const currentTime = new Date()
    
    // Generate realistic real-time performance data
    const mockRuns = {
      'run-001': {
        currentPiecesPerHour: Math.floor(Math.random() * 10) + 20, // 20-30 pieces/hour
        targetPiecesPerHour: 24,
        currentEfficiency: Math.floor(Math.random() * 25) + 85, // 85-110%
        earnings: parseFloat((Math.random() * 50 + 25).toFixed(2)), // $25-75
        qualityScore: Math.floor(Math.random() * 5) + 95, // 95-100%
        timeElapsed: Math.floor(Math.random() * 7200) + 1800, // 30min - 2hr in seconds
        piecesCompleted: Math.floor(Math.random() * 30) + 15, // 15-45 pieces
        avgTimePerPiece: parseFloat((Math.random() * 0.5 + 2.0).toFixed(2)), // 2.0-2.5 minutes
        lastUpdate: currentTime.toISOString(),
        operatorStatus: 'active',
        machineStatus: 'running',
        breakDue: Math.random() > 0.7
      },
      'run-002': {
        currentPiecesPerHour: Math.floor(Math.random() * 8) + 18,
        targetPiecesPerHour: 20,
        currentEfficiency: Math.floor(Math.random() * 30) + 75,
        earnings: parseFloat((Math.random() * 40 + 20).toFixed(2)),
        qualityScore: Math.floor(Math.random() * 8) + 92,
        timeElapsed: Math.floor(Math.random() * 5400) + 900,
        piecesCompleted: Math.floor(Math.random() * 25) + 10,
        avgTimePerPiece: parseFloat((Math.random() * 0.7 + 2.3).toFixed(2)),
        lastUpdate: currentTime.toISOString(),
        operatorStatus: 'active',
        machineStatus: 'running',
        breakDue: Math.random() > 0.8
      }
    }

    // Mock operator status
    const operators = {
      'OP001': {
        id: 'OP001',
        name: 'Maria Santos',
        isOnline: true,
        currentRuns: 2,
        currentEfficiency: 94,
        todayEarnings: 185.50,
        lastActivity: currentTime.toISOString(),
        skillLevel: 'Expert',
        workloadLevel: 'optimal',
        breakScheduled: false
      },
      'OP002': {
        id: 'OP002',
        name: 'Juan Dela Cruz',
        isOnline: true,
        currentRuns: 1,
        currentEfficiency: 87,
        todayEarnings: 142.25,
        lastActivity: new Date(currentTime.getTime() - 300000).toISOString(), // 5 min ago
        skillLevel: 'Intermediate',
        workloadLevel: 'light',
        breakScheduled: true
      }
    }

    // Mock Ashley AI real-time insights
    const liveInsights = [
      {
        type: 'performance_alert',
        priority: 'medium',
        message: 'Line 2 efficiency below target - check machine tension',
        timestamp: currentTime.toISOString(),
        operatorId: 'OP002',
        actionRequired: true
      },
      {
        type: 'quality_prediction',
        priority: 'low',
        message: 'Quality trending stable - maintain current pace',
        timestamp: new Date(currentTime.getTime() - 120000).toISOString(),
        operatorId: 'OP001',
        actionRequired: false
      }
    ]

    // Mock production floor metrics
    const floorMetrics = {
      totalActiveRuns: 5,
      averageEfficiency: 91.2,
      totalPiecesPerHour: 124,
      targetPiecesPerHour: 130,
      qualityScore: 96.8,
      operatorsOnline: 8,
      operatorsOnBreak: 2,
      machinesRunning: 12,
      machinesDown: 1,
      lastUpdated: currentTime.toISOString()
    }

    // Mock alerts and notifications
    const alerts = [
      {
        id: 'alert-001',
        type: 'quality',
        severity: 'high',
        message: 'Machine M-07 showing thread break pattern',
        timestamp: new Date(currentTime.getTime() - 600000).toISOString(),
        acknowledged: false
      }
    ].filter(() => Math.random() > 0.7) // Randomly show alerts

    return NextResponse.json({
      success: true,
      timestamp: currentTime.toISOString(),
      runs: mockRuns,
      operators,
      liveInsights,
      floorMetrics,
      alerts,
      systemStatus: {
        connected: true,
        lastSync: currentTime.toISOString(),
        dataFreshness: 'live', // live, 1min, 5min, stale
        websocketStatus: 'connected'
      }
    })

  } catch (error) {
    console.error('Error fetching real-time sewing data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch real-time data' },
      { status: 500 }
    )
  }
}