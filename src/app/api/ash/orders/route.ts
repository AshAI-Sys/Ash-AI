import { NextRequest, NextResponse } from 'next/server'
import { db, createAuditLog } from '@/lib/db'
import { generatePONumber } from '@/lib/po-generator'
import { validateOrderIntake } from '@/lib/ashley-ai'
import { ProductMethod, OrderStatus, WorkcenterType } from '@prisma/client'

// GET /api/ash/orders - Fetch orders based on CLIENT_UPDATED_PLAN.md
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    
    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const orders = await db.order.findMany({
      where: {
        workspace_id
      },
      include: {
        brand: true,
        client: true,
        routing_steps: {
          orderBy: { sequence: 'asc' }
        },
        order_attachments: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      orders
    })

  } catch (_error) {
    console.error('Error fetching orders:', _error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/ash/orders - Create order based on CLIENT_UPDATED_PLAN.md
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      brand_id,
      client_id,
      channel,
      product_type,
      method,
      total_qty,
      size_curve,
      variants,
      addons,
      target_delivery_date,
      commercials,
      created_by
    } = body

    // Validate required fields
    if (!workspace_id || !brand_id || !client_id || !product_type || !method || !total_qty || !size_curve) {
      return NextResponse.json(
        { error: 'Missing required fields: workspace_id, brand_id, client_id, product_type, method, total_qty, size_curve' },
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

    // Validate brand exists in workspace
    const brand = await db.brand.findFirst({
      where: { 
        id: brand_id,
        workspace_id 
      }
    })
    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found in workspace' },
        { status: 404 }
      )
    }

    // Validate client exists in workspace
    const client = await db.client.findFirst({
      where: { 
        id: client_id,
        workspace_id 
      }
    })
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found in workspace' },
        { status: 404 }
      )
    }

    // Generate PO number
    const { po_number } = await generatePONumber(brand_id)

    // Run Ashley AI validation
    const validationData = {
      workspace_id,
      brand_id,
      client_id,
      product_type,
      method,
      total_qty,
      size_curve,
      target_delivery_date: target_delivery_date ? new Date(target_delivery_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      variants,
      commercials
    }

    const ashleyResult = await validateOrderIntake(validationData)

    // Block order if Ashley flags it as RED risk
    if (ashleyResult.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Order blocked by Ashley AI validation',
        ashley_assessment: ashleyResult,
        requires_manager_approval: true
      }, { status: 422 })
    }

    // Create order with routing steps in transaction
    const result = await db.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          workspace_id,
          brand_id,
          client_id,
          po_number,
          channel: channel || 'Direct',
          product_type,
          method,
          total_qty,
          size_curve,
          variants: variants || [],
          addons: addons || [],
          target_delivery_date: target_delivery_date ? new Date(target_delivery_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          commercials: commercials || {},
          status: OrderStatus.INTAKE,
          created_by: created_by || 'system'
        }
      })

      // Create default routing steps based on method
      const defaultSteps = getDefaultRoutingSteps(method)
      const routingSteps = await Promise.all(
        defaultSteps.map((step, index) =>
          tx.routingStep.create({
            data: {
              order_id: order.id,
              name: step.name,
              workcenter: step.workcenter as WorkcenterType,
              sequence: index + 1,
              depends_on: step.depends_on || [],
              standard_spec: step.standard_spec || {},
              expected_inputs: step.expected_inputs || {},
              expected_outputs: step.expected_outputs || {},
              can_run_parallel: step.can_run_parallel || false
            }
          })
        )
      )

      return { order, routingSteps }
    })

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'order',
      entity_id: result.order.id,
      action: 'CREATE',
      after_data: {
        po_number: result.order.po_number,
        method: result.order.method,
        total_qty: result.order.total_qty,
        client_name: client.name,
        brand_name: brand.name
      }
    })

    return NextResponse.json({
      success: true,
      message: `Order ${po_number} created successfully`,
      order: result.order,
      routing_steps: result.routing_steps,
      ashley_assessment: ashleyResult
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating order:', _error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

// Helper function to get default routing steps based on method
function getDefaultRoutingSteps(method: ProductMethod) {
  const baseSteps = [
    {
      name: 'Design',
      workcenter: 'DESIGN',
      depends_on: [],
      standard_spec: {},
      expected_inputs: { mockup: 'required', separations: 'optional' },
      expected_outputs: { print_ready_file: 'required' },
      can_run_parallel: false
    }
  ]

  switch (method) {
    case 'SILKSCREEN':
      return [
        ...baseSteps,
        {
          name: 'Screen Making',
          workcenter: 'PRINTING',
          depends_on: ['Design'],
          standard_spec: { mesh_count: 160, emulsion_type: 'photopolymer' },
          expected_inputs: { separations: 'required', screens: 'required' },
          expected_outputs: { prepared_screens: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Cutting',
          workcenter: 'CUTTING',
          depends_on: [],
          standard_spec: {},
          expected_inputs: { fabric: 'required', lay_plan: 'required' },
          expected_outputs: { cut_bundles: 'required' },
          can_run_parallel: true
        },
        {
          name: 'Printing',
          workcenter: 'PRINTING',
          depends_on: ['Screen Making', 'Cutting'],
          standard_spec: { cure_temp: 160, cure_time: 60 },
          expected_inputs: { cut_bundles: 'required', prepared_screens: 'required', ink: 'required' },
          expected_outputs: { printed_pieces: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Sewing',
          workcenter: 'SEWING',
          depends_on: ['Printing'],
          standard_spec: {},
          expected_inputs: { printed_pieces: 'required' },
          expected_outputs: { sewn_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Quality Control',
          workcenter: 'QC',
          depends_on: ['Sewing'],
          standard_spec: { aql_level: '2.5', sample_size: 'normal' },
          expected_inputs: { sewn_garments: 'required' },
          expected_outputs: { approved_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Packing',
          workcenter: 'PACKING',
          depends_on: ['Quality Control'],
          standard_spec: {},
          expected_inputs: { approved_garments: 'required' },
          expected_outputs: { packed_order: 'required' },
          can_run_parallel: false
        }
      ]

    case 'SUBLIMATION':
      return [
        ...baseSteps,
        {
          name: 'Transfer Printing',
          workcenter: 'PRINTING',
          depends_on: ['Design'],
          standard_spec: { resolution: '300dpi', paper_type: 'sublimation' },
          expected_inputs: { design_file: 'required', transfer_paper: 'required' },
          expected_outputs: { printed_transfers: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Cutting',
          workcenter: 'CUTTING',
          depends_on: [],
          standard_spec: {},
          expected_inputs: { fabric: 'required', lay_plan: 'required' },
          expected_outputs: { cut_bundles: 'required' },
          can_run_parallel: true
        },
        {
          name: 'Heat Press',
          workcenter: 'HEAT_PRESS',
          depends_on: ['Transfer Printing', 'Cutting'],
          standard_spec: { temp: 200, pressure: 'medium', time: 45 },
          expected_inputs: { cut_bundles: 'required', printed_transfers: 'required' },
          expected_outputs: { pressed_pieces: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Sewing',
          workcenter: 'SEWING',
          depends_on: ['Heat Press'],
          standard_spec: {},
          expected_inputs: { pressed_pieces: 'required' },
          expected_outputs: { sewn_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Quality Control',
          workcenter: 'QC',
          depends_on: ['Sewing'],
          standard_spec: { aql_level: '2.5', sample_size: 'normal' },
          expected_inputs: { sewn_garments: 'required' },
          expected_outputs: { approved_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Packing',
          workcenter: 'PACKING',
          depends_on: ['Quality Control'],
          standard_spec: {},
          expected_inputs: { approved_garments: 'required' },
          expected_outputs: { packed_order: 'required' },
          can_run_parallel: false
        }
      ]

    case 'DTF':
      return [
        ...baseSteps,
        {
          name: 'DTF Printing',
          workcenter: 'PRINTING',
          depends_on: ['Design'],
          standard_spec: { resolution: '300dpi', film_type: 'DTF' },
          expected_inputs: { design_file: 'required', dtf_film: 'required', powder: 'required' },
          expected_outputs: { dtf_transfers: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Cutting',
          workcenter: 'CUTTING',
          depends_on: [],
          standard_spec: {},
          expected_inputs: { fabric: 'required', lay_plan: 'required' },
          expected_outputs: { cut_bundles: 'required' },
          can_run_parallel: true
        },
        {
          name: 'Heat Press',
          workcenter: 'HEAT_PRESS',
          depends_on: ['DTF Printing', 'Cutting'],
          standard_spec: { temp: 160, pressure: 'medium', time: 15 },
          expected_inputs: { cut_bundles: 'required', dtf_transfers: 'required' },
          expected_outputs: { pressed_pieces: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Sewing',
          workcenter: 'SEWING',
          depends_on: ['Heat Press'],
          standard_spec: {},
          expected_inputs: { pressed_pieces: 'required' },
          expected_outputs: { sewn_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Quality Control',
          workcenter: 'QC',
          depends_on: ['Sewing'],
          standard_spec: { aql_level: '2.5', sample_size: 'normal' },
          expected_inputs: { sewn_garments: 'required' },
          expected_outputs: { approved_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Packing',
          workcenter: 'PACKING',
          depends_on: ['Quality Control'],
          standard_spec: {},
          expected_inputs: { approved_garments: 'required' },
          expected_outputs: { packed_order: 'required' },
          can_run_parallel: false
        }
      ]

    case 'EMBROIDERY':
      return [
        ...baseSteps,
        {
          name: 'Digitizing',
          workcenter: 'EMB',
          depends_on: ['Design'],
          standard_spec: { stitch_count: 'optimize', underlay: 'required' },
          expected_inputs: { design_file: 'required' },
          expected_outputs: { digitized_file: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Cutting',
          workcenter: 'CUTTING',
          depends_on: [],
          standard_spec: {},
          expected_inputs: { fabric: 'required', lay_plan: 'required' },
          expected_outputs: { cut_bundles: 'required' },
          can_run_parallel: true
        },
        {
          name: 'Embroidery',
          workcenter: 'EMB',
          depends_on: ['Digitizing', 'Cutting'],
          standard_spec: { thread_tension: 'auto', speed: 800 },
          expected_inputs: { cut_bundles: 'required', digitized_file: 'required', thread: 'required' },
          expected_outputs: { embroidered_pieces: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Sewing',
          workcenter: 'SEWING',
          depends_on: ['Embroidery'],
          standard_spec: {},
          expected_inputs: { embroidered_pieces: 'required' },
          expected_outputs: { sewn_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Quality Control',
          workcenter: 'QC',
          depends_on: ['Sewing'],
          standard_spec: { aql_level: '2.5', sample_size: 'normal' },
          expected_inputs: { sewn_garments: 'required' },
          expected_outputs: { approved_garments: 'required' },
          can_run_parallel: false
        },
        {
          name: 'Packing',
          workcenter: 'PACKING',
          depends_on: ['Quality Control'],
          standard_spec: {},
          expected_inputs: { approved_garments: 'required' },
          expected_outputs: { packed_order: 'required' },
          can_run_parallel: false
        }
      ]

    default:
      return baseSteps
  }
}