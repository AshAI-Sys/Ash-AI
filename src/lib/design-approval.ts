// Design Approval Utilities
// Based on CLIENT_UPDATED_PLAN.md specifications

import { prisma } from '@/lib/prisma'
import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.ASH_JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('ASH_JWT_SECRET environment variable is required for security')
}

/**
 * Generate secure approval link for client portal
 */
export async function generateApprovalLink(data: {
  approval_id: string
  client_id: string
  expires_in_hours?: number
}): Promise<string> {
  try {
    const expiresIn = data.expires_in_hours || 168 // 7 days default

    // Create signed token with approval data
    const token = sign(
      {
        approval_id: data.approval_id,
        client_id: data.client_id,
        type: 'design_approval',
        exp: Math.floor(Date.now() / 1000) + (expiresIn * 60 * 60)
      },
      JWT_SECRET
    )

    // Generate portal URL
    const baseUrl = process.env.ASH_APP_URL || 'http://localhost:3003'
    const portalUrl = `${baseUrl}/portal/approvals/${data.approval_id}?token=${token}`

    return portalUrl

  } catch (error) {
    console.error('Error generating approval link:', error)
    throw new Error('Failed to generate approval link')
  }
}

/**
 * Verify approval token for portal access
 */
export async function verifyApprovalToken(
  approval_id: string,
  token: string
): Promise<{ valid: boolean; client_id?: string }> {
  try {
    // Verify JWT token
    const decoded = verify(token, JWT_SECRET) as any

    // Check token matches approval
    if (decoded.approval_id !== approval_id) {
      return { valid: false }
    }

    // Validate token structure
    if (!decoded.client_id || decoded.type !== 'design_approval') {
      return { valid: false }
    }

    // Check approval exists and belongs to the client
    const approval = await prisma.designApproval.findFirst({
      where: {
        id: approval_id,
        client_id: decoded.client_id,
        status: 'SENT'
      }
    })

    if (!approval) {
      return { valid: false }
    }

    return { valid: true, client_id: decoded.client_id }

  } catch (error) {
    console.error('Error verifying approval token:', error)
    return { valid: false }
  }
}

/**
 * Create e-signature envelope for design approval
 */
export async function createESignatureEnvelope(data: {
  design_asset: any
  client: any
  approval_id: string
}): Promise<string | null> {
  try {
    // This would integrate with DocuSign, Adobe Sign, or similar
    // For now, return mock envelope ID

    const envelopeData = {
      documents: [{
        name: `Design Approval - ${data.design_asset.order.po_number}`,
        document_id: '1',
        // In production, convert design mockup to PDF
        document_base64: await convertDesignToPdf(data.design_asset.file_url)
      }],
      recipients: {
        signers: [{
          email: data.client.emails?.[0] || '',
          name: data.client.name,
          recipient_id: '1',
          routing_order: '1',
          tabs: {
            sign_here_tabs: [{
              x_position: '150',
              y_position: '200',
              document_id: '1',
              page_number: '1'
            }],
            text_tabs: [{
              x_position: '50',
              y_position: '150',
              document_id: '1',
              page_number: '1',
              value: `Approved by: ${data.client.name}`,
              locked: 'true'
            }],
            date_signed_tabs: [{
              x_position: '300',
              y_position: '200',
              document_id: '1',
              page_number: '1'
            }]
          }
        }]
      },
      email_subject: `Design Approval Required - ${data.design_asset.order.po_number}`,
      email_blurb: 'Please review and approve the attached design.',
      status: 'sent'
    }

    // Mock API call to e-signature service
    const response = await mockESignatureAPI(envelopeData)

    return response.envelope_id

  } catch (error) {
    console.error('Error creating e-signature envelope:', error)
    return null
  }
}

/**
 * Get approval status for design version
 */
