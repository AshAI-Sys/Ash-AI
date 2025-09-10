import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Maintenance Parts Inventory API for Stage 11 Maintenance System
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/maintenance/parts - Get maintenance parts inventory
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const _category = searchParams.get('category')
    const status = searchParams.get('status')
    const low_stock_only = searchParams.get('low_stock_only')
    const search = searchParams.get('search') // Search in part_name, part_number, description

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (category) where.category = category
    if (status) where.status = status
    if (search) {
      where.OR = [
        { part_name: { contains: search, mode: 'insensitive' } },
        { part_number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const maintenance_parts = await db.maintenancePart.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { part_name: 'asc' }
      ]
    })

    // Filter for low stock if requested
    let filtered_parts = maintenance_parts
    if (low_stock_only === 'true') {
      filtered_parts = maintenance_parts.filter(part => 
        part.current_stock <= part.min_stock_level
      )
    }

    // Add summary data
    const parts_with_summary = filtered_parts.map(part => {
      const is_low_stock = part.current_stock <= part.min_stock_level
      const is_out_of_stock = part.current_stock <= 0
      const stock_level_percentage = part.max_stock_level 
        ? (part.current_stock / part.max_stock_level) * 100
        : null

      // Calculate reorder suggestion
      const months_since_last_use = part.last_used_date
        ? Math.floor((Date.now() - new Date(part.last_used_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : null

      const suggested_reorder_qty = part.avg_monthly_usage > 0
        ? Math.ceil(part.avg_monthly_usage * 3) // 3-month supply
        : part.min_stock_level * 2

      const inventory_value = part.current_stock * (part.unit_cost || 0)

      return {
        ...part,
        summary: {
          is_low_stock,
          is_out_of_stock,
          stock_level_percentage: stock_level_percentage ? Math.round(stock_level_percentage) : null,
          months_since_last_use,
          suggested_reorder_qty,
          inventory_value,
          turnover_rate: part.avg_monthly_usage > 0 && part.current_stock > 0
            ? Math.round((part.avg_monthly_usage / part.current_stock) * 100) / 100
            : 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      maintenance_parts: parts_with_summary
    })

  } catch (_error) {
    console.error('Error fetching maintenance parts:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance parts' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/parts - Add new maintenance part
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      part_number,
      part_name,
      description,
      category, // ELECTRICAL/MECHANICAL/CONSUMABLE/TOOL
      compatible_equipment = [],
      initial_stock = 0,
      min_stock_level = 1,
      max_stock_level,
      unit_cost,
      supplier_info = {}
    } = body

    if (!workspace_id || !part_number || !part_name || !category) {
      return NextResponse.json(
        { error: 'workspace_id, part_number, part_name, and category are required' },
        { status: 400 }
      )
    }

    // Validate workspace exists
    const _workspace = await db.workspace.findUnique({
      where: { id: workspace_id }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Check for duplicate part number
    const existing_part = await db.maintenancePart.findFirst({
      where: {
        workspace_id,
        part_number
      }
    })

    if (existing_part) {
      return NextResponse.json(
        { error: 'Part number already exists in workspace' },
        { status: 409 }
      )
    }

    // Ashley AI validation for part creation
    const ashley_check = await validateAshleyAI({
      context: 'MAINTENANCE_PART_CREATION',
      category,
      unit_cost: unit_cost || 0,
      min_stock_level,
      initial_stock
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked maintenance part creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create maintenance part
    const maintenance_part = await db.maintenancePart.create({
      data: {
        workspace_id,
        part_number,
        part_name,
        description,
        category,
        compatible_equipment,
        current_stock: initial_stock,
        min_stock_level,
        max_stock_level,
        unit_cost,
        supplier_info
      }
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'maintenance_part',
        entity_id: maintenance_part.id,
        action: 'CREATE',
        after_data: {
          part_number,
          part_name,
          category,
          initial_stock,
          unit_cost,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      maintenance_part,
      message: 'Maintenance part created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating maintenance part:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance part' },
      { status: 500 }
    )
  }
}

// PUT /api/maintenance/parts - Update part inventory or details
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      part_id,
      workspace_id,
      action, // ADJUST_STOCK, UPDATE_DETAILS, RECEIVE_STOCK, CONSUME_STOCK
      quantity_change,
      new_stock_level,
      part_name,
      description,
      min_stock_level,
      max_stock_level,
      unit_cost,
      supplier_info,
      status,
      adjustment_reason,
      reference_document // PO number, work order, etc.
    } = body

    if (!part_id || !workspace_id || !action) {
      return NextResponse.json(
        { error: 'part_id, workspace_id, and action are required' },
        { status: 400 }
      )
    }

    // Get existing part
    const existing_part = await db.maintenancePart.findFirst({
      where: {
        id: part_id,
        workspace_id
      }
    })

    if (!existing_part) {
      return NextResponse.json(
        { error: 'Maintenance part not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }

    switch (action) {
      case 'ADJUST_STOCK':
        if (new_stock_level !== undefined) {
          update_data.current_stock = Math.max(0, new_stock_level)
        } else if (quantity_change !== undefined) {
          update_data.current_stock = Math.max(0, existing_part.current_stock + quantity_change)
        } else {
          return NextResponse.json(
            { error: 'Either new_stock_level or quantity_change is required for stock adjustment' },
            { status: 400 }
          )
        }
        break

      case 'RECEIVE_STOCK':
        if (!quantity_change || quantity_change <= 0) {
          return NextResponse.json(
            { error: 'Positive quantity_change is required for receiving stock' },
            { status: 400 }
          )
        }
        update_data.current_stock = existing_part.current_stock + quantity_change
        break

      case 'CONSUME_STOCK':
        if (!quantity_change || quantity_change <= 0) {
          return NextResponse.json(
            { error: 'Positive quantity_change is required for consuming stock' },
            { status: 400 }
          )
        }
        
        if (existing_part.current_stock < quantity_change) {
          return NextResponse.json(
            { error: 'Insufficient stock for consumption' },
            { status: 409 }
          )
        }
        
        update_data.current_stock = existing_part.current_stock - quantity_change
        update_data.last_used_date = new Date()
        update_data.total_used_ytd = existing_part.total_used_ytd + quantity_change
        
        // Update average monthly usage (simplified calculation)
        const months_since_creation = Math.max(1, Math.floor(
          (Date.now() - new Date(existing_part.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ))
        update_data.avg_monthly_usage = update_data.total_used_ytd / months_since_creation
        break

      case 'UPDATE_DETAILS':
        if (part_name !== undefined) update_data.part_name = part_name
        if (description !== undefined) update_data.description = description
        if (min_stock_level !== undefined) update_data.min_stock_level = min_stock_level
        if (max_stock_level !== undefined) update_data.max_stock_level = max_stock_level
        if (unit_cost !== undefined) update_data.unit_cost = unit_cost
        if (supplier_info !== undefined) update_data.supplier_info = supplier_info
        if (status !== undefined) update_data.status = status
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update part
    const updated_part = await db.maintenancePart.update({
      where: { id: part_id },
      data: update_data
    })

    // Log audit trail
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'maintenance_part',
        entity_id: part_id,
        action: `PART_${action}`,
        before_data: existing_part,
        after_data: {
          action,
          quantity_change,
          new_stock_level: update_data.current_stock,
          adjustment_reason,
          reference_document
        }
      }
    })

    // Check for low stock alert
    const is_now_low_stock = updated_part.current_stock <= updated_part.min_stock_level
    const was_low_stock = existing_part.current_stock <= existing_part.min_stock_level

    let alert_message = null
    if (is_now_low_stock && !was_low_stock) {
      alert_message = `Part ${updated_part.part_name} is now below minimum stock level`
    } else if (!is_now_low_stock && was_low_stock) {
      alert_message = `Part ${updated_part.part_name} stock level restored`
    }

    return NextResponse.json({
      success: true,
      maintenance_part: updated_part,
      message: `Maintenance part ${action.toLowerCase().replace('_', ' ')}d successfully`,
      alert: alert_message,
      stock_status: {
        current_stock: updated_part.current_stock,
        is_low_stock: is_now_low_stock,
        is_out_of_stock: updated_part.current_stock <= 0
      }
    })

  } catch (_error) {
    console.error('Error updating maintenance part:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance part' },
      { status: 500 }
    )
  }
}