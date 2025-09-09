import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db, createAuditLog } from '@/lib/db'
// Design Revision API
// Based on CLIENT_UPDATED_PLAN.md specifications


interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/designs/[id]/revise - Submit design revision
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: designId } = await params
    const body = await request.json()
    const {
      revision_notes,
      changes_made,
      revised_by,
      new_file_url,
      new_file_name,
      new_file_size
    } = body

    // Validate required fields
    if (!revision_notes || !changes_made) {
      return NextResponse.json(
        { error: 'revision_notes and changes_made are required' },
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

    let newDesign = null

    // If new file uploaded, create new version
    if (new_file_url && new_file_name) {
      // Get next version number
      const latestDesign = await db.designAsset.findFirst({
        where: { 
          order_id: design.order_id,
          type: design.type
        },
        orderBy: { version: 'desc' }
      })
      
      const nextVersion = latestDesign ? latestDesign.version + 1 : design.version + 1

      // Create new design version
      newDesign = await db.designAsset.create({
        data: {
          order_id: design.order_id,
          version: nextVersion,
          type: design.type,
          file_url: new_file_url,
          file_name: new_file_name,
          file_size: new_file_size,
          mime_type: design.mime_type,
          color_count: design.color_count,
          print_ready: false, // Reset to false for new version
          approval_status: 'OPEN'
        }
      })

      // Update old design status
      await db.designAsset.update({
        where: { id: designId },
        data: {
          approval_status: 'REVISION_REQUESTED'
        }
      })
    }

    // Create revision record
    const revision = await db.designRevision.create({
      data: {
        design_asset_id: newDesign ? newDesign.id : designId,
        revision_notes,
        changes_made: typeof changes_made === 'object' ? changes_made : { notes: changes_made },
        revised_by: revised_by || 'system'
      }
    })

    // Reset any existing approvals if new version created
    if (newDesign) {
      await db.designApproval.updateMany({
        where: {
          design_asset_id: designId,
          status: 'OPEN'
        },
        data: {
          status: 'SUPERSEDED'
        }
      })
    }

    // Create audit log
    await createAuditLog({
      workspace_id: design.order.workspace_id,
      entity_type: 'design_revision',
      entity_id: revision.id,
      action: 'CREATE',
      after_data: {
        design_type: design.type,
        order_po: design.order.po_number,
        old_version: design.version,
        new_version: newDesign?.version || design.version,
        has_new_file: !!newDesign,
        revised_by: revised_by || 'system'
      }
    })

    // TODO: Send notifications
    // - Notify client of revision
    // - Notify CSR of revision completion
    // - If new version, notify client for re-approval

    return NextResponse.json({
      success: true,
      message: newDesign ? 'New design version created' : 'Revision notes added',
      revision,
      new_design: newDesign,
      requires_new_approval: !!newDesign
    }, { status: 201 })

  } catch (_error) {
    console.error('Error processing design revision:', _error)
    return NextResponse.json(
      { error: 'Failed to process revision' },
      { status: 500 }
    )
  }
}

// GET /api/designs/[id]/revise - Get revision history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: designId } = await params

    const revisions = await db.designRevision.findMany({
      where: {
        design_asset_id: designId
      },
      orderBy: {
        revised_at: 'desc'
      }
    })

    const design = await db.designAsset.findUnique({
      where: { id: designId },
      select: {
        type: true,
        version: true,
        approval_status: true,
        order: {
          select: {
            po_number: true,
            client: {
              select: { name: true }
            }
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

    return NextResponse.json({
      success: true,
      design_info: design,
      revisions,
      revision_count: revisions.length
    })

  } catch (_error) {
    console.error('Error fetching revision history:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch revision history' },
      { status: 500 }
    )
  }
}