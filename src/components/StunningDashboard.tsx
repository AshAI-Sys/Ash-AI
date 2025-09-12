// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  Activity,
  Zap,
  Brain,
  Sparkles,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Workflow,
  Factory,
  Palette,
  Scissors,
  Shirt,
  Bot
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

// Mock data for stunning visualizations
const productionData = [
  { name: 'Mon', orders: 12, revenue: 28400, efficiency: 85 },
  { name: 'Tue', orders: 19, revenue: 35600, efficiency: 88 },
  { name: 'Wed', orders: 15, revenue: 32100, efficiency: 92 },
  { name: 'Thu', orders: 22, revenue: 41800, efficiency: 89 },
  { name: 'Fri', orders: 18, revenue: 38900, efficiency: 95 },
  { name: 'Sat', orders: 14, revenue: 29700, efficiency: 87 },
  { name: 'Sun', orders: 8, revenue: 18200, efficiency: 83 }
]

const departmentData = [
  { name: 'Cutting', value: 25, color: '#8b5cf6' },
  { name: 'Printing', value: 35, color: '#3b82f6' },
  { name: 'Sewing', value: 28, color: '#10b981' },
  { name: 'QC', value: 12, color: '#f59e0b' }
]

const methodData = [
  { name: 'Silkscreen', orders: 45, revenue: 125000 },
  { name: 'DTF', orders: 32, revenue: 89000 },
  { name: 'Sublimation', orders: 28, revenue: 96000 },
  { name: 'Embroidery', orders: 18, revenue: 67000 }
]

export function StunningDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setAnimationClass('animate-in')
    const timeout = setTimeout(() => setAnimationClass(''), 500)
    return () => clearTimeout(timeout)
  }, [])

  const stats = [
    {
      title: "Today's Orders",
      value: "47",
      change: "+12.5%",
      trend: "up",
      icon: Package,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      title: "Revenue",
      value: "₱184.2K",
      change: "+8.3%", 
      trend: "up",
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600"
    },
    {
      title: "Efficiency",
      value: "94.2%",
      change: "+2.1%",
      trend: "up",
      icon: Target,
      color: "from-purple-500 to-purple-600", 
      bgColor: "bg-purple-50",
      textColor: "text-purple-600"
    },
    {
      title: "Active Tasks",
      value: "23",
      change: "-5.2%",
      trend: "down",
      icon: Activity,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50", 
      textColor: "text-orange-600"
    }
  ]

  const quickActions = [
    { name: "New Order", icon: Package, color: "bg-blue-500", path: "/orders" },
    { name: "Inventory", icon: Workflow, color: "bg-green-500", path: "/inventory" },
    { name: "Quality Check", icon: CheckCircle, color: "bg-purple-500", path: "/qc" },
    { name: "Analytics", icon: BarChart3, color: "bg-orange-500", path: "/analytics" }
  ]

  const recentActivities = [
    {
      id: 1,
      type: "order",
      title: "New order received",
      description: "REEF-2024-001234 • 50 T-Shirts",
      time: "2 min ago",
      icon: Package,
      color: "text-blue-600 bg-blue-100"
    },
    {
      id: 2,
      type: "production",
      title: "Printing completed",
      description: "Batch B-4567 ready for sewing",
      time: "15 min ago", 
      icon: Palette,
      color: "text-green-600 bg-green-100"
    },
    {
      id: 3,
      type: "alert",
      title: "Stock alert",
      description: "Black ink running low (8 units)",
      time: "1 hour ago",
      icon: AlertTriangle,
      color: "text-orange-600 bg-orange-100"
    },
    {
      id: 4,
      type: "quality",
      title: "QC passed",
      description: "Order #1042 cleared for packing",
      time: "2 hours ago",
      icon: CheckCircle,
      color: "text-purple-600 bg-purple-100"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="ash-glass rounded-3xl p-8 border border-white/20 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold ash-gradient-text mb-2">
                  ASH AI Production Hub
                </h1>
                <p className="text-lg text-slate-600 mb-4">
                  Intelligent Manufacturing • Real-time Insights • Optimized Workflows
                </p>
                <div className="flex items-center space-x-6 text-sm text-slate-500">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {currentTime.toLocaleTimeString()}
                  </span>
                  <span className="flex items-center">
                    <Factory className="w-4 h-4 mr-1" />
                    Manila Production Facility
                  </span>
                  <span className="flex items-center">
                    <Zap className="w-4 h-4 mr-1" />
                    All Systems Operational
                  </span>
                </div>
              </div>
              <div className="ash-animate-float">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ash-glow">
                  <Bot className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title}
            className={`ash-card hover:ash-glow ${animationClass} relative overflow-hidden group`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity">
                <div className={`w-full h-full bg-gradient-to-br ${stat.color}`}></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trend === 'up' ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    <span className="font-medium">{stat.change}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ashley AI Intelligence Panel */}
      <Card className="ash-card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center ash-animate-pulse-slow">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-purple-800">Ashley AI Insights</CardTitle>
                <p className="text-sm text-purple-600">Real-time production intelligence and optimization</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-800 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              Live Analysis
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/70 rounded-lg p-4 border border-purple-100">
              <h4 className="font-semibold text-purple-800 mb-2">🎯 Today's Prediction</h4>
              <p className="text-sm text-slate-700 mb-2">Expected to complete 52 orders with 96% efficiency rate</p>
              <div className="flex items-center space-x-2">
                <div className="w-full bg-purple-100 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full w-4/5"></div>
                </div>
                <span className="text-sm font-medium text-purple-600">78%</span>
              </div>
            </div>
            
            <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-2">⚡ Optimization</h4>
              <p className="text-sm text-slate-700 mb-2">Routing adjustments can save 2.3 hours production time</p>
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                Apply Suggestions
              </Button>
            </div>
            
            <div className="bg-white/70 rounded-lg p-4 border border-green-100">
              <h4 className="font-semibold text-green-800 mb-2">📊 Quality Score</h4>
              <p className="text-sm text-slate-700 mb-2">Current batch quality trending above 95% target</p>
              <div className="text-2xl font-bold text-green-600">97.3%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Timeline */}
        <Card className="ash-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Weekly Production Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionData}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Area 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorOrders)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="ash-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Factory className="w-5 h-5 text-purple-600" />
              <span>Production by Department</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {departmentData.map((dept, index) => (
                <div key={dept.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  ></div>
                  <span className="text-sm text-slate-700">{dept.name}</span>
                  <span className="text-sm font-medium text-slate-900">{dept.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Method Performance and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Method Performance */}
        <Card className="ash-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-green-600" />
              <span>Production Method Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="ash-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <span>Live Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color}`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="ash-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.name}
                className={`${action.color} text-white hover:scale-105 transition-transform h-20 flex-col space-y-2`}
                onClick={() => window.location.href = action.path}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}