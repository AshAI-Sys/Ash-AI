import { prisma as db } from './db'
import * as XLSX from 'xlsx'
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns'

export interface VATReport {
  period: string
  totalSales: number
  vatableSales: number
  vatExemptSales: number
  zeroRatedSales: number
  outputVAT: number
  inputVAT: number
  netVAT: number
  details: Array<{
    date: string
    reference: string
    customer: string
    amount: number
    vatAmount: number
    type: 'SALE' | 'PURCHASE'
  }>
}

export interface WithholdingTaxReport {
  period: string
  totalWithheld: number
  details: Array<{
    payorName: string
    payorTIN: string
    payeeName: string
    payeeTIN: string
    incomePayment: number
    taxWithheld: number
    atcCode: string
    certificate2307Generated: boolean
  }>
}

export interface CashFlowStatement {
  period: string
  operatingActivities: {
    netIncome: number
    depreciation: number
    accountsReceivableChange: number
    accountsPayableChange: number
    inventoryChange: number
    totalOperatingCashFlow: number
  }
  investingActivities: {
    equipmentPurchases: number
    totalInvestingCashFlow: number
  }
  financingActivities: {
    loanProceeds: number
    loanRepayments: number
    totalFinancingCashFlow: number
  }
  netCashFlow: number
  beginningCash: number
  endingCash: number
}

export interface IncomeStatement {
  period: string
  revenue: {
    sales: number
    serviceIncome: number
    otherIncome: number
    totalRevenue: number
  }
  expenses: {
    materialCosts: number
    laborCosts: number
    utilities: number
    rent: number
    depreciation: number
    otherExpenses: number
    totalExpenses: number
  }
  grossProfit: number
  netIncome: number
}

export interface BalanceSheet {
  asOf: string
  assets: {
    currentAssets: {
      cash: number
      accountsReceivable: number
      inventory: number
      totalCurrentAssets: number
    }
    fixedAssets: {
      equipment: number
      accumulatedDepreciation: number
      netFixedAssets: number
    }
    totalAssets: number
  }
  liabilities: {
    currentLiabilities: {
      accountsPayable: number
      accruals: number
      shortTermDebt: number
      totalCurrentLiabilities: number
    }
    longTermDebt: number
    totalLiabilities: number
  }
  equity: {
    paidUpCapital: number
    retainedEarnings: number
    totalEquity: number
  }
}

class BIRComplianceService {
  private readonly VAT_RATE = 0.12 // 12% VAT in Philippines
  private readonly WITHHOLDING_RATES = {
    'WC140': 0.01, // 1% on sales of goods
    'WC150': 0.02, // 2% on services
    'WC160': 0.10, // 10% on professional fees
  }

