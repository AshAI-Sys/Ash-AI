// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface APISuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export type APIResponse<T = any> = APISuccess<T> | APIError;

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<APISuccess<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status: statusCode });
}

export function createErrorResponse(
  error: string | Error | AppError,
  statusCode: number = 500,
  details?: any
): NextResponse<APIError> {
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  if (typeof error === 'string') {
    message = error;
    code = 'GENERIC_ERROR';
  } else if (error instanceof AppError) {
    code = error.code;
    message = error.message;
    statusCode = error.statusCode;
    details = error.details;
  } else if (error instanceof ZodError) {
    code = 'VALIDATION_ERROR';
    message = 'Invalid input data';
    statusCode = 400;
    details = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    code = `PRISMA_${error.code}`;
    message = getPrismaErrorMessage(error);
    statusCode = 400;
    details = { prismaCode: error.code };
  } else if (error instanceof Error) {
    message = error.message;
    code = 'APPLICATION_ERROR';
  }

  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  }, { status: statusCode });
}

function getPrismaErrorMessage(error: Prisma.PrismaClientKnownRequestError): string {
  switch (error.code) {
    case 'P2002':
      return 'A record with this information already exists';
    case 'P2025':
      return 'Record not found';
    case 'P2003':
      return 'Foreign key constraint failed';
    case 'P2016':
      return 'Query interpretation error';
    case 'P2021':
      return 'Table does not exist in current database';
    case 'P2022':
      return 'Column does not exist in current database';
    default:
      return 'Database operation failed';
  }
}

export function withErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      
      // Log error for monitoring
      if (process.env.NODE_ENV === 'production') {
        // In production, you would send this to your logging service
        console.error('Production API Error:', {
          url: request.url,
          method: request.method,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      }

      return createErrorResponse(error as Error);
    }
  };
}

// Common error types
export const Errors = {
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: new AppError('FORBIDDEN', 'Access denied', 403),
  NOT_FOUND: new AppError('NOT_FOUND', 'Resource not found', 404),
  VALIDATION_FAILED: new AppError('VALIDATION_FAILED', 'Invalid input data', 400),
  INTERNAL_ERROR: new AppError('INTERNAL_ERROR', 'Internal server error', 500),
  DATABASE_ERROR: new AppError('DATABASE_ERROR', 'Database operation failed', 500),
  ORDER_NOT_FOUND: new AppError('ORDER_NOT_FOUND', 'Order not found', 404),
  CLIENT_NOT_FOUND: new AppError('CLIENT_NOT_FOUND', 'Client not found', 404),
  PRODUCTION_ERROR: new AppError('PRODUCTION_ERROR', 'Production operation failed', 500),
  QUALITY_CONTROL_ERROR: new AppError('QUALITY_CONTROL_ERROR', 'Quality control operation failed', 500)
};

// Rate limiting helper
const requestCounts = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now - record.lastReset > windowMs) {
    requestCounts.set(identifier, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Health check helper
export async function checkSystemHealth() {
  const health = {
    database: false,
    timestamp: new Date().toISOString(),
    services: {
      auth: true,
      api: true,
      ai: process.env.OPENAI_API_KEY ? true : false
    }
  };

  try {
    // Check database connection
    const { db } = await import('./db');
    await db.$queryRaw`SELECT 1`;
    health.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  return health;
}