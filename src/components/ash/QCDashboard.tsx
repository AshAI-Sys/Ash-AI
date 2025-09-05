'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Camera,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Activity,
  Timer,
  Users,
  Target,
  Zap,
  Settings,
  FileText,
  Package,
  Wrench,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QCDashboardProps {
  className?: string
}

interface QCInspection {
  id: string
  order: {
    po_number: string
    brand: { name: string; code: string }
  }
  inspector: {
    full_name: string
  }
  inspection_type: string
  status: string
  pass_rate: number
  defect_count: number
  pieces_inspected: number
  pieces_passed: number
  pieces_failed: number
  overall_rating?: string
  created_at: string
  ashley_assisted?: boolean
}

interface DefectType {
  type: string
  count: number
}

interface QCSummary {
  status_distribution: Record<string, number>
  inspections_today: number
  avg_pass_rate_week: number
  top_defect_types: DefectType[]
}

const QCDashboard: React.FC<QCDashboardProps> = ({ className }) => {
  const [inspections, setInspections] = useState<QCInspection[]>([])
  const [summary, setSummary] = useState<QCSummary>({
    status_distribution: {},
    inspections_today: 0,
    avg_pass_rate_week: 0,
    top_defect_types: []
  })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedInspection, setSelectedInspection] = useState<QCInspection | null>(null)
  const [newInspection, setNewInspection] = useState({
    order_id: '',
    bundle_ids: [''],
    sample_size: 10,
    pieces_inspected: 0,
    pieces_passed: 0,
    pieces_failed: 0,
    defects: [] as any[],
    inspector_notes: '',
    ashley_assisted: true
  })
  const [isCreatingInspection, setIsCreatingInspection] = useState(false)

  useEffect(() => {
    loadQCData()
  }, [])

  const loadQCData = async () => {
    try {
      const response = await fetch('/api/qc/inspection')
      const data = await response.json()
      
      if (data.success) {
        setInspections(data.inspections || [])
        setSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Failed to load QC data:', error)
    }
  }

  const handleCreateInspection = async () => {
    setIsCreatingInspection(true)
    try {
      const response = await fetch('/api/qc/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInspection)
      })

      const result = await response.json()
      
      if (result.success) {
        await loadQCData()
        setActiveTab('dashboard')
      }
    } catch (error) {
      console.error('Failed to create inspection:', error)
    } finally {
      setIsCreatingInspection(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'PENDING': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'text-green-400'
      case 'B': return 'text-blue-400'
      case 'C': return 'text-yellow-400'
      case 'D': return 'text-orange-400'
      case 'F': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getDefectTypeIcon = (type: string) => {
    switch (type) {
      case 'STITCHING_DEFECT': return '🧵'
      case 'FABRIC_DEFECT': return '🧶'
      case 'PRINT_DEFECT': return '🎨'
      case 'SIZING_ISSUE': return '📏'
      case 'COLOR_MISMATCH': return '🌈'
      default: return '⚠️'
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-900/50 to-green-900/30 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold text-white">ASH AI - Quality Control Center</h2>
              </div>
              <p className="text-green-200 text-sm">AI-powered quality assurance and inspection management</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {summary.avg_pass_rate_week.toFixed(1)}%
                </div>
                <div className="text-xs text-green-200">Weekly Pass Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{summary.inspections_today}</div>
                <div className="text-xs text-blue-200">Inspections Today</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Inspections', 
            value: summary.status_distribution?.COMPLETED || 0,
            icon: ClipboardCheck, 
            color: 'blue',
            trend: '+12%'
          },
          { 
            label: 'Pass Rate', 
            value: `${summary.avg_pass_rate_week.toFixed(1)}%`,
            icon: CheckCircle, 
            color: 'green',
            trend: '+2.3%'
          },
          { 
            label: 'Active Inspections', 
            value: summary.status_distribution?.IN_PROGRESS || 0,
            icon: Activity, 
            color: 'yellow',
            trend: '-1'
          },
          { 
            label: 'Rework Orders', 
            value: summary.top_defect_types.reduce((sum, dt) => sum + dt.count, 0),
            icon: Wrench, 
            color: 'red',
            trend: '-8%'
          }
        ].map((stat, index) => (
          <Card key={index} className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                  <div className={cn(
                    "text-xs mt-1",
                    stat.trend.startsWith('+') ? "text-green-400" : "text-red-400"
                  )}>
                    {stat.trend} vs last week
                  </div>
                </div>
                <stat.icon className={cn(
                  "w-8 h-8",
                  stat.color === 'blue' && "text-blue-400",
                  stat.color === 'green' && "text-green-400",
                  stat.color === 'yellow' && "text-yellow-400",
                  stat.color === 'red' && "text-red-400"
                )} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
            {[
              { id: 'dashboard', label: 'Inspections', icon: ClipboardCheck },
              { id: 'create', label: 'New Inspection', icon: Eye },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 justify-center',
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-4">
                  {inspections.map((inspection) => (
                    <Card 
                      key={inspection.id} 
                      className={cn(
                        "bg-slate-900/50 border-slate-700 cursor-pointer transition-all hover:border-slate-600",
                        selectedInspection?.id === inspection.id && "border-green-400 bg-green-400/5"
                      )}
                      onClick={() => setSelectedInspection(inspection)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-slate-700 text-gray-200">
                                {inspection.order.po_number}
                              </Badge>
                              <span className="text-white font-medium">
                                {inspection.order.brand.name}
                              </span>
                              {inspection.ashley_assisted && (
                                <Badge variant="outline" className="border-purple-500 text-purple-400">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Ashley AI
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {inspection.inspection_type.replace('_', ' ')} • 
                              Inspected: {inspection.pieces_inspected} • 
                              Inspector: {inspection.inspector.full_name}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(inspection.status)} variant="outline">
                                {inspection.status}
                              </Badge>
                              {inspection.overall_rating && (
                                <div className={cn(
                                  "text-lg font-bold",
                                  getRatingColor(inspection.overall_rating)
                                )}>
                                  {inspection.overall_rating}
                                </div>
                              )}
                            </div>
                            <div className="text-sm">
                              <span className="text-green-400">
                                {inspection.pass_rate.toFixed(1)}% pass
                              </span>
                              {inspection.defect_count > 0 && (
                                <span className="text-red-400 ml-2">
                                  {inspection.defect_count} defects
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-gray-400">Passed:</span>
                              <span className="text-green-400">{inspection.pieces_passed}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <XCircle className="w-4 h-4 text-red-400" />
                              <span className="text-gray-400">Failed:</span>
                              <span className="text-red-400">{inspection.pieces_failed}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Timer className="w-4 h-4 text-blue-400" />
                              <span className="text-gray-400">
                                {new Date(inspection.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {inspections.length === 0 && (
                    <Card className="bg-slate-900/50 border-slate-700">
                      <CardContent className="p-8 text-center">
                        <ClipboardCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <div className="text-gray-400">No quality inspections yet</div>
                        <div className="text-sm text-gray-500 mt-2">
                          Start by creating a new inspection
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'create' && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">New Quality Inspection</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="order-id" className="text-white">Order ID</Label>
                        <Input
                          id="order-id"
                          value={newInspection.order_id}
                          onChange={(e) => setNewInspection(prev => ({
                            ...prev,
                            order_id: e.target.value
                          }))}
                          placeholder="Enter order ID..."
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sample-size" className="text-white">Sample Size</Label>
                        <Input
                          id="sample-size"
                          type="number"
                          value={newInspection.sample_size}
                          onChange={(e) => setNewInspection(prev => ({
                            ...prev,
                            sample_size: parseInt(e.target.value) || 10
                          }))}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pieces-inspected" className="text-white">Pieces Inspected</Label>
                        <Input
                          id="pieces-inspected"
                          type="number"
                          value={newInspection.pieces_inspected}
                          onChange={(e) => setNewInspection(prev => ({
                            ...prev,
                            pieces_inspected: parseInt(e.target.value) || 0
                          }))}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pieces-passed" className="text-white">Pieces Passed</Label>
                        <Input
                          id="pieces-passed"
                          type="number"
                          value={newInspection.pieces_passed}
                          onChange={(e) => setNewInspection(prev => ({
                            ...prev,
                            pieces_passed: parseInt(e.target.value) || 0
                          }))}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pieces-failed" className="text-white">Pieces Failed</Label>
                      <Input
                        id="pieces-failed"
                        type="number"
                        value={newInspection.pieces_failed}
                        onChange={(e) => setNewInspection(prev => ({
                          ...prev,
                          pieces_failed: parseInt(e.target.value) || 0
                        }))}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="ashley-assisted"
                        checked={newInspection.ashley_assisted}
                        onChange={(e) => setNewInspection(prev => ({
                          ...prev,
                          ashley_assisted: e.target.checked
                        }))}
                        className="rounded border-slate-600"
                      />
                      <Label htmlFor="ashley-assisted" className="text-white">
                        Use Ashley AI Assistance
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inspector-notes" className="text-white">Inspector Notes</Label>
                      <Textarea
                        id="inspector-notes"
                        value={newInspection.inspector_notes}
                        onChange={(e) => setNewInspection(prev => ({
                          ...prev,
                          inspector_notes: e.target.value
                        }))}
                        placeholder="Quality inspection notes..."
                        className="bg-slate-800 border-slate-600 text-white min-h-[100px]"
                      />
                    </div>

                    <Button
                      onClick={handleCreateInspection}
                      disabled={!newInspection.order_id || isCreatingInspection}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                      size="lg"
                    >
                      {isCreatingInspection ? (
                        <>
                          <Activity className="w-4 h-4 mr-2 animate-spin" />
                          Creating Inspection...
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="w-4 h-4 mr-2" />
                          Create Quality Inspection
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Pass Rate Trend */}
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <h3 className="font-semibold text-white">Quality Trends</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-400">Average Pass Rate (7 days)</div>
                          <div className="text-2xl font-bold text-green-400">
                            {summary.avg_pass_rate_week.toFixed(1)}%
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-400">Quality Improvement</div>
                          <div className="text-2xl font-bold text-blue-400">+2.3%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Defects */}
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <h3 className="font-semibold text-white">Most Common Defects</h3>
                      </div>
                      <div className="space-y-3">
                        {summary.top_defect_types.map((defect, index) => (
                          <div key={defect.type} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getDefectTypeIcon(defect.type)}</span>
                              <span className="text-white">
                                {defect.type.replace('_', ' ')}
                              </span>
                            </div>
                            <Badge variant="outline" className="border-amber-500 text-amber-400">
                              {defect.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Selected Inspection Details */}
          {selectedInspection && (
            <Card className="bg-gradient-to-br from-slate-900/90 to-green-900/30 border-green-500/30">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">Inspection Details</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Order:</span>
                    <span className="text-white">{selectedInspection.order.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Inspector:</span>
                    <span className="text-white">{selectedInspection.inspector.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">
                      {selectedInspection.inspection_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pass Rate:</span>
                    <span className="text-green-400">
                      {selectedInspection.pass_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Defects:</span>
                    <span className={cn(
                      selectedInspection.defect_count > 0 ? "text-red-400" : "text-green-400"
                    )}>
                      {selectedInspection.defect_count}
                    </span>
                  </div>
                  {selectedInspection.overall_rating && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rating:</span>
                      <span className={getRatingColor(selectedInspection.overall_rating)}>
                        Grade {selectedInspection.overall_rating}
                      </span>
                    </div>
                  )}
                </div>

                {selectedInspection.ashley_assisted && (
                  <div className="mt-4 pt-4 border-t border-green-700/30">
                    <div className="flex items-center space-x-2 text-purple-400 text-sm">
                      <Zap className="w-4 h-4" />
                      <span>Ashley AI Assisted Inspection</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Quick Actions</h3>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('create')}
                  className="w-full justify-start border-slate-600 text-gray-300 hover:border-slate-500"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  New Inspection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-slate-600 text-gray-300 hover:border-slate-500"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Photo Capture
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-slate-600 text-gray-300 hover:border-slate-500"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Create Rework
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-slate-600 text-gray-300 hover:border-slate-500"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Quality Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ashley AI Insights */}
          <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/30 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Ashley AI Insights</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-700/30">
                  <div className="text-sm text-purple-300">
                    Quality trend analysis shows 15% improvement in pass rates over the last month.
                  </div>
                </div>
                <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-700/30">
                  <div className="text-sm text-blue-300">
                    Stitching defects decreased by 23% after equipment maintenance.
                  </div>
                </div>
                <div className="bg-green-900/20 p-3 rounded-lg border border-green-700/30">
                  <div className="text-sm text-green-300">
                    Current quality metrics exceed industry standards by 8%.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default QCDashboard