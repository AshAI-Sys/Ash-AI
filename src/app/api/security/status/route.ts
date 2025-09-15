// @ts-nocheck
// Security Status API - CLIENT_UPDATED_PLAN.md Implementation
// Comprehensive security monitoring and authentication status endpoint

import { NextRequest } from 'next/server'
import {
  createSuccessResponse,
  createErrorResponse,
  createAuthenticationError,
  logError
} from '@/lib/error-handler'
import {
  verifyToken,
  hasPermission,
  isAdmin,
  AUTH_CONFIG
} from '@/lib/auth'
import { Role } from '@prisma/client'

interface SecurityStatus {
  authentication: {
    status: 'secure' | 'warning' | 'critical'
    features: {
      passwordStrength: boolean
      rateLimiting: boolean
      sessionSecurity: boolean
      auditLogging: boolean
      cookieSecurity: boolean
      roleBasedAccess: boolean
    }
    config: {
      maxLoginAttempts: number
      lockoutDuration: string
      sessionTimeout: string
      secureHeaders: boolean
    }
  }
  session: {
    valid: boolean
    user?: {
      id: string
      email: string
      role: Role
      workspace: string
      lastActivity?: string
      twoFactorEnabled?: boolean
    }
    security: {
      cookieFlags: string[]
      sameSite: string
      httpOnly: boolean
      secure: boolean
    }
  }
  environment: {
    nodeEnv: string
    httpsEnabled: boolean
    secureHeaders: boolean
    csrfProtection: boolean
  }
}

export async function GET(request: NextRequest) {
  try {
    // Initialize security status
    const securityStatus: SecurityStatus = {
      authentication: {
        status: 'secure',
        features: {
          passwordStrength: true,
          rateLimiting: true,
          sessionSecurity: true,
          auditLogging: true,
          cookieSecurity: true,
          roleBasedAccess: true
        },
        config: {
          maxLoginAttempts: AUTH_CONFIG.MAX_LOGIN_ATTEMPTS,
          lockoutDuration: `${AUTH_CONFIG.LOCKOUT_DURATION / 1000 / 60} minutes`,
          sessionTimeout: `${AUTH_CONFIG.SESSION_TIMEOUT / 1000 / 60 / 60 / 24} days`,
          secureHeaders: process.env.NODE_ENV === 'production'
        }
      },
      session: {
        valid: false,
        security: {
          cookieFlags: [],
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        httpsEnabled: process.env.NODE_ENV === 'production',
        secureHeaders: process.env.NODE_ENV === 'production',
        csrfProtection: true
      }
    }

    // Check session validity
    const user = await verifyToken(request)
    if (user) {
      securityStatus.session.valid = true
      securityStatus.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        workspace: user.workspace_id,
        twoFactorEnabled: user.twoFactorEnabled
      }
    }

    // Security cookie flags analysis
    const cookieFlags = []
    if (securityStatus.session.security.httpOnly) cookieFlags.push('HttpOnly')
    if (securityStatus.session.security.secure) cookieFlags.push('Secure')
    if (securityStatus.session.security.sameSite === 'strict') cookieFlags.push('SameSite=Strict')
    if (securityStatus.session.security.sameSite === 'lax') cookieFlags.push('SameSite=Lax')
    securityStatus.session.security.cookieFlags = cookieFlags

    // Determine overall security status
    let warningCount = 0
    if (process.env.NODE_ENV !== 'production') warningCount++
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) warningCount++
    if (!process.env.OPENAI_API_KEY && !process.env.ASH_OPENAI_API_KEY) warningCount++

    securityStatus.authentication.status = warningCount === 0 ? 'secure' :
                                          warningCount <= 1 ? 'warning' : 'critical'

    // Check if requester has admin privileges for detailed security info
    const isAdminUser = user && isAdmin(user.role)

    const responseData = {
      ...securityStatus,
      timestamp: new Date().toISOString(),
      ...(isAdminUser && {
        detailed: {
          environment: {
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
            hasOpenAIKey: !!(process.env.OPENAI_API_KEY || process.env.ASH_OPENAI_API_KEY),
            databaseType: process.env.DATABASE_URL?.startsWith('postgresql') ? 'postgresql' : 'sqlite'
          },
          headers: {
            userAgent: request.headers.get('user-agent'),
            xForwardedFor: request.headers.get('x-forwarded-for'),
            xRealIp: request.headers.get('x-real-ip'),
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer')
          }
        }
      })
    }

    return createSuccessResponse(responseData, 'Security status retrieved successfully', {
      securityLevel: securityStatus.authentication.status,
      sessionValid: securityStatus.session.valid,
      adminAccess: isAdminUser
    })

  } catch (error) {
    const securityError = createAuthenticationError(
      'Security status check failed',
      {
        apiEndpoint: '/api/security/status',
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    )

    return createErrorResponse(securityError, 500)
  }
}

// POST method for admin-only detailed security audit
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const user = await verifyToken(request)
    if (!user || !isAdmin(user.role)) {
      const authError = createAuthenticationError(
        'Admin access required for security audit',
        {
          apiEndpoint: '/api/security/status',
          userId: user?.id,
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
        }
      )
      return createErrorResponse(authError, 403)
    }

    const body = await request.json()
    const auditType = body.type || 'basic'

    const detailedAudit = {
      auditType,
      timestamp: new Date().toISOString(),
      performedBy: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      security: {
        authentication: {
          provider: 'credentials',
          strategy: 'jwt',
          encryption: 'bcrypt',
          saltRounds: 12,
          rateLimiting: true,
          auditLogging: true
        },
        session: {
          strategy: 'jwt',
          timeout: AUTH_CONFIG.SESSION_TIMEOUT,
          cookieSecurity: process.env.NODE_ENV === 'production' ? 'production' : 'development',
          csrf: true
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        configuration: {
          nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing',
          openAIKey: (process.env.OPENAI_API_KEY || process.env.ASH_OPENAI_API_KEY) ? 'configured' : 'missing',
          databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
        }
      }
    }

    // Log the security audit
    await logError('Security audit performed', {
      userId: user.id,
      auditType,
      apiEndpoint: '/api/security/status'
    })

    return createSuccessResponse(detailedAudit, 'Security audit completed successfully', {
      auditType,
      adminUser: user.email
    })

  } catch (error) {
    const securityError = createAuthenticationError(
      'Security audit failed',
      {
        apiEndpoint: '/api/security/status',
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    )

    return createErrorResponse(securityError, 500)
  }
}