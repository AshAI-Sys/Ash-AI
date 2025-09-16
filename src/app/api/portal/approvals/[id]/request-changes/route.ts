import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { verifyApprovalToken } from '@/lib/design-approval'

// Schema for requesting changes
const requestChangesSchema = z.object({
  approval_token: z.string(),
  comments: z.string().min(1, 'Comments are required when requesting changes'),
  specific_changes: z.array(z.object({
    area: z.string(), // "color", "placement", "text", "size", etc.
    description: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM')
  })).optional(),
  approver_name: z.string().optional()
})

// POST /api/portal/approvals/[id]/request-changes - Client requests design changes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const validatedData = requestChangesSchema.parse(body)
    const approval_id = id

    // Verify approval token with enhanced security
    const tokenVerification = await verifyApprovalToken(
      approval_id,
      validatedData.approval_token
    )

    if (!tokenVerification.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired approval link' },
        { status: 401 }
      )
    }

    // Get approval details
    const approval = await prisma.designApproval.findUnique({
      where: { id: approval_id },
      include: {
        design_asset: {
          include: {
            order: true
          }
        },
        client: true
      }
    })

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      )
    }

    if (approval.status !== 'SENT') {
      return NextResponse.json(
        { error: 'Design has already been reviewed' },
        { status: 400 }
      )
    }

    // Update approval and create revision request in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update approval record
      const updatedApproval = await tx.designApproval.update({
        where: { id: approval_id },
        data: {
          status: 'CHANGES_REQUESTED',
          approver_signed_at: new Date(),
          comments: validatedData.comments,
          approver_name: validatedData.approver_name || approval.approver_name
        }
      })

      // Update design asset status
      const updatedAsset = await tx.designAsset.update({
        where: { id: approval.design_asset_id },
        data: {
          approval_status: 'REVISION_REQUESTED'
        }
      })

      // Create design revision record
      const revision = await tx.designRevision.create({
        data: {
          design_asset_id: approval.design_asset_id,
          revision_notes: validatedData.comments,
          changes_made: {
            requested_changes: validatedData.specific_changes || [],
            client_feedback: validatedData.comments,
            requested_at: new Date().toISOString(),
            status: 'PENDING'
          },
          revised_by: approval.client_id
        }
      })

      return { updatedApproval, updatedAsset, revision }
    })

    // Send notifications to design team
    await sendChangeRequestNotifications({
      approval: result.updatedApproval,
      design: result.updatedAsset,
      order: approval.design_asset.order,
      client: approval.client,
      revision: result.revision,
      specific_changes: validatedData.specific_changes
    })

    // Emit event (placeholder)
    // eventEmitter.emit('ash.design.changes_requested', {
    //   approval_id,
    //   asset_id: approval.design_asset_id,
    //   order_id: approval.design_asset.order_id,
    //   client_id: approval.client_id,
    //   revision_id: result.revision.id
    // })

    return NextResponse.json({
      status: 'CHANGES_REQUESTED',
      message: 'Change request submitted successfully',
      revision_id: result.revision.id,
      submitted_at: result.updatedApproval.approver_signed_at,
      next_step: 'Design team will review and implement changes'
    })

  } catch (error) {
    console.error('Error requesting design changes:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit change request' },
      { status: 500 }
    )
  }
}

// Helper function to send change request notifications
async function sendChangeRequestNotifications(data: {
  approval: any
  design: any
  order: any
  client: any
  revision: any
  specific_changes?: Array<{
    area: string
    description: string
    priority: string
  }>
}) {
  try {
    // Format specific changes for email
    const changesList = data.specific_changes?.map(change =>
      `• ${change.area}: ${change.description} (${change.priority} priority)`
    ).join('\n') || 'See general comments'

    const notifications = [
      {
        to: 'graphic.artist@company.com', // GA notification
        subject: `Design Changes Requested - ${data.order.po_number}`,
        template: 'design_change_request',
        variables: {
          po_number: data.order.po_number,
          client_name: data.client.name,
          design_name: data.design.file_name,
          client_comments: data.approval.comments,
          specific_changes: changesList,
          revision_id: data.revision.id,
          priority: getRevisionPriority(data.specific_changes)
        }
      },
      {
        to: 'csr@company.com', // CSR notification
        subject: `Client Requested Changes - ${data.order.po_number}`,
        template: 'csr_change_notification',
        variables: {
          client_name: data.client.name,
          po_number: data.order.po_number,
          comments: data.approval.comments,
          next_action: 'Follow up with graphic artist on revision timeline'
        }
      }
    ]

    console.log('Would send change request notifications:', notifications)

  } catch (error) {
    console.error('Error sending change request notifications:', error)
  }
}

// Helper function to determine revision priority
function getRevisionPriority(changes?: Array<{ priority: string }>): string {
  if (!changes || changes.length === 0) return 'MEDIUM'

  const priorities = changes.map(c => c.priority)
  if (priorities.includes('HIGH')) return 'HIGH'
  if (priorities.includes('MEDIUM')) return 'MEDIUM'
  return 'LOW'
}