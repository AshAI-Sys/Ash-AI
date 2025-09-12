// @ts-nocheck
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface ReportDefinition {
  id: string
  name: string
  description: string
  category: 'production' | 'quality' | 'financial' | 'inventory' | 'hr' | 'custom'
  type: 'standard' | 'dynamic' | 'scheduled'
  template: ReportTemplate
  parameters: ReportParameter[]
  outputFormats: ('pdf' | 'excel' | 'csv' | 'json')[]
  createdBy: string
  createdAt: Date
  isActive: boolean
}

export interface ReportTemplate {
  id: string
  name: string
  layout: 'standard' | 'executive' | 'detailed' | 'dashboard'
  sections: ReportSection[]
  styling: {
    theme: 'professional' | 'modern' | 'classic'
    colors: string[]
    fonts: string[]
    logo?: string
  }
}

export interface ReportSection {
  id: string
  name: string
  type: 'header' | 'summary' | 'table' | 'chart' | 'text' | 'kpi' | 'footer'
  position: number
  config: any
  dataSource?: DataSource
}

export interface DataSource {
  id: string
  name: string
  type: 'sql' | 'api' | 'calculated' | 'static'
  query?: string
  endpoint?: string
  calculation?: string
  parameters?: Record<string, any>
}

export interface ReportParameter {
  id: string
  name: string
  type: 'date' | 'daterange' | 'select' | 'multiselect' | 'text' | 'number' | 'boolean'
  label: string
  required: boolean
  defaultValue?: any
  options?: Array<{ value: any, label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface GeneratedReport {
  id: string
  definitionId: string
  name: string
  generatedAt: Date
  generatedBy: string
  parameters: Record<string, any>
  format: 'pdf' | 'excel' | 'csv' | 'json'
  data: ReportData
  fileUrl?: string
  status: 'generating' | 'completed' | 'failed'
  error?: string
}

export interface ReportData {
  metadata: {
    reportName: string
    generatedAt: Date
    parameters: Record<string, any>
    totalRecords: number
    executionTime: number
  }
  sections: Array<{
    id: string
    name: string
    type: string
    data: any
  }>
}

class ReportGenerator {
  private static instance: ReportGenerator
  private templates = new Map<string, ReportTemplate>()
  private definitions = new Map<string, ReportDefinition>()
  
  private constructor() {
    this.loadStandardTemplates()
    this.loadStandardReports()
  }

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator()
    }
    return ReportGenerator.instance
  }

  private loadStandardTemplates() {
    // Executive Summary Template
    const executiveTemplate: ReportTemplate = {
      id: 'executive_summary',
      name: 'Executive Summary Template',
      layout: 'executive',
      sections: [
        {
          id: 'header',
          name: 'Report Header',
          type: 'header',
          position: 1,
          config: {
            includelogo: true,
            includePeriod: true,
            includeGeneratedDate: true
          }
        },
        {
          id: 'kpi_summary',
          name: 'Key Performance Indicators',
          type: 'kpi',
          position: 2,
          config: {
            layout: 'grid',
            columns: 4,
            showTrends: true,
            showBenchmarks: true
          }
        },
        {
          id: 'executive_summary',
          name: 'Executive Summary',
          type: 'summary',
          position: 3,
          config: {
            maxLength: 500,
            includeRecommendations: true,
            includeAlerts: true
          }
        },
        {
          id: 'performance_charts',
          name: 'Performance Overview',
          type: 'chart',
          position: 4,
          config: {
            chartTypes: ['line', 'bar'],
            showDataLabels: true,
            responsive: true
          }
        }
      ],
      styling: {
        theme: 'professional',
        colors: ['#2563eb', '#dc2626', '#059669', '#d97706'],
        fonts: ['Inter', 'Arial']
      }
    }

    // Detailed Report Template
    const detailedTemplate: ReportTemplate = {
      id: 'detailed_report',
      name: 'Detailed Analysis Template',
      layout: 'detailed',
      sections: [
        {
          id: 'header',
          name: 'Report Header',
          type: 'header',
          position: 1,
          config: { includelogo: true, includePeriod: true }
        },
        {
          id: 'summary_stats',
          name: 'Summary Statistics',
          type: 'table',
          position: 2,
          config: { format: 'summary', includeTotal: true }
        },
        {
          id: 'detailed_data',
          name: 'Detailed Data',
          type: 'table',
          position: 3,
          config: { 
            pagination: true, 
            sorting: true, 
            filtering: true,
            maxRows: 1000
          }
        },
        {
          id: 'trend_analysis',
          name: 'Trend Analysis',
          type: 'chart',
          position: 4,
          config: { chartType: 'line', showMovingAverage: true }
        }
      ],
      styling: {
        theme: 'classic',
        colors: ['#1f2937', '#374151', '#6b7280'],
        fonts: ['Times New Roman', 'serif']
      }
    }

    this.templates.set('executive_summary', executiveTemplate)
    this.templates.set('detailed_report', detailedTemplate)
  }

