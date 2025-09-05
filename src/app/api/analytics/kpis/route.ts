import { NextRequest, NextResponse } from "next/server"
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
    const active = searchParams.get("active")
    const period = searchParams.get("period")
    const periodType = searchParams.get("periodType")
    
    const where: { category?: string; isActive?: boolean } = {}
    
    if (category) {
      where.category = category
    }
    
    if (active !== null) {
      where.isActive = active === "true"
    }

    // Fetch KPI metrics with latest data points
    const kpis = await prisma.kPIMetric.findMany({
      where,
      include: {
        dataPoints: {
          where: period && periodType ? {
            period: period,
            periodType: periodType
          } : {},
          orderBy: {
            createdAt: "desc"
          },
          take: periodType ? (periodType === "DAILY" ? 30 : periodType === "WEEKLY" ? 12 : 6) : 5
        },
        alerts: {
          where: {
            isActive: true
          },
          include: {
            notifications: {
              where: {
                isResolved: false
              },
              orderBy: {
                triggeredAt: "desc"
              }
            }
          }
        },
        _count: {
          select: {
            dataPoints: true,
            alerts: true
          }
        }
      },
      orderBy: [
        { category: "asc" },
        { displayOrder: "asc" },
        { name: "asc" }
      ]
    })

    // Calculate current performance vs target
    const enrichedKpis = kpis.map(kpi => {
      const latestDataPoint = kpi.dataPoints[0]
      const previousDataPoint = kpi.dataPoints[1]
      
      const currentValue = latestDataPoint?.value || 0
      const previousValue = previousDataPoint?.value || 0
      const targetValue = kpi.targetValue || 0
      
      const trend = currentValue > previousValue ? "up" : 
                   currentValue < previousValue ? "down" : "stable"
      
      const percentageChange = previousValue !== 0 ? 
        ((currentValue - previousValue) / previousValue) * 100 : 0
        
      const targetAchievement = targetValue !== 0 ? 
        (currentValue / targetValue) * 100 : 0

      return {
        ...kpi,
        currentValue,
        previousValue,
        trend,
        percentageChange: Math.round(percentageChange * 100) / 100,
        targetAchievement: Math.round(targetAchievement * 100) / 100,
        isOnTarget: targetValue === 0 || Math.abs(currentValue - targetValue) <= (targetValue * 0.05), // 5% tolerance
        activeAlerts: kpi.alerts.filter(alert => 
          alert.notifications.some(n => !n.isResolved)
        ).length
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedKpis
    })

  } catch (error) {
    console.error("Error fetching KPIs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch KPIs" },
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
    if (![Role.ADMIN, Role.MANAGER].includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      name,
      category,
      description,
      unit,
      targetValue,
      formula
    } = body

    if (!name || !category || !unit) {
      return NextResponse.json(
        { success: false, error: "Name, category, and unit are required" },
        { status: 400 }
      )
    }

    // Check if KPI name already exists
    const existingKPI = await prisma.kPIMetric.findUnique({
      where: { name }
    })

    if (existingKPI) {
      return NextResponse.json(
        { success: false, error: "KPI with this name already exists" },
        { status: 409 }
      )
    }

    // Get next display order
    const lastKPI = await prisma.kPIMetric.findFirst({
      where: { category },
      orderBy: { displayOrder: "desc" }
    })

    const kpi = await prisma.kPIMetric.create({
      data: {
        name,
        category,
        description,
        unit,
        targetValue: targetValue || null,
        formula: formula || null,
        displayOrder: (lastKPI?.displayOrder || 0) + 1
      }
    })

    return NextResponse.json({
      success: true,
      data: kpi
    })

  } catch (error) {
    console.error("Error creating KPI:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create KPI" },
      { status: 500 }
    )
  }
}