// @ts-nocheck
import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window)

// Sanitization utilities
export const sanitizeString = (input: string | undefined | null): string => {
  if (!input) return ''
  // Remove HTML tags and clean up string
  return purify.sanitize(input.toString().trim(), { ALLOWED_TAGS: [] })
}

export const sanitizeNumber = (input: unknown): number => {
  const str = typeof input === 'string' || typeof input === 'number' ? String(input) : ''
  const num = parseFloat(str)
  return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num)
}

// Order validation schema with sanitization
export const orderValidationSchema = z.object({
  // Client & Brand - Required and validated
  client_id: z.string().uuid('Invalid client ID').optional(),
  brand_id: z.string().uuid('Invalid brand ID'),
  channel: z.string().max(50).optional().transform(sanitizeString),
  
  // Product & Design - Required with constraints
  productType: z.enum(['Tee', 'Hoodie', 'Jersey', 'Uniform', 'Custom'], {
    errorMap: () => ({ message: 'Invalid product type' })
  }),
  method: z.enum(['Silkscreen', 'Sublimation', 'DTF', 'Embroidery'], {
    errorMap: () => ({ message: 'Invalid printing method' })
  }),
  
  // Quantities - Strict validation
  total_qty: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100000, 'Quantity too large'),
    
  sizeCurve: z.record(z.string(), z.number().int().min(0))
    .refine(
      (curve) => Object.keys(curve).every(size => 
        ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(size)
      ),
      'Invalid size in size curve'
    ),
    
  variants: z.array(z.object({
    color: z.string().max(50).transform(sanitizeString),
    qty: z.number().int().min(0)
  })).optional(),
  
  addons: z.array(z.string().max(100).transform(sanitizeString)).optional(),
  
  // Dates - Proper date validation
  target_delivery_date: z.string().refine(
    (date) => {
      const parsed = new Date(date)
      const now = new Date()
      return parsed > now && parsed <= new Date(new Date(now).getTime() + 365 * 24 * 60 * 60 * 1000)
    },
    'Delivery date must be in the future and within 1 year'
  ),
  
  // Commercial terms - Financial validation
  unitPrice: z.number().min(0).max(1000000),
  depositPercentage: z.number().int().min(0).max(100),
  paymentTerms: z.enum(['50/50', 'net 15', 'net 30', '100% advance']),
  taxMode: z.enum(['VAT_INCLUSIVE', 'VAT_EXCLUSIVE']),
  currency: z.literal('PHP'), // Only PHP allowed for now
  
  // Route template - Validated against allowed templates
  routeTemplateKey: z.enum([
    'SILK_OPTION_A',
    'SILK_OPTION_B', 
    'SUBLIMATION_DEFAULT',
    'DTF_DEFAULT',
    'EMBROIDERY_DEFAULT'
  ]),
  
  // Notes - Sanitized text
  notes: z.string().max(2000).optional().transform(sanitizeString),
  
  // Action type
  action: z.enum(['draft', 'create', 'send']).default('create')
})

// Size curve validation helper
export const validateSizeCurve = (sizeCurve: Record<string, number>, total_qty: number) => {
  const total = Object.values(sizeCurve).reduce((sum, qty) => sum + qty, 0)
  return total === total_qty
}

// File validation for uploads
export const validateFile = (file: File) => {
  const allowedTypes = [
    'image/png', 
    'image/jpeg', 
    'image/jpg',
    'application/pdf',
    'application/postscript' // .ai files
  ]
  
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only PNG, JPG, PDF, and AI files are allowed.')
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.')
  }
  
  return true
}

// Rate limiting validation
export const validateRateLimit = (userRequestCount: number, maxRequests: number = 5) => {
  if (userRequestCount > maxRequests) {
    throw new Error('Too many requests. Please wait before creating another order.')
  }
  return true
}

export type OrderValidationData = z.infer<typeof orderValidationSchema>