// Finance Calculations & BIR Compliance
// Based on CLIENT_UPDATED_PLAN.md Stage 9 specifications

export interface InvoiceLine {
  description: string
  qty: number
  uom?: string
  unit_price: number
  tax_rate?: number
}

export interface InvoiceTotals {
  subtotal: number
  vat_amount: number
  discount: number
  total: number
  taxable_amount: number
  exempt_amount: number
  zero_rated: number
}

export interface BIRExportData {
  sales_book: BIRSalesBookEntry[]
  purchase_book: BIRPurchaseBookEntry[]
  period: {
    start: Date
    end: Date
  }
  totals: {
    total_sales: number
    total_vat_sales: number
    total_vat_amount: number
    total_purchases: number
    total_input_vat: number
  }
}

export interface BIRSalesBookEntry {
  date_of_sale: string
  customer_name: string
  customer_tin?: string
  address?: string
  invoice_no: string
  gross_amount: number
  exempt_amount: number
  zero_rated: number
  taxable_amount: number
  vat_amount: number
}

export interface BIRPurchaseBookEntry {
  date_of_purchase: string
  supplier_name: string
  supplier_tin?: string
  invoice_no?: string
  gross_amount: number
  input_vat: number
}

// Calculate invoice totals based on tax mode
export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  tax_mode: 'VAT_INCLUSIVE' | 'VAT_EXCLUSIVE' | 'NON_VAT' = 'VAT_INCLUSIVE',
  discount: number = 0
): InvoiceTotals {
  const subtotal = lines.reduce((sum, line) => {
    return sum + (line.qty * line.unit_price)
  }, 0)

  let vat_amount = 0
  let taxable_amount = 0
  let exempt_amount = 0
  const zero_rated = 0

  if (tax_mode === 'NON_VAT') {
    exempt_amount = subtotal
  } else {
    // Assume standard VAT rate of 12%
    const vat_rate = 12
    taxable_amount = subtotal

    if (tax_mode === 'VAT_INCLUSIVE') {
      // VAT is included in the price
      vat_amount = subtotal * (vat_rate / (100 + vat_rate))
    } else {
      // VAT_EXCLUSIVE - VAT is added to the price
      vat_amount = subtotal * (vat_rate / 100)
    }
  }

  const total = tax_mode === 'VAT_EXCLUSIVE' 
    ? subtotal + vat_amount - discount
    : subtotal - discount

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vat_amount * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    taxable_amount: Math.round(taxable_amount * 100) / 100,
    exempt_amount: Math.round(exempt_amount * 100) / 100,
    zero_rated: Math.round(zero_rated * 100) / 100
  }
}

// Generate invoice number
export function generateInvoiceNumber(brand_code: string, year: number, sequence: number): string {
  return `${brand_code}-${year}-${sequence.toString().padStart(5, '0')}`
}

// Calculate aging buckets for AR
export function calculateARBuckets(invoices: Array<{
  due_date: Date | null
  balance: number
  date_issued: Date
}>): {
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  over_90: number
  total: number
} {
  const today = new Date()
  const buckets = {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    over_90: 0,
    total: 0
  }

  invoices.forEach(invoice => {
    if (invoice.balance <= 0) return

    const due_date = invoice.due_date || invoice.date_issued
    const days_overdue = Math.floor((today.getTime() - due_date.getTime()) / (1000 * 60 * 60 * 24))

    buckets.total += invoice.balance

    if (days_overdue <= 0) {
      buckets.current += invoice.balance
    } else if (days_overdue <= 30) {
      buckets.days_1_30 += invoice.balance
    } else if (days_overdue <= 60) {
      buckets.days_31_60 += invoice.balance
    } else if (days_overdue <= 90) {
      buckets.days_61_90 += invoice.balance
    } else {
      buckets.over_90 += invoice.balance
    }
  })

  // Round to 2 decimal places
  Object.keys(buckets).forEach(key => {
    buckets[key as keyof typeof buckets] = Math.round(buckets[key as keyof typeof buckets] * 100) / 100
  })

  return buckets
}

// Calculate COGS for order
export function calculateOrderCOGS(
  materials_cost: number,
  labor_cost: number,
  overhead_cost: number,
  returns_cost: number = 0
): number {
  const cogs = materials_cost + labor_cost + overhead_cost - returns_cost
  return Math.round(cogs * 100) / 100
}

// Calculate channel P&L
export function calculateChannelPL(data: {
  gross_sales: number
  cogs: number
  platform_fees: number
  shipping_fees: number
  ads_spend: number
  returns_cost: number
}): {
  gross_margin: number
  gross_margin_pct: number
  net_profit: number
  net_profit_pct: number
} {
  const gross_margin = data.gross_sales - data.cogs - data.returns_cost
  const net_profit = gross_margin - data.platform_fees - data.shipping_fees - data.ads_spend

  return {
    gross_margin: Math.round(gross_margin * 100) / 100,
    gross_margin_pct: data.gross_sales > 0 ? Math.round((gross_margin / data.gross_sales) * 10000) / 100 : 0,
    net_profit: Math.round(net_profit * 100) / 100,
    net_profit_pct: data.gross_sales > 0 ? Math.round((net_profit / data.gross_sales) * 10000) / 100 : 0
  }
}

