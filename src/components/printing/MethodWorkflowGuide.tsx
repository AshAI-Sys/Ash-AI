'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle,
  Clock,
  AlertTriangle,
  Thermometer,
  Timer,
  Gauge,
  Droplet,
  Package,
  Bot,
  ChevronRight,
  Play,
  Pause
} from 'lucide-react'

interface MethodWorkflowGuideProps {
  method: 'SILKSCREEN' | 'SUBLIMATION' | 'DTF' | 'EMBROIDERY'
  runId?: string
  onStepComplete?: (stepId: string) => void
}

const workflowSteps = {
  SILKSCREEN: [
    {
      id: 'prep',
      title: 'Preparation & Setup',
      duration: '15-30 min',
      critical: true,
      tasks: [
        'Prepare screens with proper mesh count',
        'Mix inks to correct viscosity (12-15 seconds drip time)',
        'Set up registration system',
        'Prepare squeegees (sharp edge, proper durometer)',
        'Pre-heat garments to remove moisture'
      ],
      parameters: {
        'Screen Mesh': '156-200 count for fine detail',
        'Ink Temperature': '65-75°F optimal',
        'Squeegee Angle': '75-85 degrees',
        'Print Pressure': 'Firm but not excessive'
      },
      ashleyTips: [
        'Use plastisol ink for durability on cotton',
        'Check registration on first 3 pieces',
        'Maintain consistent squeegee pressure'
      ]
    },
    {
      id: 'printing',
      title: 'Screen Printing',
      duration: '2-5 min per piece',
      critical: true,
      tasks: [
        'Position garment on platen',
        'Flood coat ink across screen',
        'Pull squeegee at consistent speed and angle',
        'Lift screen cleanly',
        'Check print quality immediately'
      ],
      parameters: {
        'Print Speed': 'Slow and steady',
        'Stroke Count': '1-2 strokes typical',
        'Coverage': 'Even, no gaps or thin areas',
        'Registration': 'Check every 10 pieces'
      },
      ashleyTips: [
        'First stroke fills mesh, second stroke transfers',
        'Avoid over-inking - causes bleeding',
        'Check for screen clogging every 50 prints'
      ]
    },
    {
      id: 'curing',
      title: 'Curing & Finishing',
      duration: '3-8 min',
      critical: true,
      tasks: [
        'Place printed garment on conveyor dryer',
        'Set temperature to 320-330°F for plastisol',
        'Monitor cure with temperature gun',
        'Check ink flexibility when cooled',
        'Perform wash test on sample'
      ],
      parameters: {
        'Cure Temperature': '320-330°F (160-165°C)',
        'Belt Speed': 'Adjust for full cure',
        'Tunnel Length': 'Adequate dwell time',
        'Final Temperature': '280°F+ on ink film'
      },
      ashleyTips: [
        'Under-cured ink will crack and peel',
        'Over-curing can scorch fabric',
        'Use temperature strips to verify cure'
      ]
    }
  ],
  SUBLIMATION: [
    {
      id: 'prep',
      title: 'Preparation & Setup',
      duration: '10-20 min',
      critical: true,
      tasks: [
        'Verify polyester content (minimum 65%)',
        'Print design on sublimation paper',
        'Pre-heat heat press to 385°F',
        'Prepare protective paper/teflon sheets',
        'Lint roll garments clean'
      ],
      parameters: {
        'Temperature': '385°F (196°C)',
        'Pressure': 'Medium-Heavy',
        'Time': '45-60 seconds',
        'Paper Quality': 'High-release sublimation paper'
      },
      ashleyTips: [
        'White polyester gives best color vibrancy',
        'Remove any moisture from garments',
        'Print should be mirror image if applicable'
      ]
    },
    {
      id: 'pressing',
      title: 'Heat Press Transfer',
      duration: '1-2 min per piece',
      critical: true,
      tasks: [
        'Position garment on lower platen',
        'Align transfer face-down on garment',
        'Cover with protective paper',
        'Apply pressure for full duration',
        'Remove immediately when timer sounds'
      ],
      parameters: {
        'Pressure': '40-50 PSI',
        'Temperature': '385°F constant',
        'Time': '45-60 seconds',
        'Peel': 'Hot peel immediately'
      },
      ashleyTips: [
        'Even pressure is critical for color consistency',
        'Hot peel prevents ghosting',
        'Check first piece before continuing batch'
      ]
    },
    {
      id: 'finishing',
      title: 'Cool Down & QC',
      duration: '2-5 min',
      critical: false,
      tasks: [
        'Allow garment to cool completely',
        'Check color vibrancy and completeness',
        'Inspect for ghosting or blurring',
        'Steam press if needed for finish',
        'Package to prevent wrinkles'
      ],
      parameters: {
        'Cool Time': '1-2 minutes',
        'Color Check': 'Compare to approved sample',
        'Quality': 'No ghosting or incomplete transfer',
        'Finish': 'Smooth, vibrant colors'
      },
      ashleyTips: [
        'Colors continue to develop during cooling',
        'Steam pressing can improve hand-feel',
        'Store flat or hang immediately'
      ]
    }
  ],
  DTF: [
    {
      id: 'prep',
      title: 'Film Preparation',
      duration: '5-15 min',
      critical: true,
      tasks: [
        'Print design on DTF film',
        'Apply hot melt powder evenly',
        'Shake off excess powder',
        'Cure powder in oven (300°F, 2-3 min)',
        'Allow film to cool completely'
      ],
      parameters: {
        'Print Quality': 'High saturation, clean edges',
        'Powder Application': 'Even, complete coverage',
        'Cure Temperature': '300°F (149°C)',
        'Cure Time': '2-3 minutes'
      },
      ashleyTips: [
        'Too much powder causes thick, stiff transfers',
        'Under-cured powder won\'t adhere properly',
        'Store cured films flat and dry'
      ]
    },
    {
      id: 'pressing',
      title: 'Heat Press Application',
      duration: '1-2 min per piece',
      critical: true,
      tasks: [
        'Pre-heat garment for 5 seconds',
        'Position transfer adhesive-side down',
        'Press at 280-300°F for 15-20 seconds',
        'Cool for 10-15 seconds',
        'Peel carrier film slowly'
      ],
      parameters: {
        'Pre-heat': '5 seconds to remove moisture',
        'Temperature': '280-300°F (138-149°C)',
        'Pressure': 'Medium-Heavy',
        'Time': '15-20 seconds initial press'
      },
      ashleyTips: [
        'Pre-heating prevents steam bubbles',
        'Cool peel prevents tearing',
        'Press again after peeling for 5-10 seconds'
      ]
    },
    {
      id: 'finishing',
      title: 'Final Press & QC',
      duration: '1-2 min',
      critical: false,
      tasks: [
        'Cover transfer with parchment paper',
        'Final press for 5-10 seconds',
        'Check adhesion by gentle scratch test',
        'Inspect for complete transfer',
        'Allow to cool before handling'
      ],
      parameters: {
        'Final Press': '280°F, 5-10 seconds',
        'Protection': 'Parchment or teflon sheet',
        'Adhesion Test': 'Gentle fingernail scratch',
        'Quality': 'Complete transfer, good adhesion'
      },
      ashleyTips: [
        'Final press improves wash durability',
        'Properly applied DTF should not peel',
        'Test wash sample for quality assurance'
      ]
    }
  ],
  EMBROIDERY: [
    {
      id: 'prep',
      title: 'Design & Setup',
      duration: '20-45 min',
      critical: true,
      tasks: [
        'Load digitized design file',
        'Select appropriate threads and needles',
        'Hoop garment with proper stabilizer',
        'Set machine parameters (speed, tension)',
        'Run test stitch on sample'
      ],
      parameters: {
        'Needle Size': '75/11 for most fabrics',
        'Thread Tension': 'Balanced, no loops or breaks',
        'Stabilizer': 'Match to fabric weight/stretch',
        'Hoop Tension': 'Firm but not distorted'
      },
      ashleyTips: [
        'Proper digitizing is 80% of quality',
        'Use sharp needles to prevent snagging',
        'Test stitch reveals tension issues early'
      ]
    },
    {
      id: 'embroidering',
      title: 'Machine Embroidery',
      duration: '10-60 min per piece',
      critical: true,
      tasks: [
        'Start embroidery at appropriate speed',
        'Monitor for thread breaks or jams',
        'Check registration periodically',
        'Trim jump stitches as needed',
        'Pause for thread changes'
      ],
      parameters: {
        'Speed': '800-1000 SPM for most designs',
        'Density': '0.4-0.5mm for satin stitches',
        'Pull Compensation': 'Adjust for fabric stretch',
        'Thread Changes': 'Smooth, clean cuts'
      },
      ashleyTips: [
        'Slower speed for dense or detailed designs',
        'Watch first few stitches for placement',
        'Keep threads organized for color changes'
      ]
    },
    {
      id: 'finishing',
      title: 'Trim & Finish',
      duration: '5-10 min',
      critical: false,
      tasks: [
        'Remove from hoop carefully',
        'Trim excess backing material',
        'Remove any visible stabilizer',
        'Trim thread tails closely',
        'Steam press if fabric allows'
      ],
      parameters: {
        'Trimming': 'Sharp scissors, close cuts',
        'Stabilizer': 'Remove excess, leave secured',
        'Pressing': 'Low heat, protective sheet',
        'Quality': 'Clean, professional appearance'
      },
      ashleyTips: [
        'Don\'t stretch embroidery while removing',
        'Leave some stabilizer for structure',
        'Steam pressing improves appearance'
      ]
    }
  ]
}

