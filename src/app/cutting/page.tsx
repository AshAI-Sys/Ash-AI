'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, maskSensitiveData } from '@/utils/security'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { CuttingQueueModal } from '@/components/cutting/CuttingQueueModal'
import { FabricLayoutModal } from '@/components/cutting/FabricLayoutModal'
import { MaterialTrackingModal } from '@/components/cutting/MaterialTrackingModal'
import { QRBatchSystem } from '@/components/cutting/QRBatchSystem'
import { 
  Scissors,
  Layout,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Search,
  Filter,
  Download,
  Upload,
  QrCode,
  Zap,
  Target,
  Activity,
  TrendingUp,
  Box,
  Layers,
  Ruler,
  Calculator,
  Brain,
  Eye,
  Settings,
  RefreshCw,
  Plus,
  ArrowRight,
  Maximize,
  Minimize
} from 'lucide-react'

interface CuttingJob {
  id: string
  orderId: string
  poNumber: string
  designName: string
  brand: string
  method: string
  priority: 'high' | 'medium' | 'low'
  status: 'queued' | 'in_progress' | 'cutting' | 'completed' | 'paused'
  operator?: string
  estimatedTime: number
  actualTime?: number
  fabricRequired: number
  fabricUsed?: number
  wastage?: number
  qrCode?: string
  startedAt?: string
  completedAt?: string
  pieces: {
    size: string
    quantity: number
    cut: number
  }[]
  materials: {
    type: string
    color: string
    quantity: number
    unit: string
  }[]
}

const mockCuttingJobs: CuttingJob[] = [
  {
    id: 'cut_001',
    orderId: 'order_1',
    poNumber: 'REEF-2024-000123',
    designName: 'Corporate Logo Tee Design',
    brand: 'Reefer',
    method: 'Silkscreen',
    priority: 'high',
    status: 'in_progress',
    operator: 'OP-001',
    estimatedTime: 45,
    actualTime: 30,
    fabricRequired: 12.5,
    fabricUsed: 11.8,
    wastage: 0.7,
    qrCode: 'QR-CUT-001',
    startedAt: '2024-09-01T08:30:00Z',
    pieces: [
      { size: 'S', quantity: 10, cut: 10 },
      { size: 'M', quantity: 15, cut: 12 },
      { size: 'L', quantity: 20, cut: 8 },
      { size: 'XL', quantity: 5, cut: 0 }
    ],
    materials: [
      { type: 'Cotton Jersey', color: 'Navy Blue', quantity: 12.5, unit: 'meters' }
    ]
  },
  {
    id: 'cut_002',
    orderId: 'order_2',
    poNumber: 'SORB-2024-000098',
    designName: 'Sports Jersey All-Over Print',
    brand: 'Sorbetes',
    method: 'Sublimation',
    priority: 'medium',
    status: 'queued',
    estimatedTime: 60,
    fabricRequired: 18.2,
    qrCode: 'QR-CUT-002',
    pieces: [
      { size: 'S', quantity: 8, cut: 0 },
      { size: 'M', quantity: 12, cut: 0 },
      { size: 'L', quantity: 25, cut: 0 },
      { size: 'XL', quantity: 10, cut: 0 }
    ],
    materials: [
      { type: 'Polyester Mesh', color: 'White', quantity: 18.2, unit: 'meters' }
    ]
  },
  {
    id: 'cut_003',
    orderId: 'order_3',
    poNumber: 'REEF-2024-000124',
    designName: 'Event Merchandise Design',
    brand: 'Reefer',
    method: 'DTF',
    priority: 'low',
    status: 'completed',
    operator: 'OP-002',
    estimatedTime: 35,
    actualTime: 38,
    fabricRequired: 8.5,
    fabricUsed: 8.2,
    wastage: 0.3,
    qrCode: 'QR-CUT-003',
    startedAt: '2024-08-31T14:00:00Z',
    completedAt: '2024-08-31T14:38:00Z',
    pieces: [
      { size: 'S', quantity: 5, cut: 5 },
      { size: 'M', quantity: 10, cut: 10 },
      { size: 'L', quantity: 15, cut: 15 },
      { size: 'XL', quantity: 8, cut: 8 }
    ],
    materials: [
      { type: 'Cotton Blend', color: 'Black', quantity: 8.5, unit: 'meters' }
    ]
  },
  {
    id: 'cut_004',
    orderId: 'order_4',
    poNumber: 'SORB-2024-000099',
    designName: 'Premium Hoodie Embroidery',
    brand: 'Sorbetes',
    method: 'Embroidery',
    priority: 'high',
    status: 'paused',
    operator: 'OP-003',
    estimatedTime: 90,
    actualTime: 45,
    fabricRequired: 25.0,
    fabricUsed: 12.5,
    qrCode: 'QR-CUT-004',
    startedAt: '2024-09-01T09:00:00Z',
    pieces: [
      { size: 'S', quantity: 3, cut: 3 },
      { size: 'M', quantity: 8, cut: 5 },
      { size: 'L', quantity: 12, cut: 0 },
      { size: 'XL', quantity: 7, cut: 0 }
    ],
    materials: [
      { type: 'Fleece', color: 'Charcoal', quantity: 25.0, unit: 'meters' }
    ]
  }
]

