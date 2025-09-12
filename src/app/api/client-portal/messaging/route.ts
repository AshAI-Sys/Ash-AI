// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { WorkflowTriggerHelpers } from '@/lib/real-time-triggers'

// Enhanced Client Communication API with Real-time Messaging
// Supports instant messaging, file sharing, and notification delivery

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET

interface MessageData {
  type: 'text' | 'file' | 'system' | 'order_update' | 'design_comment'
  content: string
  order_id?: string
  file_url?: string
  file_name?: string
  metadata?: any
}

// GET /api/client-portal/messaging - Get conversation history
export async function GET(request: NextRequest) {
  try {
    // Verify client session
    const token = request.cookies.get('client-portal-token')?.value
    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const client_id = decoded.client_id
    const workspace_id = decoded.workspace_id

    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get conversation messages
    const whereClause: any = {
      workspace_id,
      OR: [
        { from_client_id: client_id },
        { to_client_id: client_id }
      ]
    }

    if (order_id) {
      whereClause.order_id = order_id
    }

    const [messages, totalCount] = await Promise.all([
      db.clientMessage.findMany({
        where: whereClause,
        include: {
          fromUser: {
            select: { name: true, role: true }
          },
          fromClient: {
            select: { name: true }
          },
          order: {
            select: { po_number: true }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      db.clientMessage.count({ where: whereClause })
    ])

    // Mark messages as read
    await db.clientMessage.updateMany({
      where: {
        ...whereClause,
        to_client_id: client_id,
        read_at: null
      },
      data: {
        read_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Show oldest first
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Messaging API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to load messages' 
    }, { status: 500 })
  }
}

// POST /api/client-portal/messaging - Send new message
export async function POST(request: NextRequest) {
  try {
    // Verify client session
    const token = request.cookies.get('client-portal-token')?.value
    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const client_id = decoded.client_id
    const clientUserId = decoded.clientUserId
    const workspace_id = decoded.workspace_id

    const body = await request.json()
    const { message_data, order_id, reply_to_id } = body as {
      message_data: MessageData
      order_id?: string
      reply_to_id?: string
    }

    // Validate message data
    if (!message_data || !message_data.content) {
      return NextResponse.json({ 
        error: 'Message content is required' 
      }, { status: 400 })
    }

    // Create message record
    const message = await db.clientMessage.create({
      data: {
        workspace_id,
        from_client_id: client_id,
        to_user_id: null, // Will be assigned to appropriate team member
        order_id,
        reply_to_id,
        type: message_data.type,
        content: message_data.content,
        file_url: message_data.file_url,
        file_name: message_data.file_name,
        metadata: message_data.metadata ? JSON.stringify(message_data.metadata) : null
      },
      include: {
        fromClient: { select: { name: true } },
        order: { select: { po_number: true } }
      }
    })

    // Auto-assign to appropriate team member
    const assignedUserId = await autoAssignMessage(message, workspace_id)
    if (assignedUserId) {
      await db.clientMessage.update({
        where: { id: message.id },
        data: { to_user_id: assignedUserId }
      })
    }

    // Send real-time notification to internal team
    await sendInternalNotification(message, workspace_id)

    // Trigger automated responses if appropriate
    await handleAutomatedResponses(message, workspace_id)

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        created_at: message.created_at,
        order_po: message.order?.po_number,
        from: message.fromClient?.name
      }
    })

  } catch (error) {
    console.error('Send Message Error:', error)
    return NextResponse.json({ 
      error: 'Failed to send message' 
    }, { status: 500 })
  }
}

// PUT /api/client-portal/messaging - Update message (mark as read, etc.)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('client-portal-token')?.value
    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const client_id = decoded.client_id
    const workspace_id = decoded.workspace_id

    const body = await request.json()
    const { message_id, action } = body

    if (action === 'mark_read') {
      await db.clientMessage.updateMany({
        where: {
          id: message_id,
          workspace_id,
          to_client_id: client_id
        },
        data: {
          read_at: new Date()
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 })

  } catch (error) {
    console.error('Update Message Error:', error)
    return NextResponse.json({ 
      error: 'Failed to update message' 
    }, { status: 500 })
  }
}

// Helper functions
async function autoAssignMessage(message: any, workspace_id: string): Promise<string | null> {
  try {
    // Auto-assign based on message type and order context
    let targetRole = 'CUSTOMER_SERVICE'

    if (message.order_id) {
      // Get order details to determine appropriate assignee
      const order = await db.order.findUnique({
        where: { id: message.order_id },
        select: { status: true }
      })

      if (order) {
        // Assign based on order status
        if (['DESIGN_PENDING', 'DESIGN_APPROVAL'].includes(order.status)) {
          targetRole = 'DESIGNER'
        } else if (['IN_PROGRESS', 'QC'].includes(order.status)) {
          targetRole = 'PRODUCTION_MANAGER'
        } else if (['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'].includes(order.status)) {
          targetRole = 'LOGISTICS_COORDINATOR'
        }
      }
    }

    // Find available user with the target role
    const assignee = await db.user.findFirst({
      where: {
        workspace_id,
        role: targetRole,
        status: 'ACTIVE'
      },
      select: { id: true }
    })

    return assignee?.id || null

  } catch (error) {
    console.error('Auto-assign error:', error)
    return null
  }
}

async function sendInternalNotification(message: any, workspace_id: string) {
  try {
    // Send notification to internal team about new client message
    await fetch('/api/websocket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'internal',
        type: 'client_message_received',
        message: `New message from ${message.fromClient?.name}${message.order ? ` about order ${message.order.po_number}` : ''}`,
        data: {
          message_id: message.id,
          client_name: message.fromClient?.name,
          order_po: message.order?.po_number,
          message_type: message.type,
          content_preview: message.content.substring(0, 100)
        },
        target_user_id: message.to_user_id,
        priority: 'normal'
      })
    })

  } catch (error) {
    console.error('Failed to send internal notification:', error)
  }
}

