import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { verifyApprovalToken } from '@/lib/design-approval'

// Schema for client approval
const approveDesignSchema = z.object({
  approval_token: z.string(),
  approver_signature: z.string().optional(),
  approver_name: z.string().optional(),
  comments: z.string().optional()
})

// POST /api/portal/approvals/[id]/approve - Client approves design
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const validatedData = approveDesignSchema.parse(body)
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

    // Update approval and design asset in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update approval record
      const updatedApproval = await tx.designApproval.update({
        where: { id: approval_id },
        data: {
          status: 'APPROVED',
          approver_signed_at: new Date(),
          comments: validatedData.comments,
          approver_name: validatedData.approver_name || approval.approver_name
        }
      })

      // Update design asset status
      const updatedAsset = await tx.designAsset.update({
        where: { id: approval.design_asset_id },
        data: {
          approval_status: 'APPROVED'
        }
      })

      // Update order status if design was approved
      await tx.order.update({
        where: { id: approval.design_asset.order_id },
        data: {
          status: 'PRODUCTION_PLANNED' // Move to next stage
        }
      })

      return { updatedApproval, updatedAsset }
    })

    // Send notifications to internal team
    await sendApprovalNotifications({
      approval: result.updatedApproval,
      design: result.updatedAsset,
      order: approval.design_asset.order,
      client: approval.client,
      action: 'APPROVED'
    })

    // Emit event (placeholder)
    // eventEmitter.emit('ash.design.approved', {
    //   approval_id,
    //   asset_id: approval.design_asset_id,
    //   order_id: approval.design_asset.order_id,
    //   client_id: approval.client_id
    // })

    return NextResponse.json({
      status: 'APPROVED',
      message: 'Design approved successfully',
      approved_at: result.updatedApproval.approver_signed_at,
      next_step: 'Production planning will begin'
    })

  } catch (error) {
    console.error('Error approving design:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to approve design' },
      { status: 500 }
    )
  }
}

// Helper function to send internal notifications
async function sendApprovalNotifications(data: {
  approval: any
  design: any
  order: any
  client: any
  action: 'APPROVED' | 'CHANGES_REQUESTED'
}) {
  try {
    const notifications = [
      {
        to: 'csr@company.com', // CSR notification
        subject: `Design ${data.action.toLowerCase()} - ${data.order.po_number}`,
        template: 'design_status_update',
        variables: {
          action: data.action,
          po_number: data.order.po_number,
          client_name: data.client.name,
          design_name: data.design.file_name,
          comments: data.approval.comments,
          next_step: data.action === 'APPROVED' ?
            'Routing will be scheduled' :
            'Design revision required'
        }
      },
      {
        to: 'manager@company.com', // Manager notification
        subject: `Design ${data.action.toLowerCase()} - Production Ready`,
        template: 'manager_notification',
        variables: {
          action: data.action,
          po_number: data.order.po_number,
          priority: data.order.priority || 'NORMAL'
        }
      }
    ]

    console.log('Would send internal notifications:', notifications)

  } catch (error) {
    console.error('Error sending approval notifications:', error)
  }
}