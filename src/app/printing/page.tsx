'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import ResponsiveLayout from '@/components/ResponsiveLayout'
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
  createdAt: string
  totalGood: number
  totalReject: number
  materialsUsed: number
  rejectCount: number
}

interface Machine {
  id: string
  name: string
  workcenter: string
  isActive: boolean
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
    createdAt: '2024-09-02T07:30:00Z',
    totalGood: 85,
    totalReject: 3,
    materialsUsed: 4,
    rejectCount: 2
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
    createdAt: '2024-09-02T09:15:00Z',
    totalGood: 0,
    totalReject: 0,
    materialsUsed: 0,
    rejectCount: 0
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
    createdAt: '2024-09-01T13:45:00Z',
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
    isActive: true,
    spec: { bedSize: '40x50cm', colors: 6 },
    stats: { totalRuns: 12, completedRuns: 11, utilization: 78, qualityRate: 96.5 }
  },
  {
    id: '2',
    name: 'Epson F570',
    workcenter: 'PRINTING',
    isActive: true,
    spec: { width: '44inch', technology: 'PrecisionCore' },
    stats: { totalRuns: 8, completedRuns: 8, utilization: 65, qualityRate: 98.2 }
  },
  {
    id: '3',
    name: 'Heat Press B2',
    workcenter: 'HEAT_PRESS',
    isActive: true,
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
    <ResponsiveLayout>
      <div className="responsive-container mobile-dashboard tablet-dashboard laptop-dashboard desktop-dashboard">
        {/* Header */}
        <div className="mobile-header tablet-header laptop-header desktop-header">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold flex items-center space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Settings className="h-4 w-4 md:h-6 md:w-6 text-white" />
                </div>
                <span className="ash-gradient-text">Printing Operations</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm md:text-base">Manage print runs, monitor machines, and track production quality</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="btn-mobile md:btn-tablet lg:btn-laptop"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>
              <Button 
                onClick={() => setShowStartModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white btn-mobile md:btn-tablet lg:btn-laptop"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Print Run</span>
                <span className="sm:hidden">New</span>
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
                  <p className="text-xs md:text-sm font-medium text-gray-600">Active Runs</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900">{stats.inProgress}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-xl md:text-2xl font-bold text-green-900">{stats.completed}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Quality Rate</p>
                  <p className="text-xl md:text-2xl font-bold text-purple-900">{qualityRate.toFixed(1)}%</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Operators</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-900">{stats.activeOperators}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Machine Status */}
        <Card className="enhanced-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Machine Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => (
                <div key={machine.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{machine.name}</span>
                    <Badge className={machine.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {machine.isActive ? 'Active' : 'Inactive'}
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
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="enhanced-card">
          <CardContent className="p-responsive">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by order number, brand, or client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 form-mobile md:form-tablet lg:form-laptop"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white form-mobile md:form-tablet lg:form-laptop flex-1 sm:flex-initial"
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
                  className="px-3 py-2 border rounded-lg bg-white form-mobile md:form-tablet lg:form-laptop flex-1 sm:flex-initial"
                >
                  <option value="all">All Methods</option>
                  <option value="SILKSCREEN">Silkscreen</option>
                  <option value="SUBLIMATION">Sublimation</option>
                  <option value="DTF">DTF</option>
                  <option value="EMBROIDERY">Embroidery</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Print Runs Grid */}
        <div className="designs-grid-mobile md:designs-grid-tablet lg:designs-grid-laptop xl:designs-grid-desktop">
          {filteredRuns.map((run) => (
            <Card key={run.id} className="design-card-mobile md:design-card-tablet lg:design-card-laptop xl:design-card-desktop enhanced-card hover-lift">
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                      {run.orderNumber}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs md:text-sm text-gray-600">
                      <span>{run.brandName}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{run.clientName}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 md:space-y-4">
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

                {/* Actions */}
                <div className="mobile-actions md:flex md:items-center md:space-x-2 md:space-y-0">
                  {run.status === 'CREATED' && (
                    <Button 
                      size="sm" 
                      className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-green-600 hover:bg-green-700"
                      onClick={() => handleStartRun(run.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      <span>Start</span>
                    </Button>
                  )}
                  
                  {run.status === 'IN_PROGRESS' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial"
                        onClick={() => {
                          setSelectedRun(run)
                          setShowMaterialModal(true)
                        }}
                      >
                        <Package className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Materials</span>
                        <span className="sm:hidden">Mat</span>
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedRun(run)
                          setShowRejectModal(true)
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Reject</span>
                        <span className="sm:hidden">Rej</span>
                      </Button>
                      
                      <Button 
                        size="sm" 
                        className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleCompleteRun(run.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Complete</span>
                        <span className="sm:hidden">Done</span>
                      </Button>
                    </>
                  )}
                  
                  {run.status === 'DONE' && (
                    <Button size="sm" variant="outline" className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial">
                      <FileText className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Report</span>
                      <span className="sm:hidden">Rep</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRuns.length === 0 && (
          <Card className="enhanced-card">
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
        )}

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
      </div>
    </ResponsiveLayout>
  )
}