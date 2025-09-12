// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Route, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Zap,
  Target,
  Settings,
  Users,
  Calendar,
  Activity,
  Gauge
} from 'lucide-react'

interface RoutingStep {
  id: string
  name: string
  department: string
  estimatedTime: number
  skillsRequired: string[]
  capacity: number
  currentLoad: number
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'
  efficiency: number
}

interface RoutingSuggestion {
  id: string
  name: string
  steps: RoutingStep[]
  totalTime: number
  totalCost: number
  efficiency: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  aiConfidence: number
  reasons: string[]
  bottlenecks: string[]
  advantages: string[]
}

interface SmartRoutingAssistantProps {
  orderDetails: {
    productType: string
    quantity: number
    complexity: 'LOW' | 'MEDIUM' | 'HIGH'
    deadline: string
    specialRequirements?: string[]
  }
  onRoutingSelect: (routing: RoutingSuggestion) => void
}

const mockRoutingSteps: RoutingStep[] = [
  {
    id: 'design',
    name: 'Design & Art Preparation',
    department: 'Design',
    estimatedTime: 4,
    skillsRequired: ['Adobe Illustrator', 'Color Separation'],
    capacity: 8,
    currentLoad: 6,
    status: 'BUSY',
    efficiency: 92
  },
  {
    id: 'screen_prep',
    name: 'Screen Preparation',
    department: 'Production',
    estimatedTime: 2,
    skillsRequired: ['Screen Coating', 'Film Burning'],
    capacity: 12,
    currentLoad: 4,
    status: 'AVAILABLE',
    efficiency: 88
  },
  {
    id: 'printing',
    name: 'Screen Printing',
    department: 'Production',
    estimatedTime: 8,
    skillsRequired: ['Screen Printing', 'Color Matching'],
    capacity: 16,
    currentLoad: 12,
    status: 'BUSY',
    efficiency: 95
  },
  {
    id: 'curing',
    name: 'Curing/Drying',
    department: 'Production',
    estimatedTime: 1,
    skillsRequired: ['Heat Press Operation'],
    capacity: 20,
    currentLoad: 5,
    status: 'AVAILABLE',
    efficiency: 98
  },
  {
    id: 'qc',
    name: 'Quality Control',
    department: 'Quality',
    estimatedTime: 2,
    skillsRequired: ['Quality Inspection', 'Print Analysis'],
    capacity: 6,
    currentLoad: 3,
    status: 'AVAILABLE',
    efficiency: 97
  },
  {
    id: 'packaging',
    name: 'Packaging & Finishing',
    department: 'Production',
    estimatedTime: 3,
    skillsRequired: ['Folding', 'Packaging'],
    capacity: 10,
    currentLoad: 2,
    status: 'AVAILABLE',
    efficiency: 90
  }
]

