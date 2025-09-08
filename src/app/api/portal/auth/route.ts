// Client Portal Authentication API for Stage 12 Client Portal
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { RateLimiter, InputSanitizer, PasswordPolicy } from '@/lib/security'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for production')
}
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

// Rate limiter for login attempts (5 attempts per 15 minutes)
const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000)

// POST /api/portal/auth - Client portal login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const {
      action, // LOGIN, REGISTER, FORGOT_PASSWORD, RESET_PASSWORD, VERIFY_EMAIL
      email,
      password,
      reset_token,
      verification_token,
      new_password,
      // Registration fields
      workspace_id,
      client_id,
      first_name,
      last_name
    } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'LOGIN':
        // Check rate limiting for login attempts
        if (loginRateLimiter.isRateLimited(`${clientIP}:${email}`)) {
          return NextResponse.json({
            success: false,
            error: 'Too many login attempts. Please try again later.',
            remainingAttempts: loginRateLimiter.getRemainingAttempts(`${clientIP}:${email}`)
          }, { status: 429 })
        }
        return handleLogin(request, email, password, clientIP)
      case 'REGISTER':
        return handleRegister(workspace_id, client_id, email, password, first_name, last_name)
      case 'FORGOT_PASSWORD':
        return handleForgotPassword(email)
      case 'RESET_PASSWORD':
        return handleResetPassword(reset_token, new_password)
      case 'VERIFY_EMAIL':
        return handleVerifyEmail(verification_token)
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (_error) {
    console.error('Portal auth error:', _error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

async function handleLogin(request: NextRequest, email: string, password: string, clientIP: string) {
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Get client user
  const clientUser = await db.clientUser.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          company: true
        }
      },
      workspace: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!clientUser) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Check account status
  if (clientUser.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Account is suspended or inactive' },
      { status: 403 }
    )
  }

  // Check if account is locked
  if (clientUser.locked_until && clientUser.locked_until > new Date()) {
    return NextResponse.json(
      { error: 'Account is temporarily locked due to failed login attempts' },
      { status: 423 }
    )
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, clientUser.password_hash)
  
  if (!isValidPassword) {
    // Increment failed login attempts
    const failed_attempts = clientUser.login_attempts + 1
    const update_data: any = { login_attempts: failed_attempts }
    
    // Lock account after 5 failed attempts
    if (failed_attempts >= 5) {
      update_data.locked_until = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }

    await db.clientUser.update({
      where: { id: clientUser.id },
      data: update_data
    })

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Ashley AI validation for login anomalies
  const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const user_agent = request.headers.get('user-agent') || 'unknown'

  const ashley_check = await validateAshleyAI({
    context: 'CLIENT_PORTAL_LOGIN',
    client_user_id: clientUser.id,
    ip_address,
    user_agent,
    last_login: clientUser.last_login?.toISOString(),
    failed_attempts: clientUser.login_attempts
  })

  if (ashley_check.risk === 'RED') {
    return NextResponse.json({
      success: false,
      error: 'Login blocked for security reasons',
      ashley_feedback: ashley_check,
      blocked: true
    }, { status: 422 })
  }

  // Generate session token
  const session_token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + SESSION_EXPIRY)

  // Create session
  await db.clientPortalSession.create({
    data: {
      client_user_id: clientUser.id,
      session_token,
      ip_address,
      user_agent,
      expires_at
    }
  })

  // Update user login info and reset failed attempts
  await db.clientUser.update({
    where: { id: clientUser.id },
    data: {
      last_login: new Date(),
      login_attempts: 0,
      locked_until: null
    }
  })

  // Log activity
  await db.clientPortalActivity.create({
    data: {
      workspace_id: clientUser.workspace_id,
      client_user_id: clientUser.id,
      activity_type: 'LOGIN',
      description: 'Successful login to client portal',
      ip_address,
      user_agent,
      metadata: {
        ashley_risk: ashley_check.risk
      }
    }
  })

  // Generate JWT for client-side usage
  const jwt_token = jwt.sign(
    {
      user_id: clientUser.id,
      client_id: clientUser.client_id,
      workspace_id: clientUser.workspace_id,
      email: clientUser.email,
      role: clientUser.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  return NextResponse.json({
    success: true,
    message: 'Login successful',
    user: {
      id: clientUser.id,
      email: clientUser.email,
      first_name: clientUser.first_name,
      last_name: clientUser.last_name,
      role: clientUser.role,
      permissions: clientUser.permissions,
      client: clientUser.client,
      workspace: clientUser.workspace,
      preferences: {
        language: clientUser.language,
        timezone: clientUser.timezone,
        notifications: clientUser.notification_preferences
      }
    },
    tokens: {
      jwt_token,
      session_token
    },
    expires_at: expires_at.toISOString(),
    ashley_feedback: ashley_check,
    warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
  })
}

async function handleRegister(workspace_id: string, client_id: string, email: string, password: string, first_name: string, last_name: string) {
  if (!workspace_id || !client_id || !email || !password || !first_name || !last_name) {
    return NextResponse.json(
      { error: 'All fields are required for registration' },
      { status: 400 }
    )
  }

  // Check if email already exists
  const existing_user = await db.clientUser.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (existing_user) {
    return NextResponse.json(
      { error: 'Email address is already registered' },
      { status: 409 }
    )
  }

  // Validate client exists
  const client = await db.client.findFirst({
    where: {
      id: client_id,
      workspace_id
    }
  })

  if (!client) {
    return NextResponse.json(
      { error: 'Invalid client or workspace' },
      { status: 404 }
    )
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 12)

  // Generate verification token
  const verification_token = randomBytes(32).toString('hex')

  // Ashley AI validation for registration
  const ashley_check = await validateAshleyAI({
    context: 'CLIENT_PORTAL_REGISTRATION',
    workspace_id,
    client_id,
    email,
    name: `${first_name} ${last_name}`
  })

  if (ashley_check.risk === 'RED') {
    return NextResponse.json({
      success: false,
      error: 'Registration blocked for security reasons',
      ashley_feedback: ashley_check,
      blocked: true
    }, { status: 422 })
  }

  // Create client user
  const client_user = await db.clientUser.create({
    data: {
      workspace_id,
      client_id,
      email: email.toLowerCase(),
      password_hash,
      first_name,
      last_name,
      verification_token
    }
  })

  // Log activity
  await db.clientPortalActivity.create({
    data: {
      workspace_id,
      client_user_id: client_user.id,
      activity_type: 'REGISTER',
      description: 'New client user registration',
      metadata: {
        ashley_risk: ashley_check.risk
      }
    }
  })

  // TODO: Send verification email (integrate with email service)
  // SECURITY: Never log sensitive tokens in production
  if (process.env.NODE_ENV === 'development') {
    console.log(`Verification token for ${email}: ${verification_token}`)
  }

  return NextResponse.json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    user_id: client_user.id,
    email_verification_required: true,
    ashley_feedback: ashley_check,
    warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
  }, { status: 201 })
}

