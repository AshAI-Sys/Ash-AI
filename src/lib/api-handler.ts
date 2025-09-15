// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseConnection } from '@/lib/prisma'
import { Role } from '@prisma/client'
import {
  logError,
  createSuccessResponse,
  createErrorResponse,
  createDatabaseError,
  createAuthenticationError,
  createAuthorizationError,
  createValidationError,
  createRateLimitError,
  ErrorType,
  ErrorSeverity,
  type ErrorContext,
  type ApplicationError
} from '@/lib/error-handler'

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: any
  timestamp: string
  requestId: string
}

export class ApiException extends Error {
  code: string
  statusCode: number
  details?: any

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message)
    this.name = 'ApiException'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = identifier
  const windowStart = now - windowMs

  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < windowStart) {
      rateLimitStore.delete(k)
    }
  }

  const current = rateLimitStore.get(key)

  if (!current || current.resetTime < windowStart) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count++
  return true
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createApiError(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any,
  requestId?: string
): ApiError {
  return {
    code,
    message,
    statusCode,
    details,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  }
}

export function createApiResponse<T>(
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  requestId?: string
) {
  return NextResponse.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  }, { status: statusCode })
}

export function createApiErrorResponse(error: ApiError) {
  return NextResponse.json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      requestId: error.requestId
    }
  }, { status: error.statusCode })
}

export async function validateSession(requiredRoles?: Role[], context?: ErrorContext): Promise<any> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    const authError = createAuthenticationError('Authentication required', context)
    throw new ApiException('UNAUTHORIZED', authError.message, 401, authError)
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(session.user.role)) {
      const authzError = createAuthorizationError(
        'resource',
        'access',
        { ...context, userId: session.user.id }
      )
      throw new ApiException('FORBIDDEN', authzError.message, 403, {
        requiredRoles,
        userRole: session.user.role,
        applicationError: authzError
      })
    }
  }

  return session
}

export async function validateDatabaseConnection(): Promise<void> {
  try {
    await ensureDatabaseConnection()
  } catch (error) {
    throw new ApiException(
      'DATABASE_UNAVAILABLE',
      'Database connection failed',
      503,
      { error: error instanceof Error ? error.message : 'Unknown database error' }
    )
  }
}

