import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/qc/analytics - Get comprehensive QC analytics and trend analysis
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d, 30d, 90d, 1y
    const stage = searchParams.get('stage')
    const includeCharts = searchParams.get('charts') === 'true'

    const now = new Date()
    let startDate: Date

    switch (period) {
      case '7d': startDate = new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '30d': startDate = new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000); break
      case '90d': startDate = new Date(new Date(now).getTime() - 90 * 24 * 60 * 60 * 1000); break
      case '1y': startDate = new Date(new Date(now).getTime() - 365 * 24 * 60 * 60 * 1000); break
      default: startDate = new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get all completed inspections in the period
    const inspections = await prisma.qCInspection.findMany({
      where: {
        status: { in: ['PASSED', 'FAILED', 'CLOSED'] },
        closedAt: { gte: startDate },
        ...(stage && { stage: stage as any })
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            clientName: true,
            productType: true
          }
        },
        inspector: {
          select: {
            name: true
          }
        },
        defects: {
          include: {
            defectCode: {
              select: {
                code: true,
                description: true,
                severity: true
              }
            }
          }
        },
        samples: true
      },
      orderBy: { closedAt: 'asc' }
    })

    // Calculate comprehensive analytics
    const analytics = {
      overview: calculateOverviewMetrics(inspections),
      trends: calculateTrendMetrics(inspections, period),
      quality: calculateQualityMetrics(inspections),
      defects: calculateDefectAnalysis(inspections),
      operators: calculateOperatorPerformance(inspections),
      stages: calculateStageAnalysis(inspections),
      clients: calculateClientAnalysis(inspections)
    }

    // Generate P-chart data if requested
    let pChartData = null
    if (includeCharts) {
      pChartData = generatePChartData(inspections)
    }

    // Calculate Ashley AI insights
    const insights = await generateQualityInsights(inspections, analytics)

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate,
        end: now
      },
      analytics,
      pChartData,
      insights,
      totalInspections: inspections.length
    })

  } catch (_error) {
    console.error('Error fetching QC analytics:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions for analytics calculations
function calculateOverviewMetrics(inspections: any[]) {
  if (inspections.length === 0) {
    return {
      totalInspections: 0,
      passRate: 0,
      failRate: 0,
      avgDefectsPerInspection: 0,
      totalSamples: 0,
      totalDefects: 0
    }
  }

  const totalInspections = inspections.length
  const passedInspections = inspections.filter(i => i.status === 'PASSED' || i.disposition === 'PASSED').length
  const failedInspections = inspections.filter(i => i.status === 'FAILED' || i.disposition === 'FAILED').length
  const totalSamples = inspections.reduce((sum, i) => sum + i.samples.length, 0)
  const totalDefects = inspections.reduce((sum, i) => sum + i.actualDefects, 0)

  return {
    totalInspections,
    passedInspections,
    failedInspections,
    passRate: Math.round((passedInspections / totalInspections) * 100),
    failRate: Math.round((failedInspections / totalInspections) * 100),
    avgDefectsPerInspection: Math.round((totalDefects / totalInspections) * 10) / 10,
    totalSamples,
    totalDefects,
    defectRate: totalSamples > 0 ? Math.round((totalDefects / totalSamples) * 1000) / 10 : 0
  }
}

function calculateTrendMetrics(inspections: any[], period: string) {
  // Group inspections by time periods
  const groupSize = period === '7d' ? 1 : period === '30d' ? 3 : period === '90d' ? 7 : 30 // days per group
  const trends: any[] = []

  const sortedInspections = [...inspections].sort((a, b) => 
    new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
  )

  if (sortedInspections.length === 0) return trends

  const startDate = new Date(sortedInspections[0].closedAt)
  const endDate = new Date(sortedInspections[sortedInspections.length - 1].closedAt)
  
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const periodEnd = new Date(new Date(currentDate).getTime() + groupSize * 24 * 60 * 60 * 1000)
    const periodInspections = sortedInspections.filter(i => {
      const inspectionDate = new Date(i.closedAt)
      return inspectionDate >= currentDate && inspectionDate < periodEnd
    })

    if (periodInspections.length > 0) {
      const passed = periodInspections.filter(i => i.status === 'PASSED' || i.disposition === 'PASSED').length
      const totalSamples = periodInspections.reduce((sum, i) => sum + i.samples.length, 0)
      const totalDefects = periodInspections.reduce((sum, i) => sum + i.actualDefects, 0)

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        inspections: periodInspections.length,
        passRate: periodInspections.length > 0 ? Math.round((passed / periodInspections.length) * 100) : 0,
        defectRate: totalSamples > 0 ? Math.round((totalDefects / totalSamples) * 1000) / 10 : 0,
        avgDefects: periodInspections.length > 0 ? Math.round((totalDefects / periodInspections.length) * 10) / 10 : 0
      })
    }

    currentDate = new Date(periodEnd)
  }

  return trends
}

