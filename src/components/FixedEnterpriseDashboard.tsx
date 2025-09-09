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
  Bell,
  Settings,
  Truck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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

export function FixedEnterpriseDashboard() {
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

  const quickActions = [
    { label: 'Create Order', icon: Package, href: '/orders/new', color: 'from-cyan-400 to-teal-400' },
    { label: 'View Analytics', icon: BarChart3, href: '/analytics', color: 'from-teal-400 to-cyan-400' },
    { label: 'Manage Inventory', icon: Target, href: '/inventory', color: 'from-cyan-400 to-slate-700' },
    { label: 'Team Overview', icon: Users, href: '/users', color: 'from-slate-700 to-teal-400' }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4" />
      case 'production': return <Settings className="w-4 h-4" />
      case 'alert': return <AlertCircle className="w-4 h-4" />
      case 'delivery': return <Truck className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {session?.user?.name || 'Administrator'}!
            </h1>
            <p className="text-slate-400">
              Here's what's happening with your apparel production today.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">
                {new Date().toLocaleDateString('en-PH', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-lg font-semibold text-white">
                {new Date().toLocaleTimeString('en-PH', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hologram-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats.totalOrders.toLocaleString()}</p>
                <p className="text-xs text-green-400 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12% from last month
                </p>
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-full">
                <Package className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hologram-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Orders</p>
                <p className="text-3xl font-bold text-white">{stats.activeOrders}</p>
                <p className="text-xs text-blue-400 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  In production
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hologram-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Revenue</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(stats.revenue)}</p>
                <p className="text-xs text-green-400 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +18% from last month
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hologram-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Efficiency</p>
                <p className="text-3xl font-bold text-white">{stats.efficiency}%</p>
                <p className="text-xs text-purple-400 flex items-center mt-1">
                  <Target className="w-3 h-3 mr-1" />
                  Above target
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full">
                <BarChart3 className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="hologram-card hover:scale-105 transition-transform cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 bg-gradient-to-br ${action.color} rounded-full`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{action.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hologram-card">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your production floor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg bg-slate-800/50">
                  <div className={`p-2 rounded-full bg-slate-700 ${getStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{activity.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Placeholder (Safely disabled) */}
        <Card className="hologram-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Brain className="w-5 h-5 mr-2 text-cyan-400" />
              Ashley AI Insights
            </CardTitle>
            <CardDescription>AI-powered recommendations and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Production Optimization</p>
                    <p className="text-xs text-slate-400">System running efficiently at 94.2%</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Demand Forecast</p>
                    <p className="text-xs text-slate-400">Expect 15% increase in orders next week</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Quality Metrics</p>
                    <p className="text-xs text-slate-400">98.7% pass rate - Above industry standard</p>
                  </div>
                </div>
              </div>

              <Link href="/ai-assistant">
                <Button className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                  <Brain className="w-4 h-4 mr-2" />
                  Open Ashley AI Console
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}