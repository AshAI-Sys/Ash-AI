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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">ASH AI Portal</span>
              </div>
              <div className="hidden md:block text-sm text-gray-500">
                Welcome, {dashboard.client.name}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Real-time connection status */}
              <div className="hidden md:flex items-center space-x-2 text-xs">
                {connectionStatus.connected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">Live</span>
                  </>
                ) : connectionStatus.reconnecting ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-yellow-500 animate-spin" />
                    <span className="text-yellow-600">Connecting...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-500" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>

              {/* Notifications button */}
              <Button variant="ghost" size="sm" className="relative" onClick={markAllAsRead}>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>

              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Real-time Notifications Banner */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-900">
                    Real-time Updates
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {notifications.slice(0, 3).map((notification) => (
                    <div 
                      key={notification.id}
                      className={`flex items-start space-x-3 p-2 rounded cursor-pointer transition-colors ${
                        notification.read ? 'bg-white/50' : 'bg-white'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Circle 
                        className={`w-2 h-2 mt-1.5 flex-shrink-0 ${
                          notification.priority === 'high' ? 'text-red-500 fill-current' :
                          notification.priority === 'normal' ? 'text-blue-500 fill-current' :
                          'text-gray-400 fill-current'
                        }`} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length > 3 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      {notifications.length - 3} more notifications...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.overview.total_orders}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.overview.active_orders} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboard.overview.pending_approvals}
              </div>
              <p className="text-xs text-muted-foreground">
                Designs awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboard.insights.on_time_delivery_rate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Performance rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Urgent Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboard.overview.urgent_tasks}
              </div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <FileImage className="w-4 h-4" />
              Design Approvals
              {dashboard.overview.pending_approvals > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {dashboard.overview.pending_approvals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
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
  )
}