/**
 * Security Monitoring & Incident Response
 * Real-time security monitoring, threat detection, and automated response
 */

import { EventEmitter } from 'events'
import { createHash } from 'crypto'

// Security event types
export type SecurityEventType = 
  | 'AUTHENTICATION_FAILURE'
  | 'MULTIPLE_LOGIN_ATTEMPTS'
  | 'SUSPICIOUS_REQUEST'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'PRIVILEGE_ESCALATION'
  | 'UNUSUAL_API_ACTIVITY'
  | 'BRUTE_FORCE_ATTACK'
  | 'ACCOUNT_ENUMERATION'
  | 'SESSION_HIJACK_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_EXFILTRATION_ATTEMPT'
  | 'MALWARE_UPLOAD'
  | 'CONFIGURATION_CHANGE'

export interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
  source: {
    ip: string
    userAgent: string
    userId?: string
    sessionId?: string
  }
  details: {
    endpoint?: string
    method?: string
    payload?: any
    userInput?: string
    detectionRule?: string
    riskScore?: number
  }
  metadata: Record<string, any>
}

// Advanced threat detection engine
export class ThreatDetectionEngine {
  private static instance: ThreatDetectionEngine
  private eventEmitter = new EventEmitter()
  private attackPatterns: Map<string, number> = new Map()
  private suspiciousIPs: Set<string> = new Set()
  private blockedIPs: Set<string> = new Set()
  
  static getInstance(): ThreatDetectionEngine {
    if (!ThreatDetectionEngine.instance) {
      ThreatDetectionEngine.instance = new ThreatDetectionEngine()
    }
    return ThreatDetectionEngine.instance
  }

  /**
   * Analyze request for security threats
   */
  analyzeRequest(request: {
    ip: string
    userAgent: string
    method: string
    path: string
    headers: Record<string, string>
    body?: any
    userId?: string
  }): SecurityEvent | null {
    const threats: Partial<SecurityEvent>[] = []

    // SQL Injection Detection
    const sqlInjectionThreat = this.detectSQLInjection(request)
    if (sqlInjectionThreat) threats.push(sqlInjectionThreat)

    // XSS Detection
    const xssThreat = this.detectXSS(request)
    if (xssThreat) threats.push(xssThreat)

    // Brute Force Detection
    const bruteForceThreat = this.detectBruteForce(request)
    if (bruteForceThreat) threats.push(bruteForceThreat)

    // Unusual Activity Detection
    const unusualActivityThreat = this.detectUnusualActivity(request)
    if (unusualActivityThreat) threats.push(unusualActivityThreat)

    // Path Traversal Detection
    const pathTraversalThreat = this.detectPathTraversal(request)
    if (pathTraversalThreat) threats.push(pathTraversalThreat)

    // Rate Limiting Violation
    const rateLimitThreat = this.detectRateLimitViolation(request)
    if (rateLimitThreat) threats.push(rateLimitThreat)

    // Return the highest severity threat
    if (threats.length > 0) {
      const highestSeverityThreat = threats.reduce((highest, current) => 
        this.getSeverityValue(current.severity!) > this.getSeverityValue(highest.severity!) 
          ? current 
          : highest
      )

      return this.createSecurityEvent(highestSeverityThreat as SecurityEvent)
    }

    return null
  }

