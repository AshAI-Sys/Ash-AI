import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { generateCuttingInstructions } from '@/lib/cutting-calculations'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Cutting Sheets API for Stage 3 Cutting System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/cutting/sheets - Get cutting sheets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const cutting_plan_id = searchParams.get('cutting_plan_id')
    const status = searchParams.get('status')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    // Build where clause based on filters
    const where: any = {}
    if (cutting_plan_id) {
      where.cutting_plan_id = cutting_plan_id
    } else {
      // If no specific plan, filter by workspace through cutting plan relation
      where.cutting_plan = {
        workspace_id
      }
    }
    if (status) where.status = status

    const cutting_sheets = await db.cuttingSheet.findMany({
      where,
      include: {
        cutting_plan: {
          select: {
            plan_name: true,
            fabric_type: true,
            order: {
              select: {
                po_number: true,
                client: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        cut_pieces: {
          select: {
            id: true,
            piece_name: true,
            size: true,
            quantity: true,
            quality_check: true
          }
        }
      },
      orderBy: [
        { cutting_plan_id: 'asc' },
        { sheet_number: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      cutting_sheets: cutting_sheets.map(sheet => ({
        ...sheet,
        progress: {
          total_pieces: sheet.pieces_count,
          cut_pieces: sheet.cut_pieces.length,
          passed_qc: sheet.cut_pieces.filter(p => p.quality_check === 'PASS').length,
          failed_qc: sheet.cut_pieces.filter(p => p.quality_check === 'FAIL').length
        }
      }))
    })

  } catch (_error) {
    console.error('Error fetching cutting sheets:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cutting sheets' },
      { status: 500 }
    )
  }
}

// POST /api/cutting/sheets/start - Start cutting a sheet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cutting_sheet_id,
      workspace_id,
      operator_name,
      cutting_method = 'MANUAL' // MANUAL, LASER, DIE_CUT
    } = body

    if (!cutting_sheet_id || !workspace_id || !operator_name) {
      return NextResponse.json(
        { error: 'cutting_sheet_id, workspace_id, and operator_name are required' },
        { status: 400 }
      )
    }

    // Get cutting sheet with plan details
    const cutting_sheet = await db.cuttingSheet.findFirst({
      where: {
        id: cutting_sheet_id,
        cutting_plan: {
          workspace_id
        }
      },
      include: {
        cutting_plan: {
          select: {
            fabric_type: true,
            order: {
              select: {
                po_number: true
              }
            }
          }
        }
      }
    })

    if (!cutting_sheet) {
      return NextResponse.json(
        { error: 'Cutting sheet not found or access denied' },
        { status: 404 }
      )
    }

    if (cutting_sheet.status !== 'OPEN') {
      return NextResponse.json(
        { error: `Cannot start cutting sheet in ${cutting_sheet.status} status` },
        { status: 400 }
      )
    }

    // Ashley AI validation for cutting start
    const ashley_check = await validateAshleyAI({
      context: 'CUTTING_START',
      operator_name,
      cutting_method,
      pieces_count: cutting_sheet.pieces_count,
      fabric_type: cutting_sheet.cutting_plan.fabric_type
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked cutting start',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Update sheet status to cutting
    const updated_sheet = await db.cuttingSheet.update({
      where: { id: cutting_sheet_id },
      data: {
        status: 'CUTTING',
        started_at: new Date(),
        cut_by: operator_name
      },
      include: {
        cutting_plan: {
          select: {
            plan_name: true,
            fabric_type: true,
            order: {
              select: {
                po_number: true
              }
            }
          }
        }
      }
    })

    // Generate cutting instructions
    const layout_data = cutting_sheet.layout_data as any
    const cutting_instructions = generateCuttingInstructions(
      [{
        sheet_number: cutting_sheet.sheet_number,
        sheet_width_cm: cutting_sheet.sheet_width_cm,
        sheet_length_cm: cutting_sheet.sheet_length_cm,
        pieces: layout_data?.pieces || [],
        utilization_pct: layout_data?.utilization_pct || 0,
        waste_area_cm2: layout_data?.waste_area_cm2 || 0
      }],
      cutting_sheet.cutting_plan.fabric_type,
      ['Handle with care', 'Follow grain direction']
    )

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'cutting_sheet',
        entity_id: cutting_sheet_id,
        action: 'UPDATE',
        after_data: {
          action: 'START_CUTTING',
          operator_name,
          cutting_method,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      cutting_sheet: updated_sheet,
      cutting_instructions: cutting_instructions[0],
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    })

  } catch (_error) {
    console.error('Error starting cutting sheet:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to start cutting sheet' },
      { status: 500 }
    )
  }
}

