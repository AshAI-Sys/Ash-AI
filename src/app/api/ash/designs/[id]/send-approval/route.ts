import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { EventBus } from '@/lib/ash/event-bus'
import { randomUUID } from 'crypto'

/**
 * Send for Client Approval
 * POST /api/ash/designs/{asset_id}/send-approval
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const assetId = id
    const body = await request.json()
    const {
      client_id,
      message_template_id: _message_template_id,
      require_esign = false
    } = body

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      )
    }

    // Get design asset with current version
    const designAsset = await prisma.designAsset.findUnique({
      where: { id: assetId },
      include: {
        order: {
          include: { brand: true, client: true }
        }
      }
    })

    if (!designAsset) {
      return NextResponse.json(
        { error: 'Design asset not found' },
        { status: 404 }
      )
    }

    // Check if already has pending approval for current version
    const existingApproval = await prisma.designApproval.findFirst({
      where: {
        assetId,
        version: designAsset.currentVersion,
        status: 'SENT'
      }
    })

    if (existingApproval) {
      return NextResponse.json(
        { error: 'Approval already pending for current version' },
        { status: 400 }
      )
    }

    // Create approval record
    const approval = await prisma.designApproval.create({
      data: {
        assetId,
        version: designAsset.currentVersion,
        clientId: client_id,
        esignEnvelopeId: require_esign ? `pending-${randomUUID()}` : null
      }
    })

    // Update design asset status
    await prisma.designAsset.update({
      where: { id: assetId },
      data: { status: 'PENDING_APPROVAL' }
    })

    // Generate portal link (magic link)
    const portalToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 72) // 3 days expiry

    await prisma.portalSession.create({
      data: {
        clientId: client_id,
        brandId: designAsset.order.brandId,
        token: portalToken,
        expiresAt
      }
    })

    const portalLink = `${process.env.NEXTAUTH_URL}/portal/approvals/${approval.id}?token=${portalToken}`

    // Emit event for notifications
    await EventBus.emit('ash.design.approval.sent', {
      approval_id: approval.id,
      asset_id: assetId,
      version: designAsset.currentVersion,
      client_id,
      brand_id: designAsset.order.brandId,
      order_id: designAsset.orderId,
      portal_link: portalLink,
      require_esign
    })

    return NextResponse.json({
      approval_id: approval.id,
      portal_link: portalLink,
      expires_at: expiresAt.toISOString()
    })

  } catch (_error) {
    console.error('Error sending design approval:', _error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}