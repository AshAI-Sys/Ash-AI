import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { validateAshleyAI } from '@/lib/ashley-ai'
// Client Portal Payments API for Stage 12 Client Portal
// Based on CLIENT_UPDATED_PLAN.md specifications


// GET /api/portal/payments - Get client payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const client_id = searchParams.get('client_id')
    const workspace_id = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const payment_method = searchParams.get('payment_method')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    if (!client_id || !workspace_id) {
      return NextResponse.json(
        { error: 'client_id and workspace_id are required' },
        { status: 400 }
      )
    }

    const where: any = {
      client_id,
      workspace_id
    }
    if (status) where.status = status
    if (payment_method) where.payment_method = payment_method
    if (date_from && date_to) {
      where.created_at = {
        gte: new Date(date_from),
        lte: new Date(date_to)
      }
    }

    const payments = await db.clientPayment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoice_no: true,
            total: true,
            due_date: true
          }
        },
        order: {
          select: {
            id: true,
            po_number: true,
            product_type: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Add summary data
    const payments_with_summary = payments.map(payment => {
      const days_since_payment = payment.paid_at 
        ? Math.floor((Date.now() - new Date(payment.paid_at).getTime()) / (1000 * 60 * 60 * 24))
        : null

      const processing_time = payment.paid_at && payment.created_at
        ? Math.floor((new Date(payment.paid_at).getTime() - new Date(payment.created_at).getTime()) / (1000 * 60))
        : null

      return {
        ...payment,
        summary: {
          days_since_payment,
          processing_time_minutes: processing_time,
          is_reconciled: !!payment.reconciled_at,
          has_refund: payment.refund_amount > 0,
          net_received: payment.amount - (payment.gateway_fees || 0),
          is_overdue: payment.status === 'OPEN' && 
                     payment.created_at < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    return NextResponse.json({
      success: true,
      payments: payments_with_summary
    })

  } catch (_error) {
    console.error('Error fetching payments:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST /api/portal/payments - Create payment transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      client_id,
      workspace_id,
      invoice_id,
      order_id,
      amount,
      currency = 'PHP',
      payment_method, // GCASH/PAYMAYA/BANK_TRANSFER/CREDIT_CARD
      payment_gateway, // STRIPE/PAYMONGO/GCASH_API/etc
      return_url, // URL to redirect after payment
      cancel_url // URL to redirect if cancelled
    } = body

    if (!client_id || !workspace_id || !amount || !payment_method) {
      return NextResponse.json(
        { error: 'client_id, workspace_id, amount, and payment_method are required' },
        { status: 400 }
      )
    }

    // Validate client exists
    const client = await db.client.findFirst({
      where: {
        id: client_id,
        workspace_id
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or does not belong to workspace' },
        { status: 404 }
      )
    }

    // Validate invoice or order if provided
    if (invoice_id) {
      const invoice = await db.invoice.findFirst({
        where: {
          id: invoice_id,
          client_id,
          workspace_id
        }
      })

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found or does not belong to client' },
          { status: 404 }
        )
      }

      // Check if invoice is already fully paid
      if (invoice.status === 'PAID') {
        return NextResponse.json(
          { error: 'Invoice is already fully paid' },
          { status: 409 }
        )
      }

      // Validate payment amount doesn't exceed invoice balance
      if (amount > invoice.balance) {
        return NextResponse.json(
          { error: `Payment amount exceeds invoice balance of ${invoice.balance}` },
          { status: 400 }
        )
      }
    }

    if (order_id) {
      const order = await db.order.findFirst({
        where: {
          id: order_id,
          client_id,
          workspace_id
        }
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found or does not belong to client' },
          { status: 404 }
        )
      }
    }

    // Generate payment reference number
    const payment_count = await db.clientPayment.count({
      where: { workspace_id }
    })
    const payment_no = `PAY${String(payment_count + 1).padStart(8, '0')}`

    // Ashley AI validation for payment
    const ashley_check = await validateAshleyAI({
      context: 'CLIENT_PAYMENT',
      client_id,
      amount,
      payment_method,
      payment_gateway: payment_gateway || 'MANUAL',
      invoice_id: invoice_id || null,
      order_id: order_id || null
    })

    if (ashley_check.risk === 'RED') {
      return NextResponse.json({
        success: false,
        error: 'Payment blocked for security reasons',
        ashley_feedback: ashley_check,
        blocked: true
      }, { status: 422 })
    }

    // Create payment record
    const payment = await db.clientPayment.create({
      data: {
        workspace_id,
        client_id,
        invoice_id,
        order_id,
        payment_no,
        amount,
        currency,
        payment_method,
        payment_gateway,
        status: 'OPEN'
      }
    })

    // Simulate payment gateway integration
    let gateway_response = {}
    let payment_url = null

    switch (payment_gateway) {
      case 'PAYMONGO':
        gateway_response = {
          checkout_url: `https://paymongo.com/checkout/${payment.id}`,
          reference: `pm_${payment.id}`,
          status: 'pending'
        }
        payment_url = gateway_response.checkout_url as string
        break
      
      case 'GCASH_API':
        gateway_response = {
          payment_url: `https://gcash.com/pay/${payment.id}`,
          reference: `gcash_${payment.id}`,
          status: 'pending'
        }
        payment_url = gateway_response.payment_url as string
        break
      
      case 'STRIPE':
        gateway_response = {
          payment_intent: `pi_${payment.id}`,
          client_secret: `pi_${payment.id}_secret`,
          status: 'requires_payment_method'
        }
        break
      
      default:
        // Manual/Direct payment - no gateway integration needed
        break
    }

    // Update payment with gateway response
    if (Object.keys(gateway_response).length > 0) {
      await db.clientPayment.update({
        where: { id: payment.id },
        data: {
          gateway_response,
          gateway_reference: gateway_response.reference || gateway_response.payment_intent
        }
      })
    }

    // Log activity
    await db.clientPortalActivity.create({
      data: {
        workspace_id,
        client_user_id: null, // Would need to extract from JWT token
        activity_type: 'PAYMENT_INITIATED',
        description: `Payment initiated for ${amount} ${currency}`,
        related_entity_type: 'client_payment',
        related_entity_id: payment.id,
        metadata: {
          payment_method,
          payment_gateway,
          ashley_risk: ashley_check.risk
        }
      }
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        payment_no: payment.payment_no,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.payment_method,
        payment_url, // For redirect-based gateways
        gateway_response
      },
      message: 'Payment initiated successfully',
      ashley_feedback: ashley_check,
      warnings: ashley_check.risk === 'AMBER' ? ashley_check.issues : []
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating payment:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// PUT /api/portal/payments - Update payment status (webhooks/confirmation)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      payment_id,
      workspace_id,
      action, // CONFIRM, FAIL, REFUND, RECONCILE
      gateway_reference,
      gateway_fees,
      bank_reference,
      refund_amount,
      refund_reason,
      reconciled_by,
      gateway_webhook_data // Full webhook payload
    } = body

    if (!payment_id || !workspace_id || !action) {
      return NextResponse.json(
        { error: 'payment_id, workspace_id, and action are required' },
        { status: 400 }
      )
    }

    // Get existing payment
    const existing_payment = await db.clientPayment.findFirst({
      where: {
        id: payment_id,
        workspace_id
      },
      include: {
        invoice: true
      }
    })

    if (!existing_payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const update_data: any = { updated_at: new Date() }
    let activity_description = ''

    switch (action) {
      case 'CONFIRM':
        if (existing_payment.status === 'COMPLETED') {
          return NextResponse.json(
            { error: 'Payment is already completed' },
            { status: 409 }
          )
        }
        
        update_data.status = 'COMPLETED'
        update_data.paid_at = new Date()
        update_data.confirmed_at = new Date()
        
        if (gateway_reference) update_data.gateway_reference = gateway_reference
        if (gateway_fees !== undefined) update_data.gateway_fees = gateway_fees
        if (gateway_fees !== undefined) {
          update_data.net_amount = existing_payment.amount - gateway_fees
        }
        
        activity_description = `Payment confirmed for ${existing_payment.amount} ${existing_payment.currency}`
        
        // Update invoice status if applicable
        if (existing_payment.invoice_id && existing_payment.invoice) {
          const new_balance = existing_payment.invoice.balance - existing_payment.amount
          const invoice_status = new_balance <= 0 ? 'PAID' : 'PARTIAL'
          
          await db.invoice.update({
            where: { id: existing_payment.invoice_id },
            data: {
              balance: Math.max(0, new_balance),
              status: invoice_status
            }
          })
        }
        break

      case 'FAIL':
        update_data.status = 'FAILED'
        activity_description = `Payment failed for ${existing_payment.amount} ${existing_payment.currency}`
        break

      case 'REFUND':
        if (!refund_amount || !refund_reason) {
          return NextResponse.json(
            { error: 'refund_amount and refund_reason are required for refund action' },
            { status: 400 }
          )
        }
        
        if (existing_payment.status !== 'COMPLETED') {
          return NextResponse.json(
            { error: 'Can only refund completed payments' },
            { status: 409 }
          )
        }
        
        update_data.status = 'REFUNDED'
        update_data.refund_amount = refund_amount
        update_data.refund_reason = refund_reason
        update_data.refunded_at = new Date()
        
        activity_description = `Payment refunded: ${refund_amount} ${existing_payment.currency} - ${refund_reason}`
        break

      case 'RECONCILE':
        if (!bank_reference || !reconciled_by) {
          return NextResponse.json(
            { error: 'bank_reference and reconciled_by are required for reconciliation' },
            { status: 400 }
          )
        }
        
        update_data.bank_reference = bank_reference
        update_data.reconciled_at = new Date()
        update_data.reconciled_by = reconciled_by
        
        activity_description = `Payment reconciled with bank reference: ${bank_reference}`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Store webhook data if provided
    if (gateway_webhook_data) {
      update_data.gateway_response = {
        ...existing_payment.gateway_response,
        webhook: gateway_webhook_data,
        webhook_received_at: new Date().toISOString()
      }
    }

    // Update payment
    const updated_payment = await db.clientPayment.update({
      where: { id: payment_id },
      data: update_data
    })

    // Log activity
    await db.clientPortalActivity.create({
      data: {
        workspace_id,
        activity_type: `PAYMENT_${action}`,
        description: activity_description,
        related_entity_type: 'client_payment',
        related_entity_id: payment_id,
        metadata: {
          previous_status: existing_payment.status,
          new_status: update_data.status,
          gateway_reference,
          bank_reference
        }
      }
    })

    return NextResponse.json({
      success: true,
      payment: updated_payment,
      message: `Payment ${action.toLowerCase()}ed successfully`
    })

  } catch (_error) {
    console.error('Error updating payment:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}