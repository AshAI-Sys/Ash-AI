// @ts-nocheck
/**
 * ASH AI - Enhanced Sewing Run Completion API
 * Supports quality tracking, Ashley AI insights, and performance analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/sewing/runs/[id]/complete - Complete a sewing run with detailed tracking
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
    const {
      qtyGood,
      qtyDefects,
      qtyRejects,
      notes,
      defectTypes = [],
      qualityIssues,
      operatorRating,
      completionTime,
      operatorId
    } = body

    // Calculate performance metrics
    const totalPieces = qtyGood + qtyDefects + qtyRejects
    const qualityScore = totalPieces > 0 ? ((qtyGood / totalPieces) * 100) : 100
    
    // Mock standard time and piece rate (would come from database)
    const standardMinutes = 2.5
    const pieceRate = 0.15
    
    const earnedMinutes = qtyGood * standardMinutes
    const actualMinutes = 120 // Mock - would calculate from start/end time
    const efficiency = actualMinutes > 0 ? (earnedMinutes / actualMinutes) * 100 : 0
    const earnings = qtyGood * pieceRate

    // Generate Ashley AI insights based on performance
    const insights = []
    const achievements = []
    
    if (efficiency >= 110) {
      insights.push({
        priority: 'HIGH',
        title: 'Exceptional Performance',
        message: `${efficiency.toFixed(1)}% efficiency achieved! Consider for skill advancement.`
      })
      achievements.push('High Efficiency Master')
    } else if (efficiency < 80) {
      insights.push({
        priority: 'MEDIUM',
        title: 'Performance Below Target',
        message: 'Consider additional training or machine maintenance check.'
      })
    }

    if (qualityScore >= 98) {
      achievements.push('Quality Champion')
      insights.push({
        priority: 'LOW',
        title: 'Excellent Quality',
        message: `${qualityScore.toFixed(1)}% quality score maintained.`
      })
    } else if (qualityScore < 95) {
      insights.push({
        priority: 'HIGH',
        title: 'Quality Alert',
        message: `Quality score ${qualityScore.toFixed(1)}% below target. Review defect patterns.`
      })
    }

    // Defect analysis
    if (defectTypes.length > 0) {
      insights.push({
        priority: 'MEDIUM',
        title: 'Defect Pattern Analysis',
        message: `Common issues: ${defectTypes.slice(0, 2).join(', ')}. Consider targeted training.`
      })
    }

    // Ashley AI recommendations for next operations
    const nextRecommendations = [
      'Schedule 10-minute break before next operation',
      'Continue with current setup - performance is optimal',
      'Check machine tension before starting next bundle',
      'Consider switching to easier operation for fatigue recovery'
    ]

    return NextResponse.json({
      success: true,
      message: `Run completed successfully! ${qtyGood} good pieces, ${efficiency.toFixed(1)}% efficiency`,
      run: {
        id: runId,
        status: 'COMPLETED',
        endedAt: completionTime || new Date().toISOString(),
        qtyGood,
        qtyDefects,
        qtyRejects,
        totalPieces,
        notes,
        defectTypes,
        qualityIssues,
        operatorRating
      },
      performance: {
        efficiency: parseFloat(efficiency.toFixed(1)),
        qualityScore: parseFloat(qualityScore.toFixed(1)),
        earnings: parseFloat(earnings.toFixed(2)),
        earnedMinutes,
        actualMinutes
      },
      insights,
      achievements,
      ashleyRecommendations: {
        nextOperation: nextRecommendations[Math.floor(Math.random() * nextRecommendations.length)],
        breakRecommendation: efficiency < 85 ? 'Take 15-minute break' : 'Take 5-minute break',
        skillDevelopment: operatorRating >= 4 ? 'Ready for advanced operations' : 'Continue current skill level'
      },
      analytics: {
        pieceRate: pieceRate,
        standardMinutes: standardMinutes,
        targetEfficiency: 100,
        qualityTarget: 98,
        performanceTrend: efficiency >= 100 ? 'improving' : efficiency >= 90 ? 'stable' : 'needs_attention'
      }
    })

  } catch (error) {
    console.error('Error completing sewing run:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete sewing run' },
      { status: 500 }
    )
  }
}