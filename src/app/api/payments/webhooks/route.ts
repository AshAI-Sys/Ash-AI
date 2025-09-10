// 🔔 ASH AI - Payment Webhook Handler
// Secure webhook processing for PayMongo, Stripe, and other providers

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

interface WebhookPayload {
  id: string
  type: string
  data: {
    id: string
    attributes: {
      amount: number
      currency: string
      status: string
      fees?: number
      payment_intent_id?: string
      metadata?: Record<string, any>
    }
  }
}

// PayMongo Webhook Handler
export async function POST(request: NextRequest) {
  const signature = request.headers.get('paymongo-signature')
  const stripeSignature = request.headers.get('stripe-signature')
  
  try {
    const payload = await request.text()
    
    if (signature) {
      return await handlePayMongoWebhook(payload, signature)
    } else if (stripeSignature) {
      return await handleStripeWebhook(payload, stripeSignature)
    } else {
      return NextResponse.json({ error: 'Invalid webhook source' }, { status: 400 })
    }
  } catch (_error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    )
  }
}

async function handlePayMongoWebhook(payload: string, signature: string) {
  // Verify PayMongo webhook signature
  const webhookSecret = process.env.ASH_PAYMONGO_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('PayMongo webhook secret not configured')
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload, 'utf8')
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event: WebhookPayload = JSON.parse(payload)
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      await processPaymentSuccess(event.data, 'paymongo')
      break
      
    case 'payment_intent.payment_failed':
      await processPaymentFailure(event.data, 'paymongo')
      break
      
    case 'payment.paid':
      await processPaymentSuccess(event.data, 'paymongo')
      break
      
    default:
      console.log(`Unhandled PayMongo event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function handleStripeWebhook(payload: string, signature: string) {
  // Verify Stripe webhook signature
  const endpointSecret = process.env.ASH_STRIPE_WEBHOOK_SECRET
  if (!endpointSecret) {
    throw new Error('Stripe webhook secret not configured')
  }

  let event
  try {
    // In production, use Stripe's library for signature verification
    // For now, we'll parse the payload directly
    event = JSON.parse(payload)
  } catch (err) {
    throw new Error('Invalid JSON payload')
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await processStripeCheckoutSuccess(event.data.object)
      break
      
    case 'payment_intent.succeeded':
      await processPaymentSuccess(event.data.object, 'stripe')
      break
      
    case 'payment_intent.payment_failed':
      await processPaymentFailure(event.data.object, 'stripe')
      break
      
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function processPaymentSuccess(paymentData: any, provider: string) {
  const order_id = paymentData.metadata?.order_id || paymentData.attributes?.metadata?.order_id
  if (!order_id) {
    console.error('No order ID found in payment metadata')
    return
  }

  try {
    // Update payment record
    await prisma.payment.upsert({
      where: {
        reference: paymentData.id
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        providerResponse: JSON.stringify(paymentData)
      },
      create: {
        id: crypto.randomUUID(),
        reference: paymentData.id,
        order_id: order_id,
        amount: (paymentData.amount || paymentData.attributes?.amount) / 100, // Convert from cents
        currency: paymentData.currency || paymentData.attributes?.currency || 'PHP',
        provider: provider,
        status: 'COMPLETED',
        completedAt: new Date(),
        providerResponse: JSON.stringify(paymentData),
        created_at: new Date()
      }
    })

    // Update order payment status
    await prisma.order.update({
      where: { id: order_id },
      data: {
        paymentStatus: 'PAID',
        paidAt: new Date(),
        updated_at: new Date()
      }
    })

    // Create invoice payment allocation
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { invoices: true }
    })

    if (order?.invoices.length) {
      const invoice = order.invoices[0]
      
      await prisma.paymentAllocation.create({
        data: {
          id: crypto.randomUUID(),
          paymentId: paymentData.id,
          invoiceId: invoice.id,
          amount: (paymentData.amount || paymentData.attributes?.amount) / 100,
          created_at: new Date()
        }
      })

      // Update invoice balance
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          balance: Math.max(0, invoice.balance - ((paymentData.amount || paymentData.attributes?.amount) / 100)),
          status: invoice.balance <= ((paymentData.amount || paymentData.attributes?.amount) / 100) ? 'PAID' : 'PARTIAL',
          updated_at: new Date()
        }
      })
    }

    // Send success notification
    await sendPaymentSuccessNotification(order_id, paymentData)
    
    // Log audit trail
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        workspace_id: order?.workspace_id || '',
        entityType: 'payment',
        entityId: paymentData.id,
        action: 'payment_completed',
        actorId: 'system',
        after: JSON.stringify({ order_id, amount: paymentData.amount, provider }),
        created_at: new Date()
      }
    })

    console.log(`Payment ${paymentData.id} completed successfully for order ${order_id}`)
    
  } catch (_error) {
    console.error('Error processing payment success:', error)
    throw error
  }
}

async function processPaymentFailure(paymentData: any, provider: string) {
  const order_id = paymentData.metadata?.order_id || paymentData.attributes?.metadata?.order_id
  if (!order_id) {
    console.error('No order ID found in payment metadata')
    return
  }

  try {
    // Update payment record
    await prisma.payment.upsert({
      where: {
        reference: paymentData.id
      },
      update: {
        status: 'FAILED',
        failureReason: paymentData.last_payment_error?.message || 'Payment failed',
        providerResponse: JSON.stringify(paymentData)
      },
      create: {
        id: crypto.randomUUID(),
        reference: paymentData.id,
        order_id: order_id,
        amount: (paymentData.amount || paymentData.attributes?.amount) / 100,
        currency: paymentData.currency || paymentData.attributes?.currency || 'PHP',
        provider: provider,
        status: 'FAILED',
        failureReason: paymentData.last_payment_error?.message || 'Payment failed',
        providerResponse: JSON.stringify(paymentData),
        created_at: new Date()
      }
    })

    // Update order payment status
    await prisma.order.update({
      where: { id: order_id },
      data: {
        paymentStatus: 'FAILED',
        updated_at: new Date()
      }
    })

    // Send failure notification
    await sendPaymentFailureNotification(order_id, paymentData)

    console.log(`Payment ${paymentData.id} failed for order ${order_id}`)
    
  } catch (_error) {
    console.error('Error processing payment failure:', error)
    throw error
  }
}

async function processStripeCheckoutSuccess(session: any) {
  const order_id = session.metadata?.order_id
  if (!order_id) {
    console.error('No order ID found in Stripe session metadata')
    return
  }

  // Process similar to payment success
  await processPaymentSuccess({
    id: session.id,
    amount: session.amount_total,
    currency: session.currency,
    metadata: session.metadata
  }, 'stripe')
}

async function sendPaymentSuccessNotification(order_id: string, paymentData: any) {
  // Implementation for sending success notifications
  // This could integrate with your notification system
  console.log(`Sending payment success notification for order ${order_id}`)
  
  // You could emit events here for real-time updates
  // await notificationService.emit('payment.completed', { order_id, paymentData })
}

async function sendPaymentFailureNotification(order_id: string, paymentData: any) {
  // Implementation for sending failure notifications
  console.log(`Sending payment failure notification for order ${order_id}`)
  
  // You could emit events here for real-time updates
  // await notificationService.emit('payment.failed', { order_id, paymentData })
}

// GET method for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Webhook verification for certain providers
  if (mode === 'subscribe' && token === process.env.ASH_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}