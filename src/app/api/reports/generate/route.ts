import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import ReportGenerator from '@/lib/reporting/report-generator'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'definitions'
    const reportId = searchParams.get('reportId')
    const category = searchParams.get('category')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const reportGenerator = ReportGenerator.getInstance()

    switch (action) {
      case 'definitions':
        const definitions = await reportGenerator.getReportDefinitions(category || undefined)
        return NextResponse.json({
          success: true,
          data: {
            definitions,
            count: definitions.length,
            category: category || 'all',
            timestamp: new Date().toISOString()
          }
        })

      case 'definition':
        if (!reportId) {
          return NextResponse.json(
            { error: 'reportId is required' },
            { status: 400 }
          )
        }

        const definition = await reportGenerator.getReportDefinition(reportId)
        if (!definition) {
          return NextResponse.json(
            { error: 'Report definition not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            definition,
            timestamp: new Date().toISOString()
          }
        })

      case 'report':
        if (!reportId) {
          return NextResponse.json(
            { error: 'reportId is required' },
            { status: 400 }
          )
        }

        const report = await reportGenerator.getReport(reportId)
        if (!report) {
          return NextResponse.json(
            { error: 'Report not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            report,
            timestamp: new Date().toISOString()
          }
        })

      case 'recent':
        const recentReports = await reportGenerator.getRecentReports(userId || undefined, limit)
        return NextResponse.json({
          success: true,
          data: {
            reports: recentReports,
            count: recentReports.length,
            userId: userId || 'all',
            timestamp: new Date().toISOString()
          }
        })

      case 'templates':
        const templates = await reportGenerator.getReportTemplates()
        return NextResponse.json({
          success: true,
          data: {
            templates,
            count: templates.length,
            timestamp: new Date().toISOString()
          }
        })

      case 'bir_forms':
        // Get available BIR forms
        return NextResponse.json({
          success: true,
          data: {
            forms: [
              {
                id: 'form_2550m',
                name: 'Monthly VAT Return (Form 2550M)',
                description: 'Monthly Value Added Tax Return',
                category: 'bir',
                frequency: 'monthly',
                dueDate: '20th of following month'
              },
              {
                id: 'form_2550q',
                name: 'Quarterly VAT Return (Form 2550Q)',
                description: 'Quarterly Value Added Tax Return',
                category: 'bir',
                frequency: 'quarterly',
                dueDate: '25th of following quarter'
              },
              {
                id: 'form_2307',
                name: 'Certificate of Creditable Tax Withheld at Source',
                description: 'Withholding Tax Certificate',
                category: 'bir',
                frequency: 'as_needed',
                dueDate: 'Upon payment'
              },
              {
                id: 'form_1601c',
                name: 'Monthly Remittance Return of Income Tax Withheld',
                description: 'Monthly withholding tax return',
                category: 'bir',
                frequency: 'monthly',
                dueDate: '10th of following month'
              }
            ],
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: definitions, definition, report, recent, templates, or bir_forms' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in reports GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role for report generation
    const userRole = session.user.role
    if (!['ADMIN', 'MANAGER', 'CSR'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, data } = body

    const reportGenerator = ReportGenerator.getInstance()

    switch (action) {
      case 'generate':
        const { definitionId, parameters, format } = data
        
        if (!definitionId || !format) {
          return NextResponse.json(
            { error: 'definitionId and format are required' },
            { status: 400 }
          )
        }

        const validFormats = ['pdf', 'excel', 'csv', 'json']
        if (!validFormats.includes(format)) {
          return NextResponse.json(
            { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
            { status: 400 }
          )
        }

        const generatedReport = await reportGenerator.generateReport(
          definitionId,
          parameters || {},
          format,
          session.user.id
        )

        return NextResponse.json({
          success: generatedReport.status === 'completed',
          data: {
            report: generatedReport,
            message: generatedReport.status === 'completed' ? 
              'Report generated successfully' : 
              `Report generation ${generatedReport.status}: ${generatedReport.error || ''}`
          },
          timestamp: new Date().toISOString()
        })

      case 'create_custom':
        const { name, description, template, parameters: customParams } = data
        
        if (!name || !description || !template) {
          return NextResponse.json(
            { error: 'name, description, and template are required' },
            { status: 400 }
          )
        }

        const customReportId = await reportGenerator.createCustomReport(
          name,
          description,
          template,
          customParams || [],
          session.user.id
        )

        return NextResponse.json({
          success: true,
          data: {
            reportId: customReportId,
            name,
            description,
            createdBy: session.user.id,
            message: 'Custom report created successfully'
          },
          timestamp: new Date().toISOString()
        })

      case 'schedule':
        const { definitionId: scheduleDefId, parameters: scheduleParams, schedule } = data
        
        if (!scheduleDefId || !schedule) {
          return NextResponse.json(
            { error: 'definitionId and schedule are required' },
            { status: 400 }
          )
        }

        const validFrequencies = ['daily', 'weekly', 'monthly']
        if (!schedule.frequency || !validFrequencies.includes(schedule.frequency)) {
          return NextResponse.json(
            { error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
            { status: 400 }
          )
        }

        if (!schedule.time || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
          return NextResponse.json(
            { error: 'Invalid time format. Use HH:MM format' },
            { status: 400 }
          )
        }

        const scheduleId = await reportGenerator.scheduleReport(
          scheduleDefId,
          scheduleParams || {},
          schedule,
          session.user.id
        )

        return NextResponse.json({
          success: true,
          data: {
            scheduleId,
            definitionId: scheduleDefId,
            schedule,
            createdBy: session.user.id,
            message: 'Report scheduled successfully'
          },
          timestamp: new Date().toISOString()
        })

      case 'generate_bir_vat':
        const { month: vatMonth } = data
        
        if (!vatMonth) {
          return NextResponse.json(
            { error: 'month is required for BIR VAT return' },
            { status: 400 }
          )
        }

        const vatReport = await reportGenerator.generateBIRVATReturn(
          new Date(vatMonth),
          session.user.id
        )

        return NextResponse.json({
          success: vatReport.status === 'completed',
          data: {
            report: vatReport,
            form: 'BIR Form 2550M - Monthly VAT Return',
            message: vatReport.status === 'completed' ? 
              'BIR VAT return generated successfully' : 
              `BIR VAT return generation ${vatReport.status}: ${vatReport.error || ''}`
          },
          timestamp: new Date().toISOString()
        })

      case 'generate_bir_withholding':
        const { month: whMonth } = data
        
        if (!whMonth) {
          return NextResponse.json(
            { error: 'month is required for BIR withholding tax return' },
            { status: 400 }
          )
        }

        const whReport = await reportGenerator.generateBIRWithholdingTax(
          new Date(whMonth),
          session.user.id
        )

        return NextResponse.json({
          success: whReport.status === 'completed',
          data: {
            report: whReport,
            form: 'BIR Form 2307 - Withholding Tax Certificate',
            message: whReport.status === 'completed' ? 
              'BIR withholding tax report generated successfully' : 
              `BIR withholding tax generation ${whReport.status}: ${whReport.error || ''}`
          },
          timestamp: new Date().toISOString()
        })

      case 'bulk_generate':
        const { reportRequests } = data
        
        if (!reportRequests || !Array.isArray(reportRequests)) {
          return NextResponse.json(
            { error: 'reportRequests array is required' },
            { status: 400 }
          )
        }

        // Generate multiple reports
        const bulkResults = []
        
        for (const request of reportRequests) {
          try {
            const bulkReport = await reportGenerator.generateReport(
              request.definitionId,
              request.parameters || {},
              request.format,
              session.user.id
            )
            
            bulkResults.push({
              definitionId: request.definitionId,
              status: bulkReport.status,
              reportId: bulkReport.id,
              error: bulkReport.error
            })
          } catch (error) {
            bulkResults.push({
              definitionId: request.definitionId,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        const successCount = bulkResults.filter(r => r.status === 'completed').length
        const failCount = bulkResults.filter(r => r.status === 'failed').length

        return NextResponse.json({
          success: successCount > 0,
          data: {
            results: bulkResults,
            summary: {
              total: bulkResults.length,
              successful: successCount,
              failed: failCount
            },
            message: `Bulk generation completed: ${successCount} successful, ${failCount} failed`
          },
          timestamp: new Date().toISOString()
        })

      case 'export_definition':
        const { definitionId: exportDefId } = data
        
        if (!exportDefId) {
          return NextResponse.json(
            { error: 'definitionId is required' },
            { status: 400 }
          )
        }

        const exportDefinition = await reportGenerator.getReportDefinition(exportDefId)
        if (!exportDefinition) {
          return NextResponse.json(
            { error: 'Report definition not found' },
            { status: 404 }
          )
        }

        // Create exportable JSON
        const exportData = {
          definition: exportDefinition,
          exportedBy: session.user.id,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        }

        return NextResponse.json({
          success: true,
          data: {
            export: exportData,
            filename: `report_definition_${exportDefId}.json`,
            message: 'Report definition exported successfully'
          },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in reports POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}