  private detectSQLInjection(request: any): Partial<SecurityEvent> | null {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
      /('|(\\')|(;)|(\|)|(\*)|(%27)|(%3B)|(%7C)/,
      /(\bOR\b|\bAND\b)\s+(\w+\s*)?\=\s*(\w+\s*)?/i,
      /(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i
    ]

    const payloadString = JSON.stringify(request.body || '') + request.path
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(payloadString)) {
        return {
          type: 'SQL_INJECTION_ATTEMPT',
          severity: 'HIGH',
          details: {
            detectionRule: 'SQL_INJECTION_PATTERN',
            userInput: payloadString.substring(0, 500),
            riskScore: 85
          }
        }
      }
    }

    return null
  }

  private detectXSS(request: any): Partial<SecurityEvent> | null {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ]

    const payloadString = JSON.stringify(request.body || '') + request.path
    
    for (const pattern of xssPatterns) {
      if (pattern.test(payloadString)) {
        return {
          type: 'XSS_ATTEMPT',
          severity: 'HIGH',
          details: {
            detectionRule: 'XSS_PATTERN',
            userInput: payloadString.substring(0, 500),
            riskScore: 80
          }
        }
      }
    }

    return null
  }

  private detectBruteForce(request: any): Partial<SecurityEvent> | null {
    if (!request.path.includes('/auth') && !request.path.includes('/login')) {
      return null
    }

    const ipKey = `bf_${(request.headers?.get('x-forwarded-for') || request.headers?.get('x-real-ip') || 'unknown')}`
    const currentAttempts = this.attackPatterns.get(ipKey) || 0
    this.attackPatterns.set(ipKey, currentAttempts + 1)

    // Clean up old entries
    setTimeout(() => {
      const attempts = this.attackPatterns.get(ipKey) || 0
      if (attempts > 0) {
        this.attackPatterns.set(ipKey, attempts - 1)
      }
    }, 15 * 60 * 1000) // 15 minutes

    if (currentAttempts > 10) {
      this.blockedIPs.add((request.headers?.get('x-forwarded-for') || request.headers?.get('x-real-ip') || 'unknown'))
      return {
        type: 'BRUTE_FORCE_ATTACK',
        severity: 'CRITICAL',
        details: {
          detectionRule: 'BRUTE_FORCE_THRESHOLD',
          riskScore: 95,
          attemptCount: currentAttempts
        }
      }
    } else if (currentAttempts > 5) {
      this.suspiciousIPs.add((request.headers?.get('x-forwarded-for') || request.headers?.get('x-real-ip') || 'unknown'))
      return {
        type: 'MULTIPLE_LOGIN_ATTEMPTS',
        severity: 'MEDIUM',
        details: {
          detectionRule: 'MULTIPLE_AUTH_ATTEMPTS',
          riskScore: 60,
          attemptCount: currentAttempts
        }
      }
    }

    return null
  }

  private detectUnusualActivity(request: any): Partial<SecurityEvent> | null {
    // Unusual user agent patterns
    const suspiciousUserAgents = [
      /bot/i, /crawler/i, /spider/i, /scan/i, 
      /nikto/i, /sqlmap/i, /nmap/i, /burp/i
    ]

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(request.userAgent)) {
        return {
          type: 'SUSPICIOUS_REQUEST',
          severity: 'MEDIUM',
          details: {
            detectionRule: 'SUSPICIOUS_USER_AGENT',
            riskScore: 70
          }
        }
      }
    }

    // Unusual request patterns
    const suspiciousPaths = [
      /\/wp-admin/i, /\/admin/i, /\/phpmyadmin/i,
      /\.env/i, /\/config\./i, /\/\.git/i,
      /\/backup/i, /\/dump/i, /\/upload\.php/i
    ]

    for (const pattern of suspiciousPaths) {
      if (pattern.test(request.path)) {
        return {
          type: 'SUSPICIOUS_REQUEST',
          severity: 'HIGH',
          details: {
            detectionRule: 'SUSPICIOUS_PATH',
            riskScore: 85
          }
        }
      }
    }

    return null
  }

  private detectPathTraversal(request: any): Partial<SecurityEvent> | null {
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi
    ]

    const fullPath = request.path + JSON.stringify(request.body || '')

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(fullPath)) {
        return {
          type: 'SUSPICIOUS_REQUEST',
          severity: 'HIGH',
          details: {
            detectionRule: 'PATH_TRAVERSAL',
            riskScore: 85
          }
        }
      }
    }

    return null
  }

  private detectRateLimitViolation(request: any): Partial<SecurityEvent> | null {
    const rateLimitKey = `rl_${(request.headers?.get('x-forwarded-for') || request.headers?.get('x-real-ip') || 'unknown')}_${request.path}`
    const currentRequests = this.attackPatterns.get(rateLimitKey) || 0
    this.attackPatterns.set(rateLimitKey, currentRequests + 1)

    // Clean up after 1 minute
    setTimeout(() => {
      const requests = this.attackPatterns.get(rateLimitKey) || 0
      if (requests > 0) {
        this.attackPatterns.set(rateLimitKey, requests - 1)
      }
    }, 60 * 1000)

    if (currentRequests > 100) { // More than 100 requests per minute
      return {
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        details: {
          detectionRule: 'RATE_LIMIT_VIOLATION',
          riskScore: 65,
          requestCount: currentRequests
        }
      }
    }

    return null
  }

  private getSeverityValue(severity: string): number {
    const values = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
    return values[severity as keyof typeof values] || 0
  }

  private createSecurityEvent(partialEvent: Partial<SecurityEvent>): SecurityEvent {
    return {
      id: this.generateEventId(),
      timestamp: new Date(),
      source: {
        ip: '',
        userAgent: ''
      },
      details: {},
      metadata: {},
      ...partialEvent
    } as SecurityEvent
  }

  private generateEventId(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip)
  }

  /**
   * Check if IP is suspicious
   */
  isIPSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip)
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, duration: number = 24 * 60 * 60 * 1000): void {
    this.blockedIPs.add(ip)
    console.warn(`[SECURITY] IP blocked: ${ip} for ${duration}ms`)
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip)
      console.log(`[SECURITY] IP unblocked: ${ip}`)
    }, duration)
  }

  /**
   * Subscribe to security events
   */
  onSecurityEvent(callback: (event: SecurityEvent) => void): void {
    this.eventEmitter.on('security-event', callback)
  }

  /**
   * Emit security event
   */
  emitSecurityEvent(event: SecurityEvent): void {
    this.eventEmitter.emit('security-event', event)
  }
}

