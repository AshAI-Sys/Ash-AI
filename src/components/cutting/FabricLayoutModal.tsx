'use client'

import { useState, useEffect } from 'react'
import { sanitizeInput, sanitizeNumber, hasPermission } from '@/utils/security'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Layout,
  Brain,
  Maximize,
  Minimize,
  RotateCcw,
  Zap,
  Target,
  Calculator,
  TrendingUp,
  TrendingDown,
  Layers,
  Ruler,
  Eye,
  Download,
  RefreshCw,
  Settings,
  Sparkles,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface LayoutPiece {
  id: string
  size: string
  quantity: number
  width: number
  height: number
  x?: number
  y?: number
  rotation?: number
  color: string
}

interface FabricLayout {
  id: string
  name: string
  fabricWidth: number
  fabricLength: number
  efficiency: number
  wastage: number
  totalPieces: number
  estimatedTime: number
  pieces: LayoutPiece[]
  aiOptimized: boolean
}

interface FabricLayoutModalProps {
  job: any
  isOpen: boolean
  onClose: () => void
  onOptimize: (layout: FabricLayout) => void
}

// Mock layout configurations
const mockLayouts: FabricLayout[] = [
  {
    id: 'layout_1',
    name: 'Standard Layout',
    fabricWidth: 150,
    fabricLength: 800,
    efficiency: 82,
    wastage: 18,
    totalPieces: 50,
    estimatedTime: 45,
    aiOptimized: false,
    pieces: [
      { id: 'p1', size: 'S', quantity: 10, width: 40, height: 60, x: 10, y: 10, color: '#3b82f6' },
      { id: 'p2', size: 'M', quantity: 15, width: 45, height: 65, x: 60, y: 10, color: '#10b981' },
      { id: 'p3', size: 'L', quantity: 20, width: 50, height: 70, x: 10, y: 80, color: '#f59e0b' },
      { id: 'p4', size: 'XL', quantity: 5, width: 55, height: 75, x: 70, y: 80, color: '#ef4444' }
    ]
  },
  {
    id: 'layout_2',
    name: 'Ashley AI Optimized',
    fabricWidth: 150,
    fabricLength: 720,
    efficiency: 94,
    wastage: 6,
    totalPieces: 50,
    estimatedTime: 38,
    aiOptimized: true,
    pieces: [
      { id: 'p1', size: 'S', quantity: 10, width: 40, height: 60, x: 5, y: 5, rotation: 90, color: '#3b82f6' },
      { id: 'p2', size: 'M', quantity: 15, width: 45, height: 65, x: 50, y: 5, color: '#10b981' },
      { id: 'p3', size: 'L', quantity: 20, width: 50, height: 70, x: 100, y: 5, rotation: 45, color: '#f59e0b' },
      { id: 'p4', size: 'XL', quantity: 5, width: 55, height: 75, x: 75, y: 85, color: '#ef4444' }
    ]
  }
]

const aiInsights = [
  {
    type: 'optimization',
    icon: Target,
    title: 'Layout Optimization',
    description: 'AI suggests rotating L-size pieces 45° to improve fabric utilization by 12%',
    impact: '+12% efficiency',
    color: 'text-blue-600 bg-blue-100'
  },
  {
    type: 'wastage',
    icon: TrendingDown,
    title: 'Waste Reduction',
    description: 'Rearranging pieces can reduce fabric waste from 18% to 6%',
    impact: '-12% waste',
    color: 'text-green-600 bg-green-100'
  },
  {
    type: 'time',
    icon: Zap,
    title: 'Time Savings',
    description: 'Optimized cutting path reduces blade movement by 7 minutes',
    impact: '-7 min',
    color: 'text-purple-600 bg-purple-100'
  },
  {
    type: 'quality',
    icon: CheckCircle,
    title: 'Quality Enhancement',
    description: 'Grain direction alignment improves fabric stability and reduces stretching',
    impact: '+15% quality',
    color: 'text-emerald-600 bg-emerald-100'
  }
]

