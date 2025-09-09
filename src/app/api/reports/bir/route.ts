import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { birComplianceService } from '@/lib/bir-compliance'
import { z } from 'zod'

const reportRequestSchema = z.object({
  reportType: z.enum(['VAT', 'WHT', 'INCOME_STATEMENT', 'CASH_FLOW', 'BALANCE_SHEET', '2550M', '1601C']),
  startDate: z.string(),
  endDate: z.string().optional(),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  exportFormat: z.enum(['JSON', 'EXCEL']).default('JSON')
})

const formRequestSchema = z.object({
  formType: z.enum(['2550M', '1601C']),
  month: z.number().min(1).max(12).optional(),
  quarter: z.number().min(1).max(4).optional(),
  year: z.number()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle BIR form generation
    if (body.formType) {
      return await handleFormGeneration(body)
    }
    
    // Handle regular reports
    const { reportType, startDate, endDate, period, exportFormat } = reportRequestSchema.parse(body)
    
    const dateFrom = new Date(startDate)
    const dateTo = endDate ? new Date(endDate) : new Date()

    let reportData: any
    
    switch (reportType) {
      case 'VAT':
        reportData = await birComplianceService.generateVATReport(
          dateFrom, 
          dateTo, 
          period || 'MONTHLY'
        )
        break
        
      case 'WHT':
        reportData = await birComplianceService.generateWithholdingTaxReport(dateFrom, dateTo)
        break
        
      case 'INCOME_STATEMENT':
        reportData = await birComplianceService.generateIncomeStatement(dateFrom, dateTo)
        break
        
      case 'CASH_FLOW':
        reportData = await birComplianceService.generateCashFlowStatement(dateFrom, dateTo)
        break
        
      case 'BALANCE_SHEET':
        reportData = await birComplianceService.generateBalanceSheet(dateTo)
        break
        
      default:
        return NextResponse.json(
          { success: false, message: 'Unsupported report type' },
          { status: 400 }
        )
    }

    if (exportFormat === 'EXCEL') {
      const excelBuffer = await birComplianceService.exportToExcel(
        reportData, 
        reportType, 
        reportData.period || `${startDate} - ${endDate}`
      )
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${reportType}_${startDate}_${endDate}.xlsx"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      reportType,
      data: reportData,
      generatedAt: new Date().toISOString()
    })

  } catch (_error) {
    console.error('BIR report generation error:', _error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleFormGeneration(body: any) {
  try {
    const { formType, month, quarter, year } = formRequestSchema.parse(body)
    
    let formData: any

    switch (formType) {
      case '2550M':
        if (!quarter) {
          return NextResponse.json(
            { success: false, message: 'Quarter is required for Form 2550M' },
            { status: 400 }
          )
        }
        formData = await birComplianceService.generateBIRForm2550M(quarter, year)
        break
        
      case '1601C':
        if (!month) {
          return NextResponse.json(
            { success: false, message: 'Month is required for Form 1601C' },
            { status: 400 }
          )
        }
        formData = await birComplianceService.generateBIRForm1601C(month, year)
        break
        
      default:
        return NextResponse.json(
          { success: false, message: 'Unsupported form type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      formType,
      data: formData,
      generatedAt: new Date().toISOString()
    })

  } catch (_error) {
    console.error('BIR form generation error:', _error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to generate BIR form',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'compliance-check') {
      const warnings = await birComplianceService.validateCompliance()
      
      return NextResponse.json({
        success: true,
        warnings,
        checkDate: new Date().toISOString()
      })
    }

    // Default: return available report types and their requirements
    return NextResponse.json({
      success: true,
      availableReports: {
        VAT: {
          description: 'Value Added Tax Report',
          requiredParams: ['startDate', 'endDate', 'period'],
          periods: ['MONTHLY', 'QUARTERLY']
        },
        WHT: {
          description: 'Withholding Tax Report', 
          requiredParams: ['startDate', 'endDate'],
          periods: ['MONTHLY']
        },
        INCOME_STATEMENT: {
          description: 'Income Statement',
          requiredParams: ['startDate', 'endDate'],
          periods: ['MONTHLY', 'QUARTERLY', 'YEARLY']
        },
        CASH_FLOW: {
          description: 'Cash Flow Statement',
          requiredParams: ['startDate', 'endDate'], 
          periods: ['MONTHLY', 'QUARTERLY', 'YEARLY']
        },
        BALANCE_SHEET: {
          description: 'Balance Sheet',
          requiredParams: ['endDate'],
          periods: ['AS_OF_DATE']
        }
      },
      availableForms: {
        '2550M': {
          description: 'Monthly VAT Return',
          requiredParams: ['quarter', 'year'],
          frequency: 'QUARTERLY'
        },
        '1601C': {
          description: 'Monthly Withholding Tax Return',
          requiredParams: ['month', 'year'],
          frequency: 'MONTHLY'
        }
      },
      exportFormats: ['JSON', 'EXCEL']
    })

  } catch (_error) {
    console.error('BIR report API error:', _error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'API error' 
      },
      { status: 500 }
    )
  }
}