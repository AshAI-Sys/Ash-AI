// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
// import { Alert, AlertDescription } from '@/components/ui/alert'
import { Play, Pause, CheckCircle, Clock, Scan, User, Package, TrendingUp, AlertTriangle, Settings, Filter, Search } from 'lucide-react'
// import { toast } from 'sonner'

interface SewingRun {
  id: string
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  operationName: string
  qtyGood: number
  qtyDefects: number
  qtyRejects: number
  efficiency?: number
  actualMinutes?: number
  startedAt?: string
  endedAt?: string
  estimatedCompletionTime?: string
  operator: {
    name: string
  }
  bundle: {
    bundleNumber: string
    targetQty: number
  }
  order: {
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
  }
  operation: {
    standardMinutes: number
    pieceRate?: number
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
  const [filters, setFilters] = useState({
    status: '',
    operator: '',
    operation: '',
    search: ''
  })

  useEffect(() => {
    fetchRuns()
    fetchOperations()
  }, [filters])

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

  const startRun = async (runId: string, qrData?: string) => {
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bundleQrData: qrData,
          notes: qrData ? 'QR Code scanned and verified' : undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start run')
      }

      const data = await response.json()
      console.log(data.message)
      
      if (data.operatorWorkload?.level === 'HIGH') {
        console.warn(`⚠️ ${data.operatorWorkload.message}`)
      }

      fetchRuns()
      setSelectedRun(null)
      setQrScanValue('')
    } catch (error) {
      console.error('Error starting run:', error)
      console.error(error instanceof Error ? error.message : 'Failed to start run')
    }
  }

  const completeRun = async (runId: string, completionData: any) => {
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete run')
      }

      const data = await response.json()
      console.log(data.message)
      
      if (data.insights?.length > 0) {
        data.insights.forEach((insight: any) => {
          if (insight.priority === 'HIGH') {
            console.error(`🔴 ${insight.title}: ${insight.message}`)
          } else if (insight.priority === 'MEDIUM') {
            console.warn(`🟡 ${insight.title}: ${insight.message}`)
          }
        })
      }

      fetchRuns()
      setSelectedRun(null)
    } catch (error) {
      console.error('Error completing run:', error)
      console.error(error instanceof Error ? error.message : 'Failed to complete run')
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sewing Operations</h1>
          <p className="text-muted-foreground">Manage sewing runs and track production efficiency</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active-runs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-runs">Active Runs</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="completed">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search runs, operations, or operators..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="CREATED">Created</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.operation} onValueChange={(value) => setFilters(prev => ({ ...prev, operation: value }))}>
            <SelectTrigger className="w-48">
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

        <TabsContent value="active-runs">
          <div className="grid gap-4">
            {runs.filter(run => run.status !== 'COMPLETED').map((run) => (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{run.operationName}</h3>
                        {getStatusBadge(run.status)}
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
                      <p className="font-medium">{run.operator.name}</p>
                      <p className="text-muted-foreground">{run.order.productType}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{run.bundle.targetQty}</p>
                      <p className="text-xs text-muted-foreground">Target Qty</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{run.qtyGood || 0}</p>
                      <p className="text-xs text-muted-foreground">Good</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{run.qtyDefects || 0}</p>
                      <p className="text-xs text-muted-foreground">Defects</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{run.qtyRejects || 0}</p>
                      <p className="text-xs text-muted-foreground">Rejects</p>
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

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {run.operation.standardMinutes} min/pc
                      </div>
                      {run.operation.pieceRate && (
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          {run.operation.pieceRate.toFixed(3)}/pc
                        </div>
                      )}
                      {run.efficiency && (
                        <div className={`flex items-center gap-1 ${run.efficiency >= 100 ? 'text-green-600' : run.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          <TrendingUp className="h-4 w-4" />
                          {run.efficiency.toFixed(0)}% eff
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {run.status === 'CREATED' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedRun(run)}>
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start Sewing Run</DialogTitle>
                              <DialogDescription>
                                {run.operationName} - Bundle {run.bundle.bundleNumber}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">QR Code Scan (Optional)</label>
                                <div className="flex gap-2 mt-1">
                                  <Input
                                    placeholder="Scan or enter QR code"
                                    value={qrScanValue}
                                    onChange={(e) => setQrScanValue(e.target.value)}
                                  />
                                  <Button variant="outline" size="icon">
                                    <Scan className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expected: {run.bundle.bundleNumber}-{run.operationName}
                                </p>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSelectedRun(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => startRun(run.id, qrScanValue || undefined)}>
                                  Start Run
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {run.status === 'IN_PROGRESS' && (
                        <SewingRunCompleteDialog 
                          run={run} 
                          onComplete={completeRun}
                        />
                      )}
                    </div>
                  </div>

                  {run.status === 'IN_PROGRESS' && run.estimatedCompletionTime && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                      <span className="text-blue-700">
                        Estimated completion: {new Date(run.estimatedCompletionTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {runs.filter(run => run.status !== 'COMPLETED').length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Runs</h3>
                  <p className="text-muted-foreground">
                    All sewing operations are completed or no runs have been created yet.
                  </p>
                </CardContent>
              </Card>
            )}
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

        <TabsContent value="analytics">
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