// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  FileText
} from 'lucide-react'
import { ModernCard } from './modern/ModernCard'
import { ModernButton } from './modern/ModernButton'
import { ModernInput } from './modern/ModernInput'

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
    orderNumber: 'ORD-001',
    clientName: 'ABC Corporation',
    status: 'IN_PRODUCTION',
    totalAmount: 25000,
    dueDate: '2024-09-05',
    created_at: '2024-08-20',
    items: 50,
    priority: 'HIGH'
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    clientName: 'XYZ Company',
    status: 'QC_PASSED',
    totalAmount: 18500,
    dueDate: '2024-09-03',
    created_at: '2024-08-18',
    items: 35,
    priority: 'MEDIUM'
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    clientName: 'Local Business',
    status: 'DELIVERED',
    totalAmount: 12000,
    dueDate: '2024-08-30',
    created_at: '2024-08-15',
    items: 20,
    priority: 'LOW'
  }
]

const statusConfig = {
  DRAFT: { color: 'bg-gray-500/20 text-gray-400', icon: FileText },
  CONFIRMED: { color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  IN_PRODUCTION: { color: 'bg-yellow-500/20 text-yellow-400', icon: Package },
  READY_FOR_QC: { color: 'bg-purple-500/20 text-purple-400', icon: Eye },
  QC_PASSED: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  QC_FAILED: { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  READY_FOR_DELIVERY: { color: 'bg-indigo-500/20 text-indigo-400', icon: Package },
  DELIVERED: { color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  CANCELLED: { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle }
}

export function ModernOrdersPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>(sampleOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)

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
      case 'HIGH': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Orders Management</h1>
          <p className="text-gray-400">Track and manage your apparel production orders</p>
        </div>
        <ModernButton variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          New Order
        </ModernButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ModernCard className="p-6" hover>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/20">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">156</h3>
            <p className="text-gray-400 text-sm">Total Orders</p>
          </div>
        </ModernCard>

        <ModernCard className="p-6" hover>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-yellow-600/20">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">23</h3>
            <p className="text-gray-400 text-sm">In Production</p>
          </div>
        </ModernCard>

        <ModernCard className="p-6" hover>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/20">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">89</h3>
            <p className="text-gray-400 text-sm">Completed</p>
          </div>
        </ModernCard>

        <ModernCard className="p-6" hover>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-600/20">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">₱2.4M</h3>
            <p className="text-gray-400 text-sm">Total Value</p>
          </div>
        </ModernCard>
      </div>

      {/* Filters */}
      <ModernCard className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <ModernInput
              placeholder="Search orders..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select 
              className="modern-input min-w-[150px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="IN_PRODUCTION">In Production</option>
              <option value="QC_PASSED">QC Passed</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <ModernButton variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
              More Filters
            </ModernButton>
            <ModernButton variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
              Export
            </ModernButton>
          </div>
        </div>
      </ModernCard>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.map((order, index) => {
          const statusInfo = statusConfig[order.status as keyof typeof statusConfig]
          const StatusIcon = statusInfo?.icon || Package

          return (
            <ModernCard 
              key={order.id} 
              className="p-6 hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                    <StatusIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{order.orderNumber}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">{order.clientName}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {order.items} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {formatDate(order.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${statusInfo?.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {order.status.replace(/_/g, ' ')}
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{formatCurrency(order.totalAmount)}</p>
                  </div>

                  <div className="flex gap-2">
                    <ModernButton variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
                      View
                    </ModernButton>
                    <ModernButton variant="ghost" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
                      Edit
                    </ModernButton>
                    <ModernButton variant="ghost" size="sm" leftIcon={<Trash2 className="w-4 h-4" />}>
                      Delete
                    </ModernButton>
                  </div>
                </div>
              </div>
            </ModernCard>
          )
        })}
      </div>

      {filteredOrders.length === 0 && (
        <ModernCard className="p-12">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No orders found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search criteria or create a new order.</p>
            <ModernButton variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create First Order
            </ModernButton>
          </div>
        </ModernCard>
      )}
    </div>
  )
}