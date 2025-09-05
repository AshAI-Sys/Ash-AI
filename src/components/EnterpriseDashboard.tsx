'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  AlertCircle,
  Brain,
  Zap,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Bell
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AIInsightsDashboard } from '@/components/ai/AIInsightsDashboard'
import type { OrderData } from '@/lib/ai-engine'

interface DashboardStats {
  totalOrders: number
  activeOrders: number
  completedOrders: number
  revenue: number
  efficiency: number
  alerts: number
}

interface RecentActivity {
  id: string
  type: 'order' | 'production' | 'alert' | 'delivery'
  message: string
  timestamp: string
  status: 'success' | 'warning' | 'error'
}

export function EnterpriseDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 1247,
    activeOrders: 23,
    completedOrders: 1224,
    revenue: 2849750,
    efficiency: 94.2,
    alerts: 3
  })

  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'order',
      message: 'New order #REEF-2024-001234 received from Premium Apparel Co.',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'production',
      message: 'Silkscreen operation completed for order #SORB-2024-005432',
      timestamp: '15 minutes ago',
      status: 'success'
    },
    {
      id: '3',
      type: 'alert',
      message: 'Low inventory alert: Black fabric 240gsm below threshold',
      timestamp: '1 hour ago',
      status: 'warning'
    },
    {
      id: '4',
      type: 'delivery',
      message: 'Order #REEF-2024-001200 successfully delivered to client',
      timestamp: '2 hours ago',
      status: 'success'
    }
  ])

  // Mock orders data for AI analysis
  const mockOrdersForAI: OrderData[] = [
    {
      id: 'ASH-2025-001',
      status: 'IN_PRODUCTION',
      totalQty: 150,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      targetDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      method: 'SILKSCREEN',
      complexity: 6,
      productType: 'Tee',
      priority: 'HIGH',
      clientHistory: {
        totalOrders: 15,
        avgOrderValue: 25000,
        onTimeDeliveryRate: 92,
        qualityIssueRate: 3,
        paymentReliability: 95,
        lastOrderDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: 'ASH-2025-002',
      status: 'CONFIRMED',
      totalQty: 75,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      targetDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      method: 'DTF',
      complexity: 8,
      productType: 'Hoodie',
      priority: 'MEDIUM',
      variants: [
        { color: 'Black', qty: 40 },
        { color: 'White', qty: 35 }
      ]
    },
    {
      id: 'ASH-2025-003',
      status: 'READY_FOR_QC',
      totalQty: 200,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      targetDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      method: 'EMBROIDERY',
      complexity: 9,
      productType: 'Uniform',
      priority: 'HIGH',
      clientHistory: {
        totalOrders: 8,
        avgOrderValue: 35000,
        onTimeDeliveryRate: 87,
        qualityIssueRate: 8,
        paymentReliability: 88,
        lastOrderDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ]

  const quickActions = [
    { label: 'Create Order', icon: Package, href: '/orders/new', color: 'from-cyan-400 to-teal-400' },
    { label: 'View Analytics', icon: BarChart3, href: '/analytics', color: 'from-teal-400 to-cyan-400' },
    { label: 'Manage Inventory', icon: Target, href: '/inventory', color: 'from-cyan-400 to-slate-700' },
    { label: 'Team Overview', icon: Users, href: '/users', color: 'from-slate-700 to-teal-400' }
  ]

  const productionMetrics = [
    { label: 'Orders in Production', value: '23', change: '+12%', trend: 'up' },
    { label: 'Quality Score', value: '98.5%', change: '+2.1%', trend: 'up' },
    { label: 'On-Time Delivery', value: '94.2%', change: '-1.2%', trend: 'down' },
    { label: 'Team Efficiency', value: '91.7%', change: '+5.3%', trend: 'up' }
  ]

  return (
    <div className="neural-bg min-h-screen relative">
      {/* Quantum Field Background */}
      <div className="quantum-field">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="quantum-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold glitch-text text-white mb-2" data-text="Neural Command Center">
                Neural Command Center
              </h1>
              <p className="text-cyan-300 text-lg">
                Welcome back, <span className="font-semibold">{session?.user?.full_name}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="status-hologram status-active">
                SYSTEM ONLINE
              </div>
              <Button className="neon-btn">
                <Brain className="w-4 h-4 mr-2" />
                Ask Ashley AI
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hologram-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalOrders.toLocaleString()}</div>
              <p className="text-xs text-cyan-300 flex items-center mt-1">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="hologram-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Active Orders</CardTitle>
              <Clock className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.activeOrders}</div>
              <p className="text-xs text-cyan-300 flex items-center mt-1">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +3 today
              </p>
            </CardContent>
          </Card>

          <Card className="hologram-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">₱{(stats.revenue / 1000).toFixed(0)}K</div>
              <p className="text-xs text-cyan-300 flex items-center mt-1">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +18% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="hologram-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.efficiency}%</div>
              <p className="text-xs text-cyan-300 flex items-center mt-1">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +2.3% improvement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="quantum-card mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-cyan-300">
              Access key functions with one click
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    className="h-24 flex-col gap-2 hover:scale-105 transition-all duration-300 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${action.color} p-2 flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium">{action.label}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Production Metrics */}
          <Card className="quantum-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Production Metrics
              </CardTitle>
              <CardDescription className="text-cyan-300">
                Real-time production performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-cyan-400/5 to-teal-400/5 border border-cyan-400/20">
                    <div>
                      <p className="text-sm text-cyan-300 mb-1">{metric.label}</p>
                      <p className="text-2xl font-bold text-white">{metric.value}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      metric.trend === 'up' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {metric.trend === 'up' ? 
                        <ArrowUpRight className="w-3 h-3" /> : 
                        <ArrowDownRight className="w-3 h-3" />
                      }
                      {metric.change}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="quantum-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-cyan-300">
                Latest system events and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-cyan-400/5 to-teal-400/5 border border-cyan-400/20">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'success' ? 'bg-green-400' :
                      activity.status === 'warning' ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.message}</p>
                      <p className="text-xs text-cyan-300 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-cyan-300 hover:text-white hover:bg-cyan-500/10">
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced AI Insights Panel */}
        <AIInsightsDashboard orders={mockOrdersForAI} />
      </div>
    </div>
  )
}