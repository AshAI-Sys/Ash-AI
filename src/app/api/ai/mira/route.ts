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

    // Managers, admins, and finance roles can access Mira
    const allowedRoles = [
      Role.ADMIN, 
      Role.MANAGER,
      Role.BOOKKEEPER
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
        const mira = await import('@/lib/ai/ashley-agents').then(m => m.createAgent('mira', session.user.id))
        result = await mira.forecastCashFlow(data)
        break

      case 'optimizePricing':
        // Optimize pricing strategy
        const miraPrice = await import('@/lib/ai/ashley-agents').then(m => m.createAgent('mira', session.user.id))
        result = await miraPrice.optimizePricing(data)
        break

      case 'analyzeCosts':
        // Analyze cost breakdown
        const miraCost = await import('@/lib/ai/ashley-agents').then(m => m.createAgent('mira', session.user.id))
        result = await miraCost.analyzeCosts(data)
        break

      case 'budgetAnalysis':
        // Budget vs actual analysis
        const miraBudget = await import('@/lib/ai/ashley-agents').then(m => m.createAgent('mira', session.user.id))
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

  } catch (error) {
    console.error('Mira AI API error:', error)
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

  } catch (error) {
    console.error('Mira AI API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}