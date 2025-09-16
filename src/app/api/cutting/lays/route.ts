import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema validation for creating lays
const createLaySchema = z.object({
  order_id: z.string().uuid(),
  marker_name: z.string().optional(),
  marker_width_cm: z.number().positive().optional(),
  lay_length_m: z.number().positive().optional(),
  plies: z.number().positive().optional(),
  gross_used: z.number().positive(),
  offcuts: z.number().min(0).default(0),
  defects: z.number().min(0).default(0),
  uom: z.enum(['KG', 'M']),
  outputs: z.array(z.object({
    size_code: z.string(),
    qty: z.number().min(0)
  }))
})

// POST /api/cutting/lays - Create lay & log outputs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createLaySchema.parse(body)

    // Get user ID from session (simplified for now)
    const created_by = 'user_id_placeholder' // TODO: Get from session

    // Create lay with outputs in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the lay record
      const lay = await tx.cutLay.create({
        data: {
          order_id: validatedData.order_id,
          marker_name: validatedData.marker_name,
          marker_width_cm: validatedData.marker_width_cm,
          lay_length_m: validatedData.lay_length_m,
          plies: validatedData.plies,
          gross_used: validatedData.gross_used,
          offcuts: validatedData.offcuts,
          defects: validatedData.defects,
          uom: validatedData.uom,
          created_by
        }
      })

      // Create output records for each size
      const outputs = await Promise.all(
        validatedData.outputs.map(output =>
          tx.cutOutput.create({
            data: {
              lay_id: lay.id,
              size_code: output.size_code,
              qty: output.qty
            }
          })
        )
      )

      return { lay, outputs }
    })

    // Calculate efficiency and waste (Ashley AI logic)
    const efficiency = await calculateMarkerEfficiency(result.lay, validatedData.outputs as Array<{size_code: string, qty: number}>)

    // Emit event (placeholder)
    // eventEmitter.emit('ash.cutting.lay.created', result.lay)

    return NextResponse.json({
      lay_id: result.lay.id,
      efficiency,
      outputs: result.outputs
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating lay:', error)

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

// GET /api/cutting/lays - List cutting lays
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    const where = order_id ? { order_id } : {}

    const lays = await prisma.cutLay.findMany({
      where,
      include: {
        order: {
          select: {
            po_number: true,
            product_type: true
          }
        },
        created_user: {
          select: {
            full_name: true
          }
        },
        cut_outputs: true
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ data: lays })

  } catch (error) {
    console.error('Error fetching lays:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate marker efficiency
async function calculateMarkerEfficiency(lay: any, outputs: Array<{size_code: string, qty: number}>) {
  try {
    // Get pattern areas for each size (simplified calculation)
    const patternAreas: Record<string, number> = {
      'XS': 2800, 'S': 3200, 'M': 3600, 'L': 4000, 'XL': 4400, 'XXL': 4800
    }

    if (!lay.marker_width_cm || !lay.lay_length_m || !lay.plies) {
      return { efficiency: null, message: 'Missing dimensions for efficiency calculation' }
    }

    // Calculate total fabric area (cm²)
    const totalFabricArea = lay.marker_width_cm * (lay.lay_length_m * 100) * lay.plies

    // Calculate used area for pieces
    const usedForPiecesArea = outputs.reduce((total, output) => {
      const patternArea = patternAreas[output.size_code] || 3600 // Default to M size
      return total + (output.qty * patternArea)
    }, 0)

    // Calculate efficiency percentage
    const efficiency = (usedForPiecesArea / totalFabricArea) * 100

    // Calculate waste percentage
    const wastePercentage = ((lay.offcuts + lay.defects) / parseFloat(lay.gross_used.toString())) * 100

    return {
      efficiency: Math.round(efficiency * 100) / 100,
      waste_percentage: Math.round(wastePercentage * 100) / 100,
      total_fabric_area: totalFabricArea,
      used_for_pieces_area: usedForPiecesArea,
      ashley_check: efficiency < 78 ? 'WARN: Low efficiency' : 'PASS'
    }

  } catch (error) {
    console.error('Error calculating efficiency:', error)
    return { efficiency: null, error: 'Calculation failed' }
  }
}