export function MethodWorkflowGuide({ method, runId, onStepComplete }: MethodWorkflowGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [stepTimers, setStepTimers] = useState<{ [key: string]: number }>({})

  const steps = workflowSteps[method]
  const currentStep = steps[currentStepIndex]

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(new Set([...completedSteps, stepId]))
    onStepComplete?.(stepId)
    
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const getStepStatus = (stepId: string, index: number) => {
    if (completedSteps.has(stepId)) return 'completed'
    if (index === currentStepIndex) return 'active'
    if (index < currentStepIndex) return 'skipped'
    return 'pending'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'active': return <Play className="w-5 h-5 text-blue-600" />
      case 'skipped': return <ChevronRight className="w-5 h-5 text-gray-400" />
      default: return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200'
      case 'active': return 'bg-blue-50 border-blue-200'
      case 'skipped': return 'bg-gray-50 border-gray-200'
      default: return 'bg-gray-50 border-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Method Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold ash-gradient-text">{method} Workflow</span>
                {runId && <div className="text-sm text-blue-600">Run ID: {runId}</div>}
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id, index)
          return (
            <div key={step.id} className="flex items-center">
              <div className={`p-2 rounded-full ${getStatusColor(status)} border-2`}>
                {getStatusIcon(status)}
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
            </div>
          )
        })}
      </div>

      {/* Current Step Details */}
      <Card className={`enhanced-card ${getStatusColor(getStepStatus(currentStep.id, currentStepIndex))}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(getStepStatus(currentStep.id, currentStepIndex))}
              <div>
                <span className="text-lg font-semibold">{currentStep.title}</span>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center space-x-1">
                    <Timer className="w-4 h-4" />
                    <span>{currentStep.duration}</span>
                  </div>
                  {currentStep.critical && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critical
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {getStepStatus(currentStep.id, currentStepIndex) === 'active' && (
              <Button
                onClick={() => handleStepComplete(currentStep.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Complete Step
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tasks Checklist */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Tasks</span>
            </h4>
            <div className="space-y-2">
              {currentStep.tasks.map((task, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{task}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Gauge className="w-4 h-4" />
              <span>Key Parameters</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(currentStep.parameters).map(([param, value]) => (
                <div key={param} className="bg-white p-3 rounded-lg border">
                  <div className="text-sm font-medium text-gray-900">{param}</div>
                  <div className="text-sm text-gray-600">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ashley AI Tips */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center space-x-2 text-yellow-800">
              <Bot className="w-4 h-4" />
              <span>Ashley AI Tips</span>
            </h4>
            <div className="space-y-2">
              {currentStep.ashleyTips.map((tip, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Droplet className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-yellow-800">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Steps Overview */}
      <Card className="enhanced-card">
        <CardHeader>
          <CardTitle>Complete Workflow Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id, index)
              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-sm ${getStatusColor(status)}`}
                  onClick={() => setCurrentStepIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status)}
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm text-gray-600">{step.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.critical && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge className="text-xs">
                        {step.tasks.length} tasks
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}