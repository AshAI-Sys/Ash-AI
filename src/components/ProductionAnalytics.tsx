'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
  import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  Target,
  Zap,
  BarChart3,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react'

interface ProductionAnalyticsProps {
  userRole: string
}

interface ProductionMetrics {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  completionRate: number
  avgCompletionTime: number
  efficiencyScore: number
}

interface AnalyticsData {
  timeframe: string
  dateRange: { start: string; end: string }
  production: ProductionMetrics
  tasks: {
    byStatus: Array<{ status: string; count: number }>
    byType: Array<{ type: string; count: number }>
    byPriority: Array<{ priority: string; count: number }>
  }
  orders: {
    byStatus: Array<{ status: string; count: number }>
    totalRevenue: number
    completedOrders: number
    averageOrderValue: number
  }
  bottlenecks: {
    overdueTasks: Array<{
      id: string
      title: string
      orderNumber: string
      assignedTo: string
      role: string
      dueDate: string
      daysOverdue: number
    }>
    roleBottlenecks: Array<{
      taskType: string
      pendingCount: number
      avgEstimatedHours: number
    }>
  }
  capacity: {
    users: Array<{
      user_id: string
      name: string
      role: string
      activeTasks: number
      workload: number
      capacity: number
      utilization: number
    }>
    averageUtilization: number
    totalActiveUsers: number
    overloadedUsers: number
  }
  quality: {
    totalInspections: number
    passed: number
    failed: number
    passRate: number
    defectRate: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function ProductionAnalytics({ userRole }: ProductionAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('7d')
  const [department, setDepartment] = useState<string>('')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeframe,
        ...(department && { department })
      })
      
      const response = await fetch(`/api/analytics/production?${params}`)
      if (response.ok) {
        const analytics = await response.json()
        setData(analytics)
      }
    } catch (error) {
      console.error('Failed to fetch production analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe, department])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value)
  }

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'bg-red-500'
    if (utilization > 85) return 'bg-yellow-500'
    if (utilization > 60) return 'bg-green-500'
    return 'bg-blue-500'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">Failed to load analytics data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Analytics</h2>
          <p className="text-sm text-gray-600">
            Insights for {new Date(data.dateRange.start).toLocaleDateString()} - {new Date(data.dateRange.end).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Departments</option>
            <option value="design">Design</option>
            <option value="printing">Printing</option>
            <option value="production">Production</option>
            <option value="quality">Quality</option>
            <option value="finishing">Finishing</option>
          </select>
          
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.production.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {data.production.completedTasks} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.production.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.production.inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.production.avgCompletionTime}h</div>
            <p className="text-xs text-muted-foreground">
              Per task average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getEfficiencyColor(data.production.efficiencyScore)}`}>
              {data.production.efficiencyScore}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Current task status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.tasks.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {data.tasks.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Task Types */}
        <Card>
          <CardHeader>
            <CardTitle>Most Common Task Types</CardTitle>
            <CardDescription>Task distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.tasks.byType.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Capacity and Quality Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Capacity */}
        <Card>
          <CardHeader>
            <CardTitle>Team Capacity Utilization</CardTitle>
            <CardDescription>
              Average: {data.capacity.averageUtilization}% | 
              Overloaded: {data.capacity.overloadedUsers} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.capacity.users.slice(0, 8).map((user) => (
                <div key={user.user_id} className="flex items-center space-x-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUtilizationColor(user.utilization)}`}
                        style={{ width: `${Math.min(user.utilization, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium w-12 text-right">
                      {Math.round(user.utilization)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quality Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Control Metrics</CardTitle>
            <CardDescription>QC inspection results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Inspections</span>
                <span className="font-semibold">{data.quality.totalInspections}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pass Rate</span>
                <Badge variant={data.quality.passRate > 95 ? "default" : "secondary"}>
                  {data.quality.passRate}%
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Defect Rate</span>
                <Badge variant={data.quality.defectRate < 5 ? "default" : "destructive"}>
                  {data.quality.defectRate}%
                </Badge>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-600">Passed: {data.quality.passed}</span>
                  <span className="text-red-600">Failed: {data.quality.failed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-l-full"
                    style={{ width: `${data.quality.passRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks Section */}
      {data.bottlenecks.roleBottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Production Bottlenecks
            </CardTitle>
            <CardDescription>Areas requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.bottlenecks.roleBottlenecks.map((bottleneck, index) => (
                <div key={index} className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <h4 className="font-medium text-gray-900">{bottleneck.taskType}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {bottleneck.pendingCount} pending tasks
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg. {bottleneck.avgEstimatedHours}h per task
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.orders.totalRevenue)}
              </div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              
              <div className="pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Completed Orders</span>
                  <span className="font-medium">{data.orders.completedOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg. Order Value</span>
                  <span className="font-medium">{formatCurrency(data.orders.averageOrderValue)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.orders.byStatus} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="status" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}