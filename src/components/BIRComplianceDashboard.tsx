// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Calculator,
  TrendingUp,
  DollarSign,
  Receipt,
  Clock,
  Shield,
  Eye,
  RefreshCw
} from 'lucide-react'

interface ComplianceWarning {
  type: 'WARNING' | 'ERROR' | 'INFO'
  message: string
  dueDate?: string
  form?: string
}

interface BIRReport {
  reportType: string
  period: string
  generatedAt: string
  data: any
}

export function BIRComplianceDashboard() {
  const [warnings, setWarnings] = useState<ComplianceWarning[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedReport, setSelectedReport] = useState('VAT')
  const [selectedPeriod, setSelectedPeriod] = useState('MONTHLY')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    year: new Date().getFullYear()
  })
  const [lastReport, setLastReport] = useState<BIRReport | null>(null)

  useEffect(() => {
    fetchComplianceWarnings()
  }, [])

  const fetchComplianceWarnings = async () => {
    try {
      const response = await fetch('/api/reports/bir?action=compliance-check')
      const data = await response.json()
      
      if (data.success) {
        setWarnings(data.warnings || [])
      }
    } catch (error) {
      console.error('Failed to fetch compliance warnings:', error)
    }
  }

  const generateReport = async (exportFormat: 'JSON' | 'EXCEL' = 'JSON') => {
    setIsGenerating(true)
    
    try {
      const requestBody = {
        reportType: selectedReport,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: selectedPeriod,
        exportFormat
      }

      const response = await fetch('/api/reports/bir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (exportFormat === 'EXCEL') {
        // Handle file download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedReport}_${dateRange.startDate}_${dateRange.endDate}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setLastReport(data)
        alert(`${selectedReport} report generated successfully!`)
      } else {
        alert(`Report generation failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateBIRForm = async (formType: '2550M' | '1601C') => {
    setIsGenerating(true)
    
    try {
      const requestBody = {
        formType,
        month: formType === '1601C' ? formData.month : undefined,
        quarter: formType === '2550M' ? formData.quarter : undefined,
        year: formData.year
      }

      const response = await fetch('/api/reports/bir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.success) {
        setLastReport(data)
        alert(`BIR Form ${formType} generated successfully!`)
      } else {
        alert(`Form generation failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Form generation error:', error)
      alert('Failed to generate BIR form. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'WARNING':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />
    }
  }

  const getWarningColor = (type: string) => {
    switch (type) {
      case 'ERROR':
        return 'border-red-200 bg-red-50'
      case 'WARNING':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  const reportTypes = [
    { value: 'VAT', label: 'VAT Report', icon: Calculator },
    { value: 'WHT', label: 'Withholding Tax', icon: Receipt },
    { value: 'INCOME_STATEMENT', label: 'Income Statement', icon: TrendingUp },
    { value: 'CASH_FLOW', label: 'Cash Flow', icon: DollarSign },
    { value: 'BALANCE_SHEET', label: 'Balance Sheet', icon: FileText }
  ]

  const quickPeriods = [
    { 
      label: 'Current Month', 
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    {
      label: 'Last Month',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
      endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
    },
    {
      label: 'Current Quarter',
      startDate: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    {
      label: 'Current Year',
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-green-600" />
          BIR Compliance Center
        </h1>
        <Button onClick={fetchComplianceWarnings} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Compliance Warnings */}
      {warnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Compliance Alerts ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getWarningColor(warning.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getWarningIcon(warning.type)}
                    <div className="flex-1">
                      <p className="font-medium">{warning.message}</p>
                      {warning.dueDate && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(warning.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {warning.form && (
                        <Badge className="mt-2" variant="outline">
                          Form {warning.form}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BIR Forms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              BIR Forms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('en', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quarter
                </label>
                <select
                  value={formData.quarter}
                  onChange={(e) => setFormData(prev => ({ ...prev, quarter: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  min="2020"
                  max="2030"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => generateBIRForm('2550M')}
                disabled={isGenerating}
                className="flex-1"
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Form 2550M (VAT)
              </Button>
              <Button
                onClick={() => generateBIRForm('1601C')}
                disabled={isGenerating}
                className="flex-1"
                variant="outline"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Form 1601C (WHT)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Financial Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {reportTypes.slice(0, 4).map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedReport(type.value)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      selectedReport === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <type.icon className="w-4 h-4 mb-1" />
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Periods
              </label>
              <div className="grid grid-cols-2 gap-2">
                {quickPeriods.map((period) => (
                  <Button
                    key={period.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      startDate: period.startDate,
                      endDate: period.endDate
                    })}
                    className="text-xs"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => generateReport('JSON')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Report
              </Button>
              <Button
                onClick={() => generateReport('EXCEL')}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Generated Report */}
      {lastReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Last Generated Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {lastReport.reportType} - {lastReport.data.period || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Generated: {new Date(lastReport.generatedAt).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>

              {/* Report Summary */}
              {lastReport.reportType === 'VAT' && lastReport.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Sales</p>
                    <p className="font-semibold">₱{lastReport.data.totalSales?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Output VAT</p>
                    <p className="font-semibold">₱{lastReport.data.outputVAT?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Input VAT</p>
                    <p className="font-semibold">₱{lastReport.data.inputVAT?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net VAT</p>
                    <p className="font-semibold">₱{lastReport.data.netVAT?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              )}

              {lastReport.reportType === 'INCOME_STATEMENT' && lastReport.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Revenue</p>
                    <p className="font-semibold">₱{lastReport.data.revenue?.totalRevenue?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Expenses</p>
                    <p className="font-semibold">₱{lastReport.data.expenses?.totalExpenses?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Gross Profit</p>
                    <p className="font-semibold">₱{lastReport.data.grossProfit?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net Income</p>
                    <p className={`font-semibold ${(lastReport.data.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₱{lastReport.data.netIncome?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              )}

              {lastReport.formType && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Form Type</p>
                    <p className="font-semibold">{lastReport.formType}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Period</p>
                    <p className="font-semibold">
                      {lastReport.data.month ? `Month ${lastReport.data.month}` : `Q${formData.quarter}`} {lastReport.data.year}
                    </p>
                  </div>
                  {lastReport.data.netVATPayable && (
                    <div>
                      <p className="text-gray-600">VAT Payable</p>
                      <p className="font-semibold">₱{lastReport.data.netVATPayable.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}