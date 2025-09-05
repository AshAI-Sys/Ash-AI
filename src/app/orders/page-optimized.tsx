'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useOptimizedOrders } from '@/hooks/useOptimizedOrders'
import { OrdersLoadingState, LoadingSpinner, RefreshButton, ProgressBar } from '@/components/LoadingStates'
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { Role } from '@prisma/client'

const statusConfig = {
  DRAFT: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    bgColor: 'bg-gray-500/10',
    icon: Package,
    label: 'Draft'
  },
  CONFIRMED: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    bgColor: 'bg-blue-500/10',
    icon: CheckCircle,
    label: 'Confirmed'
  },
  IN_PRODUCTION: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    bgColor: 'bg-yellow-500/10',
    icon: Package,
    label: 'In Production'
  },
  READY_FOR_QC: { 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    bgColor: 'bg-purple-500/10',
    icon: Eye,
    label: 'Ready for QC'
  },
  QC_PASSED: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    bgColor: 'bg-green-500/10',
    icon: CheckCircle,
    label: 'QC Passed'
  },
  QC_FAILED: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    bgColor: 'bg-red-500/10',
    icon: AlertTriangle,
    label: 'QC Failed'
  },
  READY_FOR_DELIVERY: { 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200', 
    bgColor: 'bg-indigo-500/10',
    icon: Package,
    label: 'Ready for Delivery'
  },
  DELIVERED: { 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
    bgColor: 'bg-emerald-500/10',
    icon: CheckCircle,
    label: 'Delivered'
  },
  CANCELLED: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    bgColor: 'bg-red-500/10',
    icon: AlertTriangle,
    label: 'Cancelled'
  }
}

const priorityConfig = {
  HIGH: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  MEDIUM: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  LOW: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
}

