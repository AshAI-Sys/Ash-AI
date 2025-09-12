// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Zap
} from 'lucide-react'
import { Role } from '@prisma/client'

interface Alert {
  id: string
  severity: 'P1' | 'P2' | 'P3'
  category: string
  title: string
  summary: string
  recommendation?: string
  actions?: Record<string, unknown>
  status: 'OPEN' | 'ACK' | 'RESOLVED' | 'IGNORED'
  created_at: string
}

interface BusinessMetrics {
  orders: {
    total: number
    pending: number
    inProgress: number
    completed: number
    overdue: number
  }
  production: {
    efficiency: number
    throughput: number
    qualityRate: number
  }
  finance: {
    revenue: number
    margin: number
    costs: number
  }
  inventory: {
    totalItems: number
    lowStock: number
    overstock: number
  }
}

interface AshleyInsight {
  id: string
  type: 'forecast' | 'recommendation' | 'warning' | 'opportunity'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  actions?: { label: string; endpoint: string }[]
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'P1': return 'bg-red-100 text-red-800 border-red-300'
    case 'P2': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'P3': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'forecast': return <TrendingUp className="w-5 h-5 text-blue-500" />
    case 'recommendation': return <Zap className="w-5 h-5 text-green-500" />
    case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />
    case 'opportunity': return <TrendingUp className="w-5 h-5 text-purple-500" />
    default: return <Brain className="w-5 h-5 text-gray-500" />
  }
}

export default function AshleyDashboard() {
  const { data: session } = useSession()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null)
  const [insights, setInsights] = useState<AshleyInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<string>('7d')

  useEffect(() => {
    fetchDashboardData()
  }, [selectedBrand, timeframe])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [alertsRes, metricsRes, insightsRes] = await Promise.all([
        fetch('/api/ai/alerts?status=OPEN&limit=10'),
        fetch(`/api/analytics/business?brand=${selectedBrand}&timeframe=${timeframe}`),
        fetch('/api/ai/ashley/insights')
      ])

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.alerts || [])
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        setInsights(insightsData.insights || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'ignore') => {
    try {
      const response = await fetch('/api/ai/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alertId })
      })

      if (response.ok) {
        await fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error handling alert:', error)
    }
  }

  const generateWeeklyReport = async () => {
    try {
      const response = await fetch('/api/ai/ashley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateWeeklyReport',
          data: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date()
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Weekly report generated:', result)
        // Handle report display/download
      }
    } catch (error) {
      console.error('Error generating report:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading Ashley AI Dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ashley AI Dashboard</h1>
            <p className="text-gray-600">AI-powered business intelligence and insights</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={generateWeeklyReport} className="bg-blue-600 hover:bg-blue-700">
            <Calendar className="w-4 h-4 mr-2" />
            Weekly Report
          </Button>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Orders</p>
                  <p className="text-3xl font-bold">{metrics.orders.total}</p>
                  <p className="text-sm text-blue-100">
                    {metrics.orders.inProgress} in progress
                  </p>
                </div>
                <Package className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Revenue</p>
                  <p className="text-3xl font-bold">${metrics.finance.revenue.toLocaleString()}</p>
                  <p className="text-sm text-green-100">
                    {metrics.finance.margin}% margin
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Efficiency</p>
                  <p className="text-3xl font-bold">{metrics.production.efficiency}%</p>
                  <p className="text-sm text-purple-100">
                    Quality: {metrics.production.qualityRate}%
                  </p>
                </div>
                <BarChart3 className="w-12 h-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Alerts</p>
                  <p className="text-3xl font-bold">{alerts.length}</p>
                  <p className="text-sm text-orange-100">
                    {alerts.filter(a => a.severity === 'P1').length} critical
                  </p>
                </div>
                <AlertTriangle className="w-12 h-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ashley AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            Ashley's AI Insights
          </CardTitle>
          <CardDescription>
            AI-generated recommendations and forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No AI insights available at the moment.</p>
              </div>
            ) : (
              insights.map((insight) => (
                <div key={insight.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getInsightIcon(insight.type)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        insight.impact === 'high' ? 'border-red-300 text-red-700' :
                        insight.impact === 'medium' ? 'border-orange-300 text-orange-700' :
                        'border-green-300 text-green-700'
                      }>
                        {insight.impact} impact
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  {insight.actions && insight.actions.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {insight.actions.map((action, idx) => (
                        <Button key={idx} size="sm" variant="outline">
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Active Alerts
            <Badge variant="secondary">{alerts.length}</Badge>
          </CardTitle>
          <CardDescription>
            Critical issues requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                <p>No active alerts. System running smoothly!</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getSeverityColor(alert.severity)} border`}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm text-gray-500 uppercase">
                          {alert.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{alert.summary}</p>
                      {alert.recommendation && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                          <p className="text-sm text-blue-800">
                            <strong>Ashley recommends:</strong> {alert.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Acknowledge
                    </Button>
                    <Button
                      onClick={() => handleAlertAction(alert.id, 'resolve')}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      onClick={() => handleAlertAction(alert.id, 'ignore')}
                      size="sm"
                      variant="outline"
                      className="text-gray-600"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Ignore
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat with Ashley */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Chat with Ashley
          </CardTitle>
          <CardDescription>
            Ask Ashley AI about your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 min-h-[200px]">
            <div className="flex items-center gap-2 text-gray-500">
              <Brain className="w-5 h-5" />
              <span>Ashley AI is ready to help. Ask me anything about your business!</span>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask Ashley about production, finance, inventory..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <Button className="bg-blue-600 hover:bg-blue-700">
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}