  async generateVATReport(
    dateFrom: Date,
    dateTo: Date,
    reportType: 'MONTHLY' | 'QUARTERLY'
  ): Promise<VATReport> {
    const _period = this.formatPeriod(dateFrom, dateTo, reportType)

    // Get sales (output VAT)
    const invoices = await db.invoice.findMany({
      where: {
        created_at: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      include: {
        client: true
      }
    })

    // Get purchases (input VAT)  
    const bills = await db.bill.findMany({
      where: {
        created_at: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      include: {
        vendor: true
      }
    })

    let totalSales = 0
    let outputVAT = 0
    let inputVAT = 0
    const details: Array<{
      date: string
      reference: string
      customer: string
      amount: number
      vatAmount: number
      type: 'SALE' | 'PURCHASE'
    }> = []

    // Process sales
    invoices.forEach(invoice => {
      const vatableAmount = invoice.amount
      const vatAmount = invoice.taxAmount || (vatableAmount * this.VAT_RATE)
      
      totalSales += invoice.totalAmount
      outputVAT += vatAmount

      details.push({
        date: format(invoice.created_at, 'yyyy-MM-dd'),
        reference: invoice.invoiceNumber,
        customer: invoice.client?.name || 'Unknown',
        amount: vatableAmount,
        vatAmount,
        type: 'SALE'
      })
    })

    // Process purchases
    bills.forEach(bill => {
      if (bill.amount > 0) { // Only positive amounts (purchases, not refunds)
        const vatAmount = bill.amount * this.VAT_RATE / (1 + this.VAT_RATE) // Extract VAT from total
        inputVAT += vatAmount

        details.push({
          date: format(bill.created_at, 'yyyy-MM-dd'),
          reference: bill.billNumber,
          customer: bill.vendor?.name || 'Unknown Vendor',
          amount: bill.amount - vatAmount,
          vatAmount,
          type: 'PURCHASE'
        })
      }
    })

    return {
      period,
      totalSales,
      vatableSales: totalSales / (1 + this.VAT_RATE), // Assuming all sales are VATable
      vatExemptSales: 0,
      zeroRatedSales: 0,
      outputVAT,
      inputVAT,
      netVAT: outputVAT - inputVAT,
      details
    }
  }

  async generateWithholdingTaxReport(
    dateFrom: Date,
    dateTo: Date
  ): Promise<WithholdingTaxReport> {
    const _period = this.formatPeriod(dateFrom, dateTo, 'MONTHLY')

    // Get payments subject to withholding tax
    const _payments = await db.payment.findMany({
      where: {
        receivedDate: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      include: {
        client: true,
        invoice: true
      }
    })

    // Get bills paid to vendors (subject to WHT)
    const bills = await db.bill.findMany({
      where: {
        paidDate: {
          gte: dateFrom,
          lte: dateTo
        },
        status: 'PAID'
      },
      include: {
        vendor: true
      }
    })

    let totalWithheld = 0
    const details: Array<{
      payorName: string
      payorTIN: string
      payeeName: string
      payeeTIN: string
      incomePayment: number
      taxWithheld: number
      atcCode: string
      certificate2307Generated: boolean
    }> = []

    // Process vendor payments (we withhold tax from vendors)
    bills.forEach(bill => {
      if (bill.vendor && bill.amount > 0) {
        const atcCode = this.determineATCCode(bill.notes || '')
        const withholdingRate = this.WITHHOLDING_RATES[atcCode] || 0.01
        const taxWithheld = bill.amount * withholdingRate

        totalWithheld += taxWithheld

        details.push({
          payorName: 'Sorbetes Apparel Studio',
          payorTIN: '123-456-789-000', // Your TIN here
          payeeName: bill.vendor.name,
          payeeTIN: '000-000-000-000', // Vendor TIN would be stored
          incomePayment: bill.amount,
          taxWithheld,
          atcCode,
          certificate2307Generated: false // Track if BIR Form 2307 was generated
        })
      }
    })

    return {
      period,
      totalWithheld,
      details
    }
  }

  async generateIncomeStatement(
    dateFrom: Date,
    dateTo: Date
  ): Promise<IncomeStatement> {
    const _period = this.formatPeriod(dateFrom, dateTo, 'MONTHLY')

    // Revenue calculations
    const invoices = await db.invoice.findMany({
      where: {
        created_at: { gte: dateFrom, lte: dateTo }
      }
    })

    const platformSales = await db.platformSale.findMany({
      where: {
        saleDate: { gte: dateFrom, lte: dateTo }
      }
    })

    const sales = invoices.reduce((sum, inv) => sum + inv.amount, 0) +
                  platformSales.reduce((sum, sale) => sum + sale.netAmount, 0)

    // Expense calculations
    const orderCosts = await db.orderCost.findMany({
      where: {
        created_at: { gte: dateFrom, lte: dateTo }
      }
    })

    const bills = await db.bill.findMany({
      where: {
        created_at: { gte: dateFrom, lte: dateTo }
      }
    })

    const payrolls = await db.payroll.findMany({
      where: {
        created_at: { gte: dateFrom, lte: dateTo }
      }
    })

    const materialCosts = orderCosts
      .filter(cost => cost.category === 'MATERIAL')
      .reduce((sum, cost) => sum + cost.amount, 0)

    const laborCosts = payrolls.reduce((sum, payroll) => sum + payroll.netPay, 0)
    
    const utilities = bills
      .filter(bill => bill.notes?.toLowerCase().includes('utilities'))
      .reduce((sum, bill) => sum + bill.amount, 0)

    const otherExpenses = bills
      .filter(bill => !bill.notes?.toLowerCase().includes('utilities'))
      .reduce((sum, bill) => sum + bill.amount, 0)

    const totalExpenses = materialCosts + laborCosts + utilities + otherExpenses

    return {
      period,
      revenue: {
        sales,
        serviceIncome: 0,
        otherIncome: 0,
        totalRevenue: sales
      },
      expenses: {
        materialCosts,
        laborCosts,
        utilities,
        rent: 0, // Would need separate tracking
        depreciation: 0, // Would need depreciation schedule
        otherExpenses,
        totalExpenses
      },
      grossProfit: sales - materialCosts,
      netIncome: sales - totalExpenses
    }
  }

  async generateCashFlowStatement(
    dateFrom: Date,
    dateTo: Date
  ): Promise<CashFlowStatement> {
    const _period = this.formatPeriod(dateFrom, dateTo, 'MONTHLY')
    const incomeStatement = await this.generateIncomeStatement(dateFrom, dateTo)

    // Get cash transactions
    const walletTransactions = await db.walletTransaction.findMany({
      where: {
        created_at: { gte: dateFrom, lte: dateTo }
      }
    })

    const beginningCash = 0 // Would need previous period balance
    const endingCash = walletTransactions.reduce((sum, tx) => 
      sum + (tx.type === 'CREDIT' ? tx.amount : -tx.amount), beginningCash)

    return {
      period,
      operatingActivities: {
        netIncome: incomeStatement.netIncome,
        depreciation: 0,
        accountsReceivableChange: 0,
        accountsPayableChange: 0,
        inventoryChange: 0,
        totalOperatingCashFlow: incomeStatement.netIncome
      },
      investingActivities: {
        equipmentPurchases: 0,
        totalInvestingCashFlow: 0
      },
      financingActivities: {
        loanProceeds: 0,
        loanRepayments: 0,
        totalFinancingCashFlow: 0
      },
      netCashFlow: endingCash - beginningCash,
      beginningCash,
      endingCash
    }
  }

  async generateBalanceSheet(asOfDate: Date): Promise<BalanceSheet> {
    // This would require more comprehensive accounting data
    // For now, return a basic structure
    
    const walletTransactions = await db.walletTransaction.findMany({
      where: {
        created_at: { lte: asOfDate }
      }
    })

    const cash = walletTransactions.reduce((sum, tx) => 
      sum + (tx.type === 'CREDIT' ? tx.amount : -tx.amount), 0)

    const pendingInvoices = await db.invoice.findMany({
      where: {
        status: 'OPEN',
        created_at: { lte: asOfDate }
      }
    })

    const accountsReceivable = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0)

    const inventory = await db.inventoryItem.findMany()
    const inventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    const pendingBills = await db.bill.findMany({
      where: {
        status: 'OPEN',
        created_at: { lte: asOfDate }
      }
    })

    const accountsPayable = pendingBills.reduce((sum, bill) => sum + bill.amount, 0)

    return {
      asOf: format(asOfDate, 'yyyy-MM-dd'),
      assets: {
        currentAssets: {
          cash,
          accountsReceivable,
          inventory: inventoryValue,
          totalCurrentAssets: cash + accountsReceivable + inventoryValue
        },
        fixedAssets: {
          equipment: 0, // Would need fixed asset register
          accumulatedDepreciation: 0,
          netFixedAssets: 0
        },
        totalAssets: cash + accountsReceivable + inventoryValue
      },
      liabilities: {
        currentLiabilities: {
          accountsPayable,
          accruals: 0,
          shortTermDebt: 0,
          totalCurrentLiabilities: accountsPayable
        },
        longTermDebt: 0,
        totalLiabilities: accountsPayable
      },
      equity: {
        paidUpCapital: 100000, // Initial capital - would be configured
        retainedEarnings: (cash + accountsReceivable + inventoryValue) - accountsPayable - 100000,
        totalEquity: (cash + accountsReceivable + inventoryValue) - accountsPayable
      }
    }
  }

  async exportToExcel(data: any, reportType: string, _period: string): Promise<Buffer> {
    const workbook = XLSX.utils.book_new()

    switch (reportType) {
      case 'VAT':
        const vatSheet = XLSX.utils.json_to_sheet(data.details)
        XLSX.utils.book_append_sheet(workbook, vatSheet, 'VAT Details')
        
        // Add summary sheet
        const summaryData = [
          ['Period', data.period],
          ['Total Sales', data.totalSales],
          ['VATable Sales', data.vatableSales],
          ['Output VAT', data.outputVAT],
          ['Input VAT', data.inputVAT],
          ['Net VAT', data.netVAT]
        ]
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
        break

      case 'WHT':
        const whtSheet = XLSX.utils.json_to_sheet(data.details)
        XLSX.utils.book_append_sheet(workbook, whtSheet, 'Withholding Tax')
        break

      case 'INCOME_STATEMENT':
        const incomeData = [
          ['INCOME STATEMENT'],
          ['Period:', data.period],
          [''],
          ['REVENUE'],
          ['Sales', data.revenue.sales],
          ['Service Income', data.revenue.serviceIncome],
          ['Other Income', data.revenue.otherIncome],
          ['Total Revenue', data.revenue.totalRevenue],
          [''],
          ['EXPENSES'],
          ['Material Costs', data.expenses.materialCosts],
          ['Labor Costs', data.expenses.laborCosts],
          ['Utilities', data.expenses.utilities],
          ['Rent', data.expenses.rent],
          ['Depreciation', data.expenses.depreciation],
          ['Other Expenses', data.expenses.otherExpenses],
          ['Total Expenses', data.expenses.totalExpenses],
          [''],
          ['Gross Profit', data.grossProfit],
          ['Net Income', data.netIncome]
        ]
        const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData)
        XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income Statement')
        break
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }

  async generateBIRForm2550M(quarter: number, year: number): Promise<any> {
    const quarterStart = startOfQuarter(new Date(year, (quarter - 1) * 3))
    const quarterEnd = endOfQuarter(quarterStart)

    const vatReport = await this.generateVATReport(quarterStart, quarterEnd, 'QUARTERLY')

    // BIR Form 2550M structure
    return {
      formType: '2550M',
      taxableMonth: format(quarterEnd, 'MM'),
      taxableYear: year.toString(),
      grossSales: vatReport.totalSales,
      exemptSales: vatReport.vatExemptSales,
      zeroRatedSales: vatReport.zeroRatedSales,
      taxableSales: vatReport.vatableSales,
      outputTax: vatReport.outputVAT,
      inputTax: vatReport.inputVAT,
      netVATPayable: Math.max(0, vatReport.netVAT),
      netVATRefundable: Math.max(0, -vatReport.netVAT)
    }
  }

  async generateBIRForm1601C(month: number, year: number): Promise<any> {
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(monthStart)

    const whtReport = await this.generateWithholdingTaxReport(monthStart, monthEnd)

    return {
      formType: '1601C',
      month: month.toString().padStart(2, '0'),
      year: year.toString(),
      totalAmountOfIncomePayments: whtReport.details.reduce((sum, d) => sum + d.incomePayment, 0),
      totalAmountOfTaxWithheld: whtReport.totalWithheld,
      details: whtReport.details
    }
  }

  private formatPeriod(dateFrom: Date, dateTo: Date, reportType: string): string {
    if (reportType === 'MONTHLY') {
      return format(dateFrom, 'MMMM yyyy')
    } else if (reportType === 'QUARTERLY') {
      const quarter = Math.ceil((dateFrom.getMonth() + 1) / 3)
      return `Q${quarter} ${format(dateFrom, 'yyyy')}`
    }
    return `${format(dateFrom, 'MM/dd/yyyy')} - ${format(dateTo, 'MM/dd/yyyy')}`
  }

  private determineATCCode(description: string): string {
    const desc = description.toLowerCase()
    
    if (desc.includes('goods') || desc.includes('materials') || desc.includes('inventory')) {
      return 'WC140' // 1% on goods
    } else if (desc.includes('service') || desc.includes('labor')) {
      return 'WC150' // 2% on services  
    } else if (desc.includes('professional') || desc.includes('consulting')) {
      return 'WC160' // 10% on professional fees
    }
    
    return 'WC140' // Default to goods
  }

  async scheduleAutomaticReports(): Promise<void> {
    // This would integrate with a job scheduler
    console.log('Scheduling automatic BIR report generation...')
    
    // Monthly VAT returns (due 20th of following month)
    // Quarterly income tax returns (due 60 days after quarter end)
    // Annual income tax returns (due April 15)
  }

  async validateCompliance(): Promise<Array<{
    type: 'WARNING' | 'ERROR' | 'INFO'
    message: string
    dueDate?: Date
    form?: string
  }>> {
    const today = new Date()
    const warnings: Array<{
      type: 'WARNING' | 'ERROR' | 'INFO'
      message: string
      dueDate?: Date
      form?: string
    }> = []

    // Check for overdue VAT returns
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const vatDueDate = new Date(currentYear, currentMonth, 20)

    if (today > vatDueDate) {
      warnings.push({
        type: 'ERROR',
        message: 'VAT return is overdue',
        dueDate: vatDueDate,
        form: '2550M'
      })
    } else if (today >= new Date(currentYear, currentMonth, 15)) {
      warnings.push({
        type: 'WARNING', 
        message: 'VAT return due soon',
        dueDate: vatDueDate,
        form: '2550M'
      })
    }

    return warnings
  }
}

export const birComplianceService = new BIRComplianceService()