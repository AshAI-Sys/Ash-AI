'use client'

import { useState } from 'react'
import { sanitizeInput, hasPermission } from '@/utils/security'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Box,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  BarChart3,
  DollarSign,
  Scale,
  Ruler,
  Clock,
  CheckCircle,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Minus,
  Target,
  Zap,
  Activity,
  FileText
} from 'lucide-react'

interface MaterialUsage {
  id: string
  type: string
  color: string
  requiredQuantity: number
  usedQuantity: number
  wasteQuantity: number
  unit: string
  batchNumber: string
  qualityGrade: 'A' | 'B' | 'C'
  notes?: string
  // Note: Cost and supplier data moved to secure backend
}

interface WastageAnalysis {
  totalWaste: number
  wastePercentage: number
  reasons: {
    cutting_errors: number
    fabric_defects: number
    pattern_mismatch: number
    other: number
  }
  suggestions: string[]
  // Note: Cost data moved to secure backend
}

interface MaterialTrackingModalProps {
  job: any
  isOpen: boolean
  onClose: () => void
  onUpdate: (data: any) => void
}

const mockMaterials: MaterialUsage[] = [
  {
    id: 'mat_1',
    type: 'Cotton Jersey',
    color: 'Navy Blue',
    requiredQuantity: 12.5,
    usedQuantity: 11.8,
    wasteQuantity: 0.7,
    unit: 'meters',
    batchNumber: 'CTN-2024-0892',
    qualityGrade: 'A',
    notes: 'Premium grade cotton, 180gsm'
  },
  {
    id: 'mat_2',
    type: 'Interfacing',
    color: 'White',
    requiredQuantity: 2.0,
    usedQuantity: 1.9,
    wasteQuantity: 0.1,
    unit: 'meters',
    batchNumber: 'INT-2024-0445',
    qualityGrade: 'B',
    notes: 'Medium weight fusible'
  }
]

const mockWastageAnalysis: WastageAnalysis = {
  totalWaste: 0.8,
  wastePercentage: 6.4,
  reasons: {
    cutting_errors: 45,
    fabric_defects: 20,
    pattern_mismatch: 25,
    other: 10
  },
  suggestions: [
    'Use AI-optimized layout to reduce cutting errors',
    'Implement quality check before cutting',
    'Optimize material ordering patterns',
    'Train operators on efficient cutting techniques'
  ]
}

