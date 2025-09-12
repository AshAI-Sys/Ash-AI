// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get("reportType")
    const _period = searchParams.get("period")
    
    const where: any = {}
    
    if (reportType) {
      where.reportType = reportType
    }
    
    if (period) {
      where.period = period
    }

    const reports = await prisma.financialReport.findMany({
      where,
      include: {
        generator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        generatedAt: "desc"
      }
    })

    return NextResponse.json({
      success: true,
      data: reports
    })

  } catch (_error) {
    console.error("Error fetching financial reports:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Authorization check - admin/manager only
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const {
      reportType,
      period,
      generatedBy
    } = body

    if (!reportType || !period || !generatedBy) {
      return NextResponse.json(
        { success: false, error: "Report type, period, and generator are required" },
        { status: 400 }
      )
    }

    let reportData: any = {}

    switch (reportType) {
      case "P_L":
        reportData = await generateProfitLossReport(period)
        break
      case "BALANCE_SHEET":
        reportData = await generateBalanceSheetReport(period)
        break
      case "CASH_FLOW":
        reportData = await generateCashFlowReport(period)
        break
      case "TRIAL_BALANCE":
        reportData = await generateTrialBalanceReport(period)
        break
      case "BUDGET_VARIANCE":
        reportData = await generateBudgetVarianceReport(period)
        break
      case "TAX_SUMMARY":
        reportData = await generateTaxSummaryReport(period)
        break
      default:
        return NextResponse.json(
          { success: false, error: "Invalid report type" },
          { status: 400 }
        )
    }

    const report = await prisma.financialReport.create({
      data: {
        reportName: `${reportType.replace("_", " ")} - ${period}`,
        reportType,
        period,
        reportData,
        generatedBy
      },
      include: {
        generator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: report
    })

  } catch (_error) {
    console.error("Error generating report:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to generate report" },
      { status: 500 }
    )
  }
}

async function generateProfitLossReport(period: string) {
  const [year, month] = period.split("-")
  const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1)
  const endDate = month
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(parseInt(year) + 1, 0, 0)

  // Get all journal entries for the period
  const entries = await prisma.journalEntry.findMany({
    where: {
      entryDate: {
        gte: startDate,
        lte: endDate
      },
      status: "POSTED"
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  })

  const revenue = calculateAccountTypeTotal(entries, "INCOME")
  const expenses = calculateAccountTypeTotal(entries, "EXPENSE")
  const netIncome = revenue - expenses

  return {
    period,
    revenue,
    expenses,
    netIncome,
    generatedAt: new Date()
  }
}

async function generateBalanceSheetReport(period: string) {
  const [year, month] = period.split("-")
  const endDate = month
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(parseInt(year) + 1, 0, 0)

  // Get all journal entries up to the period end
  const entries = await prisma.journalEntry.findMany({
    where: {
      entryDate: {
        lte: endDate
      },
      status: "POSTED"
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  })

  const assets = calculateAccountTypeTotal(entries, "ASSET")
  const liabilities = calculateAccountTypeTotal(entries, "LIABILITY")
  const equity = calculateAccountTypeTotal(entries, "EQUITY")

  return {
    period,
    assets,
    liabilities,
    equity,
    totalEquityAndLiabilities: liabilities + equity,
    generatedAt: new Date()
  }
}

async function generateCashFlowReport(period: string) {
  const [year, month] = period.split("-")
  const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1)
  const endDate = month
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(parseInt(year) + 1, 0, 0)

  const cashFlows = await prisma.cashFlow.findMany({
    where: {
      flowDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      account: true
    }
  })

  const operations = cashFlows.filter(cf => cf.category === "OPERATIONS")
  const investing = cashFlows.filter(cf => cf.category === "INVESTING")
  const financing = cashFlows.filter(cf => cf.category === "FINANCING")

  return {
    period,
    operations: {
      inflow: operations.reduce((sum, cf) => sum + cf.inflow, 0),
      outflow: operations.reduce((sum, cf) => sum + cf.outflow, 0),
      net: operations.reduce((sum, cf) => sum + cf.netFlow, 0)
    },
    investing: {
      inflow: investing.reduce((sum, cf) => sum + cf.inflow, 0),
      outflow: investing.reduce((sum, cf) => sum + cf.outflow, 0),
      net: investing.reduce((sum, cf) => sum + cf.netFlow, 0)
    },
    financing: {
      inflow: financing.reduce((sum, cf) => sum + cf.inflow, 0),
      outflow: financing.reduce((sum, cf) => sum + cf.outflow, 0),
      net: financing.reduce((sum, cf) => sum + cf.netFlow, 0)
    },
    generatedAt: new Date()
  }
}

