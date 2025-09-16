// @ts-nocheck
// Error Handler - CLIENT_UPDATED_PLAN.md Implementation
// Comprehensive error handling, logging, and monitoring system

import { NextResponse } from 'next/server'

// Error types for better categorization
export enum ErrorType {
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  BUSINESS = 'BUSINESS',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  RATE_LIMIT = 'RATE_LIMIT',
  SYSTEM = 'SYSTEM',
  API = 'API'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  userId?: string
  workspaceId?: string
  orderId?: string
  apiEndpoint?: string
  endpoint?: string
  userAgent?: string
  ip?: string
  requestId?: string
  timestamp?: string
  materialCode?: string
  materialId?: string
  alerts?: any
  error?: any
  alertType?: string
  reservations?: any
}

export interface ApplicationError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  context?: ErrorContext
  metadata?: Record<string, any>
  stack?: string
  retryable?: boolean
}

// Enhanced error logging with structured data
export async function logError(
  error: Error | string | ApplicationError,
  context?: string | ErrorContext,
  metadata?: Record<string, any>
): Promise<void> {
  let structuredError: ApplicationError

  if (typeof error === 'string') {
    structuredError = {
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      message: error,
      context: typeof context === 'object' ? context : { source: context },
      metadata,
      timestamp: new Date().toISOString()
    }
  } else if ('type' in error) {
    structuredError = {
      ...error,
      context: typeof context === 'object' ? context : error.context,
      metadata: { ...error.metadata, ...metadata },
      timestamp: new Date().toISOString()
    }
  } else {
    structuredError = {
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      stack: error.stack,
      context: typeof context === 'object' ? context : { source: context },
      metadata,
      timestamp: new Date().toISOString()
    }
  }

  // Console logging with severity-based styling
  const logLevel = structuredError.severity === ErrorSeverity.CRITICAL ? 'error' :
                   structuredError.severity === ErrorSeverity.HIGH ? 'error' :
                   structuredError.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info'

  console[logLevel](`[${structuredError.severity}] ${structuredError.type}: ${structuredError.message}`, {
    context: structuredError.context,
    metadata: structuredError.metadata,
    stack: structuredError.stack,
    retryable: structuredError.retryable
  })

  // In production, you would send to monitoring service like Sentry, DataDog, etc.
  if (process.env.NODE_ENV === 'production') {
    await sendToMonitoringService(structuredError)
  }
}

// Send error to monitoring service (placeholder for production implementation)
async function sendToMonitoringService(error: ApplicationError): Promise<void> {
  try {
    // This would integrate with your monitoring service
    // Example: Sentry, DataDog, LogRocket, etc.
    console.log('Would send to monitoring service:', error)
  } catch (monitoringError) {
    console.error('Failed to send error to monitoring service:', monitoringError)
  }
}

// Enhanced response creators with proper error handling
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  metadata?: Record<string, any>
) {
  return NextResponse.json({
    success: true,
    message: message || 'Success',
    data,
    metadata,
    timestamp: new Date().toISOString()
  }, { status: 200 })
}

export function createErrorResponse(
  error: string | ApplicationError,
  status: number = 500,
  context?: ErrorContext
) {
  let errorResponse: any

  if (typeof error === 'string') {
    errorResponse = {
      success: false,
      error: error,
      timestamp: new Date().toISOString()
    }
  } else {
    errorResponse = {
      success: false,
      error: error.message,
      type: error.type,
      severity: error.severity,
      retryable: error.retryable || false,
      context: error.context || context,
      timestamp: new Date().toISOString()
    }

    // Log the error automatically
    logError(error, context)
  }

  return NextResponse.json(errorResponse, { status })
}

// Validation error helper
export function createValidationError(
  field: string,
  message: string,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    message: `Validation failed for ${field}: ${message}`,
    context,
    retryable: false
  }
}

// Database error helper
export function createDatabaseError(
  operation: string,
  originalError: Error,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.DATABASE,
    severity: ErrorSeverity.HIGH,
    message: `Database ${operation} failed: ${originalError.message}`,
    stack: originalError.stack,
    context,
    retryable: true
  }
}

// Authentication error helper
export function createAuthenticationError(
  message: string = 'Authentication required',
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    message,
    context,
    retryable: false
  }
}

// Authorization error helper
export function createAuthorizationError(
  resource: string,
  action: string,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    message: `Access denied: Cannot ${action} ${resource}`,
    context,
    retryable: false
  }
}

// Not found error helper
export function createNotFoundError(
  resource: string,
  id?: string,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.LOW,
    message: `${resource}${id ? ` with ID ${id}` : ''} not found`,
    context,
    retryable: false
  }
}

// Business logic error helper
export function createBusinessLogicError(
  operation: string,
  reason: string,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    message: `Cannot ${operation}: ${reason}`,
    context,
    retryable: false
  }
}

// External service error helper
export function createExternalServiceError(
  service: string,
  originalError: Error,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    message: `External service ${service} failed: ${originalError.message}`,
    stack: originalError.stack,
    context,
    retryable: true
  }
}

// Rate limit error helper
export function createRateLimitError(
  limit: number,
  window: string,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    message: `Rate limit exceeded: ${limit} requests per ${window}`,
    context,
    retryable: true,
    metadata: { limit, window }
  }
}

// Error boundary helper for API routes
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof Error) {
        const appError = createDatabaseError('operation', error)
        await logError(appError)
        throw appError
      }
      throw error
    }
  }
}

// Health check error helper
export function createHealthCheckError(
  component: string,
  details: string,
  context?: ErrorContext
): ApplicationError {
  return {
    type: ErrorType.SYSTEM,
    severity: ErrorSeverity.CRITICAL,
    message: `Health check failed for ${component}: ${details}`,
    context,
    retryable: true
  }
}