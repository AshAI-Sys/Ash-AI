/**
 * ASH AI - Client Portal Authentication API
 * Secure authentication system for client portal access
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional().default(false)
})

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable is required for production')
}

/**
 * POST /api/client-portal/auth - Client portal login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // Find client by email
    const client = await prisma.client.findFirst({
      where: {
        emails: {
          hasSome: [validatedData.email]
        },
        portal_access: true,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        company: true,
        emails: true,
        phone: true,
        portal_password: true,
        portal_settings: true,
        workspace_id: true,
        last_login: true,
        workspace: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials or portal access not enabled'
      }, { status: 401 })
    }

    // Verify password
    if (!client.portal_password) {
      return NextResponse.json({
        success: false,
        error: 'Portal access not configured. Please contact your account manager.'
      }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, client.portal_password)
    if (!isPasswordValid) {
      // Log failed login attempt
      await logSecurityEvent('LOGIN_FAILED', client.id, {
        email: validatedData.email,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Generate JWT token
    const tokenPayload = {
      clientId: client.id,
      clientName: client.name,
      workspaceId: client.workspace_id,
      type: 'client_portal'
    }

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { 
        expiresIn: validatedData.remember_me ? '30d' : '7d',
        issuer: 'ash-ai-client-portal'
      }
    )

    // Update last login
    await prisma.client.update({
      where: { id: client.id },
      data: {
        last_login: new Date(),
        portal_settings: {
          ...((client.portal_settings as any) || {}),
          last_login: new Date().toISOString(),
          login_count: ((client.portal_settings as any)?.login_count || 0) + 1
        }
      }
    })

    // Log successful login
    await logSecurityEvent('LOGIN_SUCCESS', client.id, {
      email: validatedData.email,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      remember_me: validatedData.remember_me
    })

    // Get client's active orders count
    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      where: {
        client_id: client.id,
        workspace_id: client.workspace_id
      },
      _count: true
    })

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      client: {
        id: client.id,
        name: client.name,
        company: client.company,
        emails: client.emails,
        workspace: client.workspace,
        portal_settings: client.portal_settings
      },
      stats: {
        order_counts: orderStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count
          return acc
        }, {} as Record<string, number>),
        total_orders: orderStats.reduce((sum, stat) => sum + stat._count, 0)
      }
    })

    // Set secure HTTP-only cookie
    response.cookies.set('client-portal-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: validatedData.remember_me ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60 // 30 days or 7 days
    })

    return response

  } catch (_error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Client portal login error:', error)
    return NextResponse.json({
      success: false,
      error: 'Login failed'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/client-portal/auth - Client portal logout
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('client-portal-token')?.value

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        
        // Log logout event
        await logSecurityEvent('LOGOUT', decoded.clientId, {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        })
      } catch (err) {
        // Token might be expired or invalid, that's okay for logout
        console.log('Token verification failed during logout:', err)
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the cookie
    response.cookies.set('client-portal-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    })

    return response

  } catch (_error) {
    console.error('Client portal logout error:', error)
    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 })
  }
}

/**
 * GET /api/client-portal/auth - Verify client portal session
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('client-portal-token')?.value

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No session found'
      }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Get current client data
    const client = await prisma.client.findUnique({
      where: { 
        id: decoded.clientId,
        portal_access: true,
        is_active: true
      },
      select: {
        id: true,
        name: true,
        company: true,
        emails: true,
        portal_settings: true,
        workspace_id: true,
        workspace: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Client not found or access revoked'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        company: client.company,
        emails: client.emails,
        workspace: client.workspace,
        portal_settings: client.portal_settings
      },
      session: {
        clientId: decoded.clientId,
        workspaceId: decoded.workspaceId,
        expires_at: decoded.exp
      }
    })

  } catch (_error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid session'
      }, { status: 401 })
    }

    console.error('Session verification error:', error)
    return NextResponse.json({
      success: false,
      error: 'Session verification failed'
    }, { status: 500 })
  }
}

// Helper function to log security events
async function logSecurityEvent(event: string, clientId: string, metadata: any) {
  try {
    await prisma.auditLog.create({
      data: {
        id: require('nanoid').nanoid(),
        workspace_id: 'system', // Security events are system-wide
        actor_id: clientId,
        entity_type: 'client_portal',
        entity_id: clientId,
        action: event,
        metadata: {
          event_type: 'security',
          source: 'client_portal_auth',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }
    })
  } catch (_error) {
    console.error('Failed to log security event:', error)
  }
}