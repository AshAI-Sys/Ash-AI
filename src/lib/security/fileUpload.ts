import { randomBytes } from 'crypto'
import path from 'path'

// File security configuration
export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/png',
    'image/jpeg', 
    'image/jpg',
    'application/pdf',
    'application/postscript', // .ai files
    'application/illustrator'
  ],
  ALLOWED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.pdf', '.ai'],
  MAX_FILES: 5,
  QUARANTINE_PATH: '/tmp/quarantine/',
  SAFE_PATH: '/uploads/designs/'
}

export interface SecureFile {
  originalName: string
  secureName: string
  size: number
  type: string
  path: string
  isSecure: boolean
  virus_scan?: boolean
}

export class FileUploadSecurity {
  
  /**
   * Validate file before processing
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB limit' }
    }

    // Check file type
    if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not allowed. Only PNG, JPG, PDF, and AI files are permitted.' }
    }

    // Check file extension
    const extension = path.extname(file.name).toLowerCase()
    if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: 'File extension not allowed' }
    }

    // Check for suspicious file names
    if (this.hasSuspiciousName(file.name)) {
      return { valid: false, error: 'File name contains suspicious characters' }
    }

    return { valid: true }
  }

  /**
   * Check for suspicious file names that might indicate malicious files
   */
  static hasSuspiciousName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.jar$/i,
      /\.js$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Reserved Windows names
    ]

    return suspiciousPatterns.some(pattern => pattern.test(fileName))
  }

  /**
   * Generate secure filename
   */
  static generateSecureFileName(originalName: string): string {
    const extension = path.extname(originalName).toLowerCase()
    const timestamp = Date.now()
    const randomSuffix = randomBytes(8).toString('hex')
    
    return `design_${timestamp}_${randomSuffix}${extension}`
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 100) // Limit length
      .toLowerCase()
  }

  /**
   * Validate file content (basic magic number checks)
   */
  static async validateFileContent(arrayBuffer: ArrayBuffer, expectedType: string): Promise<boolean> {
    const uint8Array = new Uint8Array(arrayBuffer)
    const header = Array.from(uint8Array.slice(0, 8))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')

    // Magic number validation
    const magicNumbers = {
      'image/png': '89504e47',
      'image/jpeg': 'ffd8ffe0',
      'image/jpg': 'ffd8ffe1',
      'application/pdf': '25504446'
    }

    const expectedHeader = magicNumbers[expectedType as keyof typeof magicNumbers]
    if (expectedHeader) {
      return header.startsWith(expectedHeader)
    }

    // For AI files and others, allow through (would need more sophisticated validation in production)
    return true
  }

  /**
   * Process uploaded file securely
   */
  static async processUpload(file: File, userId: string): Promise<SecureFile> {
    // Validate file
    const validation = this.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Validate file content
    const arrayBuffer = await file.arrayBuffer()
    const contentValid = await this.validateFileContent(arrayBuffer, file.type)
    if (!contentValid) {
      throw new Error('File content does not match file type')
    }

    // Generate secure filename
    const secureName = this.generateSecureFileName(file.name)
    
    return {
      originalName: file.name,
      secureName,
      size: file.size,
      type: file.type,
      path: `${FILE_CONFIG.SAFE_PATH}${userId}/${secureName}`,
      isSecure: true
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanup(filePaths: string[]) {
    // In production, implement actual file cleanup
    console.log('Cleaning up files:', filePaths)
  }
}

export default FileUploadSecurity