'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  Palette,
  Scissors,
  Package,
  Truck,
  Eye,
  Download,
  Send,
  Calculator,
  Target,
  Layers
} from 'lucide-react'

interface ProductionSpec {
  id: string
  category: string
  label: string
  value: string
  verified: boolean
  critical: boolean
}

interface ProductionHandoffData {
  designId: string
  designName: string
  orderId: string
  poNumber: string
  method: string
  specifications: ProductionSpec[]
  estimatedTime: string
  materialRequirements: string[]
  qualityChecks: string[]
  specialInstructions?: string
}

interface ProductionHandoffModalProps {
  design: {
    id: string
    name: string
    orderId: string
    poNumber: string
    method: string
    status: string
  } | null
  isOpen: boolean
  onClose: () => void
  onHandoff: (data: ProductionHandoffData) => void
}

const mockProductionSpecs: ProductionSpec[] = [
  { id: '1', category: 'Design', label: 'Colors', value: '4-color process (CMYK)', verified: true, critical: true },
  { id: '2', category: 'Design', label: 'Resolution', value: '300 DPI minimum', verified: true, critical: true },
  { id: '3', category: 'Design', label: 'File Format', value: 'AI, EPS, PDF', verified: true, critical: false },
  { id: '4', category: 'Materials', label: 'Fabric Type', value: '100% Cotton, 180gsm', verified: false, critical: true },
  { id: '5', category: 'Materials', label: 'Ink Type', value: 'Plastisol', verified: false, critical: true },
  { id: '6', category: 'Production', label: 'Screen Mesh', value: '160 mesh', verified: false, critical: true },
  { id: '7', category: 'Production', label: 'Curing Temp', value: '320°F for 60 seconds', verified: false, critical: true },
  { id: '8', category: 'Quality', label: 'Print Position', value: 'Center chest, 4" from collar', verified: false, critical: false },
  { id: '9', category: 'Quality', label: 'Registration', value: '±1mm tolerance', verified: false, critical: true }
]

export function ProductionHandoffModal({ design, isOpen, onClose, onHandoff }: ProductionHandoffModalProps) {
  const [specifications, setSpecifications] = useState<ProductionSpec[]>(mockProductionSpecs)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

  if (!isOpen || !design) return null

  const handleSpecificationToggle = (specId: string) => {
    setSpecifications(prev => 
      prev.map(spec => 
        spec.id === specId 
          ? { ...spec, verified: !spec.verified }
          : spec
      )
    )
  }

  const criticalSpecs = specifications.filter(spec => spec.critical)
  const verifiedCriticalSpecs = criticalSpecs.filter(spec => spec.verified)
  const completionPercentage = (verifiedCriticalSpecs.length / criticalSpecs.length) * 100

  const canProceed = completionPercentage === 100

  const handleHandoff = () => {
    const handoffData: ProductionHandoffData = {
      designId: design.id,
      designName: design.name,
      orderId: design.orderId,
      poNumber: design.poNumber,
      method: design.method,
      specifications: specifications.filter(spec => spec.verified),
      estimatedTime: '2-3 business days',
      materialRequirements: ['Cotton T-shirts', 'Plastisol Ink', 'Screen mesh'],
      qualityChecks: ['Registration check', 'Color matching', 'Cure test'],
      specialInstructions
    }
    
    onHandoff(handoffData)
    onClose()
  }

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'silkscreen': return <Layers className="w-5 h-5" />
      case 'dtf': return <Palette className="w-5 h-5" />
      case 'sublimation': return <Target className="w-5 h-5" />
      case 'embroidery': return <Settings className="w-5 h-5" />
      default: return <Package className="w-5 h-5" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="glass-card w-full max-w-sm md:max-w-3xl lg:max-w-5xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col modal-mobile md:modal-tablet lg:modal-laptop xl:modal-desktop">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Production Handoff</CardTitle>
                <p className="text-white/70">{design.name} • {design.poNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="text-white font-medium">{Math.round(completionPercentage)}% Complete</div>
                <div className="text-white/60">Critical specs verified</div>
              </div>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-white/70 mb-2">
              <span>Production Readiness</span>
              <span>{verifiedCriticalSpecs.length} of {criticalSpecs.length} critical specs</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Design Overview */}
            <div className="lg:col-span-1">
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    {getMethodIcon(design.method)}
                    <span>Design Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-8 h-8 text-gray-400" />
                    <span className="ml-2 text-gray-500">Design Preview</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Production Method</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-purple-100 text-purple-800">
                          {design.method}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Estimated Timeline</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">2-3 business days</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download Files
                      </Button>
                      <Button size="sm" variant="outline" className="w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        View Specifications
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Production Specifications */}
            <div className="lg:col-span-2">
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Production Specifications</span>
                    </span>
                    <Badge variant={canProceed ? "default" : "secondary"}>
                      {canProceed ? "Ready for Production" : "Verification Required"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Design', 'Materials', 'Production', 'Quality'].map(category => {
                      const categorySpecs = specifications.filter(spec => spec.category === category)
                      const categoryComplete = categorySpecs.filter(spec => spec.verified).length
                      
                      return (
                        <div key={category} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                              {category === 'Design' && <Palette className="w-4 h-4 text-purple-500" />}
                              {category === 'Materials' && <Package className="w-4 h-4 text-blue-500" />}
                              {category === 'Production' && <Settings className="w-4 h-4 text-green-500" />}
                              {category === 'Quality' && <Target className="w-4 h-4 text-orange-500" />}
                              <span>{category}</span>
                            </h4>
                            <span className="text-sm text-gray-500">
                              {categoryComplete}/{categorySpecs.length} verified
                            </span>
                          </div>
                          
                          <div className="grid gap-2">
                            {categorySpecs.map(spec => (
                              <div 
                                key={spec.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                                  spec.verified 
                                    ? 'bg-green-50 border-green-200' 
                                    : spec.critical 
                                      ? 'bg-red-50 border-red-200' 
                                      : 'bg-gray-50 border-gray-200'
                                }`}
                                onClick={() => handleSpecificationToggle(spec.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    spec.verified 
                                      ? 'bg-green-500' 
                                      : spec.critical 
                                        ? 'bg-red-500' 
                                        : 'bg-gray-400'
                                  }`}>
                                    {spec.verified && <CheckCircle className="w-3 h-3 text-white" />}
                                    {!spec.verified && spec.critical && <AlertTriangle className="w-3 h-3 text-white" />}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm text-gray-900 flex items-center space-x-2">
                                      <span>{spec.label}</span>
                                      {spec.critical && (
                                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600">{spec.value}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Special Instructions */}
          <Card className="enhanced-card mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Special Instructions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any special instructions for the production team..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              {!canProceed && (
                <div className="flex items-center space-x-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Please verify all critical specifications before proceeding</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleHandoff}
                disabled={!canProceed}
                className={`${
                  canProceed 
                    ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700' 
                    : 'opacity-50 cursor-not-allowed'
                } text-white`}
              >
                <Send className="w-4 h-4 mr-2" />
                Hand Off to Production
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  )
}