async function handleAutomatedResponses(message: any, workspace_id: string) {
  try {
    // Generate automated responses for common inquiries
    const content = message.content.toLowerCase()

    let autoResponse = null

    if (content.includes('order status') || content.includes('where is my order')) {
      if (message.order_id) {
        const order = await db.order.findUnique({
          where: { id: message.order_id },
          select: { status: true, po_number: true }
        })

        if (order) {
          autoResponse = {
            type: 'system',
            content: `Hi! Your order ${order.po_number} is currently in ${order.status.replace('_', ' ').toLowerCase()} status. Our team will provide more details shortly.`,
            metadata: { auto_generated: true, trigger: 'status_inquiry' }
          }
        }
      }
    } else if (content.includes('delivery') || content.includes('when will')) {
      autoResponse = {
        type: 'system',
        content: `Thank you for your inquiry about delivery timing. Our customer service team will check the latest delivery schedule and get back to you within 30 minutes.`,
        metadata: { auto_generated: true, trigger: 'delivery_inquiry' }
      }
    } else if (content.includes('design') && content.includes('change')) {
      autoResponse = {
        type: 'system',
        content: `We've received your design change request. Our design team will review this and contact you about any impacts on timeline or pricing.`,
        metadata: { auto_generated: true, trigger: 'design_change_request' }
      }
    }

    // Send automated response if generated
    if (autoResponse) {
      await db.clientMessage.create({
        data: {
          workspace_id,
          from_user_id: null, // System message
          to_client_id: message.from_client_id,
          order_id: message.order_id,
          reply_to_id: message.id,
          type: autoResponse.type,
          content: autoResponse.content,
          metadata: JSON.stringify(autoResponse.metadata)
        }
      })

      // Send real-time notification to client
      await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'client-portal',
          type: 'message_received',
          message: 'New message from ASH AI team',
          data: {
            message_content: autoResponse.content,
            auto_generated: true
          },
          target_client_id: message.from_client_id,
          priority: 'normal'
        })
      })
    }

  } catch (error) {
    console.error('Failed to handle automated response:', error)
  }
}