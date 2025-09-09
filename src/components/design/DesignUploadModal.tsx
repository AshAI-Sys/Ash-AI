'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
    Upload,
  Image,
  FileText,
  Palette,
  Layout,
  Eye,
  CheckCircle,
  AlertTriangle,
  Bot,
  Layers,
  Move,
  Ruler,
  Plus,
  X
} from 'lucide-react'

interface Placement {
  id: string
  area: 'front' | 'back' | 'sleeve' | 'left_chest' | 'all_over'
  width: number
  height: number
  offsetX: number
  offsetY: number
}

interface DesignData {
  name: string
  orderId: string
  method: 'Silkscreen' | 'Sublimation' | 'DTF' | 'Embroidery'
  mockupFile: File | null
  productionFile: File | null
  separationFiles: File[]
  placements: Placement[]
  colors: string[]
  notes: string
}

interface DesignUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (designData: DesignData) => void
  orderOptions: { id: string, poNumber: string, method: string, brand: string }[]
}

const placementAreas = [
  { value: 'front', label: 'Front', icon: Layout },
  { value: 'back', label: 'Back', icon: Layout },
  { value: 'sleeve', label: 'Sleeve', icon: Move },
  { value: 'left_chest', label: 'Left Chest', icon: Layout },
  { value: 'all_over', label: 'All Over', icon: Layers }
]

const methodConstraints = {
  'Silkscreen': {
    maxColors: 6,
    fileTypes: ['.ai', '.pdf', '.png'],
    requiresSeparations: true,
    maxPlacements: 3
  },
  'Sublimation': {
    maxColors: 999,
    fileTypes: ['.ai', '.pdf', '.png', '.tiff'],
    requiresSeparations: false,
    maxPlacements: 1
  },
  'DTF': {
    maxColors: 999,
    fileTypes: ['.png', '.pdf'],
    requiresSeparations: false,
    maxPlacements: 2
  },
  'Embroidery': {
    maxColors: 12,
    fileTypes: ['.dst', '.emb', '.ai'],
    requiresSeparations: false,
    maxPlacements: 4
  }
}

