import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema validation for cutting issues
const createCutIssueSchema = z.object({
  order_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  qty_issued: z.number().positive(),
  uom: z.enum(['KG', 'M'])
})

// POST /api/cutting/issues - Issue fabric to cutting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createCutIssueSchema.parse(body)

    // Get user ID from session (simplified for now)
    const issued_by = 'user_id_placeholder' // TODO: Get from session

    // Check if fabric batch exists and has sufficient quantity
    const fabricBatch = await prisma.fabricBatch.findUnique({
      where: { id: validatedData.batch_id }
    })

    if (!fabricBatch) {
      return NextResponse.json(
        { error: 'Fabric batch not found' },
        { status: 404 }
      )
    }

    if (Number(fabricBatch.qty_on_hand) < validatedData.qty_issued) {
      return NextResponse.json(
        { error: 'Insufficient fabric quantity available' },
        { status: 400 }
      )
    }

    // Create cut issue transaction
    const cutIssue = await prisma.$transaction(async (tx) => {
      // Create the cut issue record
      const issue = await tx.cutIssue.create({
        data: {
          order_id: validatedData.order_id,
          batch_id: validatedData.batch_id,
          qty_issued: validatedData.qty_issued,
          uom: validatedData.uom,
          issued_by
        }
      })

      // Update fabric batch quantity
      await tx.fabricBatch.update({
        where: { id: validatedData.batch_id },
        data: {
          qty_on_hand: {
            decrement: validatedData.qty_issued
          }
        }
      })

      return issue
    })

    // Emit event (placeholder)
    // eventEmitter.emit('ash.cutting.issue.created', cutIssue)

    return NextResponse.json({ id: cutIssue.id }, { status: 201 })

  } catch (error) {
    console.error('Error creating cut issue:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/cutting/issues - List cutting issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    const where = order_id ? { order_id } : {}

    const cutIssues = await prisma.cutIssue.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            product_type: true
          }
        },
        batch: {
          select: {
            lot_no: true,
            uom: true,
            gsm: true,
            width_cm: true
          }
        },
        issued_user: {
          select: {
            full_name: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ data: cutIssues })

  } catch (error) {
    console.error('Error fetching cut issues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}