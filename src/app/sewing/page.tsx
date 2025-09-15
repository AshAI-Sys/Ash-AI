// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, Pause, CheckCircle, Clock, Scan, User, Package, TrendingUp, AlertTriangle, 
  Settings, Filter, Search, QrCode, Camera, Zap, Target, Award, Timer, 
  Activity, BarChart3, Smartphone, Wifi, WifiOff, Users, Bell, Star,
  RefreshCw, ChevronRight, DollarSign, Gauge, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

interface SewingRun {
  id: string
  status: 'CREATED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  operationName: string
  qtyGood: number
  qtyDefects: number
  qtyRejects: number
  efficiency?: number
  actualMinutes?: number
  startedAt?: string
  endedAt?: string
  pausedAt?: string
  estimatedCompletionTime?: string
  realTimePerformance?: {
    currentPiecesPerHour: number
    targetPiecesPerHour: number
    currentEfficiency: number
    earnings: number
    qualityScore: number
    timeElapsed: number
    piecesCompleted: number
    avgTimePerPiece: number
  }
  qrValidation?: {
    scanned: boolean
    bundleVerified: boolean
    operatorVerified: boolean
    timestamp?: string
    qrData?: string
  }
  operator: {
    id: string
    name: string
    skillLevel?: string
    currentWorkload?: number
    efficiency?: number
    isOnline?: boolean
  }
  bundle: {
    id: string
    bundleNumber: string
    targetQty: number
    qrCode?: string
    currentStation?: string
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  }
  order: {
    id: string
    orderNumber: string
    productType: string
    productName?: string
    companyName?: string
    serviceType?: string
    garmentType?: string
    fabricType?: string
    fabricColors?: string
    designConcept?: string
    specialInstructions?: string
    priority?: string
    targetDeliveryDate?: string
  }
  operation: {
    id: string
    standardMinutes: number
    pieceRate?: number
    difficulty?: string
    qualityCheckpoints?: string[]
    requiredSkills?: string[]
  }
  ashleyInsights?: {
    performancePrediction: number
    qualityRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    recommendations: string[]
    anomalies: string[]
  }
}

interface SewingOperation {
  id: string
  name: string
  description?: string
  category: string
  standardMinutes: number
  difficulty: string
  skillLevel: string
  status: string
  stats?: {
    totalRuns: number
    avgEfficiency: number
    avgQuality: number
    totalPieces: number
    performanceTrend: 'improving' | 'stable' | 'declining'
  }
}

