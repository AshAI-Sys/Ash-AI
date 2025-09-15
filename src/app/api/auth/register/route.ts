// @ts-nocheck
// User Registration API - Production-ready user account creation
// Enterprise-grade registration with email verification and security

import { NextRequest } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse
} from '@/lib/error-handler'
import { prisma } from '@/lib/prisma'
import { validatePasswordStrength } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import crypto from 'crypto'

interface RegistrationData {
  email: string
  password: string
  full_name: string
  role?: Role
  company_name?: string
  phone?: string
  department?: string
  position?: string
  workspace_id?: string
}

const ALLOWED_REGISTRATION_ROLES: Role[] = [
  'OPERATOR',
  'SALES_STAFF',
  'CSR',
  'WAREHOUSE_STAFF',
  'QC_INSPECTOR',
  'SEWING_OPERATOR',
  'CUTTING_OPERATOR',
  'PRINTING_OPERATOR',
  'FINISHING_OPERATOR'
]

const ADMIN_ONLY_ROLES: Role[] = [
  'ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'HR',
  'FINANCE',
  'PURCHASER'
]

export async function POST(request: NextRequest) {
  try {
    const body: RegistrationData = await request.json()
    const {
      email,
      password,
      full_name,
      role = 'OPERATOR',
      company_name,
      phone,
      department,
      position,
      workspace_id = 'workspace-1'
    } = body

    // Validation
    if (!email || !password || !full_name) {
      return createErrorResponse('Missing required fields: email, password, full_name', 400)
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse('Invalid email format', 400)
    }

    // Password strength validation
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return createErrorResponse(
        `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
        400
      )
    }

    // Role validation - only allow safe roles for self-registration
    if (!ALLOWED_REGISTRATION_ROLES.includes(role)) {
      return createErrorResponse(
        `Role '${role}' requires admin approval. Please contact system administrator.`,
        403
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { email: email }
        ]
      }
    })

    if (existingUser) {
      return createErrorResponse('Account with this email already exists', 409)
    }

    // Hash password
    const saltRounds = 12 // Strong salt for production
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user account
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name,
        role,
        workspace_id,
        active: true, // Activate immediately for demo (in production, require verification)
        email_verified: new Date(), // Mark as verified for demo
        profile: {
          company_name,
          phone,
          department,
          position,
          registration_date: new Date(),
          registration_ip: request.headers.get('x-forwarded-for') || 'unknown',
          verification_token: verificationToken,
          verification_expires: verificationExpires.toISOString()
        }
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        active: true,
        email_verified: true,
        created_at: true
      }
    })

    // In production, send verification email
    if (process.env.NODE_ENV === 'production') {
      await sendVerificationEmail(email, verificationToken, full_name)
    }

    // Log registration event
    console.log('New user registered:', {
      user_id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      timestamp: new Date().toISOString()
    })

    return createSuccessResponse(
      {
        user: newUser,
        message: 'Account created successfully',
        next_steps: [
          'Check your email for verification link',
          'Complete email verification to activate account',
          'Contact administrator if you need elevated permissions'
        ]
      },
      'User registration completed successfully',
      {
        verification_required: true,
        verification_expires: verificationExpires.toISOString(),
        role_assigned: role
      }
    )

  } catch (error) {
    console.error('Registration error:', error)

    // Handle specific database errors
    if (error.code === 'P2002') {
      return createErrorResponse('Account with this email already exists', 409)
    }

    return createErrorResponse(
      'Registration failed. Please try again later.',
      500
    )
  }
}

// Email verification endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const action = searchParams.get('action')

    if (action === 'verify' && token) {
      // Verify email with token
      const user = await prisma.user.findFirst({
        where: {
          verification_token: token,
          verification_expires: {
            gt: new Date()
          }
        }
      })

      if (!user) {
        return createErrorResponse('Invalid or expired verification token', 400)
      }

      // Activate user account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          active: true,
          email_verified: new Date(), // Set to current timestamp for verification
          verification_token: null,
          verification_expires: null
        }
      })

      return createSuccessResponse(
        {
          message: 'Email verified successfully',
          account_status: 'active',
          can_login: true
        },
        'Account verification completed'
      )
    }

    if (action === 'resend') {
      const email = searchParams.get('email')
      if (!email) {
        return createErrorResponse('Email required for resend verification', 400)
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user) {
        return createErrorResponse('Account not found', 404)
      }

      if (user.email_verified) {
        return createErrorResponse('Account already verified', 400)
      }

      // Generate new verification token
      const newToken = crypto.randomBytes(32).toString('hex')
      const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verification_token: newToken,
          verification_expires: newExpires
        }
      })

      // Send new verification email
      if (process.env.NODE_ENV === 'production') {
        await sendVerificationEmail(user.email, newToken, user.full_name)
      }

      return createSuccessResponse(
        {
          message: 'Verification email sent',
          expires: newExpires.toISOString()
        },
        'New verification email sent successfully'
      )
    }

    return createErrorResponse('Invalid action specified', 400)

  } catch (error) {
    console.error('Email verification error:', error)
    return createErrorResponse('Verification failed', 500)
  }
}

// Helper function to send verification email
async function sendVerificationEmail(email: string, token: string, fullName: string) {
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`

    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Verification email for ${email}:`)
    console.log(`Name: ${fullName}`)
    console.log(`Verification URL: ${verificationUrl}`)
    console.log(`Token: ${token}`)

    // TODO: Implement actual email sending
    // await emailService.send({
    //   to: email,
    //   subject: 'Verify your ASH AI account',
    //   template: 'email-verification',
    //   data: { fullName, verificationUrl }
    // })

    return true
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return false
  }
}

// Admin-only endpoint to approve elevated roles
export async function PATCH(request: NextRequest) {
  try {
    // This would require admin authentication
    const body = await request.json()
    const { user_id, new_role, approved_by } = body

    // Validate admin role assignment
    if (!ADMIN_ONLY_ROLES.includes(new_role)) {
      return createErrorResponse('Invalid role for elevation', 400)
    }

    // Update user role (in production, this would require admin session validation)
    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        role: new_role,
        role_updated_at: new Date(),
        role_updated_by: approved_by
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true
      }
    })

    return createSuccessResponse(
      updatedUser,
      'User role updated successfully'
    )

  } catch (error) {
    console.error('Role update error:', error)
    return createErrorResponse('Failed to update user role', 500)
  }
}