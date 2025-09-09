import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visibility = searchParams.get("visibility")
    const userId = searchParams.get("userId")
    const userRole = searchParams.get("userRole")
    
    const where: {
      visibility?: string
      OR?: Array<{ visibility: string; created_by?: string }>
      created_by?: string
    } = {}
    
    // Filter by visibility and user permissions
    if (visibility) {
      where.visibility = visibility
    } else {
      // Default: get public dashboards and user's private dashboards
      where.OR = [
        { visibility: "PUBLIC" },
        { visibility: "PRIVATE", created_by: userId },
        { 
          visibility: "ROLE_BASED"
        }
      ]
    }

    const dashboards = await prisma.dashboard.findMany({
      where: { 
        workspace_id: "workspace-1",
        ...where 
      },
      orderBy: { 
        updated_at: "desc" 
      }
    })

    return NextResponse.json({
      success: true,
      data: dashboards
    })

  } catch (_error) {
    console.error("Error fetching dashboards:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboards" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      layout,
      visibility = "PRIVATE",
      allowedRoles = [],
      createdBy
    } = body

    if (!name || !createdBy) {
      return NextResponse.json(
        { success: false, error: "Name and creator are required" },
        { status: 400 }
      )
    }

    // Validate layout structure
    if (layout && typeof layout !== 'object') {
      return NextResponse.json(
        { success: false, error: "Layout must be a valid JSON object" },
        { status: 400 }
      )
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name,
        description,
        visibility,
        workspace_id: "workspace-1"
      }
    })

    return NextResponse.json({
      success: true,
      data: dashboard
    })

  } catch (_error) {
    console.error("Error creating dashboard:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create dashboard" },
      { status: 500 }
    )
  }
}