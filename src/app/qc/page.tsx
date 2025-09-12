// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Camera, 
  Search,
  Filter,
  Plus,
  Eye,
  TrendingUp,
  BarChart3,
  AlertCircle
} from 'lucide-react'
// TikTokCenteredLayout components - removed import to fix compilation

interface QCInspection {
  id: string
  order_id: string
  stage: 'PRINTING' | 'SEWING' | 'FINAL' | 'INLINE'
  status: 'OPEN' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'CLOSED'
  lotSize: number
  aql: number
  sampleSize: number
  acceptance: number
  rejection: number
  actualDefects: number
  disposition?: string
  holdShipment: boolean
  created_at: string
  closedAt?: string
  order: {
    orderNumber: string
    clientName: string
    productType: string
  }
  inspector: {
    name: string
  }
  _count: {
    samples: number
    defects: number
  }
  defects?: Array<{
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
    qty: number
    defectCode: {
      code: string
      description: string
    }
  }>
}

interface DefectCode {
  id: string
  code: string
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  description: string
  method?: string
  usageCount: number
}

export default function QCPage() {
  const { data: session } = useSession()
  const [inspections, setInspections] = useState<QCInspection[]>([])
  const [defectCodes, setDefectCodes] = useState<DefectCode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInspection, setSelectedInspection] = useState<QCInspection | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    stage: '',
    search: ''
  })
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    fetchInspections()
    fetchDefectCodes()
  }, [filters])

  const fetchInspections = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.stage) params.set('stage', filters.stage)
      if (filters.search) params.set('search', filters.search)
      params.set('analytics', 'true')

      const response = await fetch(`/api/qc/inspections?${params}`)
      if (!response.ok) throw new Error('Failed to fetch inspections')
      
      const data = await response.json()
      setInspections(data.inspections || [])
      setAnalytics(data.analytics)
    } catch (error) {
      console.error('Error fetching inspections:', error)
    }
  }

  const fetchDefectCodes = async () => {
    try {
      const response = await fetch('/api/qc/defect-codes?active=true')
      if (!response.ok) throw new Error('Failed to fetch defect codes')
      
      const data = await response.json()
      setDefectCodes(data.defectCodes || [])
    } catch (error) {
      console.error('Error fetching defect codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      OPEN: 'secondary',
      IN_PROGRESS: 'default',
      PASSED: 'outline',
      FAILED: 'destructive',
      CLOSED: 'outline'
    } as const

    const icons = {
      OPEN: Clock,
      IN_PROGRESS: ClipboardCheck,
      PASSED: CheckCircle,
      FAILED: XCircle,
      CLOSED: CheckCircle
    }

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getStageBadge = (stage: string) => {
    const colors = {
      PRINTING: 'bg-blue-100 text-blue-800',
      SEWING: 'bg-green-100 text-green-800',
      FINAL: 'bg-purple-100 text-purple-800',
      INLINE: 'bg-orange-100 text-orange-800'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {stage}
      </span>
    )
  }

  const getDefectSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: 'text-red-600',
      MAJOR: 'text-orange-600', 
      MINOR: 'text-yellow-600'
    }
    return colors[severity as keyof typeof colors] || 'text-gray-600'
  }

  const calculateProgress = (inspection: QCInspection) => {
    return Math.round((inspection._count.samples / inspection.sampleSize) * 100)
  }

  if (loading) {
    return <div className="p-6">Loading QC inspections...</div>
  }

  return (
    <TikTokLayout>
      <div className="container mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Quality Control</h1>
              <p className="text-gray-600">Manage QC inspections and maintain quality standards</p>
            </div>
            <div className="flex gap-2">
              <CreateInspectionDialog onSuccess={fetchInspections} />
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* QC Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Inspections</p>
                    <p className="text-2xl font-bold">{analytics.totalInspections.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pass Rate</p>
                    <p className="text-2xl font-bold">{`${analytics.passRate}%`}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Defect Rate</p>
                    <p className="text-2xl font-bold">{`${analytics.defectRate}%`}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Defects</p>
                    <p className="text-2xl font-bold">{analytics.criticalDefects.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <Tabs defaultValue="active-inspections" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active-inspections">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="defect-codes">Defect Codes</TabsTrigger>
              <TabsTrigger value="analytics">Reports</TabsTrigger>
            </TabsList>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections, orders, or clients..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
          <select 
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={filters.stage}
            onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Stages</option>
            <option value="PRINTING">Printing</option>
            <option value="SEWING">Sewing</option>
            <option value="FINAL">Final</option>
            <option value="INLINE">Inline</option>
          </select>
        </div>

        <TabsContent value="active-inspections">
          <div className="grid gap-4">
            {inspections.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).map((inspection) => (
              <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{inspection.order.orderNumber}</h3>
                        {getStatusBadge(inspection.status)}
                        {getStageBadge(inspection.stage)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inspection.order.clientName} • {inspection.order.productType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Inspector: {inspection.inspector.name} • Created: {new Date(inspection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">AQL {inspection.aql}</p>
                      <p className="text-xs text-muted-foreground">
                        Lot: {inspection.lotSize} • Sample: {inspection.sampleSize}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold">{inspection._count.samples}</p>
                      <p className="text-xs text-muted-foreground">Samples</p>
                      <p className="text-xs text-blue-600">{calculateProgress(inspection)}%</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-red-600">{inspection.actualDefects}</p>
                      <p className="text-xs text-muted-foreground">Defects</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{inspection.acceptance}</p>
                      <p className="text-xs text-muted-foreground">Accept ≤</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-red-600">{inspection.rejection}</p>
                      <p className="text-xs text-muted-foreground">Reject ≥</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className={`text-lg font-bold ${inspection.actualDefects >= inspection.rejection ? 'text-red-600' : inspection.actualDefects <= inspection.acceptance ? 'text-green-600' : 'text-yellow-600'}`}>
                        {inspection.actualDefects >= inspection.rejection ? 'FAIL' : 
                         inspection.actualDefects <= inspection.acceptance && inspection._count.samples >= inspection.sampleSize ? 'PASS' : 
                         'PENDING'}
                      </p>
                      <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Sampling Progress</span>
                      <span>{inspection._count.samples}/{inspection.sampleSize}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(calculateProgress(inspection), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Lot Size: {inspection.lotSize.toLocaleString()}</span>
                      {inspection.holdShipment && (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          Shipment Hold
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <InspectionDetailsDialog 
                        inspection={inspection}
                        onUpdate={fetchInspections}
                      />
                      {inspection.status !== 'CLOSED' && (
                        <Button size="sm" onClick={() => setSelectedInspection(inspection)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {inspections.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Inspections</h3>
                  <p className="text-muted-foreground mb-4">
                    All QC inspections are completed or no inspections have been created yet.
                  </p>
                  <CreateInspectionDialog onSuccess={fetchInspections} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid gap-4">
            {inspections.filter(i => ['PASSED', 'FAILED', 'CLOSED'].includes(i.status)).map((inspection) => (
              <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{inspection.order.orderNumber}</h3>
                        {getStatusBadge(inspection.status)}
                        {getStageBadge(inspection.stage)}
                        {inspection.holdShipment && (
                          <Badge variant="destructive">Hold</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inspection.order.clientName} • {inspection.order.productType}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {inspection.closedAt && new Date(inspection.closedAt).toLocaleDateString()}
                      </p>
                      <p className="text-muted-foreground">Completed</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold">{inspection._count.samples}</p>
                      <p className="text-xs text-muted-foreground">Samples</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className={`text-lg font-bold ${getDefectSeverityColor('CRITICAL')}`}>{inspection.actualDefects}</p>
                      <p className="text-xs text-muted-foreground">Total Defects</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold">
                        {inspection._count.samples > 0 ? 
                          Math.round((1 - inspection.actualDefects / inspection._count.samples) * 100) : 100}%
                      </p>
                      <p className="text-xs text-muted-foreground">Quality Rate</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className={`text-lg font-bold ${inspection.status === 'PASSED' ? 'text-green-600' : 'text-red-600'}`}>
                        {inspection.disposition || inspection.status}
                      </p>
                      <p className="text-xs text-muted-foreground">Final Result</p>
                    </div>
                  </div>

                  {/* Defect Summary */}
                  {inspection.defects && inspection.defects.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Defects Found:</p>
                      <div className="flex flex-wrap gap-2">
                        {inspection.defects.slice(0, 3).map((defect, idx) => (
                          <span key={idx} className={`px-2 py-1 rounded text-xs ${
                            defect.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            defect.severity === 'MAJOR' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {defect.defectCode.code} ({defect.qty})
                          </span>
                        ))}
                        {inspection.defects.length > 3 && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                            +{inspection.defects.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>AQL {inspection.aql}</span>
                      <span>Lot: {inspection.lotSize.toLocaleString()}</span>
                      <span>Inspector: {inspection.inspector.name}</span>
                    </div>

                    <InspectionDetailsDialog 
                      inspection={inspection}
                      onUpdate={fetchInspections}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="defect-codes">
          <DefectCodesTab defectCodes={defectCodes} onUpdate={fetchDefectCodes} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>QC Analytics Dashboard</CardTitle>
                <CardDescription>
                  Quality control metrics and trend analysis coming soon.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">Advanced Analytics Coming Soon</span>
                  </div>
                  <p className="text-blue-700">
                    P-charts, control charts, defect trending, operator performance analysis, 
                    and predictive quality insights will be available in the next update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          </TabsContent>
          </Tabs>
        </Card>
      </div>
    </TikTokLayout>
  )
}

// Placeholder components that would be implemented
function CreateInspectionDialog({ onSuccess }: { onSuccess: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create QC Inspection</DialogTitle>
          <DialogDescription>
            Set up a new quality control inspection with AQL sampling plan.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Inspection creation form would be implemented here with order selection, 
            stage selection, lot size input, AQL selection, and checklist assignment.
          </p>
          <Button className="mt-4" onClick={onSuccess}>
            Create Inspection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InspectionDetailsDialog({ inspection, onUpdate }: { inspection: QCInspection, onUpdate: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Inspection Details - {inspection.order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Detailed inspection view with sample management, defect logging, 
            photo upload, and completion workflow would be implemented here.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DefectCodesTab({ defectCodes, onUpdate }: { defectCodes: DefectCode[], onUpdate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Defect Codes</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Code
        </Button>
      </div>
      
      <div className="grid gap-4">
        {['CRITICAL', 'MAJOR', 'MINOR'].map(severity => (
          <Card key={severity}>
            <CardHeader>
              <CardTitle className={`text-sm ${getDefectSeverityColor(severity)}`}>
                {severity} Defects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defectCodes.filter(code => code.severity === severity).map(code => (
                  <div key={code.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{code.code}</h4>
                      <span className="text-xs text-muted-foreground">
                        {code.usageCount} uses
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{code.description}</p>
                    {code.method && (
                      <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
                        {code.method}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function getDefectSeverityColor(severity: string) {
  const colors = {
    CRITICAL: 'text-red-600',
    MAJOR: 'text-orange-600', 
    MINOR: 'text-yellow-600'
  }
  return colors[severity as keyof typeof colors] || 'text-gray-600'
}