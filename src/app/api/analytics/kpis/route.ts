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
    const _category = searchParams.get("category")
    const active = searchParams.get("active")
    const _period = searchParams.get("period")
    const _periodType = searchParams.get("periodType")
    
    const where: { isActive?: boolean } = {}
    
    if (active !== null) {
      where.is_active = active === "true"
    }

    // Fetch KPI metrics - remove non-existent relations
    const kpis = await prisma.kPIMetric.findMany({
      where,
      orderBy: [
        { name: "asc" }
      ]
    })

    // Calculate current performance vs target
    const enrichedKpis = kpis.map(kpi => {
      const currentValue = kpi.current_value || 0
      const targetValue = kpi.target_value || 0
      
      const targetAchievement = targetValue !== 0 ? 
        (currentValue / targetValue) * 100 : 0

      return {
        ...kpi,
        currentValue,
        targetValue,
        targetAchievement: Math.round(targetAchievement * 100) / 100,
        isOnTarget: targetValue === 0 || Math.abs(currentValue - targetValue) <= (targetValue * 0.05), // 5% tolerance
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedKpis
    })

  } catch (_error) {
    console.error("Error fetching KPIs:", _error)
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
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      name,
      metric_type,
      unit,
      target_value
    } = body

    if (!name || !metric_type || !unit) {
      return NextResponse.json(
        { success: false, error: "Name, metric_type, and unit are required" },
        { status: 400 }
      )
    }

    // Check if KPI name already exists
    const existingKPI = await prisma.kPIMetric.findFirst({
      where: { name }
    })

    if (existingKPI) {
      return NextResponse.json(
        { success: false, error: "KPI with this name already exists" },
        { status: 409 }
      )
    }

    const kpi = await prisma.kPIMetric.create({
      data: {
        name,
        metric_type,
        unit,
        target_value: target_value || null,
        workspace_id: "default-workspace"
      }
    })

    return NextResponse.json({
      success: true,
      data: kpi
    })

  } catch (_error) {
    console.error("Error creating KPI:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create KPI" },
      { status: 500 }
    )
  }
}