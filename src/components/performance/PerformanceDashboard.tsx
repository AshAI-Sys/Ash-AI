'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  Zap, 
  Database, 
  Globe, 
  Server,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Cpu,
  HardDrive,
  Wifi,
  Monitor
} from 'lucide-react'
  import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'

interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
  change: number
  threshold: {
    excellent: number
    good: number
    warning: number
  }
}

interface SystemResource {
  name: string
  usage: number
  total: number
  unit: string
  processes: {
    name: string
    usage: number
  }[]
}

interface CacheMetric {
  name: string
  hitRate: number
  size: number
  entries: number
  lastClear: string
}

export function PerformanceDashboard() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h')
  
  const [metrics] = useState<PerformanceMetric[]>([
    {
      id: 'response_time',
      name: 'Avg Response Time',
      value: 145,
      unit: 'ms',
      status: 'good',
      change: -12.3,
      threshold: { excellent: 100, good: 200, warning: 500 }
    },
    {
      id: 'throughput',
      name: 'Requests/sec',
      value: 234,
      unit: 'req/s',
      status: 'excellent',
      change: 18.7,
      threshold: { excellent: 200, good: 100, warning: 50 }
    },
    {
      id: 'error_rate',
      name: 'Error Rate',
      value: 0.23,
      unit: '%',
      status: 'excellent',
      change: -45.2,
      threshold: { excellent: 0.5, good: 1, warning: 5 }
    },
    {
      id: 'db_query_time',
      name: 'DB Query Time',
      value: 23,
      unit: 'ms',
      status: 'excellent',
      change: -8.1,
      threshold: { excellent: 30, good: 50, warning: 100 }
    }
  ])

  const [systemResources] = useState<SystemResource[]>([
    {
      name: 'CPU Usage',
      usage: 34.5,
      total: 100,
      unit: '%',
      processes: [
        { name: 'Node.js', usage: 18.3 },
        { name: 'Database', usage: 8.7 },
        { name: 'Redis', usage: 4.2 },
        { name: 'Other', usage: 3.3 }
      ]
    },
    {
      name: 'Memory Usage',
      usage: 2.8,
      total: 8,
      unit: 'GB',
      processes: [
        { name: 'Application', usage: 1.2 },
        { name: 'Database', usage: 0.9 },
        { name: 'Cache', usage: 0.4 },
        { name: 'System', usage: 0.3 }
      ]
    },
    {
      name: 'Disk Usage',
      usage: 45.2,
      total: 100,
      unit: 'GB',
      processes: [
        { name: 'Database', usage: 28.5 },
        { name: 'Logs', usage: 8.3 },
        { name: 'Uploads', usage: 5.7 },
        { name: 'System', usage: 2.7 }
      ]
    }
  ])

  const [cacheMetrics] = useState<CacheMetric[]>([
    {
      name: 'Redis Cache',
      hitRate: 94.2,
      size: 256,
      entries: 12847,
      lastClear: '2024-08-28T10:30:00Z'
    },
    {
      name: 'Database Query Cache',
      hitRate: 87.5,
      size: 128,
      entries: 5632,
      lastClear: '2024-08-29T02:15:00Z'
    },
    {
      name: 'Static Asset Cache',
      hitRate: 98.1,
      size: 512,
      entries: 3421,
      lastClear: '2024-08-27T18:45:00Z'
    }
  ])

  const [performanceData] = useState([
    { time: '00:00', responseTime: 145, throughput: 234, errorRate: 0.2 },
    { time: '00:15', responseTime: 152, throughput: 228, errorRate: 0.3 },
    { time: '00:30', responseTime: 138, throughput: 245, errorRate: 0.1 },
    { time: '00:45', responseTime: 161, throughput: 221, errorRate: 0.4 },
    { time: '01:00', responseTime: 149, throughput: 238, errorRate: 0.2 },
    { time: '01:15', responseTime: 143, throughput: 241, errorRate: 0.2 },
  ])

  const runOptimization = async () => {
    setIsOptimizing(true)
    // Simulate optimization process
    setTimeout(() => {
      setIsOptimizing(false)
    }, 3000)
  }

  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getResourceColor = (usage: number, total: number) => {
    const percentage = (usage / total) * 100
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
              {entry.dataKey === 'responseTime' && 'ms'}
              {entry.dataKey === 'throughput' && ' req/s'}
              {entry.dataKey === 'errorRate' && '%'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Activity className="h-6 w-6 text-green-600" />
            <span>Performance Dashboard</span>
          </h2>
          <p className="text-gray-600">Real-time system monitoring and optimization</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-input bg-background rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={runOptimization} disabled={isOptimizing}>
            {isOptimizing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Optimize
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <Card key={metric.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                <Badge className={getStatusColor(metric.status)}>
                  {metric.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-baseline space-x-1 mb-2">
                <p className="text-2xl font-bold">
                  {metric.value < 1 ? metric.value.toFixed(2) : Math.round(metric.value)}
                </p>
                <p className="text-sm text-gray-500">{metric.unit}</p>
              </div>
              <div className="flex items-center space-x-1">
                {metric.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${
                  metric.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.abs(metric.change)}% vs last period
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Response Time Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Throughput */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Throughput & Error Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="throughput" 
                  stroke="#10b981" 
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Resources</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemResources.map(resource => (
              <div key={resource.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {resource.name.includes('CPU') && <Cpu className="h-4 w-4" />}
                    {resource.name.includes('Memory') && <Monitor className="h-4 w-4" />}
                    {resource.name.includes('Disk') && <HardDrive className="h-4 w-4" />}
                    <h4 className="font-medium">{resource.name}</h4>
                  </div>
                  <span className="text-sm font-medium">
                    {resource.usage}{resource.unit} / {resource.total}{resource.unit}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getResourceColor(resource.usage, resource.total)}`}
                    style={{ width: `${(resource.usage / resource.total) * 100}%` }}
                  />
                </div>
                
                <div className="space-y-1">
                  {resource.processes.map(process => (
                    <div key={process.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{process.name}</span>
                      <span className="font-medium">{process.usage}{resource.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cacheMetrics.map(cache => (
          <Card key={cache.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>{cache.name}</span>
                </div>
                <Badge className={cache.hitRate > 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {cache.hitRate}% Hit Rate
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cache Size:</span>
                  <span className="font-medium">{cache.size} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Entries:</span>
                  <span className="font-medium">{cache.entries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Cleared:</span>
                  <span className="text-xs text-gray-500">
                    {new Date(cache.lastClear).toLocaleDateString()}
                  </span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Performance Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Database Query Optimization</p>
                <p className="text-sm text-blue-700">
                  Recent optimizations reduced average query time by 15%. All queries under 30ms threshold.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Memory Usage Alert</p>
                <p className="text-sm text-yellow-700">
                  Memory usage is at 35%. Consider scaling up if it exceeds 70% during peak hours.
                </p>
                <Button size="sm" className="mt-2 bg-yellow-600 hover:bg-yellow-700">
                  View Memory Analysis
                </Button>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Cache Hit Rate Excellent</p>
                <p className="text-sm text-green-700">
                  Redis cache maintaining 94.2% hit rate, significantly reducing database load.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}