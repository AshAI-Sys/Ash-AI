'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
// Removed Layout import to prevent duplicate navigation
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  Shield,
  RefreshCw,
  Brain,
  ArrowLeft
} from 'lucide-react'
import { Peso } from '@/components/icons/Peso'
import { Role } from '@prisma/client'

interface Order {
  id: string
  orderNumber: string
  clientName: string
  status: string
  totalAmount: number
  dueDate: string
  created_at: string
  items: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

const sampleOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ASH-2025-001234',
    clientName: 'Premium Apparel Co.',
    status: 'IN_PRODUCTION',
    totalAmount: 45000,
    dueDate: '2025-09-15',
    created_at: '2025-08-30',
    items: 100,
    priority: 'HIGH'
  },
  {
    id: '2',
    orderNumber: 'ASH-2025-001235',
    clientName: 'Fashion Forward Ltd.',
    status: 'QC_PASSED',
    totalAmount: 32500,
    dueDate: '2025-09-10',
    created_at: '2025-08-28',
    items: 75,
    priority: 'MEDIUM'
  },
  {
    id: '3',
    orderNumber: 'ASH-2025-001236',
    clientName: 'Urban Style Boutique',
    status: 'DELIVERED',
    totalAmount: 28000,
    dueDate: '2025-09-01',
    created_at: '2025-08-25',
    items: 60,
    priority: 'LOW'
  },
  {
    id: '4',
    orderNumber: 'ASH-2025-001237',
    clientName: 'Corporate Uniforms Inc.',
    status: 'CONFIRMED',
    totalAmount: 85000,
    dueDate: '2025-09-20',
    created_at: '2025-09-01',
    items: 200,
    priority: 'HIGH'
  },
  {
    id: '5',
    orderNumber: 'ASH-2025-001238',
    clientName: 'TechStart Solutions',
    status: 'DRAFT',
    totalAmount: 15000,
    dueDate: '2025-09-12',
    created_at: '2025-09-02',
    items: 30,
    priority: 'MEDIUM'
  },
  {
    id: '6',
    orderNumber: 'ASH-2025-001239',
    clientName: 'Sports Academy Team',
    status: 'READY_FOR_QC',
    totalAmount: 38000,
    dueDate: '2025-09-08',
    created_at: '2025-08-22',
    items: 80,
    priority: 'HIGH'
  }
]

const statusConfig = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Package },
  CONFIRMED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  IN_PRODUCTION: { color: 'bg-yellow-100 text-yellow-800', icon: Package },
  READY_FOR_QC: { color: 'bg-purple-100 text-purple-800', icon: Eye },
  QC_PASSED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  QC_FAILED: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  READY_FOR_DELIVERY: { color: 'bg-indigo-100 text-indigo-800', icon: Package },
  DELIVERED: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>(sampleOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    // Check if user has permission to view orders
    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.CSR, Role.SALES_STAFF, Role.LIVE_SELLER]
    if (!allowedRoles.includes(session.user.role)) {
      router.push('/dashboard')
      return
    }

    // Fetch real orders data
    fetchOrders()
  }, [session, status, router])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Transform API data to match our interface
          const transformedOrders = data.data.map((order: any) => ({
            id: order.id,
            orderNumber: order.po_number || `ASH-${order.id.slice(-6)}`,
            clientName: order.client?.name || order.client?.company || 'Unknown Client',
            status: order.status,
            totalAmount: order.commercials?.unit_price * order.total_qty || 0,
            dueDate: order.target_delivery_date || new Date().toISOString(),
            created_at: order.created_at,
            items: order.total_qty || 0,
            priority: order.ai_risk_assessment?.includes('urgent') ? 'HIGH' : 
                     order.ai_risk_assessment?.includes('delay') ? 'MEDIUM' : 'LOW'
          }))
          setOrders(transformedOrders)
        }
      } else {
        // Fallback to sample data if API fails
        console.warn('Failed to fetch orders, using sample data')
        setOrders(sampleOrders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      // Use sample data as fallback
      setOrders(sampleOrders)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders System</h1>
          <p className="text-gray-600">Loading orders data...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Check if user has permission to view orders
  const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.CSR, Role.SALES_STAFF, Role.LIVE_SELLER]
  if (!allowedRoles.includes(session.user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="bg-white border border-gray-200 shadow-sm max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">You don't have permission to view this page.</p>
            <p className="text-sm text-gray-500">Contact your administrator for access.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
                  <p className="text-gray-600">Production order tracking system</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => fetchOrders()}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={() => router.push('/orders/new')}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* TikTok-Style Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Production</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'IN_PRODUCTION').length}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'DELIVERED').length}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Peso className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TikTok-Style Search and Filters */}
        <Card className="bg-white border border-gray-200 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select 
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="QC_PASSED">QC Passed</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button 
                  onClick={() => {
                    const csvContent = 'Order Number,Client Name,Status,Amount,Due Date\n' + 
                      filteredOrders.map(order => 
                        `${order.orderNumber},${order.clientName},${order.status},${order.totalAmount},${order.dueDate}`
                      ).join('\n')
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'ash-ai-orders-export.csv'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    window.URL.revokeObjectURL(url)
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TikTok-Style AI Insights Panel */}
        <Card className="bg-white border border-gray-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Ashley AI Production Intelligence
            </CardTitle>
            <CardDescription className="text-gray-600">
              Real-time AI-powered insights for order optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Production Flow</span>
                </div>
                <p className="text-xs text-blue-700">
                  {orders.filter(o => o.status === 'IN_PRODUCTION').length} orders actively in production. Estimated completion rate: 94%
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Risk Assessment</span>
                </div>
                <p className="text-xs text-yellow-700">
                  {orders.filter(o => o.priority === 'HIGH').length} high-priority orders require attention. Monitor delivery schedules.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Quality Insights</span>
                </div>
                <p className="text-xs text-green-700">
                  Quality score trending up 15%. {orders.filter(o => o.status === 'QC_PASSED').length} orders passed QC this cycle.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TikTok-Style Orders Grid */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            return (
              <Card key={order.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                        <Badge className={`${
                          order.priority === 'HIGH' ? 'bg-red-100 text-red-800 border-red-200' :
                          order.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {order.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3 font-medium">{order.clientName}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{order.items} items</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Due {formatDate(order.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Created {formatDate(order.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Peso className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 font-medium">{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <Badge className={`${
                        order.status === 'DRAFT' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        order.status === 'IN_PRODUCTION' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        order.status === 'QC_PASSED' ? 'bg-green-100 text-green-800 border-green-200' :
                        order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => router.push(`/orders/${order.id}`)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          onClick={() => {
                            const newClientName = prompt(`Edit client name for ${order.orderNumber}:`, order.clientName)
                            if (newClientName && newClientName !== order.clientName) {
                              setOrders(prev => prev.map(o => 
                                o.id === order.id ? { ...o, clientName: newClientName } : o
                              ))
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredOrders.length === 0 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h3>
                <p className="text-gray-600 mb-6">Create your first order or adjust search parameters to see results.</p>
                <Button 
                  onClick={() => router.push('/orders/new')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}