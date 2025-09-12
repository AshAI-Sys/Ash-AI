// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
// Payment Allocation API
// Based on CLIENT_UPDATED_PLAN.md Stage 9 specifications


interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/finance/payments/[id]/allocate - Allocate payment to invoices
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: payment_id } = await params
    const body = await request.json()
    const { allocations, created_by } = body

    // Validate allocations
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: 'allocations array is required' },
        { status: 400 }
      )
    }

    for (const allocation of allocations) {
      if (!allocation.invoice_id || !allocation.amount || allocation.amount <= 0) {
        return NextResponse.json(
          { error: 'Each allocation must have invoice_id and positive amount' },
          { status: 400 }
        )
      }
    }

    // Get payment details
    const payment = await db.payment.findUnique({
      where: { id: payment_id },
      include: {
        allocations: true,
        client: { select: { name: true } }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Calculate current allocated amount
    const current_allocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
    const new_allocation_total = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
    const total_allocated = current_allocated + new_allocation_total

    if (total_allocated > payment.amount) {
      return NextResponse.json(
        { error: `Total allocation (${total_allocated}) exceeds payment amount (${payment.amount})` },
        { status: 400 }
      )
    }

    // Validate each invoice and check available balance
    const invoiceUpdates: Array<{ invoice_id: string, allocation_amount: number, invoice_balance: number }> = []
    
    for (const allocation of allocations) {
      const invoice = await db.invoice.findUnique({
        where: { id: allocation.invoice_id },
        select: { 
          id: true, 
          balance: true, 
          invoice_no: true,
          workspace_id: true,
          client_id: true
        }
      })

      if (!invoice) {
        return NextResponse.json(
          { error: `Invoice ${allocation.invoice_id} not found` },
          { status: 404 }
        )
      }

      if (invoice.workspace_id !== payment.workspace_id) {
        return NextResponse.json(
          { error: `Invoice ${invoice.invoice_no} not in same workspace as payment` },
          { status: 400 }
        )
      }

      if (payment.client_id && invoice.client_id !== payment.client_id) {
        return NextResponse.json(
          { error: `Invoice ${invoice.invoice_no} not for the same client as payment` },
          { status: 400 }
        )
      }

      if (allocation.amount > invoice.balance) {
        return NextResponse.json(
          { error: `Allocation amount (${allocation.amount}) exceeds invoice ${invoice.invoice_no} balance (${invoice.balance})` },
          { status: 400 }
        )
      }

      invoiceUpdates.push({
        invoice_id: allocation.invoice_id,
        allocation_amount: allocation.amount,
        invoice_balance: invoice.balance - allocation.amount
      })
    }

    // Create allocations and update invoice balances in transaction
    const result = await db.$transaction(async (tx) => {
      // Create payment allocations
      const created_allocations = await Promise.all(
        allocations.map(allocation =>
          tx.paymentAllocation.create({
            data: {
              payment_id,
              invoice_id: allocation.invoice_id,
              amount: allocation.amount
            },
            include: {
              invoice: {
                select: {
                  invoice_no: true,
                  total: true
                }
              }
            }
          })
        )
      )

      // Update invoice balances and statuses
      const updated_invoices = await Promise.all(
        invoiceUpdates.map(async (update) => {
          const new_balance = update.invoice_balance
          let new_status = 'OPEN'
          
          if (new_balance === 0) {
            new_status = 'PAID'
          } else {
            // Check if there are any allocations (partial payment)
            const existing_allocations = await tx.paymentAllocation.findMany({
              where: { invoice_id: update.invoice_id }
            })
            if (existing_allocations.length > 0) {
              new_status = 'PARTIAL'
            }
          }

          return await tx.invoice.update({
            where: { id: update.invoice_id },
            data: {
              balance: new_balance,
              status: new_status
            },
            select: {
              id: true,
              invoice_no: true,
              balance: true,
              status: true
            }
          })
        })
      )

      return { created_allocations, updated_invoices }
    })

    // Create audit log
    await createAuditLog({
      workspace_id: payment.workspace_id,
      entity_type: 'payment_allocation',
      entity_id: payment_id,
      action: 'CREATE',
      after_data: {
        payment_amount: payment.amount,
        client_name: payment.client?.name || 'Platform',
        allocations: allocations.map((alloc, index) => ({
          invoice_no: result.created_allocations[index].invoice.invoice_no,
          amount: alloc.amount
        })),
        total_allocated: new_allocation_total,
        created_by: created_by || 'system'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment allocated successfully',
      allocations: result.created_allocations,
      updated_invoices: result.updated_invoices,
      remaining_unallocated: payment.amount - total_allocated
    })

  } catch (_error) {
    console.error('Error allocating payment:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to allocate payment' },
      { status: 500 }
    )
  }
}

// GET /api/finance/payments/[id]/allocate - Get payment allocation details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: payment_id } = await params

    const payment = await db.payment.findUnique({
      where: { id: payment_id },
      include: {
        client: { select: { name: true, company: true } },
        allocations: {
          include: {
            invoice: {
              select: {
                invoice_no: true,
                date_issued: true,
                due_date: true,
                total: true,
                balance: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const total_allocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
    const unallocated_amount = payment.amount - total_allocated

    // Get available invoices for allocation (if client payment)
    let available_invoices = []
    if (payment.client_id) {
      available_invoices = await db.invoice.findMany({
        where: {
          workspace_id: payment.workspace_id,
          client_id: payment.client_id,
          balance: { gt: 0 },
          status: { in: ['OPEN', 'PARTIAL'] }
        },
        select: {
          id: true,
          invoice_no: true,
          date_issued: true,
          due_date: true,
          total: true,
          balance: true,
          status: true
        },
        orderBy: { date_issued: 'asc' }
      })
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...payment,
        total_allocated,
        unallocated_amount
      },
      available_invoices
    })

  } catch (_error) {
    console.error('Error fetching payment allocation details:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment details' },
      { status: 500 }
    )
  }
}