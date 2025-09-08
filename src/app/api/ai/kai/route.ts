// Kai AI (Industrial Engineer) API Route
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { callAIAgent } from '@/lib/ai/ashley-agents'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Managers, admins, and production roles can access Kai
    const allowedRoles = [
      'ADMIN', 
      'MANAGER',
      'SILKSCREEN_OPERATOR',
      'DTF_OPERATOR',
      'SUBLIMATION_OPERATOR',
      'EMBROIDERY_OPERATOR',
      'SEWING_OPERATOR',
      'QC_INSPECTOR'
    ]

    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, data } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'analyzeDeadlineRisk':
        if (!data.orderId) {
          return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }
        result = await callAIAgent('kai', 'analyzeDeadlineRisk', data, session.user.id)
        break

      case 'optimizeTaskAssignment':
        if (!data.taskId) {
          return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
        }
        result = await callAIAgent('kai', 'optimizeTaskAssignment', data, session.user.id)
        break

      case 'analyzeBottlenecks':
        // Analyze production bottlenecks
        const { KaiAgent } = await import('@/lib/ai/ashley-agents')
        const kai = new KaiAgent(session.user.id)
        result = await kai.analyzeBottlenecks(data)
        break

      case 'optimizeCapacity':
        // Optimize production capacity
        const { KaiAgent: KaiAgentCapacity } = await import('@/lib/ai/ashley-agents')
        const kaiCapacity = new KaiAgentCapacity(session.user.id)
        result = await kaiCapacity.optimizeCapacity(data)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      result: result,
      agent: 'kai',
      timestamp: new Date().toISOString()
    })

  } catch (_error) {
    console.error('Kai AI API error:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      agent: 'kai',
      status: 'active',
      capabilities: [
        'analyzeDeadlineRisk',
        'optimizeTaskAssignment',
        'analyzeBottlenecks',
        'optimizeCapacity',
        'cycleTimeAnalysis',
        'workloadBalancing'
      ],
      description: 'AI Industrial Engineer - Production optimization and efficiency'
    })

  } catch (_error) {
    console.error('Kai AI API error:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}