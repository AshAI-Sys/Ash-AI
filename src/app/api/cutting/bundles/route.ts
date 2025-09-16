import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateQRCode } from '@/lib/qr-generator'

// Schema validation for creating bundles
const createBundleSchema = z.object({
  order_id: z.string().uuid(),
  from_lay_id: z.string().uuid(),
  bundle_size_per_size: z.record(z.string(), z.number().positive())
})

// POST /api/cutting/bundles - Create bundles with QR codes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createBundleSchema.parse(body)

    // Get the lay and its outputs
    const lay = await prisma.cutLay.findUnique({
      where: { id: validatedData.from_lay_id },
      include: {
        cut_outputs: true,
        order: {
          select: {
            po_number: true,
            workspace_id: true
          }
        }
      }
    })

    if (!lay) {
      return NextResponse.json(
        { error: 'Lay not found' },
        { status: 404 }
      )
    }

    // Create bundles for each size
    const bundles = await prisma.$transaction(async (tx) => {
      const createdBundles = []

      for (const output of lay.cut_outputs) {
        const bundleSize = validatedData.bundle_size_per_size[output.size_code]
        if (!bundleSize) continue

        const numBundles = Math.ceil(output.qty / bundleSize)

        for (let i = 0; i < numBundles; i++) {
          const remainingQty = output.qty - (i * bundleSize)
          const currentBundleQty = Math.min(bundleSize, remainingQty)

          if (currentBundleQty <= 0) break

          // Generate bundle number and QR code
          const bundleNo = await generateBundleNumber(
            lay.order.workspace_id,
            lay.order.po_number,
            output.size_code,
            i + 1
          )

          const qrContent = `ash://bundle/${bundleNo}`
          const qrCodeUrl = await generateQRCode(qrContent)

          const bundle = await tx.bundle.create({
            data: {
              workspace_id: lay.order.workspace_id,
              order_id: validatedData.order_id,
              bundle_no: bundleNo,
              total_qty: currentBundleQty,
              current_qty: currentBundleQty,
              cut_pieces_ids: JSON.stringify([{
                lay_id: validatedData.from_lay_id,
                size_code: output.size_code,
                qty: currentBundleQty
              }]),
              status: 'CREATED'
            }
          })

          createdBundles.push({
            id: bundle.id,
            bundle_no: bundle.bundle_no,
            size_code: output.size_code,
            qty: currentBundleQty,
            qr_code: qrCodeUrl,
            qr_content: qrContent
          })
        }
      }

      return createdBundles
    })

    // Emit event (placeholder)
    // eventEmitter.emit('ash.bundles.created', { bundles, lay_id: validatedData.from_lay_id })

    return NextResponse.json({
      bundles,
      total_bundles: bundles.length,
      lay_id: validatedData.from_lay_id
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating bundles:', error)

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

// GET /api/cutting/bundles - List bundles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')
    const status = searchParams.get('status')

    const where: any = {}
    if (order_id) where.order_id = order_id
    if (status) where.status = status

    const bundles = await prisma.bundle.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            product_type: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ data: bundles })

  } catch (error) {
    console.error('Error fetching bundles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate bundle number
async function generateBundleNumber(
  workspace_id: string,
  po_number: string,
  size_code: string,
  sequence: number
): Promise<string> {
  // Format: {PO}-{SIZE}-{SEQ} (e.g., REEF-2025-000123-M-001)
  const paddedSequence = sequence.toString().padStart(3, '0')
  return `${po_number}-${size_code}-${paddedSequence}`
}