import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApprovalToken } from '@/lib/design-approval'

// GET /api/portal/approvals/[id] - Get approval details for client portal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const approval_id = params.id

    if (!token) {
      return NextResponse.json(
        { error: 'Approval token is required' },
        { status: 401 }
      )
    }

    // Verify approval token
    const tokenValid = await verifyApprovalToken(approval_id, token)

    if (!tokenValid) {
      return NextResponse.json(
        { error: 'Invalid or expired approval link' },
        { status: 401 }
      )
    }

    // Get approval details with design and order info
    const approval = await prisma.designApproval.findUnique({
      where: { id: approval_id },
      include: {
        design_asset: {
          include: {
            order: {
              include: {
                brand: {
                  select: { name: true, code: true }
                },
                client: {
                  select: { name: true, company: true }
                }
              }
            },
            design_versions: {
              orderBy: { version: 'desc' },
              take: 1
            },
            design_checks: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          }
        },
        client: {
          select: { name: true, company: true, emails: true }
        }
      }
    })

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      )
    }

    // Get latest design version
    const latestVersion = approval.design_asset.design_versions[0]
    const latestCheck = approval.design_asset.design_checks[0]

    // Format response for client portal
    const response = {
      approval_id,
      status: approval.status,
      order: {
        po_number: approval.design_asset.order.po_number,
        product_type: approval.design_asset.order.product_type,
        method: approval.design_asset.order.method,
        total_qty: approval.design_asset.order.total_qty,
        target_delivery_date: approval.design_asset.order.target_delivery_date,
        brand: approval.design_asset.order.brand
      },
      design: {
        name: approval.design_asset.file_name,
        type: approval.design_asset.type,
        version: latestVersion?.version || approval.design_asset.version,
        files: latestVersion?.files || {
          mockup_url: approval.design_asset.file_url
        },
        placements: latestVersion?.placements || [],
        palette: latestVersion?.palette || [],
        quality_check: latestCheck ? {
          result: latestCheck.result,
          issues: latestCheck.issues,
          metrics: latestCheck.metrics
        } : null
      },
      client: approval.client,
      timeline: {
        sent_at: approval.created_at,
        expires_at: new Date(approval.created_at.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        responded_at: approval.approver_signed_at
      },
      esign_required: !!approval.esign_envelope_id,
      esign_url: approval.esign_envelope_id ?
        `${process.env.ASH_APP_URL}/portal/esign/${approval.esign_envelope_id}` : null
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching approval details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval details' },
      { status: 500 }
    )
  }
}

// PUT /api/portal/approvals/[id] - Update approval (for portal use)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { token, viewed_at } = body
    const approval_id = params.id

    if (!token) {
      return NextResponse.json(
        { error: 'Approval token is required' },
        { status: 401 }
      )
    }

    // Verify approval token
    const tokenValid = await verifyApprovalToken(approval_id, token)

    if (!tokenValid) {
      return NextResponse.json(
        { error: 'Invalid or expired approval link' },
        { status: 401 }
      )
    }

    // Update approval record (e.g., mark as viewed)
    const updates: any = {}
    if (viewed_at) {
      updates.viewed_at = new Date(viewed_at)
    }

    if (Object.keys(updates).length > 0) {
      await prisma.designApproval.update({
        where: { id: approval_id },
        data: updates
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating approval:', error)
    return NextResponse.json(
      { error: 'Failed to update approval' },
      { status: 500 }
    )
  }
}