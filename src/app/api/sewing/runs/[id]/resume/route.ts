// @ts-nocheck
/**
 * ASH AI - Sewing Run Resume API
 * Handles resumption from pause with productivity tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/sewing/runs/[id]/resume - Resume a paused sewing run
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
    const { timestamp } = body

    // Mock resume tracking
    const resumeTime = timestamp || new Date().toISOString()
    
    // Mock Ashley AI recommendations after pause
    const postPauseRecommendations = [
      'Start with 2-3 test pieces to regain rhythm',
      'Check machine settings after pause',
      'Maintain steady pace for next 15 minutes',
      'Quality focus recommended after break'
    ]

    return NextResponse.json({
      success: true,
      message: 'Run resumed successfully - returning to production',
      run: {
        id: runId,
        status: 'IN_PROGRESS',
        resumedAt: resumeTime,
        pauseDuration: '5 minutes', // Mock calculation
      },
      ashleyInsights: {
        recommendation: postPauseRecommendations[Math.floor(Math.random() * postPauseRecommendations.length)],
        productivityTip: 'First 5 pieces after resume are critical for maintaining efficiency',
        qualityAlert: 'Monitor first few pieces for consistency after break',
        paceRecommendation: 'Gradual ramp-up to target speed over 10 minutes'
      },
      realTimeTracking: {
        resumeBonus: true,
        targetEfficiency: 95, // Slightly lower target immediately after resume
        qualityFocus: true
      }
    })

  } catch (error) {
    console.error('Error resuming sewing run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resume sewing run' },
      { status: 500 }
    )
  }
}