// Design Approval API
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { db, createAuditLog } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/designs/[id]/approve - Submit design approval
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: designId } = await params
    const body = await request.json()
    const {
      client_id,
      status, // APPROVED/REJECTED
      feedback,
      signature_data
    } = body

    // Validate required fields
    if (!client_id || !status) {
      return NextResponse.json(
        { error: 'client_id and status are required' },
        { status: 400 }
      )
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

    // Validate design exists
    const design = await db.designAsset.findUnique({
      where: { id: designId },
      include: {
        order: {
          include: {
            client: true,
            brand: true
          }
        }
      }
    })

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // Validate client has permission for this design
    if (design.order.client_id !== client_id) {
      return NextResponse.json(
        { error: 'Client not authorized for this design' },
        { status: 403 }
      )
    }

    // Check if approval already exists
    const existingApproval = await db.designApproval.findFirst({
      where: {
        design_asset_id: designId,
        client_id
      }
    })

    let approval

    if (existingApproval) {
      // Update existing approval
      approval = await db.designApproval.update({
        where: { id: existingApproval.id },
        data: {
          status,
          feedback,
          signature_data,
          approved_at: status === 'APPROVED' ? new Date() : null
        }
      })
    } else {
      // Create new approval
      approval = await db.designApproval.create({
        data: {
          design_asset_id: designId,
          client_id,
          status,
          feedback,
          signature_data,
          approved_at: status === 'APPROVED' ? new Date() : null
        }
      })
    }

    // Update design asset approval status
    const updatedDesign = await db.designAsset.update({
      where: { id: designId },
      data: {
        approval_status: status
      }
    })

    // If approved and print-ready, advance order status
    if (status === 'APPROVED' && updatedDesign.print_ready) {
      await db.order.update({
        where: { id: design.order_id },
        data: {
          status: 'PRODUCTION_PLANNED'
        }
      })
    }

    // Create audit log
    await createAuditLog({
      workspace_id: design.order.workspace_id,
      entity_type: 'design_approval',
      entity_id: approval.id,
      action: existingApproval ? 'UPDATE' : 'CREATE',
      after_data: {
        design_type: design.type,
        order_po: design.order.po_number,
        client_name: design.order.client.name,
        status,
        has_feedback: !!feedback
      }
    })

    // TODO: Send notifications
    // - Notify CSR of approval/rejection
    // - If rejected, notify designer
    // - If approved and print-ready, notify production

    return NextResponse.json({
      success: true,
      message: `Design ${status.toLowerCase()} successfully`,
      approval,
      design_status: updatedDesign.approval_status,
      order_advanced: status === 'APPROVED' && updatedDesign.print_ready
    })

  } catch (error) {
    console.error('Error processing design approval:', error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}

// GET /api/designs/[id]/approve - Get approval status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: designId } = await params

    const approvals = await db.designApproval.findMany({
      where: {
        design_asset_id: designId
      },
      include: {
        client: {
          select: {
            name: true,
            emails: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    const design = await db.designAsset.findUnique({
      where: { id: designId },
      select: {
        approval_status: true,
        print_ready: true,
        type: true,
        version: true
      }
    })

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      design_info: design,
      approvals
    })

  } catch (error) {
    console.error('Error fetching approval status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval status' },
      { status: 500 }
    )
  }
}