export function FabricLayoutModal({ job, isOpen, onClose, onOptimize }: FabricLayoutModalProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'OPERATOR'
  const canOptimizeLayout = hasPermission(userRole, 'write:cutting')
  const [selectedLayout, setSelectedLayout] = useState<FabricLayout>(mockLayouts[0])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [fabricWidth, setFabricWidth] = useState(150)
  const [zoomLevel, setZoomLevel] = useState(100)

  if (!isOpen || !job) return null
  
  // Permission check
  if (!canOptimizeLayout) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-card p-6 max-w-md">
          <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-white/70 mb-4">You don't have permission to optimize fabric layouts.</p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    )
  }

  const handleOptimize = async () => {
    setIsOptimizing(true)
    
    // Simulate AI optimization
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setSelectedLayout(mockLayouts[1])
    setIsOptimizing(false)
  }

  const handleApplyLayout = () => {
    onOptimize(selectedLayout)
  }

  const ScaleIndicator = () => (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs">
      <div className="flex items-center space-x-2">
        <Ruler className="w-3 h-3 text-gray-600" />
        <span>Scale: {zoomLevel}%</span>
      </div>
    </div>
  )

  const FabricVisualization = ({ layout }: { layout: FabricLayout }) => (
    <div className="relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
      <div 
        className="relative bg-white border border-gray-200"
        style={{ 
          width: `${layout.fabricWidth * (zoomLevel / 100)}px`,
          height: `${layout.fabricLength * (zoomLevel / 100)}px`,
          minHeight: '400px'
        }}
      >
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: Math.ceil(layout.fabricWidth / 10) }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 w-px bg-gray-400"
              style={{ left: `${i * 10 * (zoomLevel / 100)}px` }}
            />
          ))}
          {Array.from({ length: Math.ceil(layout.fabricLength / 10) }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-px bg-gray-400"
              style={{ top: `${i * 10 * (zoomLevel / 100)}px` }}
            />
          ))}
        </div>

        {/* Fabric Pieces */}
        {layout.pieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute rounded border-2 flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              left: `${(piece.x || 0) * (zoomLevel / 100)}px`,
              top: `${(piece.y || 0) * (zoomLevel / 100)}px`,
              width: `${piece.width * (zoomLevel / 100)}px`,
              height: `${piece.height * (zoomLevel / 100)}px`,
              backgroundColor: piece.color,
              borderColor: piece.color,
              transform: piece.rotation ? `rotate(${piece.rotation}deg)` : 'none'
            }}
          >
            <div className="text-center">
              <div className="font-bold">{piece.size}</div>
              <div className="text-xs">x{piece.quantity}</div>
            </div>
          </div>
        ))}

        <ScaleIndicator />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="glass-card w-full max-w-7xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Layout className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Fabric Layout Optimizer</CardTitle>
                <p className="text-white/70">{job.designName} • {job.po_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="text-white font-medium">Ashley AI</div>
                <div className="text-white/60">Layout Intelligence</div>
              </div>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
            {/* Layout Visualization */}
            <div className="xl:col-span-3">
              <Card className="enhanced-card h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>{selectedLayout.name}</span>
                    {selectedLayout.aiOptimized && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Optimized
                      </Badge>
                    )}
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                      disabled={zoomLevel <= 50}
                    >
                      <Minimize className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600 min-w-[60px] text-center">
                      {zoomLevel}%
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                      disabled={zoomLevel >= 200}
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="h-[500px] overflow-auto border border-gray-200 rounded-lg p-4">
                    <FabricVisualization layout={selectedLayout} />
                  </div>
                  
                  {/* Layout Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{selectedLayout.efficiency}%</div>
                      <div className="text-sm text-blue-600">Efficiency</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{selectedLayout.wastage}%</div>
                      <div className="text-sm text-green-600">Waste</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-900">{selectedLayout.fabricLength}cm</div>
                      <div className="text-sm text-orange-600">Length</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-900">{selectedLayout.estimatedTime}min</div>
                      <div className="text-sm text-purple-600">Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights & Controls */}
            <div className="space-y-6">
              {/* Layout Selection */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Layout Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockLayouts.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => setSelectedLayout(layout)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedLayout.id === layout.id
                          ? 'bg-purple-50 border-purple-200 text-purple-900'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{layout.name}</div>
                          <div className="text-sm opacity-75">
                            {layout.efficiency}% efficiency
                          </div>
                        </div>
                        {layout.aiOptimized && (
                          <Sparkles className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                    </button>
                  ))}
                  
                  <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        AI Optimize
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* AI Insights */}
              {showAIInsights && (
                <Card className="enhanced-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span>Ashley AI Insights</span>
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAIInsights(false)}
                    >
                      ✕
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aiInsights.map((insight, index) => {
                      const Icon = insight.icon
                      return (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200">
                          <div className={`w-8 h-8 rounded-full ${insight.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{insight.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                {insight.impact}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Fabric Settings */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fabric Width (cm)
                    </label>
                    <Input
                      type="number"
                      value={fabricWidth}
                      onChange={(e) => setFabricWidth(sanitizeNumber(e.target.value, 50, 300))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    <div>Total Pieces: {selectedLayout.totalPieces}</div>
                    <div>Fabric Required: {(selectedLayout.fabricLength / 100).toFixed(1)}m</div>
                    <div>Efficiency Target: 95%+</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Efficiency: {selectedLayout.efficiency}%</span>
                <span>•</span>
                <span>Waste: {selectedLayout.wastage}%</span>
                <span>•</span>
                <span>Time: {selectedLayout.estimatedTime}min</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Download layout - handled by secure backend
                  onOptimize({ ...selectedLayout, action: 'export_layout' })
                }}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={handleApplyLayout}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Layout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}