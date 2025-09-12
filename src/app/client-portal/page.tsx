// @ts-nocheck
/**
 * ASH AI - Client Portal Dashboard
 * Professional client interface with order tracking and design approvals
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileImage,
  Truck,
  Star,
  Calendar,
  Filter,
  Search,
  Bell,
  Settings,
  LogOut,
  Brain,
  Palette,
  Wifi,
  WifiOff,
  RefreshCw,
  Circle
} from 'lucide-react'

interface ClientDashboard {
  client: {
    name: string
    company: string
    settings: any
  }
  overview: {
    total_orders: number
    active_orders: number
    pending_approvals: number
    urgent_tasks: number
  }
  recent_orders: Array<{
    id: string
    po_number: string
    brand: string
    status: string
    product_type: string
    total_qty: number
    target_delivery_date: string
    created_at: string
    progress_percentage: number
    next_milestone: string | null
    design_status: string
    delivery_info: any
  }>
  pending_approvals: Array<{
    id: string
    order_po: string
    brand: string
    file_name: string
    type: string
    version: number
    created_at: string
    order_id: string
  }>
  insights: {
    avg_lead_time: number
    on_time_delivery_rate: number
    design_approval_time: number
    status_distribution: Record<string, number>
    delivery_performance: {
      on_time: number
      delayed: number
      early: number
    }
  }
  notifications: Array<{
    id: string
    type: string
    message: string
    created_at: string
    order_id: string
  }>
  quick_actions: Array<{
    type: string
    title: string
    count: number
    priority: string
  }>
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Real-time notifications integration
  const { 
    notifications, 
    connectionStatus, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    requestNotificationPermission 
  } = useRealtimeNotifications('client-portal')

  useEffect(() => {
    loadDashboard()
    // Request notification permission on first load
    requestNotificationPermission()
  }, [])

  // Auto-refresh dashboard when relevant notifications arrive
  useEffect(() => {
    const relevantNotifications = notifications.filter(notif => 
      notif.type === 'order_status_change' || 
      notif.type === 'design_approval_needed' ||
      notif.type === 'production_update'
    )
    
    if (relevantNotifications.length > 0) {
      // Refresh dashboard data automatically
      loadDashboard()
    }
  }, [notifications])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client-portal/dashboard')
      
      if (response.ok) {
        const data = await response.json()
        setDashboard(data.dashboard)
      } else if (response.status === 401) {
        router.push('/client-portal/login')
      } else {
        setError('Failed to load dashboard')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/client-portal/auth', { method: 'DELETE' })
      router.push('/client-portal/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'INTAKE': 'bg-blue-500',
      'DESIGN_PENDING': 'bg-purple-500',
      'DESIGN_APPROVAL': 'bg-yellow-500',
      'PRODUCTION_PLANNED': 'bg-indigo-500',
      'IN_PROGRESS': 'bg-orange-500',
      'QC': 'bg-red-500',
      'PACKING': 'bg-green-500',
      'READY_FOR_DELIVERY': 'bg-teal-500',
      'DELIVERED': 'bg-emerald-500',
      'CLOSED': 'bg-gray-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* TikTok-Style Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    ASH AI Client Portal
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Professional Manufacturing Partner</p>
                </div>
              </div>
              <div className="hidden lg:block">
                <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200 text-xs font-medium">
                  <Circle className="w-2 h-2 mr-1.5 fill-current" />
                  Welcome, {dashboard.client.name}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Real-time connection status */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100/70 text-xs font-medium">
                {connectionStatus.connected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700">Live</span>
                  </>
                ) : connectionStatus.reconnecting ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-yellow-500 animate-spin" />
                    <span className="text-yellow-600">Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>

              {/* Notifications button */}
              <Button variant="ghost" size="sm" className="relative hover:bg-teal-50 transition-colors" onClick={markAllAsRead}>
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </Button>

              <Button variant="ghost" size="sm" className="hover:bg-blue-50 transition-colors">
                <Settings className="w-4 h-4 text-gray-600" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-red-50 transition-colors" onClick={handleLogout}>
                <LogOut className="w-4 h-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with proper padding for fixed header */}
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TikTok-Style Real-time Notifications Banner */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-blue-200/50 shadow-xl shadow-blue-100/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Live Updates</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-blue-600 hover:bg-blue-50 rounded-xl font-medium"
                  >
                    Mark all read
                  </Button>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {notifications.slice(0, 3).map((notification) => (
                    <div 
                      key={notification.id}
                      className={`flex items-start space-x-4 p-4 rounded-xl transition-all hover:shadow-md ${
                        notification.read ? 'bg-gray-50/70' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                        notification.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                        notification.priority === 'normal' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length > 3 && (
                    <div className="text-center pt-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-medium">
                        +{notifications.length - 3} more updates
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TikTok-Style Overview Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Orders</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.overview.total_orders}</span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
                {dashboard.overview.active_orders} active
              </Badge>
              <span className="text-xs text-green-600 font-medium">+12% this month</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FileImage className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending Approvals</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.overview.pending_approvals}</span>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs font-medium">
                Designs awaiting
              </Badge>
              <span className="text-xs text-yellow-600 font-medium">Urgent review</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On-Time Delivery</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.insights.on_time_delivery_rate}%</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium">
                Excellent rate
              </Badge>
              <span className="text-xs text-green-600 font-medium">Above target</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgent Items</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.overview.urgent_tasks}</span>
                  <Star className="w-4 h-4 text-red-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-medium">
                Need attention
              </Badge>
              <span className="text-xs text-red-600 font-medium">High priority</span>
            </div>
          </div>
        </div>

        {/* TikTok-Style Tabs Navigation */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-2 mb-8">
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-transparent gap-2 p-0">
              <TabsTrigger 
                value="orders" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
              >
                <Package className="w-4 h-4" />
                My Orders
              </TabsTrigger>
              <TabsTrigger 
                value="approvals" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium relative"
              >
                <FileImage className="w-4 h-4" />
                Design Approvals
                {dashboard.overview.pending_approvals > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">{dashboard.overview.pending_approvals}</span>
                  </div>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                Insights
              </TabsTrigger>
            </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="grid gap-4">
              {dashboard.recent_orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.po_number}</CardTitle>
                        <CardDescription>
                          {order.brand} • {order.product_type} • {order.total_qty} pieces
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status) + ' text-white'}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{order.progress_percentage}%</span>
                      </div>
                      <Progress value={order.progress_percentage} />
                    </div>

                    {/* Current Step */}
                    {order.next_milestone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {order.next_milestone}
                      </div>
                    )}

                    {/* Design Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span>Design Status:</span>
                      <span className={
                        order.design_status.includes('Pending') ? 'text-yellow-600' :
                        order.design_status.includes('Approved') ? 'text-green-600' :
                        order.design_status.includes('Revision') ? 'text-red-600' :
                        'text-muted-foreground'
                      }>
                        {order.design_status}
                      </span>
                    </div>

                    {/* Delivery Date */}
                    <div className="flex items-center justify-between text-sm">
                      <span>Delivery Date:</span>
                      <span className={
                        new Date(order.target_delivery_date) < new Date() ? 'text-red-600' : ''
                      }>
                        {new Date(order.target_delivery_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      {order.design_status.includes('Pending') && (
                        <Button size="sm" variant="outline">
                          <Palette className="w-4 h-4 mr-1" />
                          Review Designs
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dashboard.recent_orders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No orders found</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Design Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            <div className="grid gap-4">
              {dashboard.pending_approvals.map((approval) => (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{approval.file_name}</CardTitle>
                        <CardDescription>
                          {approval.order_po} • {approval.brand} • Version {approval.version}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Uploaded {Math.floor((Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago</span>
                      <span className="capitalize">{approval.type}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Review Design
                      </Button>
                      <Button size="sm" variant="outline">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Quick Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dashboard.pending_approvals.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending design approvals</p>
                  <p className="text-sm">All designs are up to date!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dashboard.insights.status_distribution).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm">{status.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">On Time</span>
                      <span className="text-sm font-medium text-green-600">
                        {dashboard.insights.delivery_performance.on_time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Early</span>
                      <span className="text-sm font-medium text-blue-600">
                        {dashboard.insights.delivery_performance.early}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Delayed</span>
                      <span className="text-sm font-medium text-red-600">
                        {dashboard.insights.delivery_performance.delayed}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common actions based on your current orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dashboard.quick_actions.map((action, index) => (
                    <Button key={index} variant="outline" className="h-auto p-4 flex-col">
                      <div className="text-lg font-semibold">{action.count}</div>
                      <div className="text-sm text-center">{action.title}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
        </div>
      </div>
    </div>
  )
}