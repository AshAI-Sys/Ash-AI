import { Role, PrintMethod } from '@prisma/client'
// Input validation and sanitization utilities

// Sanitize string input to prevent XSS and injection attacks
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"'&]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return escapeMap[match]
    })
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate numeric input
export function validateNumber(input: unknown, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number | null {
  const num = Number(input)
  if (isNaN(num) || num < min || num > max) return null
  return Math.floor(num) // Ensure integer
}

// Validate role
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role)
}

// Validate print method
export function isValidPrintMethod(method: string): method is PrintMethod {
  return Object.values(PrintMethod).includes(method as PrintMethod)
}

// Validate file type
export function isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType)
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number, resetTime: number }>()

export function isRateLimited(identifier: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return false
  }
  
  if (record.count >= maxRequests) {
    return true
  }
  
  record.count++
  return false
}

// Clean up expired rate limit records periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

// Validate JSON input safely
export function parseJSONSafely<T>(input: string, fallback: T): T {
  try {
    const parsed = JSON.parse(input)
    return parsed
  } catch {
    return fallback
  }
}

// Validate size breakdown object
export function validateSizeBreakdown(sizeBreakdown: unknown): { [key: string]: number } | null {
  if (!sizeBreakdown || typeof sizeBreakdown !== 'object') return null
  
  const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  const result: { [key: string]: number } = {}
  
  for (const [size, quantity] of Object.entries(sizeBreakdown)) {
    if (!validSizes.includes(size)) continue
    const num = validateNumber(quantity, 0, 10000)
    if (num !== null) {
      result[size] = num
    }
  }
  
  return result
}