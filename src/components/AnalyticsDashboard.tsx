/**
 * Advanced Analytics Dashboard with Professional Data Visualization
 * Interactive charts and metrics for production insights
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Package,
  Clock,
  Users,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download
} from 'lucide-react'

interface AnalyticsData {
  productionMetrics: {
    efficiency: number
    throughput: number
    qualityScore: number
    onTimeDelivery: number
    utilization: number
  }
  financialMetrics: {
    revenue: number
    profitMargin: number
    costPerUnit: number
    revenueGrowth: number
  }
  qualityMetrics: {
    defectRate: number
    passRate: number
    customerSatisfaction: number
    returnRate: number
  }
  workforceMetrics: {
    productivity: number
    attendance: number
    trainingComplete: number
    safety: number
  }
}

interface ChartData {
  name: string
  value: number
  previous?: number
  target?: number
  color?: string
}

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    productionMetrics: {
      efficiency: 94.2,
      throughput: 1847,
      qualityScore: 98.1,
      onTimeDelivery: 96.8,
      utilization: 87.5
    },
    financialMetrics: {
      revenue: 2849750,
      profitMargin: 32.5,
      costPerUnit: 285.50,
      revenueGrowth: 18.2
    },
    qualityMetrics: {
      defectRate: 1.9,
      passRate: 98.1,
      customerSatisfaction: 4.7,
      returnRate: 0.8
    },
    workforceMetrics: {
      productivity: 112.5,
      attendance: 96.3,
      trainingComplete: 89.2,
      safety: 100
    }
  })

  const [productionData] = useState<ChartData[]>([
    { name: 'Cutting', value: 95, previous: 92, target: 98, color: '#3b82f6' },
    { name: 'Printing', value: 87, previous: 85, target: 90, color: '#10b981' },
    { name: 'Sewing', value: 92, previous: 88, target: 95, color: '#f59e0b' },
    { name: 'QC', value: 98, previous: 97, target: 99, color: '#ef4444' },
    { name: 'Packing', value: 89, previous: 91, target: 95, color: '#8b5cf6' },
    { name: 'Delivery', value: 96, previous: 94, target: 98, color: '#06b6d4' }
  ])

  const [revenueData] = useState([
    { name: 'Jan', value: 2100000, target: 2000000 },
    { name: 'Feb', value: 2350000, target: 2200000 },
    { name: 'Mar', value: 2580000, target: 2400000 },
    { name: 'Apr', value: 2720000, target: 2600000 },
    { name: 'May', value: 2849750, target: 2800000 }
  ])

  const [qualityTrends] = useState([
    { name: 'Week 1', defects: 2.1, returns: 0.9 },
    { name: 'Week 2', defects: 1.8, returns: 0.7 },
    { name: 'Week 3', defects: 2.3, returns: 1.1 },
    { name: 'Week 4', defects: 1.9, returns: 0.8 }
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getMetricColor = (value: number, target: number) => {
    const percentage = (value / target) * 100
    if (percentage >= 100) return 'text-green-600'
    if (percentage >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Activity className="w-4 h-4 text-gray-500" />
  }

  const exportData = (type: string) => {
    console.log(`Exporting ${type} data...`)
  }

  return (
    <div className="space-y-6 p-6 neural-bg min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-slate-400 mt-1">Production insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => exportData('all')}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="cyber-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Production Efficiency</p>
                <p className="text-2xl font-bold text-emerald-400">{analytics.productionMetrics.efficiency}%</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(analytics.productionMetrics.efficiency, 92.1)}
                  <span className="text-sm text-slate-400 ml-1">vs last period</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Monthly Revenue</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(analytics.financialMetrics.revenue)}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(analytics.financialMetrics.revenue, 2720000)}
                  <span className="text-sm text-slate-400 ml-1">+{analytics.financialMetrics.revenueGrowth}%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Quality Score</p>
                <p className="text-2xl font-bold text-purple-400">{analytics.productionMetrics.qualityScore}%</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(analytics.productionMetrics.qualityScore, 97.8)}
                  <span className="text-sm text-slate-400 ml-1">Excellent</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">On-time Delivery</p>
                <p className="text-2xl font-bold text-amber-400">{analytics.productionMetrics.onTimeDelivery}%</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(analytics.productionMetrics.onTimeDelivery, 95.2)}
                  <span className="text-sm text-slate-400 ml-1">Target: 95%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="workforce">Workforce</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Station Efficiency */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Station Efficiency
                </CardTitle>
                <CardDescription>Current vs Target performance by station</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {productionData.map((station) => (
                  <div key={station.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{station.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{station.value}%</span>
                        {station.previous && getTrendIcon(station.value, station.previous)}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(station.value, 100)}%`,
                            backgroundColor: station.color
                          }}
                        />
                      </div>
                      {station.target && (
                        <div 
                          className="absolute top-0 w-0.5 h-2 bg-red-500"
                          style={{ left: `${Math.min(station.target, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Throughput Metrics */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Throughput Metrics
                </CardTitle>
                <CardDescription>Units processed per day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    {analytics.productionMetrics.throughput.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">Units per day</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Capacity Utilization</span>
                    <span className="text-sm font-semibold">{analytics.productionMetrics.utilization}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Peak Hour Performance</span>
                    <span className="text-sm font-semibold">245 units/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Bottleneck Station</span>
                    <span className="text-sm font-semibold text-yellow-500">Printing</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Revenue Trend
                </CardTitle>
                <CardDescription>Monthly revenue vs targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueData.map((month, index) => (
                  <div key={month.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{month.name} 2025</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{formatCurrency(month.value)}</span>
                        <Badge 
                          className={month.value >= month.target ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                        >
                          {month.value >= month.target ? 'Target Met' : 'Below Target'}
                        </Badge>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${Math.min((month.value / month.target) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cost Analysis */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Cost Analysis
                </CardTitle>
                <CardDescription>Cost breakdown and margins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.financialMetrics.profitMargin}%
                    </div>
                    <div className="text-sm text-slate-600">Profit Margin</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ₱{analytics.financialMetrics.costPerUnit}
                    </div>
                    <div className="text-sm text-slate-600">Cost per Unit</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Material Cost</span>
                    <span className="text-sm font-semibold">45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Labor Cost</span>
                    <span className="text-sm font-semibold">28%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Overhead</span>
                    <span className="text-sm font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Other Expenses</span>
                    <span className="text-sm font-semibold">12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Trends */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  Quality Trends
                </CardTitle>
                <CardDescription>Defect rates and returns over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qualityTrends.map((week) => (
                  <div key={week.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">{week.name}</span>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-red-600">{week.defects}%</div>
                        <div className="text-xs text-slate-500">Defects</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-orange-600">{week.returns}%</div>
                        <div className="text-xs text-slate-500">Returns</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Customer Satisfaction */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Customer Satisfaction
                </CardTitle>
                <CardDescription>Feedback and satisfaction scores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-400 mb-2">
                    {analytics.qualityMetrics.customerSatisfaction}/5.0
                  </div>
                  <div className="text-sm text-slate-400">Average Rating</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">5 Star Reviews</span>
                    <span className="text-sm font-semibold">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">4 Star Reviews</span>
                    <span className="text-sm font-semibold">18%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">3 Star Reviews</span>
                    <span className="text-sm font-semibold">3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Below 3 Stars</span>
                    <span className="text-sm font-semibold text-red-500">1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workforce" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workforce Metrics */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Workforce Performance
                </CardTitle>
                <CardDescription>Employee productivity and engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.workforceMetrics.productivity}%
                    </div>
                    <div className="text-sm text-slate-600">Productivity</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.workforceMetrics.attendance}%
                    </div>
                    <div className="text-sm text-slate-600">Attendance</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Training Completion</span>
                    <span className="text-sm font-semibold">{analytics.workforceMetrics.trainingComplete}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Safety Score</span>
                    <span className="text-sm font-semibold text-green-600">{analytics.workforceMetrics.safety}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Employee Satisfaction</span>
                    <span className="text-sm font-semibold">4.2/5.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Overview */}
            <Card className="executive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  Department Overview
                </CardTitle>
                <CardDescription>Performance by department</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { dept: 'Cutting', efficiency: 95, staff: 8 },
                  { dept: 'Printing', efficiency: 87, staff: 12 },
                  { dept: 'Sewing', efficiency: 92, staff: 24 },
                  { dept: 'QC', efficiency: 98, staff: 6 },
                  { dept: 'Packing', efficiency: 89, staff: 10 }
                ].map((dept) => (
                  <div key={dept.dept} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">{dept.dept}</div>
                      <div className="text-sm text-slate-500">{dept.staff} staff</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{dept.efficiency}%</div>
                      <div className="text-xs text-slate-500">Efficiency</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}