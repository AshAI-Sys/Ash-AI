import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db, createAuditLog } from '@/lib/db'
// Stage 2: Design & Approval API
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/designs - Fetch design assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const workspace_id = searchParams.get('workspace_id')
    
    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = {}
    
    if (order_id) {
      where.order_id = order_id
      // Verify order belongs to workspace
      const order = await db.order.findFirst({
        where: { id: order_id, workspace_id }
      })
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found or access denied' },
          { status: 404 }
        )
      }
    } else {
      // Get all designs for workspace
      where.order = {
        workspace_id
      }
    }

    const designs = await db.designAsset.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            client: {
              select: { name: true }
            },
            brand: {
              select: { name: true }
            }
          }
        },
        approvals: {
          include: {
            client: {
              select: { name: true, emails: true }
            }
          }
        },
        revisions: {
          orderBy: { revised_at: 'desc' },
          take: 5
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      designs
    })

  } catch (_error) {
    console.error('Error fetching designs:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    )
  }
}

// POST /api/designs - Upload design asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      order_id,
      type,
      file_url,
      file_name,
      file_size,
      mime_type,
      color_count,
      print_ready
    } = body

    // Validate required fields
    if (!order_id || !type || !file_url || !file_name) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, type, file_url, file_name' },
        { status: 400 }
      )
    }

    // Validate order exists
    const order = await db.order.findUnique({
      where: { id: order_id },
      include: {
        client: true,
        brand: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get next version number
    const latestDesign = await db.designAsset.findFirst({
      where: { order_id, type },
      orderBy: { version: 'desc' }
    })
    
    const version = latestDesign ? latestDesign.version + 1 : 1

    // Create design asset
    const design = await db.designAsset.create({
      data: {
        order_id,
        version,
        type,
        file_url,
        file_name,
        file_size,
        mime_type,
        color_count,
        print_ready: print_ready || false,
        approval_status: 'OPEN'
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id: order.workspace_id,
      entity_type: 'design_asset',
      entity_id: design.id,
      action: 'CREATE',
      after_data: {
        order_po: order.po_number,
        type: design.type,
        version: design.version,
        file_name: design.file_name
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Design asset uploaded successfully',
      design
    }, { status: 201 })

  } catch (_error) {
    console.error('Error uploading design:', _error)
    return NextResponse.json(
      { error: 'Failed to upload design' },
      { status: 500 }
    )
  }
}

// PATCH /api/designs/[id] - Update design status
export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const designId = url.pathname.split('/').pop()
    
    if (!designId) {
      return NextResponse.json(
        { error: 'Design ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      approval_status,
      print_ready,
      complexity_score,
      color_count
    } = body

    const existingDesign = await db.designAsset.findUnique({
      where: { id: designId },
      include: {
        order: true
      }
    })

    if (!existingDesign) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    const updatedDesign = await db.designAsset.update({
      where: { id: designId },
      data: {
        ...(approval_status && { approval_status }),
        ...(print_ready !== undefined && { print_ready }),
        ...(complexity_score && { complexity_score }),
        ...(color_count && { color_count }),
        updated_at: new Date()
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id: existingDesign.order.workspace_id,
      entity_type: 'design_asset',
      entity_id: designId,
      action: 'UPDATE',
      before_data: {
        approval_status: existingDesign.approval_status,
        print_ready: existingDesign.print_ready
      },
      after_data: {
        approval_status: updatedDesign.approval_status,
        print_ready: updatedDesign.print_ready
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Design updated successfully',
      design: updatedDesign
    })

  } catch (_error) {
    console.error('Error updating design:', _error)
    return NextResponse.json(
      { error: 'Failed to update design' },
      { status: 500 }
    )
  }
}