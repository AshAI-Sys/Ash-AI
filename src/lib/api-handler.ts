// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseConnection } from '@/lib/prisma'
import { Role } from '@prisma/client'

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

export async function validateSession(requiredRoles?: Role[]): Promise<any> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    throw new ApiException('UNAUTHORIZED', 'Authentication required', 401)
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(session.user.role)) {
      throw new ApiException('FORBIDDEN', 'Insufficient permissions', 403, {
        requiredRoles,
        userRole: session.user.role
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
          throw new ApiException('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
            limit: options.rateLimit.limit,
            windowMs: options.rateLimit.windowMs
          })
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
      console.error(`API Error [${requestId}]:`, error)

      let apiError: ApiError

      if (error instanceof ApiException) {
        apiError = createApiError(error.code, error.message, error.statusCode, error.details, requestId)
      } else if (error instanceof Error) {
        // Handle Prisma errors
        if (error.message.includes('P2002')) {
          apiError = createApiError('DUPLICATE_ENTRY', 'Duplicate entry found', 409, { originalError: error.message }, requestId)
        } else if (error.message.includes('P2025')) {
          apiError = createApiError('NOT_FOUND', 'Record not found', 404, { originalError: error.message }, requestId)
        } else if (error.message.includes('P2003')) {
          apiError = createApiError('FOREIGN_KEY_CONSTRAINT', 'Foreign key constraint failed', 400, { originalError: error.message }, requestId)
        } else {
          apiError = createApiError('INTERNAL_ERROR', error.message || 'An unexpected error occurred', 500, { originalError: error.message }, requestId)
        }
      } else {
        apiError = createApiError('UNKNOWN_ERROR', 'An unknown error occurred', 500, { error }, requestId)
      }

      return createApiErrorResponse(apiError)
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