import { NextRequest, NextResponse } from 'next/server'

import { db, createAuditLog } from '@/lib/db'
import { calculateInvoiceTotals, generateInvoiceNumber, generateBIRSalesEntry } from '@/lib/finance-calculations'
// Finance Invoices API
// Based on CLIENT_UPDATED_PLAN.md Stage 9 specifications


// GET /api/finance/invoices - Get invoices with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const brand_id = searchParams.get('brand_id')
    const client_id = searchParams.get('client_id')
    const status = searchParams.get('status')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    const where: any = { workspace_id }
    if (brand_id) where.brand_id = brand_id
    if (client_id) where.client_id = client_id
    if (status) where.status = status
    
    if (from_date || to_date) {
      where.date_issued = {}
      if (from_date) where.date_issued.gte = new Date(from_date)
      if (to_date) where.date_issued.lte = new Date(to_date)
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        brand: { select: { name: true, code: true } },
        client: { select: { name: true, emails: true } },
        order: { select: { po_number: true, product_type: true } },
        lines: true,
        allocations: {
          include: {
            payment: {
              select: {
                source: true,
                ref_no: true,
                received_at: true
              }
            }
          }
        }
      },
      orderBy: { date_issued: 'desc' }
    })

    // Calculate summary stats
    const summary = invoices.reduce((acc, invoice) => {
      acc.total_invoices++
      acc.total_amount += invoice.total
      acc.total_balance += invoice.balance
      
      if (invoice.status === 'OPEN') acc.open_count++
      else if (invoice.status === 'PARTIAL') acc.partial_count++
      else if (invoice.status === 'PAID') acc.paid_count++
      
      return acc
    }, {
      total_invoices: 0,
      total_amount: 0,
      total_balance: 0,
      open_count: 0,
      partial_count: 0,
      paid_count: 0
    })

    return NextResponse.json({
      success: true,
      invoices,
      summary
    })

  } catch (_error) {
    console.error('Error fetching invoices:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST /api/finance/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      brand_id,
      client_id,
      order_id,
      lines,
      discount = 0,
      tax_mode = 'VAT_INCLUSIVE',
      due_date,
      created_by
    } = body

    // Validate required fields
    if (!workspace_id || !brand_id || !client_id || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'workspace_id, brand_id, client_id, and lines are required' },
        { status: 400 }
      )
    }

    // Validate client exists
    const client = await db.client.findUnique({
      where: { id: client_id },
      include: {
        workspace: { select: { name: true } }
      }
    })

    if (!client || client.workspace_id !== workspace_id) {
      return NextResponse.json(
        { error: 'Client not found in workspace' },
        { status: 404 }
      )
    }

    // Validate brand
    const brand = await db.brand.findUnique({
      where: { id: brand_id },
      select: { code: true, name: true, workspace_id: true }
    })

    if (!brand || brand.workspace_id !== workspace_id) {
      return NextResponse.json(
        { error: 'Brand not found in workspace' },
        { status: 404 }
      )
    }

    // Validate order if provided
    if (order_id) {
      const order = await db.order.findUnique({
        where: { id: order_id },
        select: { workspace_id: true, client_id: true, brand_id: true }
      })

      if (!order || order.workspace_id !== workspace_id || 
          order.client_id !== client_id || order.brand_id !== brand_id) {
        return NextResponse.json(
          { error: 'Order not found or does not match client/brand' },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    const totals = calculateInvoiceTotals(lines, tax_mode, discount)

    // Generate invoice number
    const currentYear = new Date().getFullYear()
    
    // Get next sequence number for this brand/year
    const sequenceRecord = await db.pONumberSequence.findUnique({
      where: {
        brand_id_year: {
          brand_id: brand_id,
          year: currentYear
        }
      }
    })

    let nextSequence = 1
    if (sequenceRecord) {
      nextSequence = sequenceRecord.sequence + 1
      await db.pONumberSequence.update({
        where: {
          brand_id_year: {
            brand_id: brand_id,
            year: currentYear
          }
        },
        data: { sequence: nextSequence }
      })
    } else {
      await db.pONumberSequence.create({
        data: {
          brand_id: brand_id,
          year: currentYear,
          sequence: nextSequence
        }
      })
    }

    const invoice_no = generateInvoiceNumber(brand.code || 'INV', currentYear, nextSequence)

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        workspace_id,
        brand_id,
        client_id,
        order_id,
        invoice_no,
        date_issued: new Date(),
        due_date: due_date ? new Date(due_date) : null,
        tax_mode,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vat_amount: totals.vat_amount,
        total: totals.total,
        balance: totals.total, // Initially equals total
        lines: {
          createMany: {
            data: lines.map((line: any) => ({
              description: line.description,
              qty: line.qty,
              uom: line.uom,
              unit_price: line.unit_price,
              tax_rate: line.tax_rate || 12,
              line_total: line.qty * line.unit_price
            }))
          }
        }
      },
      include: {
        lines: true
      }
    })

    // Create BIR sales entry
    await db.bIRSalesEntry.create({
      data: {
        workspace_id,
        invoice_id: invoice.id,
        date_of_sale: invoice.date_issued,
        customer_name: client.name,
        address: client.billing_address ? JSON.stringify(client.billing_address) : null,
        gross_amount: totals.total,
        exempt_amount: totals.exempt_amount,
        zero_rated: totals.zero_rated,
        taxable_amount: totals.taxable_amount,
        vat_amount: totals.vat_amount
      }
    })

    // Create audit log
    await createAuditLog({
      workspace_id,
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'CREATE',
      after_data: {
        invoice_no,
        client_name: client.name,
        total: totals.total,
        tax_mode,
        created_by: created_by || 'system'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      invoice: {
        ...invoice,
        totals
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating invoice:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}