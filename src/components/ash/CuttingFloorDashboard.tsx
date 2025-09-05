'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Package,
  QrCode, 
  Scissors, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Scan,
  Plus,
  Target,
  Activity,
  Layers,
  Users,
  Timer,
  BarChart3,
  TrendingUp,
  Package2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CuttingFloorDashboardProps {
  className?: string
}

interface LayPlan {
  id: string
  order: {
    po_number: string
    brand: { name: string; code: string }
  }
  fabric_batch: {
    batch_number: string
    fabric_type: string
    color_code: string
    actual_meters: number
    width_cm: number
  }
  status: string
  estimated_efficiency: number
  size_breakdown: Record<string, number>
  total_pieces: number
  bundles_created: boolean
  cutting_bundles?: CuttingBundle[]
}

interface CuttingBundle {
  id: string
  bundle_number: string
  total_pieces: number
  size_breakdown: Record<string, number>
  status: 'READY_FOR_CUTTING' | 'IN_PROGRESS' | 'COMPLETED' | 'QC_PENDING'
  qr_code: string
  started_at?: string
  completed_at?: string
  operator?: string
}

interface BundleCreationForm {
  bundle_size: number
  special_instructions: string
}

const CuttingFloorDashboard: React.FC<CuttingFloorDashboardProps> = ({ className }) => {
  const [layPlans, setLayPlans] = useState<LayPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<LayPlan | null>(null)
  const [bundles, setBundles] = useState<CuttingBundle[]>([])
  const [activeTab, setActiveTab] = useState('plans')
  const [qrCodeInput, setQrCodeInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [bundleForm, setBundleForm] = useState<BundleCreationForm>({
    bundle_size: 25,
    special_instructions: ''
  })
  const [isCreatingBundles, setIsCreatingBundles] = useState(false)
  const [statistics, setStatistics] = useState({
    total_plans: 0,
    bundles_in_progress: 0,
    completed_today: 0,
    efficiency_avg: 0
  })

  // Load data
  useEffect(() => {
    loadLayPlans()
    loadStatistics()
  }, [])

  const loadLayPlans = async () => {
    try {
      const response = await fetch('/api/cutting/lay-planning')
      const data = await response.json()
      
      if (data.success) {
        setLayPlans(data.lay_plans || [])
      }
    } catch (error) {
      console.error('Failed to load lay plans:', error)
    }
  }

  const loadStatistics = async () => {
    // Mock statistics - in real system would come from API
    setStatistics({
      total_plans: 12,
      bundles_in_progress: 8,
      completed_today: 15,
      efficiency_avg: 87.3
    })
  }

  const handleCreateBundles = async () => {
    if (!selectedPlan) return

    setIsCreatingBundles(true)
    try {
      const bundleConfiguration = Object.entries(selectedPlan.size_breakdown).map(([size, qty], index) => ({
        size,
        quantity: qty,
        layer_position: index + 1
      }))

      const response = await fetch('/api/cutting/lay-planning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lay_plan_id: selectedPlan.id,
          bundle_size: bundleForm.bundle_size,
          bundle_configuration: bundleConfiguration,
          special_instructions: bundleForm.special_instructions
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setBundles(result.bundles)
        // Update the selected plan to mark bundles as created
        setLayPlans(prev => prev.map(plan => 
          plan.id === selectedPlan.id 
            ? { ...plan, bundles_created: true, cutting_bundles: result.bundles }
            : plan
        ))
        setActiveTab('bundles')
      }
    } catch (error) {
      console.error('Failed to create bundles:', error)
    } finally {
      setIsCreatingBundles(false)
    }
  }

  const handleQRCodeScan = async () => {
    if (!qrCodeInput.trim()) return

    setIsScanning(true)
    try {
      // In a real system, this would update bundle status via API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock QR code processing
      const bundle = bundles.find(b => b.qr_code === qrCodeInput.trim())
      if (bundle) {
        setBundles(prev => prev.map(b => 
          b.id === bundle.id 
            ? { 
                ...b, 
                status: b.status === 'READY_FOR_CUTTING' ? 'IN_PROGRESS' : 'COMPLETED',
                started_at: b.status === 'READY_FOR_CUTTING' ? new Date().toISOString() : b.started_at,
                completed_at: b.status === 'IN_PROGRESS' ? new Date().toISOString() : b.completed_at,
                operator: 'Current User'
              }
            : b
        ))
        setQrCodeInput('')
      }
    } catch (error) {
      console.error('QR scan failed:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY_FOR_CUTTING': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'QC_PENDING': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY_FOR_CUTTING': return Package
      case 'IN_PROGRESS': return Scissors
      case 'COMPLETED': return CheckCircle2
      case 'QC_PENDING': return Clock
      default: return AlertTriangle
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-900/50 to-red-900/30 border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Scissors className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-bold text-white">ASH AI - Cutting Floor Dashboard</h2>
              </div>
              <p className="text-red-200 text-sm">Real-time cutting operations management</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{statistics.bundles_in_progress}</div>
                <div className="text-xs text-red-200">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{statistics.completed_today}</div>
                <div className="text-xs text-green-200">Completed Today</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Plans', value: statistics.total_plans, icon: Layers, color: 'blue' },
          { label: 'Bundles in Progress', value: statistics.bundles_in_progress, icon: Package2, color: 'yellow' },
          { label: 'Completed Today', value: statistics.completed_today, icon: CheckCircle2, color: 'green' },
          { label: 'Avg Efficiency', value: `${statistics.efficiency_avg}%`, icon: TrendingUp, color: 'purple' }
        ].map((stat, index) => (
          <Card key={index} className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
                <stat.icon className={cn(
                  "w-8 h-8",
                  stat.color === 'blue' && "text-blue-400",
                  stat.color === 'yellow' && "text-yellow-400",
                  stat.color === 'green' && "text-green-400",
                  stat.color === 'purple' && "text-purple-400"
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
              { id: 'plans', label: 'Lay Plans', icon: Layers },
              { id: 'bundles', label: 'Bundles', icon: Package },
              { id: 'scanner', label: 'QR Scanner', icon: QrCode }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 justify-center',
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
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
              {activeTab === 'plans' && (
                <div className="space-y-4">
                  {layPlans.map((plan) => (
                    <Card 
                      key={plan.id} 
                      className={cn(
                        "bg-slate-900/50 border-slate-700 cursor-pointer transition-all",
                        selectedPlan?.id === plan.id && "border-red-400 bg-red-400/5"
                      )}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-slate-700 text-gray-200">
                                {plan.order.po_number}
                              </Badge>
                              <span className="text-white font-medium">
                                {plan.order.brand.name}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400">
                              {plan.fabric_batch.fabric_type} • {plan.fabric_batch.color_code} • 
                              {plan.total_pieces} pieces
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge className={getStatusColor(plan.status)} variant="outline">
                              {plan.status.replace('_', ' ')}
                            </Badge>
                            <div className="text-sm text-gray-400">
                              {(plan.estimated_efficiency * 100).toFixed(1)}% efficiency
                            </div>
                          </div>
                        </div>
                        
                        {plan.bundles_created && plan.cutting_bundles && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">
                                {plan.cutting_bundles.length} bundles created
                              </span>
                              <span className="text-green-400">
                                {plan.cutting_bundles.filter(b => b.status === 'COMPLETED').length} completed
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {activeTab === 'bundles' && (
                <div className="space-y-4">
                  {bundles.map((bundle) => {
                    const StatusIcon = getStatusIcon(bundle.status)
                    return (
                      <Card key={bundle.id} className="bg-slate-900/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <StatusIcon className="w-5 h-5 text-gray-400" />
                                <span className="text-white font-medium">
                                  {bundle.bundle_number}
                                </span>
                                <Badge className={getStatusColor(bundle.status)} variant="outline">
                                  {bundle.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-400">
                                {bundle.total_pieces} pieces • {Object.entries(bundle.size_breakdown).map(([size, qty]) => 
                                  `${size}:${qty}`
                                ).join(', ')}
                              </div>
                              {bundle.operator && (
                                <div className="text-xs text-blue-400">
                                  Operator: {bundle.operator}
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-sm text-gray-400 font-mono">
                                {bundle.qr_code}
                              </div>
                              {bundle.started_at && (
                                <div className="text-xs text-gray-500">
                                  Started: {new Date(bundle.started_at).toLocaleTimeString()}
                                </div>
                              )}
                              {bundle.completed_at && (
                                <div className="text-xs text-green-400">
                                  Completed: {new Date(bundle.completed_at).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {bundles.length === 0 && (
                    <Card className="bg-slate-900/50 border-slate-700">
                      <CardContent className="p-8 text-center">
                        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <div className="text-gray-400">No bundles created yet</div>
                        <div className="text-sm text-gray-500 mt-2">
                          Select a lay plan and create bundles to get started
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'scanner' && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-6 space-y-6">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Bundle QR Scanner</h3>
                      <p className="text-gray-400 text-sm">
                        Scan bundle QR codes to track cutting progress
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="qr-input" className="text-white">QR Code</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="qr-input"
                            value={qrCodeInput}
                            onChange={(e) => setQrCodeInput(e.target.value)}
                            placeholder="Scan or enter QR code..."
                            className="bg-slate-800 border-slate-600 text-white flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleQRCodeScan()
                              }
                            }}
                          />
                          <Button
                            onClick={handleQRCodeScan}
                            disabled={!qrCodeInput.trim() || isScanning}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isScanning ? (
                              <Activity className="w-4 h-4 animate-spin" />
                            ) : (
                              <Scan className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">
                          Scanning will update bundle status:
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded"></div>
                            <span>Ready → In Progress (Start cutting)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded"></div>
                            <span>In Progress → Completed (Finish cutting)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Bundle Creation Panel */}
          {selectedPlan && !selectedPlan.bundles_created && (
            <Card className="bg-gradient-to-br from-slate-900/90 to-orange-900/30 border-orange-500/30">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Plus className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold text-white">Create Bundles</h3>
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    Order: {selectedPlan.order.po_number} • {selectedPlan.total_pieces} pieces
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bundle-size" className="text-white">Bundle Size</Label>
                    <Input
                      id="bundle-size"
                      type="number"
                      value={bundleForm.bundle_size}
                      onChange={(e) => setBundleForm(prev => ({
                        ...prev,
                        bundle_size: parseInt(e.target.value) || 25
                      }))}
                      className="bg-slate-800 border-slate-600 text-white"
                      min="1"
                      max="50"
                    />
                    <div className="text-xs text-gray-400">
                      Expected bundles: {Math.ceil(selectedPlan.total_pieces / bundleForm.bundle_size)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions" className="text-white">Special Instructions</Label>
                    <Input
                      id="instructions"
                      value={bundleForm.special_instructions}
                      onChange={(e) => setBundleForm(prev => ({
                        ...prev,
                        special_instructions: e.target.value
                      }))}
                      placeholder="Optional instructions..."
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>

                  <Button
                    onClick={handleCreateBundles}
                    disabled={isCreatingBundles}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                  >
                    {isCreatingBundles ? (
                      <>
                        <Activity className="w-4 h-4 mr-2 animate-spin" />
                        Creating Bundles...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Create {Math.ceil(selectedPlan.total_pieces / bundleForm.bundle_size)} Bundles
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Plan Details */}
          {selectedPlan && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">Plan Details</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Efficiency:</span>
                      <span className="text-green-400">
                        {(selectedPlan.estimated_efficiency * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fabric:</span>
                      <span className="text-white">
                        {selectedPlan.fabric_batch.actual_meters}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Width:</span>
                      <span className="text-white">
                        {selectedPlan.fabric_batch.width_cm}cm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Pieces:</span>
                      <span className="text-white">
                        {selectedPlan.total_pieces}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700">
                    <div className="text-sm font-medium text-white mb-2">Size Breakdown:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedPlan.size_breakdown).map(([size, qty]) => (
                        <div key={size} className="flex justify-between text-sm">
                          <span className="text-gray-400">{size}:</span>
                          <span className="text-white">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Bundles Summary */}
          {bundles.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">Bundle Progress</h3>
                </div>

                <div className="space-y-3">
                  {['READY_FOR_CUTTING', 'IN_PROGRESS', 'COMPLETED', 'QC_PENDING'].map((status) => {
                    const count = bundles.filter(b => b.status === status).length
                    const percentage = bundles.length > 0 ? (count / bundles.length) * 100 : 0
                    
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">
                            {status.replace('_', ' ')}:
                          </span>
                          <span className="text-white">{count}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all",
                              status === 'READY_FOR_CUTTING' && "bg-blue-500",
                              status === 'IN_PROGRESS' && "bg-yellow-500",
                              status === 'COMPLETED' && "bg-green-500",
                              status === 'QC_PENDING' && "bg-purple-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default CuttingFloorDashboard