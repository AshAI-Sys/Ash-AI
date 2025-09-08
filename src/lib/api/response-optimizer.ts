import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export class ResponseOptimizer {
  private static readonly API_VERSION = '1.0.0';

  static success<T>(
    data: T,
    options: {
      message?: string;
      pagination?: ApiResponse<T>['pagination'];
      status?: number;
      headers?: Record<string, string>;
    } = {}
  ) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message: options.message,
      pagination: options.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Version': this.API_VERSION,
      'Cache-Control': 'no-store, must-revalidate',
      ...options.headers
    };

    return NextResponse.json(response, {
      status: options.status || 200,
      headers
    });
  }

  static error(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: unknown;
      headers?: Record<string, string>;
    } = {}
  ) {
    const response: ApiResponse = {
      success: false,
      error: message,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.API_VERSION,
      }
    };

    if (options.details) {
      response.meta = { ...response.meta, details: options.details };
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Version': this.API_VERSION,
      ...options.headers
    };

    return NextResponse.json(response, {
      status: options.status || 400,
      headers
    });
  }

  static paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
    },
    options: {
      message?: string;
      status?: number;
      cacheHeaders?: boolean;
    } = {}
  ) {
    const totalPages = Math.ceil(pagination.totalCount / pagination.limit);

    const headers: Record<string, string> = {
      'X-Total-Count': pagination.totalCount.toString(),
      'X-Page': pagination.page.toString(),
      'X-Per-Page': pagination.limit.toString(),
      'X-Total-Pages': totalPages.toString(),
    };

    if (options.cacheHeaders) {
      headers['Cache-Control'] = 'public, max-age=300'; // 5 minutes
      headers['ETag'] = `"${this.generateETag(data)}"`;
    }

    return this.success(data, {
      message: options.message,
      pagination: {
        ...pagination,
        totalPages
      },
      status: options.status,
      headers
    });
  }

  private static generateETag(data: unknown): string {
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  static cached<T>(
    data: T,
    options: {
      maxAge?: number;
      staleWhileRevalidate?: number;
      etag?: string;
      lastModified?: Date;
    } = {}
  ) {
    const {
      maxAge = 300,
      staleWhileRevalidate = 600,
      etag,
      lastModified
    } = options;

    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    };

    if (etag) {
      headers['ETag'] = `"${etag}"`;
    }

    if (lastModified) {
      headers['Last-Modified'] = lastModified.toUTCString();
    }

    return this.success(data, { headers });
  }

  static notModified() {
    return new NextResponse(null, {
      status: 304,
      headers: {
        'Cache-Control': 'public, max-age=300',
      }
    });
  }

  static stream(data: ReadableStream, options: {
    contentType?: string;
    filename?: string;
  } = {}) {
    const headers: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream',
      'Transfer-Encoding': 'chunked',
    };

    if (options.filename) {
      headers['Content-Disposition'] = `attachment; filename="${options.filename}"`;
    }

    return new NextResponse(data, { headers });
  }
}

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (_error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}

export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (_error) {
    console.error('API Error:', error);
    
    if (error instanceof z.ZodError) {
      return ResponseOptimizer.error('Validation failed', {
        status: 400,
        details: error.errors
      });
    }

    if (error instanceof Error) {
      return ResponseOptimizer.error(error.message, {
        status: 500
      });
    }

    return ResponseOptimizer.error('Internal server error', {
      status: 500
    });
  }
}

export function createApiHandler<T>(
  handler: (request: Request) => Promise<T>,
  options: {
    validation?: z.ZodSchema;
    auth?: boolean;
    rateLimit?: {
      requests: number;
      window: number;
    };
  } = {}
) {
  return async (request: Request) => {
    return withErrorHandling(async () => {
      if (options.rateLimit) {
        const rateLimitResult = await checkRateLimit(request, options.rateLimit);
        if (!rateLimitResult.allowed) {
          return ResponseOptimizer.error('Rate limit exceeded', {
            status: 429,
            headers: {
              'X-RateLimit-Limit': options.rateLimit.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + options.rateLimit.window).toISOString()
            }
          });
        }
      }

      if (options.validation && request.method !== 'GET') {
        const body = await request.json();
        const validation = validateRequest(options.validation, body);
        if (!validation.success) {
          return ResponseOptimizer.error(validation.error, { status: 400 });
        }
      }

      return await handler(request);
    });
  };
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(
  request: Request,
  limit: { requests: number; window: number }
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `${ip}:${Math.floor(Date.now() / limit.window)}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current) {
    rateLimitStore.set(key, { count: 1, resetTime: Date.now() + limit.window });
    return { allowed: true, remaining: limit.requests - 1 };
  }
  
  if (current.count >= limit.requests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: limit.requests - current.count };
}

export function compressResponse(data: unknown): string {
  const jsonString = JSON.stringify(data);
  
  // Simple compression for demonstration
  // In production, use gzip or brotli
  return jsonString;
}

export function optimizeQuery(query: Record<string, unknown>) {
  const optimized = { ...query };
  
  // Remove empty values
  Object.keys(optimized).forEach(key => {
    if (optimized[key] === '' || optimized[key] === null || optimized[key] === undefined) {
      delete optimized[key];
    }
  });
  
  // Convert string numbers to actual numbers
  Object.keys(optimized).forEach(key => {
    const value = optimized[key];
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      optimized[key] = parseInt(value, 10);
    }
  });
  
  return optimized;
}

export class PerformanceTracker {
  private static metrics = new Map<string, number[]>();

  static startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1000000; // Convert to milliseconds
    };
  }

  static recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  static getMetrics(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { avg, min, max, count: values.length };
  }

  static getAllMetrics() {
    const result: Record<string, ReturnType<typeof this.getMetrics>> = {};
    
    for (const [name] of this.metrics) {
      result[name] = this.getMetrics(name);
    }
    
    return result;
  }
}