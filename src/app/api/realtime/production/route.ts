import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import ProductionTracker from '@/lib/realtime/production-tracker'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const summary = searchParams.get('summary') === 'true'

    const tracker = ProductionTracker.getInstance()

    if (summary) {
      // Get production summary
      const productionSummary = await tracker.getProductionSummary()
      
      return NextResponse.json({
        success: true,
        data: {
          summary: productionSummary,
          timestamp: new Date().toISOString()
        }
      })
    }

    if (orderId) {
      // Get specific order metrics
      const orderMetrics = await tracker.getOrderMetrics(orderId)
      
      if (!orderMetrics) {
        return NextResponse.json(
          { error: 'Order not found or not in production' }, 
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          order: orderMetrics,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Get all active production data
    const allOrders = []
    // In a real implementation, we'd have a method to get all cached metrics
    
    return NextResponse.json({
      success: true,
      data: {
        orders: allOrders,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in production API:', error)
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

    const body = await request.json()
    const { action, orderId, data } = body

    const tracker = ProductionTracker.getInstance()

    switch (action) {
      case 'force_update':
        if (!orderId) {
          return NextResponse.json(
            { error: 'Order ID required for force update' }, 
            { status: 400 }
          )
        }
        
        await tracker.forceProductionUpdate(orderId)
        
        return NextResponse.json({
          success: true,
          message: `Production update forced for order ${orderId}`,
          timestamp: new Date().toISOString()
        })

      case 'start_tracking':
        tracker.startTracking()
        
        return NextResponse.json({
          success: true,
          message: 'Production tracking started',
          timestamp: new Date().toISOString()
        })

      case 'stop_tracking':
        tracker.stopTracking()
        
        return NextResponse.json({
          success: true,
          message: 'Production tracking stopped',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in production POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}