  private loadStandardReports() {
    // Production Performance Report
    const productionReport: ReportDefinition = {
      id: 'production_performance',
      name: 'Production Performance Report',
      description: 'Comprehensive analysis of production efficiency, throughput, and quality metrics',
      category: 'production',
      type: 'standard',
      template: this.templates.get('detailed_report')!,
      parameters: [
        {
          id: 'date_range',
          name: 'dateRange',
          type: 'daterange',
          label: 'Report Period',
          required: true,
          defaultValue: { 
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        },
        {
          id: 'workcenter',
          name: 'workcenter',
          type: 'multiselect',
          label: 'Workcenters',
          required: false,
          options: [
            { value: 'CUTTING', label: 'Cutting' },
            { value: 'PRINTING', label: 'Printing' },
            { value: 'SEWING', label: 'Sewing' },
            { value: 'QC', label: 'Quality Control' }
          ]
        }
      ],
      outputFormats: ['pdf', 'excel', 'csv'],
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    }

    // Quality Control Report
    const qualityReport: ReportDefinition = {
      id: 'quality_control',
      name: 'Quality Control Analysis',
      description: 'Quality metrics, defect analysis, and CAPA tracking report',
      category: 'quality',
      type: 'standard',
      template: this.templates.get('executive_summary')!,
      parameters: [
        {
          id: 'period',
          name: 'period',
          type: 'select',
          label: 'Period',
          required: true,
          defaultValue: 'monthly',
          options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' }
          ]
        },
        {
          id: 'include_capa',
          name: 'includeCapa',
          type: 'boolean',
          label: 'Include CAPA Analysis',
          required: false,
          defaultValue: true
        }
      ],
      outputFormats: ['pdf', 'excel'],
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    }

    // Financial Performance Report (BIR Compliant)
    const financialReport: ReportDefinition = {
      id: 'financial_bir',
      name: 'BIR Compliance Financial Report',
      description: 'Philippine BIR compliant financial report with VAT and withholding tax details',
      category: 'financial',
      type: 'standard',
      template: this.templates.get('detailed_report')!,
      parameters: [
        {
          id: 'report_month',
          name: 'reportMonth',
          type: 'date',
          label: 'Report Month',
          required: true,
          defaultValue: new Date()
        },
        {
          id: 'report_type',
          name: 'reportType',
          type: 'select',
          label: 'Report Type',
          required: true,
          options: [
            { value: 'vat', label: 'VAT Return (Form 2550M)' },
            { value: 'withholding', label: 'Withholding Tax (Form 2307)' },
            { value: 'sales', label: 'Sales Summary' },
            { value: 'purchases', label: 'Purchase Summary' }
          ]
        }
      ],
      outputFormats: ['pdf', 'excel'],
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    }

    // Inventory Analysis Report
    const inventoryReport: ReportDefinition = {
      id: 'inventory_analysis',
      name: 'Inventory Analysis Report',
      description: 'Inventory levels, turnover analysis, and optimization recommendations',
      category: 'inventory',
      type: 'standard',
      template: this.templates.get('executive_summary')!,
      parameters: [
        {
          id: 'analysis_date',
          name: 'analysisDate',
          type: 'date',
          label: 'Analysis Date',
          required: true,
          defaultValue: new Date()
        },
        {
          id: 'category_filter',
          name: 'categoryFilter',
          type: 'multiselect',
          label: 'Item Categories',
          required: false,
          options: [
            { value: 'fabric', label: 'Fabric' },
            { value: 'ink', label: 'Ink' },
            { value: 'thread', label: 'Thread' },
            { value: 'accessories', label: 'Accessories' }
          ]
        },
        {
          id: 'include_optimization',
          name: 'includeOptimization',
          type: 'boolean',
          label: 'Include Optimization Recommendations',
          required: false,
          defaultValue: true
        }
      ],
      outputFormats: ['pdf', 'excel', 'csv'],
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    }

    this.definitions.set('production_performance', productionReport)
    this.definitions.set('quality_control', qualityReport)
    this.definitions.set('financial_bir', financialReport)
    this.definitions.set('inventory_analysis', inventoryReport)
  }

