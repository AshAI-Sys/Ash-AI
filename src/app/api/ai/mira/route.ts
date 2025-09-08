// Mira AI (Finance Analyst) API Route
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

    // Managers and admins can access Mira
    const allowedRoles = [
      'ADMIN', 
      'MANAGER'
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
      case 'analyzeProfitability':
        if (!data.orderId) {
          return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }
        result = await callAIAgent('mira', 'analyzeProfitability', data, session.user.id)
        break

      case 'forecastCashFlow':
        // Forecast cash flow
        const { MiraAgent } = await import('@/lib/ai/ashley-agents')
        const mira = new MiraAgent(session.user.id)
        result = await mira.forecastCashFlow(data)
        break

      case 'optimizePricing':
        // Optimize pricing strategy
        const { MiraAgent: MiraAgentPrice } = await import('@/lib/ai/ashley-agents')
        const miraPrice = new MiraAgentPrice(session.user.id)
        result = await miraPrice.optimizePricing(data)
        break

      case 'analyzeCosts':
        // Analyze cost breakdown
        const { MiraAgent: MiraAgentCost } = await import('@/lib/ai/ashley-agents')
        const miraCost = new MiraAgentCost(session.user.id)
        result = await miraCost.analyzeCosts(data)
        break

      case 'budgetAnalysis':
        // Budget vs actual analysis
        const { MiraAgent: MiraAgentBudget } = await import('@/lib/ai/ashley-agents')
        const miraBudget = new MiraAgentBudget(session.user.id)
        result = await miraBudget.budgetAnalysis(data)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      result: result,
      agent: 'mira',
      timestamp: new Date().toISOString()
    })

  } catch (_error) {
    console.error('Mira AI API error:', _error)
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
      agent: 'mira',
      status: 'active',
      capabilities: [
        'analyzeProfitability',
        'forecastCashFlow',
        'optimizePricing',
        'analyzeCosts',
        'budgetAnalysis',
        'marginOptimization',
        'breakEvenAnalysis'
      ],
      description: 'AI Finance Analyst - Cost analysis, pricing, and financial forecasting'
    })

  } catch (_error) {
    console.error('Mira AI API error:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}