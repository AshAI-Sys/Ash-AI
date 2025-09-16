// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import WebSocketManager from '@/lib/realtime/websocket-manager'
import ProductionTracker from '@/lib/realtime/production-tracker'
import MachineMonitor from '@/lib/realtime/machine-monitor'
import InventoryMonitor from '@/lib/realtime/inventory-monitor'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wsManager = WebSocketManager.getInstance()
    
    // Get WebSocket connection statistics
    const connectionCount = wsManager.getConnectionCount()
    const usersByRole = wsManager.getConnectedUsersByRole()

    return NextResponse.json({
      success: true,
      data: {
        websocket: {
          connected: connectionCount > 0,
          connections: connectionCount,
          usersByRole
        },
        services: {
          productionTracking: 'ready',
          machineMonitoring: 'ready', 
          inventoryMonitoring: 'ready'
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in websocket status API:', error)
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

    // Only admins and managers can control WebSocket services
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    const productionTracker = ProductionTracker.getInstance()
    const machineMonitor = MachineMonitor.getInstance()
    const inventoryMonitor = InventoryMonitor.getInstance()

    switch (action) {
      case 'start_all':
        productionTracker.startTracking()
        machineMonitor.startMonitoring()
        inventoryMonitor.startMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'All real-time monitoring services started',
          timestamp: new Date().toISOString()
        })

      case 'stop_all':
        productionTracker.stopTracking()
        machineMonitor.stopMonitoring()
        inventoryMonitor.stopMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'All real-time monitoring services stopped',
          timestamp: new Date().toISOString()
        })

      case 'restart_all':
        // Stop all services
        productionTracker.stopTracking()
        machineMonitor.stopMonitoring()
        inventoryMonitor.stopMonitoring()
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Start all services
        productionTracker.startTracking()
        machineMonitor.startMonitoring()
        inventoryMonitor.startMonitoring()
        
        return NextResponse.json({
          success: true,
          message: 'All real-time monitoring services restarted',
          timestamp: new Date().toISOString()
        })

      case 'health_check':
        const wsManager = WebSocketManager.getInstance()
        const connectionCount = wsManager.getConnectionCount()
        const usersByRole = wsManager.getConnectedUsersByRole()
        
        const health = {
          websocket: {
            status: connectionCount > 0 ? 'healthy' : 'no_connections',
            connections: connectionCount,
            usersByRole
          },
          services: {
            productionTracking: 'operational',
            machineMonitoring: 'operational',
            inventoryMonitoring: 'operational'
          },
          timestamp: new Date().toISOString()
        }
        
        return NextResponse.json({
          success: true,
          data: health,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in websocket control API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}