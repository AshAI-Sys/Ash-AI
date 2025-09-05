'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Layers, 
  Scissors, 
  Target, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Package,
  QrCode,
  Maximize,
  Minimize,
  RotateCw,
  Grid3X3,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayPlanningCenterProps {
  fabricIssue: {
    id: string
    order: {
      id: string
      po_number: string
      brand: { name: string; code: string }
    }
    fabric_batches: Array<{
      id: string
      batch_number: string
      fabric_type: string
      color_code: string
      actual_meters: number
      width_cm: number
      gsm: number
      status: string
    }>
  }
  onLayPlanCreated?: (layPlan: any) => void
}

interface LayConfiguration {
  table_width_cm: number
  maximum_lay_height_cm: number
  fabric_direction: 'WITH_GRAIN' | 'AGAINST_GRAIN' | 'BIAS'
  marker_efficiency_target: number
  allow_pattern_rotation: boolean
  quality_requirements: 'STANDARD' | 'PREMIUM' | 'EXPORT'
}

interface SizeBreakdown {
  [size: string]: number
}

interface AshleyOptimization {
  risk: 'GREEN' | 'AMBER' | 'RED'
  confidence: number
  estimated_efficiency: number
  fabric_utilization: number
  cutting_time_minutes: number
  recommendations: string[]
  issues: Array<{
    type: string
    severity: string
    details: string
  }>
}