async function generateTrialBalanceReport(period: string) {
  const [year, month] = period.split("-")
  const endDate = month
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(parseInt(year) + 1, 0, 0)

  const accounts = await prisma.chartOfAccount.findMany({
    where: { is_active: true },
    include: {
      journalEntries: {
        where: {
          entryDate: { lte: endDate },
          status: "POSTED"
        }
      }
    }
  })

  const trialBalance = accounts.map(account => {
    const totalDebits = account.journalEntries.reduce((sum, line) => sum + line.totalDebit, 0)
    const totalCredits = account.journalEntries.reduce((sum, line) => sum + line.totalCredit, 0)
    
    return {
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      debitBalance: totalDebits > totalCredits ? totalDebits - totalCredits : 0,
      creditBalance: totalCredits > totalDebits ? totalCredits - totalDebits : 0
    }
  }).filter(account => account.debitBalance > 0 || account.creditBalance > 0)

  return {
    period,
    accounts: trialBalance,
    totalDebits: trialBalance.reduce((sum, acc) => sum + acc.debitBalance, 0),
    totalCredits: trialBalance.reduce((sum, acc) => sum + acc.creditBalance, 0),
    generatedAt: new Date()
  }
}

async function generateBudgetVarianceReport(period: string) {
  const year = parseInt(period.split("-")[0])
  
  const budgets = await prisma.budget.findMany({
    where: {
      year,
      status: "ACTIVE"
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  })

  return {
    period,
    budgets: budgets.map(budget => ({
      budgetName: budget.budgetName,
      type: budget.type,
      lines: budget.lines.map(line => ({
        account: line.account.accountName,
        budgetAmount: line.budgetAmount,
        actualAmount: line.actualAmount,
        variance: line.variance,
        variancePercent: line.budgetAmount > 0 ? (line.variance / line.budgetAmount) * 100 : 0
      }))
    })),
    generatedAt: new Date()
  }
}

async function generateTaxSummaryReport(period: string) {
  const [year, month] = period.split("-")
  const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1)
  const endDate = month
    ? new Date(parseInt(year), parseInt(month), 0)
    : new Date(parseInt(year) + 1, 0, 0)

  const taxRecords = await prisma.taxRecord.findMany({
    where: {
      created_at: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const groupedTaxes = taxRecords.reduce((acc: any, record) => {
    const key = record.taxType
    if (!acc[key]) {
      acc[key] = {
        taxType: key,
        totalBase: 0,
        totalTax: 0,
        records: 0
      }
    }
    acc[key].totalBase += record.taxBase
    acc[key].totalTax += record.taxAmount
    acc[key].records += 1
    return acc
  }, {})

  return {
    period,
    summary: Object.values(groupedTaxes),
    totalTaxLiability: taxRecords.reduce((sum, record) => sum + record.taxAmount, 0),
    generatedAt: new Date()
  }
}

function calculateAccountTypeTotal(entries: any[], accountType: string): number {
  return entries.reduce((total, entry) => {
    return total + entry.lines
      .filter((line: any) => line.account.accountType === accountType)
      .reduce((sum: number, line: any) => {
        // For income and liability/equity accounts, credits increase the balance
        // For asset and expense accounts, debits increase the balance
        if (accountType === "INCOME" || accountType === "LIABILITY" || accountType === "EQUITY") {
          return sum + line.creditAmount - line.debitAmount
        } else {
          return sum + line.debitAmount - line.creditAmount
        }
      }, 0)
  }, 0)
}