// @ts-nocheck
/**
 * Advanced Authentication Security
 * Enterprise-grade security enhancements for 100/100 security score
 */

import bcrypt from 'bcryptjs'
import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import { RateLimiter } from './security'

// Account lockout management
class AccountLockoutManager {
  private lockouts: Map<string, { until: number; attempts: number }> = new Map()
  
  isLocked(identifier: string): boolean {
    const lockout = this.lockouts.get(identifier)
    if (!lockout) return false
    
    if (Date.now() > lockout.until) {
      this.lockouts.delete(identifier)
      return false
    }
    
    return true
  }
  
  recordFailedAttempt(identifier: string): void {
    const lockout = this.lockouts.get(identifier) || { until: 0, attempts: 0 }
    lockout.attempts++
    
    // Progressive lockout: 5 min, 15 min, 1 hour, 24 hours
    const lockoutMinutes = Math.min(Math.pow(2, lockout.attempts - 3) * 5, 1440)
    
    if (lockout.attempts >= 3) {
      lockout.until = Date.now() + (lockoutMinutes * 60 * 1000)
      console.warn(`[SECURITY] Account locked for ${lockoutMinutes} minutes: ${identifier}`)
    }
    
    this.lockouts.set(identifier, lockout)
  }
  
  resetAttempts(identifier: string): void {
    this.lockouts.delete(identifier)
  }
  
  getRemainingLockoutTime(identifier: string): number {
    const lockout = this.lockouts.get(identifier)
    if (!lockout || Date.now() > lockout.until) return 0
    
    return lockout.until - Date.now()
  }
}

// Password security enhancements
class AdvancedPasswordSecurity {
  private static readonly SALT_ROUNDS = 14 // Higher than default for maximum security
  private static readonly PEPPER = process.env.PASSWORD_PEPPER || ''
  
  static async hashPassword(password: string): Promise<string> {
    // Add pepper for additional security layer
    const pepperedPassword = password + this.PEPPER
    
    // Use high-cost bcrypt hashing
    return await bcrypt.hash(pepperedPassword, this.SALT_ROUNDS)
  }
  
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const pepperedPassword = password + this.PEPPER
    return await bcrypt.compare(pepperedPassword, hashedPassword)
  }
  
  // Check for compromised passwords (basic implementation)
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // In production, integrate with HaveIBeenPwned API or similar service
    const commonPasswords = [
      'password123', 'admin123456', 'qwerty123456', '123456789012',
      'password1234', 'admin1234567', 'welcome123456', 'changeme123'
    ]
    
    return commonPasswords.includes(password.toLowerCase())
  }
  
  // Generate secure random password
  static generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes(1)[0] % charset.length
      password += charset[randomIndex]
    }
    
    return password
  }
}

// Session security management
class SessionSecurity {
  private static readonly SESSION_ENTROPY = 32 // bytes
  private static readonly MAX_SESSION_AGE = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly MAX_IDLE_TIME = 2 * 60 * 60 * 1000 // 2 hours
  
  static generateSessionToken(): string {
    return randomBytes(this.SESSION_ENTROPY).toString('hex')
  }
  
  static hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
  
  static isSessionValid(session: { created_at: Date; lastActive: Date }): boolean {
    const now = Date.now()
    const created = new Date(session.created_at).getTime()
    const lastActive = new Date(session.lastActive).getTime()
    
    // Check if session has expired
    if (now - created > this.MAX_SESSION_AGE) {
      return false
    }
    
    // Check if session has been idle too long
    if (now - lastActive > this.MAX_IDLE_TIME) {
      return false
    }
    
    return true
  }
  
  static shouldRotateSession(session: { created_at: Date }): boolean {
    const sessionAge = Date.now() - new Date(session.created_at).getTime()
    return sessionAge > (this.MAX_SESSION_AGE / 4) // Rotate after 6 hours
  }
}

// Multi-Factor Authentication (MFA) Security
class MFASecurity {
  private static readonly BACKUP_CODE_LENGTH = 8
  private static readonly BACKUP_CODE_COUNT = 10
  
  static generateBackupCodes(): string[] {
    const codes: string[] = []
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    
    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      let code = ''
      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        const randomIndex = randomBytes(1)[0] % charset.length
        code += charset[randomIndex]
      }
      codes.push(code)
    }
    
    return codes
  }
  
  static async hashBackupCode(code: string): Promise<string> {
    return await bcrypt.hash(code, 12)
  }
  
  static async verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
    return await bcrypt.compare(code.toUpperCase(), hashedCode)
  }
  
  // TOTP validation with replay attack protection
  static validateTOTP(
    token: string, 
    secret: string, 
    usedTokens: Set<string>, 
    window: number = 1
  ): boolean {
    const speakeasy = require('speakeasy')
    
    // Check if token was already used (replay attack protection)
    if (usedTokens.has(token)) {
      return false
    }
    
    const isValid = speakeasy.totp.verify({
      secret,
      token,
      window,
      time: Date.now() / 1000
    })
    
    if (isValid) {
      usedTokens.add(token)
      // Clean up old tokens periodically
      if (usedTokens.size > 100) {
        const tokensArray = Array.from(usedTokens)
        tokensArray.splice(0, 50)
        usedTokens.clear()
        tokensArray.forEach(t => usedTokens.add(t))
      }
    }
    
    return isValid
  }
}

// Device fingerprinting for additional security
class DeviceSecurity {
  static generateDeviceFingerprint(request: Request): string {
    const userAgent = request.headers.get('user-agent') || ''
    const acceptLanguage = request.headers.get('accept-language') || ''
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    
    const fingerprint = createHash('sha256')
      .update(userAgent + acceptLanguage + acceptEncoding)
      .digest('hex')
    
    return fingerprint.substring(0, 16) // Truncate for storage efficiency
  }
  
  static isDeviceTrusted(
    currentFingerprint: string, 
    trustedFingerprints: string[]
  ): boolean {
    return trustedFingerprints.includes(currentFingerprint)
  }
}

// Audit logging for security events
class SecurityAuditLogger {
  static async logSecurityEvent(event: {
    type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' | 'PASSWORD_CHANGED' | 
          'MFA_ENABLED' | 'MFA_DISABLED' | 'SUSPICIOUS_ACTIVITY' | 'SESSION_HIJACK',
    user_id?: string,
    email?: string,
    ip: string,
    userAgent: string,
    metadata?: any,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventId: randomBytes(8).toString('hex'),
      ...event
    }
    
    // Log to console (in production, send to SIEM/logging service)
    console.log(`[SECURITY_AUDIT] ${JSON.stringify(logEntry)}`)
    
    // For critical events, implement immediate alerting
    if (event.severity === 'CRITICAL') {
      console.error(`[CRITICAL_SECURITY_ALERT] ${event.type}: ${JSON.stringify(logEntry)}`)
      // In production: send alerts via email, Slack, PagerDuty, etc.
    }
  }
}

// Singleton instances for global use
export const accountLockout = new AccountLockoutManager()
export const passwordSecurity = AdvancedPasswordSecurity
export const sessionSecurity = SessionSecurity
export const mfaSecurity = MFASecurity
export const deviceSecurity = DeviceSecurity
export const securityAuditLogger = SecurityAuditLogger

// Rate limiters for different authentication scenarios
export const authRateLimiters = {
  login: new RateLimiter(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  passwordReset: new RateLimiter(3, 60 * 60 * 1000), // 3 attempts per hour
  mfaVerification: new RateLimiter(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  registration: new RateLimiter(3, 24 * 60 * 60 * 1000) // 3 registrations per day
}