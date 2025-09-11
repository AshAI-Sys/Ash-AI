import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { initializeRealtimeServer, getServerStatus, restartServices } from '@/lib/realtime/server-init'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = getServerStatus()
    
    return NextResponse.json({
      success: true,
      data: status,
      message: 'Real-time server status retrieved',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting real-time server status:', error)
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

    // Only admins can control the real-time server
    const userRole = session.user.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'initialize':
        initializeRealtimeServer()
        return NextResponse.json({
          success: true,
          message: 'Real-time server initialization triggered',
          timestamp: new Date().toISOString()
        })

      case 'restart':
        restartServices()
        return NextResponse.json({
          success: true,
          message: 'Real-time services restart triggered',
          timestamp: new Date().toISOString()
        })

      case 'status':
        const status = getServerStatus()
        return NextResponse.json({
          success: true,
          data: status,
          message: 'Real-time server status retrieved',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: initialize, restart, or status' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in real-time server control:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}