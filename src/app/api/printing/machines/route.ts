import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// GET /api/printing/machines - Get printing machines
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workcenter = searchParams.get('workcenter')
    const isActive = searchParams.get('isActive')
    const includeStats = searchParams.get('includeStats') === 'true'

    // Build where clause
    const where: any = {}
    
    if (workcenter) {
      where.workcenter = workcenter
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const machines = await prisma.machine.findMany({
      where,
      include: {
        printRuns: includeStats ? {
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            outputs: true
          }
        } : false,
        maintenanceRecords: includeStats ? {
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { created_at: 'desc' },
          take: 5
        } : false,
        downtime: includeStats ? {
          where: {
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { startTime: 'desc' },
          take: 10
        } : false
      },
      orderBy: [
        { isActive: 'desc' },
        { workcenter: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform for API response with optional stats
    const transformedMachines = machines.map(machine => {
      const baseData = {
        id: machine.id,
        name: machine.name,
        workcenter: machine.workcenter,
        spec: machine.spec,
        isActive: machine.isActive,
        created_at: machine.createdAt
      }

      if (!includeStats || !machine.printRuns) {
        return baseData
      }

      // Calculate machine statistics
      const printRuns = machine.printRuns || []
      const totalRuns = printRuns.length
      const completedRuns = printRuns.filter(run => run.status === 'DONE').length
      
      const totalProduced = printRuns.reduce((sum, run) => {
        return sum + (run.outputs?.reduce((outputSum, output) => outputSum + (output.qtyGood || 0), 0) || 0)
      }, 0)

      const totalRejects = printRuns.reduce((sum, run) => {
        return sum + (run.outputs?.reduce((outputSum, output) => outputSum + (output.qtyReject || 0), 0) || 0)
      }, 0)

      const utilization = calculateMachineUtilization(printRuns)
      const qualityRate = (totalProduced + totalRejects) > 0 ? (totalProduced / (totalProduced + totalRejects)) * 100 : 0

      // Recent maintenance and downtime
      const recentMaintenance = machine.maintenanceRecords?.length || 0
      const recentDowntime = machine.downtime?.length || 0
      const totalDowntimeHours = machine.downtime?.reduce((sum, dt) => {
        if (dt.endTime) {
          return sum + ((new Date(dt.endTime).getTime() - new Date(dt.startTime).getTime()) / (1000 * 60 * 60))
        }
        return sum
      }, 0) || 0

      return {
        ...baseData,
        stats: {
          totalRuns,
          completedRuns,
          totalProduced,
          totalRejects,
          qualityRate: Math.round(qualityRate * 10) / 10,
          utilization: Math.round(utilization * 10) / 10,
          recentMaintenance,
          recentDowntime,
          totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10
        }
      }
    })

    // Summary statistics for the workcenter
    const summary = includeStats ? {
      totalMachines: machines.length,
      activeMachines: machines.filter(m => m.isActive).length,
      inactiveMachines: machines.filter(m => !m.isActive).length,
      workcenters: [...new Set(machines.map(m => m.workcenter))]
    } : null

    return NextResponse.json({ 
      machines: transformedMachines,
      summary
    })

  } catch (_error) {
    console.error('Error fetching machines:', _error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/printing/machines - Create new machine
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only admins and managers
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'workcenter']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        fields: missingFields 
      }, { status: 400 })
    }

    // Validate workcenter
    const validWorkcenters = ['PRINTING', 'HEAT_PRESS', 'EMBROIDERY', 'DRYER', 'CUTTING']
    if (!validWorkcenters.includes(body.workcenter)) {
      return NextResponse.json({ 
        error: `Invalid workcenter. Valid options: ${validWorkcenters.join(', ')}` 
      }, { status: 400 })
    }

    // Check for duplicate machine names in the same workcenter
    const existingMachine = await prisma.machine.findFirst({
      where: {
        name: body.name,
        workcenter: body.workcenter
      }
    })

    if (existingMachine) {
      return NextResponse.json({ 
        error: `Machine named '${body.name}' already exists in ${body.workcenter}` 
      }, { status: 409 })
    }

    // Create machine
    const machine = await prisma.machine.create({
      data: {
        workspaceId: 'default', // You might want to get this from session/tenant context
        name: body.name,
        workcenter: body.workcenter,
        spec: body.spec || {},
        isActive: body.isActive !== false // Default to true
      }
    })

    // Create event log for Ashley AI
    await prisma.eventLog.create({
      data: {
        eventType: 'machine.created',
        entityType: 'machine',
        entityId: machine.id,
        payload: {
          machineName: machine.name,
          workcenter: machine.workcenter,
          spec: machine.spec,
          created_by: session.user.name
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_MACHINE',
        entityType: 'Machine',
        entityId: machine.id,
        details: `Created machine '${machine.name}' for ${machine.workcenter}`,
        metadata: {
          workcenter: machine.workcenter,
          spec: machine.spec
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Machine '${machine.name}' created successfully`,
      machine: {
        id: machine.id,
        name: machine.name,
        workcenter: machine.workcenter,
        isActive: machine.isActive,
        spec: machine.spec
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating machine:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to calculate machine utilization
function calculateMachineUtilization(printRuns: any[]): number {
  if (printRuns.length === 0) return 0

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const totalAvailableHours = 30 * 24 // 30 days * 24 hours (assuming 24/7 availability)
  
  const totalUsedHours = printRuns.reduce((sum, run) => {
    if (run.startedAt && run.endedAt) {
      const hours = (new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / (1000 * 60 * 60)
      return sum + hours
    }
    return sum
  }, 0)

  return Math.min((totalUsedHours / totalAvailableHours) * 100, 100)
}