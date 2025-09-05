'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Activity,
  Calendar,
  DollarSign,
  Package,
  Users,
  Target,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'

interface ChartData {
  name: string
  value: number
  revenue?: number
  orders?: number
  efficiency?: number
  target?: number
  previous?: number
}

interface MetricCard {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}

export function InteractiveCharts() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'production' | 'efficiency' | 'overview'>('overview')

  const revenueData: ChartData[] = [
    { name: 'Jan', value: 65000, orders: 145, efficiency: 87 },
    { name: 'Feb', value: 78000, orders: 168, efficiency: 92 },
    { name: 'Mar', value: 82000, orders: 189, efficiency: 89 },
    { name: 'Apr', value: 95000, orders: 201, efficiency: 94 },
    { name: 'May', value: 88000, orders: 178, efficiency: 91 },
    { name: 'Jun', value: 102000, orders: 223, efficiency: 96 },
    { name: 'Jul', value: 118000, orders: 245, efficiency: 88 },
    { name: 'Aug', value: 125000, orders: 267, efficiency: 93 },
    { name: 'Sep', value: 135000, orders: 289, efficiency: 95 },
    { name: 'Oct', value: 142000, orders: 301, efficiency: 97 },
    { name: 'Nov', value: 158000, orders: 334, efficiency: 94 },
    { name: 'Dec', value: 172000, orders: 356, efficiency: 96 }
  ]

  const productionData: ChartData[] = [
    { name: 'Screen Printing', value: 45, target: 50, previous: 42 },
    { name: 'Embroidery', value: 32, target: 35, previous: 28 },
    { name: 'Heat Transfer', value: 28, target: 30, previous: 25 },
    { name: 'Sublimation', value: 18, target: 20, previous: 15 },
    { name: 'Direct Print', value: 22, target: 25, previous: 18 }
  ]

  const departmentEfficiency: ChartData[] = [
    { name: 'Design', value: 94 },
    { name: 'Production', value: 87 },
    { name: 'Quality Control', value: 96 },
    { name: 'Packaging', value: 89 },
    { name: 'Logistics', value: 92 }
  ]

  const orderStatusData: ChartData[] = [
    { name: 'Completed', value: 156, revenue: 425000 },
    { name: 'In Progress', value: 89, revenue: 267000 },
    { name: 'Pending', value: 43, revenue: 128000 },
    { name: 'Cancelled', value: 12, revenue: 34000 }
  ]

  const metrics: MetricCard[] = [
    {
      title: 'Total Revenue',
      value: '₱1,247,500',
      change: 15.3,
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Production Efficiency',
      value: '92.4%',
      change: 5.2,
      trend: 'up',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Active Orders',
      value: 234,
      change: -2.1,
      trend: 'down',
      icon: Package,
      color: 'text-orange-600'
    },
    {
      title: 'Quality Score',
      value: '96.8%',
      change: 3.7,
      trend: 'up',
      icon: Target,
      color: 'text-purple-600'
    }
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {typeof entry.value === 'number' ? 
                entry.dataKey === 'value' && entry.value > 1000 ? 
                  `₱${entry.value.toLocaleString()}` : 
                  entry.value.toLocaleString() : 
                entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-50 ${metric.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  {metric.trend === 'up' ? (
                    <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : metric.trend === 'down' ? (
                    <ArrowDown className="h-4 w-4 text-red-600 mr-1" />
                  ) : null}
                  <span className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {Math.abs(metric.change)}% vs last period
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart Navigation */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedChart === 'overview' ? 'default' : 'outline'}
          onClick={() => setSelectedChart('overview')}
          size="sm"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Overview
        </Button>
        <Button
          variant={selectedChart === 'revenue' ? 'default' : 'outline'}
          onClick={() => setSelectedChart('revenue')}
          size="sm"
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Revenue Trends
        </Button>
        <Button
          variant={selectedChart === 'production' ? 'default' : 'outline'}
          onClick={() => setSelectedChart('production')}
          size="sm"
        >
          <Activity className="mr-2 h-4 w-4" />
          Production
        </Button>
        <Button
          variant={selectedChart === 'efficiency' ? 'default' : 'outline'}
          onClick={() => setSelectedChart('efficiency')}
          size="sm"
        >
          <Target className="mr-2 h-4 w-4" />
          Efficiency
        </Button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        {(selectedChart === 'overview' || selectedChart === 'revenue') && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Revenue & Orders Trend</span>
                <Badge variant="outline" className="ml-2">
                  {selectedPeriod.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                    name="Revenue (₱)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Production Performance */}
        {(selectedChart === 'overview' || selectedChart === 'production') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Production by Method</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="previous" fill="#e2e8f0" name="Previous" />
                  <Bar dataKey="value" fill="#3b82f6" name="Current" />
                  <Bar dataKey="target" fill="#10b981" name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Order Status Distribution */}
        {(selectedChart === 'overview') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChartIcon className="h-5 w-5" />
                <span>Order Status Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Department Efficiency */}
        {(selectedChart === 'overview' || selectedChart === 'efficiency') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Department Efficiency</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentEfficiency} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#10b981">
                    {departmentEfficiency.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.value >= 95 ? '#10b981' : entry.value >= 90 ? '#f59e0b' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Production Timeline */}
        {selectedChart === 'production' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Efficiency Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[75, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    name="Efficiency %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Peak Production Day</p>
                <p className="text-lg font-bold text-blue-900">Tuesday</p>
                <p className="text-xs text-blue-600">24% above average</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Top Product Category</p>
                <p className="text-lg font-bold text-green-900">T-Shirts</p>
                <p className="text-xs text-green-600">67% of total orders</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Customer Satisfaction</p>
                <p className="text-lg font-bold text-purple-900">4.8/5.0</p>
                <p className="text-xs text-purple-600">Based on 1,247 reviews</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}