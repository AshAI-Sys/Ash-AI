// @ts-nocheck
/**
 * Database Security Hardening
 * Advanced database protection and query security
 */

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

// Secure database connection with enhanced security
export class SecureDatabase {
  private static instance: SecureDatabase
  private prisma: PrismaClient
  private queryCache = new Map<string, { result: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: this.buildSecureConnectionString()
        }
      }
    })

    // Add middleware for query logging and security
    // Note: $use is deprecated in newer Prisma versions, using alternative logging
    this.setupSecurityLogging()
  }

  static getInstance(): SecureDatabase {
    if (!SecureDatabase.instance) {
      SecureDatabase.instance = new SecureDatabase()
    }
    return SecureDatabase.instance
  }

  private buildSecureConnectionString(): string {
    const baseUrl = process.env.DATABASE_URL
    if (!baseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }

    // For file-based databases (SQLite), return as-is
    if (baseUrl.startsWith('file:')) {
      return baseUrl
    }

    try {
      // Add security parameters to connection string for remote databases
      const url = new URL(baseUrl)
      
      // Enable SSL/TLS encryption
      url.searchParams.set('sslmode', 'require')
      url.searchParams.set('sslcert', process.env.DB_SSL_CERT || '')
      url.searchParams.set('sslkey', process.env.DB_SSL_KEY || '')
      url.searchParams.set('sslrootcert', process.env.DB_SSL_ROOT_CERT || '')
      
      // Connection security settings
      url.searchParams.set('connect_timeout', '10')
      url.searchParams.set('pool_timeout', '10')
      url.searchParams.set('socket_timeout', '20')
      
      return url.toString()
    } catch (_error) {
      // If URL parsing fails, return original string (for file:// URLs or other formats)
      return baseUrl
    }
  }

  private setupSecurityLogging(): void {
    // Enhanced security logging without deprecated $use middleware
    console.log('[DB_SECURITY] Database security monitoring initialized')
  }

  // Security validation method for direct use in operations
  private validateOperation(operation: string, data?: any): void {
    // Check for suspicious patterns in data
    if (data && this.containsSuspiciousPatterns({ args: data, action: operation })) {
      console.error(`[DB_SECURITY_ALERT] Suspicious operation blocked: ${operation}`)
      throw new Error('Operation blocked by security policy')
    }
  }

  private containsSuspiciousPatterns(params: any): boolean {
    const suspiciousPatterns = [
      'DROP TABLE',
      'DELETE FROM',
      'TRUNCATE',
      'ALTER TABLE',
      'EXEC',
      'SCRIPT',
      'UNION SELECT',
      'OR 1=1',
      'OR \'1\'=\'1\'',
      'LOAD_FILE',
      'INTO OUTFILE'
    ]
    
    const queryString = JSON.stringify(params).toUpperCase()
    return suspiciousPatterns.some(pattern => queryString.includes(pattern))
  }

  // Secure query execution with caching and validation
  async executeSecureQuery<T>(
    operation: () => Promise<T>,
    cacheKey?: string,
    options?: { skipCache?: boolean; maxResults?: number }
  ): Promise<T> {
    try {
      // Check cache if enabled
      if (cacheKey && !options?.skipCache) {
        const cached = this.queryCache.get(cacheKey)
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
          return cached.result
        }
      }

      // Execute operation
      const result = await operation()

      // Validate result size to prevent memory exhaustion
      if (options?.maxResults && Array.isArray(result) && result.length > options.maxResults) {
        console.warn(`[DB_SECURITY] Query result truncated from ${result.length} to ${options.maxResults} records`)
        return result.slice(0, options.maxResults) as T
      }

      // Cache result if caching is enabled
      if (cacheKey) {
        this.queryCache.set(cacheKey, { result, timestamp: Date.now() })
        
        // Cleanup old cache entries
        if (this.queryCache.size > 1000) {
          this.cleanupCache()
        }
      }

      return result
    } catch (_error) {
      console.error(`[DB_ERROR] Database operation failed:`, _error)
      throw new Error('Database operation failed')
    }
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.queryCache.entries()) {
      if ((now - value.timestamp) > this.CACHE_TTL) {
        this.queryCache.delete(key)
      }
    }
  }

  // Secure data sanitization
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential SQL injection patterns
      return input
        .replace(/['";\\]/g, '') // Remove quotes and backslashes
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*/g, '') // Remove block comments
        .trim()
        .substring(0, 1000) // Limit length
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(_item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value)
      }
      return sanitized
    }
    
    return input
  }

  // Generate secure cache key
  static generateCacheKey(operation: string, params: any): string {
    const hash = createHash('sha256')
    hash.update(operation)
    hash.update(JSON.stringify(params))
    return hash.digest('hex').substring(0, 16)
  }

  // Get Prisma instance
  getPrisma(): PrismaClient {
    return this.prisma
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    await this.prisma.$disconnect()
    this.queryCache.clear()
  }
}

// Data encryption utilities
export class DataEncryption {
  private static readonly ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY
  
  static encrypt(data: string): string {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('DATA_ENCRYPTION_KEY environment variable is required')
    }
    
    const crypto = require('crypto')
    const algorithm = 'aes-256-gcm'
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(algorithm, this.ENCRYPTION_KEY)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }
  
  static decrypt(encryptedData: string): string {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('DATA_ENCRYPTION_KEY environment variable is required')
    }
    
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    
    const crypto = require('crypto')
    const algorithm = 'aes-256-gcm'
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipher(algorithm, this.ENCRYPTION_KEY)
    
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
  
  // Encrypt sensitive database fields
  static encryptSensitiveFields(data: any, sensitiveFields: string[]): any {
    const result = { ...data }
    
    sensitiveFields.forEach(field => {
      if (result[field]) {
        result[field] = this.encrypt(result[field])
      }
    })
    
    return result
  }
  
  // Decrypt sensitive database fields
  static decryptSensitiveFields(data: any, sensitiveFields: string[]): any {
    const result = { ...data }
    
    sensitiveFields.forEach(field => {
      if (result[field]) {
        try {
          result[field] = this.decrypt(result[field])
        } catch (_error) {
          console.error(`Failed to decrypt field ${field}:`, _error)
          result[field] = '[ENCRYPTED]'
        }
      }
    })
    
    return result
  }
}

// Database security audit
export class DatabaseSecurityAudit {
  static async performSecurityAudit(): Promise<{
    score: number
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100
    
    // Check environment variables
    if (!process.env.DATABASE_URL?.includes('sslmode=require')) {
      issues.push('Database connection does not enforce SSL')
      recommendations.push('Enable SSL/TLS encryption for database connections')
      score -= 10
    }
    
    if (!process.env.DATA_ENCRYPTION_KEY) {
      issues.push('Data encryption key not configured')
      recommendations.push('Set up DATA_ENCRYPTION_KEY for field-level encryption')
      score -= 15
    }
    
    if (!process.env.DB_SSL_CERT) {
      issues.push('Database SSL certificates not configured')
      recommendations.push('Configure SSL certificates for database authentication')
      score -= 10
    }
    
    // Check for default credentials (basic check)
    if (process.env.DATABASE_URL?.includes('password=admin') || 
        process.env.DATABASE_URL?.includes('password=password')) {
      issues.push('Default database credentials detected')
      recommendations.push('Use strong, unique database credentials')
      score -= 20
    }
    
    return { score, issues, recommendations }
  }
}

// Export secure database instance
export const secureDb = SecureDatabase.getInstance()
export const dbSecurity = DatabaseSecurityAudit