export function MaterialTrackingModal({ job, isOpen, onClose, onUpdate }: MaterialTrackingModalProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'OPERATOR'
  const canViewCosts = hasPermission(userRole, 'read:materials')
  const canEditMaterials = hasPermission(userRole, 'write:materials')
  const [materials, setMaterials] = useState<MaterialUsage[]>(mockMaterials)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialUsage | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(true)
  const [notes, setNotes] = useState('')
  const [currentTab, setCurrentTab] = useState<'usage' | 'wastage' | 'cost'>('usage')

  if (!isOpen || !job) return null
  
  // Permission check
  if (!canViewCosts) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-card p-6 max-w-md">
          <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-white/70 mb-4">You don't have permission to view material tracking.</p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    )
  }

  const handleMaterialUpdate = (materialId: string, field: string, value: number) => {
    setMaterials(prev =>
      prev.map(material =>
        material.id === materialId
          ? { ...material, [field]: value, wasteQuantity: field === 'usedQuantity' ? material.requiredQuantity - value : material.wasteQuantity }
          : material
      )
    )
  }

  const handleSubmit = () => {
    const materialData = {
      jobId: job.id,
      materials: materials.map(mat => ({
        ...mat,
        notes: mat.notes ? sanitizeInput(mat.notes) : undefined
      })),
      totalWaste: materials.reduce((acc, mat) => acc + mat.wasteQuantity, 0),
      notes: sanitizeInput(notes),
      timestamp: new Date().toISOString()
    }
    
    onUpdate(materialData)
  }

  const getQualityColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200'
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'C': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Cost calculations moved to secure backend API
  const totalWaste = materials.reduce((acc, mat) => acc + mat.wasteQuantity, 0)
  const totalRequired = materials.reduce((acc, mat) => acc + mat.requiredQuantity, 0)
  const wastePercentage = (totalWaste / totalRequired) * 100

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="glass-card w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Box className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Material Tracking & Wastage</CardTitle>
                <p className="text-white/70">{job.designName} • {job.poNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="text-white font-medium">Real-time Tracking</div>
                <div className="text-white/60">Material efficiency</div>
              </div>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-4 bg-white/10 rounded-lg p-1">
            {(['usage', 'wastage', 'cost'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  currentTab === tab
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {currentTab === 'usage' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-900">{totalRequired.toFixed(1)}m</div>
                    <div className="text-sm text-emerald-600">Required</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {materials.reduce((acc, mat) => acc + mat.usedQuantity, 0).toFixed(1)}m
                    </div>
                    <div className="text-sm text-blue-600">Used</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-900">{totalWaste.toFixed(1)}m</div>
                    <div className="text-sm text-orange-600">Waste</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-900">{wastePercentage.toFixed(1)}%</div>
                    <div className="text-sm text-purple-600">Waste Rate</div>
                  </CardContent>
                </Card>
              </div>

              {/* Material Usage Details */}
              <div className="space-y-4">
                {materials.map((material) => (
                  <Card key={material.id} className="enhanced-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900 text-lg">{material.type}</h4>
                            <Badge className={`text-xs ${getQualityColor(material.qualityGrade)}`}>
                              Grade {material.qualityGrade}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Color:</span> {material.color}
                            </div>
                            <div>
                              <span className="font-medium">Batch:</span> {material.batchNumber}
                            </div>
                            <div>
                              <span className="font-medium">Unit:</span> {material.unit}
                            </div>
                            <div>
                              <span className="font-medium">Grade:</span> {material.qualityGrade}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMaterial(selectedMaterial?.id === material.id ? null : material)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Required */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Required ({material.unit})</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.requiredQuantity}
                            onChange={(e) => {
                              const sanitized = sanitizeInput(e.target.value)
                              handleMaterialUpdate(material.id, 'requiredQuantity', parseFloat(sanitized) || 0)
                            }}
                            className="text-center"
                          />
                        </div>

                        {/* Used */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Used ({material.unit})</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={material.usedQuantity}
                            onChange={(e) => {
                              const sanitized = sanitizeInput(e.target.value)
                              handleMaterialUpdate(material.id, 'usedQuantity', parseFloat(sanitized) || 0)
                            }}
                            className="text-center"
                          />
                        </div>

                        {/* Waste */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Waste ({material.unit})</label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={material.wasteQuantity}
                              readOnly
                              className="text-center bg-gray-50"
                            />
                            <div className={`text-xs px-2 py-1 rounded ${
                              (material.wasteQuantity / material.requiredQuantity) * 100 < 5
                                ? 'bg-green-100 text-green-700'
                                : (material.wasteQuantity / material.requiredQuantity) * 100 < 10
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {((material.wasteQuantity / material.requiredQuantity) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Usage Progress</span>
                          <span>{((material.usedQuantity / material.requiredQuantity) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, (material.usedQuantity / material.requiredQuantity) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Material Details (Expandable) */}
                      {selectedMaterial?.id === material.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Usage Efficiency:</span>
                              <div className="text-lg font-bold text-emerald-700">
                                {((material.usedQuantity / material.requiredQuantity) * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Waste Rate:</span>
                              <div className="text-lg font-bold text-red-700">
                                {((material.wasteQuantity / material.requiredQuantity) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Notes</label>
                            <Textarea
                              value={material.notes || ''}
                              onChange={(e) => handleMaterialUpdate(material.id, 'notes', sanitizeInput(e.target.value))}
                              placeholder="Add material-specific notes..."
                              className="mt-1 text-sm"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'wastage' && (
            <div className="space-y-6">
              {/* Wastage Analysis */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <span>Wastage Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Wastage Breakdown */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Wastage Reasons</h4>
                      <div className="space-y-3">
                        {Object.entries(mockWastageAnalysis.reasons).map(([reason, percentage]) => (
                          <div key={reason} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full"></div>
                              <span className="text-sm text-gray-700 capitalize">
                                {reason.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-600 min-w-[40px]">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Efficiency Impact */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Efficiency Metrics</h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-800">Waste Rate</span>
                          </div>
                          <div className="text-2xl font-bold text-red-900">
                            {mockWastageAnalysis.wastePercentage.toFixed(1)}%
                          </div>
                          <div className="text-sm text-red-600">
                            Above target of 5%
                          </div>
                        </div>
                        
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Target className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">Target Efficiency</span>
                          </div>
                          <div className="text-2xl font-bold text-green-900">
                            95.0%+
                          </div>
                          <div className="text-sm text-green-600">
                            With AI optimization
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Suggestions */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span>Optimization Suggestions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockWastageAnalysis.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <p className="text-sm text-blue-800">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentTab === 'cost' && (
            <div className="space-y-6">
              {/* Usage Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-900">{materials.reduce((acc, mat) => acc + mat.usedQuantity, 0).toFixed(1)}m</div>
                    <div className="text-sm text-emerald-600">Total Material Used</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-900">
                      {materials.reduce((acc, mat) => acc + mat.wasteQuantity, 0).toFixed(1)}m
                    </div>
                    <div className="text-sm text-red-600">Total Waste</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {((1 - (totalWaste / totalRequired)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-blue-600">Material Efficiency</div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Usage Breakdown */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle>Usage Analysis by Material</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {materials.map((material) => (
                      <div key={material.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{material.type} - {material.color}</h4>
                          <Badge className={getQualityColor(material.qualityGrade)}>
                            Grade {material.qualityGrade}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Required:</span>
                            <div className="font-medium">{material.requiredQuantity.toFixed(1)} {material.unit}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Used Amount:</span>
                            <div className="font-medium">{material.usedQuantity.toFixed(1)} {material.unit}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Efficiency:</span>
                            <div className="font-medium text-emerald-700">
                              {((material.usedQuantity / material.requiredQuantity) * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Waste Rate:</span>
                            <div className="font-medium text-red-700">
                              {((material.wasteQuantity / material.requiredQuantity) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Efficiency bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Material Efficiency</span>
                            <span>{((material.usedQuantity / material.requiredQuantity) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                (material.usedQuantity / material.requiredQuantity) > 0.95
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : (material.usedQuantity / material.requiredQuantity) > 0.9
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-pink-500'
                              }`}
                              style={{ width: `${(material.usedQuantity / material.requiredQuantity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* General Notes */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Job Notes & Observations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(sanitizeInput(e.target.value))}
                placeholder="Add general notes about material usage, quality observations, or suggestions for future jobs..."
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Total Used: {materials.reduce((acc, mat) => acc + mat.usedQuantity, 0).toFixed(1)}m</span>
                <span>•</span>
                <span>Waste: {wastePercentage.toFixed(1)}%</span>
                <span>•</span>
                <span>Efficiency: {(100 - wastePercentage).toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Export material report - handled by secure backend
                  onUpdate({ action: 'export_report', jobId: job.id })
                }}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Update Materials
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}