// Incident response system
export class IncidentResponseSystem {
  private static instance: IncidentResponseSystem
  private activeIncidents: Map<string, any> = new Map()

  static getInstance(): IncidentResponseSystem {
    if (!IncidentResponseSystem.instance) {
      IncidentResponseSystem.instance = new IncidentResponseSystem()
    }
    return IncidentResponseSystem.instance
  }

  /**
   * Handle security incident
   */
  handleIncident(event: SecurityEvent): void {
    const incidentId = this.createIncident(event)
    
    // Automated response based on severity
    switch (event.severity) {
      case 'CRITICAL':
        this.handleCriticalIncident(event, incidentId)
        break
      case 'HIGH':
        this.handleHighSeverityIncident(event, incidentId)
        break
      case 'MEDIUM':
        this.handleMediumSeverityIncident(event, incidentId)
        break
      case 'LOW':
        this.handleLowSeverityIncident(event, incidentId)
        break
    }
  }

  private createIncident(event: SecurityEvent): string {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    const incident = {
      id: incidentId,
      eventId: event.id,
      status: 'OPEN',
      severity: event.severity,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedTo: null,
      actions: [] as any[],
      notes: []
    }

    this.activeIncidents.set(incidentId, incident)
    console.log(`[INCIDENT] Created incident ${incidentId} for security event ${event.id}`)
    
    return incidentId
  }

  private handleCriticalIncident(event: SecurityEvent, incidentId: string): void {
    console.error(`[CRITICAL_INCIDENT] ${incidentId}: ${event.type}`)
    
    // Immediate automated responses for critical incidents
    if (event.type === 'BRUTE_FORCE_ATTACK') {
      ThreatDetectionEngine.getInstance().blockIP(event.source.ip)
    }

    // Alert security team immediately
    this.sendSecurityAlert(event, incidentId, 'IMMEDIATE')
    
    // Log to security information and event management (SIEM) system
    this.logToSIEM(event, incidentId)
    
    // Consider temporary service restrictions
    this.considerServiceRestrictions(event)
  }

