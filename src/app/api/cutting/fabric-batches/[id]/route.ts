import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  getAuthenticatedUser,
  hasPermission,
  getFabricBatchWithWorkspaceCheck,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validateUUID
} from '@/lib/auth-helpers'

const updateFabricBatchSchema = z.object({
  qty_on_hand: z.number().min(0).optional(),
  gsm: z.number().positive().optional(),
  width_cm: z.number().positive().optional(),
  lot_no: z.string().optional()
})

// GET /api/cutting/fabric-batches/[id] - Get specific fabric batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Permission check
    if (!hasPermission(user, 'cutting.view')) {
      return forbiddenResponse('Insufficient permissions to view fabric batches')
    }

    // Validate UUID
    try {
      validateUUID(id)
    } catch {
      return NextResponse.json(
        { error: 'Invalid batch ID format' },
        { status: 400 }
      )
    }

    // Get fabric batch with workspace validation
    const fabricBatch = await getFabricBatchWithWorkspaceCheck(id, user.workspace_id)
    if (!fabricBatch) {
      return notFoundResponse('Fabric batch')
    }

    // Get additional data with workspace filtering
    const fabricBatchDetails = await prisma.fabricBatch.findUnique({
      where: { id },
      include: {
        brand: {
          select: { name: true, code: true }
        },
        cut_issues: {
          include: {
            order: {
              select: { po_number: true, product_type: true }
            },
            issued_user: {
              select: { full_name: true }
            }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    })

    // Calculate total issued
    const totalIssued = fabricBatchDetails?.cut_issues.reduce(
      (sum, issue) => sum + parseFloat(issue.qty_issued.toString()),
      0
    ) || 0

    return NextResponse.json({
      ...fabricBatchDetails,
      total_issued: totalIssued,
      usage_history: fabricBatchDetails?.cut_issues || []
    })

  } catch (error) {
    console.error('Error fetching fabric batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/cutting/fabric-batches/[id] - Update fabric batch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Permission check
    if (!hasPermission(user, 'cutting.edit')) {
      return forbiddenResponse('Insufficient permissions to edit fabric batches')
    }

    // Validate UUID
    try {
      validateUUID(id)
    } catch {
      return NextResponse.json(
        { error: 'Invalid batch ID format' },
        { status: 400 }
      )
    }

    // Verify fabric batch exists and user has access
    const existingBatch = await getFabricBatchWithWorkspaceCheck(id, user.workspace_id)
    if (!existingBatch) {
      return notFoundResponse('Fabric batch')
    }

    const body = await request.json()
    const validatedData = updateFabricBatchSchema.parse(body)

    const fabricBatch = await prisma.fabricBatch.update({
      where: { id },
      data: validatedData,
      include: {
        brand: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(fabricBatch)

  } catch (error) {
    console.error('Error updating fabric batch:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Fabric batch not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/cutting/fabric-batches/[id] - Delete fabric batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Permission check
    if (!hasPermission(user, 'cutting.delete')) {
      return forbiddenResponse('Insufficient permissions to delete fabric batches')
    }

    // Validate UUID
    try {
      validateUUID(id)
    } catch {
      return NextResponse.json(
        { error: 'Invalid batch ID format' },
        { status: 400 }
      )
    }

    // Verify fabric batch exists and user has access
    const existingBatch = await getFabricBatchWithWorkspaceCheck(id, user.workspace_id)
    if (!existingBatch) {
      return notFoundResponse('Fabric batch')
    }

    // Check if batch has any cut issues
    const cutIssueCount = await prisma.cutIssue.count({
      where: {
        batch_id: id,
        batch: {
          workspace_id: user.workspace_id
        }
      }
    })

    if (cutIssueCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fabric batch with existing cut issues' },
        { status: 400 }
      )
    }

    await prisma.fabricBatch.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Fabric batch deleted successfully' })

  } catch (error) {
    console.error('Error deleting fabric batch:', error)

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Fabric batch not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}