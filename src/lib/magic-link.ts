// Magic Link Authentication for Client Portal
// Based on CLIENT_UPDATED_PLAN.md Stage 12 specifications

import crypto from 'crypto'
import { db } from '@/lib/db'

export interface MagicLinkResult {
  success: boolean
  token?: string
  expires_at?: Date
  error?: string
}

export interface MagicLinkValidation {
  valid: boolean
  client_id?: string
  workspace_id?: string
  error?: string
}

// Generate secure magic link token
export async function generateMagicLink(
  client_id: string, 
  email: string,
  expires_in_hours: number = 24
): Promise<MagicLinkResult> {
  try {
    // Validate client exists and has this email
    const client = await db.client.findUnique({
      where: { id: client_id },
      select: {
        id: true,
        workspace_id: true,
        emails: true,
        name: true
      }
    })

    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    const emails = Array.isArray(client.emails) ? client.emails : []
    if (!emails.includes(email)) {
      return { success: false, error: 'Email not associated with client' }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000)

    // Store token (you'd typically use Redis or similar for production)
    // For now, we'll use a simple in-memory store or database table
    await db.auditLog.create({
      data: {
        workspace_id: client.workspace_id,
        entity_type: 'magic_link',
        entity_id: client.id,
        action: 'CREATE',
        after_data: {
          token_hash: crypto.createHash('sha256').update(token).digest('hex'),
          email,
          expires_at: expires_at.toISOString(),
          client_name: client.name
        }
      }
    })

    return {
      success: true,
      token,
      expires_at
    }

  } catch (_error) {
    console.error('Error generating magic link:', error)
    return { success: false, error: 'Failed to generate magic link' }
  }
}

// Validate magic link token
export async function validateMagicLink(token: string): Promise<MagicLinkValidation> {
  try {
    const token_hash = crypto.createHash('sha256').update(token).digest('hex')

    // Find the token in audit logs (in production, use proper token storage)
    const tokenRecord = await db.auditLog.findFirst({
      where: {
        entity_type: 'magic_link',
        action: 'CREATE'
      },
      orderBy: { created_at: 'desc' }
    })

    if (!tokenRecord?.after_data) {
      return { valid: false, error: 'Invalid token' }
    }

    const data = tokenRecord.after_data as any
    
    // Check token hash matches
    if (data.token_hash !== token_hash) {
      return { valid: false, error: 'Invalid token' }
    }

    // Check expiration
    const expires_at = new Date(data.expires_at)
    if (expires_at < new Date()) {
      return { valid: false, error: 'Token expired' }
    }

    // Get client info
    const client = await db.client.findUnique({
      where: { id: tokenRecord.entity_id },
      select: {
        id: true,
        workspace_id: true,
        name: true,
        emails: true
      }
    })

    if (!client) {
      return { valid: false, error: 'Client not found' }
    }

    return {
      valid: true,
      client_id: client.id,
      workspace_id: client.workspace_id
    }

  } catch (_error) {
    console.error('Error validating magic link:', error)
    return { valid: false, error: 'Token validation failed' }
  }
}

// Generate magic link URL
export function createMagicLinkUrl(token: string, base_url: string = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'): string {
  return `${base_url}/portal/auth?token=${token}`
}

// Send magic link email (placeholder - integrate with your email service)
export async function sendMagicLinkEmail(
  client_id: string, 
  email: string, 
  order_po?: string
): Promise<boolean> {
  try {
    const linkResult = await generateMagicLink(client_id, email)
    
    if (!linkResult.success || !linkResult.token) {
      console.error('Failed to generate magic link:', linkResult.error)
      return false
    }

    const magic_url = createMagicLinkUrl(linkResult.token)
    
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log('=== MAGIC LINK EMAIL (DEV MODE) ===')
    console.log(`To: ${email}`)
    console.log(`Subject: ${order_po ? `Order ${order_po} - ` : ''}Access Your Portal`)
    console.log(`Link: ${magic_url}`)
    console.log('===================================')

    return true

  } catch (_error) {
    console.error('Error sending magic link email:', error)
    return false
  }
}