// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
// Portal Orders API
// Based on CLIENT_UPDATED_PLAN.md Stage 12 specifications


// GET /api/portal/orders - Get client's orders with production status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client_id = searchParams.get('client_id')

    if (!client_id) {
      return NextResponse.json(
        { success: false, error: 'client_id is required' },
        { status: 400 }
      )
    }

    // Validate client exists
    const client = await db.client.findUnique({
      where: { id: client_id },
      select: {
        id: true,
        workspace_id: true,
        name: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Fetch client's orders with detailed information
    const orders = await db.order.findMany({
      where: { 
        client_id: client_id,
        workspace_id: client.workspace_id // Ensure workspace isolation
      },
      include: {
        brand: {
          select: {
            name: true,
            code: true
          }
        },
        routing_steps: {
          orderBy: {
            sequence: 'asc'
          }
        },
        design_assets: {
          where: {
            approval_status: { in: ['OPEN', 'REJECTED'] } // Only show assets needing attention
          },
          select: {
            id: true,
            type: true,
            version: true,
            approval_status: true,
            file_name: true
          }
        },
        qc_inspections: {
          select: {
            id: true,
            status: true,
            defects_found: true,
            completed_at: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Calculate production progress for each order
    const ordersWithProgress = orders.map(order => {
      const total_steps = order.routing_steps.length
      const completed_steps = order.routing_steps.filter(step => step.status === 'DONE').length
      const in_progress_steps = order.routing_steps.filter(step => step.status === 'IN_PROGRESS').length
      
      const progress_percentage = total_steps > 0 ? Math.round((completed_steps / total_steps) * 100) : 0
      
      // Determine current phase
      let current_phase = 'Not Started'
      if (in_progress_steps > 0) {
        const currentStep = order.routing_steps.find(step => step.status === 'IN_PROGRESS')
        current_phase = currentStep?.name || 'In Progress'
      } else if (completed_steps === total_steps) {
        current_phase = 'Completed'
      } else if (completed_steps > 0) {
        const nextStep = order.routing_steps.find(step => step.status === 'PLANNED' || step.status === 'READY')
        current_phase = `Next: ${nextStep?.name || 'Unknown'}`
      }

      // Check for pending approvals
      const pending_approvals = order.design_assets.filter(asset => asset.approval_status === 'OPEN')
      const rejected_designs = order.design_assets.filter(asset => asset.approval_status === 'REJECTED')

      return {
        ...order,
        progress: {
          percentage: progress_percentage,
          current_phase,
          completed_steps,
          total_steps
        },
        needs_attention: {
          pending_approvals: pending_approvals.length,
          rejected_designs: rejected_designs.length,
          qc_issues: order.qc_inspections.filter(qc => qc.defects_found > 0).length
        }
      }
    })

    return NextResponse.json({
      success: true,
      orders: ordersWithProgress,
      client_info: {
        name: client.name
      }
    })

  } catch (_error) {
    console.error('Error fetching portal orders:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/portal/orders - Request access to new order (for existing clients)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_id, po_number } = body

    if (!client_id || !po_number) {
      return NextResponse.json(
        { success: false, error: 'client_id and po_number are required' },
        { status: 400 }
      )
    }

    // Validate client exists
    const client = await db.client.findUnique({
      where: { id: client_id },
      select: {
        id: true,
        workspace_id: true,
        name: true,
        emails: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if order exists and belongs to this client
    const order = await db.order.findFirst({
      where: {
        po_number: po_number.trim(),
        client_id,
        workspace_id: client.workspace_id
      },
      select: {
        id: true,
        po_number: true,
        status: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Order found and accessible',
      order: {
        id: order.id,
        po_number: order.po_number,
        status: order.status
      }
    })

  } catch (_error) {
    console.error('Error in portal order access:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}