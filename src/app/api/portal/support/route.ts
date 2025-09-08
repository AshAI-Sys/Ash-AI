// Client Portal Support API for Stage 12 Client Portal
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// GET /api/portal/support - Get client support tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client_user_id = searchParams.get('client_user_id')
    const workspace_id = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')

    if (!client_user_id || !workspace_id) {
      return NextResponse.json(
        { error: 'client_user_id and workspace_id are required' },
        { status: 400 }
      )
    }

    const where: any = {
      client_user_id,
      workspace_id
    }
    if (status) where.status = status
    if (category) where.category = category
    if (priority) where.priority = priority

    const tickets = await db.clientSupportTicket.findMany({
      where,
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1 // Get latest message for preview
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' }
      ]
    })

    // Add summary data
    const tickets_with_summary = tickets.map(ticket => {
      const latest_message = ticket.messages[0]
      const days_open = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const response_time = ticket.first_response_at
        ? Math.floor((new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60))
        : null

      return {
        ...ticket,
        summary: {
          days_open,
          response_time_minutes: response_time,
          total_messages: ticket._count.messages,
          latest_message: latest_message ? {
            message: latest_message.message.substring(0, 150) + '...',
            sender_type: latest_message.sender_type,
            created_at: latest_message.created_at
          } : null,
          is_overdue: ticket.status === 'OPEN' && days_open > 2, // 2 days SLA
          needs_client_response: ticket.status === 'WAITING_CLIENT',
          can_be_rated: ticket.status === 'RESOLVED' && !ticket.client_rating
        }
      }
    })

    return NextResponse.json({
      success: true,
      tickets: tickets_with_summary
    })

  } catch (_error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// POST /api/portal/support - Create support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      client_user_id,
      subject,
      description,
      category, // ORDER_INQUIRY/PAYMENT_ISSUE/TECHNICAL/COMPLAINT/FEEDBACK
      priority = 'MEDIUM',
      related_order_id,
      related_invoice_id,
      attachments = []
    } = body

    if (!workspace_id || !client_user_id || !subject || !description || !category) {
      return NextResponse.json(
        { error: 'workspace_id, client_user_id, subject, description, and category are required' },
        { status: 400 }
      )
    }

    // Validate client user exists and is active
    const clientUser = await db.clientUser.findFirst({
      where: {
        id: client_user_id,
        workspace_id,
        status: 'ACTIVE'
      }
    })

    if (!clientUser) {
      return NextResponse.json(
        { error: 'Client user not found or inactive' },
        { status: 404 }
      )
    }

    // Validate related entities if provided
    if (related_order_id) {
      const order = await db.order.findFirst({
        where: {
          id: related_order_id,
          workspace_id,
          client_id: clientUser.client_id
        }
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Related order not found or does not belong to client' },
          { status: 404 }
        )
      }
    }

    if (related_invoice_id) {
      const invoice = await db.invoice.findFirst({
        where: {
          id: related_invoice_id,
          workspace_id,
          client_id: clientUser.client_id
        }
      })

      if (!invoice) {
        return NextResponse.json(
          { error: 'Related invoice not found or does not belong to client' },
          { status: 404 }
        )
      }
    }

    // Generate ticket number
    const ticket_count = await db.clientSupportTicket.count({
      where: { workspace_id }
    })
    const ticket_no = `TKT${String(ticket_count + 1).padStart(8, '0')}`

    // Ashley AI validation for support ticket
    const ashley_check = await validateAshleyAI({
      context: 'SUPPORT_TICKET_CREATION',
      client_user_id,
      category,
      priority,
      subject,
      description_length: description.length,
      has_attachments: attachments.length > 0
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Support ticket blocked for security reasons',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create support ticket
    const ticket = await db.clientSupportTicket.create({
      data: {
        workspace_id,
        client_user_id,
        ticket_no,
        subject,
        description,
        category,
        priority,
        related_order_id,
        related_invoice_id,
        status: 'OPEN'
      }
    })

    // Create initial message from client
    const initial_message = await db.clientSupportMessage.create({
      data: {
        ticket_id: ticket.id,
        sender_type: 'CLIENT',
        sender_id: client_user_id,
        message: description,
        attachments: attachments.length > 0 ? attachments : undefined
      }
    })

    // Auto-assign ticket based on category (simplified logic)
    const assigned_to = null
    switch (category) {
      case 'ORDER_INQUIRY':
        // Find available order manager
        // assigned_to = await findAvailableStaff('order_manager')
        break
      case 'PAYMENT_ISSUE':
        // Find available finance staff
        // assigned_to = await findAvailableStaff('finance')
        break
      case 'TECHNICAL':
        // Find available IT support
        // assigned_to = await findAvailableStaff('it_support')
        break
    }

    if (assigned_to) {
      await db.clientSupportTicket.update({
        where: { id: ticket.id },
        data: { assigned_to }
      })
    }

    // Log activity
    await db.clientPortalActivity.create({
      data: {
        workspace_id,
        client_user_id,
        activity_type: 'SUPPORT_TICKET_CREATED',
        description: `Support ticket created: ${subject}`,
        related_entity_type: 'support_ticket',
        related_entity_id: ticket.id,
        metadata: {
          category,
          priority,
          ticket_no,
          ashley_risk: ashley_check.risk
        }
      }
    })

    // TODO: Send notification to support team
    console.log(`New support ticket created: ${ticket_no} - ${subject}`)

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_no: ticket.ticket_no,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at
      },
      message: 'Support ticket created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

// PUT /api/portal/support - Update support ticket or add message
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ticket_id,
      workspace_id,
      client_user_id,
      action, // ADD_MESSAGE, RATE_SUPPORT, CLOSE_TICKET
      message,
      attachments = [],
      rating,
      feedback
    } = body

    if (!ticket_id || !workspace_id || !action) {
      return NextResponse.json(
        { error: 'ticket_id, workspace_id, and action are required' },
        { status: 400 }
      )
    }

    // Get existing ticket
    const existing_ticket = await db.clientSupportTicket.findFirst({
      where: {
        id: ticket_id,
        workspace_id
      }
    })

    if (!existing_ticket) {
      return NextResponse.json(
        { error: 'Support ticket not found' },
        { status: 404 }
      )
    }

    // Validate client user ownership for client actions
    if (client_user_id && existing_ticket.client_user_id !== client_user_id) {
      return NextResponse.json(
        { error: 'Ticket does not belong to client user' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'ADD_MESSAGE':
        if (!message) {
          return NextResponse.json(
            { error: 'Message is required' },
            { status: 400 }
          )
        }

        // Create new message
        await db.clientSupportMessage.create({
          data: {
            ticket_id,
            sender_type: 'CLIENT',
            sender_id: client_user_id!,
            message,
            attachments: attachments.length > 0 ? attachments : undefined
          }
        })

        // Update ticket status if it was waiting for client
        if (existing_ticket.status === 'WAITING_CLIENT') {
          await db.clientSupportTicket.update({
            where: { id: ticket_id },
            data: { status: 'IN_PROGRESS' }
          })
        }

        // Log activity
        await db.clientPortalActivity.create({
          data: {
            workspace_id,
            client_user_id,
            activity_type: 'SUPPORT_MESSAGE_SENT',
            description: 'Client sent message to support ticket',
            related_entity_type: 'support_ticket',
            related_entity_id: ticket_id
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Message added to support ticket'
        })

      case 'RATE_SUPPORT':
        if (!rating || rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 1 and 5' },
            { status: 400 }
          )
        }

        if (existing_ticket.status !== 'RESOLVED') {
          return NextResponse.json(
            { error: 'Can only rate resolved tickets' },
            { status: 409 }
          )
        }

        if (existing_ticket.client_rating) {
          return NextResponse.json(
            { error: 'Ticket has already been rated' },
            { status: 409 }
          )
        }

        // Update ticket with rating
        await db.clientSupportTicket.update({
          where: { id: ticket_id },
          data: {
            client_rating: rating,
            status: 'CLOSED'
          }
        })

        // Log activity
        await db.clientPortalActivity.create({
          data: {
            workspace_id,
            client_user_id,
            activity_type: 'SUPPORT_RATED',
            description: `Client rated support ticket: ${rating}/5`,
            related_entity_type: 'support_ticket',
            related_entity_id: ticket_id,
            metadata: { rating, feedback }
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Support ticket rated successfully'
        })

      case 'CLOSE_TICKET':
        if (existing_ticket.status === 'CLOSED') {
          return NextResponse.json(
            { error: 'Ticket is already closed' },
            { status: 409 }
          )
        }

        // Close ticket
        await db.clientSupportTicket.update({
          where: { id: ticket_id },
          data: {
            status: 'CLOSED',
            closed_at: new Date()
          }
        })

        // Log activity
        await db.clientPortalActivity.create({
          data: {
            workspace_id,
            client_user_id,
            activity_type: 'SUPPORT_TICKET_CLOSED',
            description: 'Client closed support ticket',
            related_entity_type: 'support_ticket',
            related_entity_id: ticket_id
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Support ticket closed successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (_error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update support ticket' },
      { status: 500 }
    )
  }
}