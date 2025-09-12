// @ts-nocheck
'use client'

import { useState } from 'react'
import { sanitizeInput, sanitizeNumber } from '@/utils/security'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus,
  Search,
  User,
  Clock,
  Ruler,
  Package,
  AlertTriangle,
  CheckCircle,
  Brain,
  Target,
  Calculator,
  Layers,
  Scissors,
  Activity,
  TrendingUp,
  Zap
} from 'lucide-react'

interface CuttingQueueData {
  design_id: string
  designName: string
  order_id: string
  po_number: string
  brand: string
  method: string
  priority: 'high' | 'medium' | 'low'
  operatorId: string
  estimatedTime: number
  fabricRequired: number
  pieces: {
    size: string
    quantity: number
  }[]
  materials: {
    type: string
    color: string
    quantity: number
    unit: string
  }[]
  specialInstructions?: string
}

interface CuttingQueueModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CuttingQueueData) => void
  operators: {
    id: string
    name: string
    experience: string
    efficiency: number
    currentJob: string | null
  }[]
}

const mockApprovedDesigns = [
  {
    id: 'design_1',
    name: 'Premium Corporate Hoodie',
    order_id: 'order_5',
    po_number: 'REEF-2024-000125',
    brand: 'Reefer',
    method: 'Embroidery',
    fabricType: 'Fleece',
    estimatedFabric: 28.5,
    pieces: [
      { size: 'S', quantity: 5 },
      { size: 'M', quantity: 10 },
      { size: 'L', quantity: 15 },
      { size: 'XL', quantity: 8 },
      { size: 'XXL', quantity: 2 }
    ]
  },
  {
    id: 'design_2',
    name: 'Sports Team Jersey',
    order_id: 'order_6',
    po_number: 'SORB-2024-000100',
    brand: 'Sorbetes',
    method: 'Sublimation',
    fabricType: 'Polyester Mesh',
    estimatedFabric: 22.0,
    pieces: [
      { size: 'S', quantity: 8 },
      { size: 'M', quantity: 12 },
      { size: 'L', quantity: 18 },
      { size: 'XL', quantity: 10 },
      { size: 'XXL', quantity: 2 }
    ]
  },
  {
    id: 'design_3',
    name: 'Casual Print T-Shirt',
    order_id: 'order_7',
    po_number: 'REEF-2024-000126',
    brand: 'Reefer',
    method: 'DTF',
    fabricType: 'Cotton Jersey',
    estimatedFabric: 15.5,
    pieces: [
      { size: 'S', quantity: 15 },
      { size: 'M', quantity: 20 },
      { size: 'L', quantity: 25 },
      { size: 'XL', quantity: 10 }
    ]
  }
]

