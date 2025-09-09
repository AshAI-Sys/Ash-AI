'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
  import {
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Lightbulb,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Users,
  Package,
  Calendar,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react'

interface AIInsight {
  id: string
  type: 'PREDICTION' | 'OPTIMIZATION' | 'ALERT' | 'RECOMMENDATION'
  category: 'PRODUCTION' | 'QUALITY' | 'INVENTORY' | 'SALES' | 'MAINTENANCE' | 'FINANCE'
  title: string
  description: string
  confidence: number
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'NEW' | 'REVIEWED' | 'APPLIED' | 'DISMISSED'
  data?: any
  timestamp: string
  actionable: boolean
}

interface PerformanceMetric {
  id: string
  name: string
  value: number
  target: number
  unit: string
  trend: 'UP' | 'DOWN' | 'STABLE'
  changePercent: number
  category: 'PRODUCTION' | 'QUALITY' | 'EFFICIENCY' | 'COST'
  status: 'GOOD' | 'WARNING' | 'CRITICAL'
}

interface AIAnalyticsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'PREDICTION',
    category: 'PRODUCTION',
    title: 'Production Capacity Forecast',
    description: 'Based on current trends, production capacity will increase by 15% in the next month due to improved workflow efficiency.',
    confidence: 92,
    impact: 'HIGH',
    status: 'NEW',
    timestamp: new Date().toISOString(),
    actionable: true,
    data: { expectedIncrease: 15, timeframe: '1 month', factor: 'workflow_efficiency' }
  },
  {
    id: '2',
    type: 'ALERT',
    category: 'QUALITY',
    title: 'Quality Score Decline Detected',
    description: 'Quality scores have dropped 8% over the past week. Analysis suggests correlation with recent material supplier change.',
    confidence: 87,
    impact: 'HIGH',
    status: 'NEW',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actionable: true,
    data: { decline: 8, timeframe: '1 week', cause: 'supplier_change' }
  },
  {
    id: '3',
    type: 'OPTIMIZATION',
    category: 'INVENTORY',
    title: 'Inventory Optimization Opportunity',
    description: 'Current inventory levels suggest potential savings of ₱25,000 by adjusting reorder points for slow-moving items.',
    confidence: 78,
    impact: 'MEDIUM',
    status: 'REVIEWED',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    actionable: true,
    data: { savings: 25000, items: 12, category: 'slow_moving' }
  },
  {
    id: '4',
    type: 'RECOMMENDATION',
    category: 'MAINTENANCE',
    title: 'Predictive Maintenance Alert',
    description: 'Screen printing press #2 shows early indicators of potential failure. Recommend scheduling maintenance within 2 weeks.',
    confidence: 94,
    impact: 'HIGH',
    status: 'NEW',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    actionable: true,
    data: { asset: 'Screen Press #2', probability: 94, timeframe: '2 weeks' }
  }
]

const mockMetrics: PerformanceMetric[] = [
  {
    id: '1',
    name: 'Production Efficiency',
    value: 87.5,
    target: 85,
    unit: '%',
    trend: 'UP',
    changePercent: 5.2,
    category: 'PRODUCTION',
    status: 'GOOD'
  },
  {
    id: '2',
    name: 'Quality Score',
    value: 92.1,
    target: 95,
    unit: '%',
    trend: 'DOWN',
    changePercent: -3.1,
    category: 'QUALITY',
    status: 'WARNING'
  },
  {
    id: '3',
    name: 'Order Fulfillment Time',
    value: 4.2,
    target: 5,
    unit: 'days',
    trend: 'DOWN',
    changePercent: -12.5,
    category: 'EFFICIENCY',
    status: 'GOOD'
  },
  {
    id: '4',
    name: 'Cost per Unit',
    value: 145.5,
    target: 150,
    unit: '₱',
    trend: 'UP',
    changePercent: 8.7,
    category: 'COST',
    status: 'WARNING'
  }
]

