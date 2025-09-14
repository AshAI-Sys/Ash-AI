// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TikTokCenteredLayout, TikTokPageHeader, TikTokContentCard, TikTokMetricsGrid, TikTokMetricCard } from '@/components/TikTokCenteredLayout'
import { PrintRunCard } from '@/components/printing/PrintRunCard'
import { StartPrintRunModal } from '@/components/printing/StartPrintRunModal'
import { MaterialLogModal } from '@/components/printing/MaterialLogModal'
import { RejectLogModal } from '@/components/printing/RejectLogModal'
import { 
  Settings,
  Play,
  Pause,
  Square,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Activity,
  Zap,
  Target,
  FileText
} from 'lucide-react'

interface PrintRun {
  id: string
  orderNumber: string
  brandName: string
  clientName: string
  method: string
  workcenter: string
  status: 'CREATED' | 'IN_PROGRESS' | 'PAUSED' | 'DONE' | 'CANCELLED'
  stepName: string
  machineName: string
  startedAt?: string
  endedAt?: string
  createdBy: string
  created_at: string
  totalGood: number
  totalReject: number
  materialsUsed: number
  rejectCount: number
  ashleyInsights?: {
    qualityPrediction: number
    speedOptimization: number
    materialWasteReduction: number
    qualityRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    recommendations: string[]
    colorConsistencyScore: number
    temperatureOptimization?: number
    inkUtilization?: number
  }
  realTimeMetrics?: {
    currentSpeed: number
    qualityScore: number
    temperatureStability: number
    materialConsumption: number
    timeElapsed: number
    expectedCompletion: string
  }
  order?: {
    productName?: string
    companyName?: string
    serviceType?: string
    garmentType?: string
    fabricType?: string
    fabricColors?: string
    designConcept?: string
    specialInstructions?: string
  }
}

interface Machine {
  id: string
  name: string
  workcenter: string
  is_active: boolean
  spec: any
  stats?: {
    totalRuns: number
    completedRuns: number
    utilization: number
    qualityRate: number
  }
}

