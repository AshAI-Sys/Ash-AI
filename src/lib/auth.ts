// @ts-nocheck
import { NextAuthOptions, User } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { NextRequest } from 'next/server'
import {
  logError,
  createAuthenticationError,
  createRateLimitError,
  ErrorType,
  ErrorSeverity,
  type ErrorContext
} from './error-handler'

// Security configurations
export const AUTH_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 days
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_ATTEMPTS: 5
}

// In-memory rate limiting and lockout tracking (in production, use Redis)
const authAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>()

// Password strength validation
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Rate limiting for authentication attempts
export function checkAuthRateLimit(identifier: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const key = `auth:${identifier}`
  const current = authAttempts.get(key)

  // Check if user is locked out
  if (current?.lockedUntil && current.lockedUntil > now) {
    return { allowed: false, resetTime: current.lockedUntil }
  }

  // Reset if window has passed
  if (!current || (now - current.lastAttempt) > AUTH_CONFIG.RATE_LIMIT_WINDOW) {
    authAttempts.set(key, { count: 1, lastAttempt: now })
    return { allowed: true }
  }

  // Check rate limit
  if (current.count >= AUTH_CONFIG.RATE_LIMIT_MAX_ATTEMPTS) {
    const lockoutTime = now + AUTH_CONFIG.LOCKOUT_DURATION
    authAttempts.set(key, { ...current, lockedUntil: lockoutTime })
    return { allowed: false, resetTime: lockoutTime }
  }

  // Increment counter
  authAttempts.set(key, { ...current, count: current.count + 1, lastAttempt: now })
  return { allowed: true }
}

// Clear successful authentication attempt
export function clearAuthAttempts(identifier: string): void {
  authAttempts.delete(`auth:${identifier}`)
}

// Hash password with enhanced security
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12 // Increased from default 10 for better security
  return bcrypt.hash(password, saltRounds)
}