export function AIAnalyticsDashboard({ isOpen, onClose }: AIAnalyticsDashboardProps) {
  const [insights, setInsights] = useState<AIInsight[]>(mockInsights)
  const [metrics] = useState<PerformanceMetric[]>(mockMetrics)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredInsights = insights.filter(insight => 
    selectedCategory === 'ALL' || insight.category === selectedCategory
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate AI analysis refresh
    setTimeout(() => {
      setIsRefreshing(false)
    }, 2000)
  }

  const updateInsightStatus = (insightId: string, newStatus: AIInsight['status']) => {
    setInsights(prev => prev.map(insight => 
      insight.id === insightId ? { ...insight, status: newStatus } : insight
    ))
  }

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'PREDICTION': return TrendingUp
      case 'OPTIMIZATION': return Target
      case 'ALERT': return AlertTriangle
      case 'RECOMMENDATION': return Lightbulb
      default: return Brain
    }
  }

  const getInsightColor = (type: AIInsight['type'], impact: AIInsight['impact']) => {
    if (type === 'ALERT') return 'border-red-200 bg-red-50'
    if (impact === 'HIGH') return 'border-orange-200 bg-orange-50'
    if (impact === 'MEDIUM') return 'border-yellow-200 bg-yellow-50'
    return 'border-green-200 bg-green-50'
  }

  const getMetricStatus = (metric: PerformanceMetric) => {
    if (metric.status === 'GOOD') return 'text-green-600 bg-green-100'
    if (metric.status === 'WARNING') return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Ashley AI Analytics Dashboard
            </span>
          </DialogTitle>
          <DialogDescription>
            AI-powered insights and analytics for optimized operations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="ALL">All Categories</option>
                <option value="PRODUCTION">Production</option>
                <option value="QUALITY">Quality</option>
                <option value="INVENTORY">Inventory</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SALES">Sales</option>
                <option value="FINANCE">Finance</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(metric => {
              const TrendIcon = metric.trend === 'UP' ? ArrowUp : metric.trend === 'DOWN' ? ArrowDown : Activity
              return (
                <Card key={metric.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                      <Badge className={getMetricStatus(metric)} variant="outline">
                        {metric.status}
                      </Badge>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <p className="text-sm text-gray-500">{metric.unit}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1">
                        <TrendIcon className={`h-3 w-3 ${
                          metric.trend === 'UP' ? 'text-green-600' :
                          metric.trend === 'DOWN' ? 'text-red-600' :
                          'text-gray-600'
                        }`} />
                        <span className={`text-sm ${
                          metric.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(metric.changePercent)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Target: {metric.target}{metric.unit}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* AI Insights */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span>AI Insights & Recommendations</span>
              <Badge variant="outline" className="ml-2">
                {filteredInsights.filter(i => i.status === 'NEW').length} New
              </Badge>
            </h3>

            <div className="space-y-4">
              {filteredInsights.map(insight => {
                const InsightIcon = getInsightIcon(insight.type)
                return (
                  <Card key={insight.id} className={`border-l-4 ${getInsightColor(insight.type, insight.impact)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="mt-1">
                            <InsightIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">{insight.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {insight.type}
                              </Badge>
                              <Badge 
                                className={`text-xs ${
                                  insight.impact === 'HIGH' ? 'bg-red-100 text-red-800' :
                                  insight.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}
                              >
                                {insight.impact} IMPACT
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeAgo(insight.timestamp)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Target className="h-3 w-3" />
                                <span>{insight.confidence}% confidence</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <BarChart3 className="h-3 w-3" />
                                <span>{insight.category}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge 
                            className={`${
                              insight.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                              insight.status === 'REVIEWED' ? 'bg-yellow-100 text-yellow-800' :
                              insight.status === 'APPLIED' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {insight.status}
                          </Badge>
                          {insight.actionable && insight.status === 'NEW' && (
                            <div className="flex space-x-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateInsightStatus(insight.id, 'REVIEWED')}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => updateInsightStatus(insight.id, 'APPLIED')}
                              >
                                Apply
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Active Insights</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {insights.filter(i => i.status === 'NEW' || i.status === 'REVIEWED').length}
                    </p>
                  </div>
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  {insights.filter(i => i.status === 'NEW').length} require attention
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Applied Solutions</p>
                    <p className="text-2xl font-bold text-green-900">
                      {insights.filter(i => i.status === 'APPLIED').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mt-2">Optimization actions taken</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Avg. Confidence</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-xs text-orange-600 mt-2">AI prediction accuracy</p>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()} • Powered by Ashley AI Engine v2.1
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}