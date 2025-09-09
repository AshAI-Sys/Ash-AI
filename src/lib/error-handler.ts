// Global Error Handler for ASH AI - Implementing CLIENT_UPDATED_PLAN.md Priority 1

export interface APIError {
  success: false
  error: string
  code?: string
  details?: any
}

export interface APISuccess<T = any> {
  success: true
  data: T
  message?: string
}

export type APIResponse<T = any> = APISuccess<T> | APIError

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
  
  public readonly details?: any
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'DATABASE_ERROR')
    this.originalError = originalError
  }
  
  public readonly originalError?: any
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

// API Error Response Helper
export function createErrorResponse(error: any): APIError {
  console.error('API Error:', error)
  
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      ...(error instanceof ValidationError && { details: error.details })
    }
  }
  
  // Handle Prisma errors
  if (error?.code?.startsWith('P')) {
    return {
      success: false,
      error: 'Database operation failed',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  }
  
  // Generic error
  return {
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? error?.message || 'Unknown error occurred'
      : 'Internal server error',
    code: 'INTERNAL_ERROR'
  }
}

// API Success Response Helper
export function createSuccessResponse<T>(data: T, message?: string): APISuccess<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  }
}

// Async Error Wrapper
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      throw error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      )
    }
  }
}

// Log error for monitoring
export function logError(error: any, context?: string) {
  const errorDetails = {
    message: error?.message,
    stack: error?.stack,
    code: error?.code,
    statusCode: error?.statusCode,
    context,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { error })
  }
  
  console.error('Application Error:', errorDetails)
  
  // In production, you would send this to monitoring service
  // e.g., Sentry, LogRocket, etc.
}