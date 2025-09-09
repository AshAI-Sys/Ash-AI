'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
  import {
  Plus, 
  X, 
  User, 
  Building, 
  Package, 
  Palette, 
  Truck, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  Bot,
  Clock,
  TrendingUp,
  ShieldAlert
} from 'lucide-react'
import { routingEngine, type RoutingTemplate, type OrderContext, type CriticalPath } from '@/lib/routing-engine'

interface Client {
  id: string
  name: string
  company: string
  email: string
  phone: string
}

interface Brand {
  id: string
  name: string
  code: string
  defaultPricing: Record<string, number>
}

interface AshleyRecommendation {
  recommendedTemplate: RoutingTemplate | null
  insights: string[]
  warnings: string[]
  criticalPath?: CriticalPath
}

interface OrderData {
  clientId: string
  brandId: string
  productType: string
  method: string
  totalQty: number
  sizeCurve: Record<string, number>
  targetDeliveryDate: string
  unitPrice: number
  depositPercentage: number
  routeTemplateKey: string
  notes: string
}

const mockClients: Client[] = [
  { id: '1', name: 'John Smith', company: 'ABC Corporation', email: 'john@abc.com', phone: '+63 917 123 4567' },
  { id: '2', name: 'Maria Santos', company: 'XYZ Company', email: 'maria@xyz.com', phone: '+63 917 234 5678' },
  { id: '3', name: 'Robert Chen', company: 'Tech Innovators', email: 'robert@techinnovators.com', phone: '+63 917 345 6789' }
]

const mockBrands: Brand[] = [
  { id: '1', name: 'Sorbetes', code: 'SORB', defaultPricing: { 'T-Shirt': 350, 'Hoodie': 650, 'Jersey': 450 } },
  { id: '2', name: 'Reefer', code: 'REEF', defaultPricing: { 'T-Shirt': 320, 'Hoodie': 600, 'Jersey': 420 } }
]


interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (orderData: OrderData) => void
}