const mockOperators = [
  { id: 'op1', name: 'Maria Santos', experience: 'Senior', efficiency: 95, currentJob: 'cut_001' },
  { id: 'op2', name: 'Jose Cruz', experience: 'Mid-level', efficiency: 88, currentJob: null },
  { id: 'op3', name: 'Ana Reyes', experience: 'Senior', efficiency: 92, currentJob: 'cut_004' },
  { id: 'op4', name: 'Carlos Lopez', experience: 'Junior', efficiency: 78, currentJob: null }
]

export default function CuttingPage() {
  const [jobs, setJobs] = useState<CuttingJob[]>(mockCuttingJobs)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showQueueModal, setShowQueueModal] = useState(false)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showQRBatchModal, setShowQRBatchModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<CuttingJob | null>(null)

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cutting': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'queued': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'in_progress': return <Activity className="w-4 h-4" />
      case 'cutting': return <Scissors className="w-4 h-4" />
      case 'paused': return <AlertTriangle className="w-4 h-4" />
      case 'queued': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleJobAction = (job: CuttingJob, action: string) => {
    setSelectedJob(job)
    switch (action) {
      case 'start':
        setJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { ...j, status: 'in_progress', startedAt: new Date().toISOString() }
            : j
        ))
        break
      case 'pause':
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: 'paused' } : j
        ))
        break
      case 'complete':
        setJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { ...j, status: 'completed', completedAt: new Date().toISOString() }
            : j
        ))
        break
      case 'layout':
        setShowLayoutModal(true)
        break
      case 'materials':
        setShowMaterialModal(true)
        break
    }
  }

  const stats = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === 'queued').length,
    inProgress: jobs.filter(j => j.status === 'in_progress' || j.status === 'cutting').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    paused: jobs.filter(j => j.status === 'paused').length,
    totalWastage: jobs.reduce((acc, j) => acc + (j.wastage || 0), 0),
    efficiency: jobs.filter(j => j.actualTime).length > 0 
      ? Math.round(jobs.filter(j => j.actualTime).reduce((acc, j) => 
          acc + (j.estimatedTime / (j.actualTime || j.estimatedTime)), 0
        ) / jobs.filter(j => j.actualTime).length * 100)
      : 95
  }

  return (
    <ResponsiveLayout>
      <div className="responsive-container mobile-dashboard tablet-dashboard laptop-dashboard desktop-dashboard">
        {/* Header */}
        <div className="mobile-header tablet-header laptop-header desktop-header">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold flex items-center space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Scissors className="h-4 w-4 md:h-6 md:w-6 text-white" />
                </div>
                <span className="ash-gradient-text">Cutting Station</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm md:text-base">Fabric cutting queue, layout optimization, and material tracking</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => setShowQueueModal(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white btn-mobile md:btn-tablet lg:btn-laptop"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add to Queue</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button 
                onClick={() => setShowLayoutModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white btn-mobile md:btn-tablet lg:btn-laptop"
              >
                <Layout className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Layout AI</span>
                <span className="sm:hidden">Layout</span>
              </Button>
              <Button 
                onClick={() => setShowQRBatchModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white btn-mobile md:btn-tablet lg:btn-laptop"
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">QR Batch</span>
                <span className="sm:hidden">QR</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid-mobile md:stats-grid-tablet lg:stats-grid-laptop xl:stats-grid-desktop">
          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">Active cutting jobs</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-xl md:text-2xl font-bold text-purple-900">{stats.inProgress}</p>
                  <p className="text-xs text-gray-500">Currently cutting</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Efficiency</p>
                  <p className="text-xl md:text-2xl font-bold text-green-900">{stats.efficiency}%</p>
                  <p className="text-xs text-gray-500">Average efficiency</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Material Waste</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-900">{stats.totalWastage.toFixed(1)}m</p>
                  <p className="text-xs text-gray-500">Total wastage</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="enhanced-card">
          <CardContent className="p-responsive">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by design name, PO number, or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white flex-1 sm:flex-initial"
                >
                  <option value="all">All Status</option>
                  <option value="queued">Queued</option>
                  <option value="in_progress">In Progress</option>
                  <option value="cutting">Cutting</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
                
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white flex-1 sm:flex-initial"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cutting Jobs Grid */}
        <div className="designs-grid-mobile md:designs-grid-tablet lg:designs-grid-laptop xl:designs-grid-desktop">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="design-card-mobile md:design-card-tablet lg:design-card-laptop xl:design-card-desktop enhanced-card hover-lift">
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                      {job.designName}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs md:text-sm text-gray-600">
                      <span>{job.poNumber}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{job.brand}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getPriorityColor(job.priority)}`}>
                      {job.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 md:space-y-4">
                {/* Status and Progress */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Badge className={`flex items-center space-x-1 text-xs ${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)}
                    <span className="capitalize">{job.status.replace('_', ' ')}</span>
                  </Badge>
                  <div className="text-xs text-gray-500">
                    {job.operator && (
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{job.operator}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((job.pieces.reduce((acc, p) => acc + p.cut, 0) / job.pieces.reduce((acc, p) => acc + p.quantity, 0)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(job.pieces.reduce((acc, p) => acc + p.cut, 0) / job.pieces.reduce((acc, p) => acc + p.quantity, 0)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Material Info */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Required:</span> {job.fabricRequired}m
                  </div>
                  <div>
                    <span className="font-medium">Used:</span> {job.fabricUsed?.toFixed(1) || '0.0'}m
                  </div>
                  <div>
                    <span className="font-medium">Wastage:</span> {job.wastage?.toFixed(1) || '0.0'}m
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {job.actualTime || job.estimatedTime}min
                  </div>
                </div>

                {/* QR Code */}
                {job.qrCode && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <QrCode className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">{job.qrCode}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 px-2">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="mobile-actions md:flex md:items-center md:space-x-2 md:space-y-0">
                  {job.status === 'queued' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleJobAction(job, 'start')}
                      className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-green-600 hover:bg-green-700"
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                  
                  {job.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleJobAction(job, 'pause')}
                      className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-orange-600 hover:bg-orange-700"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  
                  {job.status === 'paused' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleJobAction(job, 'start')}
                      className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700"
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  )}

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleJobAction(job, 'layout')}
                    className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial"
                  >
                    <Layout className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Layout</span>
                    <span className="sm:hidden">AI</span>
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleJobAction(job, 'materials')}
                    className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial"
                  >
                    <Box className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Materials</span>
                    <span className="sm:hidden">Mat</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <Card className="enhanced-card">
            <CardContent className="p-12 text-center">
              <Scissors className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No cutting jobs found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Ready to start cutting? Add approved designs to the queue'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                <Button 
                  onClick={() => setShowQueueModal(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Job to Queue
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <CuttingQueueModal
          isOpen={showQueueModal}
          onClose={() => setShowQueueModal(false)}
          onSubmit={(jobData) => {
            // Add new job to queue
            console.log('New cutting job:', jobData)
            setShowQueueModal(false)
          }}
          operators={mockOperators}
        />

        <FabricLayoutModal
          job={selectedJob}
          isOpen={showLayoutModal}
          onClose={() => {
            setShowLayoutModal(false)
            setSelectedJob(null)
          }}
          onOptimize={(layoutData) => {
            console.log('Layout optimization:', layoutData)
            setShowLayoutModal(false)
            setSelectedJob(null)
          }}
        />

        <MaterialTrackingModal
          job={selectedJob}
          isOpen={showMaterialModal}
          onClose={() => {
            setShowMaterialModal(false)
            setSelectedJob(null)
          }}
          onUpdate={(materialData) => {
            console.log('Material update:', materialData)
            setShowMaterialModal(false)
            setSelectedJob(null)
          }}
        />

        <QRBatchSystem
          isOpen={showQRBatchModal}
          onClose={() => setShowQRBatchModal(false)}
          cuttingJob={selectedJob}
        />
      </div>
    </ResponsiveLayout>
  )
}