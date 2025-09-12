// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import AnalyticsEngine from '@/lib/realtime/analytics-engine'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for analytics access
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'kpis'

    const analytics = AnalyticsEngine.getInstance()

    switch (type) {
      case 'kpis':
        const kpis = await analytics.getRealTimeKPIs()
        return NextResponse.json({
          success: true,
          data: {
            kpis,
            timestamp: new Date().toISOString()
          }
        })

      case 'production':
        const productionAnalytics = await analytics.getProductionAnalytics()
        return NextResponse.json({
          success: true,
          data: {
            production: productionAnalytics,
            timestamp: new Date().toISOString()
          }
        })

      case 'operational':
        const operationalAnalytics = await analytics.getOperationalAnalytics()
        return NextResponse.json({
          success: true,
          data: {
            operational: operationalAnalytics,
            timestamp: new Date().toISOString()
          }
        })

      case 'predictive':
        const predictiveAnalytics = await analytics.generatePredictiveAnalytics()
        return NextResponse.json({
          success: true,
          data: {
            predictive: predictiveAnalytics,
            timestamp: new Date().toISOString()
          }
        })

      case 'all':
        const [kpisAll, production, operational, predictive] = await Promise.all([
          analytics.getRealTimeKPIs(),
          analytics.getProductionAnalytics(),
          analytics.getOperationalAnalytics(),
          analytics.generatePredictiveAnalytics()
        ])

        return NextResponse.json({
          success: true,
          data: {
            kpis: kpisAll,
            production,
            operational,
            predictive,
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type. Use: kpis, production, operational, predictive, or all' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in analytics GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for analytics control
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, data } = body

    const analytics = AnalyticsEngine.getInstance()

    switch (action) {
      case 'start_analytics':
        analytics.startAnalytics()
        return NextResponse.json({
          success: true,
          message: 'Real-time analytics engine started',
          timestamp: new Date().toISOString()
        })

      case 'stop_analytics':
        analytics.stopAnalytics()
        return NextResponse.json({
          success: true,
          message: 'Real-time analytics engine stopped',
          timestamp: new Date().toISOString()
        })

      case 'force_kpi_update':
        await analytics.forceKPIUpdate()
        return NextResponse.json({
          success: true,
          message: 'KPI update forced successfully',
          timestamp: new Date().toISOString()
        })

      case 'generate_custom_report':
        const { startDate, endDate, metrics, groupBy } = data
        
        if (!startDate || !endDate || !metrics || !groupBy) {
          return NextResponse.json(
            { error: 'startDate, endDate, metrics array, and groupBy are required for custom reports' },
            { status: 400 }
          )
        }
        
        if (!['hour', 'day', 'week'].includes(groupBy)) {
          return NextResponse.json(
            { error: 'groupBy must be: hour, day, or week' },
            { status: 400 }
          )
        }
        
        const customReport = await analytics.generateCustomReport({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          metrics,
          groupBy
        })
        
        return NextResponse.json({
          success: true,
          data: {
            report: customReport,
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in analytics POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}