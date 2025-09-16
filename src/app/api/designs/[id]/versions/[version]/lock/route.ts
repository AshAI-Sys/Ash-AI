import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { lockDesignVersion, canEditDesign } from '@/lib/design-approval'

// POST /api/designs/[id]/versions/[version]/lock - Lock design version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    const { id: asset_id, version } = params
    const locked_by = 'user_id_placeholder' // TODO: Get from session

    // Check if design can be locked
    const editCheck = await canEditDesign(asset_id)
    if (!editCheck.can_edit && editCheck.reason !== 'Design approved and scheduled for production') {
      return NextResponse.json(
        { error: editCheck.reason },
        { status: 400 }
      )
    }

    // Verify design version exists and is approved
    const designVersion = await prisma.designVersion.findUnique({
      where: {
        asset_id_version: { asset_id, version: parseInt(version) }
      },
      include: {
        asset: {
          include: {
            order: {
              select: { status: true, po_number: true }
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

    if (designVersion.asset.approval_status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Design must be approved before locking' },
        { status: 400 }
      )
    }

    // Lock the design version
    await lockDesignVersion(asset_id, parseInt(version), locked_by)

    // Update order status to indicate design is locked for production
    await prisma.order.update({
      where: { id: designVersion.asset.order_id },
      data: { status: 'IN_PROGRESS' }
    })

    return NextResponse.json({
      status: 'LOCKED',
      message: 'Design version locked for production',
      locked_at: new Date().toISOString(),
      version: parseInt(version)
    })

  } catch (error) {
    console.error('Error locking design version:', error)
    return NextResponse.json(
      { error: 'Failed to lock design version' },
      { status: 500 }
    )
  }
}

// DELETE /api/designs/[id]/versions/[version]/lock - Unlock design version (emergency)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    const { id: asset_id, version } = params
    const unlocked_by = 'user_id_placeholder' // TODO: Get from session

    // Verify design version exists
    const designAsset = await prisma.designAsset.findUnique({
      where: { id: asset_id },
      include: {
        order: {
          select: { status: true, po_number: true }
        }
      }
    })

    if (!designAsset) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    if (designAsset.approval_status !== 'LOCKED') {
      return NextResponse.json(
        { error: 'Design is not locked' },
        { status: 400 }
      )
    }

    // Check if order is already in production (prevent unlocking)
    if (['IN_PRODUCTION', 'QC', 'PACKING', 'DELIVERED'].includes(designAsset.order.status)) {
      return NextResponse.json(
        { error: 'Cannot unlock design - order is already in production' },
        { status: 400 }
      )
    }

    // Unlock design version (emergency override)
    await prisma.$transaction(async (tx) => {
      // Update design asset status
      await tx.designAsset.update({
        where: { id: asset_id },
        data: {
          approval_status: 'APPROVED' // Back to approved status
        }
      })

      // Create audit log for emergency unlock
      await tx.auditLog.create({
        data: {
          workspace_id: 'workspace_id_placeholder', // TODO: Get from context
          actor_id: unlocked_by,
          entity_type: 'design_asset',
          entity_id: asset_id,
          action: 'EMERGENCY_UNLOCK',
          after: {
            version: parseInt(version),
            status: 'APPROVED',
            unlocked_at: new Date().toISOString(),
            reason: 'Emergency unlock - design changes required'
          }
        }
      })
    })

    return NextResponse.json({
      status: 'UNLOCKED',
      message: 'Design version emergency unlocked',
      unlocked_at: new Date().toISOString(),
      version: parseInt(version),
      warning: 'Emergency unlock logged for audit'
    })

  } catch (error) {
    console.error('Error unlocking design version:', error)
    return NextResponse.json(
      { error: 'Failed to unlock design version' },
      { status: 500 }
    )
  }
}