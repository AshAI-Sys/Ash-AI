'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ModernLayout from '@/components/ModernLayout'
import { ModernCard } from '@/components/modern/ModernCard'
import { ModernButton } from '@/components/modern/ModernButton'
import { ModernInput } from '@/components/modern/ModernInput'
import { 
  CheckCircle, 
  XCircle, 
  Camera, 
  Eye, 
  AlertTriangle, 
  Star, 
  Activity, 
  Package, 
  User, 
  Calendar, 
  TrendingUp, 
  Image, 
  Images, 
  Shield, 
  BarChart3, 
  Filter, 
  Search, 
  Download, 
  RefreshCw, 
  Clock,
  Plus,
  FileCheck
} from 'lucide-react'
import { Role, TaskStatus } from '@prisma/client'

interface QCItem {
  id: string
  orderNumber: string
  taskId: string
  productName: string
  quantity: number
  clientName: string
  brandName: string
  status: 'PENDING_QC' | 'IN_QC' | 'PASSED' | 'FAILED' | 'PARTIAL_PASS'
  priority: number
  submittedBy: string
  submittedAt: string
  assignedTo?: {
    id: string
    name: string
    role: string
  }
  dueDate?: string | null
  lastQCRecord?: {
    id: string
    status: string
    passedQty: number
    rejectedQty: number
    rejectReason?: string
    notes?: string
    photoUrls?: string[]
    inspector: {
      name: string
    }
    createdAt: string
  } | null
  order: {
    id: string
    quantity: number
    designName: string
    apparelType: string
  }
}

