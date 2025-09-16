import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateApprovalLink } from '@/lib/design-approval'

// Schema for sending design for approval
const sendApprovalSchema = z.object({
  client_id: z.string().uuid(),
  message_template_id: z.string().optional(),
  require_esign: z.boolean().default(false),
  approval_deadline: z.string().datetime().optional(),
  custom_message: z.string().optional()
})

// POST /api/designs/[id]/versions/[version]/send-approval
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    const body = await request.json()
    const validatedData = sendApprovalSchema.parse(body)
    const { id: asset_id, version } = params

    // Validate design version exists
    const designVersion = await prisma.designVersion.findUnique({
      where: {
        asset_id_version: { asset_id, version: parseInt(version) }
      },
      include: {
        asset: {
          include: {
            order: {
              include: {
                client: true,
                brand: true
              }
            }
          }
        }
      }
    })

    if (!designVersion) {
      return NextResponse.json(
        { error: 'Design version not found' },
        { status: 404 }
      )
    }

    // Get client details
    const client = await prisma.client.findUnique({
      where: { id: validatedData.client_id }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Create approval record and generate portal link
    const approval = await prisma.$transaction(async (tx) => {
      // Create design approval
      const approval = await tx.designApproval.create({
        data: {
          design_asset_id: asset_id,
          client_id: validatedData.client_id,
          status: 'SENT',
          approver_name: client.name,
          approver_email: (client.emails as string[])?.[0] || '',
          esign_envelope_id: validatedData.require_esign ?
            await createESignEnvelope(designVersion, client) : null
        }
      })

      // Update design asset status
      await tx.designAsset.update({
        where: { id: asset_id },
        data: {
          approval_status: 'PENDING'
        }
      })

      return approval
    })

    // Generate secure approval link
    const portalLink = await generateApprovalLink({
      approval_id: approval.id,
      client_id: validatedData.client_id,
      expires_in_hours: 168 // 7 days
    })

    // Send approval notification (placeholder)
    await sendApprovalNotification({
      client,
      design: designVersion.asset,
      order: designVersion.asset.order,
      portal_link: portalLink,
      custom_message: validatedData.custom_message,
      deadline: validatedData.approval_deadline ? new Date(validatedData.approval_deadline) : undefined
    })

    // Emit event (placeholder)
    // eventEmitter.emit('ash.design.approval.sent', {
    //   approval_id: approval.id,
    //   asset_id,
    //   version: parseInt(version),
    //   client_id: validatedData.client_id
    // })

    return NextResponse.json({
      approval_id: approval.id,
      portal_link: portalLink,
      status: 'SENT',
      sent_to: client.name,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error) {
    console.error('Error sending design for approval:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send design for approval' },
      { status: 500 }
    )
  }
}

// Helper function to create e-signature envelope
async function createESignEnvelope(designVersion: any, client: any): Promise<string | null> {
  try {
    // Placeholder for DocuSign/Adobe Sign integration
    // In production, this would create an envelope with the design for e-signature

    const envelopeData = {
      documents: [{
        name: `Design Approval - ${designVersion.asset.order.po_number}`,
        document_base64: '', // Convert design to PDF base64
        document_id: '1'
      }],
      recipients: {
        signers: [{
          email: client.emails?.[0] || '',
          name: client.name,
          recipient_id: '1',
          tabs: {
            sign_here_tabs: [{
              x_position: '100',
              y_position: '100',
              document_id: '1',
              page_number: '1'
            }]
          }
        }]
      },
      status: 'sent'
    }

    // Mock envelope ID
    return `envelope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  } catch (error) {
    console.error('Error creating e-signature envelope:', error)
    return null
  }
}

// Helper function to send approval notification
async function sendApprovalNotification(data: {
  client: any
  design: any
  order: any
  portal_link: string
  custom_message?: string
  deadline?: Date
}) {
  try {
    // Placeholder for email/SMS notification
    // In production, this would send branded emails with approval link

    const emailContent = {
      to: data.client.emails?.[0] || '',
      subject: `Design Approval Required - ${data.order.po_number}`,
      template: 'design_approval',
      variables: {
        client_name: data.client.name,
        po_number: data.order.po_number,
        brand_name: data.order.brand.name,
        portal_link: data.portal_link,
        custom_message: data.custom_message,
        deadline: data.deadline?.toLocaleDateString(),
        design_preview: data.design.file_url
      }
    }

    console.log('Would send approval email:', emailContent)

  } catch (error) {
    console.error('Error sending approval notification:', error)
  }
}