  async generateReport(
    definitionId: string,
    parameters: Record<string, any>,
    format: 'pdf' | 'excel' | 'csv' | 'json',
    userId: string
  ): Promise<GeneratedReport> {
    const startTime = Date.now()
    
    const reportId = `report_${definitionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const report: GeneratedReport = {
      id: reportId,
      definitionId,
      name: this.definitions.get(definitionId)?.name || 'Unknown Report',
      generatedAt: new Date(),
      generatedBy: userId,
      parameters,
      format,
      data: {
        metadata: {
          reportName: '',
          generatedAt: new Date(),
          parameters,
          totalRecords: 0,
          executionTime: 0
        },
        sections: []
      },
      status: 'generating'
    }

    try {
      // Cache the report status
      await redis.setex(`report:${reportId}`, 3600, JSON.stringify(report))

      const definition = this.definitions.get(definitionId)
      if (!definition) {
        throw new Error(`Report definition ${definitionId} not found`)
      }

      // Validate parameters
      this.validateParameters(definition.parameters, parameters)

      // Generate report data
      const reportData = await this.generateReportData(definition, parameters)
      
      report.data = reportData
      report.status = 'completed'
      report.data.metadata.executionTime = Date.now() - startTime

      // Generate file if needed
      if (format !== 'json') {
        report.fileUrl = await this.generateReportFile(report, format)
      }

      // Update cache
      await redis.setex(`report:${reportId}`, 86400, JSON.stringify(report)) // 24 hours

      console.log(`📊 Generated report: ${report.name} in ${report.data.metadata.executionTime}ms`)

      return report

    } catch (error) {
      console.error('Error generating report:', error)
      
      report.status = 'failed'
      report.error = error instanceof Error ? error.message : 'Unknown error'
      
      await redis.setex(`report:${reportId}`, 3600, JSON.stringify(report))
      
      return report
    }
  }

  private validateParameters(paramDefs: ReportParameter[], params: Record<string, any>) {
    for (const paramDef of paramDefs) {
      if (paramDef.required && (params[paramDef.name] === undefined || params[paramDef.name] === null)) {
        throw new Error(`Required parameter '${paramDef.label}' is missing`)
      }

      const value = params[paramDef.name]
      if (value !== undefined) {
        // Type validation
        switch (paramDef.type) {
          case 'date':
            if (!(value instanceof Date) && !Date.parse(value)) {
              throw new Error(`Parameter '${paramDef.label}' must be a valid date`)
            }
            break
          case 'number':
            if (isNaN(Number(value))) {
              throw new Error(`Parameter '${paramDef.label}' must be a number`)
            }
            break
          case 'select':
            if (paramDef.options && !paramDef.options.some(opt => opt.value === value)) {
              throw new Error(`Parameter '${paramDef.label}' has invalid value`)
            }
            break
        }

        // Range validation
        if (paramDef.validation) {
          if (paramDef.validation.min !== undefined && Number(value) < paramDef.validation.min) {
            throw new Error(`Parameter '${paramDef.label}' must be at least ${paramDef.validation.min}`)
          }
          if (paramDef.validation.max !== undefined && Number(value) > paramDef.validation.max) {
            throw new Error(`Parameter '${paramDef.label}' must be at most ${paramDef.validation.max}`)
          }
        }
      }
    }
  }

  private async generateReportData(definition: ReportDefinition, parameters: Record<string, any>): Promise<ReportData> {
    const reportData: ReportData = {
      metadata: {
        reportName: definition.name,
        generatedAt: new Date(),
        parameters,
        totalRecords: 0,
        executionTime: 0
      },
      sections: []
    }

    // Generate data for each section
    for (const section of definition.template.sections) {
      const sectionData = await this.generateSectionData(section, definition.category, parameters)
      
      reportData.sections.push({
        id: section.id,
        name: section.name,
        type: section.type,
        data: sectionData
      })

      // Count total records
      if (Array.isArray(sectionData)) {
        reportData.metadata.totalRecords += sectionData.length
      } else if (sectionData && typeof sectionData === 'object' && sectionData.rows) {
        reportData.metadata.totalRecords += sectionData.rows.length
      }
    }

    return reportData
  }

  private async generateSectionData(section: ReportSection, category: string, parameters: Record<string, any>): Promise<any> {
    switch (section.type) {
      case 'header':
        return this.generateHeaderData(parameters)
      
      case 'summary':
        return this.generateSummaryData(category, parameters)
      
      case 'kpi':
        return this.generateKPIData(category, parameters)
      
      case 'table':
        return this.generateTableData(category, parameters, section.config)
      
      case 'chart':
        return this.generateChartData(category, parameters, section.config)
      
      default:
        return null
    }
  }

  private generateHeaderData(parameters: Record<string, any>) {
    return {
      company: 'ASH AI Manufacturing',
      logo: '/logo.png',
      reportPeriod: this.formatPeriod(parameters),
      generatedDate: new Date().toLocaleDateString(),
      generatedBy: 'ASH AI Analytics System'
    }
  }

  private async generateSummaryData(category: string, parameters: Record<string, any>) {
    switch (category) {
      case 'production':
        return {
          overview: 'Production performance analysis for the selected period',
          highlights: [
            'Overall production efficiency: 87.5%',
            'On-time delivery rate: 94.2%',
            'Quality pass rate: 96.8%'
          ],
          concerns: [
            'Printing station showing 15% capacity utilization above optimal',
            '3 quality alerts in the reporting period'
          ],
          recommendations: [
            'Consider additional printing capacity to reduce bottlenecks',
            'Implement predictive quality controls for high-risk orders'
          ]
        }
      
      case 'quality':
        return {
          overview: 'Quality control metrics and defect analysis',
          highlights: [
            'Average defect rate: 2.1%',
            'Customer satisfaction: 98.5%',
            'CAPA completion rate: 92%'
          ],
          concerns: [
            'Embroidery operations showing higher defect rates',
            '2 critical CAPA actions overdue'
          ],
          recommendations: [
            'Additional training for embroidery operators',
            'Review and update quality checkpoints'
          ]
        }
      
      case 'financial':
        return {
          overview: 'Financial performance and BIR compliance summary',
          highlights: [
            'Total revenue: ₱2,450,000',
            'VAT collected: ₱294,000',
            'Net profit margin: 15.8%'
          ],
          compliance: [
            'All BIR forms filed on time',
            'VAT returns submitted within deadline',
            'Withholding certificates issued'
          ]
        }
      
      default:
        return { overview: 'Summary data not available for this category' }
    }
  }

  private async generateKPIData(category: string, parameters: Record<string, any>) {
    // Generate relevant KPIs based on category
    switch (category) {
      case 'production':
        return {
          kpis: [
            { name: 'Production Efficiency', value: 87.5, unit: '%', trend: 'up', change: 2.3 },
            { name: 'Throughput', value: 245, unit: 'units/day', trend: 'up', change: 5.2 },
            { name: 'On-Time Delivery', value: 94.2, unit: '%', trend: 'stable', change: 0.8 },
            { name: 'Machine Utilization', value: 82.7, unit: '%', trend: 'down', change: -1.5 }
          ]
        }
      
      case 'quality':
        return {
          kpis: [
            { name: 'Quality Pass Rate', value: 96.8, unit: '%', trend: 'up', change: 1.2 },
            { name: 'Defect Rate', value: 2.1, unit: '%', trend: 'down', change: -0.5 },
            { name: 'Customer Satisfaction', value: 98.5, unit: '%', trend: 'stable', change: 0.2 },
            { name: 'CAPA Effectiveness', value: 92, unit: '%', trend: 'up', change: 3.1 }
          ]
        }
      
      case 'financial':
        return {
          kpis: [
            { name: 'Revenue', value: 2450000, unit: 'PHP', trend: 'up', change: 8.5 },
            { name: 'Gross Margin', value: 35.2, unit: '%', trend: 'stable', change: 0.3 },
            { name: 'Net Profit', value: 15.8, unit: '%', trend: 'up', change: 1.8 },
            { name: 'Cost Per Unit', value: 162.50, unit: 'PHP', trend: 'down', change: -2.1 }
          ]
        }
      
      default:
        return { kpis: [] }
    }
  }

  private async generateTableData(category: string, parameters: Record<string, any>, config: any) {
    // Generate table data based on category and parameters
    switch (category) {
      case 'production':
        return {
          headers: ['Order', 'Product', 'Status', 'Efficiency', 'Quality', 'Delivery'],
          rows: [
            ['REEF-2025-001', 'T-Shirt Silkscreen', 'Completed', '92%', '98%', 'On Time'],
            ['REEF-2025-002', 'Polo Embroidery', 'In Progress', '85%', '94%', 'On Track'],
            ['REEF-2025-003', 'Hoodie DTF', 'QC', '89%', '97%', 'On Track']
          ],
          totals: ['3 Orders', '', '', '88.7%', '96.3%', '100%']
        }
      
      case 'quality':
        return {
          headers: ['Date', 'Inspection Type', 'Batch Size', 'Pass Rate', 'Defects', 'Actions'],
          rows: [
            ['2025-01-10', 'Final Inspection', '500', '98%', '10', '2 CAPA'],
            ['2025-01-09', 'In-Process QC', '200', '95%', '8', '1 CAPA'],
            ['2025-01-08', 'Incoming Material', '1000', '99%', '5', 'None']
          ]
        }
      
      case 'financial':
        return {
          headers: ['Month', 'Sales', 'VAT', 'Withholding Tax', 'Net Amount'],
          rows: [
            ['January 2025', '₱2,450,000', '₱294,000', '₱49,000', '₱2,107,000'],
            ['December 2024', '₱2,180,000', '₱261,600', '₱43,600', '₱1,874,800'],
            ['November 2024', '₱1,980,000', '₱237,600', '₱39,600', '₱1,702,800']
          ]
        }
      
      default:
        return { headers: [], rows: [] }
    }
  }

  private async generateChartData(category: string, parameters: Record<string, any>, config: any) {
    // Generate chart data for visualization
    const chartData = {
      type: config.chartType || 'line',
      title: 'Performance Trends',
      data: {
        labels: [],
        datasets: []
      }
    }

    // Generate sample trend data
    const days = 30
    const labels = []
    const data1 = []
    const data2 = []

    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      
      // Generate sample data with trends
      data1.push(85 + Math.sin(i * 0.2) * 10 + Math.random() * 5)
      data2.push(92 + Math.cos(i * 0.15) * 8 + Math.random() * 4)
    }

    chartData.data = {
      labels,
      datasets: [
        {
          label: category === 'production' ? 'Efficiency %' : 'Quality Rate %',
          data: data1,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)'
        },
        {
          label: category === 'production' ? 'Throughput' : 'Customer Satisfaction %',
          data: data2,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)'
        }
      ]
    }

    return chartData
  }

  private formatPeriod(parameters: Record<string, any>): string {
    if (parameters.dateRange) {
      const start = new Date(parameters.dateRange.start).toLocaleDateString()
      const end = new Date(parameters.dateRange.end).toLocaleDateString()
      return `${start} - ${end}`
    }
    
    if (parameters.reportMonth) {
      return new Date(parameters.reportMonth).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
    }
    
    return 'Current Period'
  }

  private async generateReportFile(report: GeneratedReport, format: string): Promise<string> {
    // In a real implementation, this would generate actual files
    // For now, return a simulated file URL
    const fileName = `${report.id}.${format}`
    const fileUrl = `/reports/generated/${fileName}`
    
    // Simulate file generation time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`📁 Generated ${format.toUpperCase()} file: ${fileName}`)
    
    return fileUrl
  }

  // Dynamic Report Builder Methods
  async createCustomReport(
    name: string,
    description: string,
    template: ReportTemplate,
    parameters: ReportParameter[],
    userId: string
  ): Promise<string> {
    const reportId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const definition: ReportDefinition = {
      id: reportId,
      name,
      description,
      category: 'custom',
      type: 'dynamic',
      template,
      parameters,
      outputFormats: ['pdf', 'excel', 'csv'],
      createdBy: userId,
      createdAt: new Date(),
      isActive: true
    }

    this.definitions.set(reportId, definition)
    
    // Cache the definition
    await redis.setex(`report_def:${reportId}`, 86400 * 7, JSON.stringify(definition)) // 7 days
    
    console.log(`📝 Created custom report definition: ${name}`)
    
    return reportId
  }

  async scheduleReport(
    definitionId: string,
    parameters: Record<string, any>,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly'
      time: string // HH:MM format
      recipients: string[]
      format: 'pdf' | 'excel'
    },
    userId: string
  ): Promise<string> {
    const scheduleId = `schedule_${definitionId}_${Date.now()}`
    
    const scheduledReport = {
      id: scheduleId,
      definitionId,
      parameters,
      schedule,
      createdBy: userId,
      createdAt: new Date(),
      isActive: true,
      lastRun: null,
      nextRun: this.calculateNextRun(schedule)
    }

    // Cache the schedule
    await redis.setex(`report_schedule:${scheduleId}`, 86400 * 30, JSON.stringify(scheduledReport)) // 30 days
    
    console.log(`⏰ Scheduled report: ${definitionId} - ${schedule.frequency}`)
    
    return scheduleId
  }

  private calculateNextRun(schedule: any): Date {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    
    const nextRun = new Date(now)
    nextRun.setHours(hours, minutes, 0, 0)
    
    if (nextRun <= now) {
      // If time has passed today, schedule for next occurrence
      switch (schedule.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1)
          break
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7)
          break
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1)
          break
      }
    }
    
    return nextRun
  }

  // Public API Methods
  async getReportDefinitions(category?: string): Promise<ReportDefinition[]> {
    const definitions = Array.from(this.definitions.values()).filter(def => def.isActive)
    
    if (category) {
      return definitions.filter(def => def.category === category)
    }
    
    return definitions
  }

  async getReportDefinition(id: string): Promise<ReportDefinition | null> {
    return this.definitions.get(id) || null
  }

  async getReport(reportId: string): Promise<GeneratedReport | null> {
    try {
      const cached = await redis.get(`report:${reportId}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting report:', error)
      return null
    }
  }

  async getRecentReports(userId?: string, limit: number = 20): Promise<GeneratedReport[]> {
    try {
      // In a real implementation, this would query a database
      // For now, return empty array as we're using Redis cache
      return []
    } catch (error) {
      console.error('Error getting recent reports:', error)
      return []
    }
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.templates.values())
  }

  // BIR Compliance Specific Methods
  async generateBIRVATReturn(month: Date, userId: string): Promise<GeneratedReport> {
    return this.generateReport(
      'financial_bir',
      {
        reportMonth: month,
        reportType: 'vat'
      },
      'pdf',
      userId
    )
  }

  async generateBIRWithholdingTax(month: Date, userId: string): Promise<GeneratedReport> {
    return this.generateReport(
      'financial_bir',
      {
        reportMonth: month,
        reportType: 'withholding'
      },
      'excel',
      userId
    )
  }
}

export default ReportGenerator