export default function OrdersPageOptimized() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  const {
    orders,
    filteredOrders,
    loading,
    error,
    searchTerm,
    statusFilter,
    currentPage,
    totalPages,
    itemsPerPage,
    setSearchTerm,
    setStatusFilter,
    setCurrentPage,
    setItemsPerPage,
    refreshOrders
  } = useOptimizedOrders()

  // Session check with loading state
  if (status === 'loading') {
    return <OrdersLoadingState />
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  // Permission check
  const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.CSR, Role.SALES_STAFF, Role.LIVE_SELLER]
  if (!allowedRoles.includes(session.user.role)) {
    router.push('/dashboard')
    return null
  }

  // Handle refresh with timestamp update
  const handleRefresh = async () => {
    await refreshOrders()
    setLastRefresh(new Date())
  }

  // Calculate stats from orders
  const stats = useMemo(() => {
    const total = orders.length
    const inProduction = orders.filter(o => o.status === 'IN_PRODUCTION').length
    const completed = orders.filter(o => o.status === 'DELIVERED').length
    const urgent = orders.filter(o => o.priority === 'HIGH').length
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)

    return {
      total,
      inProduction,
      completed,
      urgent,
      totalRevenue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [orders])

  // Paginated orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredOrders.slice(startIndex, endIndex)
  }, [filteredOrders, currentPage, itemsPerPage])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get days until due
  const getDaysUntilDue = (dueDateString: string) => {
    const due = new Date(dueDateString)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold glitch-text text-white mb-2" data-text="Orders Management">
                Orders Management
              </h1>
              <p className="text-cyan-300">
                {loading ? 'Loading orders...' : `${filteredOrders.length} of ${orders.length} orders`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <RefreshButton 
                onRefresh={handleRefresh}
                loading={loading}
                lastUpdated={lastRefresh}
              />
              <Button className="neon-btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="quantum-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-sm font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{loading ? '...' : stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            
            <div className="quantum-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-sm font-medium">In Production</p>
                  <p className="text-2xl font-bold text-white">{loading ? '...' : stats.inProduction}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="quantum-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-sm font-medium">Completed</p>
                  <p className="text-2xl font-bold text-white">{loading ? '...' : stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="quantum-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-sm font-medium">Urgent</p>
                  <p className="text-2xl font-bold text-white">{loading ? '...' : stats.urgent}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <div className="quantum-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-sm font-medium">Revenue</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? '...' : formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Completion Rate Progress */}
          <div className="quantum-card p-6 mb-6">
            <ProgressBar 
              progress={stats.completionRate}
              text={`Order Completion Rate: ${stats.completionRate}%`}
              variant={stats.completionRate > 80 ? 'success' : stats.completionRate > 60 ? 'warning' : 'error'}
            />
          </div>

          {/* Search and Filters */}
          <div className="quantum-card p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search orders by number, client, or status..."
                  className="cyber-input pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cyber-select w-48"
              >
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>

              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="cyber-select w-32"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="quantum-card p-6 mb-6 border-red-500/50">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span>Error: {error}</span>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="quantum-card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner 
                  size="lg" 
                  text="Loading orders..." 
                  variant="orders"
                />
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-cyan-400/50 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No orders found</h3>
                <p className="text-cyan-300">
                  {searchTerm || statusFilter ? 
                    'Try adjusting your search or filter criteria' :
                    'Start by creating your first order'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-cyan-500/20">
                        <th className="text-left p-4 text-cyan-300 font-semibold">Order #</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Client</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Status</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Items</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Amount</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Due Date</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Priority</th>
                        <th className="text-left p-4 text-cyan-300 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order, index) => {
                        const daysUntilDue = getDaysUntilDue(order.dueDate)
                        const isUrgent = daysUntilDue <= 3
                        const statusInfo = statusConfig[order.status as keyof typeof statusConfig]
                        const priorityInfo = priorityConfig[order.priority]
                        
                        return (
                          <tr 
                            key={order.id}
                            className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                            style={{
                              animationDelay: `${index * 0.05}s`
                            }}
                          >
                            <td className="p-4">
                              <div className="font-mono text-white">{order.orderNumber}</div>
                              <div className="text-xs text-cyan-400">
                                Created {formatDate(order.createdAt)}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-white">{order.clientName}</div>
                            </td>
                            <td className="p-4">
                              <Badge className={`${statusInfo?.color} border`}>
                                {statusInfo?.label || order.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="text-white">{order.items}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-white">
                                {formatCurrency(order.totalAmount)}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className={`text-white ${isUrgent ? 'text-red-400' : ''}`}>
                                {formatDate(order.dueDate)}
                              </div>
                              <div className={`text-xs ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`}>
                                {daysUntilDue > 0 ? 
                                  `${daysUntilDue} days left` : 
                                  daysUntilDue === 0 ? 'Due today' : 
                                  `${Math.abs(daysUntilDue)} days overdue`
                                }
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className={`${priorityInfo.color} border`}>
                                {order.priority}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="neon-btn-ghost">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="neon-btn-ghost">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {paginatedOrders.map((order, index) => {
                    const daysUntilDue = getDaysUntilDue(order.dueDate)
                    const isUrgent = daysUntilDue <= 3
                    const statusInfo = statusConfig[order.status as keyof typeof statusConfig]
                    const priorityInfo = priorityConfig[order.priority]
                    
                    return (
                      <div 
                        key={order.id}
                        className="border border-cyan-500/20 rounded-lg p-4 hover:bg-cyan-500/5 transition-colors"
                        style={{
                          animationDelay: `${index * 0.05}s`
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-mono text-white font-semibold">{order.orderNumber}</div>
                            <div className="text-sm text-cyan-300">{order.clientName}</div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={`${statusInfo?.color} border text-xs`}>
                              {statusInfo?.label}
                            </Badge>
                            <Badge className={`${priorityInfo.color} border text-xs`}>
                              {order.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-cyan-400">Items:</span>
                            <span className="text-white ml-2">{order.items}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400">Amount:</span>
                            <span className="text-white ml-2">{formatCurrency(order.totalAmount)}</span>
                          </div>
                          <div>
                            <span className="text-cyan-400">Due:</span>
                            <span className={`ml-2 ${isUrgent ? 'text-red-400' : 'text-white'}`}>
                              {formatDate(order.dueDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-cyan-400">Days left:</span>
                            <span className={`ml-2 ${isUrgent ? 'text-red-400' : 'text-white'}`}>
                              {daysUntilDue > 0 ? daysUntilDue : 'Overdue'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="ghost" size="sm" className="neon-btn-ghost">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm" className="neon-btn-ghost">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-cyan-500/20">
                    <div className="text-sm text-cyan-300">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of{' '}
                      {filteredOrders.length} orders
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="neon-btn-ghost"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={currentPage === page ? 'neon-btn-primary' : 'neon-btn-ghost'}
                            >
                              {page}
                            </Button>
                          )
                        })}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="neon-btn-ghost"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}