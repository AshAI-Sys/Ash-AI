/**
 * ASH AI - Neural Production Tracking System
 * Advanced real-time production monitoring with AI insights
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Factory,
  QrCode,
  Package2,
  Scan,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  TrendingUp,
  BarChart,
  MapPin,
  Calendar,
  Camera,
  FileText,
  Activity,
  Layers,
  Search,
  Filter,
  Brain,
  Zap,
  Settings,
  Monitor,
  PlayCircle,
  PauseCircle,
  XCircle,
  Download,
  Upload,
  Eye,
  Edit3,
  RefreshCw
} from 'lucide-react'
import { Role } from '@prisma/client'

interface ProductionBundle {
  id: string
  bundleNumber: string
  qrCode: string
  orderId: string
  orderNumber: string
  currentStage: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'QUALITY_ISSUE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  totalPieces: number
  completedPieces: number
  apparelType: string
  printMethod: string
  brandName: string
  operatorId?: string
  operatorName?: string
  workstationId?: string
  workstationName?: string
  startedAt?: string
  estimatedCompletion?: string
  actualCompletion?: string
  photos: string[]
  notes: string
  qualityIssues: QualityIssue[]
  trackingHistory: TrackingEvent[]
  aiInsights?: {
    efficiency: number
    predictedDelay: number
    recommendations: string[]
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

interface QualityIssue {
  id: string
  type: 'MINOR' | 'MAJOR' | 'CRITICAL'
  description: string
  reportedBy: string
  reportedAt: string
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
  resolution?: string
  photos: string[]
}

interface TrackingEvent {
  id: string
  stage: string
  action: string
  timestamp: string
  operatorName: string
  workstationName?: string
  notes?: string
  photos?: string[]
  duration?: number
}

interface ProductionWorkstation {
  id: string
  name: string
  type: 'CUTTING' | 'PRINTING' | 'SEWING' | 'QC' | 'FINISHING' | 'PACKING'
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'OFFLINE'
  currentBundle?: ProductionBundle
  operatorId?: string
  operatorName?: string
  efficiency: number
  todayProduction: number
  targetProduction: number
  temperature?: number
  humidity?: number
  lastMaintenance?: string
}

interface ProductionMetrics {
  totalBundles: number
  activeBundles: number
  completedToday: number
  averageCycleTime: number
  onTimeDelivery: number
  qualityRate: number
  efficiency: number
  predictedOutput: number
}

export default function ProductionTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [bundles, setBundles] = useState<ProductionBundle[]>([])
  const [workstations, setWorkstations] = useState<ProductionWorkstation[]>([])
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    totalBundles: 0,
    activeBundles: 0,
    completedToday: 0,
    averageCycleTime: 0,
    onTimeDelivery: 0,
    qualityRate: 0,
    efficiency: 0,
    predictedOutput: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [qrScanInput, setQrScanInput] = useState('')
  const [selectedBundle, setSelectedBundle] = useState<ProductionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user has permission to access production tracking
    const allowedRoles = [
      Role.ADMIN, 
      Role.MANAGER, 
      Role.PRODUCTION_MANAGER,
      Role.QC_INSPECTOR,
      Role.SILKSCREEN_OPERATOR,
      Role.SUBLIMATION_OPERATOR,
      Role.DTF_OPERATOR,
      Role.EMBROIDERY_OPERATOR,
      Role.SEWING_OPERATOR
    ]
    if (!allowedRoles.includes(session.user.role)) {
      router.push('/dashboard')
      return
    }

    loadProductionData()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadProductionData(true)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [session, status, router])

  const loadProductionData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      if (isRefresh) setRefreshing(true)
      
      // Mock data with enhanced AI insights
      const mockBundles: ProductionBundle[] = [
        {
          id: '1',
          bundleNumber: 'PB-2025-001',
          qrCode: 'QR-PB-2025-001',
          orderId: 'order-1',
          orderNumber: 'SORB-2025-001',
          currentStage: 'Sewing',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          totalPieces: 150,
          completedPieces: 98,
          apparelType: 'T-Shirt',
          printMethod: 'Silkscreen',
          brandName: 'Sorbetes',
          operatorId: 'op-3',
          operatorName: 'Rosa Garcia',
          workstationId: 'ws-sewing-1',
          workstationName: 'Sewing Station 1',
          startedAt: '2025-01-07T08:00:00Z',
          estimatedCompletion: '2025-01-09T17:00:00Z',
          photos: ['/sewing-progress-1.jpg'],
          notes: 'Standard sewing progress, no issues detected',
          qualityIssues: [],
          aiInsights: {
            efficiency: 94.5,
            predictedDelay: 0,
            recommendations: [
              'Maintain current pace to meet deadline',
              'Consider pre-preparing next batch materials'
            ],
            riskLevel: 'LOW'
          },
          trackingHistory: [
            {
              id: 'th-1-1',
              stage: 'Cutting',
              action: 'COMPLETED',
              timestamp: '2025-01-05T16:30:00Z',
              operatorName: 'Maria Santos',
              workstationName: 'Cutting Station 1',
              notes: 'All pieces cut successfully',
              duration: 120
            },
            {
              id: 'th-1-2',
              stage: 'Printing',
              action: 'COMPLETED',
              timestamp: '2025-01-06T14:45:00Z',
              operatorName: 'Juan Dela Cruz',
              workstationName: 'Silkscreen Station 2',
              notes: 'Printing completed with high quality',
              photos: ['/print-completed-1.jpg'],
              duration: 180
            },
            {
              id: 'th-1-3',
              stage: 'Sewing',
              action: 'STARTED',
              timestamp: '2025-01-07T08:00:00Z',
              operatorName: 'Rosa Garcia',
              workstationName: 'Sewing Station 1',
              notes: 'Sewing in progress - 65% complete'
            }
          ]
        },
        {
          id: '2',
          bundleNumber: 'PB-2025-002',
          qrCode: 'QR-PB-2025-002',
          orderId: 'order-2',
          orderNumber: 'REEF-2025-012',
          currentStage: 'Quality Control',
          status: 'QUALITY_ISSUE',
          priority: 'MEDIUM',
          totalPieces: 25,
          completedPieces: 25,
          apparelType: 'Jersey',
          printMethod: 'Sublimation',
          brandName: 'Reefer',
          operatorId: 'qc-1',
          operatorName: 'Patricia Lim',
          workstationId: 'ws-qc-1',
          workstationName: 'QC Station 1',
          startedAt: '2025-01-04T09:00:00Z',
          photos: ['/qc-issue-1.jpg'],
          notes: 'Minor print alignment issue on 3 pieces',
          aiInsights: {
            efficiency: 87.2,
            predictedDelay: 2,
            recommendations: [
              'Review printing station calibration',
              'Implement additional QC checkpoints'
            ],
            riskLevel: 'MEDIUM'
          },
          qualityIssues: [
            {
              id: 'qi-1',
              type: 'MINOR',
              description: 'Print slightly misaligned on 3 pieces - sizes M and L',
              reportedBy: 'Patricia Lim',
              reportedAt: '2025-01-08T11:30:00Z',
              status: 'IN_REVIEW',
              photos: ['/qc-issue-detail-1.jpg']
            }
          ],
          trackingHistory: [
            {
              id: 'th-2-1',
              stage: 'Design Approval',
              action: 'COMPLETED',
              timestamp: '2025-01-03T15:00:00Z',
              operatorName: 'Client',
              notes: 'Design approved by client'
            },
            {
              id: 'th-2-2',
              stage: 'Cutting',
              action: 'COMPLETED',
              timestamp: '2025-01-04T12:00:00Z',
              operatorName: 'Maria Santos',
              workstationName: 'Cutting Station 2',
              duration: 90
            },
            {
              id: 'th-2-3',
              stage: 'Sublimation Printing',
              action: 'COMPLETED',
              timestamp: '2025-01-05T16:20:00Z',
              operatorName: 'Carlos Mendoza',
              workstationName: 'Sublimation Station 1',
              duration: 240
            }
          ]
        }
      ]

      const mockWorkstations: ProductionWorkstation[] = [
        {
          id: 'ws-cutting-1',
          name: 'Cutting Station 1',
          type: 'CUTTING',
          status: 'ACTIVE',
          operatorId: 'op-1',
          operatorName: 'Maria Santos',
          efficiency: 95,
          todayProduction: 8,
          targetProduction: 10,
          temperature: 24.5,
          lastMaintenance: '2025-01-01T10:00:00Z'
        },
        {
          id: 'ws-sewing-1',
          name: 'Sewing Station 1',
          type: 'SEWING',
          status: 'ACTIVE',
          currentBundle: mockBundles[0],
          operatorId: 'op-3',
          operatorName: 'Rosa Garcia',
          efficiency: 92,
          todayProduction: 3,
          targetProduction: 5,
          temperature: 23.8,
          humidity: 65
        },
        {
          id: 'ws-printing-1',
          name: 'Silkscreen Station 1',
          type: 'PRINTING',
          status: 'IDLE',
          efficiency: 88,
          todayProduction: 4,
          targetProduction: 6,
          temperature: 25.2,
          humidity: 58
        },
        {
          id: 'ws-qc-1',
          name: 'QC Station 1',
          type: 'QC',
          status: 'ACTIVE',
          currentBundle: mockBundles[1],
          operatorId: 'qc-1',
          operatorName: 'Patricia Lim',
          efficiency: 97,
          todayProduction: 6,
          targetProduction: 8,
          temperature: 24.1,
          humidity: 62
        }
      ]

      const mockMetrics: ProductionMetrics = {
        totalBundles: 15,
        activeBundles: 8,
        completedToday: 4,
        averageCycleTime: 3.2,
        onTimeDelivery: 94.5,
        qualityRate: 98.2,
        efficiency: 91.5,
        predictedOutput: 12
      }

      setBundles(mockBundles)
      setWorkstations(mockWorkstations)
      setMetrics(mockMetrics)
      setLoading(false)
      setRefreshing(false)
    } catch (error) {
      console.error('Error loading production data:', error)
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleQRScan = (qrCode: string) => {
    const bundle = bundles.find(b => b.qrCode === qrCode || b.bundleNumber === qrCode)
    if (bundle) {
      setSelectedBundle(bundle)
      setQrScanInput('')
    } else {
      alert(`Production bundle not found for QR code: ${qrCode}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      'PENDING': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      'IN_PROGRESS': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'COMPLETED': 'bg-green-500/20 text-green-300 border-green-500/30',
      'ON_HOLD': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'QUALITY_ISSUE': 'bg-red-500/20 text-red-300 border-red-500/30'
    }
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'LOW': 'bg-green-500/20 text-green-300 border-green-500/30',
      'MEDIUM': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'HIGH': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'URGENT': 'bg-red-500/20 text-red-300 border-red-500/30'
    }
    return (
      <Badge className={colors[priority as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
        {priority}
      </Badge>
    )
  }

  const getWorkstationStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-500/20 text-green-300 border-green-500/30',
      'IDLE': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      'MAINTENANCE': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'OFFLINE': 'bg-red-500/20 text-red-300 border-red-500/30'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }

  const filteredBundles = bundles.filter(bundle => {
    const matchesSearch = bundle.bundleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bundle.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bundle.brandName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStage = stageFilter === 'all' || bundle.currentStage.toLowerCase().includes(stageFilter.toLowerCase())
    const matchesStatus = statusFilter === 'all' || bundle.status === statusFilter
    
    return matchesSearch && matchesStage && matchesStatus
  })

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="quantum-loader w-16 h-16 mx-auto mb-8">
              <div></div><div></div><div></div>
            </div>
            <h1 className="text-3xl font-bold glitch-text text-white mb-4" data-text="ASH AI">ASH AI</h1>
            <p className="text-cyan-300 font-medium">Loading Production System...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) return null

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 p-8 space-y-8">
          {/* Neural Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="ai-orb w-12 h-12">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold glitch-text text-white" data-text="Production Tracking">Production Tracking</h1>
                <p className="text-cyan-300 mt-1">Real-time bundle tracking with AI-powered insights</p>
              </div>
            </div>
            
            {/* Neural QR Scanner */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Input
                  placeholder="Scan bundle QR code"
                  value={qrScanInput}
                  onChange={(e) => setQrScanInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQRScan(qrScanInput)}
                  className="cyber-input w-48 pr-12"
                />
                <QrCode className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              </div>
              <Button onClick={() => handleQRScan(qrScanInput)} className="neon-btn">
                <Scan className="w-4 h-4 mr-1" />
                Scan
              </Button>
              <Button 
                onClick={() => loadProductionData(true)} 
                className="neon-btn-outline"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Syncing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Production Metrics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card className="quantum-card border-blue-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Package2 className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Total</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.totalBundles}</div>
                <div className="text-xs text-blue-400">bundles</div>
              </CardContent>
            </Card>
            
            <Card className="quantum-card border-green-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-300">Active</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.activeBundles}</div>
                <div className="text-xs text-green-400">in progress</div>
              </CardContent>
            </Card>
            
            <Card className="quantum-card border-emerald-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-300">Done</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.completedToday}</div>
                <div className="text-xs text-emerald-400">today</div>
              </CardContent>
            </Card>
            
            <Card className="quantum-card border-purple-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Cycle</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.averageCycleTime}h</div>
                <div className="text-xs text-purple-400">average</div>
              </CardContent>
            </Card>
            
            <Card className="quantum-card border-orange-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">On Time</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.onTimeDelivery}%</div>
                <div className="text-xs text-orange-400">delivery</div>
              </CardContent>
            </Card>
            
            <Card className="quantum-card border-teal-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <BarChart className="w-5 h-5 text-teal-400" />
                  <span className="text-sm font-medium text-teal-300">Quality</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.qualityRate}%</div>
                <div className="text-xs text-teal-400">rate</div>
              </CardContent>
            </Card>
            
            <Card className="quantum-card border-indigo-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Factory className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-medium text-indigo-300">Efficiency</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.efficiency}%</div>
                <div className="text-xs text-indigo-400">overall</div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-cyan-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">AI Predicted</span>
                </div>
                <div className="text-2xl font-bold text-white">{metrics.predictedOutput}</div>
                <div className="text-xs text-cyan-400">output</div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="bundles" className="space-y-8">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-slate-900/60 backdrop-blur-sm border border-cyan-500/30">
              <TabsTrigger 
                value="bundles" 
                className="text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <Package2 className="w-4 h-4 mr-2" />
                Production Bundles
              </TabsTrigger>
              <TabsTrigger 
                value="workstations"
                className="text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Workstations
              </TabsTrigger>
              <TabsTrigger 
                value="quality"
                className="text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Quality Issues
              </TabsTrigger>
              <TabsTrigger 
                value="ai-insights"
                className="text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bundles">
              {/* Enhanced Filters */}
              <Card className="quantum-card">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                        <Input
                          placeholder="Search by bundle, order, or brand..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="cyber-input pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="cyber-select"
                      >
                        <option value="all">All Stages</option>
                        <option value="cutting">Cutting</option>
                        <option value="printing">Printing</option>
                        <option value="sewing">Sewing</option>
                        <option value="quality">Quality Control</option>
                        <option value="finishing">Finishing</option>
                      </select>
                      
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="cyber-select"
                      >
                        <option value="all">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="QUALITY_ISSUE">Quality Issue</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {filteredBundles.map((bundle) => (
                  <Card key={bundle.id} className="quantum-card hover:border-cyan-400/50 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl flex items-center gap-2 text-white">
                            <QrCode className="w-6 h-6 text-cyan-400" />
                            {bundle.bundleNumber}
                          </CardTitle>
                          {getStatusBadge(bundle.status)}
                          {getPriorityBadge(bundle.priority)}
                          {bundle.aiInsights && (
                            <Badge className={`
                              ${bundle.aiInsights.riskLevel === 'LOW' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                bundle.aiInsights.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                'bg-red-500/20 text-red-300 border-red-500/30'}
                            `}>
                              <Brain className="w-3 h-3 mr-1" />
                              AI: {bundle.aiInsights.riskLevel}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          onClick={() => setSelectedBundle(bundle)}
                          className="neon-btn-outline"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                      <CardDescription className="text-cyan-300">
                        {bundle.orderNumber} • {bundle.totalPieces} {bundle.apparelType} • {bundle.printMethod}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-medium text-sm mb-3 text-white">Current Stage</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-cyan-200">{bundle.currentStage}</span>
                          </div>
                          {bundle.workstationName && (
                            <div className="text-sm text-cyan-400 mb-1">
                              Station: {bundle.workstationName}
                            </div>
                          )}
                          {bundle.operatorName && (
                            <div className="text-sm text-cyan-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {bundle.operatorName}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-3 text-white">Progress</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-cyan-300">{bundle.completedPieces} / {bundle.totalPieces} pieces</span>
                              <span className="text-white font-bold">{Math.round((bundle.completedPieces / bundle.totalPieces) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-800/30 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                              <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${(bundle.completedPieces / bundle.totalPieces) * 100}%` }}
                              >
                                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-3 text-white">Timeline</h4>
                          <div className="space-y-1 text-sm text-cyan-300">
                            {bundle.startedAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Started: {new Date(bundle.startedAt).toLocaleDateString()}
                              </div>
                            )}
                            {bundle.estimatedCompletion && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Est: {new Date(bundle.estimatedCompletion).toLocaleDateString()}
                              </div>
                            )}
                            {bundle.aiInsights && bundle.aiInsights.predictedDelay > 0 && (
                              <div className="flex items-center gap-1 text-orange-400">
                                <AlertTriangle className="w-3 h-3" />
                                Delay: +{bundle.aiInsights.predictedDelay}h
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {bundle.qualityIssues.length > 0 && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="font-medium text-sm text-red-300">Quality Issues ({bundle.qualityIssues.length})</span>
                          </div>
                          <div className="text-sm text-red-200">
                            {bundle.qualityIssues[0].description}
                          </div>
                        </div>
                      )}

                      {bundle.aiInsights && (
                        <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-400" />
                            <span className="font-medium text-sm text-purple-300">AI Insights</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="text-cyan-200">Efficiency: {bundle.aiInsights.efficiency}%</div>
                            {bundle.aiInsights.recommendations.length > 0 && (
                              <div className="text-cyan-300">
                                • {bundle.aiInsights.recommendations[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="workstations">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {workstations.map((station) => (
                  <Card key={station.id} className="quantum-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white">{station.name}</CardTitle>
                        <Badge className={`text-xs ${getWorkstationStatusColor(station.status)}`}>
                          {station.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-cyan-300">
                        {station.type.charAt(0) + station.type.slice(1).toLowerCase()} Station
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {station.operatorName && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm text-white">{station.operatorName}</span>
                        </div>
                      )}
                      
                      {station.currentBundle && (
                        <div className="bg-slate-800/30 border border-cyan-500/20 rounded-lg p-3">
                          <h4 className="font-medium text-sm mb-1 text-cyan-300">Current Bundle</h4>
                          <div className="text-sm">
                            <div className="text-white">{station.currentBundle.bundleNumber}</div>
                            <div className="text-cyan-400">{station.currentBundle.totalPieces} pieces</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-cyan-400">Efficiency:</span>
                          <div className="font-medium text-white">{station.efficiency}%</div>
                        </div>
                        <div>
                          <span className="text-cyan-400">Today:</span>
                          <div className="font-medium text-white">{station.todayProduction}/{station.targetProduction}</div>
                        </div>
                      </div>

                      {(station.temperature || station.humidity) && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {station.temperature && (
                            <div>
                              <span className="text-cyan-400">Temp:</span>
                              <div className="font-medium text-white">{station.temperature}°C</div>
                            </div>
                          )}
                          {station.humidity && (
                            <div>
                              <span className="text-cyan-400">Humidity:</span>
                              <div className="font-medium text-white">{station.humidity}%</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-cyan-400">Daily Progress</span>
                          <span className="text-white">{Math.round((station.todayProduction / station.targetProduction) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-800/30 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.min((station.todayProduction / station.targetProduction) * 100, 100)}%` }}
                          >
                            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="neon-btn-outline flex-1">
                          <Settings className="w-3 h-3 mr-1" />
                          Settings
                        </Button>
                        <Button size="sm" className="neon-btn-outline flex-1">
                          <Activity className="w-3 h-3 mr-1" />
                          Monitor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="quality">
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                    Quality Control Issues
                  </CardTitle>
                  <CardDescription className="text-cyan-300">Monitor and resolve quality issues across production</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {bundles.filter(b => b.qualityIssues.length > 0).map((bundle) => (
                      <div key={bundle.id} className="border border-slate-600/30 rounded-lg p-4 bg-slate-800/20 backdrop-blur-sm">
                        <h4 className="font-medium mb-3 text-white">{bundle.bundleNumber} - {bundle.orderNumber}</h4>
                        <div className="space-y-3">
                          {bundle.qualityIssues.map((issue) => (
                            <div key={issue.id} className="border border-slate-600/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <Badge className={`text-xs ${
                                  issue.type === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                  issue.type === 'MAJOR' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                }`}>
                                  {issue.type}
                                </Badge>
                                <Badge className={`text-xs ${
                                  issue.status === 'RESOLVED' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                  issue.status === 'IN_REVIEW' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                  'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                }`}>
                                  {issue.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-cyan-200 mb-2">{issue.description}</p>
                              <div className="text-xs text-cyan-400 mb-3">
                                Reported by {issue.reportedBy} on {new Date(issue.reportedAt).toLocaleDateString()}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="neon-btn-outline">
                                  <Camera className="w-3 h-3 mr-1" />
                                  View Photos
                                </Button>
                                <Button size="sm" className="neon-btn-outline">
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Update Status
                                </Button>
                                {issue.status === 'OPEN' && (
                                  <Button size="sm" className="neon-btn">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Resolve Issue
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {bundles.filter(b => b.qualityIssues.length > 0).length === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-50" />
                        <p className="text-cyan-300">No quality issues reported</p>
                        <p className="text-sm text-cyan-400 mt-1">All production bundles are meeting quality standards</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-insights">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="quantum-card border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Brain className="w-5 h-5 mr-2 text-purple-400" />
                      Production AI Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-slate-800/20 rounded-lg">
                        <div className="text-2xl font-bold text-cyan-300">{metrics.efficiency}%</div>
                        <div className="text-sm text-cyan-400">Overall Efficiency</div>
                      </div>
                      <div className="text-center p-3 bg-slate-800/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-300">{metrics.predictedOutput}</div>
                        <div className="text-sm text-green-400">Predicted Output</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-cyan-300">AI Recommendations</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div className="text-sm text-blue-300">• Optimize sewing station workflow to reduce cycle time by 12%</div>
                        </div>
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="text-sm text-green-300">• Schedule preventive maintenance for Cutting Station 1 next week</div>
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <div className="text-sm text-yellow-300">• Consider cross-training operators for higher flexibility</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="quantum-card border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <TrendingUp className="w-5 h-5 mr-2 text-cyan-400" />
                      Performance Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-300">Production Rate</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">+8.2%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-300">Quality Score</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">+2.1%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-300">Cycle Time</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                          <span className="text-red-400">-5.3%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-medium text-cyan-300 mb-3">Predictive Alerts</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <span className="text-sm text-orange-300">High demand predicted for next week</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-blue-300">Optimal scheduling window: Mon-Wed</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Enhanced Bundle Detail Modal */}
          {selectedBundle && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <Card className="quantum-card w-full max-w-5xl max-h-[90vh] overflow-y-auto border-cyan-500/30">
                <CardHeader className="border-b border-slate-600/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-white">
                      <QrCode className="w-6 h-6 text-cyan-400" />
                      Bundle Details - {selectedBundle.bundleNumber}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedBundle(null)}
                      className="text-cyan-300 hover:text-white hover:bg-cyan-500/10"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-cyan-300 text-lg">Bundle Information</h4>
                        <div className="space-y-2 text-sm bg-slate-800/20 p-4 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-cyan-400">Order:</span>
                            <span className="text-white">{selectedBundle.orderNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-400">Product:</span>
                            <span className="text-white">{selectedBundle.apparelType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-400">Method:</span>
                            <span className="text-white">{selectedBundle.printMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-400">Brand:</span>
                            <span className="text-white">{selectedBundle.brandName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-400">Pieces:</span>
                            <span className="text-white">{selectedBundle.completedPieces} / {selectedBundle.totalPieces}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium text-cyan-300 text-lg">Current Status</h4>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            {getStatusBadge(selectedBundle.status)}
                            {getPriorityBadge(selectedBundle.priority)}
                          </div>
                          <div className="text-sm text-cyan-200">
                            <div>Stage: <span className="text-white">{selectedBundle.currentStage}</span></div>
                            {selectedBundle.operatorName && (
                              <div>Operator: <span className="text-white">{selectedBundle.operatorName}</span></div>
                            )}
                            {selectedBundle.workstationName && (
                              <div>Station: <span className="text-white">{selectedBundle.workstationName}</span></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedBundle.aiInsights && (
                      <div>
                        <h4 className="font-medium text-purple-300 text-lg mb-4">AI Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                            <div className="text-2xl font-bold text-purple-300">{selectedBundle.aiInsights.efficiency}%</div>
                            <div className="text-sm text-purple-400">Efficiency</div>
                          </div>
                          <div className="text-center p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="text-2xl font-bold text-orange-300">{selectedBundle.aiInsights.predictedDelay}h</div>
                            <div className="text-sm text-orange-400">Predicted Delay</div>
                          </div>
                          <div className="text-center p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                            <div className="text-2xl font-bold text-cyan-300">{selectedBundle.aiInsights.riskLevel}</div>
                            <div className="text-sm text-cyan-400">Risk Level</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-purple-300 mb-2">Recommendations:</h5>
                          <div className="space-y-1">
                            {selectedBundle.aiInsights.recommendations.map((rec, index) => (
                              <div key={index} className="text-sm text-cyan-200">• {rec}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-cyan-300 text-lg mb-4">Production History</h4>
                      <div className="space-y-4">
                        {selectedBundle.trackingHistory.map((event) => (
                          <div key={event.id} className="flex items-start gap-4 p-4 bg-slate-800/20 border border-slate-600/30 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{event.stage} - {event.action}</span>
                                <span className="text-xs text-cyan-400">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-cyan-200 mb-2">{event.notes}</p>
                              <div className="flex items-center gap-4 text-xs text-cyan-400">
                                <span>By: {event.operatorName}</span>
                                {event.workstationName && <span>Station: {event.workstationName}</span>}
                                {event.duration && <span>Duration: {event.duration} min</span>}
                              </div>
                              {event.photos && event.photos.length > 0 && (
                                <div className="mt-2">
                                  <Button size="sm" className="neon-btn-outline">
                                    <Camera className="w-3 h-3 mr-1" />
                                    View Photos ({event.photos.length})
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-600/30">
                      <Button className="neon-btn-outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                      <Button className="neon-btn-outline">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Update Status
                      </Button>
                      <Button className="neon-btn">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Continue Production
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}