export function SmartRoutingAssistant({ orderDetails, onRoutingSelect }: SmartRoutingAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<RoutingSuggestion[]>([])
  const [selectedRouting, setSelectedRouting] = useState<string | null>(null)

  const generateRoutingSuggestions = async () => {
    setIsAnalyzing(true)
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockSuggestions: RoutingSuggestion[] = [
        {
          id: 'optimized',
          name: 'AI-Optimized Route (Recommended)',
          steps: [
            mockRoutingSteps[0], // Design
            mockRoutingSteps[1], // Screen Prep
            mockRoutingSteps[2], // Printing
            mockRoutingSteps[3], // Curing
            mockRoutingSteps[4], // QC
            mockRoutingSteps[5]  // Packaging
          ],
          totalTime: 20,
          totalCost: 2450,
          efficiency: 94,
          riskLevel: 'LOW',
          aiConfidence: 94,
          reasons: [
            'Optimized for current capacity utilization',
            'Minimizes bottleneck impact',
            'Leverages high-efficiency stations'
          ],
          bottlenecks: ['Design department currently at 75% capacity'],
          advantages: [
            'Fastest completion time',
            'Highest quality consistency',
            'Lowest risk of delays'
          ]
        },
        {
          id: 'cost_effective',
          name: 'Cost-Effective Route',
          steps: [
            mockRoutingSteps[0],
            { ...mockRoutingSteps[1], estimatedTime: 3 }, // Slower but cheaper prep
            mockRoutingSteps[2],
            mockRoutingSteps[3],
            { ...mockRoutingSteps[4], estimatedTime: 1 }, // Reduced QC time
            mockRoutingSteps[5]
          ],
          totalTime: 22,
          totalCost: 2100,
          efficiency: 87,
          riskLevel: 'MEDIUM',
          aiConfidence: 81,
          reasons: [
            'Prioritizes cost reduction',
            'Uses standard processes',
            'Acceptable quality trade-offs'
          ],
          bottlenecks: ['Slightly longer screen prep time'],
          advantages: [
            '14% cost savings',
            'Reduces premium resource usage',
            'Good for standard quality requirements'
          ]
        },
        {
          id: 'rush',
          name: 'Rush Production Route',
          steps: [
            { ...mockRoutingSteps[0], estimatedTime: 2 }, // Parallel design work
            mockRoutingSteps[1],
            { ...mockRoutingSteps[2], estimatedTime: 6 }, // Fast printing
            mockRoutingSteps[3],
            mockRoutingSteps[4],
            { ...mockRoutingSteps[5], estimatedTime: 2 }  // Express packaging
          ],
          totalTime: 16,
          totalCost: 2890,
          efficiency: 91,
          riskLevel: 'HIGH',
          aiConfidence: 76,
          reasons: [
            'Maximizes speed over cost',
            'Uses premium time slots',
            'Requires overtime coordination'
          ],
          bottlenecks: ['Risk of quality issues due to rush'],
          advantages: [
            '20% faster completion',
            'Meets tight deadlines',
            'Priority resource allocation'
          ]
        }
      ]
      
      setSuggestions(mockSuggestions)
      setIsAnalyzing(false)
    }, 2000)
  }

  const handleSelectRouting = (suggestion: RoutingSuggestion) => {
    setSelectedRouting(suggestion.id)
    onRoutingSelect(suggestion)
  }

  const getStatusColor = (status: RoutingStep['status']) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800'
      case 'BUSY': return 'bg-yellow-100 text-yellow-800'
      case 'MAINTENANCE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: RoutingSuggestion['riskLevel']) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLoadPercentage = (currentLoad: number, capacity: number) => {
    return Math.round((currentLoad / capacity) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Order Context */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span>Ashley AI Routing Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Product Type</p>
              <p className="font-semibold">{orderDetails.productType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Quantity</p>
              <p className="font-semibold">{orderDetails.quantity.toLocaleString()} pcs</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Complexity</p>
              <Badge className={
                orderDetails.complexity === 'HIGH' ? 'bg-red-100 text-red-800' :
                orderDetails.complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }>
                {orderDetails.complexity}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Deadline</p>
              <p className="font-semibold">{orderDetails.deadline}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Button */}
      {suggestions.length === 0 && (
        <div className="text-center">
          <Button 
            onClick={generateRoutingSuggestions}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Brain className="mr-2 h-4 w-4 animate-pulse" />
                Analyzing Optimal Routes...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate Smart Routing Suggestions
              </>
            )}
          </Button>
        </div>
      )}

      {/* Routing Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Routing Suggestions</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {setSuggestions([]); setSelectedRouting(null)}}
            >
              <Route className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>

          {suggestions.map((suggestion, index) => (
            <Card 
              key={suggestion.id} 
              className={`transition-all cursor-pointer ${
                selectedRouting === suggestion.id 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'hover:border-gray-300'
              } ${index === 0 ? 'border-l-4 border-l-purple-500' : ''}`}
              onClick={() => handleSelectRouting(suggestion)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-base">{suggestion.name}</CardTitle>
                    {index === 0 && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Brain className="mr-1 h-3 w-3" />
                        AI Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskColor(suggestion.riskLevel)}>
                      {suggestion.riskLevel} RISK
                    </Badge>
                    <Badge variant="outline">
                      {suggestion.aiConfidence}% confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <Clock className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{suggestion.totalTime}h</p>
                    <p className="text-xs text-gray-500">Total Time</p>
                  </div>
                  <div className="text-center">
                    <Target className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">₱{suggestion.totalCost}</p>
                    <p className="text-xs text-gray-500">Est. Cost</p>
                  </div>
                  <div className="text-center">
                    <Gauge className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{suggestion.efficiency}%</p>
                    <p className="text-xs text-gray-500">Efficiency</p>
                  </div>
                  <div className="text-center">
                    <Activity className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{suggestion.steps.length}</p>
                    <p className="text-xs text-gray-500">Steps</p>
                  </div>
                </div>

                {/* Production Steps */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Production Flow</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.steps.map((step, stepIndex) => (
                      <div key={step.id} className="flex items-center">
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <Settings className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium">{step.name}</span>
                            <Badge className={getStatusColor(step.status)} variant="outline">
                              {getLoadPercentage(step.currentLoad, step.capacity)}%
                            </Badge>
                            <span className="text-xs text-gray-500">{step.estimatedTime}h</span>
                          </div>
                        </div>
                        {stepIndex < suggestion.steps.length - 1 && (
                          <div className="mx-2">→</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advantages */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h5 className="font-medium text-green-600 mb-1 flex items-center">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Advantages
                    </h5>
                    <ul className="text-sm space-y-1">
                      {suggestion.advantages.map((advantage, idx) => (
                        <li key={idx} className="text-green-700">• {advantage}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-600 mb-1 flex items-center">
                      <Brain className="mr-1 h-4 w-4" />
                      AI Reasoning
                    </h5>
                    <ul className="text-sm space-y-1">
                      {suggestion.reasons.map((reason, idx) => (
                        <li key={idx} className="text-blue-700">• {reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-orange-600 mb-1 flex items-center">
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      Considerations
                    </h5>
                    <ul className="text-sm space-y-1">
                      {suggestion.bottlenecks.map((bottleneck, idx) => (
                        <li key={idx} className="text-orange-700">• {bottleneck}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4 flex justify-end">
                  <Button 
                    className={`${
                      selectedRouting === suggestion.id 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    onClick={() => handleSelectRouting(suggestion)}
                  >
                    {selectedRouting === suggestion.id ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Selected
                      </>
                    ) : (
                      <>
                        <Route className="mr-2 h-4 w-4" />
                        Select Route
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Current Capacity Overview */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Current Department Capacity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(new Set(mockRoutingSteps.map(s => s.department))).map(department => {
                const deptSteps = mockRoutingSteps.filter(s => s.department === department)
                const avgLoad = deptSteps.reduce((sum, s) => sum + getLoadPercentage(s.currentLoad, s.capacity), 0) / deptSteps.length
                const avgEfficiency = deptSteps.reduce((sum, s) => sum + s.efficiency, 0) / deptSteps.length
                
                return (
                  <div key={department} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">{department}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacity Usage:</span>
                        <span className={`font-medium ${
                          avgLoad > 80 ? 'text-red-600' : 
                          avgLoad > 60 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {Math.round(avgLoad)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Efficiency:</span>
                        <span className="font-medium text-blue-600">{Math.round(avgEfficiency)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            avgLoad > 80 ? 'bg-red-500' : 
                            avgLoad > 60 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${avgLoad}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}