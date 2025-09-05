// Security utilities for ASH AI system

/**
 * Input sanitization utilities
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove potential XSS characters
  return input
    .replace(/[<>'"]/g, '') // Remove basic XSS characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 500); // Limit length to prevent buffer overflow
};

/**
 * Validate numeric input
 */
export const sanitizeNumber = (input: string | number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }
  
  return Math.min(Math.max(num, min), max);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate secure random ID
 */
export const generateSecureId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}${timestamp}${random}`;
};

/**
 * Mask sensitive data for display
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(data?.length || 0);
  }
  
  const masked = '*'.repeat(data.length - visibleChars);
  const visible = data.slice(-visibleChars);
  return masked + visible;
};

/**
 * Safe console logging (development only)
 */
export const safeLog = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      // Remove sensitive fields before logging
      const safeData = removeSensitiveFields(data);
      console.log(message, safeData);
    } else {
      console.log(message);
    }
  }
};

/**
 * Remove sensitive fields from objects before logging
 */
const removeSensitiveFields = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'cost', 'price', 'salary', 
    'wage', 'email', 'phone', 'ssn', 'creditCard', 'supplier', 'vendor'
  ];
  
  const cleaned: Record<string, any> = { ...obj as Record<string, any> };
  
  for (const field of sensitiveFields) {
    if (field in cleaned) {
      cleaned[field] = '[REDACTED]';
    }
  }
  
  return cleaned;
};

/**
 * Validate user permissions (placeholder for real implementation)
 */
export const hasPermission = (userRole: string, requiredPermission: string): boolean => {
  // TODO: Implement actual permission checking with backend
  // This is a placeholder that should be replaced with real RBAC
  const rolePermissions: Record<string, string[]> = {
    'ADMIN': ['*'], // Admin has all permissions
    'MANAGER': ['read:cutting', 'write:cutting', 'read:materials', 'write:materials'],
    'GRAPHIC_ARTIST': ['read:cutting'],
    'OPERATOR': ['read:cutting', 'update:cutting_status']
  };
  
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes('*') || permissions.includes(requiredPermission);
};

/**
 * Rate limiting helper (client-side)
 */
class RateLimit {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
}

export const rateLimiter = new RateLimit();

/**
 * Secure error handling
 */
export const handleSecureError = (error: unknown, userMessage: string = 'An error occurred'): string => {
  // Log full error details for debugging (development only)
  safeLog('Error occurred:', error);
  
  // Return generic message to user (never expose internal details)
  return userMessage;
};

/**
 * Validate file upload security
 */
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large' };
  }
  
  // Check for malicious filenames
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    return { isValid: false, error: 'Invalid filename' };
  }
  
  return { isValid: true };
};

/**
 * Content Security Policy helper
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};