// PUT /api/cutting/sheets - Update cutting sheet status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cutting_sheet_id,
      workspace_id,
      status,
      notes,
      pieces_data // Array of cut pieces with quality check results
    } = body

    if (!cutting_sheet_id || !workspace_id) {
      return NextResponse.json(
        { error: 'cutting_sheet_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing cutting sheet
    const existing_sheet = await db.cuttingSheet.findFirst({
      where: {
        id: cutting_sheet_id,
        cutting_plan: {
          workspace_id
        }
      },
      include: {
        cutting_plan: true
      }
    })

    if (!existing_sheet) {
      return NextResponse.json(
        { error: 'Cutting sheet not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = {}
    if (status) update_data.status = status
    if (notes) update_data.notes = notes
    if (status === 'COMPLETED') update_data.completed_at = new Date()

    // Update cutting sheet
    const updated_sheet = await db.cuttingSheet.update({
      where: { id: cutting_sheet_id },
      data: update_data
    })

    // Create or update cut pieces if provided
    if (pieces_data && pieces_data.length > 0) {
      await Promise.all(
        pieces_data.map(async (piece: any) => {
          // First check if order items exist for this order
          let order_item = await db.orderItem.findFirst({
            where: {
              order_id: existing_sheet.cutting_plan.order_id,
              size: piece.size,
              color: piece.color || 'Default'
            }
          })

          // Create order item if it doesn't exist
          if (!order_item) {
            order_item = await db.orderItem.create({
              data: {
                order_id: existing_sheet.cutting_plan.order_id,
                sku: `${piece.piece_name}-${piece.size}`.toUpperCase(),
                product_name: piece.piece_name,
                size: piece.size,
                color: piece.color || 'Default',
                quantity: piece.quantity || 1,
                unit_price: 0,
                total_price: 0
              }
            })
          }

          return await db.cutPiece.create({
            data: {
              cutting_sheet_id,
              order_item_id: order_item.id,
              piece_name: piece.piece_name,
              size: piece.size,
              quantity: piece.quantity || 1,
              position_x: piece.position_x || 0,
              position_y: piece.position_y || 0,
              dimensions: piece.dimensions || {},
              quality_check: piece.quality_check || 'OPEN',
              defect_notes: piece.defect_notes
            }
          })
        })
      )
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'cutting_sheet',
        entity_id: cutting_sheet_id,
        action: 'UPDATE',
        before_data: existing_sheet,
        after_data: {
          ...update_data,
          pieces_added: pieces_data?.length || 0
        }
      }
    })

    // Get updated sheet with pieces
    const result_sheet = await db.cuttingSheet.findUnique({
      where: { id: cutting_sheet_id },
      include: {
        cutting_plan: {
          select: {
            plan_name: true,
            order: {
              select: {
                po_number: true
              }
            }
          }
        },
        cut_pieces: {
          select: {
            id: true,
            piece_name: true,
            size: true,
            quantity: true,
            quality_check: true,
            defect_notes: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      cutting_sheet: result_sheet
    })

  } catch (_error) {
    console.error('Error updating cutting sheet:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update cutting sheet' },
      { status: 500 }
    )
  }
}