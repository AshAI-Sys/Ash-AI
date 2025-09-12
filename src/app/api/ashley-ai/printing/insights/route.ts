// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/ashley-ai/printing/insights - Get Ashley AI printing insights and recommendations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d' // 7d, 30d, 90d
    const method = searchParams.get('method') // Optional filter by method
    const machineId = searchParams.get('machineId') // Optional filter by machine

    // Calculate date range
    const daysBack = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Build where clause for print runs
    const where: { created_at: { gte: Date }; method?: string; machineId?: string } = {
      created_at: { gte: startDate }
    }
    
    if (method) where.method = method
    if (machineId) where.machineId = machineId

    // Fetch print runs with related data
    const printRuns = await prisma.printRun.findMany({
      where,
      include: {
        outputs: true,
        rejects: true,
        materials: {
          include: {
            item: {
              select: { name: true, category: true }
            }
          }
        },
        machine: {
          select: { name: true, workcenter: true }
        },
        order: {
          select: { orderNumber: true, brand: { select: { name: true } } }
        }
      }
    })

    // Calculate comprehensive metrics
    const insights = await calculatePrintingInsights(printRuns)
    
    // Generate AI recommendations
    const recommendations = generateAIRecommendations(insights, printRuns)
    
    // Generate alerts for immediate attention
    const alerts = generatePrintingAlerts(insights, printRuns)

    return NextResponse.json({
      success: true,
      timeframe,
      insights,
      recommendations,
      alerts,
      summary: {
        totalRuns: printRuns.length,
        completedRuns: printRuns.filter(r => r.status === 'DONE').length,
        averageQuality: insights.overallQualityRate,
        topPerformingMethod: insights.methodPerformance[0]?.method || 'N/A'
      }
    })

  } catch (_error) {
    console.error('Error generating Ashley AI printing insights:', _error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function calculatePrintingInsights(printRuns: any[]) {
  // Overall production metrics
  const totalGood = printRuns.reduce((sum, run) => 
    sum + run.outputs.reduce((outputSum: number, output: any) => outputSum + (output.qtyGood || 0), 0), 0
  )
  
  const totalReject = printRuns.reduce((sum, run) => 
    sum + run.outputs.reduce((outputSum: number, output: any) => outputSum + (output.qtyReject || 0), 0), 0
  )
  
  const totalProduced = totalGood + totalReject
  const overallQualityRate = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 0

  // Method performance analysis
  const methodStats: { [key: string]: any } = {}
  
  printRuns.forEach(run => {
    if (!methodStats[run.method]) {
      methodStats[run.method] = {
        method: run.method,
        totalRuns: 0,
        completedRuns: 0,
        totalGood: 0,
        totalReject: 0,
        totalDuration: 0,
        materialCost: 0
      }
    }
    
    const stats = methodStats[run.method]
    stats.totalRuns++
    
    if (run.status === 'DONE') {
      stats.completedRuns++
      
      if (run.startedAt && run.endedAt) {
        const duration = (new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / (1000 * 60 * 60)
        stats.totalDuration += duration
      }
    }
    
    stats.totalGood += run.outputs.reduce((sum: number, output: any) => sum + (output.qtyGood || 0), 0)
    stats.totalReject += run.outputs.reduce((sum: number, output: any) => sum + (output.qtyReject || 0), 0)
    
    // Estimate material cost (simplified)
    stats.materialCost += run.materials.reduce((sum: number, material: any) => {
      const baseCost = material.item?.category === 'Inks' ? 0.05 : 
                     material.item?.category === 'Papers' ? 0.10 :
                     material.item?.category === 'Powders' ? 0.08 : 0.03
      return sum + (material.qty * baseCost)
    }, 0)
  })

  // Convert to array and calculate derived metrics
  const methodPerformance = Object.values(methodStats).map((stats: any) => {
    const totalProduced = stats.totalGood + stats.totalReject
    const qualityRate = totalProduced > 0 ? (stats.totalGood / totalProduced) * 100 : 0
    const averageDuration = stats.completedRuns > 0 ? stats.totalDuration / stats.completedRuns : 0
    const efficiency = stats.totalRuns > 0 ? (stats.completedRuns / stats.totalRuns) * 100 : 0
    
    return {
      ...stats,
      qualityRate: Math.round(qualityRate * 10) / 10,
      averageDuration: Math.round(averageDuration * 10) / 10,
      efficiency: Math.round(efficiency * 10) / 10,
      costPerPiece: stats.totalGood > 0 ? stats.materialCost / stats.totalGood : 0
    }
  }).sort((a, b) => b.qualityRate - a.qualityRate)

  // Machine performance analysis
  const machineStats: { [key: string]: any } = {}
  
  printRuns.forEach(run => {
    if (run.machine) {
      if (!machineStats[run.machine.id]) {
        machineStats[run.machine.id] = {
          machineId: run.machine.id,
          machineName: run.machine.name,
          workcenter: run.machine.workcenter,
          totalRuns: 0,
          completedRuns: 0,
          totalGood: 0,
          totalReject: 0,
          downtime: 0
        }
      }
      
      const stats = machineStats[run.machine.id]
      stats.totalRuns++
      if (run.status === 'DONE') stats.completedRuns++
      stats.totalGood += run.outputs.reduce((sum: number, output: any) => sum + (output.qtyGood || 0), 0)
      stats.totalReject += run.outputs.reduce((sum: number, output: any) => sum + (output.qtyReject || 0), 0)
    }
  })

  const machinePerformance = Object.values(machineStats).map((stats: any) => {
    const totalProduced = stats.totalGood + stats.totalReject
    const qualityRate = totalProduced > 0 ? (stats.totalGood / totalProduced) * 100 : 0
    const utilization = stats.totalRuns > 0 ? (stats.completedRuns / stats.totalRuns) * 100 : 0
    
    return {
      ...stats,
      qualityRate: Math.round(qualityRate * 10) / 10,
      utilization: Math.round(utilization * 10) / 10
    }
  }).sort((a, b) => b.qualityRate - a.qualityRate)

  // Reject analysis
  const rejectStats: { [key: string]: any } = {}
  
  printRuns.forEach(run => {
    run.rejects.forEach((reject: any) => {
      if (!rejectStats[reject.reasonCode]) {
        rejectStats[reject.reasonCode] = {
          reasonCode: reject.reasonCode,
          total_qty: 0,
          occurrences: 0,
          methods: new Set(),
          costAttribution: {}
        }
      }
      
      const stats = rejectStats[reject.reasonCode]
      stats.total_qty += reject.qty
      stats.occurrences++
      stats.methods.add(run.method)
      
      if (!stats.costAttribution[reject.costAttribution]) {
        stats.costAttribution[reject.costAttribution] = 0
      }
      stats.costAttribution[reject.costAttribution] += reject.qty
    })
  })

  const rejectAnalysis = Object.values(rejectStats).map((stats: any) => ({
    ...stats,
    methods: Array.from(stats.methods),
    averageQtyPerOccurrence: stats.occurrences > 0 ? stats.total_qty / stats.occurrences : 0,
    primaryCostAttribution: Object.keys(stats.costAttribution).reduce((a, b) => 
      stats.costAttribution[a] > stats.costAttribution[b] ? a : b, 'UNKNOWN')
  })).sort((a, b) => b.total_qty - a.total_qty)

  return {
    overallQualityRate: Math.round(overallQualityRate * 10) / 10,
    totalProduced,
    totalGood,
    totalReject,
    methodPerformance,
    machinePerformance,
    rejectAnalysis: rejectAnalysis.slice(0, 10), // Top 10 reject reasons
    productivity: {
      runsPerDay: printRuns.length / 7,
      averagePiecesPerRun: printRuns.length > 0 ? totalProduced / printRuns.length : 0,
      completionRate: printRuns.length > 0 ? (printRuns.filter(r => r.status === 'DONE').length / printRuns.length) * 100 : 0
    }
  }
}

function generateAIRecommendations(insights: any, printRuns: any[]) {
  const recommendations = []

  // Quality recommendations
  if (insights.overallQualityRate < 85) {
    recommendations.push({
      type: 'QUALITY_IMPROVEMENT',
      priority: 'HIGH',
      title: 'Improve Overall Quality Rate',
      description: `Current quality rate is ${insights.overallQualityRate}%. Target should be >90%.`,
      actions: [
        'Review top reject reasons and implement corrective actions',
        'Increase QC checkpoints during production',
        'Provide additional operator training',
        'Review machine maintenance schedules'
      ],
      expectedImpact: '5-15% quality improvement'
    })
  }

  // Method-specific recommendations
  insights.methodPerformance.forEach((method: any) => {
    if (method.qualityRate < 80) {
      recommendations.push({
        type: 'METHOD_OPTIMIZATION',
        priority: method.qualityRate < 70 ? 'HIGH' : 'MEDIUM',
        title: `Optimize ${method.method} Process`,
        description: `${method.method} quality rate is ${method.qualityRate}%, below acceptable threshold.`,
        actions: getMethodSpecificActions(method.method),
        expectedImpact: '10-20% quality improvement for ' + method.method
      })
    }
    
    if (method.efficiency < 80) {
      recommendations.push({
        type: 'EFFICIENCY_IMPROVEMENT',
        priority: 'MEDIUM',
        title: `Improve ${method.method} Efficiency`,
        description: `${method.method} completion rate is ${method.efficiency}%. Consider process optimization.`,
        actions: [
          'Analyze common causes of incomplete runs',
          'Optimize setup and changeover times',
          'Review workflow and material preparation',
          'Consider additional operator training'
        ],
        expectedImpact: '15-25% efficiency improvement'
      })
    }
  })

  // Material optimization
  const highCostMethods = insights.methodPerformance.filter((m: any) => m.costPerPiece > 0.5)
  if (highCostMethods.length > 0) {
    recommendations.push({
      type: 'COST_OPTIMIZATION',
      priority: 'MEDIUM',
      title: 'Optimize Material Costs',
      description: `High material costs detected in ${highCostMethods.map((m: any) => m.method).join(', ')}.`,
      actions: [
        'Review material usage patterns and waste',
        'Negotiate better rates with suppliers',
        'Implement just-in-time material management',
        'Consider alternative materials with better cost-performance'
      ],
      expectedImpact: '10-30% material cost reduction'
    })
  }

  // Machine utilization
  const underutilizedMachines = insights.machinePerformance.filter((m: any) => m.utilization < 60)
  if (underutilizedMachines.length > 0) {
    recommendations.push({
      type: 'UTILIZATION_IMPROVEMENT',
      priority: 'LOW',
      title: 'Improve Machine Utilization',
      description: `${underutilizedMachines.length} machines have utilization below 60%.`,
      actions: [
        'Review production scheduling and bottlenecks',
        'Consider cross-training operators for multiple machines',
        'Optimize job batching and sequencing',
        'Evaluate machine capacity vs demand'
      ],
      expectedImpact: '20-40% utilization improvement'
    })
  }

  return recommendations.slice(0, 8) // Top 8 recommendations
}

function generatePrintingAlerts(insights: any, printRuns: any[]) {
  const alerts = []
  const now = new Date()

  // High reject rate alert
  if (insights.overallQualityRate < 70) {
    alerts.push({
      type: 'QUALITY_ALERT',
      severity: 'HIGH',
      title: 'Critical Quality Issue',
      message: `Overall quality rate has dropped to ${insights.overallQualityRate}%. Immediate attention required.`,
      timestamp: now,
      actionRequired: true
    })
  }

  // Long-running jobs
  const longRunningJobs = printRuns.filter(run => 
    run.status === 'IN_PROGRESS' && 
    run.startedAt && 
    (new Date(now).getTime() - new Date(run.startedAt).getTime()) > 8 * 60 * 60 * 1000 // 8 hours
  )
  
  if (longRunningJobs.length > 0) {
    alerts.push({
      type: 'PRODUCTION_ALERT',
      severity: 'MEDIUM',
      title: 'Long-Running Print Jobs',
      message: `${longRunningJobs.length} print jobs have been running for over 8 hours.`,
      timestamp: now,
      actionRequired: true,
      data: longRunningJobs.map(job => ({ id: job.id, orderNumber: job.order?.orderNumber }))
    })
  }

  // Frequent reject reasons
  const frequentRejects = insights.rejectAnalysis.filter((reject: any) => reject.occurrences > 5)
  if (frequentRejects.length > 0) {
    alerts.push({
      type: 'QUALITY_TREND',
      severity: 'MEDIUM',
      title: 'Recurring Quality Issues',
      message: `${frequentRejects[0].reasonCode} has occurred ${frequentRejects[0].occurrences} times recently.`,
      timestamp: now,
      actionRequired: false,
      data: frequentRejects[0]
    })
  }

  return alerts
}

function getMethodSpecificActions(method: string): string[] {
  switch (method) {
    case 'SILKSCREEN':
      return [
        'Check screen mesh tension and registration',
        'Verify ink viscosity and cure temperature',
        'Review squeegee pressure and angle settings',
        'Ensure proper substrate preparation'
      ]
    case 'SUBLIMATION':
      return [
        'Verify heat press temperature and pressure settings',
        'Check paper quality and storage conditions',
        'Ensure polyester content is adequate (>65%)',
        'Review color profile and printer calibration'
      ]
    case 'DTF':
      return [
        'Optimize powder application and shake-off',
        'Check heat press time, temperature, and pressure',
        'Review film quality and storage conditions',
        'Ensure proper garment pre-treatment'
      ]
    case 'EMBROIDERY':
      return [
        'Check thread tension and needle condition',
        'Review digitizing quality and stitch density',
        'Ensure proper hooping and fabric stabilization',
        'Optimize machine speed for fabric type'
      ]
    default:
      return ['Review process parameters and quality standards']
  }
}