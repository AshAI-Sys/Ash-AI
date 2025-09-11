import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import MachineMonitor from '@/lib/realtime/machine-monitor'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for machine access
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId')
    const performance = searchParams.get('performance') === 'true'

    const monitor = MachineMonitor.getInstance()

    if (machineId) {
      if (performance) {
        // Get machine performance metrics
        const performanceData = await monitor.getMachinePerformance(machineId)
        
        if (!performanceData) {
          return NextResponse.json(
            { error: 'Machine performance data not found' }, 
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            performance: performanceData,
            timestamp: new Date().toISOString()
          }
        })
      } else {
        // Get machine status
        const machineStatus = await monitor.getMachineStatus(machineId)
        
        if (!machineStatus) {
          return NextResponse.json(
            { error: 'Machine not found or not monitored' }, 
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            machine: machineStatus,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // Get all machine statuses
    const allMachines = await monitor.getAllMachineStatuses()
    
    return NextResponse.json({
      success: true,
      data: {
        machines: allMachines,
        count: allMachines.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in machines API:', error)
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

    // Check user role for machine control
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'OPERATOR'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, machineId, data } = body

    if (!machineId) {
      return NextResponse.json(
        { error: 'Machine ID is required' }, 
        { status: 400 }
      )
    }

    const monitor = MachineMonitor.getInstance()

    switch (action) {
      case 'set_status':
        const { status } = data
        if (!['maintenance', 'error', 'running', 'idle'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status. Must be: maintenance, error, running, or idle' }, 
            { status: 400 }
          )
        }
        
        await monitor.setMachineStatus(machineId, status)
        
        return NextResponse.json({
          success: true,
          message: `Machine ${machineId} status set to ${status}`,
          timestamp: new Date().toISOString()
        })

      case 'set_operator':
        const { operatorId } = data
        if (!operatorId) {
          return NextResponse.json(
            { error: 'Operator ID is required' }, 
            { status: 400 }
          )
        }
        
        await monitor.setMachineOperator(machineId, operatorId)
        
        return NextResponse.json({
          success: true,
          message: `Operator ${operatorId} assigned to machine ${machineId}`,
          timestamp: new Date().toISOString()
        })

      case 'schedule_maintenance':
        const { date } = data
        if (!date) {
          return NextResponse.json(
            { error: 'Maintenance date is required' }, 
            { status: 400 }
          )
        }
        
        const maintenanceDate = new Date(date)
        if (isNaN(maintenanceDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' }, 
            { status: 400 }
          )
        }
        
        await monitor.scheduleMaintenence(machineId, maintenanceDate)
        
        return NextResponse.json({
          success: true,
          message: `Maintenance scheduled for machine ${machineId} on ${maintenanceDate.toLocaleDateString()}`,
          timestamp: new Date().toISOString()
        })

      case 'start_monitoring':
        monitor.startMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'Machine monitoring started',
          timestamp: new Date().toISOString()
        })

      case 'stop_monitoring':
        monitor.stopMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'Machine monitoring stopped',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in machines POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}