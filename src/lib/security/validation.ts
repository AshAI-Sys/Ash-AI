// Security Validation and Sanitization Library
import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify for server-side
const window = new JSDOM('').window
const purify = DOMPurify(window as unknown as Window & typeof globalThis)

// Input validation schemas
export const schemas = {
  // AI Chat input validation
  aiChatInput: z.object({
    action: z.enum(['generateWeeklyReport', 'analyzeBusinessHealth', 'chat']),
    data: z.object({
      message: z.string().max(1000).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      conversation_history: z.array(z.object({
        type: z.string(),
        content: z.string(),
        timestamp: z.date()
      })).optional(),
    }).optional(),
  }),

  // Alert management validation
  alertAction: z.object({
    action: z.enum(['acknowledge', 'resolve', 'ignore', 'process']),
    alertId: z.string().uuid(),
    note: z.string().max(500).optional(),
  }),

  // Task management validation
  taskAction: z.object({
    action: z.enum(['start', 'pause', 'complete', 'reject']),
    notes: z.string().max(1000).optional(),
  }),

  // Order ID validation
  orderId: z.string().uuid(),

  // User ID validation  
  userId: z.string().uuid(),

  // Pagination validation
  pagination: z.object({
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  }),

  // Search query validation
  searchQuery: z.string().max(100).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid search characters'),

  // File upload validation
  fileUpload: z.object({
    filename: z.string().max(255).regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Invalid filename'),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
    type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  }),
}

// Sanitization functions
export const sanitize = {
  // Sanitize HTML content
  html: (input: string): string => {
    if (!input) return ''
    return purify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p'],
      ALLOWED_ATTR: [],
    })
  },

  // Sanitize text input (remove potentially dangerous characters)
  text: (input: string): string => {
    if (!input) return ''
    return input
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 1000) // Limit length
  },

  // Sanitize SQL input (for search queries)
  sql: (input: string): string => {
    if (!input) return ''
    return input
      .replace(/[;'"\\]/g, '') // Remove SQL injection characters
      .replace(/\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|UNION|SELECT)\b/gi, '') // Remove SQL keywords
      .trim()
      .substring(0, 100)
  },

  // Sanitize file paths
  filename: (input: string): string => {
    if (!input) return ''
    return input
      .replace(/[^a-zA-Z0-9\-_\.]/g, '') // Only allow safe characters
      .substring(0, 255)
  },
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = {
  // Check if request should be rate limited
  check: (key: string, maxRequests: number = 60, windowMs: number = 60000): boolean => {
    const now = Date.now()
    const record = rateLimitStore.get(key)

    if (!record || now > record.resetTime) {
      // Reset or initialize
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (record.count >= maxRequests) {
      return false // Rate limited
    }

    record.count++
    return true
  },

  // Get remaining requests
  remaining: (key: string, maxRequests: number = 60): number => {
    const record = rateLimitStore.get(key)
    if (!record) return maxRequests
    return Math.max(0, maxRequests - record.count)
  },
}

// CSRF token generation and validation
const csrfTokens = new Set<string>()

export const csrf = {
  // Generate CSRF token
  generateToken: (): string => {
    const token = crypto.randomUUID()
    csrfTokens.add(token)
    // Clean up old tokens after 1 hour
    setTimeout(() => csrfTokens.delete(token), 60 * 60 * 1000)
    return token
  },

  // Validate CSRF token
  validateToken: (token: string): boolean => {
    if (!token || !csrfTokens.has(token)) {
      return false
    }
    csrfTokens.delete(token) // One-time use
    return true
  },
}

// Security headers
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

// Audit logging
export const auditLog = {
  log: async (event: {
    action: string
    userId?: string
    ip?: string
    userAgent?: string
    resource?: string
    success: boolean
    error?: string
  }) => {
    // In production, send to secure logging service
    console.log(`[AUDIT] ${new Date().toISOString()}`, {
      ...event,
      timestamp: new Date().toISOString(),
    })
  },
}

// Error sanitization (prevent information leakage)
export const sanitizeError = (error: unknown, isDevelopment: boolean = false): string => {
  if (isDevelopment && error instanceof Error) {
    return error.message
  }
  
  // Generic error message for production
  return 'An error occurred while processing your request'
}

// Input validation middleware helper
export const validateInput = <T>(schema: z.ZodSchema<T>, input: unknown): { success: true; data: T } | { success: false; error: string } => {
  try {
    const data = schema.parse(input)
    return { success: true, data }
  } catch (_error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ')
      }
    }
    return { success: false, error: 'Invalid input format' }
  }
}