export async function getDesignApprovalStatus(
  asset_id: string,
  version?: number
): Promise<{
  status: string
  latest_approval?: any
  approval_history: any[]
}> {
  try {
    const where: any = { design_asset_id: asset_id }
    if (version) where.version = version

    const approvals = await prisma.designApproval.findMany({
      where,
      include: {
        client: {
          select: { name: true, emails: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const latestApproval = approvals[0]
    const status = latestApproval?.status || 'PENDING'

    return {
      status,
      latest_approval: latestApproval,
      approval_history: approvals
    }

  } catch (error) {
    console.error('Error getting approval status:', error)
    throw new Error('Failed to get approval status')
  }
}

/**
 * Lock design version to prevent changes after approval
 */
export async function lockDesignVersion(
  asset_id: string,
  version: number,
  locked_by: string
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // Update design asset status
      await tx.designAsset.update({
        where: { id: asset_id },
        data: {
          approval_status: 'LOCKED'
        }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          workspace_id: 'workspace_id_placeholder', // TODO: Get from context
          actor_id: locked_by,
          entity_type: 'design_asset',
          entity_id: asset_id,
          action: 'LOCK',
          after: {
            version,
            status: 'LOCKED',
            locked_at: new Date().toISOString()
          }
        }
      })
    })

  } catch (error) {
    console.error('Error locking design version:', error)
    throw new Error('Failed to lock design version')
  }
}

/**
 * Check if design changes are allowed
 */
export async function canEditDesign(asset_id: string): Promise<{
  can_edit: boolean
  reason?: string
}> {
  try {
    const asset = await prisma.designAsset.findUnique({
      where: { id: asset_id },
      include: {
        order: {
          select: { status: true }
        }
      }
    })

    if (!asset) {
      return { can_edit: false, reason: 'Design not found' }
    }

    // Check if design is locked
    if (asset.approval_status === 'LOCKED') {
      return { can_edit: false, reason: 'Design is locked for production' }
    }

    // Check if order is in production
    if (['IN_PRODUCTION', 'QC', 'PACKING', 'DELIVERED'].includes(asset.order.status)) {
      return { can_edit: false, reason: 'Order is already in production' }
    }

    // Check if approved and in planning
    if (asset.approval_status === 'APPROVED' && asset.order.status === 'PRODUCTION_PLANNED') {
      return { can_edit: false, reason: 'Design approved and scheduled for production' }
    }

    return { can_edit: true }

  } catch (error) {
    console.error('Error checking design edit permissions:', error)
    return { can_edit: false, reason: 'Unable to verify permissions' }
  }
}

// Helper functions

/**
 * Convert design image to PDF for e-signature
 */
async function convertDesignToPdf(imageUrl: string): Promise<string> {
  try {
    // Placeholder for image to PDF conversion
    // In production, this would use a service like Puppeteer, PDFKit, or cloud service

    // Mock base64 PDF
    return 'JVBERi0xLjQK...' // Base64 encoded PDF content

  } catch (error) {
    console.error('Error converting design to PDF:', error)
    throw new Error('Failed to convert design to PDF')
  }
}

/**
 * Mock e-signature API call
 */
async function mockESignatureAPI(envelopeData: any): Promise<{ envelope_id: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Return mock envelope ID
  return {
    envelope_id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Generate approval deadline based on business rules
 */
export function calculateApprovalDeadline(orderDeliveryDate: Date): Date {
  // Default: Give client 48 hours to approve, but ensure at least 7 days before delivery
  const defaultHours = 48
  const minDaysBeforeDelivery = 7

  const deadline = new Date()
  deadline.setHours(deadline.getHours() + defaultHours)

  const minDeadline = new Date(orderDeliveryDate)
  minDeadline.setDate(minDeadline.getDate() - minDaysBeforeDelivery)

  // Use earlier of the two dates
  return deadline < minDeadline ? deadline : minDeadline
}

/**
 * Format approval notification message
 */
export function formatApprovalMessage(data: {
  client_name: string
  po_number: string
  brand_name: string
  deadline?: Date
  custom_message?: string
}): string {
  const baseMessage = `Dear ${data.client_name},

Your design for order ${data.po_number} (${data.brand_name}) is ready for approval.

Please review the attached design and provide your approval or feedback.`

  const deadlineText = data.deadline ?
    `\n\nPlease respond by ${data.deadline.toLocaleDateString()} to maintain your delivery schedule.` :
    ''

  const customText = data.custom_message ?
    `\n\nAdditional notes: ${data.custom_message}` :
    ''

  return `${baseMessage}${deadlineText}${customText}

Thank you for your prompt attention.

Best regards,
ASH AI Team`
}