const LayPlanningCenter: React.FC<LayPlanningCenterProps> = ({ 
  fabricIssue, 
  onLayPlanCreated 
}) => {
  const [selectedBatch, setSelectedBatch] = useState<string>(fabricIssue.fabric_batches[0]?.id || '')
  const [layConfig, setLayConfig] = useState<LayConfiguration>({
    table_width_cm: 180,
    maximum_lay_height_cm: 15,
    fabric_direction: 'WITH_GRAIN',
    marker_efficiency_target: 0.85,
    allow_pattern_rotation: true,
    quality_requirements: 'STANDARD'
  })
  const [sizeBreakdown, setSizeBreakdown] = useState<SizeBreakdown>({
    'XS': 10,
    'S': 25,
    'M': 30,
    'L': 25,
    'XL': 10
  })
  const [cuttingNotes, setCuttingNotes] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [ashleyOptimization, setAshleyOptimization] = useState<AshleyOptimization | null>(null)
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)
  const [activeTab, setActiveTab] = useState('configuration')

  const selectedBatchData = fabricIssue.fabric_batches.find(b => b.id === selectedBatch)
  const totalPieces = Object.values(sizeBreakdown).reduce((sum, qty) => sum + qty, 0)

  // Real-time Ashley AI optimization
  useEffect(() => {
    const optimizeTimer = setTimeout(() => {
      if (selectedBatch && totalPieces > 0) {
        runAshleyOptimization()
      }
    }, 1000)

    return () => clearTimeout(optimizeTimer)
  }, [selectedBatch, layConfig, sizeBreakdown])

  const runAshleyOptimization = useCallback(async () => {
    if (!selectedBatchData || totalPieces === 0) return

    setIsOptimizing(true)
    
    try {
      // Simulate Ashley AI processing with realistic delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock optimization results
      const fabricUtilization = Math.min(0.95, (totalPieces * 0.5) / selectedBatchData.actual_meters)
      const baseEfficiency = layConfig.marker_efficiency_target
      const complexityFactor = Object.keys(sizeBreakdown).length > 6 ? 0.95 : 1.0
      const estimatedEfficiency = baseEfficiency * complexityFactor
      
      let risk: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
      const issues: any[] = []
      const recommendations: string[] = []

      if (fabricUtilization > 0.95) {
        risk = 'AMBER'
        issues.push({
          type: 'FABRIC_SHORTAGE',
          severity: 'MEDIUM',
          details: 'Very high fabric utilization detected'
        })
        recommendations.push('Consider ordering additional fabric as safety stock')
      }

      if (estimatedEfficiency < 0.75) {
        risk = risk === 'RED' ? 'RED' : 'AMBER'
        issues.push({
          type: 'LOW_EFFICIENCY',
          severity: 'MEDIUM',
          details: `Marker efficiency below target: ${(estimatedEfficiency * 100).toFixed(1)}%`
        })
        recommendations.push('Optimize size distribution for better nesting')
      }

      if (layConfig.fabric_direction === 'BIAS') {
        recommendations.push('Bias cutting requires extra care - ensure stretch consideration')
      }

      setAshleyOptimization({
        risk,
        confidence: 0.93,
        estimated_efficiency: estimatedEfficiency,
        fabric_utilization: fabricUtilization,
        cutting_time_minutes: totalPieces * 0.75,
        recommendations,
        issues
      })
    } catch (error) {
      console.error('Ashley optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }, [selectedBatchData, layConfig, sizeBreakdown, totalPieces])

  const handleSizeChange = (size: string, value: string) => {
    const qty = parseInt(value) || 0
    setSizeBreakdown(prev => ({
      ...prev,
      [size]: qty
    }))
  }

  const handleCreateLayPlan = async () => {
    if (!selectedBatch || !ashleyOptimization) return

    setIsCreatingPlan(true)
    try {
      const response = await fetch('/api/cutting/lay-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fabric_issue_id: fabricIssue.id,
          fabric_batch_id: selectedBatch,
          order_id: fabricIssue.order.id,
          lay_configuration: layConfig,
          size_breakdown: sizeBreakdown,
          cutting_notes: cuttingNotes,
          expected_bundles: Math.ceil(totalPieces / 25)
        })
      })

      const result = await response.json()
      
      if (result.success) {
        onLayPlanCreated?.(result.lay_plan)
      } else {
        console.error('Failed to create lay plan:', result.error)
      }
    } catch (error) {
      console.error('Error creating lay plan:', error)
    } finally {
      setIsCreatingPlan(false)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'GREEN': return 'text-green-400 border-green-400/30 bg-green-400/10'
      case 'AMBER': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
      case 'RED': return 'text-red-400 border-red-400/30 bg-red-400/10'
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/10'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-900/50 to-blue-900/30 border-blue-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Layers className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">ASH AI - Lay Planning Center</h2>
              </div>
              <p className="text-blue-200 text-sm">
                Order {fabricIssue.order.po_number} • {fabricIssue.order.brand.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">{totalPieces}</div>
              <div className="text-xs text-blue-200">Total Pieces</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
            {[
              { id: 'configuration', label: 'Configuration', icon: Grid3X3 },
              { id: 'sizes', label: 'Size Breakdown', icon: Package },
              { id: 'advanced', label: 'Advanced', icon: Target }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 justify-center',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
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
              {activeTab === 'configuration' && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-6 space-y-6">
                    {/* Fabric Batch Selection */}
                    <div className="space-y-3">
                      <Label className="text-white">Fabric Batch</Label>
                      <div className="grid gap-2">
                        {fabricIssue.fabric_batches.map((batch) => (
                          <div
                            key={batch.id}
                            onClick={() => setSelectedBatch(batch.id)}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer transition-all',
                              selectedBatch === batch.id
                                ? 'border-blue-400 bg-blue-400/10'
                                : 'border-slate-600 hover:border-slate-500'
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="font-medium text-white">{batch.batch_number}</div>
                                <div className="text-sm text-gray-400">
                                  {batch.fabric_type} • {batch.color_code}
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                <div className="text-white">{batch.actual_meters}m</div>
                                <div className="text-gray-400">{batch.width_cm}cm wide</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Table Configuration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="table-width" className="text-white">Table Width (cm)</Label>
                        <Input
                          id="table-width"
                          type="number"
                          value={layConfig.table_width_cm}
                          onChange={(e) => setLayConfig(prev => ({
                            ...prev,
                            table_width_cm: parseInt(e.target.value) || 180
                          }))}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lay-height" className="text-white">Max Lay Height (cm)</Label>
                        <Input
                          id="lay-height"
                          type="number"
                          value={layConfig.maximum_lay_height_cm}
                          onChange={(e) => setLayConfig(prev => ({
                            ...prev,
                            maximum_lay_height_cm: parseInt(e.target.value) || 15
                          }))}
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    {/* Fabric Direction */}
                    <div className="space-y-3">
                      <Label className="text-white">Fabric Direction</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'WITH_GRAIN', label: 'With Grain', icon: '↑' },
                          { value: 'AGAINST_GRAIN', label: 'Against Grain', icon: '→' },
                          { value: 'BIAS', label: 'Bias Cut', icon: '↗' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={layConfig.fabric_direction === option.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLayConfig(prev => ({
                              ...prev,
                              fabric_direction: option.value as any
                            }))}
                            className={cn(
                              layConfig.fabric_direction === option.value
                                ? 'bg-blue-600 text-white'
                                : 'border-slate-600 text-gray-300 hover:border-slate-500'
                            )}
                          >
                            <span className="mr-2 text-lg">{option.icon}</span>
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Efficiency Target */}
                    <div className="space-y-2">
                      <Label htmlFor="efficiency" className="text-white">
                        Target Efficiency: {(layConfig.marker_efficiency_target * 100).toFixed(0)}%
                      </Label>
                      <Input
                        id="efficiency"
                        type="range"
                        min="0.7"
                        max="0.95"
                        step="0.01"
                        value={layConfig.marker_efficiency_target}
                        onChange={(e) => setLayConfig(prev => ({
                          ...prev,
                          marker_efficiency_target: parseFloat(e.target.value)
                        }))}
                        className="bg-slate-800 border-slate-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>70%</span>
                        <span>95%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'sizes' && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-white">Size Breakdown</Label>
                      <div className="text-sm text-gray-400">
                        Total: {totalPieces} pieces
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(sizeBreakdown).map(([size, qty]) => (
                        <div key={size} className="space-y-2">
                          <Label htmlFor={`size-${size}`} className="text-white">{size}</Label>
                          <Input
                            id={`size-${size}`}
                            type="number"
                            value={qty}
                            onChange={(e) => handleSizeChange(size, e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white"
                            min="0"
                          />
                        </div>
                      ))}
                    </div>
                    
                    {/* Add New Size */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSize = prompt('Enter new size:')
                        if (newSize && !sizeBreakdown[newSize]) {
                          setSizeBreakdown(prev => ({ ...prev, [newSize]: 0 }))
                        }
                      }}
                      className="border-slate-600 text-gray-300 hover:border-slate-500"
                    >
                      Add Size
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'advanced' && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-6 space-y-6">
                    {/* Quality Requirements */}
                    <div className="space-y-3">
                      <Label className="text-white">Quality Requirements</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'STANDARD', label: 'Standard', color: 'blue' },
                          { value: 'PREMIUM', label: 'Premium', color: 'purple' },
                          { value: 'EXPORT', label: 'Export', color: 'green' }
                        ].map((quality) => (
                          <Button
                            key={quality.value}
                            variant={layConfig.quality_requirements === quality.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLayConfig(prev => ({
                              ...prev,
                              quality_requirements: quality.value as any
                            }))}
                            className={cn(
                              layConfig.quality_requirements === quality.value
                                ? 'bg-blue-600 text-white'
                                : 'border-slate-600 text-gray-300 hover:border-slate-500'
                            )}
                          >
                            {quality.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Pattern Rotation */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="space-y-1">
                        <div className="text-white font-medium">Allow Pattern Rotation</div>
                        <div className="text-sm text-gray-400">
                          Enables 180° rotation for better fabric utilization
                        </div>
                      </div>
                      <Button
                        variant={layConfig.allow_pattern_rotation ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLayConfig(prev => ({
                          ...prev,
                          allow_pattern_rotation: !prev.allow_pattern_rotation
                        }))}
                        className={cn(
                          layConfig.allow_pattern_rotation
                            ? 'bg-green-600 text-white'
                            : 'border-slate-600 text-gray-300'
                        )}
                      >
                        <RotateCw className="w-4 h-4 mr-2" />
                        {layConfig.allow_pattern_rotation ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>

                    {/* Cutting Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="cutting-notes" className="text-white">Cutting Notes</Label>
                      <Textarea
                        id="cutting-notes"
                        value={cuttingNotes}
                        onChange={(e) => setCuttingNotes(e.target.value)}
                        placeholder="Special instructions for cutting team..."
                        className="bg-slate-800 border-slate-600 text-white min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Ashley AI Optimization Panel */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/30 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">Ashley AI Optimization</h3>
                </div>
                {isOptimizing && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Activity className="w-4 h-4 text-purple-400" />
                  </motion.div>
                )}
              </div>

              {ashleyOptimization ? (
                <div className="space-y-4">
                  {/* Risk Assessment */}
                  <div className={cn(
                    'p-3 rounded-lg border text-center',
                    getRiskColor(ashleyOptimization.risk)
                  )}>
                    <div className="font-bold text-lg">{ashleyOptimization.risk}</div>
                    <div className="text-xs opacity-75">
                      Risk Level • {(ashleyOptimization.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <div className="text-green-400 font-bold">
                        {(ashleyOptimization.estimated_efficiency * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400">Efficiency</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <div className="text-blue-400 font-bold">
                        {(ashleyOptimization.fabric_utilization * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400">Fabric Use</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <div className="text-yellow-400 font-bold">
                        {Math.round(ashleyOptimization.cutting_time_minutes)}m
                      </div>
                      <div className="text-xs text-gray-400">Cut Time</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <div className="text-purple-400 font-bold">
                        {Math.ceil(totalPieces / 25)}
                      </div>
                      <div className="text-xs text-gray-400">Bundles</div>
                    </div>
                  </div>

                  {/* Issues & Recommendations */}
                  {ashleyOptimization.issues.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Issues Detected</span>
                      </div>
                      {ashleyOptimization.issues.map((issue, idx) => (
                        <div key={idx} className="text-xs bg-amber-900/20 p-2 rounded border border-amber-700/30 text-amber-300">
                          {issue.details}
                        </div>
                      ))}
                    </div>
                  )}

                  {ashleyOptimization.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-blue-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Recommendations</span>
                      </div>
                      {ashleyOptimization.recommendations.map((rec, idx) => (
                        <div key={idx} className="text-xs bg-blue-900/20 p-2 rounded border border-blue-700/30 text-blue-300">
                          {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">Configure parameters to see optimization</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Lay Plan Button */}
          <Button
            onClick={handleCreateLayPlan}
            disabled={!ashleyOptimization || ashleyOptimization.risk === 'RED' || isCreatingPlan}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
            size="lg"
          >
            {isCreatingPlan ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-spin" />
                Creating Lay Plan...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4 mr-2" />
                Create Lay Plan
              </>
            )}
          </Button>

          {ashleyOptimization?.risk === 'RED' && (
            <div className="bg-red-900/20 p-3 rounded-lg border border-red-700/30">
              <div className="text-red-400 text-sm font-medium mb-1">
                Critical Issues Detected
              </div>
              <div className="text-red-300 text-xs">
                Resolve the issues above before creating the lay plan.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LayPlanningCenter