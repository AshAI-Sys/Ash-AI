import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { sendMagicLinkEmail } from '@/lib/magic-link'
// Portal Access Request API
// Based on CLIENT_UPDATED_PLAN.md Stage 12 specifications


// POST /api/portal/request-access - Send magic link to client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, order_number } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Find client by email
    const client = await db.client.findFirst({
      where: {
        emails: {
          path: '$',
          array_starts_with: normalizedEmail
        }
      },
      include: {
        workspace: {
          select: {
            name: true,
            active: true
          }
        },
        orders: order_number ? {
          where: {
            po_number: {
              equals: order_number.trim(),
              mode: 'insensitive'
            }
          },
          select: {
            id: true,
            po_number: true,
            status: true,
            product_type: true
          }
        } : false
      }
    })

    if (!client) {
      // Security: Don't reveal if email exists or not
      return NextResponse.json({
        success: true,
        message: 'If this email is associated with an order, you will receive an access link shortly.'
      })
    }

    // Check if workspace is active
    if (!client.workspace.active) {
      return NextResponse.json({
        success: true,
        message: 'If this email is associated with an order, you will receive an access link shortly.'
      })
    }

    // If order_number specified, validate client has access to it
    if (order_number) {
      const hasOrder = await db.order.findFirst({
        where: {
          po_number: {
            equals: order_number.trim(),
            mode: 'insensitive'
          },
          client_id: client.id,
          workspace_id: client.workspace_id
        }
      })

      if (!hasOrder) {
        return NextResponse.json({
          success: true,
          message: 'If this email is associated with the specified order, you will receive an access link shortly.'
        })
      }
    }

    // Send magic link
    const emailSent = await sendMagicLinkEmail(
      client.id,
      normalizedEmail,
      order_number || undefined
    )

    if (!emailSent) {
      console.error('Failed to send magic link email for client:', client.id)
      // Don't expose internal errors to user
      return NextResponse.json({
        success: true,
        message: 'If this email is associated with an order, you will receive an access link shortly.'
      })
    }

    // Log access request for security monitoring
    await db.auditLog.create({
      data: {
        workspace_id: client.workspace_id,
        entity_type: 'access_request',
        entity_id: client.id,
        action: 'CREATE',
        after_data: {
          email: normalizedEmail,
          order_number: order_number || null,
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Access link sent! Please check your email (including spam folder). The link will expire in 24 hours.'
    })

  } catch (_error) {
    console.error('Error processing access request:', _error)
    
    // Generic response for security
    return NextResponse.json({
      success: true,
      message: 'If this email is associated with an order, you will receive an access link shortly.'
    })
  }
}

// GET /api/portal/request-access - Get access request form info
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      info: {
        description: 'Request secure access to your order portal',
        features: [
          'Track production progress in real-time',
          'View and approve design mockups',
          'Download production files',
          'Communication history',
          'Delivery tracking'
        ],
        security: {
          method: 'Magic link authentication',
          expiration: '24 hours',
          encryption: 'End-to-end encrypted'
        }
      }
    })

  } catch (_error) {
    console.error('Error fetching access info:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch access info' },
      { status: 500 }
    )
  }
}