export default function QCPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [qcItems, setQCItems] = useState<QCItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedItem, setSelectedItem] = useState<QCItem | null>(null)
  const [inspectionNotes, setInspectionNotes] = useState('')
  const [inspectionResult, setInspectionResult] = useState<'PASS' | 'FAIL' | 'PARTIAL' | ''>('')
  const [defectsList, setDefectsList] = useState<string>('')
  const [passedQuantity, setPassedQuantity] = useState('')
  const [rejectedQuantity, setRejectedQuantity] = useState('')
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    passed: 0,
    failed: 0,
    totalInspected: 0,
    rejectRate: 0,
    avgInspectionTime: 0,
    topDefects: [] as { defect: string, count: number }[]
  })

  const isQCInspector = session?.user.role === Role.QC_INSPECTOR
  const canViewQC = isQCInspector || session?.user.role === Role.ADMIN || session?.user.role === Role.MANAGER

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (canViewQC) {
      fetchQCItems()
    }
  }, [session, status, router, canViewQC])

  const fetchQCItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/qc')
      if (response.ok) {
        const data = await response.json()
        setQCItems(data.qcItems)
        setStats(data.stats)
      } else {
        console.error('Failed to fetch QC items')
      }
    } catch (error) {
      console.error('Error fetching QC items:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-400">Loading QC Dashboard...</p>
          </div>
        </div>
      </ModernLayout>
    )
  }

  if (!session) {
    return null
  }

  if (!canViewQC) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-screen">
          <ModernCard className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
            <p className="text-gray-400">
              You don't have permission to access quality control functions.
            </p>
          </ModernCard>
        </div>
      </ModernLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_QC': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'IN_QC': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'PASSED': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'FAILED': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 2: return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getFilteredQCItems = () => {
    let filtered = qcItems
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus)
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Quality Control</h1>
            <p className="text-gray-400">Inspect and approve production items before delivery</p>
          </div>
          <ModernButton variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            New QC Batch
          </ModernButton>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ModernCard className="p-6" hover>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-yellow-600/20">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{stats.pending}</h3>
              <p className="text-gray-400 text-sm">Pending QC</p>
            </div>
          </ModernCard>

          <ModernCard className="p-6" hover>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-blue-600/20">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{stats.inProgress}</h3>
              <p className="text-gray-400 text-sm">In Progress</p>
            </div>
          </ModernCard>

          <ModernCard className="p-6" hover>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-green-600/20">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{stats.passed}</h3>
              <p className="text-gray-400 text-sm">Passed</p>
            </div>
          </ModernCard>

          <ModernCard className="p-6" hover>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{stats.failed}</h3>
              <p className="text-gray-400 text-sm">Failed</p>
            </div>
          </ModernCard>
        </div>

        {loading && (
          <ModernCard className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
            <div className="text-white text-lg font-medium">Loading QC items...</div>
            <div className="text-gray-400">Please wait while we fetch your data</div>
          </ModernCard>
        )}

        {/* Filters and Search */}
        {!loading && (
          <ModernCard className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <ModernInput
                  placeholder="Search orders, clients, products..."
                  leftIcon={<Search className="w-4 h-4" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                {[
                  { key: 'all', label: 'All Items', icon: Package },
                  { key: 'PENDING_QC', label: 'Pending', icon: Clock },
                  { key: 'IN_QC', label: 'In Progress', icon: Activity },
                  { key: 'PASSED', label: 'Passed', icon: CheckCircle },
                  { key: 'FAILED', label: 'Failed', icon: XCircle }
                ].map(({ key, label, icon: Icon }) => (
                  <ModernButton
                    key={key}
                    variant={filterStatus === key ? 'primary' : 'secondary'}
                    size="sm"
                    leftIcon={<Icon className="w-4 h-4" />}
                    onClick={() => setFilterStatus(key)}
                  >
                    {label}
                  </ModernButton>
                ))}
                <ModernButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<BarChart3 className="w-4 h-4" />}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  Analytics
                </ModernButton>
                <ModernButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={fetchQCItems}
                >
                  Refresh
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        )}

        {/* QC Items List */}
        <div className="grid gap-4">
          {!loading && getFilteredQCItems().map((item, index) => (
            <ModernCard 
              key={item.id} 
              className="p-6 hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{item.orderNumber}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                          Priority {item.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{item.clientName}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-white mb-2">{item.productName}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center mb-1">
                          <Package className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="font-medium text-gray-400 text-sm">Quantity</p>
                        </div>
                        <p className="text-white font-medium">{item.quantity} pieces</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center mb-1">
                          <Star className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="font-medium text-gray-400 text-sm">Brand</p>
                        </div>
                        <p className="text-white font-medium">{item.brandName}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center mb-1">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="font-medium text-gray-400 text-sm">Submitted By</p>
                        </div>
                        <p className="text-white font-medium">{item.submittedBy}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <div className="flex items-center mb-1">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="font-medium text-gray-400 text-sm">Due Date</p>
                        </div>
                        <p className="text-white font-medium">
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {item.lastQCRecord && (
                    <div className="space-y-3">
                      {item.lastQCRecord.notes && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center mb-2">
                            <FileCheck className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="font-medium text-blue-400">Inspector Notes</span>
                          </div>
                          <p className="text-blue-200">{item.lastQCRecord.notes}</p>
                        </div>
                      )}
                      {item.lastQCRecord.rejectReason && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center mb-2">
                            <XCircle className="w-4 h-4 text-red-400 mr-2" />
                            <span className="font-medium text-red-400">Issues Found</span>
                          </div>
                          <p className="text-red-200">{item.lastQCRecord.rejectReason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {item.status === 'PENDING_QC' && isQCInspector && (
                      <ModernButton 
                        variant="primary"
                        size="sm" 
                        leftIcon={<Eye className="w-4 h-4" />}
                        disabled={updating}
                      >
                        Start Inspection
                      </ModernButton>
                    )}
                    {item.status === 'IN_QC' && isQCInspector && (
                      <ModernButton 
                        variant="secondary"
                        size="sm" 
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        Continue Inspection
                      </ModernButton>
                    )}
                    <ModernButton variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
                      View Details
                    </ModernButton>
                  </div>
                </div>
              </div>
            </ModernCard>
          ))}

          {!loading && getFilteredQCItems().length === 0 && (
            <ModernCard className="p-12 text-center">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No QC items found</h3>
              <p className="text-gray-400 text-lg mb-6">
                {searchQuery 
                  ? `No items match your search "${searchQuery}".`
                  : qcItems.length === 0
                    ? "Items will appear here when they're ready for quality control inspection."
                    : `No ${filterStatus} items available.`
                }
              </p>
              {searchQuery && (
                <ModernButton 
                  variant="primary" 
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </ModernButton>
              )}
            </ModernCard>
          )}
        </div>
      </div>
    </ModernLayout>
  )
}