import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { db } from '@/lib/db'
import { exportBIRBooksToCSV, type BIRExportData } from '@/lib/finance-calculations'
// BIR Export API for Philippine Tax Compliance
// Based on CLIENT_UPDATED_PLAN.md Stage 9 specifications


// GET /api/finance/exports/bir - Export BIR-compliant sales and purchase books
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const brand_id = searchParams.get('brand_id')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')
    const format = searchParams.get('format') || 'json' // json, csv

    if (!workspace_id || !from_date || !to_date) {
      return NextResponse.json(
        { error: 'workspace_id, from_date, and to_date are required' },
        { status: 400 }
      )
    }

    const start_date = new Date(from_date)
    const end_date = new Date(to_date)

    // Validate date range
    if (start_date >= end_date) {
      return NextResponse.json(
        { error: 'from_date must be before to_date' },
        { status: 400 }
      )
    }

    // Build filters
    const sales_where: any = {
      workspace_id,
      date_of_sale: {
        gte: start_date,
        lte: end_date
      }
    }

    const purchase_where: any = {
      workspace_id,
      date_of_purchase: {
        gte: start_date,
        lte: end_date
      }
    }

    if (brand_id) {
      sales_where.invoice = { brand_id }
      purchase_where.bill = { brand_id }
    }

    // Get BIR sales book entries
    const sales_entries = await db.bIRSalesEntry.findMany({
      where: sales_where,
      include: {
        invoice: {
          select: {
            invoice_no: true,
            brand: { select: { name: true } }
          }
        }
      },
      orderBy: { date_of_sale: 'asc' }
    })

    // Get BIR purchase book entries
    const purchase_entries = await db.bIRPurchaseEntry.findMany({
      where: purchase_where,
      include: {
        bill: {
          select: {
            bill_no: true,
            brand: { select: { name: true } }
          }
        }
      },
      orderBy: { date_of_purchase: 'asc' }
    })

    // Transform to BIR export format
    const sales_book = sales_entries.map(entry => ({
      date_of_sale: entry.date_of_sale.toISOString().split('T')[0],
      customer_name: entry.customer_name,
      customer_tin: entry.tin || '',
      address: entry.address || '',
      invoice_no: entry.invoice.invoice_no,
      gross_amount: entry.gross_amount,
      exempt_amount: entry.exempt_amount,
      zero_rated: entry.zero_rated,
      taxable_amount: entry.taxable_amount,
      vat_amount: entry.vat_amount
    }))

    const purchase_book = purchase_entries.map(entry => ({
      date_of_purchase: entry.date_of_purchase.toISOString().split('T')[0],
      supplier_name: entry.supplier_name,
      supplier_tin: entry.supplier_tin || '',
      invoice_no: entry.invoice_no || '',
      gross_amount: entry.gross_amount,
      input_vat: entry.input_vat
    }))

    // Calculate totals
    const totals = {
      total_sales: sales_book.reduce((sum, entry) => sum + entry.gross_amount, 0),
      total_vat_sales: sales_book.reduce((sum, entry) => sum + entry.taxable_amount, 0),
      total_vat_amount: sales_book.reduce((sum, entry) => sum + entry.vat_amount, 0),
      total_purchases: purchase_book.reduce((sum, entry) => sum + entry.gross_amount, 0),
      total_input_vat: purchase_book.reduce((sum, entry) => sum + entry.input_vat, 0)
    }

    const export_data: BIRExportData = {
      sales_book,
      purchase_book,
      period: {
        start: start_date,
        end: end_date
      },
      totals
    }

    // Return CSV format if requested
    if (format === 'csv') {
      const csv_data = exportBIRBooksToCSV(export_data)
      
      return new NextResponse(
        JSON.stringify({
          success: true,
          sales_book_csv: csv_data.sales_book_csv,
          purchase_book_csv: csv_data.purchase_book_csv,
          period: {
            from: from_date,
            to: to_date
          },
          totals,
          generated_at: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="BIR_Export_${from_date}_to_${to_date}.json"`
          }
        }
      )
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      data: export_data,
      metadata: {
        period: { from: from_date, to: to_date },
        sales_entries_count: sales_book.length,
        purchase_entries_count: purchase_book.length,
        generated_at: new Date().toISOString()
      }
    })

  } catch (_error) {
    console.error('Error generating BIR export:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate BIR export' },
      { status: 500 }
    )
  }
}

// POST /api/finance/exports/bir - Generate and save BIR export file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      brand_id,
      from_date,
      to_date,
      export_type = 'combined', // sales, purchases, combined
      requested_by
    } = body

    if (!workspace_id || !from_date || !to_date) {
      return NextResponse.json(
        { error: 'workspace_id, from_date, and to_date are required' },
        { status: 400 }
      )
    }

    // Get export data using GET logic
    const export_url = new URL('/api/finance/exports/bir', request.url)
    export_url.searchParams.set('workspace_id', workspace_id)
    export_url.searchParams.set('from_date', from_date)
    export_url.searchParams.set('to_date', to_date)
    export_url.searchParams.set('format', 'json')
    if (brand_id) export_url.searchParams.set('brand_id', brand_id)

    const export_request = new Request(export_url.toString())
    const export_response = await GET(export_request)
    const export_result = await export_response.json()

    if (!export_result.success) {
      return NextResponse.json(export_result, { status: 500 })
    }

    const export_data = export_result.data

    // Generate CSV files
    const csv_data = exportBIRBooksToCSV(export_data)

    // In a real application, you would save these files to cloud storage
    // For now, we'll simulate the file creation
    const file_references = {
      sales_book_url: `bir_exports/sales_book_${from_date}_to_${to_date}.csv`,
      purchase_book_url: `bir_exports/purchase_book_${from_date}_to_${to_date}.csv`,
      combined_export_url: `bir_exports/combined_export_${from_date}_to_${to_date}.json`
    }

    // Log the export request for audit purposes
    await db.auditLog.create({
      data: {
        workspace_id,
        entity_type: 'bir_export',
        entity_id: `export_${Date.now()}`,
        action: 'CREATE',
        after_data: {
          export_type,
          period: { from_date, to_date },
          brand_id,
          sales_entries: export_data.sales_book.length,
          purchase_entries: export_data.purchase_book.length,
          totals: export_data.totals,
          requested_by: requested_by || 'system',
          files: file_references
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'BIR export generated successfully',
      export_id: `export_${Date.now()}`,
      files: file_references,
      summary: {
        period: { from_date, to_date },
        sales_entries: export_data.sales_book.length,
        purchase_entries: export_data.purchase_book.length,
        totals: export_data.totals
      },
      download_data: {
        sales_book_csv: csv_data.sales_book_csv,
        purchase_book_csv: csv_data.purchase_book_csv
      }
    }, { status: 201 })

  } catch (_error) {
    console.error('Error creating BIR export:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to create BIR export' },
      { status: 500 }
    )
  }
}

// GET /api/finance/exports/bir/summary - Get BIR export summary for period
export async function OPTIONS(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!workspace_id || !year) {
      return NextResponse.json(
        { error: 'workspace_id and year are required' },
        { status: 400 }
      )
    }

    const year_num = parseInt(year)
    const month_num = month ? parseInt(month) : null

    // Calculate date range
    let start_date: Date
    let end_date: Date

    if (month_num) {
      start_date = new Date(year_num, month_num - 1, 1)
      end_date = new Date(year_num, month_num, 0) // Last day of month
    } else {
      start_date = new Date(year_num, 0, 1) // January 1
      end_date = new Date(year_num, 11, 31) // December 31
    }

    // Get quarterly summaries
    const quarters = [
      { name: 'Q1', start: new Date(year_num, 0, 1), end: new Date(year_num, 2, 31) },
      { name: 'Q2', start: new Date(year_num, 3, 1), end: new Date(year_num, 5, 30) },
      { name: 'Q3', start: new Date(year_num, 6, 1), end: new Date(year_num, 8, 30) },
      { name: 'Q4', start: new Date(year_num, 9, 1), end: new Date(year_num, 11, 31) }
    ]

    const quarterly_summaries = await Promise.all(
      quarters.map(async (quarter) => {
        const [sales, purchases] = await Promise.all([
          db.bIRSalesEntry.aggregate({
            where: {
              workspace_id,
              date_of_sale: {
                gte: quarter.start,
                lte: quarter.end
              }
            },
            _sum: {
              gross_amount: true,
              taxable_amount: true,
              vat_amount: true
            },
            _count: true
          }),
          db.bIRPurchaseEntry.aggregate({
            where: {
              workspace_id,
              date_of_purchase: {
                gte: quarter.start,
                lte: quarter.end
              }
            },
            _sum: {
              gross_amount: true,
              input_vat: true
            },
            _count: true
          })
        ])

        return {
          quarter: quarter.name,
          period: {
            start: quarter.start.toISOString().split('T')[0],
            end: quarter.end.toISOString().split('T')[0]
          },
          sales: {
            transactions: sales._count,
            gross_amount: sales._sum.gross_amount || 0,
            taxable_amount: sales._sum.taxable_amount || 0,
            vat_amount: sales._sum.vat_amount || 0
          },
          purchases: {
            transactions: purchases._count,
            gross_amount: purchases._sum.gross_amount || 0,
            input_vat: purchases._sum.input_vat || 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      year: year_num,
      month: month_num,
      quarterly_summaries,
      yearly_totals: quarterly_summaries.reduce((acc, q) => ({
        sales_transactions: acc.sales_transactions + q.sales.transactions,
        sales_amount: acc.sales_amount + q.sales.gross_amount,
        sales_vat: acc.sales_vat + q.sales.vat_amount,
        purchase_transactions: acc.purchase_transactions + q.purchases.transactions,
        purchase_amount: acc.purchase_amount + q.purchases.gross_amount,
        input_vat: acc.input_vat + q.purchases.input_vat
      }), {
        sales_transactions: 0,
        sales_amount: 0,
        sales_vat: 0,
        purchase_transactions: 0,
        purchase_amount: 0,
        input_vat: 0
      })
    })

  } catch (_error) {
    console.error('Error fetching BIR export summary:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BIR export summary' },
      { status: 500 }
    )
  }
}