export function CuttingQueueModal({ isOpen, onClose, onSubmit, operators }: CuttingQueueModalProps) {
  const [selectedDesign, setSelectedDesign] = useState<any>(null)
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [estimatedTime, setEstimatedTime] = useState(0)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

  if (!isOpen) return null

  const availableOperators = operators.filter(op => !op.currentJob)
  
  const filteredDesigns = mockApprovedDesigns.filter(design =>
    design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const calculateEstimatedTime = (design: any) => {
    const baseTime = design.pieces.reduce((acc: number, piece: any) => acc + piece.quantity, 0) * 2
    const complexityMultiplier = design.method === 'Embroidery' ? 1.5 : design.method === 'Sublimation' ? 1.2 : 1.0
    return Math.round(baseTime * complexityMultiplier)
  }

  const handleDesignSelect = (design: any) => {
    setSelectedDesign(design)
    setEstimatedTime(calculateEstimatedTime(design))
    setCurrentStep(2)
  }

  const handleSubmit = () => {
    if (!selectedDesign || !selectedOperator) return

    const queueData: CuttingQueueData = {
      design_id: selectedDesign.id,
      designName: selectedDesign.name,
      order_id: selectedDesign.order_id,
      po_number: selectedDesign.po_number,
      brand: selectedDesign.brand,
      method: selectedDesign.method,
      priority,
      operatorId: selectedOperator,
      estimatedTime,
      fabricRequired: selectedDesign.estimatedFabric,
      pieces: selectedDesign.pieces,
      materials: [{
        type: selectedDesign.fabricType,
        color: 'Various', // Would be determined by design
        quantity: selectedDesign.estimatedFabric,
        unit: 'meters'
      }],
      specialInstructions: sanitizeInput(specialInstructions)
    }

    onSubmit(queueData)
    
    // Reset form
    setSelectedDesign(null)
    setSelectedOperator('')
    setEstimatedTime(0)
    setSpecialInstructions('')
    setCurrentStep(1)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="glass-card w-full max-w-sm md:max-w-3xl lg:max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Add to Cutting Queue</CardTitle>
                <p className="text-white/70">Select approved design and assign operator</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="text-white font-medium">Step {currentStep} of 2</div>
                <div className="text-white/60">{currentStep === 1 ? 'Select Design' : 'Configure Job'}</div>
              </div>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${currentStep * 50}%` }}
              ></div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 ? (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search approved designs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizeInput(e.target.value))}
                  className="pl-10"
                />
              </div>

              {/* Available Designs */}
              <div className="grid gap-4">
                {filteredDesigns.map((design) => (
                  <Card 
                    key={design.id} 
                    className={`enhanced-card hover-lift cursor-pointer transition-all ${
                      selectedDesign?.id === design.id ? 'ring-2 ring-orange-400' : ''
                    }`}
                    onClick={() => handleDesignSelect(design)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{design.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <span>{design.po_number}</span>
                            <span>•</span>
                            <span>{design.brand}</span>
                            <span>•</span>
                            <span>{design.method}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="font-medium text-gray-700">Total Pieces:</span>
                              <div className="text-gray-600">
                                {design.pieces.reduce((acc: number, p: any) => acc + p.quantity, 0)}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Fabric:</span>
                              <div className="text-gray-600">{design.estimatedFabric}m</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Type:</span>
                              <div className="text-gray-600">{design.fabricType}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Est. Time:</span>
                              <div className="text-gray-600">{calculateEstimatedTime(design)}min</div>
                            </div>
                          </div>

                          {/* Size Breakdown */}
                          <div className="mt-3">
                            <div className="text-xs font-medium text-gray-700 mb-1">Size Breakdown:</div>
                            <div className="flex flex-wrap gap-1">
                              {design.pieces.map((piece: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {piece.size}: {piece.quantity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                            <Scissors className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Design Summary */}
              <Card className="enhanced-card bg-gradient-to-br from-orange-50 to-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{selectedDesign?.name}</h4>
                      <p className="text-sm text-gray-600">{selectedDesign?.po_number} • {selectedDesign?.brand}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Job Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Job Configuration</h3>
                  
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['high', 'medium', 'low'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setPriority(level)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                            priority === level 
                              ? getPriorityColor(level)
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operator Assignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Operator</label>
                    <select
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Operator</option>
                      {availableOperators.map((operator) => (
                        <option key={operator.id} value={operator.id}>
                          Operator {operator.id.substring(0, 4)} - {operator.experience}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Time (minutes)
                    </label>
                    <Input
                      type="number"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(sanitizeNumber(e.target.value, 0, 500))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-calculated based on complexity and pieces
                    </p>
                  </div>
                </div>

                {/* Ashley AI Insights */}
                <Card className="enhanced-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <span>Ashley AI Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Optimal Layout</p>
                          <p className="text-xs text-blue-600">
                            Suggested fabric layout can reduce waste by 12%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Efficiency Boost</p>
                          <p className="text-xs text-green-600">
                            Using pre-cut patterns can save 15 minutes
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-800">Material Alert</p>
                          <p className="text-xs text-orange-600">
                            Consider ordering 2m extra fabric for safety margin
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <Textarea
                  placeholder="Add any special cutting instructions, pattern considerations, or notes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(sanitizeInput(e.target.value))}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {currentStep === 1 ? (
                <span>Select a design to continue</span>
              ) : (
                <span>Review job configuration before adding to queue</span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {currentStep === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {currentStep === 2 && (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedDesign || !selectedOperator}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Queue
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}