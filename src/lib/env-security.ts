/**
 * Environment & Configuration Security
 * Secure environment variable validation and configuration management
 */

import { createHash } from 'crypto'
import { z } from 'zod'

// Environment variable validation schema
const environmentSchema = z.object({
  // Core application
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // Database
  DATABASE_URL: z.string()
    .url('Invalid DATABASE_URL')
    .refine((url) => url.includes('sslmode=require') || process.env.NODE_ENV !== 'production', 
      'Database SSL required in production'),
  
  // JWT & Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // Encryption
  DATA_ENCRYPTION_KEY: z.string().min(32, 'DATA_ENCRYPTION_KEY must be at least 32 characters').optional(),
  PASSWORD_PEPPER: z.string().min(16, 'PASSWORD_PEPPER must be at least 16 characters').optional(),
  
  // External APIs
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key format').optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'Invalid Stripe secret key format').optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Invalid Stripe publishable key format').optional(),
  
  // Webhooks
  WEBHOOK_SECRET: z.string().min(32, 'WEBHOOK_SECRET must be at least 32 characters'),
  
  // CSRF Protection
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters').optional(),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, 'SMTP_PORT must be numeric').optional(),
  SMTP_USER: z.string().email('Invalid SMTP_USER email').optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Cloud Storage (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  
  // Rate Limiting
  REDIS_URL: z.string().url('Invalid Redis URL').optional()
})

export class EnvironmentSecurity {
  private static validatedEnv: z.infer<typeof environmentSchema> | null = null
  private static configHash: string | null = null

  /**
   * Validate and secure all environment variables
   */
  static validateEnvironment(): z.infer<typeof environmentSchema> {
    if (this.validatedEnv) {
      return this.validatedEnv
    }

    try {
      // Validate environment variables
      const env = environmentSchema.parse(process.env)
      
      // Additional security checks
      this.performSecurityChecks(env)
      
      // Generate configuration hash for integrity checking
      this.configHash = this.generateConfigHash(env)
      
      this.validatedEnv = env
      console.log('[ENV_SECURITY] Environment validation successful')
      
      return env
    } catch (_error) {
      console.error('[ENV_SECURITY] Environment validation failed:', _error)
      
      // In production, terminate the application
      if (process.env.NODE_ENV === 'production') {
        console.error('[CRITICAL] Invalid environment configuration in production. Terminating.')
        process.exit(1)
      }
      
      throw _error
    }
  }

