import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// AR/AP Management API for comprehensive accounts receivable and payable tracking
// Philippine business compliance focused

// GET /api/finance/ar-ap - Get AR/AP summary and aging reports
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'ar' | 'ap' | 'both'
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString()
    const clientId = searchParams.get('clientId')
    const supplierId = searchParams.get('supplierId')

    const cutoffDate = new Date(asOfDate)

    // Build accounts receivable data
    let arData = null
    if (type === 'ar' || type === 'both' || !type) {
      const arWhere: any = {
        workspace_id: session.user.workspace_id,
        date_issued: { lte: cutoffDate },
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] }
      }
      
      if (clientId) arWhere.client_id = clientId

      const receivables = await prisma.invoice.findMany({
        where: arWhere,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
              emails: true
            }
          },
          allocations: {
            include: {
              payment: true
            }
          },
          order: {
            select: {
              po_number: true,
              product_type: true
            }
          }
        },
        orderBy: { date_issued: 'asc' }
      })

      // Calculate aging for each invoice
      const arAging = receivables.map(invoice => {
        const totalAllocated = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
        const balanceDue = invoice.total - totalAllocated
        const daysPastDue = Math.max(0, Math.floor((cutoffDate.getTime() - new Date(invoice.due_date || invoice.date_issued).getTime()) / (1000 * 60 * 60 * 24)))
        
        let agingBucket = 'current'
        if (daysPastDue > 90) agingBucket = 'over_90'
        else if (daysPastDue > 60) agingBucket = 'over_60'
        else if (daysPastDue > 30) agingBucket = 'over_30'
        else if (daysPastDue > 0) agingBucket = 'over_due'

        return {
          ...invoice,
          balance_due: balanceDue,
          days_past_due: daysPastDue,
          aging_bucket: agingBucket,
          total_allocated: totalAllocated
        }
      }).filter(inv => inv.balance_due > 0.01) // Only show invoices with balance

      // Calculate AR aging summary
      const arSummary = {
        current: 0,
        over_due: 0,
        over_30: 0,
        over_60: 0,
        over_90: 0,
        total: 0
      }

      arAging.forEach(inv => {
        arSummary[inv.aging_bucket as keyof typeof arSummary] += inv.balance_due
        arSummary.total += inv.balance_due
      })

      arData = {
        invoices: arAging,
        summary: arSummary,
        count: arAging.length
      }
    }

    // Build accounts payable data
    let apData = null
    if (type === 'ap' || type === 'both' || !type) {
      const apWhere: any = {
        workspace_id: session.user.workspace_id,
        date_received: { lte: cutoffDate },
        payment_status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
      }

      if (supplierId) apWhere.supplier_id = supplierId

      const payables = await prisma.bill.findMany({
        where: apWhere,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              emails: true,
              phones: true
            }
          },
          payments: true
        },
        orderBy: { date_received: 'asc' }
      })

      // Calculate aging for each bill
      const apAging = payables.map(bill => {
        const totalPaid = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
        const balanceDue = bill.total - totalPaid
        const daysPastDue = Math.max(0, Math.floor((cutoffDate.getTime() - new Date(bill.due_date || bill.date_received).getTime()) / (1000 * 60 * 60 * 24)))
        
        let agingBucket = 'current'
        if (daysPastDue > 90) agingBucket = 'over_90'
        else if (daysPastDue > 60) agingBucket = 'over_60'
        else if (daysPastDue > 30) agingBucket = 'over_30'
        else if (daysPastDue > 0) agingBucket = 'over_due'

        return {
          ...bill,
          balance_due: balanceDue,
          days_past_due: daysPastDue,
          aging_bucket: agingBucket,
          total_paid: totalPaid
        }
      }).filter(bill => bill.balance_due > 0.01) // Only show bills with balance

      // Calculate AP aging summary
      const apSummary = {
        current: 0,
        over_due: 0,
        over_30: 0,
        over_60: 0,
        over_90: 0,
        total: 0
      }

      apAging.forEach(bill => {
        apSummary[bill.aging_bucket as keyof typeof apSummary] += bill.balance_due
        apSummary.total += bill.balance_due
      })

      apData = {
        bills: apAging,
        summary: apSummary,
        count: apAging.length
      }
    }

    return NextResponse.json({
      success: true,
      as_of_date: asOfDate,
      accounts_receivable: arData,
      accounts_payable: apData,
      net_position: (arData?.summary.total || 0) - (apData?.summary.total || 0)
    })

  } catch (error) {
    console.error('AR/AP API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AR/AP data' },
      { status: 500 }
    )
  }
}

// POST /api/finance/ar-ap - Create payment allocation or bill payment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.workspace_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, payment_data, allocations } = body

    if (type === 'payment_allocation') {
      // Create payment and allocate to invoices
      const payment = await prisma.payment.create({
        data: {
          workspace_id: session.user.workspace_id,
          payer_type: payment_data.payer_type || 'CLIENT',
          client_id: payment_data.client_id,
          source: payment_data.source,
          ref_no: payment_data.ref_no,
          amount: payment_data.amount,
          currency: payment_data.currency || 'PHP',
          received_at: new Date(payment_data.received_at || new Date()),
          notes: payment_data.notes
        }
      })

      // Create allocations to invoices
      if (allocations && allocations.length > 0) {
        const allocationPromises = allocations.map((alloc: any) =>
          prisma.paymentAllocation.create({
            data: {
              payment_id: payment.id,
              invoice_id: alloc.invoice_id,
              amount: alloc.amount
            }
          })
        )

        await Promise.all(allocationPromises)

        // Update invoice statuses based on payments
        for (const alloc of allocations) {
          const invoice = await prisma.invoice.findUnique({
            where: { id: alloc.invoice_id },
            include: { allocations: true }
          })

          if (invoice) {
            const totalPaid = invoice.allocations.reduce((sum, a) => sum + a.amount, 0) + alloc.amount
            let newStatus = 'SENT'
            
            if (totalPaid >= invoice.total - 0.01) {
              newStatus = 'PAID'
            } else if (totalPaid > 0) {
              newStatus = 'PARTIAL'
            }

            await prisma.invoice.update({
              where: { id: alloc.invoice_id },
              data: { status: newStatus }
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        payment,
        message: 'Payment recorded and allocated successfully'
      })
    }

    if (type === 'bill_payment') {
      // Record bill payment
      const billPayment = await prisma.billPayment.create({
        data: {
          workspace_id: session.user.workspace_id,
          bill_id: payment_data.bill_id,
          amount: payment_data.amount,
          payment_method: payment_data.payment_method,
          reference: payment_data.reference,
          payment_date: new Date(payment_data.payment_date || new Date()),
          notes: payment_data.notes
        }
      })

      // Update bill status
      const bill = await prisma.bill.findUnique({
        where: { id: payment_data.bill_id },
        include: { payments: true }
      })

      if (bill) {
        const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0) + payment_data.amount
        let newStatus = 'PENDING'
        
        if (totalPaid >= bill.total - 0.01) {
          newStatus = 'PAID'
        } else if (totalPaid > 0) {
          newStatus = 'PARTIAL'
        }

        await prisma.bill.update({
          where: { id: payment_data.bill_id },
          data: { payment_status: newStatus }
        })
      }

      return NextResponse.json({
        success: true,
        bill_payment: billPayment,
        message: 'Bill payment recorded successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid payment type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('AR/AP Payment API error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}