// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'

// Asset Management API for Stage 11 Maintenance System
// Based on CLIENT_UPDATED_PLAN.md specifications

// Helper function to generate asset number
async function generateAssetNumber(workspace_id: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `AST-${year}-`

  // Find the latest asset number for this year
  const lastAsset = await db.asset.findFirst({
    where: {
      workspace_id,
      asset_no: { startsWith: prefix }
    },
    orderBy: { asset_no: 'desc' }
  })

  let nextNumber = 1
  if (lastAsset) {
    const lastNumber = parseInt(lastAsset.asset_no.split('-').pop() || '0')
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`
}

// GET /api/maintenance/assets - Get assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const location = searchParams.get('location')
    const department = searchParams.get('department')
    const assigned_to = searchParams.get('assigned_to')
    const search = searchParams.get('search')
    const include_maintenance = searchParams.get('include_maintenance') === 'true'

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (category) where.category = category
    if (type) where.type = type
    if (status) where.status = status
    if (location) where.location = location
    if (department) where.department = department
    if (assigned_to) where.assigned_to = assigned_to

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { asset_no: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serial_number: { contains: search, mode: 'insensitive' } }
      ]
    }

    const include_options: any = {
      assigned_employee: {
        select: {
          id: true,
          name: true,
          department: true
        }
      },
      _count: {
        select: {
          work_orders: true,
          maintenance_schedules: true,
          asset_meters: true
        }
      }
    }

    if (include_maintenance) {
      include_options.maintenance_schedules = {
        where: { is_active: true },
        select: {
          id: true,
          schedule_name: true,
          next_due_date: true,
          priority: true,
          frequency_type: true
        },
        orderBy: { next_due_date: 'asc' }
      }
      include_options.work_orders = {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: {
          id: true,
          wo_number: true,
          title: true,
          status: true,
          priority: true,
          scheduled_date: true
        },
        orderBy: { scheduled_date: 'asc' },
        take: 5
      }
    }

    const assets = await db.asset.findMany({
      where,
      include: include_options,
      orderBy: [
        { status: 'asc' }, // ACTIVE first
        { asset_no: 'asc' }
      ]
    })

    // Calculate summary data for each asset
    const assets_with_summary = assets.map(asset => {
      const overdue_schedules = include_maintenance
        ? asset.maintenance_schedules?.filter(s => new Date(s.next_due_date) < new Date()).length || 0
        : 0

      const critical_work_orders = include_maintenance
        ? asset.work_orders?.filter(wo => wo.priority === 'EMERGENCY' || wo.priority === 'HIGH').length || 0
        : 0

      const age_days = asset.purchase_date
        ? Math.floor((Date.now() - asset.purchase_date.getTime()) / (1000 * 60 * 60 * 24))
        : null

      const warranty_status = asset.warranty_expires
        ? asset.warranty_expires > new Date() ? 'ACTIVE' : 'EXPIRED'
        : 'UNKNOWN'

      return {
        ...asset,
        summary: {
          total_work_orders: asset._count.work_orders,
          total_schedules: asset._count.maintenance_schedules,
          total_meter_readings: asset._count.asset_meters,
          overdue_schedules,
          critical_work_orders,
          age_days,
          warranty_status,
          maintenance_status: overdue_schedules > 0 ? 'OVERDUE' :
                            critical_work_orders > 0 ? 'URGENT' : 'OK'
        }
      }
    })

    return NextResponse.json({
      success: true,
      assets: assets_with_summary,
      summary: {
        total_assets: assets.length,
        by_category: assets.reduce((acc, asset) => {
          acc[asset.category] = (acc[asset.category] || 0) + 1
          return acc
        }, {} as any),
        by_status: assets.reduce((acc, asset) => {
          acc[asset.status] = (acc[asset.status] || 0) + 1
          return acc
        }, {} as any),
        total_overdue: assets_with_summary.filter(a => a.summary.overdue_schedules > 0).length,
        total_critical: assets_with_summary.filter(a => a.summary.critical_work_orders > 0).length
      }
    })

  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/assets - Create asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      name,
      category,
      type,
      manufacturer,
      model,
      serial_number,
      purchase_date,
      purchase_cost,
      location,
      department,
      assigned_to,
      warranty_expires,
      specifications,
      maintenance_notes
    } = body

    if (!workspace_id || !name || !category || !type) {
      return NextResponse.json(
        { error: 'workspace_id, name, category, and type are required' },
        { status: 400 }
      )
    }

    // Validate workspace exists
    const workspace = await db.workspace.findUnique({
      where: { id: workspace_id }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Validate assigned employee if provided
    if (assigned_to) {
      const employee = await db.employee.findFirst({
        where: {
          id: assigned_to,
          workspace_id,
          status: 'ACTIVE'
        }
      })

      if (!employee) {
        return NextResponse.json(
          { error: 'Assigned employee not found or not active' },
          { status: 404 }
        )
      }
    }

    // Generate asset number
    const asset_no = await generateAssetNumber(workspace_id)

    // Ashley AI validation for asset creation
    const ashley_check = await validateAshleyAI({
      context: 'ASSET_CREATION',
      category,
      type,
      purchase_cost,
      warranty_expires,
      specifications
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Ashley AI blocked asset creation',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create asset
    const asset = await db.asset.create({
      data: {
        workspace_id,
        asset_no,
        name,
        category,
        type,
        manufacturer,
        model,
        serial_number,
        purchase_date: purchase_date ? new Date(purchase_date) : null,
        purchase_cost,
        location,
        department,
        assigned_to,
        warranty_expires: warranty_expires ? new Date(warranty_expires) : null,
        specifications,
        maintenance_notes
      },
      include: {
        assigned_employee: {
          select: {
            name: true,
            department: true
          }
        }
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'asset',
      entity_id: asset.id,
      action: 'CREATE',
      after_data: {
        asset_no,
        name,
        category,
        type,
        manufacturer,
        model,
        serial_number,
        purchase_cost,
        assigned_to,
        ashley_risk: ashley_check.risk
      }
    })

    return NextResponse.json({
      success: true,
      asset,
      message: 'Asset created successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating asset:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create asset' },
      { status: 500 }
    )
  }
}

// PUT /api/maintenance/assets - Update asset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      asset_id,
      workspace_id,
      name,
      category,
      type,
      manufacturer,
      model,
      serial_number,
      purchase_date,
      purchase_cost,
      location,
      department,
      assigned_to,
      status,
      warranty_expires,
      specifications,
      maintenance_notes
    } = body

    if (!asset_id || !workspace_id) {
      return NextResponse.json(
        { error: 'asset_id and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get existing asset
    const existing_asset = await db.asset.findFirst({
      where: {
        id: asset_id,
        workspace_id
      }
    })

    if (!existing_asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Validate assigned employee if provided
    if (assigned_to && assigned_to !== existing_asset.assigned_to) {
      const employee = await db.employee.findFirst({
        where: {
          id: assigned_to,
          workspace_id,
          status: 'ACTIVE'
        }
      })

      if (!employee) {
        return NextResponse.json(
          { error: 'Assigned employee not found or not active' },
          { status: 404 }
        )
      }
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }

    if (name !== undefined) update_data.name = name
    if (category !== undefined) update_data.category = category
    if (type !== undefined) update_data.type = type
    if (manufacturer !== undefined) update_data.manufacturer = manufacturer
    if (model !== undefined) update_data.model = model
    if (serial_number !== undefined) update_data.serial_number = serial_number
    if (purchase_date !== undefined) update_data.purchase_date = purchase_date ? new Date(purchase_date) : null
    if (purchase_cost !== undefined) update_data.purchase_cost = purchase_cost
    if (location !== undefined) update_data.location = location
    if (department !== undefined) update_data.department = department
    if (assigned_to !== undefined) update_data.assigned_to = assigned_to
    if (status !== undefined) update_data.status = status
    if (warranty_expires !== undefined) update_data.warranty_expires = warranty_expires ? new Date(warranty_expires) : null
    if (specifications !== undefined) update_data.specifications = specifications
    if (maintenance_notes !== undefined) update_data.maintenance_notes = maintenance_notes

    // Update asset
    const updated_asset = await db.asset.update({
      where: { id: asset_id },
      data: update_data,
      include: {
        assigned_employee: {
          select: {
            name: true,
            department: true
          }
        }
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'asset',
      entity_id: asset_id,
      action: 'UPDATE',
      before_data: existing_asset,
      after_data: update_data
    })

    return NextResponse.json({
      success: true,
      asset: updated_asset,
      message: 'Asset updated successfully'
    })

  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update asset' },
      { status: 500 }
    )
  }
}