function calculateQualityMetrics(inspections: any[]) {
  const totalSamples = inspections.reduce((sum, i) => sum + i.samples.length, 0)
  const totalDefects = inspections.reduce((sum, i) => sum + i.actualDefects, 0)
  const criticalDefects = inspections.reduce((sum, i) => 
    sum + i.defects.filter((d: any) => d.severity === 'CRITICAL').reduce((s: number, d: any) => s + d.qty, 0), 0)
  const majorDefects = inspections.reduce((sum, i) => 
    sum + i.defects.filter((d: any) => d.severity === 'MAJOR').reduce((s: number, d: any) => s + d.qty, 0), 0)
  const minorDefects = inspections.reduce((sum, i) => 
    sum + i.defects.filter((d: any) => d.severity === 'MINOR').reduce((s: number, d: any) => s + d.qty, 0), 0)

  // Calculate control limits for p-chart (3-sigma)
  const avgDefectRate = totalSamples > 0 ? totalDefects / totalSamples : 0
  const avgSampleSize = inspections.length > 0 ? totalSamples / inspections.length : 0
  
  const pBar = avgDefectRate
  const stdDev = avgSampleSize > 0 ? Math.sqrt((pBar * (1 - pBar)) / avgSampleSize) : 0
  
  return {
    totalSamples,
    totalDefects,
    overallDefectRate: totalSamples > 0 ? Math.round((totalDefects / totalSamples) * 1000) / 10 : 0,
    criticalDefects,
    majorDefects,
    minorDefects,
    defectDistribution: {
      critical: totalDefects > 0 ? Math.round((criticalDefects / totalDefects) * 100) : 0,
      major: totalDefects > 0 ? Math.round((majorDefects / totalDefects) * 100) : 0,
      minor: totalDefects > 0 ? Math.round((minorDefects / totalDefects) * 100) : 0
    },
    controlLimits: {
      centerLine: Math.round(pBar * 1000) / 10,
      upperControlLimit: Math.round((pBar + 3 * stdDev) * 1000) / 10,
      lowerControlLimit: Math.max(0, Math.round((pBar - 3 * stdDev) * 1000) / 10),
      upperWarningLimit: Math.round((pBar + 2 * stdDev) * 1000) / 10,
      lowerWarningLimit: Math.max(0, Math.round((pBar - 2 * stdDev) * 1000) / 10)
    }
  }
}

function calculateDefectAnalysis(inspections: any[]) {
  const defectCounts: { [key: string]: { count: number, severity: string, description: string } } = {}
  const defectsByStage: { [key: string]: number } = {}
  
  inspections.forEach(inspection => {
    defectsByStage[inspection.stage] = (defectsByStage[inspection.stage] || 0) + inspection.actualDefects
    
    inspection.defects.forEach((defect: any) => {
      const key = defect.defectCode.code
      if (!defectCounts[key]) {
        defectCounts[key] = {
          count: 0,
          severity: defect.severity,
          description: defect.defectCode.description
        }
      }
      defectCounts[key].count += defect.qty
    })
  })

  const topDefects = Object.entries(defectCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([code, data]) => ({ code, ...data }))

  return {
    topDefects,
    defectsByStage,
    totalUniqueDefects: Object.keys(defectCounts).length
  }
}

