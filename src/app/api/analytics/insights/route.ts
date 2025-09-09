import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const impact = searchParams.get("impact")
    const status = searchParams.get("status")
    const assignedTo = searchParams.get("assigned_to")
    
    const where: {
      category?: string
      type?: string
      assigned_to?: string
      status?: string
      created_at?: { gte: Date; lte: Date }
    } = {}
    
    if (category) {
      where.category = category
    }
    
    if (status) {
      where.status = status
    }
    
    if (assignedTo) {
      where.assigned_to = assignedTo
    }

    const insights = await prisma.businessInsight.findMany({
      where: {
        workspace_id: "workspace-1",
        ...where
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { status: "asc" },
        { created_at: "desc" }
      ]
    })

    // Generate AI-powered insights (mock implementation)
    const aiInsights = await generateAIInsights()

    return NextResponse.json({
      success: true,
      data: {
        insights,
        aiGenerated: aiInsights,
        summary: {
          total: insights.length,
          highImpact: insights.filter(i => i.impact === "HIGH").length,
          unassigned: insights.filter(i => !i.assigned_to).length,
          new: insights.filter(i => i.status === "NEW").length
        }
      }
    })

  } catch (_error) {
    console.error("Error fetching insights:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch insights" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Authorization check - admin/manager only
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      type,
      title,
      category,
      description,
      impact,
      confidence,
      dataSource,
      evidence,
      recommendation,
      assignedTo
    } = body

    if (!title || !category || !description || !impact || !dataSource) {
      return NextResponse.json(
        { success: false, error: "Title, category, description, impact, and data source are required" },
        { status: 400 }
      )
    }

    if (confidence && (confidence < 0 || confidence > 1)) {
      return NextResponse.json(
        { success: false, error: "Confidence must be between 0 and 1" },
        { status: 400 }
      )
    }

    const insight = await prisma.businessInsight.create({
      data: {
        type,
        title,
        description,
        impact,
        assigned_to: assignedTo,
        workspace_id: "default-workspace"
      }
    })

    return NextResponse.json({
      success: true,
      data: insight
    })

  } catch (_error) {
    console.error("Error creating insight:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create insight" },
      { status: 500 }
    )
  }
}

// AI-powered insights generation (mock implementation)
async function generateAIInsights() {
  try {
    // In a real implementation, this would use ML models to analyze patterns
    // and generate insights from historical data
    
    // Mock insights based on common business patterns
    const mockInsights = [
      {
        id: "ai_001",
        title: "Production Efficiency Opportunity",
        category: "OPPORTUNITY",
        description: "Stage 4 (Printing) shows 15% higher efficiency on Wednesdays. Consider scheduling high-priority orders midweek.",
        impact: "MEDIUM",
        confidence: 0.87,
        dataSource: "Production Analytics Engine",
        evidence: {
          averageEfficiencyWednesday: 94.2,
          averageEfficiencyOtherDays: 81.5,
          sampleSize: 120,
          timeframe: "Last 8 weeks"
        },
        recommendation: "Reschedule 2-3 high-priority orders per week to Wednesdays to improve overall throughput.",
        potentialImpact: "8-12% improvement in printing stage efficiency"
      },
      {
        id: "ai_002",
        title: "Inventory Risk Alert",
        category: "RISK",
        description: "DTF film inventory trending toward stockout in 18-22 days based on current consumption patterns.",
        impact: "HIGH",
        confidence: 0.92,
        dataSource: "Predictive Inventory Model",
        evidence: {
          currentStock: 847,
          dailyConsumptionAverage: 41.2,
          consumptionTrend: "increasing",
          leadTime: "14-21 days"
        },
        recommendation: "Place urgent purchase order for DTF film (minimum 2000 units) within next 3 days.",
        potentialImpact: "Prevent production delays affecting 8-12 orders"
      },
      {
        id: "ai_003",
        title: "Quality Pattern Detected",
        category: "TREND",
        description: "Screen printing reject rate decreased 24% after implementing Monday morning equipment calibration routine.",
        impact: "MEDIUM",
        confidence: 0.79,
        dataSource: "Quality Analytics Model",
        evidence: {
          rejectRateBeforeCalibration: 3.8,
          rejectRateAfterCalibration: 2.9,
          implementationDate: "2024-01-15",
          ordersAnalyzed: 156
        },
        recommendation: "Standardize Monday calibration routine across all printing equipment and track results.",
        potentialImpact: "Potential 20-25% reduction in overall print reject rate"
      }
    ]

    return mockInsights

  } catch (_error) {
    console.error("Error generating AI insights:", _error)
    return []
  }
}