export function CreateOrderModal({ isOpen, onClose, onSubmit }: CreateOrderModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [orderData, setOrderData] = useState<Partial<OrderData>>({
    sizeCurve: { S: 0, M: 0, L: 0, XL: 0 },
    depositPercentage: 50,
    totalQty: 0
  })
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [availableTemplates, setAvailableTemplates] = useState<RoutingTemplate[]>([])
  const [ashleyRecommendation, setAshleyRecommendation] = useState<AshleyRecommendation | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<RoutingTemplate | null>(null)

  const steps = [
    { number: 1, name: 'Client & Brand', icon: User },
    { number: 2, name: 'Product Details', icon: Package },
    { number: 3, name: 'Quantities & Sizes', icon: Palette },
    { number: 4, name: 'Delivery & Pricing', icon: DollarSign },
    { number: 5, name: 'Production Route', icon: Truck },
    { number: 6, name: 'Review & Submit', icon: CheckCircle }
  ]

  useEffect(() => {
    if (orderData.method && orderData.productType && orderData.totalQty > 0 && orderData.targetDeliveryDate) {
      const context: OrderContext = {
        productType: orderData.productType,
        method: orderData.method as any,
        quantity: orderData.totalQty,
        targetDeliveryDate: new Date(orderData.targetDeliveryDate),
        brandId: orderData.brandId || '',
        isPriority: orderData.totalQty > 500 // Consider large orders priority
      }
      
      // Get available templates from routing engine
      const templates = routingEngine.getTemplatesForOrder(context)
      setAvailableTemplates(templates)
      
      // Get Ashley AI recommendation
      const recommendation = routingEngine.getAshleyRecommendation(context)
      
      // Calculate critical path for recommended template
      if (recommendation.recommendedTemplate) {
        const criticalPath = routingEngine.calculateCriticalPath(
          recommendation.recommendedTemplate, 
          orderData.totalQty,
          new Date(orderData.targetDeliveryDate)
        )
        recommendation.criticalPath = criticalPath
      }
      
      setAshleyRecommendation(recommendation)
      
      // Auto-select recommended template
      if (recommendation.recommendedTemplate) {
        setSelectedTemplate(recommendation.recommendedTemplate)
        setOrderData(prev => ({ ...prev, routeTemplateKey: recommendation.recommendedTemplate!.id }))
      }
    }
  }, [orderData.method, orderData.totalQty, orderData.productType, orderData.targetDeliveryDate, orderData.brandId])

  const handleSizeCurveChange = (size: string, value: number) => {
    const newSizeCurve = { ...orderData.sizeCurve, [size]: value }
    const newTotal = Object.values(newSizeCurve).reduce((sum, qty) => sum + qty, 0)
    setOrderData({ ...orderData, sizeCurve: newSizeCurve, totalQty: newTotal })
  }

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    if (orderData.clientId && orderData.brandId && orderData.productType && 
        orderData.method && orderData.totalQty > 0 && orderData.routeTemplateKey) {
      onSubmit(orderData as OrderData)
      onClose()
      setCurrentStep(1)
      setOrderData({ sizeCurve: { S: 0, M: 0, L: 0, XL: 0 }, depositPercentage: 50, totalQty: 0 })
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Select Client</Label>
              <div className="grid gap-3 mt-3">
                {mockClients.map((client) => (
                  <Card 
                    key={client.id} 
                    className={`cursor-pointer transition-all ${
                      selectedClient?.id === client.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedClient(client)
                      setOrderData({ ...orderData, clientId: client.id })
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <User className="h-8 w-8 text-blue-600 bg-blue-100 rounded-full p-1.5" />
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.company}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Select Brand</Label>
              <div className="grid gap-3 mt-3">
                {mockBrands.map((brand) => (
                  <Card 
                    key={brand.id}
                    className={`cursor-pointer transition-all ${
                      selectedBrand?.id === brand.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedBrand(brand)
                      setOrderData({ ...orderData, brandId: brand.id })
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Building className="h-8 w-8 text-green-600 bg-green-100 rounded-full p-1.5" />
                        <div>
                          <p className="font-semibold">{brand.name}</p>
                          <p className="text-sm text-muted-foreground">Code: {brand.code}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="productType" className="text-base font-semibold">Product Type</Label>
              <select
                id="productType"
                value={orderData.productType || ''}
                onChange={(e) => {
                  const newProductType = e.target.value
                  const newPrice = selectedBrand?.defaultPricing[newProductType] || 0
                  setOrderData({ ...orderData, productType: newProductType, unitPrice: newPrice })
                }}
                className="w-full mt-2 px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="">Select Product Type</option>
                <option value="T-Shirt">T-Shirt</option>
                <option value="Hoodie">Hoodie</option>
                <option value="Jersey">Jersey</option>
                <option value="Uniform">Uniform</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <Label htmlFor="method" className="text-base font-semibold">Printing Method</Label>
              <select
                id="method"
                value={orderData.method || ''}
                onChange={(e) => setOrderData({ ...orderData, method: e.target.value })}
                className="w-full mt-2 px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="">Select Method</option>
                <option value="Silkscreen">Silkscreen</option>
                <option value="Sublimation">Sublimation</option>
                <option value="DTF">DTF (Direct-to-Film)</option>
                <option value="Embroidery">Embroidery</option>
              </select>
            </div>

            <div>
              <Label htmlFor="notes" className="text-base font-semibold">Design Notes</Label>
              <Textarea
                id="notes"
                value={orderData.notes || ''}
                onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                placeholder="Special design requirements, colors, artwork details..."
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Size Breakdown</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                {['S', 'M', 'L', 'XL'].map((size) => (
                  <div key={size}>
                    <Label htmlFor={size} className="text-sm font-medium">Size {size}</Label>
                    <Input
                      id={size}
                      type="number"
                      min="0"
                      value={orderData.sizeCurve?.[size] || 0}
                      onChange={(e) => handleSizeCurveChange(size, parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Total Quantity: {orderData.totalQty}</span>
                </div>
              </CardContent>
            </Card>

            {orderData.totalQty > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Size Distribution Valid</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {Object.entries(orderData.sizeCurve || {}).map(([size, qty]) => (
                    <div key={size} className="text-green-700">
                      {size}: {qty} ({Math.round((qty / orderData.totalQty) * 100)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="targetDelivery" className="text-base font-semibold">Target Delivery Date</Label>
              <Input
                id="targetDelivery"
                type="date"
                value={orderData.targetDeliveryDate || ''}
                onChange={(e) => setOrderData({ ...orderData, targetDeliveryDate: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unitPrice" className="text-base font-semibold">Unit Price (PHP)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderData.unitPrice || 0}
                  onChange={(e) => setOrderData({ ...orderData, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="deposit" className="text-base font-semibold">Deposit %</Label>
                <Input
                  id="deposit"
                  type="number"
                  min="0"
                  max="100"
                  value={orderData.depositPercentage || 50}
                  onChange={(e) => setOrderData({ ...orderData, depositPercentage: parseInt(e.target.value) || 50 })}
                  className="mt-2"
                />
              </div>
            </div>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">₱{((orderData.unitPrice || 0) * (orderData.totalQty || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deposit ({orderData.depositPercentage}%):</span>
                    <span className="font-semibold text-purple-700">
                      ₱{(((orderData.unitPrice || 0) * (orderData.totalQty || 0) * (orderData.depositPercentage || 0)) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Balance on Delivery:</span>
                    <span>
                      ₱{(((orderData.unitPrice || 0) * (orderData.totalQty || 0)) - (((orderData.unitPrice || 0) * (orderData.totalQty || 0) * (orderData.depositPercentage || 0)) / 100)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Production Route Selection</Label>
              
              {/* Ashley AI Recommendation Panel */}
              {ashleyRecommendation && (
                <Card className="my-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-purple-800">Ashley AI Analysis</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Critical Path Summary */}
                    {ashleyRecommendation.criticalPath && (
                      <div className="bg-white/70 rounded-lg p-3 border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>Est. Production: {Math.ceil(ashleyRecommendation.criticalPath.totalEstimatedHours / 8)} days</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span>Est. Delivery: {ashleyRecommendation.criticalPath.estimatedDeliveryDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className={ashleyRecommendation.criticalPath.feasible ? 'text-green-700' : 'text-red-700'}>
                              {ashleyRecommendation.criticalPath.feasible ? 'Timeline Feasible' : 'Tight Timeline'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <ShieldAlert className="h-4 w-4 text-yellow-600" />
                            <span>{ashleyRecommendation.criticalPath.bottleneckSteps.length} Bottlenecks</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Insights */}
                    {ashleyRecommendation.insights.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">Optimization Insights</span>
                        </div>
                        {ashleyRecommendation.insights.map((insight, index) => (
                          <p key={index} className="text-sm text-blue-700 mb-1 pl-6">• {insight}</p>
                        ))}
                      </div>
                    )}
                    
                    {/* Warnings */}
                    {ashleyRecommendation.warnings.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-semibold text-orange-800">Risk Factors</span>
                        </div>
                        {ashleyRecommendation.warnings.map((warning, index) => (
                          <p key={index} className="text-sm text-orange-700 mb-1 pl-6">⚠ {warning}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Template Selection */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Available Production Routes</h4>
                <div className="grid gap-4">
                  {availableTemplates.map((template) => {
                    const isRecommended = ashleyRecommendation?.recommendedTemplate?.id === template.id
                    return (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        } ${isRecommended ? 'border-green-300 bg-green-50' : ''}`}
                        onClick={() => {
                          setSelectedTemplate(template)
                          setOrderData({ ...orderData, routeTemplateKey: template.id })
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Truck className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold">{template.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isRecommended && (
                                  <Badge className="bg-green-100 text-green-800">Ashley Recommended</Badge>
                                )}
                                <Badge variant={template.complexity === 'LOW' ? 'default' : template.complexity === 'MEDIUM' ? 'secondary' : 'destructive'}>
                                  {template.complexity}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                              <span>{template.steps.length} Production Steps</span>
                              <span>Method: {template.method}</span>
                              <span>Complexity: {template.complexity}</span>
                            </div>
                            
                            {/* Production Steps Flow */}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-600 mb-2 font-medium">Production Flow:</div>
                              <div className="flex flex-wrap items-center gap-1">
                                {template.steps.map((step, index) => (
                                  <div key={index} className="flex items-center">
                                    <div className="text-xs bg-white px-2 py-1 rounded border text-gray-700">
                                      {step.name}
                                    </div>
                                    {index < template.steps.length - 1 && (
                                      <ArrowRight className="h-3 w-3 text-gray-400 mx-1" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Risk Factors */}
                            {template.riskFactors.length > 0 && (
                              <div className="bg-orange-50 border border-orange-200 rounded p-2">
                                <div className="flex items-center space-x-1 mb-1">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <span className="text-sm font-semibold text-orange-800">Risk Considerations:</span>
                                </div>
                                <div className="text-xs text-orange-700">
                                  {template.riskFactors.join(' • ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
                
                {availableTemplates.length === 0 && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-red-800 font-semibold">No Compatible Routes Found</p>
                      <p className="text-red-700 text-sm">Please adjust product type or method selection.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Order Details</h3>
              <p className="text-muted-foreground">Please review all information before submitting</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Client & Brand</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Client:</span>
                      <p className="font-medium">{selectedClient?.name} - {selectedClient?.company}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brand:</span>
                      <p className="font-medium">{selectedBrand?.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Product Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Product:</span>
                      <p className="font-medium">{orderData.productType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Method:</span>
                      <p className="font-medium">{orderData.method}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Quantity:</span>
                      <span className="font-medium">{orderData.totalQty} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unit Price:</span>
                      <span className="font-medium">₱{orderData.unitPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-bold text-lg">₱{((orderData.unitPrice || 0) * (orderData.totalQty || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Date:</span>
                      <span className="font-medium">{orderData.targetDeliveryDate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Production Route Summary */}
              {selectedTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Truck className="h-4 w-4" />
                      <span>Production Route</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedTemplate.name}</span>
                        <Badge className="bg-blue-100 text-blue-800">{selectedTemplate.method}</Badge>
                      </div>
                      
                      {ashleyRecommendation?.criticalPath && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">Production Timeline</div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-600">Est. Production:</span>
                              <span className="ml-2 font-medium">
                                {Math.ceil(ashleyRecommendation.criticalPath.totalEstimatedHours / 8)} days
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Est. Delivery:</span>
                              <span className="ml-2 font-medium">
                                {ashleyRecommendation.criticalPath.estimatedDeliveryDate.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              ashleyRecommendation.criticalPath.feasible 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {ashleyRecommendation.criticalPath.feasible ? '✓ Timeline Achievable' : '⚠ Tight Schedule'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.steps.map((step, index) => (
                          <div key={index} className="flex items-center">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{step.name}</span>
                            {index < selectedTemplate.steps.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-gray-400 mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto ash-glass backdrop-blur-xl border border-white/20">
        <DialogHeader className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-t-lg"></div>
          <DialogTitle className="relative flex items-center space-x-3 text-2xl font-bold">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ash-animate-pulse-slow">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <span className="ash-gradient-text">Create New Production Order</span>
            <Badge className="bg-purple-100 text-purple-800 ml-auto">
              <Bot className="w-3 h-3 mr-1" />
              Ashley AI Enabled
            </Badge>
          </DialogTitle>
          <DialogDescription className="relative text-lg text-slate-600 mt-2">
            Step {currentStep} of 6 - {steps[currentStep - 1].name}
          </DialogDescription>
        </DialogHeader>

        {/* Enhanced Progress Steps */}
        <div className="relative mb-10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center relative">
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-500 text-white shadow-lg' 
                        : isActive
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500 text-white shadow-xl pulse-glow'
                        : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-xs font-bold uppercase tracking-wider ${
                        isCompleted || isActive ? 'text-slate-800' : 'text-gray-400'
                      }`}>
                        Step {step.number}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${
                        isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4 mt-1">
                      <div className={`h-1 rounded-full transition-all duration-300 ${
                        currentStep > step.number 
                          ? 'bg-gradient-to-r from-green-400 to-blue-500' 
                          : 'bg-gray-200'
                      }`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {currentStep < 6 ? (
              <Button 
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!selectedClient || !selectedBrand)) ||
                  (currentStep === 2 && (!orderData.productType || !orderData.method)) ||
                  (currentStep === 3 && !orderData.totalQty) ||
                  (currentStep === 4 && (!orderData.targetDeliveryDate || !orderData.unitPrice)) ||
                  (currentStep === 5 && !orderData.routeTemplateKey)
                }
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700"
              >
                Create Order
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}