// Generate BIR-compliant sales book entry
export function generateBIRSalesEntry(invoice: {
  date_issued: Date
  invoice_no: string
  client: {
    name: string
    billing_address?: any
  }
  totals: InvoiceTotals
  tin?: string
}): BIRSalesBookEntry {
  const address = invoice.client.billing_address 
    ? (typeof invoice.client.billing_address === 'object' 
        ? `${invoice.client.billing_address.street || ''}, ${invoice.client.billing_address.city || ''}`
        : invoice.client.billing_address)
    : ''

  return {
    date_of_sale: invoice.date_issued.toISOString().split('T')[0],
    customer_name: invoice.client.name,
    customer_tin: invoice.tin || '',
    address: address,
    invoice_no: invoice.invoice_no,
    gross_amount: invoice.totals.total,
    exempt_amount: invoice.totals.exempt_amount,
    zero_rated: invoice.totals.zero_rated,
    taxable_amount: invoice.totals.taxable_amount,
    vat_amount: invoice.totals.vat_amount
  }
}

// Generate BIR-compliant purchase book entry
export function generateBIRPurchaseEntry(bill: {
  date_received: Date
  bill_no?: string
  supplier: {
    name: string
    tin?: string
  }
  total: number
  vat_amount: number
}): BIRPurchaseBookEntry {
  return {
    date_of_purchase: bill.date_received.toISOString().split('T')[0],
    supplier_name: bill.supplier.name,
    supplier_tin: bill.supplier.tin || '',
    invoice_no: bill.bill_no || '',
    gross_amount: bill.total,
    input_vat: bill.vat_amount
  }
}

// Cash flow forecast
export function calculateCashFlowForecast(data: {
  opening_cash: number
  ar_invoices: Array<{
    balance: number
    due_date: Date | null
    date_issued: Date
    payment_probability: number // 0-1 based on client history
  }>
  ap_bills: Array<{
    balance: number
    due_date: Date | null
  }>
  recurring_expenses: Array<{
    amount: number
    frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY'
    next_due: Date
  }>
  horizon_days: number
}): {
  forecast_date: Date
  projected_cash: number
  total_inflows: number
  total_outflows: number
  cash_gap_days?: number
  risk_level: 'GREEN' | 'AMBER' | 'RED'
} {
  const forecast_date = new Date(Date.now() + data.horizon_days * 24 * 60 * 60 * 1000)
  
  // Calculate expected inflows (AR collections with probability weighting)
  const total_inflows = data.ar_invoices.reduce((sum, invoice) => {
    const due_date = invoice.due_date || invoice.date_issued
    if (due_date <= forecast_date) {
      return sum + (invoice.balance * invoice.payment_probability)
    }
    return sum
  }, 0)

  // Calculate outflows (AP bills + recurring expenses)
  let total_outflows = data.ap_bills.reduce((sum, bill) => {
    const due_date = bill.due_date || new Date()
    if (due_date <= forecast_date) {
      return sum + bill.balance
    }
    return sum
  }, 0)

  // Add recurring expenses within horizon
  data.recurring_expenses.forEach(expense => {
    const occurrences = calculateRecurringOccurrences(expense, forecast_date)
    total_outflows += occurrences * expense.amount
  })

  const projected_cash = data.opening_cash + total_inflows - total_outflows

  // Determine risk level
  let risk_level: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
  if (projected_cash < 0) {
    risk_level = 'RED'
  } else if (projected_cash < data.opening_cash * 0.2) { // Less than 20% of opening cash
    risk_level = 'AMBER'
  }

  return {
    forecast_date,
    projected_cash: Math.round(projected_cash * 100) / 100,
    total_inflows: Math.round(total_inflows * 100) / 100,
    total_outflows: Math.round(total_outflows * 100) / 100,
    risk_level
  }
}

// Helper function to calculate recurring expense occurrences
function calculateRecurringOccurrences(
  expense: { frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY', next_due: Date },
  forecast_date: Date
): number {
  const days_until_forecast = Math.ceil((forecast_date.getTime() - expense.next_due.getTime()) / (1000 * 60 * 60 * 24))
  
  if (days_until_forecast <= 0) return 0

  switch (expense.frequency) {
    case 'DAILY':
      return days_until_forecast
    case 'WEEKLY':
      return Math.ceil(days_until_forecast / 7)
    case 'MONTHLY':
      return Math.ceil(days_until_forecast / 30)
    default:
      return 0
  }
}

// Export BIR books to CSV format
export function exportBIRBooksToCSV(data: BIRExportData): {
  sales_book_csv: string
  purchase_book_csv: string
} {
  // Sales book CSV headers
  const sales_headers = [
    'Date of Sale',
    'Customer Name', 
    'Customer TIN',
    'Address',
    'Invoice No',
    'Gross Amount',
    'Exempt Amount',
    'Zero-Rated Amount',
    'Taxable Amount',
    'VAT Amount'
  ]

  const sales_book_csv = [
    sales_headers.join(','),
    ...data.sales_book.map(entry => [
      entry.date_of_sale,
      `"${entry.customer_name}"`,
      entry.customer_tin || '',
      `"${entry.address || ''}"`,
      entry.invoice_no,
      entry.gross_amount.toFixed(2),
      entry.exempt_amount.toFixed(2),
      entry.zero_rated.toFixed(2),
      entry.taxable_amount.toFixed(2),
      entry.vat_amount.toFixed(2)
    ].join(','))
  ].join('\n')

  // Purchase book CSV headers
  const purchase_headers = [
    'Date of Purchase',
    'Supplier Name',
    'Supplier TIN', 
    'Invoice No',
    'Gross Amount',
    'Input VAT'
  ]

  const purchase_book_csv = [
    purchase_headers.join(','),
    ...data.purchase_book.map(entry => [
      entry.date_of_purchase,
      `"${entry.supplier_name}"`,
      entry.supplier_tin || '',
      entry.invoice_no || '',
      entry.gross_amount.toFixed(2),
      entry.input_vat.toFixed(2)
    ].join(','))
  ].join('\n')

  return {
    sales_book_csv,
    purchase_book_csv
  }
}