  private handleHighSeverityIncident(event: SecurityEvent, incidentId: string): void {
    console.warn(`[HIGH_INCIDENT] ${incidentId}: ${event.type}`)
    
    // Automated responses for high severity
    if (event.type === 'SQL_INJECTION_ATTEMPT' || event.type === 'XSS_ATTEMPT') {
      // Temporarily increase monitoring for this IP
      ThreatDetectionEngine.getInstance()['suspiciousIPs'].add(event.source.ip)
    }

    // Alert security team within 15 minutes
    setTimeout(() => {
      this.sendSecurityAlert(event, incidentId, 'URGENT')
    }, 15 * 60 * 1000)
  }

  private handleMediumSeverityIncident(event: SecurityEvent, incidentId: string): void {
    console.warn(`[MEDIUM_INCIDENT] ${incidentId}: ${event.type}`)
    
    // Queue for review within 1 hour
    setTimeout(() => {
      this.sendSecurityAlert(event, incidentId, 'NORMAL')
    }, 60 * 60 * 1000)
  }

  private handleLowSeverityIncident(event: SecurityEvent, incidentId: string): void {
    console.info(`[LOW_INCIDENT] ${incidentId}: ${event.type}`)
    
    // Log for daily review
    // No immediate action required
  }

  private sendSecurityAlert(event: SecurityEvent, incidentId: string, priority: 'IMMEDIATE' | 'URGENT' | 'NORMAL'): void {
    const alertMessage = {
      incidentId,
      priority,
      event: {
        type: event.type,
        severity: event.severity,
        timestamp: event.timestamp,
        source: event.source,
        details: event.details
      },
      message: `Security incident detected: ${event.type} from IP ${event.source.ip}`
    }

    console.log(`[SECURITY_ALERT] ${priority}: ${JSON.stringify(alertMessage)}`)
    
    // In production, integrate with:
    // - Email notifications
    // - Slack/Teams alerts
    // - PagerDuty for critical incidents
    // - SMS for immediate priority
  }

  private logToSIEM(event: SecurityEvent, incidentId: string): void {
    const siemLog = {
      timestamp: new Date().toISOString(),
      incidentId,
      eventType: event.type,
      severity: event.severity,
      sourceIP: event.source.ip,
      userAgent: event.source.userAgent,
      details: event.details,
      metadata: event.metadata
    }

    console.log(`[SIEM] ${JSON.stringify(siemLog)}`)
    
    // In production, send to SIEM platform like Splunk, ELK Stack, or cloud SIEM
  }

  private considerServiceRestrictions(event: SecurityEvent): void {
    // For critical incidents, consider temporary service restrictions
    if (event.severity === 'CRITICAL') {
      console.warn('[SECURITY] Considering temporary service restrictions due to critical incident')
      
      // Could implement:
      // - Temporary rate limiting
      // - Additional authentication requirements
      // - Temporary API restrictions
      // - Enhanced monitoring
    }
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): any[] {
    return Array.from(this.activeIncidents.values())
  }

  /**
   * Close incident
   */
  closeIncident(incidentId: string, resolution: string): void {
    const incident = this.activeIncidents.get(incidentId)
    if (incident) {
      incident.status = 'CLOSED'
      incident.resolution = resolution
      incident.closedAt = new Date()
      console.log(`[INCIDENT] Closed incident ${incidentId}: ${resolution}`)
    }
  }
}

// Initialize security monitoring
export function initializeSecurityMonitoring(): void {
  const threatDetection = ThreatDetectionEngine.getInstance()
  const incidentResponse = IncidentResponseSystem.getInstance()

  // Set up event handling
  threatDetection.onSecurityEvent((event) => {
    incidentResponse.handleIncident(event)
  })

  console.log('[SECURITY] Security monitoring initialized')
}

// Export singleton instances
export const securityMonitor = ThreatDetectionEngine.getInstance()
export const incidentResponse = IncidentResponseSystem.getInstance()