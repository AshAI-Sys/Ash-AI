/**
 * Advanced Input Validation & XSS Protection
 * Comprehensive input sanitization and validation for maximum security
 */

import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

// Advanced input sanitization
export class InputSanitizer {
  // XSS Protection - Sanitize HTML content
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p'],
      ALLOWED_ATTR: [],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
      KEEP_CONTENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    })
  }

  // Remove all HTML tags completely
  static stripHtml(input: string): string {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true 
    })
  }

  // SQL Injection Prevention
  static sanitizeSqlInput(input: string): string {
    return input
      .replace(/['";\\]/g, '') // Remove quotes and backslashes
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comments  
      .replace(/\*/g, '') // Remove wildcards
      .replace(/;/g, '') // Remove semicolons
      .replace(/\b(DROP|DELETE|TRUNCATE|ALTER|EXEC|UNION|SELECT|INSERT|UPDATE)\b/gi, '') // Remove SQL keywords
      .trim()
  }

  // Command Injection Prevention
  static sanitizeCommandInput(input: string): string {
    return input
      .replace(/[;&|`$(){}[\]]/g, '') // Remove shell metacharacters
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[<>]/g, '') // Remove redirection operators
      .trim()
  }

  // Path Traversal Prevention
  static sanitizeFilePath(input: string): string {
    return input
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/\/+/g, '/') // Normalize multiple slashes
      .substring(0, 255) // Limit length
  }

  // Email sanitization
  static sanitizeEmail(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[<>"';\\]/g, '') // Remove dangerous characters
      .substring(0, 254) // RFC 5321 limit
  }

  // Phone number sanitization
  static sanitizePhoneNumber(input: string): string {
    return input
      .replace(/[^\d\s\-\+\(\)]/g, '') // Only allow digits, spaces, hyphens, plus, parentheses
      .trim()
      .substring(0, 20)
  }

  // URL sanitization
  static sanitizeUrl(input: string): string {
    try {
      const url = new URL(input)
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol')
      }
      
      // Block localhost and private IPs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = url.hostname.toLowerCase()
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
          throw new Error('Private URLs not allowed')
        }
      }
      
      return url.toString()
    } catch (error) {
      throw new Error('Invalid URL format')
    }
  }

  // Generic text sanitization
  static sanitizeText(input: string, maxLength: number = 1000): string {
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        }
        return entities[match] || match
      })
      .trim()
      .substring(0, maxLength)
  }

  // JSON sanitization
  static sanitizeJson(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input)
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJson(item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        // Sanitize both keys and values
        const sanitizedKey = this.sanitizeText(key, 100)
        sanitized[sanitizedKey] = this.sanitizeJson(value)
      }
      return sanitized
    }
    
    return input
  }
}

// Advanced validation schemas
export const SecuritySchemas = {
  // User input validation
  userInput: z.object({
    email: z.string()
      .email('Invalid email format')
      .max(254, 'Email too long')
      .refine((email) => {
        // Additional email validation
        const dangerous = ['<', '>', '"', "'", '&', 'javascript:', 'data:']
        return !dangerous.some(char => email.includes(char))
      }, 'Email contains dangerous characters'),
    
    password: z.string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password too long')
      .refine((pwd) => /[A-Z]/.test(pwd), 'Must contain uppercase letter')
      .refine((pwd) => /[a-z]/.test(pwd), 'Must contain lowercase letter')
      .refine((pwd) => /[0-9]/.test(pwd), 'Must contain number')
      .refine((pwd) => /[!@#$%^&*]/.test(pwd), 'Must contain special character'),
    
    name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .refine((name) => {
        const dangerous = ['<', '>', '"', "'", '&', 'script', 'javascript:']
        return !dangerous.some(char => name.toLowerCase().includes(char.toLowerCase()))
      }, 'Name contains dangerous characters'),
    
    phoneNumber: z.string()
      .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
      .max(20, 'Phone number too long'),
    
    url: z.string()
      .url('Invalid URL format')
      .refine((url) => {
        try {
          const parsed = new URL(url)
          return ['http:', 'https:'].includes(parsed.protocol)
        } catch {
          return false
        }
      }, 'Only HTTP/HTTPS URLs allowed')
  }),

  // API input validation
  apiInput: z.object({
    searchQuery: z.string()
      .max(500, 'Search query too long')
      .refine((query) => {
        const dangerous = ['<script', 'javascript:', 'data:', 'vbscript:', 'onload=']
        return !dangerous.some(pattern => query.toLowerCase().includes(pattern))
      }, 'Search query contains dangerous patterns'),
    
    sortField: z.enum(['name', 'date', 'status', 'priority', 'id'])
      .optional(),
    
    sortOrder: z.enum(['asc', 'desc'])
      .optional(),
    
    pageSize: z.number()
      .min(1, 'Page size must be at least 1')
      .max(100, 'Page size too large')
      .optional()
      .default(20),
    
    page: z.number()
      .min(1, 'Page must be at least 1')
      .max(1000, 'Page number too large')
      .optional()
      .default(1)
  }),

  // File upload validation
  fileUpload: z.object({
    filename: z.string()
      .min(1, 'Filename required')
      .max(255, 'Filename too long')
      .refine((name) => {
        // Only allow safe file extensions
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xlsx']
        return allowedExtensions.some(ext => name.toLowerCase().endsWith(ext))
      }, 'File type not allowed')
      .refine((name) => {
        // Block dangerous filenames
        const dangerous = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']
        return !dangerous.some(char => name.includes(char))
      }, 'Filename contains dangerous characters'),
    
    mimeType: z.enum([
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]),
    
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(10 * 1024 * 1024, 'File too large (max 10MB)')
  })
}

// Rate limiting for input validation
class ValidationRateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>()
  private readonly maxAttempts = 100
  private readonly windowMs = 60 * 1000 // 1 minute

  isRateLimited(identifier: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(identifier)
    
    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return false
    }
    
    record.count++
    return record.count > this.maxAttempts
  }
}

// Content Security Policy helpers
export class CSPHelper {
  static generateNonce(): string {
    return require('crypto').randomBytes(16).toString('base64')
  }
  
  static buildCSP(nonce: string): string {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://api.stripe.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  }
}

// Anti-CSRF token management
export class CSRFProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-me'
  
  static generateToken(sessionId: string): string {
    const crypto = require('crypto')
    const timestamp = Date.now().toString()
    const payload = `${sessionId}:${timestamp}`
    const signature = crypto.createHmac('sha256', this.SECRET).update(payload).digest('hex')
    
    return Buffer.from(`${payload}:${signature}`).toString('base64')
  }
  
  static verifyToken(token: string, sessionId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [receivedSessionId, timestamp, signature] = decoded.split(':')
      
      // Check session ID matches
      if (receivedSessionId !== sessionId) {
        return false
      }
      
      // Check token age (valid for 1 hour)
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 60 * 60 * 1000) {
        return false
      }
      
      // Verify signature
      const payload = `${receivedSessionId}:${timestamp}`
      const expectedSignature = require('crypto')
        .createHmac('sha256', this.SECRET)
        .update(payload)
        .digest('hex')
      
      return signature === expectedSignature
    } catch (error) {
      return false
    }
  }
}

export const inputSanitizer = new InputSanitizer()
export const validationRateLimiter = new ValidationRateLimiter()