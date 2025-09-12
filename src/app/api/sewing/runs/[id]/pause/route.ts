// @ts-nocheck
/**
 * ASH AI - Sewing Run Pause/Resume API
 * Supports break tracking and productivity analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/sewing/runs/[id]/pause - Pause a sewing run
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const runId = params.id
    const body = await request.json()
    const { reason, timestamp } = body

    // Mock pause tracking (would update database in real implementation)
    const pauseReasons = {
      'Manual pause': 'Operator-initiated pause',
      'Break time': 'Scheduled break',
      'Machine issue': 'Equipment problem',
      'Material shortage': 'Waiting for materials',
      'Quality check': 'Quality inspection pause'
    }

    return NextResponse.json({
      success: true,
      message: `Run paused successfully - ${reason || 'Manual pause'}`,
      run: {
        id: runId,
        status: 'PAUSED',
        pausedAt: timestamp || new Date().toISOString(),
        pauseReason: reason || 'Manual pause',
        pauseDescription: pauseReasons[reason] || 'General pause'
      },
      ashleyInsights: {
        recommendation: reason === 'Machine issue' 
          ? 'Contact maintenance team immediately' 
          : reason === 'Break time'
          ? 'Optimal break timing - maintain current pace after resuming'
          : 'Resume within 15 minutes to maintain flow state',
        productivityImpact: 'Minimal if resumed within 10 minutes',
        nextAction: 'Ready to resume when operator is available'
      }
    })

  } catch (error) {
    console.error('Error pausing sewing run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to pause sewing run' },
      { status: 500 }
    )
  }
}