export function DesignUploadModal({ isOpen, onClose, onSubmit, orderOptions }: DesignUploadModalProps) {
  const [designData, setDesignData] = useState<DesignData>({
    name: '',
    orderId: '',
    method: 'Silkscreen',
    mockupFile: null,
    productionFile: null,
    separationFiles: [],
    placements: [],
    colors: ['#000000'],
    notes: ''
  })
  
  const [ashleyInsights, setAshleyInsights] = useState<string[]>([])
  const [ashleyAnalysis, setAshleyAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const selectedOrder = orderOptions.find(order => order.id === designData.orderId)
  const constraints = methodConstraints[designData.method]

  const handleOrderSelect = (orderId: string) => {
    const order = orderOptions.find(o => o.id === orderId)
    if (order) {
      setDesignData({
        ...designData,
        orderId,
        method: order.method as any,
        name: `${order.poNumber} - Design`
      })
      
      // Ashley AI insights based on method
      const insights = []
      if (order.method === 'Sublimation') {
        insights.push('Sublimation allows unlimited colors - perfect for photographic designs')
        insights.push('Ensure 100% polyester fabric for optimal color vibrancy')
      }
      if (order.method === 'Silkscreen' && designData.colors.length > 4) {
        insights.push('Consider reducing colors to 4 or fewer for cost efficiency')
      }
      if (order.method === 'Embroidery') {
        insights.push('Avoid fine details under 2mm for embroidery readability')
      }
      setAshleyInsights(insights)
    }
  }

  const addPlacement = () => {
    const newPlacement: Placement = {
      id: `placement_${Date.now()}`,
      area: 'front',
      width: 20,
      height: 25,
      offsetX: 0,
      offsetY: 0
    }
    setDesignData({
      ...designData,
      placements: [...designData.placements, newPlacement]
    })
  }

  const updatePlacement = (id: string, updates: Partial<Placement>) => {
    setDesignData({
      ...designData,
      placements: designData.placements.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    })
  }

  const removePlacement = (id: string) => {
    setDesignData({
      ...designData,
      placements: designData.placements.filter(p => p.id !== id)
    })
  }

  const addColor = () => {
    setDesignData({
      ...designData,
      colors: [...designData.colors, '#ffffff']
    })
  }

  const updateColor = (index: number, color: string) => {
    const newColors = [...designData.colors]
    newColors[index] = color
    setDesignData({ ...designData, colors: newColors })
  }

  const removeColor = (index: number) => {
    setDesignData({
      ...designData,
      colors: designData.colors.filter((_, i) => i !== index)
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent, fileType: 'mockup' | 'production' | 'separations') => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      if (fileType === 'separations') {
        setDesignData({
          ...designData,
          separationFiles: [...designData.separationFiles, ...files]
        })
      } else {
        setDesignData({
          ...designData,
          [fileType === 'mockup' ? 'mockupFile' : 'productionFile']: files[0]
        })
      }
    }
  }

  const analyzeDesign = async () => {
    if (!designData.method || !designData.placements.length) return

    setIsAnalyzing(true)
    try {
      const analysisData = {
        method: designData.method,
        designData: {
          palette: designData.colors,
          placements: designData.placements,
          type: designData.placements.some(p => p.area === 'all_over') ? 'full_color' : 'spot_color',
          meta: {
            hasFinelines: false, // This would come from actual file analysis
            hasGradients: false,
            hasSmallText: false,
            fabricType: designData.method === 'Sublimation' ? 'polyester' : 'cotton',
            hasWhiteInk: designData.colors.some(c => c.toLowerCase() === '#ffffff' || c.toLowerCase() === 'white'),
            stitchCount: designData.method === 'Embroidery' ? 5000 : undefined,
            complexity: designData.colors.length > 4 ? 'high' : designData.colors.length > 2 ? 'medium' : 'low'
          }
        }
      }

      const response = await fetch('/api/ashley-ai/design/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      })

      const result = await response.json()
      if (result.success) {
        setAshleyAnalysis(result.analysis)
        
        // Update insights with analysis results
        const newInsights = []
        if (result.analysis.printabilityScore > 85) {
          newInsights.push(`✅ Excellent printability score: ${result.analysis.printabilityScore}/100`)
        } else if (result.analysis.printabilityScore > 70) {
          newInsights.push(`⚠️ Good printability score: ${result.analysis.printabilityScore}/100`)
        } else {
          newInsights.push(`❌ Low printability score: ${result.analysis.printabilityScore}/100 - Review recommendations`)
        }
        
        if (result.analysis.costEstimate) {
          newInsights.push(`💰 Estimated cost: $${result.analysis.costEstimate.perPieceCost.toFixed(2)} per piece`)
        }
        
        if (result.analysis.bestSellerPotential?.score > 80) {
          newInsights.push(`🎯 High best-seller potential: ${result.analysis.bestSellerPotential.score}%`)
        }
        
        setAshleyInsights(newInsights)
      }
    } catch (error) {
      console.error('Ashley AI analysis failed:', error)
      setAshleyInsights(['❌ Analysis failed - please try again'])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = () => {
    const enhancedDesignData = {
      ...designData,
      ashleyAnalysis: ashleyAnalysis,
      printabilityScore: ashleyAnalysis?.printabilityScore || null,
      costEstimate: ashleyAnalysis?.costEstimate || null
    }
    onSubmit(enhancedDesignData)
    onClose()
  }

  const canSubmit = designData.name && designData.orderId && designData.mockupFile && designData.productionFile

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto ash-glass backdrop-blur-xl border border-white/20">
        <DialogHeader className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-t-lg"></div>
          <DialogTitle className="relative flex items-center space-x-3 text-2xl font-bold">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center ash-animate-pulse-slow">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <span className="ash-gradient-text">Design Upload & Management</span>
            <Badge className="bg-purple-100 text-purple-800 ml-auto">
              <Bot className="w-3 h-3 mr-1" />
              Ashley AI Analysis
            </Badge>
          </DialogTitle>
          <DialogDescription className="relative text-lg text-slate-600 mt-2">
            Upload design assets and configure placements for production
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Order Selection */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Order Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderId">Production Order</Label>
                  <select
                    id="orderId"
                    value={designData.orderId}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg enhanced-input"
                  >
                    <option value="">Select Order</option>
                    {orderOptions.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.poNumber} - {order.brand} ({order.method})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="designName">Design Name</Label>
                  <Input
                    id="designName"
                    value={designData.name}
                    onChange={(e) => setDesignData({ ...designData, name: e.target.value })}
                    placeholder="Enter design name"
                    className="enhanced-input"
                  />
                </div>
              </div>

              {selectedOrder && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Order Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">PO Number:</span> {selectedOrder.poNumber}</div>
                    <div><span className="font-medium">Brand:</span> {selectedOrder.brand}</div>
                    <div><span className="font-medium">Method:</span> {selectedOrder.method}</div>
                    <div><span className="font-medium">Max Colors:</span> {constraints.maxColors === 999 ? 'Unlimited' : constraints.maxColors}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ashley AI Analysis */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  <span className="text-purple-800">Ashley AI Design Analysis</span>
                </div>
                <Button
                  size="sm"
                  onClick={analyzeDesign}
                  disabled={isAnalyzing || !designData.method || !designData.placements.length}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Bot className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Analyze Design
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ashleyInsights.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ashleyInsights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-white/50 rounded-lg">
                        <div className="text-lg">{insight.charAt(0)}</div>
                        <p className="text-sm text-purple-800 flex-1">{insight.slice(2)}</p>
                      </div>
                    ))}
                  </div>
                  
                  {ashleyAnalysis && (
                    <>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/70 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-700">{ashleyAnalysis.printabilityScore}/100</div>
                          <div className="text-xs text-purple-600">Printability Score</div>
                        </div>
                        <div className="bg-white/70 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-700">${ashleyAnalysis.costEstimate?.perPieceCost?.toFixed(2) || '0.00'}</div>
                          <div className="text-xs text-green-600">Per Piece Cost</div>
                        </div>
                        <div className="bg-white/70 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-700">{ashleyAnalysis.bestSellerPotential?.score || 0}%</div>
                          <div className="text-xs text-blue-600">Best Seller Potential</div>
                        </div>
                      </div>
                      
                      {/* Issues and Recommendations */}
                      {(ashleyAnalysis.issues?.length > 0 || ashleyAnalysis.recommendations?.length > 0) && (
                        <div className="mt-4 space-y-3">
                          {ashleyAnalysis.issues?.length > 0 && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                              <h4 className="font-medium text-red-800 mb-2 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Issues to Address
                              </h4>
                              <div className="space-y-1">
                                {ashleyAnalysis.issues.map((issue: any, idx: number) => (
                                  <div key={idx} className="text-sm text-red-700">
                                    <span className="font-medium">{issue.title}:</span> {issue.description}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {ashleyAnalysis.recommendations?.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Recommendations
                              </h4>
                              <div className="space-y-1">
                                {ashleyAnalysis.recommendations.map((rec: any, idx: number) => (
                                  <div key={idx} className="text-sm text-blue-700">
                                    <span className="font-medium">{rec.title}:</span> {rec.description}
                                    {rec.potentialSaving && (
                                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                        Save {rec.potentialSaving}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-purple-700">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Add placements and select a print method to get AI-powered design analysis</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-green-600" />
                <span>Design Files</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mockup Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Mockup Preview</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'mockup')}
                  >
                    {designData.mockupFile ? (
                      <div className="space-y-2">
                        <Image className="w-8 h-8 mx-auto text-green-600" />
                        <p className="text-sm font-medium">{designData.mockupFile.name}</p>
                        <Button size="sm" variant="ghost" onClick={() => setDesignData({ ...designData, mockupFile: null })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">Drop mockup image here</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Production File Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Production File</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'production')}
                  >
                    {designData.productionFile ? (
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-purple-600" />
                        <p className="text-sm font-medium">{designData.productionFile.name}</p>
                        <Button size="sm" variant="ghost" onClick={() => setDesignData({ ...designData, productionFile: null })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">Drop production file here</p>
                        <p className="text-xs text-gray-500">{constraints.fileTypes.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Separations (for Silkscreen) */}
              {designData.method === 'Silkscreen' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Color Separations</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'separations')}
                  >
                    {designData.separationFiles.length > 0 ? (
                      <div className="space-y-2">
                        <Layers className="w-6 h-6 mx-auto text-blue-600" />
                        <p className="text-sm font-medium">{designData.separationFiles.length} separation files</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {designData.separationFiles.map((file, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {file.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Layers className="w-6 h-6 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">Drop color separation files</p>
                        <p className="text-xs text-gray-500">One file per color</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Placements */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layout className="w-5 h-5 text-orange-600" />
                  <span>Design Placements</span>
                </div>
                <Button size="sm" onClick={addPlacement} disabled={designData.placements.length >= constraints.maxPlacements}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Placement
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {designData.placements.map((placement, index) => (
                <div key={placement.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">Placement {index + 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => removePlacement(placement.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs">Area</Label>
                      <select
                        value={placement.area}
                        onChange={(e) => updatePlacement(placement.id, { area: e.target.value as any })}
                        className="w-full mt-1 px-2 py-1 text-sm border rounded"
                      >
                        {placementAreas.map(area => (
                          <option key={area.value} value={area.value}>{area.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Width (cm)</Label>
                      <Input
                        type="number"
                        value={placement.width}
                        onChange={(e) => updatePlacement(placement.id, { width: parseFloat(e.target.value) || 0 })}
                        className="text-sm"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Height (cm)</Label>
                      <Input
                        type="number"
                        value={placement.height}
                        onChange={(e) => updatePlacement(placement.id, { height: parseFloat(e.target.value) || 0 })}
                        className="text-sm"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <div className="flex-1">
                        <Label className="text-xs">X Offset</Label>
                        <Input
                          type="number"
                          value={placement.offsetX}
                          onChange={(e) => updatePlacement(placement.id, { offsetX: parseFloat(e.target.value) || 0 })}
                          className="text-sm"
                          step="0.1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Y Offset</Label>
                        <Input
                          type="number"
                          value={placement.offsetY}
                          onChange={(e) => updatePlacement(placement.id, { offsetY: parseFloat(e.target.value) || 0 })}
                          className="text-sm"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {designData.placements.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No placements added yet</p>
                  <p className="text-sm">Click "Add Placement" to define print areas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-pink-600" />
                  <span>Color Palette</span>
                </div>
                <Button size="sm" onClick={addColor} disabled={designData.colors.length >= constraints.maxColors}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Color
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {designData.colors.map((color, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-20 text-xs"
                    />
                    {designData.colors.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeColor(index)}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span>Design Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={designData.notes}
                onChange={(e) => setDesignData({ ...designData, notes: e.target.value })}
                placeholder="Add any special instructions, client requirements, or technical notes..."
                className="min-h-24"
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" disabled={!canSubmit}>
              Save Draft
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload & Create Version
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}