// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Brain,
  Package,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Truck,
  Eye,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Activity,
  LogOut,
  Star,
  Settings
} from 'lucide-react'

interface ClientSession {
  client_id: string
  workspace_id: string
  expires_at: string
}

interface Order {
  id: string
  po_number: string
  product_type: string
  method: string
  total_qty: number
  status: string
  target_delivery_date: string
  created_at: string
  brand: {
    name: string
  }
  routing_steps: Array<{
    id: string
    name: string
    workcenter: string
    sequence: number
    status: string
  }>
}

export default function ClientOrders() {
  const router = useRouter()
  const [session, setSession] = useState<ClientSession | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

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
      fetchOrders(parsed.client_id)
    } catch (error) {
      console.error('Invalid session data:', error)
      router.push('/portal/request-access')
    }
  }, [router])

  const fetchOrders = async (client_id: string) => {
    try {
      const response = await fetch(`/api/portal/orders?client_id=${client_id}`)
      const data = await response.json()

      if (data.success) {
        setOrders(data.orders)
        setFilteredOrders(data.orders)
      } else {
        setError(data.error || 'Failed to fetch orders')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders
    
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }
    
    setFilteredOrders(filtered)
  }, [orders, searchQuery, statusFilter])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'INTAKE': 'bg-yellow-100 text-yellow-800',
      'DESIGN_PENDING': 'bg-blue-100 text-blue-800',
      'DESIGN_APPROVAL': 'bg-purple-100 text-purple-800',
      'PRODUCTION_PLANNED': 'bg-indigo-100 text-indigo-800',
      'IN_PROGRESS': 'bg-orange-100 text-orange-800',
      'QC': 'bg-cyan-100 text-cyan-800',
      'PACKING': 'bg-green-100 text-green-800',
      'READY_FOR_DELIVERY': 'bg-emerald-100 text-emerald-800',
      'DELIVERED': 'bg-gray-100 text-gray-800',
      'CLOSED': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStepStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PLANNED': 'text-gray-400',
      'READY': 'text-blue-600',
      'IN_PROGRESS': 'text-orange-600',
      'DONE': 'text-green-600',
      'BLOCKED': 'text-red-600'
    }
    return colors[status] || 'text-gray-400'
  }

  const getProgressPercentage = (order: Order) => {
    const totalSteps = order.routing_steps.length
    const completedSteps = order.routing_steps.filter(step => step.status === 'DONE').length
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 animate-pulse">
            <Package className="w-8 h-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* TikTok-Style Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    My Orders
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Track Production Progress</p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 text-xs font-medium">
                <Activity className="w-3 h-3 mr-1" />
                {filteredOrders.length} orders
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="hover:bg-blue-50 transition-colors" onClick={() => router.push('/portal/dashboard')}>
                <BarChart3 className="w-4 h-4 text-gray-600" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-gray-50 transition-colors">
                <Settings className="w-4 h-4 text-gray-600" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="hover:bg-red-50 transition-colors"
                onClick={() => {
                  localStorage.removeItem('client_session')
                  router.push('/portal/request-access')
                }}
              >
                <LogOut className="w-4 h-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with proper padding for fixed header */}
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* TikTok-Style Search and Filter Bar */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search orders, brands, products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all appearance-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="INTAKE">Intake</option>
                  <option value="DESIGN_PENDING">Design Pending</option>
                  <option value="DESIGN_APPROVAL">Design Approval</option>
                  <option value="PRODUCTION_PLANNED">Production Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="QC">Quality Control</option>
                  <option value="PACKING">Packing</option>
                  <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-center space-x-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                  <p className="text-xs text-gray-500 font-medium">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {orders.filter(o => o.status === 'IN_PROGRESS').length}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {orders.filter(o => o.status === 'DELIVERED').length}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Delivered</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 backdrop-blur-xl shadow-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Orders Grid */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'ALL' ? 'Try adjusting your search or filters' : 'Your orders will appear here once created'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                  
                  {/* TikTok-Style Order Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <Package className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{order.po_number}</h3>
                          <p className="text-gray-600 font-medium">
                            {order.brand.name} • {order.product_type}
                          </p>
                          <div className="flex items-center space-x-3 mt-2">
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
                              {order.total_qty} pieces
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs font-medium">
                              {order.method}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                          order.status === 'DELIVERED' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                          order.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' :
                          order.status === 'READY_FOR_DELIVERY' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' :
                          order.status === 'QC' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' :
                          'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          {getProgressPercentage(order)}% Complete
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Production Progress</span>
                        <span className="text-sm font-bold text-gray-900">{getProgressPercentage(order)}%</span>
                      </div>
                      <Progress 
                        value={getProgressPercentage(order)} 
                        className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner"
                      />
                    </div>

                    {/* Production Timeline - TikTok Style */}
                    <div className="space-y-3 mb-6">
                      {order.routing_steps.slice(0, 4).map((step, index) => (
                        <div key={step.id} className="flex items-center space-x-4 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 transition-colors">
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                              step.status === 'DONE' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              step.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                              step.status === 'READY' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              step.status === 'BLOCKED' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                              'bg-gradient-to-r from-gray-400 to-gray-500'
                            }`}>
                              {step.status === 'DONE' ? (
                                <CheckCircle className="w-4 h-4 text-white" />
                              ) : step.status === 'IN_PROGRESS' ? (
                                <Play className="w-4 h-4 text-white" />
                              ) : step.status === 'BLOCKED' ? (
                                <AlertCircle className="w-4 h-4 text-white" />
                              ) : (
                                <Clock className="w-4 h-4 text-white" />
                              )}
                            </div>
                            {index < order.routing_steps.slice(0, 4).length - 1 && (
                              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gray-300"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{step.name}</p>
                                <p className="text-xs text-gray-500">{step.workcenter}</p>
                              </div>
                              <Badge className={`text-xs font-medium ${
                                step.status === 'DONE' ? 'bg-green-100 text-green-700 border-green-200' :
                                step.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                step.status === 'READY' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                step.status === 'BLOCKED' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {step.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {order.routing_steps.length > 4 && (
                        <div className="text-center">
                          <Badge variant="outline" className="text-xs">
                            +{order.routing_steps.length - 4} more steps
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Order Details Footer */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Created</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Target Delivery</p>
                            <p className={`text-sm font-semibold ${
                              new Date(order.target_delivery_date) < new Date() ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {new Date(order.target_delivery_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">On Track</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}