// @ts-nocheck
/**
 * Production Stages Management - All 14 Stages from CLIENT_UPDATED_PLAN.md
 * Complete workflow management for apparel manufacturing
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  Palette,
  Scissors,
  Settings,
  Shirt,
  Shield,
  Archive,
  Truck,
  DollarSign,
  Users,
  Wrench,
  Monitor,
  Brain,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'

interface ProductionStage {
  id: number
  name: string
  description: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'ON_HOLD'
  progress: number
  icon: React.ReactNode
  category: 'PRODUCTION' | 'BUSINESS' | 'AI_FEATURES'
  estimatedTime: string
  actualTime?: string
  dependencies: number[]
  workers: string[]
  specifications?: Record<string, any>
}

interface WorkOrder {
  id: string
  po_number: string
  client: string
  company_name?: string
  product_name: string
  product_type: string
  service_type: string
  garment_type: string
  method: string
  quantity: number
  target_date: string
  fabric_type?: string
  fabric_colors?: string
  fabric_gsm?: number
  design_concept?: string
  special_instructions?: string
  design_files?: string[]
  additional_files?: string[]
  stages: ProductionStage[]
  overall_progress: number
  status: string
  priority_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  budget_range?: string
  estimated_completion?: string
}

export default function ProductionStages() {
  const [selectedOrder, setSelectedOrder] = useState<string>('1')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    {
      id: '1',
      po_number: 'ASH-2025-001234',
      client: 'Premium Apparel Corp',
      company_name: 'Premium Apparel Corporation Ltd.',
      product_name: 'Elite Performance Hoodie Collection',
      product_type: 'Hoodie',
      service_type: 'FULL_PRODUCTION',
      garment_type: 'HOODIE',
      method: 'SILKSCREEN',
      quantity: 450,
      target_date: '2025-01-25',
      fabric_type: 'Premium Cotton Blend',
      fabric_colors: 'Navy Blue, Heather Gray, Black',
      fabric_gsm: 320,
      design_concept: 'Modern streetwear with minimalist logo placement and premium finish',
      special_instructions: 'Use eco-friendly inks only. Double-stitch all seams for durability.',
      design_files: ['logo-design.ai', 'placement-guide.pdf', 'color-specs.png'],
      additional_files: ['size-chart.xlsx', 'brand-guidelines.pdf'],
      overall_progress: 45,
      status: 'IN_PROGRESS',
      priority_level: 'HIGH',
      budget_range: '₱45,000 - ₱55,000',
      estimated_completion: '2025-01-25',
      stages: [
        {
          id: 1,
          name: 'Client & Order Intake',
          description: 'Order processing and client requirements',
          status: 'COMPLETED',
          progress: 100,
          icon: <Package className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '2 hours',
          actualTime: '1.5 hours',
          dependencies: [],
          workers: ['CSR-001']
        },
        {
          id: 2,
          name: 'Design & Approval',
          description: 'Design creation and client approval',
          status: 'COMPLETED',
          progress: 100,
          icon: <Palette className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '1 day',
          actualTime: '8 hours',
          dependencies: [1],
          workers: ['GA-001', 'CSR-001']
        },
        {
          id: 3,
          name: 'Cutting',
          description: 'Fabric cutting and preparation',
          status: 'IN_PROGRESS',
          progress: 75,
          icon: <Scissors className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '4 hours',
          dependencies: [2],
          workers: ['CUT-001', 'CUT-002'],
          specifications: {
            fabric_type: 'Cotton 240GSM',
            cutting_method: 'Manual',
            wastage_target: '8%'
          }
        },
        {
          id: 4,
          name: 'Printing',
          description: 'Silkscreen printing process',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <Settings className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '6 hours',
          dependencies: [3],
          workers: ['PRT-001', 'PRT-002'],
          specifications: {
            method: 'SILKSCREEN',
            colors: 3,
            curing_temp: '160°C',
            curing_time: '2 minutes',
            fabric_colors: 'Navy Blue, Heather Gray, Black',
            special_notes: 'Use eco-friendly inks only'
          }
        },
        {
          id: 5,
          name: 'Sewing',
          description: 'Garment assembly and construction',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <Shirt className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '8 hours',
          dependencies: [4],
          workers: ['SEW-001', 'SEW-002', 'SEW-003'],
          specifications: {
            garment_type: 'HOODIE',
            seam_type: 'Double-stitch',
            quality_standard: 'Premium finish',
            special_instructions: 'Double-stitch all seams for durability'
          }
        },
        {
          id: 6,
          name: 'Quality Control',
          description: 'AQL inspection and testing',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <Shield className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '2 hours',
          dependencies: [5],
          workers: ['QC-001']
        },
        {
          id: 7,
          name: 'Finishing & Packing',
          description: 'Final finishing and packaging',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <Archive className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '3 hours',
          dependencies: [6],
          workers: ['PCK-001', 'PCK-002']
        },
        {
          id: 8,
          name: 'Delivery',
          description: 'Shipping and delivery coordination',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <Truck className="w-5 h-5" />,
          category: 'PRODUCTION',
          estimatedTime: '1 hour',
          dependencies: [7],
          workers: ['LOG-001']
        },
        {
          id: 9,
          name: 'Finance',
          description: 'Invoicing and payment processing',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <DollarSign className="w-5 h-5" />,
          category: 'BUSINESS',
          estimatedTime: '1 hour',
          dependencies: [1],
          workers: ['FIN-001']
        },
        {
          id: 10,
          name: 'HR Management',
          description: 'Payroll and attendance tracking',
          status: 'IN_PROGRESS',
          progress: 30,
          icon: <Users className="w-5 h-5" />,
          category: 'BUSINESS',
          estimatedTime: 'Ongoing',
          dependencies: [],
          workers: ['HR-001']
        },
        {
          id: 11,
          name: 'Maintenance',
          description: 'Equipment maintenance and scheduling',
          status: 'COMPLETED',
          progress: 100,
          icon: <Wrench className="w-5 h-5" />,
          category: 'BUSINESS',
          estimatedTime: '30 minutes',
          actualTime: '25 minutes',
          dependencies: [],
          workers: ['MNT-001']
        },
        {
          id: 12,
          name: 'Client Portal',
          description: 'Customer tracking and communication',
          status: 'IN_PROGRESS',
          progress: 65,
          icon: <Monitor className="w-5 h-5" />,
          category: 'AI_FEATURES',
          estimatedTime: 'Real-time',
          dependencies: [1, 2],
          workers: ['SYS-AUTO']
        },
        {
          id: 13,
          name: 'Merchandising AI',
          description: 'Reprint advisor and theme recommendations',
          status: 'NOT_STARTED',
          progress: 0,
          icon: <Brain className="w-5 h-5" />,
          category: 'AI_FEATURES',
          estimatedTime: 'AI-driven',
          dependencies: [8],
          workers: ['AI-ASHLEY']
        },
        {
          id: 14,
          name: 'Automation & Reminders',
          description: 'Automated alerts and task management',
          status: 'IN_PROGRESS',
          progress: 80,
          icon: <Bell className="w-5 h-5" />,
          category: 'AI_FEATURES',
          estimatedTime: 'Continuous',
          dependencies: [],
          workers: ['SYS-AUTO']
        }
      ]
    }
  ])

  const currentOrder = workOrders.find(wo => wo.id === selectedOrder)

  const getStatusColor = (status: string) => {
    const colors = {
      'NOT_STARTED': 'bg-gray-100 text-gray-700 border-gray-300',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700 border-blue-300',
      'COMPLETED': 'bg-green-100 text-green-700 border-green-300',
      'BLOCKED': 'bg-red-100 text-red-700 border-red-300',
      'ON_HOLD': 'bg-yellow-100 text-yellow-700 border-yellow-300'
    }
    return colors[status as keyof typeof colors] || colors.NOT_STARTED
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'NOT_STARTED': <Clock className="w-4 h-4" />,
      'IN_PROGRESS': <Play className="w-4 h-4" />,
      'COMPLETED': <CheckCircle className="w-4 h-4" />,
      'BLOCKED': <AlertTriangle className="w-4 h-4" />,
      'ON_HOLD': <Pause className="w-4 h-4" />
    }
    return icons[status as keyof typeof icons] || icons.NOT_STARTED
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'PRODUCTION': 'border-l-blue-500',
      'BUSINESS': 'border-l-green-500',
      'AI_FEATURES': 'border-l-purple-500'
    }
    return colors[category as keyof typeof colors] || colors.PRODUCTION
  }

  const handleStageAction = (stageId: number, action: string) => {
    // In real implementation, this would call APIs to update stage status
    console.log(`Stage ${stageId}: ${action}`)
  }

  if (!currentOrder) return null

  return (
    <div className="space-y-6 p-6 neural-bg min-h-screen">
      {/* Header */}
      <div className="executive-card fade-in">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Package className="w-6 h-6 text-blue-500" />
                Production Workflow - {currentOrder.po_number}
              </CardTitle>
              <CardDescription className="text-base space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium">{currentOrder.client}</span>
                  {currentOrder.company_name && <span>• {currentOrder.company_name}</span>}
                  <span>• {currentOrder.product_name}</span>
                  <span>• {currentOrder.service_type.replace('_', ' ')}</span>
                  <span>• {currentOrder.quantity} units</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Method: {currentOrder.method}</span>
                  {currentOrder.fabric_type && <span>• Fabric: {currentOrder.fabric_type}</span>}
                  {currentOrder.fabric_gsm && <span>• {currentOrder.fabric_gsm}GSM</span>}
                  {currentOrder.priority_level && (
                    <Badge variant={currentOrder.priority_level === 'URGENT' ? 'destructive' : 
                           currentOrder.priority_level === 'HIGH' ? 'default' : 'secondary'} 
                           className="text-xs">
                      {currentOrder.priority_level}
                    </Badge>
                  )}
                </div>
              </CardDescription>
            </div>
            <Badge className={`status-badge ${currentOrder.status.toLowerCase()}`}>
              {currentOrder.status}
            </Badge>
          </div>
          
          {/* Overall Progress & Key Details */}
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{currentOrder.overall_progress}% Complete</span>
              </div>
              <Progress value={currentOrder.overall_progress} className="h-3" />
            </div>
            
            {/* Enhanced Order Details */}
            {(currentOrder.design_concept || currentOrder.fabric_colors || currentOrder.budget_range) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                {currentOrder.design_concept && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Design Concept:</span>
                    <p className="text-sm text-gray-800 mt-1">{currentOrder.design_concept}</p>
                  </div>
                )}
                {currentOrder.fabric_colors && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Colors:</span>
                    <p className="text-sm text-gray-800 mt-1">{currentOrder.fabric_colors}</p>
                  </div>
                )}
                {currentOrder.budget_range && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Budget:</span>
                    <p className="text-sm text-gray-800 mt-1 font-medium">{currentOrder.budget_range}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Special Instructions Alert */}
            {currentOrder.special_instructions && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-amber-700">Special Instructions:</span>
                    <p className="text-sm text-amber-800 mt-1">{currentOrder.special_instructions}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Design Files */}
            {(currentOrder.design_files?.length || currentOrder.additional_files?.length) && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium text-gray-600">Files:</span>
                {currentOrder.design_files?.map((file, index) => (
                  <Badge key={`design-${index}`} variant="outline" className="text-xs">
                    📎 {file}
                  </Badge>
                ))}
                {currentOrder.additional_files?.map((file, index) => (
                  <Badge key={`additional-${index}`} variant="secondary" className="text-xs">
                    📄 {file}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
      </div>

      {/* Stage Categories */}
      <Tabs defaultValue="production" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="production">Production Stages</TabsTrigger>
          <TabsTrigger value="business">Business Functions</TabsTrigger>
          <TabsTrigger value="ai">AI Features</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4">
            {currentOrder.stages.filter(stage => stage.category === 'PRODUCTION').map((stage) => (
              <Card key={stage.id} className={`executive-card hover-scale border-l-4 ${getCategoryColor(stage.category)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        {stage.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Stage {stage.id}: {stage.name}</h3>
                          <Badge className={`status-badge ${stage.status.toLowerCase()}`}>
                            {getStatusIcon(stage.status)}
                            <span className="ml-1">{stage.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-3">{stage.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">{stage.progress}%</span>
                          </div>
                          <Progress value={stage.progress} className="h-2" />
                        </div>
                        
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Estimated:</span>
                            <div className="font-medium">{stage.estimatedTime}</div>
                          </div>
                          {stage.actualTime && (
                            <div>
                              <span className="text-muted-foreground">Actual:</span>
                              <div className="font-medium text-green-600">{stage.actualTime}</div>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Workers:</span>
                            <div className="font-medium">{stage.workers.join(', ')}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Dependencies:</span>
                            <div className="font-medium">
                              {stage.dependencies.length > 0 ? `Stage ${stage.dependencies.join(', ')}` : 'None'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Specifications */}
                        {stage.specifications && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm font-medium mb-2">Specifications:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(stage.specifications).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-muted-foreground">{key.replace('_', ' ')}:</span>
                                  <span className="ml-1 font-medium">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4">
                      {stage.status === 'IN_PROGRESS' && (
                        <Button size="sm" variant="outline" onClick={() => handleStageAction(stage.id, 'pause')}>
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {stage.status === 'NOT_STARTED' && stage.dependencies.every(dep => 
                        currentOrder.stages.find(s => s.id === dep)?.status === 'COMPLETED'
                      ) && (
                        <Button size="sm" onClick={() => handleStageAction(stage.id, 'start')}>
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {stage.status === 'BLOCKED' && (
                        <Button size="sm" variant="outline" onClick={() => handleStageAction(stage.id, 'retry')}>
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4">
            {currentOrder.stages.filter(stage => stage.category === 'BUSINESS').map((stage) => (
              <Card key={stage.id} className={`executive-card hover-scale border-l-4 ${getCategoryColor(stage.category)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        {stage.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Stage {stage.id}: {stage.name}</h3>
                          <Badge className={`status-badge ${stage.status.toLowerCase()}`}>
                            {getStatusIcon(stage.status)}
                            <span className="ml-1">{stage.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-3">{stage.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">{stage.progress}%</span>
                          </div>
                          <Progress value={stage.progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid gap-4">
            {currentOrder.stages.filter(stage => stage.category === 'AI_FEATURES').map((stage) => (
              <Card key={stage.id} className={`executive-card hover-scale border-l-4 ${getCategoryColor(stage.category)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        {stage.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Stage {stage.id}: {stage.name}</h3>
                          <Badge className={`status-badge ${stage.status.toLowerCase()}`}>
                            {getStatusIcon(stage.status)}
                            <span className="ml-1">{stage.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-3">{stage.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">{stage.progress}%</span>
                          </div>
                          <Progress value={stage.progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}