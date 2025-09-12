// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  CreditCard, 
  RefreshCw,
  Calendar,
  MapPin,
  Star,
  MessageCircle,
  Download,
  Eye,
  ShoppingCart,
  BarChart3
} from 'lucide-react'

interface ClientSession {
  client_id: string
  workspace_id: string
  client_name: string
  expires_at: string
}

interface DashboardData {
  orders: {
    total: number
    active: number
    completed: number
    pending_approval: number
  }
  payments: {
    total_outstanding: number
    overdue_amount: number
    paid_this_month: number
  }
  recent_orders: Array<{
    id: string
    po_number: string
    product_type: string
    status: string
    progress_percent: number
    total_value: number
    target_delivery: string
  }>
  recommended_products: Array<{
    id: string
    name: string
    description: string
    base_price: number
    popularity_score: number
    estimated_days: number
  }>
  notifications: Array<{
    id: string
    type: 'order_update' | 'payment_due' | 'approval_needed' | 'delivery'
    title: string
    message: string
    created_at: string
    is_read: boolean
  }>
}

export default function ClientDashboard() {
  const router = useRouter()
  const [session, setSession] = useState<ClientSession | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check authentication
    const sessionData = localStorage.getItem('client_session')
    
    if (!sessionData) {
      router.push('/portal/request-access')
      return
    }

    try {
      const parsed = JSON.parse(sessionData) as ClientSession
      
      // Check if session expired
      if (new Date(parsed.expires_at) < new Date()) {
        localStorage.removeItem('client_session')
        router.push('/portal/request-access')
        return
      }

      setSession(parsed)
      fetchDashboardData(parsed)
    } catch (err) {
      console.error('Invalid session data:', err)
      localStorage.removeItem('client_session')
      router.push('/portal/request-access')
    }
  }, [router])

  const fetchDashboardData = async (session: ClientSession) => {
    try {
      const response = await fetch(`/api/portal/dashboard?client_id=${session.client_id}&workspace_id=${session.workspace_id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'INTAKE': 'bg-blue-100 text-blue-800',
      'DESIGN_PENDING': 'bg-yellow-100 text-yellow-800',
      'PRODUCTION_PLANNED': 'bg-purple-100 text-purple-800',
      'IN_PROGRESS': 'bg-orange-100 text-orange-800',
      'QC': 'bg-indigo-100 text-indigo-800',
      'PACKING': 'bg-cyan-100 text-cyan-800',
      'READY_FOR_DELIVERY': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-emerald-100 text-emerald-800',
      'COMPLETED': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {session?.client_name}
              </h1>
              <p className="text-gray-600">
                Track your orders, manage payments, and discover new products
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => router.push('/portal/orders')}>
                <Package className="h-4 w-4 mr-2" />
                View All Orders
              </Button>
              <Button onClick={() => router.push('/portal/new-order')}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Orders</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {dashboardData?.orders.active || 0}
                  </p>
                </div>
                <Package className="h-12 w-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-green-600">
                    {dashboardData?.orders.total || 0}
                  </p>
                </div>
                <BarChart3 className="h-12 w-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(dashboardData?.payments.total_outstanding || 0)}
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid This Month</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(dashboardData?.payments.paid_this_month || 0)}
                  </p>
                </div>
                <CreditCard className="h-12 w-12 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="recommendations">Recommended</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Track the progress of your current orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.recent_orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">#{order.po_number}</h4>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.product_type} • {formatCurrency(order.total_value)}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Progress value={order.progress_percent} className="flex-1" />
                          <span className="text-sm text-gray-500">
                            {order.progress_percent}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Products</CardTitle>
                <CardDescription>
                  Based on your order history and trending items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData?.recommended_products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">
                            {product.popularity_score}/5
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-600">
                            Starting at {formatCurrency(product.base_price)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.estimated_days} days production
                          </p>
                        </div>
                        <Button size="sm">
                          Order Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
                <CardDescription>
                  Manage your payments and billing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800">Overdue</h4>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(dashboardData?.payments.overdue_amount || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-800">Outstanding</h4>
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(dashboardData?.payments.total_outstanding || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Paid This Month</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(dashboardData?.payments.paid_this_month || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Make Payment
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Statements
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  Stay updated with order progress and important messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 border rounded-lg ${!notification.is_read ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
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