import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema validation for fabric batches
const createFabricBatchSchema = z.object({
  brand_id: z.string().uuid(),
  item_id: z.string().uuid(),
  lot_no: z.string().optional(),
  uom: z.enum(['KG', 'M']),
  qty_on_hand: z.number().positive(),
  gsm: z.number().positive().optional(),
  width_cm: z.number().positive().optional(),
  received_at: z.string().datetime().optional()
})

const updateFabricBatchSchema = z.object({
  qty_on_hand: z.number().min(0).optional(),
  gsm: z.number().positive().optional(),
  width_cm: z.number().positive().optional()
})

// POST /api/cutting/fabric-batches - Create new fabric batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createFabricBatchSchema.parse(body)

    // Get workspace_id from brand
    const brand = await prisma.brand.findUnique({
      where: { id: validatedData.brand_id },
      select: { workspace_id: true }
    })

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    const fabricBatch = await prisma.fabricBatch.create({
      data: {
        workspace_id: brand.workspace_id,
        brand_id: validatedData.brand_id,
        item_id: validatedData.item_id,
        lot_no: validatedData.lot_no,
        uom: validatedData.uom,
        qty_on_hand: validatedData.qty_on_hand,
        gsm: validatedData.gsm,
        width_cm: validatedData.width_cm,
        received_at: validatedData.received_at ? new Date(validatedData.received_at) : new Date()
      },
      include: {
        brand: {
          select: { name: true, code: true }
        }
      }
    })

    return NextResponse.json(fabricBatch, { status: 201 })

  } catch (error) {
    console.error('Error creating fabric batch:', error)

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

// GET /api/cutting/fabric-batches - List fabric batches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brand_id = searchParams.get('brand_id')
    const item_id = searchParams.get('item_id')
    const uom = searchParams.get('uom')
    const available_only = searchParams.get('available_only') === 'true'

    const where: any = {}
    if (brand_id) where.brand_id = brand_id
    if (item_id) where.item_id = item_id
    if (uom) where.uom = uom
    if (available_only) where.qty_on_hand = { gt: 0 }

    const fabricBatches = await prisma.fabricBatch.findMany({
      where,
      include: {
        brand: {
          select: { name: true, code: true }
        },
        cut_issues: {
          select: {
            id: true,
            qty_issued: true,
            created_at: true,
            order: {
              select: { po_number: true }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 5
        }
      },
      orderBy: { received_at: 'desc' }
    })

    // Calculate totals
    const totals = fabricBatches.reduce((acc, batch) => {
      const key = `${batch.uom}`
      if (!acc[key]) acc[key] = 0
      acc[key] += parseFloat(batch.qty_on_hand.toString())
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      data: fabricBatches,
      totals,
      summary: {
        total_batches: fabricBatches.length,
        available_batches: fabricBatches.filter(b => Number(b.qty_on_hand) > 0).length
      }
    })

  } catch (error) {
    console.error('Error fetching fabric batches:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/cutting/fabric-batches/[id] - Update fabric batch
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const batchId = pathParts[pathParts.length - 1]

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateFabricBatchSchema.parse(body)

    const fabricBatch = await prisma.fabricBatch.update({
      where: { id: batchId },
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}