export function withApiHandler(
  handler: (req: NextRequest, params?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requiredRoles?: Role[]
    rateLimit?: { limit: number; windowMs: number }
    validateDatabase?: boolean
  } = {}
) {
  return async (req: NextRequest, params?: any): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      // Rate limiting
      if (options.rateLimit) {
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        const identifier = `${clientIp}:${req.nextUrl.pathname}`

        if (!rateLimit(identifier, options.rateLimit.limit, options.rateLimit.windowMs)) {
          const rateLimitError = createRateLimitError(
            options.rateLimit.limit,
            `${options.rateLimit.windowMs}ms`,
            {
              apiEndpoint: req.nextUrl.pathname,
              ip: clientIp,
              requestId,
              timestamp: new Date().toISOString()
            }
          )
          throw new ApiException('RATE_LIMIT_EXCEEDED', rateLimitError.message, 429, rateLimitError)
        }
      }

      // Database validation
      if (options.validateDatabase !== false) {
        await validateDatabaseConnection()
      }

      // Authentication validation
      if (options.requireAuth !== false) {
        await validateSession(options.requiredRoles)
      }

      // Execute handler
      const response = await handler(req, params)

      // Add performance headers
      const duration = Date.now() - startTime
      response.headers.set('X-Request-ID', requestId)
      response.headers.set('X-Response-Time', `${duration}ms`)

      return response

    } catch (error) {
      // Create comprehensive error context
      const errorContext: ErrorContext = {
        apiEndpoint: req.nextUrl.pathname,
        userAgent: req.headers.get('user-agent') || undefined,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        requestId,
        timestamp: new Date().toISOString()
      }

      let applicationError: ApplicationError

      if (error instanceof ApiException) {
        // Convert existing ApiException to ApplicationError
        applicationError = {
          type: ErrorType.SYSTEM,
          severity: ErrorSeverity.MEDIUM,
          message: error.message,
          context: errorContext,
          metadata: { code: error.code, details: error.details },
          retryable: error.statusCode >= 500
        }
      } else if (error instanceof Error) {
        // Enhanced Prisma error handling
        if (error.message.includes('P2002')) {
          applicationError = createValidationError('unique_constraint', 'Duplicate entry found', errorContext)
        } else if (error.message.includes('P2025')) {
          applicationError = {
            type: ErrorType.NOT_FOUND,
            severity: ErrorSeverity.LOW,
            message: 'Record not found',
            context: errorContext,
            retryable: false
          }
        } else if (error.message.includes('P2003')) {
          applicationError = createValidationError('foreign_key', 'Foreign key constraint failed', errorContext)
        } else if (error.message.includes('P1001')) {
          applicationError = createDatabaseError('connection', error, errorContext)
        } else if (error.message.includes('P1008')) {
          applicationError = createDatabaseError('timeout', error, errorContext)
        } else {
          applicationError = createDatabaseError('operation', error, errorContext)
        }
      } else {
        applicationError = {
          type: ErrorType.SYSTEM,
          severity: ErrorSeverity.HIGH,
          message: 'An unknown error occurred',
          context: errorContext,
          metadata: { originalError: error },
          retryable: true
        }
      }

      // Log the error using our comprehensive logging system
      await logError(applicationError, errorContext)

      // Determine HTTP status code
      const statusCode = error instanceof ApiException ? error.statusCode :
                        applicationError.type === ErrorType.NOT_FOUND ? 404 :
                        applicationError.type === ErrorType.VALIDATION ? 400 :
                        applicationError.type === ErrorType.AUTHENTICATION ? 401 :
                        applicationError.type === ErrorType.AUTHORIZATION ? 403 :
                        applicationError.type === ErrorType.RATE_LIMIT ? 429 :
                        applicationError.type === ErrorType.DATABASE ? 503 : 500

      // Create comprehensive error response
      const errorResponse = {
        success: false,
        error: applicationError.message,
        type: applicationError.type,
        severity: applicationError.severity,
        retryable: applicationError.retryable || false,
        requestId,
        timestamp: new Date().toISOString(),
        context: process.env.NODE_ENV === 'development' ? applicationError.context : undefined,
        metadata: process.env.NODE_ENV === 'development' ? applicationError.metadata : undefined
      }

      const response = NextResponse.json(errorResponse, { status: statusCode })
      response.headers.set('X-Request-ID', requestId)
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)

      return response
    }
  }
}

// Utility functions for common API operations
export async function validateRequestBody<T>(req: NextRequest, schema?: any): Promise<T> {
  try {
    const body = await req.json()

    if (schema) {
      // Add validation logic here if using a schema validator like Zod
      // For now, just return the body
    }

    return body as T
  } catch (error) {
    throw new ApiException('INVALID_JSON', 'Invalid JSON in request body', 400)
  }
}

export function validateQueryParams(req: NextRequest, requiredParams: string[] = []): URLSearchParams {
  const searchParams = req.nextUrl.searchParams

  for (const param of requiredParams) {
    if (!searchParams.has(param)) {
      throw new ApiException('MISSING_PARAMETER', `Missing required parameter: ${param}`, 400, {
        requiredParams,
        providedParams: Array.from(searchParams.keys())
      })
    }
  }

  return searchParams
}

export async function paginateQuery<T>(
  query: any,
  page: number = 1,
  limit: number = 20
): Promise<{ data: T[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const skip = (page - 1) * limit
  const take = Math.min(limit, 100) // Max 100 items per page

  const [data, total] = await Promise.all([
    query.skip(skip).take(take),
    query.count ? query.count() : 0
  ])

  return {
    data,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take)
    }
  }
}

// Health check endpoint helper
export function createHealthCheck() {
  return withApiHandler(async (req: NextRequest) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: await ensureDatabaseConnection(),
      memory: process.memoryUsage(),
      pid: process.pid
    }

    return createApiResponse(health, 'System healthy')
  }, { requireAuth: false, validateDatabase: true })
}