async function handleForgotPassword(email: string) {
  if (!email) {
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    )
  }

  const client_user = await db.clientUser.findUnique({
    where: { email: email.toLowerCase() }
  })

  // Always return success to prevent email enumeration
  if (!client_user) {
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    })
  }

  // Generate reset token
  const reset_token = randomBytes(32).toString('hex')
  const reset_token_expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.clientUser.update({
    where: { id: client_user.id },
    data: {
      reset_token,
      reset_token_expires
    }
  })

  // TODO: Send password reset email
  // SECURITY: Never log sensitive tokens in production
  if (process.env.NODE_ENV === 'development') {
    console.log(`Reset token for ${email}: ${reset_token}`)
  }

  return NextResponse.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.'
  })
}

async function handleResetPassword(reset_token: string, new_password: string) {
  if (!reset_token || !new_password) {
    return NextResponse.json(
      { error: 'Reset token and new password are required' },
      { status: 400 }
    )
  }

  const client_user = await db.clientUser.findFirst({
    where: {
      reset_token,
      reset_token_expires: { gt: new Date() }
    }
  })

  if (!client_user) {
    return NextResponse.json(
      { error: 'Invalid or expired reset token' },
      { status: 400 }
    )
  }

  // Hash new password
  const password_hash = await bcrypt.hash(new_password, 12)

  // Update password and clear reset token
  await db.clientUser.update({
    where: { id: client_user.id },
    data: {
      password_hash,
      reset_token: null,
      reset_token_expires: null
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Password has been reset successfully'
  })
}

async function handleVerifyEmail(verification_token: string) {
  if (!verification_token) {
    return NextResponse.json(
      { error: 'Verification token is required' },
      { status: 400 }
    )
  }

  const client_user = await db.clientUser.findFirst({
    where: { verification_token }
  })

  if (!client_user) {
    return NextResponse.json(
      { error: 'Invalid verification token' },
      { status: 400 }
    )
  }

  if (client_user.email_verified) {
    return NextResponse.json({
      success: true,
      message: 'Email is already verified'
    })
  }

  // Verify email
  await db.clientUser.update({
    where: { id: client_user.id },
    data: {
      email_verified: true,
      verification_token: null
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Email verified successfully'
  })
}

// GET /api/portal/auth - Check session status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { authenticated: false, error: 'No session found' },
        { status: 401 }
      )
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '')
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      // Get current user info
      const clientUser = await db.clientUser.findUnique({
        where: { id: decoded.user_id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true
            }
          },
          workspace: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!clientUser || clientUser.status !== 'ACTIVE') {
        return NextResponse.json(
          { authenticated: false, error: 'Invalid session' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: clientUser.id,
          email: clientUser.email,
          first_name: clientUser.first_name,
          last_name: clientUser.last_name,
          role: clientUser.role,
          client: clientUser.client,
          workspace: clientUser.workspace
        }
      })

    } catch (_jwt_error) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

  } catch (_error) {
    console.error('Error checking session:', _error)
    return NextResponse.json(
      { authenticated: false, error: 'Session validation failed' },
      { status: 500 }
    )
  }
}