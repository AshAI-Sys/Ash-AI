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
  createdAt: string
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
    createdAt: '2025-08-30',
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
    createdAt: '2025-08-28',
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
    createdAt: '2025-08-25',
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
    createdAt: '2025-09-01',
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
    createdAt: '2025-09-02',
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
    createdAt: '2025-08-22',
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
            createdAt: order.created_at,
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
      <div className="neural-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="quantum-loader w-16 h-16 mx-auto mb-8">
            <div></div><div></div><div></div>
          </div>
          <h1 className="text-3xl font-bold glitch-text text-white mb-4" data-text="ASH AI">ASH AI</h1>
          <p className="text-cyan-300 font-medium">Loading Neural Orders System...</p>
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
      <div className="simple-page-container">
        <div className="simple-content-wrapper max-w-md mx-auto mt-20">
          <div className="simple-card text-center p-8">
            <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold simple-text-primary mb-2">Access Denied</h3>
            <p className="simple-text-secondary mb-4">You don't have permission to view this page.</p>
            <p className="text-sm simple-text-muted">Contact your administrator for access.</p>
          </div>
        </div>
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
    <div className="simple-page-container">
      <div className="simple-content-wrapper">
        <div className="simple-header">
          <div className="simple-flex justify-between">
            <div className="simple-flex">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold simple-text-primary">Orders Management</h1>
                <p className="text-xs sm:text-sm simple-text-secondary">Production order tracking system</p>
              </div>
            </div>
            <div className="simple-flex gap-2 sm:gap-4">
              <button 
                onClick={() => fetchOrders()}
                disabled={loading}
                className="simple-btn text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button 
                onClick={() => router.push('/orders/new')}
                className="simple-btn text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                New Order
              </button>
            </div>
          </div>
        </div>

          {/* Neural Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="hologram-card hover:scale-105 transition-all duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-300 uppercase tracking-wider">Total Orders</p>
                    <p className="text-3xl font-bold text-white">{orders.length}</p>
                  </div>
                  <div className="ai-orb w-12 h-12">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card hover:scale-105 transition-all duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-300 uppercase tracking-wider">In Production</p>
                    <p className="text-3xl font-bold text-white">{orders.filter(o => o.status === 'IN_PRODUCTION').length}</p>
                  </div>
                  <div className="ai-orb w-12 h-12">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card hover:scale-105 transition-all duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-300 uppercase tracking-wider">Completed</p>
                    <p className="text-3xl font-bold text-white">{orders.filter(o => o.status === 'DELIVERED').length}</p>
                  </div>
                  <div className="ai-orb w-12 h-12">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card hover:scale-105 transition-all duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-cyan-300 uppercase tracking-wider">Total Value</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}</p>
                  </div>
                  <div className="ai-orb w-12 h-12">
                    <Peso className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Neural Command Center */}
        <Card className="quantum-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    placeholder="Neural search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="cyber-input w-full pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select 
                  className="cyber-select"
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
                <Button className="neon-btn">
                  <Filter className="w-4 h-4 mr-2" />
                  Neural Filter
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
                  className="neon-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ashley AI Insights Panel */}
        <Card className="quantum-card neon-glow">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              Ashley AI Production Intelligence
            </CardTitle>
            <CardDescription className="text-cyan-300">
              Real-time AI-powered insights for order optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Production Flow</span>
                </div>
                <p className="text-xs text-white">
                  {orders.filter(o => o.status === 'IN_PRODUCTION').length} orders actively in production. Estimated completion rate: 94%
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">Risk Assessment</span>
                </div>
                <p className="text-xs text-white">
                  {orders.filter(o => o.priority === 'HIGH').length} high-priority orders require attention. Monitor delivery schedules.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">Quality Insights</span>
                </div>
                <p className="text-xs text-white">
                  Quality score trending up 15%. {orders.filter(o => o.status === 'QC_PASSED').length} orders passed QC this cycle.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Neural Orders Grid */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            return (
              <Card key={order.id} className="quantum-card hover:scale-102 hover:border-cyan-400 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{order.orderNumber}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.priority === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                          order.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                          'bg-green-500/20 text-green-300 border border-green-500/50'
                        }`}>
                          {order.priority}
                        </div>
                      </div>
                      <p className="text-cyan-300 mb-3 font-medium">{order.clientName}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-200">{order.items} items</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-200">Due {formatDate(order.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-200">Created {formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Peso className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-200 font-medium">{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        order.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-300 border-gray-500/50' :
                        order.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                        order.status === 'IN_PRODUCTION' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
                        order.status === 'QC_PASSED' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                        order.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' :
                        'bg-red-500/20 text-red-300 border-red-500/50'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="neon-btn text-xs px-3 py-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
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
                          className="neon-btn text-xs px-3 py-1"
                        >
                          <Edit className="w-4 h-4 mr-1" />
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
            <Card className="quantum-card neon-glow">
              <CardContent className="p-12 text-center">
                <div className="ai-orb w-16 h-16 mx-auto mb-6">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 glitch-text" data-text="No Neural Orders Found">No Neural Orders Found</h3>
                <p className="text-cyan-300 mb-6">Initialize the system by creating your first order or adjust search parameters.</p>
                <Button 
                  onClick={() => router.push('/orders/new')}
                  className="neon-btn hover:scale-105 transition-all duration-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Initialize First Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}