export default function SewingPage() {
  const { data: session } = useSession()
  const [runs, setRuns] = useState<SewingRun[]>([])
  const [operations, setOperations] = useState<SewingOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<SewingRun | null>(null)
  const [qrScanValue, setQrScanValue] = useState('')
  const [isMobileView, setIsMobileView] = useState(false)
  const [isQRScannerActive, setIsQRScannerActive] = useState(false)
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({})
  const [isOnline, setIsOnline] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [operatorMode, setOperatorMode] = useState(false)
  const [selectedOperator, setSelectedOperator] = useState<string>('')
  const [performanceView, setPerformanceView] = useState<'summary' | 'detailed'>('summary')
  const [filters, setFilters] = useState({
    status: '',
    operator: '',
    operation: '',
    search: '',
    priority: '',
    station: ''
  })
  const qrInputRef = useRef<HTMLInputElement>(null)
  const refreshInterval = useRef<NodeJS.Timeout>()

  // Real-time updates and mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (navigator.onLine) {
        toast.success('🟢 Connection restored - syncing data...')
        fetchRuns()
        fetchOperations()
      } else {
        toast.error('🔴 Connection lost - working offline')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
    fetchOperations()
  }, [filters])

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (autoRefresh && isOnline) {
      refreshInterval.current = setInterval(() => {
        fetchRealTimeData()
      }, 5000) // Update every 5 seconds
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [autoRefresh, isOnline])

  const fetchRuns = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.operator) params.set('operator', filters.operator)
      if (filters.operation) params.set('operation', filters.operation)
      if (filters.search) params.set('search', filters.search)
      params.set('analytics', 'true')

      const response = await fetch(`/api/sewing/runs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch runs')
      
      const data = await response.json()
      setRuns(data.runs || [])
    } catch (error) {
      console.error('Error fetching runs:', error)
      console.error('Failed to load sewing runs')
    }
  }

  const fetchOperations = async () => {
    try {
      const response = await fetch('/api/sewing/operations?stats=true')
      if (!response.ok) throw new Error('Failed to fetch operations')
      
      const data = await response.json()
      setOperations(data.operations || [])
    } catch (error) {
      console.error('Error fetching operations:', error)
      console.error('Failed to load operations')
    } finally {
      setLoading(false)
    }
  }

  // Enhanced QR scanning with real-time validation
  const handleQRScan = useCallback((qrData: string) => {
    const run = runs.find(r => r.id === selectedRun?.id)
    if (!run) return

    // Expected format: BUNDLE-{bundleNumber}-{operationName}
    const expectedQR = `BUNDLE-${run.bundle.bundleNumber}-${run.operationName}`
    const isValid = qrData === expectedQR
    
    if (isValid) {
      if (soundEnabled) {
        // Success sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUdAznU9GbTgDAJIH3P9L9sEA9Mp+HrymAcAzyR1/LMP')
      }
      toast.success(`✅ Bundle ${run.bundle.bundleNumber} verified!`)
      startRun(run.id, qrData)
    } else {
      if (soundEnabled) {
        // Error sound  
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUdAznP1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUdFg==')
      }
      toast.error(`❌ Invalid QR code. Expected: ${expectedQR}`)
    }
    
    setQrScanValue(qrData)
    setIsQRScannerActive(false)
  }, [selectedRun, runs, soundEnabled])

  const startRun = async (runId: string, qrData?: string) => {
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bundleQrData: qrData,
          operatorId: selectedOperator || session?.user?.id,
          notes: qrData ? 'QR Code scanned and verified' : undefined,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start run')
      }

      const data = await response.json()
      toast.success(`🚀 ${data.message}`)
      
      if (data.operatorWorkload?.level === 'HIGH') {
        toast.warning(`⚠️ ${data.operatorWorkload.message}`)
      }

      if (data.ashleyInsights?.recommendations?.length > 0) {
        toast.info(`🤖 Ashley AI: ${data.ashleyInsights.recommendations[0]}`)
      }

      fetchRuns()
      setSelectedRun(null)
      setQrScanValue('')
    } catch (error) {
      console.error('Error starting run:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start run')
    }
  }

  const pauseRun = async (runId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, timestamp: new Date().toISOString() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to pause run')
      }

      const data = await response.json()
      toast.success(`⏸️ ${data.message}`)
      fetchRuns()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to pause run')
    }
  }

  const resumeRun = async (runId: string) => {
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resume run')
      }

      const data = await response.json()
      toast.success(`▶️ ${data.message}`)
      fetchRuns()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resume run')
    }
  }

  const completeRun = async (runId: string, completionData: any) => {
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...completionData,
          timestamp: new Date().toISOString(),
          operatorId: selectedOperator || session?.user?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete run')
      }

      const data = await response.json()
      toast.success(`✅ ${data.message}`)
      
      // Enhanced Ashley AI insights display
      if (data.insights?.length > 0) {
        data.insights.forEach((insight: any) => {
          const emoji = insight.priority === 'HIGH' ? '🔴' : insight.priority === 'MEDIUM' ? '🟡' : '🟢'
          toast[insight.priority === 'HIGH' ? 'error' : insight.priority === 'MEDIUM' ? 'warning' : 'info'](
            `${emoji} ${insight.title}: ${insight.message}`
          )
        })
      }

      if (data.performance) {
        const { efficiency, earnings, qualityScore } = data.performance
        toast.success(
          `📊 Performance: ${efficiency}% efficiency • $${earnings.toFixed(2)} earned • ${qualityScore}% quality`
        )
      }

      if (data.achievements?.length > 0) {
        data.achievements.forEach((achievement: string) => {
          toast.success(`🏆 Achievement unlocked: ${achievement}`)
        })
      }

      fetchRuns()
      setSelectedRun(null)
    } catch (error) {
      console.error('Error completing run:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to complete run')
    }
  }

  const fetchRealTimeData = async () => {
    if (!isOnline) return
    
    try {
      const response = await fetch('/api/sewing/realtime')
      if (response.ok) {
        const data = await response.json()
        setRealTimeData(data)
        
        // Update runs with real-time performance data
        setRuns(prevRuns => 
          prevRuns.map(run => ({
            ...run,
            realTimePerformance: data.runs?.[run.id] || run.realTimePerformance
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      CREATED: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'outline',
      CANCELLED: 'destructive'
    } as const

    const icons = {
      CREATED: Clock,
      IN_PROGRESS: Play,
      COMPLETED: CheckCircle,
      CANCELLED: AlertTriangle
    }

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'declining') return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
    return <TrendingUp className="h-4 w-4 text-gray-400" />
  }

  if (loading) {
    return <div className="p-6">Loading sewing operations...</div>
  }

  // Mobile operator view component
  const MobileOperatorView = () => (
    <div className="space-y-4">
      {/* Operator Quick Stats */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              {session?.user?.name || 'Operator'}
            </h3>
            <Badge variant="secondary" className="text-blue-900 bg-white/20">
              {isOnline ? (
                <><Wifi className="h-3 w-3 mr-1" /> Online</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
              )}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-2xl font-bold">{runs.filter(r => r.status === 'IN_PROGRESS').length}</p>
              <p className="opacity-80">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{runs.filter(r => r.status === 'COMPLETED').length}</p>
              <p className="opacity-80">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">94%</p>
              <p className="opacity-80">Efficiency</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick QR Scanner */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Quick QR Scan
            </h4>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsQRScannerActive(!isQRScannerActive)}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <Input
            ref={qrInputRef}
            placeholder="Scan or enter bundle QR code"
            value={qrScanValue}
            onChange={(e) => {
              setQrScanValue(e.target.value)
              if (e.target.value.length > 10) {
                handleQRScan(e.target.value)
              }
            }}
            className="font-mono text-sm"
          />
          {isQRScannerActive && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              📷 Camera scanner ready - aim at QR code
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Runs - Mobile Optimized */}
      <div className="space-y-3">
        {runs.filter(run => run.status !== 'COMPLETED').map((run) => (
          <Card key={run.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-semibold text-sm">{run.operationName}</h5>
                  <p className="text-xs text-muted-foreground">Bundle: {run.bundle.bundleNumber}</p>
                </div>
                {getStatusBadge(run.status)}
              </div>
              
              {run.realTimePerformance && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-green-50 p-2 rounded text-center">
                    <p className="text-lg font-bold text-green-600">{run.realTimePerformance.currentEfficiency}%</p>
                    <p className="text-xs text-green-700">Efficiency</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <p className="text-lg font-bold text-blue-600">${run.realTimePerformance.earnings.toFixed(2)}</p>
                    <p className="text-xs text-blue-700">Earned</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {run.status === 'CREATED' && (
                  <Button size="sm" className="flex-1" onClick={() => setSelectedRun(run)}>
                    <Play className="h-3 w-3 mr-1" /> Start
                  </Button>
                )}
                {run.status === 'IN_PROGRESS' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => pauseRun(run.id)}>
                      <Pause className="h-3 w-3 mr-1" /> Pause
                    </Button>
                    <SewingRunCompleteDialog run={run} onComplete={completeRun} />
                  </>
                )}
                {run.status === 'PAUSED' && (
                  <Button size="sm" className="flex-1" onClick={() => resumeRun(run.id)}>
                    <Play className="h-3 w-3 mr-1" /> Resume
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p>Loading sewing operations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isMobileView ? 'p-4' : 'p-6'} space-y-6 max-w-7xl mx-auto`}>
      {/* Enhanced Header with Real-time Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
            ASH AI Sewing Operations
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Real-time production tracking with QR scanning & Ashley AI optimization
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setOperatorMode(!operatorMode)}
            className={operatorMode ? 'bg-blue-100 border-blue-300' : ''}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            {operatorMode ? 'Exit' : 'Operator'} Mode
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-100 border-green-300' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Mobile Operator Mode */}
      {(isMobileView || operatorMode) ? (
        <MobileOperatorView />
      ) : (
        <>
          {/* Real-time Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Active Runs</p>
                    <p className="text-2xl font-bold text-green-900">{runs.filter(r => r.status === 'IN_PROGRESS').length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {runs.filter(r => r.status === 'PAUSED').length} paused
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Avg Efficiency</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {runs.length > 0 ? Math.round(runs.reduce((acc, run) => acc + (run.efficiency || 0), 0) / runs.length) : 0}%
                    </p>
                  </div>
                  <Gauge className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-blue-600 mt-1">Real-time tracking</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Quality Score</p>
                    <p className="text-2xl font-bold text-yellow-900">96.8%</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-xs text-yellow-600 mt-1">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Total Operators</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {new Set(runs.map(r => r.operator.id)).size}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  {runs.filter(r => r.operator.isOnline).length} online
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active-runs" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6">
              <TabsTrigger value="active-runs" className="text-xs lg:text-sm">Active Runs</TabsTrigger>
              <TabsTrigger value="qr-scanner" className="text-xs lg:text-sm">QR Scanner</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs lg:text-sm">Performance</TabsTrigger>
              <TabsTrigger value="operations" className="text-xs lg:text-sm">Operations</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs lg:text-sm">History</TabsTrigger>
              <TabsTrigger value="ashley-ai" className="text-xs lg:text-sm">Ashley AI</TabsTrigger>
            </TabsList>

            {/* Enhanced Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search runs, operations, bundles, or operators..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="CREATED">Created</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priorities</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.operation} onValueChange={(value) => setFilters(prev => ({ ...prev, operation: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Operation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Operations</SelectItem>
                    {operations.map((op) => (
                      <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="active-runs">
              <div className="grid gap-4">
                {runs.filter(run => run.status !== 'COMPLETED').map((run) => (
                  <Card key={run.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{run.operationName}</h3>
                            {getStatusBadge(run.status)}
                            {run.bundle.priority && (
                              <Badge variant={run.bundle.priority === 'URGENT' ? 'destructive' : run.bundle.priority === 'HIGH' ? 'default' : 'secondary'}>
                                {run.bundle.priority}
                              </Badge>
                            )}
                            {run.qrValidation?.scanned && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <QrCode className="h-3 w-3 mr-1" /> QR Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {run.order.productName || run.order.productType} • Order: {run.order.orderNumber} • Bundle: {run.bundle.bundleNumber}
                          </p>
                          {(run.order.companyName || run.order.serviceType) && (
                            <p className="text-xs text-muted-foreground">
                              {run.order.companyName && `${run.order.companyName}`}
                              {run.order.companyName && run.order.serviceType && " • "}
                              {run.order.serviceType && run.order.serviceType.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${run.operator.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <p className="font-medium">{run.operator.name}</p>
                          </div>
                          <p className="text-muted-foreground">{run.order.productType}</p>
                          {run.operator.skillLevel && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {run.operator.skillLevel}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Real-time Performance Dashboard */}
                      {run.realTimePerformance && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Live Performance
                          </h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">{run.realTimePerformance.currentEfficiency}%</p>
                              <p className="text-xs text-muted-foreground">Efficiency</p>
                              <Progress value={run.realTimePerformance.currentEfficiency} className="h-1 mt-1" />
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">${run.realTimePerformance.earnings.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">Earnings</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-purple-600">{run.realTimePerformance.currentPiecesPerHour}</p>
                              <p className="text-xs text-muted-foreground">Pieces/Hr</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-orange-600">{Math.round(run.realTimePerformance.timeElapsed / 60)}m</p>
                              <p className="text-xs text-muted-foreground">Elapsed</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ashley AI Insights */}
                      {run.ashleyInsights && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">AI</span>
                            </div>
                            <span className="text-sm font-medium text-purple-700">Ashley AI Insights</span>
                            <Badge variant="outline" className={`text-xs ${
                              run.ashleyInsights.qualityRisk === 'HIGH' ? 'border-red-300 text-red-600' :
                              run.ashleyInsights.qualityRisk === 'MEDIUM' ? 'border-yellow-300 text-yellow-600' :
                              'border-green-300 text-green-600'
                            }`}>
                              {run.ashleyInsights.qualityRisk} Risk
                            </Badge>
                          </div>
                          {run.ashleyInsights.recommendations.length > 0 && (
                            <p className="text-sm text-purple-800">
                              💡 {run.ashleyInsights.recommendations[0]}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                          <p className="text-2xl font-bold text-blue-600">{run.bundle.targetQty}</p>
                          <p className="text-xs text-blue-700 font-medium">Target Qty</p>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                          <p className="text-2xl font-bold text-green-600">{run.qtyGood || 0}</p>
                          <p className="text-xs text-green-700 font-medium">Good</p>
                          {run.bundle.targetQty > 0 && (
                            <Progress 
                              value={(run.qtyGood / run.bundle.targetQty) * 100} 
                              className="h-1 mt-2" 
                            />
                          )}
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                          <p className="text-2xl font-bold text-yellow-600">{run.qtyDefects || 0}</p>
                          <p className="text-xs text-yellow-700 font-medium">Defects</p>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                          <p className="text-2xl font-bold text-red-600">{run.qtyRejects || 0}</p>
                          <p className="text-xs text-red-700 font-medium">Rejects</p>
                        </div>
                      </div>

                  {/* Enhanced Order Details for Sewing */}
                  {(run.order.fabricType || run.order.fabricColors || run.order.garmentType || run.order.specialInstructions) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {run.order.garmentType && (
                          <div>
                            <span className="font-medium text-blue-700">Garment:</span>
                            <p className="text-blue-800">{run.order.garmentType}</p>
                          </div>
                        )}
                        {run.order.fabricType && (
                          <div>
                            <span className="font-medium text-blue-700">Fabric:</span>
                            <p className="text-blue-800">{run.order.fabricType}</p>
                          </div>
                        )}
                        {run.order.fabricColors && (
                          <div>
                            <span className="font-medium text-blue-700">Colors:</span>
                            <p className="text-blue-800">{run.order.fabricColors}</p>
                          </div>
                        )}
                        {run.order.designConcept && (
                          <div>
                            <span className="font-medium text-blue-700">Design:</span>
                            <p className="text-blue-800 truncate" title={run.order.designConcept}>{run.order.designConcept}</p>
                          </div>
                        )}
                      </div>
                      {run.order.specialInstructions && (
                        <div className="mt-2 pt-2 border-t border-blue-300">
                          <span className="text-xs font-medium text-blue-700">Special Instructions:</span>
                          <p className="text-xs text-blue-800 mt-1">{run.order.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  )}

                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {run.operation.standardMinutes} min/pc
                          </div>
                          {run.operation.pieceRate && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {run.operation.pieceRate.toFixed(3)}/pc
                            </div>
                          )}
                          {run.efficiency && (
                            <div className={`flex items-center gap-1 ${run.efficiency >= 100 ? 'text-green-600' : run.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                              <TrendingUp className="h-4 w-4" />
                              {run.efficiency.toFixed(0)}% eff
                            </div>
                          )}
                          {run.startedAt && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Timer className="h-4 w-4" />
                              Started {new Date(run.startedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {run.status === 'CREATED' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setSelectedRun(run)} className="bg-green-600 hover:bg-green-700">
                                  <Play className="h-4 w-4 mr-1" />
                                  Start
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <QrCode className="h-5 w-5" />
                                    Start Sewing Run
                                  </DialogTitle>
                                  <DialogDescription>
                                    {run.operationName} - Bundle {run.bundle.bundleNumber}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Alert>
                                    <Target className="h-4 w-4" />
                                    <AlertDescription>
                                      Expected QR: <code className="bg-muted px-1 rounded">BUNDLE-{run.bundle.bundleNumber}-{run.operationName}</code>
                                    </AlertDescription>
                                  </Alert>
                                  
                                  <div>
                                    <label className="text-sm font-medium">QR Code Scanner</label>
                                    <div className="flex gap-2 mt-2">
                                      <Input
                                        ref={qrInputRef}
                                        placeholder="Scan or manually enter QR code"
                                        value={qrScanValue}
                                        onChange={(e) => {
                                          setQrScanValue(e.target.value)
                                          if (e.target.value.length > 15) {
                                            handleQRScan(e.target.value)
                                          }
                                        }}
                                        className="font-mono"
                                      />
                                      <Button 
                                        variant="outline" 
                                        size="icon"
                                        onClick={() => setIsQRScannerActive(!isQRScannerActive)}
                                      >
                                        <Camera className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {isQRScannerActive && (
                                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                        <div className="flex items-center gap-2 text-blue-700">
                                          <Camera className="h-4 w-4 animate-pulse" />
                                          <span className="text-sm">Camera scanner active - aim at QR code</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 bg-muted rounded">
                                      <p className="font-medium">Bundle Info</p>
                                      <p className="text-muted-foreground">Qty: {run.bundle.targetQty}</p>
                                      <p className="text-muted-foreground">Station: {run.bundle.currentStation || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-muted rounded">
                                      <p className="font-medium">Operation</p>
                                      <p className="text-muted-foreground">SMV: {run.operation.standardMinutes}</p>
                                      <p className="text-muted-foreground">Rate: ${run.operation.pieceRate?.toFixed(3) || 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setSelectedRun(null)}>
                                      Cancel
                                    </Button>
                                    <Button 
                                      onClick={() => startRun(run.id, qrScanValue || undefined)}
                                      disabled={!qrScanValue && run.bundle.qrCode}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Play className="h-4 w-4 mr-1" />
                                      Start Run
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          {run.status === 'IN_PROGRESS' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => pauseRun(run.id, 'Manual pause')}
                                className="border-yellow-300 hover:bg-yellow-50"
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                              <SewingRunCompleteDialog 
                                run={run} 
                                onComplete={completeRun}
                              />
                            </>
                          )}

                          {run.status === 'PAUSED' && (
                            <Button 
                              size="sm"
                              onClick={() => resumeRun(run.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </Button>
                          )}
                        </div>
                      </div>

                      {run.status === 'IN_PROGRESS' && run.estimatedCompletionTime && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-700">
                              ⏰ Estimated completion: {new Date(run.estimatedCompletionTime).toLocaleTimeString()}
                            </span>
                            {run.realTimePerformance?.piecesCompleted && (
                              <Badge variant="outline" className="text-blue-600">
                                {run.realTimePerformance.piecesCompleted}/{run.bundle.targetQty} pieces
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {runs.filter(run => run.status !== 'COMPLETED').length === 0 && (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Active Runs</h3>
                      <p className="text-muted-foreground mb-4">
                        All sewing operations are completed or no runs have been created yet.
                      </p>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Run
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* QR Scanner Tab */}
            <TabsContent value="qr-scanner">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Bundle QR Scanner
                  </CardTitle>
                  <CardDescription>
                    Scan bundle QR codes to automatically start operations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">QR Scanner Input</label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Scan or enter bundle QR code"
                              value={qrScanValue}
                              onChange={(e) => {
                                setQrScanValue(e.target.value)
                                if (e.target.value.length > 15) {
                                  handleQRScan(e.target.value)
                                }
                              }}
                              className="font-mono text-lg"
                            />
                            <Button 
                              variant="outline" 
                              onClick={() => setIsQRScannerActive(!isQRScannerActive)}
                              className={isQRScannerActive ? 'bg-green-100 border-green-300' : ''}
                            >
                              <Camera className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>

                        {isQRScannerActive && (
                          <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                                  <Camera className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-green-800">Camera Scanner Active</p>
                                  <p className="text-sm text-green-600">Position QR code in camera view</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-96">
                      <div className="space-y-4">
                        <h4 className="font-medium">QR Code Formats</h4>
                        <div className="space-y-2 text-sm">
                          <div className="p-3 bg-muted rounded">
                            <p className="font-mono text-xs">BUNDLE-[NUMBER]-[OPERATION]</p>
                            <p className="text-muted-foreground mt-1">Standard bundle format</p>
                          </div>
                          <div className="p-3 bg-muted rounded">
                            <p className="font-mono text-xs">OP-[OPERATION_ID]-[BUNDLE_ID]</p>
                            <p className="text-muted-foreground mt-1">Operation-first format</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Recent QR Scans</h4>
                    <div className="grid gap-2">
                      {/* QR scan history would be populated here */}
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No recent scans
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Dashboard Tab */}
            <TabsContent value="performance">
              <div className="space-y-6">
                {/* Real-time Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm">Overall Efficiency</p>
                          <p className="text-3xl font-bold">
                            {runs.length > 0 ? Math.round(runs.reduce((acc, run) => acc + (run.efficiency || 0), 0) / runs.length) : 0}%
                          </p>
                        </div>
                        <Gauge className="h-10 w-10 text-blue-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm">Total Earnings</p>
                          <p className="text-3xl font-bold">
                            ${runs.reduce((acc, run) => acc + (run.realTimePerformance?.earnings || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="h-10 w-10 text-green-200" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">Quality Score</p>
                          <p className="text-3xl font-bold">96.2%</p>
                        </div>
                        <Star className="h-10 w-10 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Operator Performance Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Operator Performance</CardTitle>
                    <CardDescription>Real-time operator metrics and rankings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.values(
                        runs.reduce((acc, run) => {
                          if (!acc[run.operator.id]) {
                            acc[run.operator.id] = {
                              ...run.operator,
                              totalRuns: 0,
                              avgEfficiency: 0,
                              totalEarnings: 0,
                              activeRuns: 0
                            }
                          }
                          acc[run.operator.id].totalRuns++
                          acc[run.operator.id].avgEfficiency += run.efficiency || 0
                          acc[run.operator.id].totalEarnings += run.realTimePerformance?.earnings || 0
                          if (run.status === 'IN_PROGRESS') acc[run.operator.id].activeRuns++
                          return acc
                        }, {} as Record<string, any>)
                      ).map((operator: any) => (
                        <div key={operator.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${operator.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <div>
                              <p className="font-medium">{operator.name}</p>
                              <p className="text-sm text-muted-foreground">{operator.skillLevel || 'Standard'}</p>
                            </div>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-bold">{operator.activeRuns}</p>
                              <p className="text-muted-foreground">Active</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">{Math.round(operator.avgEfficiency / operator.totalRuns)}%</p>
                              <p className="text-muted-foreground">Efficiency</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold">${operator.totalEarnings.toFixed(2)}</p>
                              <p className="text-muted-foreground">Earnings</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operations">
          <div className="grid gap-4">
            {operations.map((operation) => (
              <Card key={operation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{operation.name}</h3>
                        <Badge variant={operation.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {operation.status}
                        </Badge>
                        <Badge variant="outline">{operation.category}</Badge>
                      </div>
                      {operation.description && (
                        <p className="text-sm text-muted-foreground">{operation.description}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{operation.standardMinutes} min</p>
                      <p className="text-muted-foreground">Standard time</p>
                    </div>
                  </div>

                  {operation.stats && (
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{operation.stats.totalRuns}</p>
                        <p className="text-xs text-muted-foreground">Total Runs</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {operation.stats.avgEfficiency ? `${operation.stats.avgEfficiency}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Efficiency</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {operation.stats.avgQuality ? `${operation.stats.avgQuality}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Quality</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-center mb-1">
                          {getTrendIcon(operation.stats.performanceTrend)}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {operation.stats.performanceTrend}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Skill: {operation.skillLevel}</span>
                      <span>Difficulty: {operation.difficulty}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </TabsContent>

            <TabsContent value="completed">
          <div className="grid gap-4">
            {runs.filter(run => run.status === 'COMPLETED').map((run) => (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{run.operationName}</h3>
                        {getStatusBadge(run.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {run.operator.name} • {run.order.productName || run.order.productType} • Bundle {run.bundle.bundleNumber}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {run.endedAt && new Date(run.endedAt).toLocaleDateString()}
                      </p>
                      <p className="text-muted-foreground">
                        {run.actualMinutes ? `${Math.round(run.actualMinutes)} min` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold text-green-600">{run.qtyGood}</p>
                      <p className="text-xs text-muted-foreground">Good</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold text-yellow-600">{run.qtyDefects}</p>
                      <p className="text-xs text-muted-foreground">Defects</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold text-red-600">{run.qtyRejects}</p>
                      <p className="text-xs text-muted-foreground">Rejects</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className={`text-lg font-bold ${run.efficiency && run.efficiency >= 100 ? 'text-green-600' : run.efficiency && run.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {run.efficiency ? `${run.efficiency.toFixed(0)}%` : 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">Efficiency</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">
                        {run.qtyGood > 0 ? `${((run.qtyGood / (run.qtyGood + run.qtyDefects + run.qtyRejects)) * 100).toFixed(0)}%` : '0%'}
                      </p>
                      <p className="text-xs text-muted-foreground">Quality</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </TabsContent>

            <TabsContent value="ashley-ai">
              <div className="grid gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">Analytics Coming Soon</span>
                  </div>
                  <p className="text-blue-700">
                    Advanced sewing analytics and reporting dashboard coming soon. This will include real-time efficiency tracking,
                    operator performance insights, and production forecasting.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

// Component for completing sewing runs
function SewingRunCompleteDialog({ run, onComplete }: { run: SewingRun, onComplete: (runId: string, data: any) => void }) {
  const [qtyGood, setQtyGood] = useState('')
  const [qtyDefects, setQtyDefects] = useState('0')
  const [qtyRejects, setQtyRejects] = useState('0')
  const [notes, setNotes] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = () => {
    const good = parseInt(qtyGood) || 0
    const defects = parseInt(qtyDefects) || 0
    const rejects = parseInt(qtyRejects) || 0

    if (good + defects + rejects === 0) {
      console.error('Please enter at least one piece quantity')
      return
    }

    onComplete(run.id, {
      qtyGood: good,
      qtyDefects: defects,
      qtyRejects: rejects,
      notes: notes.trim() || undefined
    })
    setIsOpen(false)
    setQtyGood('')
    setQtyDefects('0')
    setQtyRejects('0')
    setNotes('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle className="h-4 w-4 mr-1" />
          Complete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Sewing Run</DialogTitle>
          <DialogDescription>
            {run.operationName} - Bundle {run.bundle.bundleNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Good Pieces</label>
              <Input
                type="number"
                placeholder="0"
                value={qtyGood}
                onChange={(e) => setQtyGood(e.target.value)}
                min="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Defects</label>
              <Input
                type="number"
                placeholder="0"
                value={qtyDefects}
                onChange={(e) => setQtyDefects(e.target.value)}
                min="0"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rejects</label>
              <Input
                type="number"
                placeholder="0"
                value={qtyRejects}
                onChange={(e) => setQtyRejects(e.target.value)}
                min="0"
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Input
              placeholder="Quality issues, machine problems, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p><strong>Target:</strong> {run.bundle.targetQty} pieces</p>
            <p><strong>Standard Time:</strong> {run.operation.standardMinutes} min/piece</p>
            {run.operation.pieceRate && (
              <p><strong>Piece Rate:</strong> ${run.operation.pieceRate.toFixed(3)}/piece</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Complete Run
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}