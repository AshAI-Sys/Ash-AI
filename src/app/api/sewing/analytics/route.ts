import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/sewing/analytics - Get comprehensive sewing analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d' // 1d, 7d, 30d, 90d
    const operation = searchParams.get('operation')
    const operator = searchParams.get('operator')

    const now = new Date()
    let startDate: Date

    switch (period) {
      case '1d': startDate = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000); break
      case '7d': startDate = new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '30d': startDate = new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000); break
      case '90d': startDate = new Date(new Date(now).getTime() - 90 * 24 * 60 * 60 * 1000); break
      default: startDate = new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Base query conditions
    const baseWhere = {
      status: 'COMPLETED',
      endedAt: { gte: startDate },
      ...(operation && { operationName: operation }),
      ...(operator && { operatorId: operator })
    }

    // Get completed runs with all necessary data
    const runs = await prisma.sewingRun.findMany({
      where: baseWhere,
      include: {
        operator: { select: { name: true, role: true } },
        operation: { select: { name: true, category: true, standardMinutes: true, difficulty: true } },
        order: { select: { orderNumber: true, productType: true } },
        bundle: { select: { bundleNumber: true, targetQty: true } }
      },
      orderBy: { endedAt: 'desc' }
    })

    // Calculate comprehensive analytics
    const analytics = calculateComprehensiveAnalytics(runs, period)
    
    // Get hourly production trends for charts
    const hourlyTrends = calculateHourlyTrends(runs)
    
    // Get operator performance rankings
    const operatorPerformance = calculateOperatorPerformance(runs)
    
    // Get operation efficiency analysis
    const operationAnalysis = calculateOperationAnalysis(runs)
    
    // Get quality metrics
    const qualityMetrics = calculateQualityMetrics(runs)
    
    // Get efficiency trends
    const efficiencyTrends = calculateEfficiencyTrends(runs, period)

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate,
        end: now
      },
      analytics,
      trends: {
        hourly: hourlyTrends,
        efficiency: efficiencyTrends
      },
      performance: {
        operators: operatorPerformance,
        operations: operationAnalysis
      },
      quality: qualityMetrics,
      totalRuns: runs.length
    })

  } catch (_error) {
    console.error('Error fetching sewing analytics:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateComprehensiveAnalytics(runs: any[], period: string) {
  if (runs.length === 0) {
    return {
      totalRuns: 0,
      totalPieces: 0,
      avgEfficiency: null,
      avgQuality: null,
      totalHours: 0,
      piecesPerHour: null,
      utilizationRate: null
    }
  }

  const totalRuns = runs.length
  const totalPieces = runs.reduce((sum, run) => sum + (run.qtyGood + run.qtyDefects + run.qtyRejects), 0)
  const totalGood = runs.reduce((sum, run) => sum + run.qtyGood, 0)
  const totalDefects = runs.reduce((sum, run) => sum + run.qtyDefects, 0)
  const totalRejects = runs.reduce((sum, run) => sum + run.qtyRejects, 0)
  const totalActualMinutes = runs.reduce((sum, run) => sum + (run.actualMinutes || 0), 0)
  const totalStandardMinutes = runs.reduce((sum, run) => sum + ((run.operation?.standardMinutes || 0) * (run.qtyGood + run.qtyDefects + run.qtyRejects)), 0)

  const avgEfficiency = totalStandardMinutes > 0 ? (totalStandardMinutes / totalActualMinutes) * 100 : null
  const avgQuality = totalPieces > 0 ? (totalGood / totalPieces) * 100 : null
  const totalHours = totalActualMinutes / 60
  const piecesPerHour = totalHours > 0 ? totalPieces / totalHours : null

  // Calculate theoretical capacity based on standard times
  const expectedHours = period === '1d' ? 8 : period === '7d' ? 56 : period === '30d' ? 240 : 720 // Rough estimates
  const utilizationRate = totalHours > 0 ? (totalHours / expectedHours) * 100 : null

  return {
    totalRuns,
    totalPieces,
    totalGood,
    totalDefects,
    totalRejects,
    avgEfficiency: avgEfficiency ? Math.round(avgEfficiency * 10) / 10 : null,
    avgQuality: avgQuality ? Math.round(avgQuality * 10) / 10 : null,
    defectRate: totalPieces > 0 ? Math.round((totalDefects / totalPieces) * 1000) / 10 : 0,
    rejectRate: totalPieces > 0 ? Math.round((totalRejects / totalPieces) * 1000) / 10 : 0,
    totalHours: Math.round(totalHours * 10) / 10,
    piecesPerHour: piecesPerHour ? Math.round(piecesPerHour * 10) / 10 : null,
    utilizationRate: utilizationRate ? Math.round(utilizationRate * 10) / 10 : null
  }
}

function calculateHourlyTrends(runs: any[]) {
  // Group runs by hour for the last 24 hours
  const hourlyData = new Array(24).fill(0).map((_, i) => ({
    hour: i,
    pieces: 0,
    runs: 0,
    efficiency: 0,
    quality: 0
  }))

  const last24Hours = runs.filter(run => 
    run.endedAt && new Date(run.endedAt) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
  )

  last24Hours.forEach(run => {
    if (run.endedAt) {
      const hour = new Date(run.endedAt).getHours()
      const pieces = run.qtyGood + run.qtyDefects + run.qtyRejects
      
      hourlyData[hour].pieces += pieces
      hourlyData[hour].runs += 1
      if (run.efficiency) hourlyData[hour].efficiency += run.efficiency
      
      const quality = pieces > 0 ? (run.qtyGood / pieces) * 100 : 0
      hourlyData[hour].quality += quality
    }
  })

  // Calculate averages
  return hourlyData.map(data => ({
    ...data,
    efficiency: data.runs > 0 ? Math.round((data.efficiency / data.runs) * 10) / 10 : 0,
    quality: data.runs > 0 ? Math.round((data.quality / data.runs) * 10) / 10 : 0
  }))
}

function calculateOperatorPerformance(runs: any[]) {
  const operatorStats = runs.reduce((acc, run) => {
    const operatorName = run.operator?.name || 'Unknown'
    
    if (!acc[operatorName]) {
      acc[operatorName] = {
        name: operatorName,
        runs: 0,
        totalPieces: 0,
        totalGood: 0,
        totalEfficiency: 0,
        totalActualMinutes: 0,
        totalStandardMinutes: 0,
        operations: new Set()
      }
    }

    const pieces = run.qtyGood + run.qtyDefects + run.qtyRejects
    acc[operatorName].runs += 1
    acc[operatorName].totalPieces += pieces
    acc[operatorName].totalGood += run.qtyGood
    acc[operatorName].totalActualMinutes += run.actualMinutes || 0
    acc[operatorName].totalStandardMinutes += (run.operation?.standardMinutes || 0) * pieces
    acc[operatorName].operations.add(run.operationName)
    
    if (run.efficiency) acc[operatorName].totalEfficiency += run.efficiency

    return acc
  }, {} as any)

  return Object.values(operatorStats)
    .map((stats: any) => ({
      name: stats.name,
      runs: stats.runs,
      totalPieces: stats.totalPieces,
      avgEfficiency: stats.runs > 0 ? Math.round((stats.totalEfficiency / stats.runs) * 10) / 10 : 0,
      avgQuality: stats.totalPieces > 0 ? Math.round((stats.totalGood / stats.totalPieces) * 1000) / 10 : 0,
      piecesPerHour: stats.totalActualMinutes > 0 ? Math.round((stats.totalPieces / (stats.totalActualMinutes / 60)) * 10) / 10 : 0,
      versatility: stats.operations.size,
      hoursWorked: Math.round((stats.totalActualMinutes / 60) * 10) / 10
    }))
    .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
}

function calculateOperationAnalysis(runs: any[]) {
  const operationStats = runs.reduce((acc, run) => {
    const operationName = run.operationName
    
    if (!acc[operationName]) {
      acc[operationName] = {
        name: operationName,
        category: run.operation?.category || 'Unknown',
        difficulty: run.operation?.difficulty || 'Medium',
        runs: 0,
        totalPieces: 0,
        totalGood: 0,
        totalEfficiency: 0,
        totalActualMinutes: 0,
        operators: new Set()
      }
    }

    const pieces = run.qtyGood + run.qtyDefects + run.qtyRejects
    acc[operationName].runs += 1
    acc[operationName].totalPieces += pieces
    acc[operationName].totalGood += run.qtyGood
    acc[operationName].totalActualMinutes += run.actualMinutes || 0
    acc[operationName].operators.add(run.operator?.name)
    
    if (run.efficiency) acc[operationName].totalEfficiency += run.efficiency

    return acc
  }, {} as any)

  return Object.values(operationStats)
    .map((stats: any) => ({
      name: stats.name,
      category: stats.category,
      difficulty: stats.difficulty,
      runs: stats.runs,
      totalPieces: stats.totalPieces,
      avgEfficiency: stats.runs > 0 ? Math.round((stats.totalEfficiency / stats.runs) * 10) / 10 : 0,
      avgQuality: stats.totalPieces > 0 ? Math.round((stats.totalGood / stats.totalPieces) * 1000) / 10 : 0,
      operatorCount: stats.operators.size,
      hoursSpent: Math.round((stats.totalActualMinutes / 60) * 10) / 10
    }))
    .sort((a, b) => b.totalPieces - a.totalPieces)
}

function calculateQualityMetrics(runs: any[]) {
  if (runs.length === 0) return null

  const totalPieces = runs.reduce((sum, run) => sum + (run.qtyGood + run.qtyDefects + run.qtyRejects), 0)
  const totalGood = runs.reduce((sum, run) => sum + run.qtyGood, 0)
  const totalDefects = runs.reduce((sum, run) => sum + run.qtyDefects, 0)
  const totalRejects = runs.reduce((sum, run) => sum + run.qtyRejects, 0)

  // Calculate quality by operation category
  const categoryQuality = runs.reduce((acc, run) => {
    const category = run.operation?.category || 'Unknown'
    const pieces = run.qtyGood + run.qtyDefects + run.qtyRejects
    
    if (!acc[category]) {
      acc[category] = { good: 0, total: 0, defects: 0, rejects: 0 }
    }
    
    acc[category].good += run.qtyGood
    acc[category].total += pieces
    acc[category].defects += run.qtyDefects
    acc[category].rejects += run.qtyRejects
    
    return acc
  }, {} as any)

  const categoryStats = Object.entries(categoryQuality).map(([category, stats]: [string, any]) => ({
    category,
    qualityRate: stats.total > 0 ? Math.round((stats.good / stats.total) * 1000) / 10 : 0,
    defectRate: stats.total > 0 ? Math.round((stats.defects / stats.total) * 1000) / 10 : 0,
    rejectRate: stats.total > 0 ? Math.round((stats.rejects / stats.total) * 1000) / 10 : 0,
    totalPieces: stats.total
  }))

  return {
    overall: {
      qualityRate: totalPieces > 0 ? Math.round((totalGood / totalPieces) * 1000) / 10 : 0,
      defectRate: totalPieces > 0 ? Math.round((totalDefects / totalPieces) * 1000) / 10 : 0,
      rejectRate: totalPieces > 0 ? Math.round((totalRejects / totalPieces) * 1000) / 10 : 0
    },
    byCategory: categoryStats.sort((a, b) => b.totalPieces - a.totalPieces)
  }
}

function calculateEfficiencyTrends(runs: any[], period: string) {
  // Group runs by day to show efficiency trends
  const dayGroups = runs.reduce((acc, run) => {
    if (run.endedAt && run.efficiency) {
      const day = new Date(run.endedAt).toDateString()
      if (!acc[day]) {
        acc[day] = { efficiencies: [], date: day }
      }
      acc[day].efficiencies.push(run.efficiency)
    }
    return acc
  }, {} as any)

  return Object.values(dayGroups)
    .map((group: any) => ({
      date: group.date,
      avgEfficiency: group.efficiencies.length > 0 
        ? Math.round((group.efficiencies.reduce((sum: number, eff: number) => sum + eff, 0) / group.efficiencies.length) * 10) / 10
        : 0,
      runs: group.efficiencies.length
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}