  /**
   * Perform additional security checks on environment variables
   */
  private static performSecurityChecks(env: z.infer<typeof environmentSchema>): void {
    const warnings: string[] = []
    const errors: string[] = []

    // Check for weak secrets
    if (this.isWeakSecret(env.NEXTAUTH_SECRET)) {
      errors.push('NEXTAUTH_SECRET is too weak')
    }

    if (this.isWeakSecret(env.JWT_SECRET)) {
      errors.push('JWT_SECRET is too weak')
    }

    if (env.WEBHOOK_SECRET && this.isWeakSecret(env.WEBHOOK_SECRET)) {
      errors.push('WEBHOOK_SECRET is too weak')
    }

    // Check for default/example values
    const defaultValues = ['default', 'example', 'changeme', 'secret', 'password', 'admin']
    if (defaultValues.some(val => env.NEXTAUTH_SECRET.toLowerCase().includes(val))) {
      errors.push('NEXTAUTH_SECRET appears to be a default value')
    }

    if (defaultValues.some(val => env.JWT_SECRET.toLowerCase().includes(val))) {
      errors.push('JWT_SECRET appears to be a default value')
    }

    // Production-specific checks
    if (env.NODE_ENV === 'production') {
      if (!env.DATABASE_URL.includes('sslmode=require')) {
        errors.push('Database SSL is required in production')
      }

      if (!env.DATA_ENCRYPTION_KEY) {
        warnings.push('DATA_ENCRYPTION_KEY not set - field-level encryption disabled')
      }

      if (!env.SENTRY_DSN) {
        warnings.push('SENTRY_DSN not set - error monitoring disabled')
      }

      if (!env.REDIS_URL) {
        warnings.push('REDIS_URL not set - advanced rate limiting disabled')
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('[ENV_SECURITY] Configuration warnings:', warnings)
    }

    // Throw errors
    if (errors.length > 0) {
      throw new Error(`Environment security check failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Check if a secret is weak
   */
  private static isWeakSecret(secret: string): boolean {
    // Must be at least 32 characters
    if (secret.length < 32) return true

    // Should contain mixed case, numbers, and symbols
    const hasLower = /[a-z]/.test(secret)
    const hasUpper = /[A-Z]/.test(secret)
    const hasNumbers = /[0-9]/.test(secret)
    const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(secret)

    // At least 3 out of 4 character types
    const charTypeCount = [hasLower, hasUpper, hasNumbers, hasSymbols].filter(Boolean).length
    if (charTypeCount < 3) return true

    // Check for common patterns
    const weakPatterns = [
      /(.)\1{3,}/, // Repeated characters
      /123456789/, // Sequential numbers
      /abcdefgh/, // Sequential letters
      /qwerty/, // Keyboard patterns
      /password/i,
      /secret/i,
      /admin/i
    ]

    return weakPatterns.some(pattern => pattern.test(secret))
  }

  /**
   * Generate hash of configuration for integrity checking
   */
  private static generateConfigHash(env: z.infer<typeof environmentSchema>): string {
    const configString = JSON.stringify({
      NODE_ENV: env.NODE_ENV,
      NEXTAUTH_URL: env.NEXTAUTH_URL,
      DATABASE_URL: env.DATABASE_URL.replace(/password=[^&]+/, 'password=***'), // Hide password
      hasEncryption: !!env.DATA_ENCRYPTION_KEY,
      hasEmailConfig: !!(env.SMTP_HOST && env.SMTP_USER),
      hasCloudStorage: !!(env.AWS_ACCESS_KEY_ID && env.AWS_S3_BUCKET),
      hasMonitoring: !!env.SENTRY_DSN,
      hasRateLimiting: !!env.REDIS_URL
    })

    return createHash('sha256').update(configString).digest('hex').substring(0, 16)
  }

  /**
   * Get validated environment variables
   */
  static getEnvironment(): z.infer<typeof environmentSchema> {
    if (!this.validatedEnv) {
      return this.validateEnvironment()
    }
    return this.validatedEnv
  }

  /**
   * Check configuration integrity
   */
  static checkIntegrity(): boolean {
    const currentHash = this.generateConfigHash(this.getEnvironment())
    const isIntact = currentHash === this.configHash

    if (!isIntact) {
      console.error('[ENV_SECURITY] Configuration integrity check failed!')
    }

    return isIntact
  }

  /**
   * Get secure configuration for client-side
   */
  static getClientConfig(): {
    NODE_ENV: string
    NEXTAUTH_URL: string
    STRIPE_PUBLISHABLE_KEY?: string
    hasFeatures: {
      openai: boolean
      stripe: boolean
      aws: boolean
      monitoring: boolean
    }
  } {
    const env = this.getEnvironment()
    
    return {
      NODE_ENV: env.NODE_ENV,
      NEXTAUTH_URL: env.NEXTAUTH_URL,
      STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
      hasFeatures: {
        openai: !!env.OPENAI_API_KEY,
        stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY),
        aws: !!(env.AWS_ACCESS_KEY_ID && env.AWS_S3_BUCKET),
        monitoring: !!env.SENTRY_DSN
      }
    }
  }

  /**
   * Security audit of environment configuration
   */
  static performSecurityAudit(): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const env = this.getEnvironment()
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100

    // Check secret strength
    if (this.isWeakSecret(env.NEXTAUTH_SECRET)) {
      issues.push('NEXTAUTH_SECRET is weak')
      recommendations.push('Generate a strong NEXTAUTH_SECRET (32+ chars, mixed case, numbers, symbols)')
      score -= 20
    }

    if (this.isWeakSecret(env.JWT_SECRET)) {
      issues.push('JWT_SECRET is weak')
      recommendations.push('Generate a strong JWT_SECRET (32+ chars, mixed case, numbers, symbols)')
      score -= 20
    }

    // Check encryption
    if (!env.DATA_ENCRYPTION_KEY) {
      issues.push('Field-level encryption not configured')
      recommendations.push('Set DATA_ENCRYPTION_KEY for sensitive data encryption')
      score -= 10
    }

    // Check production readiness
    if (env.NODE_ENV === 'production') {
      if (!env.SENTRY_DSN) {
        issues.push('Error monitoring not configured')
        recommendations.push('Configure Sentry for error monitoring and alerting')
        score -= 5
      }

      if (!env.REDIS_URL) {
        issues.push('Redis not configured')
        recommendations.push('Configure Redis for advanced rate limiting and caching')
        score -= 5
      }

      if (!env.SMTP_HOST || !env.SMTP_USER) {
        issues.push('Email service not configured')
        recommendations.push('Configure SMTP for transactional emails')
        score -= 5
      }
    }

    // Check database security
    if (!env.DATABASE_URL.includes('sslmode=require')) {
      issues.push('Database SSL not enforced')
      recommendations.push('Enable SSL/TLS for database connections')
      score -= 15
    }

    return { score, issues, recommendations }
  }

  /**
   * Generate secure secrets for development
   */
  static generateSecureSecrets(): Record<string, string> {
    const crypto = require('crypto')
    
    return {
      NEXTAUTH_SECRET: crypto.randomBytes(32).toString('hex'),
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      WEBHOOK_SECRET: crypto.randomBytes(32).toString('hex'),
      DATA_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      PASSWORD_PEPPER: crypto.randomBytes(16).toString('hex'),
      CSRF_SECRET: crypto.randomBytes(32).toString('hex')
    }
  }
}

// Configuration monitoring
export class ConfigurationMonitor {
  private static lastCheck = Date.now()
  private static checkInterval = 60 * 1000 // 1 minute

  /**
   * Start monitoring configuration integrity
   */
  static startMonitoring(): void {
    setInterval(() => {
      this.performIntegrityCheck()
    }, this.checkInterval)

    console.log('[CONFIG_MONITOR] Configuration monitoring started')
  }

  private static performIntegrityCheck(): void {
    try {
      if (!EnvironmentSecurity.checkIntegrity()) {
        console.error('[CONFIG_MONITOR] Configuration integrity compromised!')
        
        // In production, this might trigger an alert or shutdown
        if (process.env.NODE_ENV === 'production') {
          console.error('[CRITICAL] Configuration compromised in production')
          // Could implement automatic restart or alerting here
        }
      }
    } catch (_error) {
      console.error('[CONFIG_MONITOR] Integrity check failed:', _error)
    }
  }
}

// Initialize environment validation on import
try {
  EnvironmentSecurity.validateEnvironment()
} catch (_error) {
  // Allow the error to be handled by the application
  console.error('[ENV_SECURITY] Failed to validate environment on import:', _error)
}

export { environmentSchema }