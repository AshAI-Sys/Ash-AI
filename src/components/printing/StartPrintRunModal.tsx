'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
  import {
  Play,
  Package,
  Settings,
  CheckCircle,
  AlertTriangle,
  Bot,
  Zap
} from 'lucide-react'

interface StartPrintRunModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (data: any) => void
}

interface RoutingStep {
  id: string
  orderNumber: string
  stepName: string
  method: string
  targetQty: number
  status: string
}

interface Machine {
  id: string
  name: string
  workcenter: string
  isActive: boolean
  spec: any
}

const mockRoutingSteps: RoutingStep[] = [
  {
    id: '1',
    orderNumber: 'REEF-2024-000125',
    stepName: 'Silkscreen Printing',
    method: 'SILKSCREEN',
    targetQty: 100,
    status: 'READY'
  },
  {
    id: '2',
    orderNumber: 'SORB-2024-000100',
    stepName: 'Sublimation Printing',
    method: 'SUBLIMATION',
    targetQty: 50,
    status: 'READY'
  },
  {
    id: '3',
    orderNumber: 'REEF-2024-000126',
    stepName: 'DTF Heat Press',
    method: 'DTF',
    targetQty: 200,
    status: 'READY'
  }
]

const mockMachines: Machine[] = [
  { id: '1', name: 'Press A1', workcenter: 'PRINTING', isActive: true, spec: { bedSize: '40x50cm' } },
  { id: '2', name: 'Epson F570', workcenter: 'PRINTING', isActive: true, spec: { width: '44inch' } },
  { id: '3', name: 'Heat Press B2', workcenter: 'HEAT_PRESS', isActive: true, spec: { bedSize: '38x38cm' } },
  { id: '4', name: 'Embroidery Machine C1', workcenter: 'EMBROIDERY', isActive: true, spec: { heads: 6 } }
]

export function StartPrintRunModal({ isOpen, onClose, onStart }: StartPrintRunModalProps) {
  const [selectedStep, setSelectedStep] = useState<RoutingStep | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([])

  useEffect(() => {
    if (selectedStep) {
      // Filter machines based on method
      const workcenters = getWorkcentersForMethod(selectedStep.method)
      const filtered = mockMachines.filter(machine => 
        workcenters.includes(machine.workcenter) && machine.isActive
      )
      setAvailableMachines(filtered)
      setSelectedMachine('')
    } else {
      setAvailableMachines([])
    }
  }, [selectedStep])

  const getWorkcentersForMethod = (method: string): string[] => {
    switch (method) {
      case 'SILKSCREEN': return ['PRINTING']
      case 'SUBLIMATION': return ['PRINTING', 'HEAT_PRESS']
      case 'DTF': return ['PRINTING', 'HEAT_PRESS']
      case 'EMBROIDERY': return ['EMBROIDERY']
      default: return []
    }
  }

  const handleStart = async () => {
    if (!selectedStep) return

    const printRunData = {
      orderId: 'order_id', // Would get from selectedStep
      routingStepId: selectedStep.id,
      method: selectedStep.method,
      workcenter: selectedMachine ? mockMachines.find(m => m.id === selectedMachine)?.workcenter : getWorkcentersForMethod(selectedStep.method)[0],
      machineId: selectedMachine || null,
      notes: notes
    }

    onStart(printRunData)
  }

  const canStart = selectedStep

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto ash-glass backdrop-blur-xl border border-white/20">
        <DialogHeader className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-t-lg"></div>
          <DialogTitle className="relative flex items-center space-x-3 text-2xl font-bold">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ash-animate-pulse-slow">
              <Play className="h-6 w-6 text-white" />
            </div>
            <span className="ash-gradient-text">Start New Print Run</span>
          </DialogTitle>
          <DialogDescription className="relative text-lg text-slate-600 mt-2">
            Select a ready routing step and configure the print run
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ready Steps Selection */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Ready Routing Steps</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockRoutingSteps.map((step) => (
                <div 
                  key={step.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedStep?.id === step.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStep(step)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900">{step.orderNumber}</span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          step.method === 'SILKSCREEN' ? 'bg-green-100 text-green-800' :
                          step.method === 'SUBLIMATION' ? 'bg-blue-100 text-blue-800' :
                          step.method === 'DTF' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {step.method}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Step: {step.stepName}</div>
                        <div>Target Qty: {step.targetQty}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{step.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Machine Selection */}
          {selectedStep && (
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span>Machine Assignment (Optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableMachines.map((machine) => (
                    <div 
                      key={machine.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedMachine === machine.id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedMachine(selectedMachine === machine.id ? '' : machine.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{machine.name}</span>
                        {selectedMachine === machine.id && (
                          <CheckCircle className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{machine.workcenter}</div>
                        {machine.spec && (
                          <div className="text-xs mt-1">
                            {Object.entries(machine.spec).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {availableMachines.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No available machines for {selectedStep.method}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Print Run Configuration */}
          {selectedStep && (
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span>Run Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Ashley AI Recommendations</span>
                  </div>
                  <div className="space-y-1 text-sm text-blue-700">
                    {selectedStep.method === 'SILKSCREEN' && (
                      <>
                        <div>• Ensure screens are properly aligned before starting</div>
                        <div>• Check ink viscosity and coverage</div>
                        <div>• Monitor first few prints for quality</div>
                      </>
                    )}
                    {selectedStep.method === 'SUBLIMATION' && (
                      <>
                        <div>• Verify heat press temperature (385°F)</div>
                        <div>• Ensure polyester content is adequate</div>
                        <div>• Check paper alignment and coverage</div>
                      </>
                    )}
                    {selectedStep.method === 'DTF' && (
                      <>
                        <div>• Preheat garments to remove moisture</div>
                        <div>• Apply appropriate pressure (medium-high)</div>
                        <div>• Cool peel after 15-20 seconds</div>
                      </>
                    )}
                    {selectedStep.method === 'EMBROIDERY' && (
                      <>
                        <div>• Check thread tension and needle condition</div>
                        <div>• Ensure proper hooping without distortion</div>
                        <div>• Monitor first few stitches for alignment</div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions or notes for this print run..."
                    className="mt-1 min-h-20"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Print Run Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order:</span>
                      <span className="ml-2 font-medium">{selectedStep.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Method:</span>
                      <span className="ml-2 font-medium">{selectedStep.method}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Target Qty:</span>
                      <span className="ml-2 font-medium">{selectedStep.targetQty}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Machine:</span>
                      <span className="ml-2 font-medium">
                        {selectedMachine ? availableMachines.find(m => m.id === selectedMachine)?.name : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleStart}
            disabled={!canStart}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Print Run
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}