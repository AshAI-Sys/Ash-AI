import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ designId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - Stage 2 Actors per CLIENT_UPDATED_PLAN.md
    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.GRAPHIC_ARTIST]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { designId } = await params
    const { approvalType, comments } = await request.json()

    // Update design status based on approval type
    let newStatus = 'Approved'
    let lockDate = null
    
    if (approvalType === 'lock_for_production') {
      newStatus = 'Locked'
      lockDate = new Date()
    }

    // Mock database update - would be actual Prisma call
    const updatedDesign = {
      id: designId,
      status: newStatus,
      approvedBy: session.user.id,
      approvedAt: new Date(),
      lockedAt: lockDate,
      approvalComments: comments
    }

    // Log approval action for audit trail
    console.log(`Design ${designId} ${approvalType} by ${session.user.full_name}`)

    // If design is locked, trigger production routing
    if (newStatus === 'Locked') {
      // Ashley AI: Connect approved designs to printing specs and pattern areas
      // This would trigger Stage 3 preparation
      console.log(`Design ${designId} locked - triggering production setup`)
    }

    return NextResponse.json({
      success: true,
      design: updatedDesign,
      message: `Design ${approvalType === 'lock_for_production' ? 'locked for production' : 'approved'} successfully`
    })

  } catch (_error) {
    console.error('Design approval error:', _error)
    return NextResponse.json(
      { error: 'Failed to process design approval' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ designId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { designId } = await params
    const { action, comments, revisionRequests } = await request.json()

    let newStatus = 'Pending_Review'

    switch (action) {
      case 'request_revision':
        newStatus = 'Revision_Requested'
        break
      case 'send_to_client':
        newStatus = 'Client_Review'
        break
      case 'unlock_design':
        // Only ADMIN/MANAGER can unlock locked designs
        if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
          return NextResponse.json({ error: 'Cannot unlock design' }, { status: 403 })
        }
        newStatus = 'Approved'
        break
    }

    // Mock database update
    const updatedDesign = {
      id: designId,
      status: newStatus,
      lastModifiedBy: session.user.id,
      lastModifiedAt: new Date(),
      comments: comments,
      revisionRequests: revisionRequests || []
    }

    return NextResponse.json({
      success: true,
      design: updatedDesign,
      message: `Design ${action} completed successfully`
    })

  } catch (_error) {
    console.error('Design update error:', _error)
    return NextResponse.json(
      { error: 'Failed to update design' },
      { status: 500 }
    )
  }
}