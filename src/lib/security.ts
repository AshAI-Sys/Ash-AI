/**
 * Security Utilities
 * Centralized security functions and validations
 */

import { timingSafeEqual } from 'crypto'

/**
 * Validate that required environment variables are set
 */
export function validateRequiredEnvVars(): void {
  const required = [
    'NEXTAUTH_SECRET',
    'JWT_SECRET', 
    'DATABASE_URL',
    'WEBHOOK_SECRET'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these in your .env file for security.`
    )
  }
}

/**
 * Secure comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  const bufferA = Buffer.from(a, 'utf8')
  const bufferB = Buffer.from(b, 'utf8')
  
  return timingSafeEqual(bufferA, bufferB)
}

/**
 * Secure random string generation
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, length)
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
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
  
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier)
    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts
    }
    return Math.max(0, this.maxAttempts - record.count)
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }
  
  static sanitizeString(input: string, maxLength: number = 255): string {
    return input.trim().substring(0, maxLength)
  }
  
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }
  
  static hasSpecialChars(input: string): boolean {
    return /[<>\"'&]/.test(input)
  }
}

/**
 * Password policy enforcement
 */
export class PasswordPolicy {
  static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    // Check for common passwords
    const commonPasswords = [
      'password123', 'admin123456', 'qwerty123456', '123456789012'
    ]
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
}

/**
 * Apply security headers to NextJS response
 */
export function applySecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}