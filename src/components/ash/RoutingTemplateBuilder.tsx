// @ts-nocheck
/**
 * ASH AI - Routing Template Builder
 * Professional drag-and-drop routing template customization
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DragStart,
  DragUpdate,
  DropResult
} from '@hello-pangea/dnd'
import {
    Plus,
  Trash2,
  Copy,
  Save,
  AlertTriangle,
  CheckCircle,
  Settings,
  Package,
  Scissors,
  Palette,
  Shirt,
  Shield,
  Archive,
  Zap,
  Brain,
  Clock,
  Gauge,
  TrendingUp,
  PlayCircle,
  PauseCircle
} from 'lucide-react'

interface RoutingStep {
  id: string
  name: string
  workcenter: string
  sequence: number
  depends_on: string[]
  standard_spec: Record<string, any>
  expected_inputs: Record<string, any>
  expected_outputs: Record<string, any>
  can_run_parallel: boolean
  estimated_minutes?: number
  risk_factors?: string[]
}

interface RouteTemplate {
  id: string
  template_key: string
  name: string
  method: string
  steps: RoutingStep[]
  ai_optimization?: {
    success_rate: number
    avg_lead_time_days: number
    bottleneck_workcenter: string
    efficiency_score: number
    warning?: string
  }
  success_rate?: number
  avg_lead_time?: number
  risk_factors?: string[]
}

const workcenters = [
  { value: 'DESIGN', label: 'Design & Artwork', icon: Palette, color: 'bg-purple-500' },
  { value: 'CUTTING', label: 'Fabric Cutting', icon: Scissors, color: 'bg-orange-500' },
  { value: 'PRINTING', label: 'Screen Printing', icon: Package, color: 'bg-blue-500' },
  { value: 'HEAT_PRESS', label: 'Heat Press', icon: Zap, color: 'bg-red-500' },
  { value: 'SEWING', label: 'Sewing Assembly', icon: Shirt, color: 'bg-green-500' },
  { value: 'EMBROIDERY', label: 'Embroidery', icon: Package, color: 'bg-indigo-500' },
  { value: 'QC', label: 'Quality Control', icon: Shield, color: 'bg-yellow-500' },
  { value: 'PACKING', label: 'Packaging', icon: Archive, color: 'bg-gray-500' }
]

interface RoutingTemplateBuilderProps {
  template_id?: string
  method?: string
  onSave?: (template: RouteTemplate) => void
  onCancel?: () => void
}

export function RoutingTemplateBuilder({ 
  template_id, 
  method = 'SILKSCREEN', 
  onSave, 
  onCancel 
}: RoutingTemplateBuilderProps) {
  const [template, setTemplate] = useState<RouteTemplate>({
    id: template_id || 'new-template',
    template_key: '',
    name: '',
    method: method,
    steps: [],
    success_rate: 0.95,
    avg_lead_time: 7200 // 5 days in minutes
  })
  
  const [draggedStep, setDraggedStep] = useState<RoutingStep | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ashleyAnalysis, setAshleyAnalysis] = useState<any>(null)

  useEffect(() => {
    if (template_id) {
      loadTemplate()
    } else {
      // Load default template for method
      loadDefaultTemplate()
    }
  }, [template_id, method])

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/ash/routing-templates/${template_id}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.template)
      }
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }

  const loadDefaultTemplate = () => {
    const defaultTemplates = {
      SILKSCREEN: {
        name: 'Custom Silkscreen Route',
        steps: [
          createStep('Design & Separation', 'DESIGN', 1, 120),
          createStep('Fabric Cutting', 'CUTTING', 2, 60),
          createStep('Screen Printing', 'PRINTING', 3, 180),
          createStep('Sewing Assembly', 'SEWING', 4, 240),
          createStep('Quality Control', 'QC', 5, 30),
          createStep('Packaging', 'PACKING', 6, 15)
        ]
      },
      DTF: {
        name: 'Custom DTF Route',
        steps: [
          createStep('Design Preparation', 'DESIGN', 1, 90),
          createStep('DTF Printing', 'PRINTING', 2, 45),
          createStep('Heat Press Application', 'HEAT_PRESS', 3, 60),
          createStep('Quality Control', 'QC', 4, 20),
          createStep('Packaging', 'PACKING', 5, 15)
        ]
      },
      SUBLIMATION: {
        name: 'Custom Sublimation Route',
        steps: [
          createStep('GA Preparation', 'DESIGN', 1, 180),
          createStep('Sublimation Printing', 'PRINTING', 2, 120),
          createStep('Heat Press Transfer', 'HEAT_PRESS', 3, 90),
          createStep('Fabric Cutting', 'CUTTING', 4, 60),
          createStep('Sewing Assembly', 'SEWING', 5, 240),
          createStep('Quality Control', 'QC', 6, 30),
          createStep('Packaging', 'PACKING', 7, 15)
        ]
      },
      EMBROIDERY: {
        name: 'Custom Embroidery Route',
        steps: [
          createStep('Design Digitization', 'DESIGN', 1, 240),
          createStep('Fabric Cutting', 'CUTTING', 2, 60),
          createStep('Embroidery Production', 'EMBROIDERY', 3, 300),
          createStep('Sewing Assembly', 'SEWING', 4, 200),
          createStep('Quality Control', 'QC', 5, 40),
          createStep('Packaging', 'PACKING', 6, 15)
        ]
      }
    }

    const defaultTemplate = defaultTemplates[method as keyof typeof defaultTemplates]
    if (defaultTemplate) {
      setTemplate(prev => ({
        ...prev,
        name: defaultTemplate.name,
        steps: defaultTemplate.steps
      }))
    }
  }

  const createStep = (
    name: string, 
    workcenter: string, 
    sequence: number, 
    estimatedMinutes: number = 60
  ): RoutingStep => ({
    id: `step-${Date.now()}-${sequence}`,
    name,
    workcenter,
    sequence,
    depends_on: [],
    standard_spec: {},
    expected_inputs: {},
    expected_outputs: {},
    can_run_parallel: false,
    estimated_minutes: estimatedMinutes,
    risk_factors: []
  })

  const handleDragStart = (start: DragStart) => {
    const step = template.steps.find(s => s.id === start.draggableId)
    setDraggedStep(step || null)
  }

  const handleDragUpdate = (update: DragUpdate) => {
    setIsDragOver(!!update.destination)
  }

  const handleDragEnd = (result: DropResult) => {
    setDraggedStep(null)
    setIsDragOver(false)

    if (!result.destination) return

    const items = Array.from(template.steps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update sequences
    const updatedSteps = items.map((step, index) => ({
      ...step,
      sequence: index + 1
    }))

    setTemplate(prev => ({
      ...prev,
      steps: updatedSteps
    }))
  }

  const addStep = () => {
    const newStep = createStep(
      `New Step ${template.steps.length + 1}`,
      'DESIGN',
      template.steps.length + 1
    )
    
    setTemplate(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }))
  }

  const updateStep = (stepId: string, updates: Partial<RoutingStep>) => {
    setTemplate(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }))
  }

  const removeStep = (stepId: string) => {
    setTemplate(prev => ({
      ...prev,
      steps: prev.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, sequence: index + 1 }))
    }))
  }

  const duplicateStep = (stepId: string) => {
    const step = template.steps.find(s => s.id === stepId)
    if (step) {
      const newStep = {
        ...step,
        id: `step-${Date.now()}`,
        name: `${step.name} (Copy)`,
        sequence: template.steps.length + 1
      }
      setTemplate(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }))
    }
  }

  const runAshleyAnalysis = async () => {
    try {
      const response = await fetch('/api/ash/routing-templates/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: template.method,
          steps: template.steps
        })
      })

      if (response.ok) {
        const analysis = await response.json()
        setAshleyAnalysis(analysis.assessment)
      }
    } catch (error) {
      console.error('Error running Ashley analysis:', error)
    }
  }

  const saveTemplate = async () => {
    if (!template.name || !template.template_key) {
      alert('Please provide template name and key')
      return
    }

    if (template.steps.length === 0) {
      alert('Please add at least one routing step')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/ash/routing-templates', {
        method: template_id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      })

      if (response.ok) {
        const result = await response.json()
        alert('✅ Template saved successfully!')
        onSave?.(result.template)
      } else {
        const error = await response.json()
        alert(`❌ Failed to save template: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('❌ Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const getWorkcenterConfig = (workcenter: string) => {
    return workcenters.find(w => w.value === workcenter) || workcenters[0]
  }

  const calculateTotalTime = () => {
    return template.steps.reduce((total, step) => total + (step.estimated_minutes || 0), 0)
  }

  const calculateEfficiencyScore = () => {
    // Simple efficiency calculation based on parallel steps and dependencies
    const parallelSteps = template.steps.filter(s => s.can_run_parallel).length
    const totalSteps = template.steps.length
    const dependencyComplexity = template.steps.reduce((sum, s) => sum + s.depends_on.length, 0)
    
    const baseScore = 0.7
    const parallelBonus = (parallelSteps / totalSteps) * 0.2
    const dependencyPenalty = (dependencyComplexity / (totalSteps * 2)) * 0.1
    
    return Math.max(0.1, Math.min(1.0, baseScore + parallelBonus - dependencyPenalty))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Routing Template Builder</h2>
          <p className="text-muted-foreground">
            Design custom production workflows with drag-and-drop
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={runAshleyAnalysis}
            variant="outline"
            className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
          >
            <Brain className="w-4 h-4 mr-2" />
            Ashley Analysis
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={saveTemplate} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Fast Track Silkscreen"
                />
              </div>
              
              <div>
                <Label htmlFor="templateKey">Template Key</Label>
                <Input
                  id="templateKey"
                  value={template.template_key}
                  onChange={(e) => setTemplate(prev => ({ ...prev, template_key: e.target.value }))}
                  placeholder="e.g., SILK_FAST_TRACK"
                />
              </div>

              <div>
                <Label htmlFor="method">Production Method</Label>
                <Select 
                  value={template.method}
                  onValueChange={(value) => setTemplate(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SILKSCREEN">Silkscreen</SelectItem>
                    <SelectItem value="SUBLIMATION">Sublimation</SelectItem>
                    <SelectItem value="DTF">DTF</SelectItem>
                    <SelectItem value="EMBROIDERY">Embroidery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Template Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <p className="font-semibold">{Math.round(calculateTotalTime() / 60)}h</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Gauge className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <p className="font-semibold">{Math.round(calculateEfficiencyScore() * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Efficiency</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Package className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <p className="font-semibold">{template.steps.length}</p>
                  <p className="text-xs text-muted-foreground">Steps</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <PlayCircle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                  <p className="font-semibold">{template.steps.filter(s => s.can_run_parallel).length}</p>
                  <p className="text-xs text-muted-foreground">Parallel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ashley Analysis */}
          {ashleyAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-purple-600" />
                  Ashley's Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Risk Level</span>
                  <Badge 
                    variant={ashleyAnalysis.risk === 'GREEN' ? 'default' : 'destructive'}
                    className={ashleyAnalysis.risk === 'GREEN' ? 'bg-green-500' : ''}
                  >
                    {ashleyAnalysis.risk}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {ashleyAnalysis.summary || 'Analysis complete'}
                </div>
                {ashleyAnalysis.recommendations && (
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Recommendations:</p>
                    {ashleyAnalysis.recommendations.map((rec: string, idx: number) => (
                      <p key={idx} className="text-muted-foreground">• {rec}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Drag & Drop Route Builder */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Routing Steps
                </div>
                <Button onClick={addStep} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </CardTitle>
              <CardDescription>
                Drag and drop to reorder steps. Configure each step for optimal workflow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropContext
                onDragStart={handleDragStart}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
              >
                <Droppable droppableId="routing-steps">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-3 min-h-[200px] p-4 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      {template.steps.map((step, index) => {
                        const workcenterConfig = getWorkcenterConfig(step.workcenter)
                        const WorkcenterIcon = workcenterConfig.icon

                        return (
                          <Draggable key={step.id} draggableId={step.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 bg-white rounded-lg border transition-all ${
                                  snapshot.isDragging ? 'shadow-lg border-blue-300' : 'shadow-sm'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className={`p-2 rounded-lg ${workcenterConfig.color} cursor-grab active:cursor-grabbing`}
                                    >
                                      <WorkcenterIcon className="w-5 h-5 text-white" />
                                    </div>
                                    
                                    <div className="flex-1 space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label className="text-xs">Step Name</Label>
                                          <Input
                                            value={step.name}
                                            onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Workcenter</Label>
                                          <Select
                                            value={step.workcenter}
                                            onValueChange={(value) => updateStep(step.id, { workcenter: value })}
                                          >
                                            <SelectTrigger className="h-8 text-sm">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {workcenters.map(wc => (
                                                <SelectItem key={wc.value} value={wc.value}>
                                                  {wc.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-3">
                                        <div>
                                          <Label className="text-xs">Duration (min)</Label>
                                          <Input
                                            type="number"
                                            value={step.estimated_minutes || ''}
                                            onChange={(e) => updateStep(step.id, { 
                                              estimated_minutes: parseInt(e.target.value) || 0 
                                            })}
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                        <div className="flex items-end">
                                          <label className="flex items-center space-x-2 text-xs">
                                            <input
                                              type="checkbox"
                                              checked={step.can_run_parallel}
                                              onChange={(e) => updateStep(step.id, { 
                                                can_run_parallel: e.target.checked 
                                              })}
                                              className="rounded"
                                            />
                                            <span>Parallel</span>
                                          </label>
                                        </div>
                                        <div className="flex items-end space-x-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => duplicateStep(step.id)}
                                            className="h-8 px-2"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeStep(step.id)}
                                            className="h-8 px-2 text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                      
                      {template.steps.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No routing steps yet</p>
                          <p className="text-sm">Click "Add Step" to start building your workflow</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}