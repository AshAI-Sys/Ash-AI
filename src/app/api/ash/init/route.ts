/**
 * ASH AI System Initialization API
 * Initialize the system with sample data and configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { initializeSystem } from '@/lib/ash/init-system'

/**
 * POST /api/ash/init - Initialize ASH AI system
 * Only accessible by ADMIN users
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN users can initialize the system
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const workspace_id = body.workspace_id || 'default'

    console.log(`🎯 Admin ${session.user.full_name} (${session.user.email}) is initializing ASH AI system for workspace: ${workspace_id}`)

    // Run the initialization
    const _result = await initializeAshSystem(workspace_id)

    return NextResponse.json({
      success: true,
      message: '🚀 ASH AI System initialized successfully!',
      details: {
        workspace_id,
        initialized_by: session.user.full_name,
        timestamp: new Date().toISOString(),
        components: [
          '✅ Default brands (Sorbetes Apparel, Reefer Brand)',
          '✅ Sample clients (Clark Safari, TechHub, Barangay San Antonio)', 
          '✅ Routing templates (All production methods)',
          '✅ AI optimization settings',
          '✅ Capacity limits and thresholds'
        ]
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('❌ ASH AI System initialization failed:', _error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize ASH AI system',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/ash/init - Check system initialization status
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if system is initialized by looking for default data
    const { prisma } = await import('@/lib/db')
    
    const [brandCount, clientCount, templateCount] = await Promise.all([
      prisma.brand.count(),
      prisma.client.count(),
      prisma.routeTemplate.count()
    ])

    const isInitialized = brandCount > 0 && clientCount > 0 && templateCount > 0

    return NextResponse.json({
      initialized: isInitialized,
      system_status: isInitialized ? '✅ Ready' : '⚠️ Needs initialization',
      data_summary: {
        brands: brandCount,
        clients: clientCount,
        routing_templates: templateCount
      },
      recommendations: isInitialized 
        ? ['System is ready for production use']
        : ['Run POST /api/ash/init to initialize the system', 'Ensure you have ADMIN privileges']
    })

  } catch (_error) {
    console.error('Error checking system status:', _error)
    
    return NextResponse.json({
      error: 'Failed to check system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}