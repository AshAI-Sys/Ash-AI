import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateFabricBatchSchema = z.object({
  qty_on_hand: z.number().min(0).optional(),
  gsm: z.number().positive().optional(),
  width_cm: z.number().positive().optional(),
  lot_no: z.string().optional()
})

// GET /api/cutting/fabric-batches/[id] - Get specific fabric batch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fabricBatch = await prisma.fabricBatch.findUnique({
      where: { id: params.id },
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

    if (!fabricBatch) {
      return NextResponse.json(
        { error: 'Fabric batch not found' },
        { status: 404 }
      )
    }

    // Calculate total issued
    const totalIssued = fabricBatch.cut_issues.reduce(
      (sum, issue) => sum + parseFloat(issue.qty_issued.toString()),
      0
    )

    return NextResponse.json({
      ...fabricBatch,
      total_issued: totalIssued,
      usage_history: fabricBatch.cut_issues
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = updateFabricBatchSchema.parse(body)

    const fabricBatch = await prisma.fabricBatch.update({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    // Check if batch has any cut issues
    const cutIssueCount = await prisma.cutIssue.count({
      where: { batch_id: params.id }
    })

    if (cutIssueCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fabric batch with existing cut issues' },
        { status: 400 }
      )
    }

    await prisma.fabricBatch.delete({
      where: { id: params.id }
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