// Audit logging for authentication events
export async function logAuthEvent(
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' | 'SESSION_EXPIRED' | 'LOGOUT',
  context: {
    email?: string
    userId?: string
    ip?: string
    userAgent?: string
    reason?: string
  }
): Promise<void> {
  const authError = {
    type: ErrorType.AUTHENTICATION,
    severity: event === 'LOGIN_FAILED' || event === 'ACCOUNT_LOCKED' ? ErrorSeverity.MEDIUM : ErrorSeverity.LOW,
    message: `Authentication event: ${event}`,
    context: {
      ...context,
      timestamp: new Date().toISOString()
    },
    metadata: { authEvent: event }
  }

  await logError(authError)

  // In production, also log to audit table
  if (process.env.NODE_ENV === 'production') {
    try {
      // This would create an audit log entry in the database
      // await prisma.auditLog.create({ ... })
    } catch (error) {
      console.warn('Failed to create audit log entry:', error)
    }
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      full_name: string
      role: Role
      workspace_id: string
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    full_name: string
    role: Role
    workspace_id: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          await logAuthEvent('LOGIN_FAILED', {
            email: credentials?.email,
            reason: 'Missing credentials',
            ip: req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'],
            userAgent: req?.headers?.['user-agent']
          })
          return null
        }

        // Rate limiting check
        const clientIp = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'unknown'
        const rateLimitKey = `${clientIp}:${credentials.email}`
        const rateCheck = checkAuthRateLimit(rateLimitKey)

        if (!rateCheck.allowed) {
          await logAuthEvent('ACCOUNT_LOCKED', {
            email: credentials.email,
            reason: 'Rate limit exceeded',
            ip: clientIp,
            userAgent: req?.headers?.['user-agent']
          })
          return null
        }

        // Production authentication - check database first, fallback to mock for demo
        try {
          // Try database authentication first
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              password: true,
              full_name: true,
              role: true,
              active: true,
              workspace_id: true,
              last_login: true
            }
          });

          if (user && user.active && await bcrypt.compare(credentials.password, user.password)) {
            // Clear failed attempts on successful login
            clearAuthAttempts(rateLimitKey)

            // Update last login time
            await prisma.user.update({
              where: { id: user.id },
              data: { last_login: new Date() }
            })

            await logAuthEvent('LOGIN_SUCCESS', {
              email: user.email,
              userId: user.id,
              ip: clientIp,
              userAgent: req?.headers?.['user-agent']
            })

            return {
              id: user.id,
              email: user.email,
              name: user.full_name,
              full_name: user.full_name,
              role: user.role,
              workspace_id: user.workspace_id
            };
          }

          if (user && !user.active) {
            await logAuthEvent('LOGIN_FAILED', {
              email: credentials.email,
              reason: 'Account inactive',
              ip: clientIp,
              userAgent: req?.headers?.['user-agent']
            })
            return null
          }

        } catch (_error) {
          console.warn('Database auth failed, using mock auth:', _error);
          await logAuthEvent('LOGIN_FAILED', {
            email: credentials.email,
            reason: 'Database error',
            ip: clientIp,
            userAgent: req?.headers?.['user-agent']
          })
        }

        // Fallback to mock users for demo/development
        const mockUsers = [
          {
            id: '1',
            email: 'admin@example.com',
            password: 'admin123',
            full_name: 'System Administrator',
            role: 'ADMIN' as Role,
            workspace_id: 'workspace-1'
          },
          {
            id: '2',
            email: 'admin@ash-ai.com',
            password: 'AshAI2024!',
            full_name: 'ASH AI Administrator',
            role: 'ADMIN' as Role,
            workspace_id: 'workspace-1'
          },
          {
            id: '3',
            email: 'sewing@example.com',
            password: 'sewing123',
            full_name: 'Maria Santos',
            role: 'SEWING_OPERATOR' as Role,
            workspace_id: 'workspace-1'
          },
          {
            id: '4',
            email: 'manager@example.com',
            password: 'manager123',
            full_name: 'John Manager',
            role: 'MANAGER' as Role,
            workspace_id: 'workspace-1'
          }
        ]

        const user = mockUsers.find(u => u.email === credentials.email)

        if (!user || user.password !== credentials.password) {
          await logAuthEvent('LOGIN_FAILED', {
            email: credentials.email,
            reason: 'Invalid credentials',
            ip: clientIp,
            userAgent: req?.headers?.['user-agent']
          })
          return null
        }

        // Clear failed attempts on successful mock login
        clearAuthAttempts(rateLimitKey)

        await logAuthEvent('LOGIN_SUCCESS', {
          email: user.email,
          userId: user.id,
          ip: clientIp,
          userAgent: req?.headers?.['user-agent']
        })

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          role: user.role,
          workspace_id: user.workspace_id
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: AUTH_CONFIG.SESSION_TIMEOUT / 1000, // Convert to seconds
    updateAge: 24 * 60 * 60, // 24 hours - refresh session daily
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.full_name = (user as { full_name: string }).full_name
        token.workspace_id = (user as { workspace_id: string }).workspace_id
        token.lastActivity = Date.now()
      }

      // Check for session expiry and security validation
      if (token.lastActivity && (Date.now() - token.lastActivity) > AUTH_CONFIG.SESSION_TIMEOUT) {
        await logAuthEvent('SESSION_EXPIRED', {
          userId: token.sub,
          email: token.email,
          reason: 'Session timeout'
        })
        return null // This will force a new login
      }

      // Update last activity timestamp
      token.lastActivity = Date.now()
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as Role
        session.user.full_name = token.full_name as string
        session.user.workspace_id = token.workspace_id as string

        // Additional security check - verify user is still active in database
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub! },
            select: { active: true, role: true }
          })

          if (!user || !user.active) {
            await logAuthEvent('SESSION_EXPIRED', {
              userId: token.sub,
              email: token.email,
              reason: 'User deactivated'
            })
            return null // This will force a new login
          }

          // Check if role has changed
          if (user.role !== token.role) {
            session.user.role = user.role
          }

        } catch (error) {
          // If database check fails, allow session to continue but log the issue
          console.warn('Session validation database check failed:', error)
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: AUTH_CONFIG.SESSION_TIMEOUT / 1000, // Match session timeout
        domain: process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL?.split('//')[1] : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false, // Callback URL needs to be accessible to JS
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

// Enhanced token verification function for API routes
export async function verifyToken(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      await logAuthEvent('LOGIN_FAILED', {
        reason: 'No session found',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })
      return null
    }

    // Enhanced session validation with security checks
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          active: true,
          workspace_id: true,
          last_login: true,
          two_factor_enabled: true
        }
      })

      if (!user || !user.active) {
        await logAuthEvent('SESSION_EXPIRED', {
          userId: session.user.id,
          email: session.user.email,
          reason: 'User not found or inactive',
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        })
        return null
      }

      // Check if session is stale (last login too old)
      const lastLoginAge = user.last_login ? Date.now() - user.last_login.getTime() : 0
      if (lastLoginAge > AUTH_CONFIG.SESSION_TIMEOUT) {
        await logAuthEvent('SESSION_EXPIRED', {
          userId: user.id,
          email: user.email,
          reason: 'Session too old',
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        })
        return null
      }

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        workspace_id: user.workspace_id,
        active: user.active,
        twoFactorEnabled: user.two_factor_enabled
      }
    } catch (dbError) {
      console.warn('Database validation failed, using session data:', dbError)

      // Fallback to session data if database is unavailable
      // But still log the issue for monitoring
      await logAuthEvent('LOGIN_FAILED', {
        userId: session.user.id,
        email: session.user.email,
        reason: 'Database validation failed',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.full_name,
        role: session.user.role,
        workspace_id: session.user.workspace_id,
        active: true,
        twoFactorEnabled: false
      }
    }
  } catch (_error) {
    console.error('Token verification error:', _error)
    await logAuthEvent('LOGIN_FAILED', {
      reason: 'Token verification error',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })
    return null
  }
}

// Role-based access control helper
export function hasPermission(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole)
}

// Check if user has admin privileges
export function isAdmin(userRole: Role): boolean {
  return userRole === 'ADMIN'
}

// Check if user can access workspace
export function canAccessWorkspace(userWorkspaceId: string, requiredWorkspaceId: string): boolean {
  return userWorkspaceId === requiredWorkspaceId
}

// Secure logout function
export async function secureLogout(userId?: string, reason: string = 'User logout') {
  try {
    if (userId) {
      await logAuthEvent('LOGOUT', {
        userId,
        reason
      })
    }
  } catch (error) {
    console.error('Logout logging failed:', error)
  }
}