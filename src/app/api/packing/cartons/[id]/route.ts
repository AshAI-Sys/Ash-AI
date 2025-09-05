// Individual Carton API for Stage 7 Finishing & Packing System
// Handles adding/removing units to/from specific cartons

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// POST /api/packing/cartons/[id] - Add units to carton
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      workspace_id,
      finished_unit_id,
      qty = 1,
      action = 'ADD' // ADD or REMOVE
    } = body

    if (!workspace_id || !finished_unit_id) {
      return NextResponse.json(
        { error: 'workspace_id and finished_unit_id are required' },
        { status: 400 }
      )
    }

    // Validate carton exists and belongs to workspace
    const carton = await db.finishingCarton.findFirst({
      where: {
        id: id,
        workspace_id
      },
      include: {
        carton_contents: {
          include: {
            finished_unit: {
              select: {
                sku: true,
                size_code: true,
                weight_g: true
              }
            }
          }
        }
      }
    })

    if (!carton) {
      return NextResponse.json(
        { error: 'Carton not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    if (carton.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot modify closed carton' },
        { status: 409 }
      )
    }

    // Validate finished unit exists and belongs to workspace
    const finished_unit = await db.finishedUnit.findFirst({
      where: {
        id: finished_unit_id,
        workspace_id
      }
    })

    if (!finished_unit) {
      return NextResponse.json(
        { error: 'Finished unit not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    if (action === 'ADD') {
      // Check if unit is already packed in another carton
      const existing_content = await db.cartonContent.findFirst({
        where: {
          finished_unit_id,
          carton: {
            workspace_id,
            status: { not: 'CLOSED' } // Only check non-closed cartons
          }
        },
        include: {
          carton: {
            select: {
              id: true,
              carton_no: true,
              order: {
                select: {
                  po_number: true
                }
              }
            }
          }
        }
      })

      if (existing_content && existing_content.carton.id !== id) {
        return NextResponse.json(
          { error: `Unit is already in carton ${existing_content.carton.carton_no} of order ${existing_content.carton.order.po_number}` },
          { status: 409 }
        )
      }

      // Ashley AI validation for adding unit to carton
      const current_units = carton.carton_contents.reduce((sum, content) => sum + content.qty, 0)
      const ashley_check = await validateAshleyAI({
        context: 'CARTON_ADD_UNIT',
        carton_id: id,
        current_units,
        new_units: qty,
        unit_sku: finished_unit.sku,
        unit_size: finished_unit.size_code
      })

      if (ashley_check.risk === 'RED') {
        return NextResponse.json({
          success: false,
          error: 'Ashley AI blocked adding unit to carton',
          ashley_feedback: ashley_check,
          blocked: true
        }, { status: 422 })
      }

      // Add or update carton content
      if (existing_content && existing_content.carton.id === id) {
        // Update existing content quantity
        const updated_content = await db.cartonContent.update({
          where: { id: existing_content.id },
          data: { qty: existing_content.qty + qty }
        })

        var result = updated_content
        var message = `Added ${qty} units to existing content (total: ${updated_content.qty})`
      } else {
        // Create new carton content
        const new_content = await db.cartonContent.create({
          data: {
            carton_id: id,
            finished_unit_id,
            qty
          }
        })

        var result = new_content
        var message = `Added ${qty} units to carton`
      }

      // Log audit trail
      await db.auditLog.create({
        data: {
          workspace_id,
          entity_type: 'carton_content',
          entity_id: result.id,
          action: 'ADD_TO_CARTON',
          after_data: {
            carton_id: id,
            carton_no: carton.carton_no,
            finished_unit_id,
            unit_sku: finished_unit.sku,
            qty,
            ashley_risk: ashley_check.risk
          }
        }
      })

      return NextResponse.json({
        success: true,
        carton_content: result,
        message,
        ashley_feedback: ashley_check,
        warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
      })

    } else if (action === 'REMOVE') {
      // Find existing content to remove
      const existing_content = await db.cartonContent.findFirst({
        where: {
          carton_id: id,
          finished_unit_id
        }
      })

      if (!existing_content) {
        return NextResponse.json(
          { error: 'Unit not found in this carton' },
          { status: 404 }
        )
      }

      if (existing_content.qty < qty) {
        return NextResponse.json(
          { error: `Cannot remove ${qty} units. Only ${existing_content.qty} units available.` },
          { status: 409 }
        )
      }

      if (existing_content.qty === qty) {
        // Remove entire content record
        await db.cartonContent.delete({
          where: { id: existing_content.id }
        })
        
        var message = `Removed all ${qty} units from carton`
      } else {
        // Update quantity
        const updated_content = await db.cartonContent.update({
          where: { id: existing_content.id },
          data: { qty: existing_content.qty - qty }
        })
        
        var message = `Removed ${qty} units from carton (remaining: ${updated_content.qty})`
      }

      // Log audit trail
      await db.auditLog.create({
        data: {
          workspace_id,
          entity_type: 'carton_content',
          entity_id: existing_content.id,
          action: 'REMOVE_FROM_CARTON',
          after_data: {
            carton_id: id,
            carton_no: carton.carton_no,
            finished_unit_id,
            unit_sku: finished_unit.sku,
            qty_removed: qty
          }
        }
      })

      return NextResponse.json({
        success: true,
        message
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be ADD or REMOVE' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error modifying carton contents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to modify carton contents' },
      { status: 500 }
    )
  }
}