const mockPrintRuns: PrintRun[] = [
  {
    id: '1',
    orderNumber: 'REEF-2024-000123',
    brandName: 'Reefer',
    clientName: 'ABC Corporation',
    method: 'SILKSCREEN',
    workcenter: 'PRINTING',
    status: 'IN_PROGRESS',
    stepName: 'Silkscreen Printing',
    machineName: 'Press A1',
    startedAt: '2024-09-02T08:00:00Z',
    createdBy: 'John Doe',
    created_at: '2024-09-02T07:30:00Z',
    totalGood: 85,
    totalReject: 3,
    materialsUsed: 4,
    rejectCount: 2,
    ashleyInsights: {
      qualityPrediction: 94.7,
      speedOptimization: 87.3,
      materialWasteReduction: 15.2,
      qualityRisk: 'LOW',
      recommendations: [
        'Maintain consistent ink viscosity for optimal coverage',
        'Check screen tension every 15 prints',
        'Temperature stable - continue current settings'
      ],
      colorConsistencyScore: 96.8,
      temperatureOptimization: 89.5,
      inkUtilization: 92.1
    },
    realTimeMetrics: {
      currentSpeed: 45.7,
      qualityScore: 94.3,
      temperatureStability: 98.2,
      materialConsumption: 87.6,
      timeElapsed: 125,
      expectedCompletion: '2024-09-02T11:45:00Z'
    },
    order: {
      productName: 'Corporate Logo Tees',
      companyName: 'ABC Corporation',
      serviceType: 'FULL_PRODUCTION',
      garmentType: 'T_SHIRT',
      fabricType: 'Cotton Jersey',
      fabricColors: 'Navy Blue',
      designConcept: 'Corporate branding with logo placement',
      specialInstructions: 'Ensure precise logo alignment'
    }
  },
  {
    id: '2',
    orderNumber: 'SORB-2024-000098',
    brandName: 'Sorbetes',
    clientName: 'XYZ Sports',
    method: 'SUBLIMATION',
    workcenter: 'PRINTING',
    status: 'CREATED',
    stepName: 'Sublimation Printing',
    machineName: 'Epson F570',
    createdBy: 'Maria Garcia',
    created_at: '2024-09-02T09:15:00Z',
    totalGood: 0,
    totalReject: 0,
    materialsUsed: 0,
    rejectCount: 0,
    ashleyInsights: {
      qualityPrediction: 96.2,
      speedOptimization: 91.5,
      materialWasteReduction: 18.7,
      qualityRisk: 'LOW',
      recommendations: [
        'Preheat sublimation paper for 30 seconds',
        'Use 195°C for optimal color vibrancy',
        'Verify fabric polyester content >65%'
      ],
      colorConsistencyScore: 98.1,
      temperatureOptimization: 94.3,
      inkUtilization: 89.7
    },
    realTimeMetrics: {
      currentSpeed: 0,
      qualityScore: 0,
      temperatureStability: 0,
      materialConsumption: 0,
      timeElapsed: 0,
      expectedCompletion: '2024-09-02T12:30:00Z'
    },
    order: {
      productName: 'Sports Jersey All-Over Print',
      companyName: 'XYZ Sports',
      serviceType: 'PRINTING_ONLY',
      garmentType: 'JERSEY',
      fabricType: 'Polyester Mesh',
      fabricColors: 'Multi-color',
      designConcept: 'Full sublimation sports jersey design',
      specialInstructions: 'Ensure color accuracy for team branding'
    }
  },
  {
    id: '3',
    orderNumber: 'REEF-2024-000124',
    brandName: 'Reefer',
    clientName: 'Event Organizers Inc',
    method: 'DTF',
    workcenter: 'HEAT_PRESS',
    status: 'DONE',
    stepName: 'DTF Heat Press',
    machineName: 'Heat Press B2',
    startedAt: '2024-09-01T14:00:00Z',
    endedAt: '2024-09-01T16:30:00Z',
    createdBy: 'Alex Thompson',
    created_at: '2024-09-01T13:45:00Z',
    totalGood: 120,
    totalReject: 5,
    materialsUsed: 3,
    rejectCount: 1
  }
]

const mockMachines: Machine[] = [
  {
    id: '1',
    name: 'Press A1',
    workcenter: 'PRINTING',
    is_active: true,
    spec: { bedSize: '40x50cm', colors: 6 },
    stats: { totalRuns: 12, completedRuns: 11, utilization: 78, qualityRate: 96.5 }
  },
  {
    id: '2',
    name: 'Epson F570',
    workcenter: 'PRINTING',
    is_active: true,
    spec: { width: '44inch', technology: 'PrecisionCore' },
    stats: { totalRuns: 8, completedRuns: 8, utilization: 65, qualityRate: 98.2 }
  },
  {
    id: '3',
    name: 'Heat Press B2',
    workcenter: 'HEAT_PRESS',
    is_active: true,
    spec: { bedSize: '38x38cm', maxTemp: '200C' },
    stats: { totalRuns: 15, completedRuns: 14, utilization: 82, qualityRate: 97.8 }
  }
]

