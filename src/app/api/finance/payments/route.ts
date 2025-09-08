// Finance Payments API
// Based on CLIENT_UPDATED_PLAN.md Stage 9 specifications

import { NextRequest, NextResponse } from 'next/server'
import { db, createAuditLog } from '@/lib/db'

// GET /api/finance/payments - Get payments with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const client_id = searchParams.get('client_id')
    const source = searchParams.get('source')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (client_id) where.client_id = client_id
    if (source) where.source = source
    
    if (from_date || to_date) {
      where.received_at = {}
      if (from_date) where.received_at.gte = new Date(from_date)
      if (to_date) where.received_at.lte = new Date(to_date)
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        client: {
          select: { name: true, company: true }
        },
        allocations: {
          include: {
            invoice: {
              select: {
                invoice_no: true,
                date_issued: true,
                total: true
              }
            }
          }
        }
      },
      orderBy: { received_at: 'desc' }
    })

    // Calculate summary
    const summary = payments.reduce((acc, payment) => {
      acc.total_payments++
      acc.total_amount += payment.amount
      
      const allocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
      acc.allocated_amount += allocated
      acc.unallocated_amount += payment.amount - allocated
      
      return acc
    }, {
      total_payments: 0,
      total_amount: 0,
      allocated_amount: 0,
      unallocated_amount: 0
    })

    return NextResponse.json({
      success: true,
      payments,
      summary
    })

  } catch (_error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST /api/finance/payments - Record new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      payer_type,
      client_id,
      source,
      ref_no,
      amount,
      received_at,
      created_by
    } = body

    // Validate required fields
    if (!workspace_id || !payer_type || !source || !amount || !received_at) {
      return NextResponse.json(
        { error: 'workspace_id, payer_type, source, amount, and received_at are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate client if specified
    let client = null
    if (client_id) {
      client = await db.client.findUnique({
        where: { id: client_id },
        select: { name: true, workspace_id: true }
      })

      if (!client || client.workspace_id !== workspace_id) {
        return NextResponse.json(
          { error: 'Client not found in workspace' },
          { status: 404 }
        )
      }
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        workspace_id,
        payer_type,
        client_id,
        source,
        ref_no,
        amount,
        received_at: new Date(received_at)
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'payment',
      entity_id: payment.id,
      action: 'CREATE',
      after_data: {
        payer_type,
        client_name: client?.name || 'Platform',
        source,
        amount,
        ref_no,
        created_by: created_by || 'system'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment
    }, { status: 201 })

  } catch (_error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}