function calculateOperatorPerformance(inspections: any[]) {
  const operatorStats: { [key: string]: any } = {}

  inspections.forEach(inspection => {
    const inspector = inspection.inspector.name
    
    if (!operatorStats[inspector]) {
      operatorStats[inspector] = {
        name: inspector,
        inspections: 0,
        passed: 0,
        failed: 0,
        totalSamples: 0,
        totalDefects: 0
      }
    }

    operatorStats[inspector].inspections += 1
    operatorStats[inspector].totalSamples += inspection.samples.length
    operatorStats[inspector].totalDefects += inspection.actualDefects

    if (inspection.status === 'PASSED' || inspection.disposition === 'PASSED') {
      operatorStats[inspector].passed += 1
    } else {
      operatorStats[inspector].failed += 1
    }
  })

  return Object.values(operatorStats)
    .map((stats: any) => ({
      ...stats,
      passRate: stats.inspections > 0 ? Math.round((stats.passed / stats.inspections) * 100) : 0,
      avgDefectsPerInspection: stats.inspections > 0 ? Math.round((stats.totalDefects / stats.inspections) * 10) / 10 : 0,
      defectRate: stats.totalSamples > 0 ? Math.round((stats.totalDefects / stats.totalSamples) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.passRate - a.passRate)
}

function calculateStageAnalysis(inspections: any[]) {
  const stageStats: { [key: string]: any } = {}

  inspections.forEach(inspection => {
    const stage = inspection.stage
    
    if (!stageStats[stage]) {
      stageStats[stage] = {
        stage,
        inspections: 0,
        passed: 0,
        failed: 0,
        totalSamples: 0,
        totalDefects: 0,
        avgLotSize: 0,
        totalLotSize: 0
      }
    }

    stageStats[stage].inspections += 1
    stageStats[stage].totalSamples += inspection.samples.length
    stageStats[stage].totalDefects += inspection.actualDefects
    stageStats[stage].totalLotSize += inspection.lotSize

    if (inspection.status === 'PASSED' || inspection.disposition === 'PASSED') {
      stageStats[stage].passed += 1
    } else {
      stageStats[stage].failed += 1
    }
  })

  return Object.values(stageStats)
    .map((stats: any) => ({
      ...stats,
      passRate: stats.inspections > 0 ? Math.round((stats.passed / stats.inspections) * 100) : 0,
      failRate: stats.inspections > 0 ? Math.round((stats.failed / stats.inspections) * 100) : 0,
      defectRate: stats.totalSamples > 0 ? Math.round((stats.totalDefects / stats.totalSamples) * 1000) / 10 : 0,
      avgLotSize: stats.inspections > 0 ? Math.round(stats.totalLotSize / stats.inspections) : 0
    }))
    .sort((a, b) => b.inspections - a.inspections)
}

function calculateClientAnalysis(inspections: any[]) {
  const clientStats: { [key: string]: any } = {}

  inspections.forEach(inspection => {
    const client = inspection.order.clientName
    
    if (!clientStats[client]) {
      clientStats[client] = {
        name: client,
        inspections: 0,
        passed: 0,
        failed: 0,
        totalDefects: 0,
        orders: new Set()
      }
    }

    clientStats[client].inspections += 1
    clientStats[client].totalDefects += inspection.actualDefects
    clientStats[client].orders.add(inspection.order.orderNumber)

    if (inspection.status === 'PASSED' || inspection.disposition === 'PASSED') {
      clientStats[client].passed += 1
    } else {
      clientStats[client].failed += 1
    }
  })

  return Object.values(clientStats)
    .map((stats: any) => ({
      name: stats.name,
      inspections: stats.inspections,
      orders: stats.orders.size,
      passRate: stats.inspections > 0 ? Math.round((stats.passed / stats.inspections) * 100) : 0,
      avgDefectsPerInspection: stats.inspections > 0 ? Math.round((stats.totalDefects / stats.inspections) * 10) / 10 : 0
    }))
    .sort((a, b) => b.inspections - a.inspections)
    .slice(0, 10) // Top 10 clients
}

function generatePChartData(inspections: any[]) {
  return inspections.map((inspection, index) => {
    const sampleSize = inspection.samples.length
    const defects = inspection.actualDefects
    const defectRate = sampleSize > 0 ? (defects / sampleSize) * 100 : 0

    return {
      inspectionId: inspection.id,
      orderNumber: inspection.order.orderNumber,
      date: inspection.closedAt,
      sampleSize,
      defects,
      defectRate: Math.round(defectRate * 10) / 10,
      stage: inspection.stage,
      index: index + 1
    }
  })
}

async function generateQualityInsights(inspections: any[], analytics: any) {
  const insights: any[] = []

  // Trend analysis
  if (analytics.trends.length >= 5) {
    const recentTrends = analytics.trends.slice(-5)
    const passRateTrend = recentTrends[recentTrends.length - 1].passRate - recentTrends[0].passRate
    
    if (passRateTrend < -10) {
      insights.push({
        type: 'TREND_ALERT',
        priority: 'HIGH',
        title: 'Declining Quality Trend',
        message: `Pass rate has decreased by ${Math.abs(passRateTrend)}% over the recent period. Immediate investigation recommended.`,
        data: { passRateTrend, period: 'recent' }
      })
    } else if (passRateTrend > 10) {
      insights.push({
        type: 'POSITIVE_TREND',
        priority: 'LOW',
        title: 'Quality Improvement',
        message: `Pass rate has improved by ${passRateTrend}% over the recent period. Great work!`,
        data: { passRateTrend, period: 'recent' }
      })
    }
  }

  // Defect concentration analysis
  if (analytics.defects.topDefects.length > 0) {
    const topDefect = analytics.defects.topDefects[0]
    const totalDefects = analytics.quality.totalDefects
    const concentration = (topDefect.count / totalDefects) * 100

    if (concentration > 30) {
      insights.push({
        type: 'DEFECT_CONCENTRATION',
        priority: 'MEDIUM',
        title: 'High Defect Concentration',
        message: `${topDefect.code} accounts for ${Math.round(concentration)}% of all defects. Focus improvement efforts here.`,
        data: { defectCode: topDefect.code, concentration, severity: topDefect.severity }
      })
    }
  }

  // Stage performance analysis
  const worstStage = analytics.stages.sort((a: any, b: any) => a.passRate - b.passRate)[0]
  if (worstStage && worstStage.passRate < 80) {
    insights.push({
      type: 'STAGE_PERFORMANCE',
      priority: 'MEDIUM',
      title: `${worstStage.stage} Stage Quality Issue`,
      message: `${worstStage.stage} stage has a ${worstStage.passRate}% pass rate. Consider process improvements.`,
      data: { stage: worstStage.stage, passRate: worstStage.passRate, defectRate: worstStage.defectRate }
    })
  }

  // Control limit violations (for P-chart)
  const controlLimits = analytics.quality.controlLimits
  const violations = inspections.filter((inspection: any) => {
    const sampleSize = inspection.samples.length
    const defectRate = sampleSize > 0 ? (inspection.actualDefects / sampleSize) * 100 : 0
    return defectRate > controlLimits.upperControlLimit
  })

  if (violations.length > 0) {
    insights.push({
      type: 'CONTROL_LIMIT_VIOLATION',
      priority: 'HIGH',
      title: 'Statistical Control Violations',
      message: `${violations.length} inspections exceeded statistical control limits. Process may be out of control.`,
      data: { violationCount: violations.length, controlLimit: controlLimits.upperControlLimit }
    })
  }

  return insights
}