export default function PrintingPage() {
  const [printRuns, setPrintRuns] = useState<PrintRun[]>(mockPrintRuns)
  const [machines, setMachines] = useState<Machine[]>(mockMachines)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [selectedRun, setSelectedRun] = useState<PrintRun | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const filteredRuns = printRuns.filter(run => {
    const matchesSearch = run.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         run.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         run.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter
    const matchesMethod = methodFilter === 'all' || run.method === methodFilter
    
    return matchesSearch && matchesStatus && matchesMethod
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  const handleStartRun = async (runId: string) => {
    try {
      const response = await fetch(`/api/printing/runs/${runId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Started via operator interface' })
      })

      if (response.ok) {
        setPrintRuns(prev => 
          prev.map(run => 
            run.id === runId 
              ? { ...run, status: 'IN_PROGRESS' as const, startedAt: new Date().toISOString() }
              : run
          )
        )
      }
    } catch (error) {
      console.error('Error starting print run:', error)
    }
  }

  const handleCompleteRun = async (runId: string) => {
    try {
      const response = await fetch(`/api/printing/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Completed via operator interface' })
      })

      if (response.ok) {
        setPrintRuns(prev => 
          prev.map(run => 
            run.id === runId 
              ? { ...run, status: 'DONE' as const, endedAt: new Date().toISOString() }
              : run
          )
        )
      }
    } catch (error) {
      console.error('Error completing print run:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      case 'CREATED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE': return <CheckCircle className="w-4 h-4" />
      case 'IN_PROGRESS': return <Play className="w-4 h-4" />
      case 'PAUSED': return <Pause className="w-4 h-4" />
      case 'CANCELLED': return <XCircle className="w-4 h-4" />
      case 'CREATED': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const stats = {
    total: printRuns.length,
    inProgress: printRuns.filter(r => r.status === 'IN_PROGRESS').length,
    completed: printRuns.filter(r => r.status === 'DONE').length,
    pending: printRuns.filter(r => r.status === 'CREATED').length,
    totalGood: printRuns.reduce((sum, r) => sum + r.totalGood, 0),
    totalReject: printRuns.reduce((sum, r) => sum + r.totalReject, 0),
    activeOperators: new Set(printRuns.filter(r => r.status === 'IN_PROGRESS').map(r => r.createdBy)).size
  }

  const qualityRate = stats.totalGood + stats.totalReject > 0 ? 
    (stats.totalGood / (stats.totalGood + stats.totalReject)) * 100 : 0

  return (
    <TikTokLayout>
      <TikTokCenteredLayout>
        <TikTokPageHeader
          title="Printing Operations"
          subtitle="Manage print runs, monitor machines, and track production quality"
          actions={
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={() => setShowStartModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Print Run
              </Button>
            </div>
          }
        />

        {/* Printing Metrics */}
        <TikTokMetricsGrid>
          <TikTokMetricCard
            title="Active Runs"
            value={stats.inProgress.toString()}
            subtitle="Currently running"
            icon={<Activity className="h-5 w-5" />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            trend="up"
          />
          <TikTokMetricCard
            title="Completed Today"
            value={stats.completed.toString()}
            subtitle="Finished runs"
            icon={<CheckCircle className="h-5 w-5" />}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            trend="up"
          />
          <TikTokMetricCard
            title="Quality Rate"
            value={`${qualityRate.toFixed(1)}%`}
            subtitle="Good vs total"
            icon={<Target className="h-5 w-5" />}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            trend="up"
          />
          <TikTokMetricCard
            title="Active Operators"
            value={stats.activeOperators.toString()}
            subtitle="Currently working"
            icon={<Zap className="h-5 w-5" />}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </TikTokMetricsGrid>

        <TikTokContentCard>
          {/* Machine Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              Machine Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => (
                <div key={machine.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{machine.name}</span>
                    <Badge className={machine.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {machine.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{machine.workcenter}</p>
                  {machine.stats && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Utilization:</span>
                        <span className="ml-1 font-medium">{machine.stats.utilization}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Quality:</span>
                        <span className="ml-1 font-medium">{machine.stats.qualityRate}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by order number, brand, or client..."
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
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white flex-1 sm:flex-initial"
                >
                  <option value="all">All Status</option>
                  <option value="CREATED">Created</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PAUSED">Paused</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white flex-1 sm:flex-initial"
                >
                  <option value="all">All Methods</option>
                  <option value="SILKSCREEN">Silkscreen</option>
                  <option value="SUBLIMATION">Sublimation</option>
                  <option value="DTF">DTF</option>
                  <option value="EMBROIDERY">Embroidery</option>
                </select>
              </div>
            </div>
          </div>

          {/* Print Runs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRuns.map((run) => (
              <Card key={run.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {run.orderNumber}
                      </CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-sm text-gray-600">
                        <span>{run.brandName}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{run.clientName}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                {/* Status and Method */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Badge className={`flex items-center space-x-1 text-xs ${getStatusColor(run.status)}`}>
                    {getStatusIcon(run.status)}
                    <span>{run.status.replace('_', ' ')}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {run.method}
                  </Badge>
                </div>

                {/* Machine and Progress */}
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between items-center">
                    <span>Machine: {run.machineName}</span>
                    <span>Good: {run.totalGood} | Reject: {run.totalReject}</span>
                  </div>
                  <div className="mt-1">
                    Step: {run.stepName}
                  </div>
                </div>

                {/* Ashley AI Insights for Active Runs */}
                {run.status === 'IN_PROGRESS' && run.ashleyInsights && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800 text-sm">Ashley AI Insights</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 mb-2">
                      <div>Quality: <strong>{run.ashleyInsights.qualityPrediction.toFixed(1)}%</strong></div>
                      <div>Speed: <strong>{run.ashleyInsights.speedOptimization.toFixed(1)}%</strong></div>
                      <div>Waste Reduction: <strong>{run.ashleyInsights.materialWasteReduction.toFixed(1)}%</strong></div>
                      <div>Risk: <strong className={
                        run.ashleyInsights.qualityRisk === 'HIGH' ? 'text-red-600' :
                        run.ashleyInsights.qualityRisk === 'MEDIUM' ? 'text-orange-600' :
                        'text-green-600'
                      }>{run.ashleyInsights.qualityRisk}</strong></div>
                    </div>
                    <div className="text-xs text-blue-700">
                      <div className="font-medium mb-1">Recommendations:</div>
                      {run.ashleyInsights.recommendations.slice(0, 2).map((rec, idx) => (
                        <div key={idx}>• {rec}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-time Metrics for Active Runs */}
                {run.status === 'IN_PROGRESS' && run.realTimeMetrics && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800 text-sm">Real-time Metrics</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                      <div>Speed: <strong>{run.realTimeMetrics.currentSpeed.toFixed(1)} pcs/hr</strong></div>
                      <div>Quality: <strong>{run.realTimeMetrics.qualityScore.toFixed(1)}%</strong></div>
                      <div>Temperature: <strong>{run.realTimeMetrics.temperatureStability.toFixed(1)}%</strong></div>
                      <div>Material: <strong>{run.realTimeMetrics.materialConsumption.toFixed(1)}%</strong></div>
                    </div>
                    <div className="text-xs text-green-600 mt-2">
                      Expected completion: <strong>{new Date(run.realTimeMetrics.expectedCompletion).toLocaleTimeString()}</strong>
                    </div>
                  </div>
                )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {run.status === 'CREATED' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStartRun(run.id)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {run.status === 'IN_PROGRESS' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-gray-200 hover:bg-gray-50"
                          onClick={() => {
                            setSelectedRun(run)
                            setShowMaterialModal(true)
                          }}
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Materials
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRun(run)
                            setShowRejectModal(true)
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleCompleteRun(run.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                    
                    {run.status === 'DONE' && (
                      <Button size="sm" variant="outline" className="border-gray-200 hover:bg-gray-50">
                        <FileText className="w-4 h-4 mr-1" />
                        Report
                      </Button>
                    )}
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>

            {filteredRuns.length === 0 && (
              <div className="col-span-full">
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No print runs found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm || statusFilter !== 'all' || methodFilter !== 'all' 
                        ? 'Try adjusting your filters or search terms'
                        : 'No print runs are currently available'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
        </TikTokContentCard>

        {/* Modals */}
        <StartPrintRunModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          onStart={(data) => {
            console.log('Starting new print run:', data)
            setShowStartModal(false)
          }}
        />

        <MaterialLogModal
          isOpen={showMaterialModal}
          onClose={() => {
            setShowMaterialModal(false)
            setSelectedRun(null)
          }}
          printRun={selectedRun}
          onLog={(data) => {
            console.log('Logging material:', data)
            setShowMaterialModal(false)
            setSelectedRun(null)
          }}
        />

        <RejectLogModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setSelectedRun(null)
          }}
          printRun={selectedRun}
          onLog={(data) => {
            console.log('Logging reject:', data)
            setShowRejectModal(false)
            setSelectedRun(null)
          }}
        />
      </TikTokCenteredLayout>
    </TikTokLayout>
  )
}