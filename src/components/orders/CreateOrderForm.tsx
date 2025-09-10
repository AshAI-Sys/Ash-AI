'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Bot,
  Calendar,
  DollarSign,
  Palette,
  Package,
  Route,
  FileText,
  Send,
  Save
} from 'lucide-react'

interface OrderFormData {
  // Client & Brand
  client_id?: string
  newClient?: {
    name: string
    company: string
    emails: string[]
    phones: string[]
    billingAddress: any
  }
  brand_id: string
  channel?: string

  // Product & Design
  productType: string
  design_assets: string[]
  method: 'SILKSCREEN' | 'SUBLIMATION' | 'DTF' | 'EMBROIDERY'

  // Quantities & Size Curve
  total_qty: number
  sizeCurve: Record<string, number>

  // Variants & Add-ons
  colorways?: any[]
  addons?: string[]

  // Dates & SLAs
  target_delivery_date: string
  targetStageDates?: Record<string, string>

  // Commercials
  unitPrice: number
  depositPercent: number
  paymentTerms: string
  taxMode: 'INCLUSIVE' | 'EXCLUSIVE'
  currency: string

  // Production Route
  routeTemplate: string
  customRouting?: any[]

  // Files & Notes
  attachments: any[]
  notes: string
}

interface AshleyAdvisory {
  type: 'INFO' | 'WARNING' | 'ERROR'
  title: string
  message: string
  suggestion?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  category: 'ROUTING' | 'CAPACITY' | 'QUALITY' | 'COMMERCIAL' | 'TIMELINE'
}

const BRANDS = [
  { id: 'reefer', name: 'Reefer', code: 'REEF' },
  { id: 'sorbetes', name: 'Sorbetes', code: 'SORB' },
]

const PRODUCT_TYPES = [
  'T-Shirt', 'Hoodie', 'Jersey', 'Uniform', 'Custom'
]

const CHANNELS = [
  'Direct', 'CSR', 'Shopee', 'TikTok', 'Lazada'
]

const PAYMENT_TERMS = [
  '50/50', 'Net 15', 'Net 30', '100% Advance', '30/70'
]

const ROUTING_TEMPLATES = {
  SILKSCREEN: [
    { key: 'SILK_OPTION_A', name: 'Cut → Print → Sew → QC → Pack (Default)', default: true },
    { key: 'SILK_OPTION_B', name: 'Cut → Sew → Print → QC → Pack (Ashley Guarded)', guarded: true }
  ],
  SUBLIMATION: [
    { key: 'SUBL_DEFAULT', name: 'GA → Print → Heat Press → Cut → Sew → QC → Pack', default: true }
  ],
  DTF: [
    { key: 'DTF_DEFAULT', name: 'Receive Plain Tee → DTF → QC → Pack', default: true }
  ],
  EMBROIDERY: [
    { key: 'EMB_DEFAULT', name: 'Cut → Emb → Sew → QC → Pack', default: true }
  ]
}

export default function CreateOrderForm() {
  const [formData, setFormData] = useState<OrderFormData>({
    brand_id: '',
    productType: '',
    method: 'SILKSCREEN',
    total_qty: 0,
    sizeCurve: { S: 0, M: 0, L: 0, XL: 0 },
    target_delivery_date: '',
    unitPrice: 0,
    depositPercent: 50,
    paymentTerms: '50/50',
    taxMode: 'INCLUSIVE',
    currency: 'PHP',
    routeTemplate: '',
    attachments: [],
    notes: '',
    design_assets: []
  })

  const [ashleyAdvisories, setAshleyAdvisories] = useState<AshleyAdvisory[]>([])
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [loading, setLoading] = useState(false)

  // Ashley AI Real-time Validation
  useEffect(() => {
    const validateOrder = async () => {
      // Skip validation if required fields are missing
      if (!formData.method || !formData.total_qty || !formData.target_delivery_date) {
        setAshleyAdvisories([])
        return
      }

      try {
        // Call Ashley AI validation API
        const response = await fetch('/api/ashley-ai/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: formData.method,
            productType: formData.productType,
            total_qty: formData.total_qty,
            sizeCurve: formData.sizeCurve,
            target_delivery_date: formData.target_delivery_date,
            routeTemplate: formData.routeTemplate,
            brand_id: formData.brand_id
          })
        })

        if (response.ok) {
          const result = await response.json()
          setAshleyAdvisories(result.advisories || [])
        } else {
          // Fallback to local validation if API fails
          const advisories: AshleyAdvisory[] = []

          // Check for large AOP warning
          if (formData.method === 'SUBLIMATION' && formData.total_qty > 500) {
            advisories.push({
              type: 'WARNING',
              title: 'Large AOP Order',
              message: 'Large all-over-print orders require printing before sewing.',
              suggestion: 'Consider using GA → Print → Heat Press → Cut → Sew routing.'
            })
          }

          // Check delivery date feasibility
          if (formData.target_delivery_date) {
            const deliveryDate = new Date(formData.target_delivery_date)
            const today = new Date()
            const daysDiff = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysDiff < 7) {
              advisories.push({
                type: 'ERROR',
                title: 'Rush Order Alert',
                message: 'Delivery date is less than 7 days. This may not be feasible.',
                suggestion: 'Consider extending delivery date or upgrading to rush processing.'
              })
            }
          }

          // Size curve validation
          const sizeCurveTotal = Object.values(formData.sizeCurve).reduce((a, b) => a + b, 0)
          if (formData.total_qty > 0 && sizeCurveTotal !== formData.total_qty) {
            advisories.push({
              type: 'ERROR',
              title: 'Size Curve Mismatch',
              message: `Size curve total (${sizeCurveTotal}) doesn't match total quantity (${formData.total_qty}).`,
              suggestion: 'Adjust size breakdown to match total quantity.'
            })
          }

          setAshleyAdvisories(advisories)
        }
      } catch (error) {
        console.error('Ashley AI validation error:', error)
        setAshleyAdvisories([])
      }
    }

    // Debounce validation calls
    const timeoutId = setTimeout(validateOrder, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.method, formData.productType, formData.total_qty, formData.sizeCurve, formData.target_delivery_date, formData.routingTemplate, formData.brand_id])

  const handleSizeCurveChange = (size: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      sizeCurve: { ...prev.sizeCurve, [size]: value }
    }))
  }

  const getDefaultRouting = (method: string) => {
    const templates = ROUTING_TEMPLATES[method as keyof typeof ROUTING_TEMPLATES] || []
    return templates.find(t => t.default)?.key || ''
  }

  const handleSubmit = async (action: 'DRAFT' | 'CREATE' | 'SEND_SUMMARY') => {
    setLoading(true)
    try {
      // Validate form
      const errors = ashleyAdvisories.filter(a => a.type === 'ERROR')
      if (errors.length > 0 && action !== 'DRAFT') {
        alert('Please fix all errors before proceeding.')
        return
      }

      // Validate required fields
      if (!formData.brand_id || !formData.productType || !formData.total_qty || !formData.target_delivery_date) {
        alert('Please fill in all required fields.')
        return
      }

      const orderData = {
        ...formData,
        status: action === 'DRAFT' ? 'DRAFT' : 'INTAKE',
        clientName: formData.newClient?.name || 'TBD'
      }

      console.log('Creating order:', orderData)
      
      // API call to create order
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()

      if (response.ok) {
        alert(`${result.message}`)
        
        // Show Ashley AI advisories if any
        if (result.ashleyAdvisories?.length > 0) {
          const advisoryCount = result.ashleyAdvisories.length
          const hasWarnings = result.ashleyAdvisories.some((a: any) => a.type === 'WARNING')
          const hasErrors = result.ashleyAdvisories.some((a: any) => a.type === 'ERROR')
          
          if (hasErrors || hasWarnings) {
            console.log('Ashley AI Advisories:', result.ashleyAdvisories)
          }
        }
        
        // Reset form or redirect
        if (action !== 'DRAFT') {
          // setFormData({ ... reset to initial state ... })
        }
      } else {
        alert(`Error: ${result.error}`)
        if (result.blockingErrors) {
          console.error('Blocking errors:', result.blockingErrors)
        }
      }
      
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error creating order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
            New Production Order
          </h1>
          <p className="text-slate-600 mt-2">Create a comprehensive production order with AI-powered validation</p>
        </div>
        
        {/* Ashley AI Status */}
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-slate-700">Ashley AI</span>
          {ashleyAdvisories.length > 0 && (
            <Badge variant={ashleyAdvisories.some(a => a.type === 'ERROR') ? 'destructive' : 'secondary'}>
              {ashleyAdvisories.length} advisory{ashleyAdvisories.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Ashley Advisories */}
      {ashleyAdvisories.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              Ashley AI Advisory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ashleyAdvisories.map((advisory, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                advisory.type === 'ERROR' ? 'bg-red-50 border-red-200' :
                advisory.type === 'WARNING' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  {advisory.type === 'ERROR' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : advisory.type === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{advisory.title}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          advisory.severity === 'HIGH' ? 'border-red-300 text-red-700' :
                          advisory.severity === 'MEDIUM' ? 'border-yellow-300 text-yellow-700' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {advisory.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {advisory.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{advisory.message}</p>
                    {advisory.suggestion && (
                      <div className="bg-white/50 rounded p-2 border">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-purple-700">💡 Ashley's Suggestion:</span> {advisory.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="client" className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="client">Client & Brand</TabsTrigger>
          <TabsTrigger value="product">Product & Design</TabsTrigger>
          <TabsTrigger value="quantities">Quantities</TabsTrigger>
          <TabsTrigger value="dates">Dates & SLA</TabsTrigger>
          <TabsTrigger value="commercials">Commercials</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="attachments">Files & Notes</TabsTrigger>
        </TabsList>

        {/* Client & Brand Section */}
        <TabsContent value="client">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Client & Brand Information
              </CardTitle>
              <CardDescription>Select or create client and specify brand details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <select
                    id="brand"
                    value={formData.brand_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand_id: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Brand</option>
                    {BRANDS.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <select
                    id="channel"
                    value={formData.channel || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, channel: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Channel</option>
                    {CHANNELS.map(channel => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Client</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingClient(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Client
                  </Button>
                </div>
                
                {!isCreatingClient ? (
                  <select
                    value={formData.client_id || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Client</option>
                    {/* TODO: Load clients from API */}
                    <option value="client1">Clark Safari & Adventure Park</option>
                    <option value="client2">ABC Corporation</option>
                  </select>
                ) : (
                  <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="font-medium">New Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clientName">Name *</Label>
                        <Input
                          id="clientName"
                          value={formData.newClient?.name || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newClient: { ...prev.newClient!, name: e.target.value }
                          }))}
                          placeholder="Client name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientCompany">Company</Label>
                        <Input
                          id="clientCompany"
                          value={formData.newClient?.company || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            newClient: { ...prev.newClient!, company: e.target.value }
                          }))}
                          placeholder="Company name"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatingClient(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          // TODO: Create client
                          setIsCreatingClient(false)
                        }}
                      >
                        Create Client
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product & Design Section */}
        <TabsContent value="product">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Product & Design
              </CardTitle>
              <CardDescription>Specify product details and upload design assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="productType">Product Type *</Label>
                  <select
                    id="productType"
                    value={formData.productType}
                    onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Product Type</option>
                    {PRODUCT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="method">Print Method *</Label>
                  <select
                    id="method"
                    value={formData.method}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      method: e.target.value as any,
                      routeTemplate: getDefaultRouting(e.target.value)
                    }))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="SILKSCREEN">Silkscreen</option>
                    <option value="SUBLIMATION">Sublimation</option>
                    <option value="DTF">DTF (Direct to Film)</option>
                    <option value="EMBROIDERY">Embroidery</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Design Assets</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button type="button" variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Design Files
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      PNG, JPG, PDF, AI files up to 50MB each
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quantities Section */}
        <TabsContent value="quantities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Quantities & Size Breakdown
              </CardTitle>
              <CardDescription>Specify total quantity and size curve distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="total_qty">Total Quantity *</Label>
                <Input
                  id="total_qty"
                  type="number"
                  value={formData.total_qty}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_qty: parseInt(e.target.value) || 0 }))}
                  placeholder="Total pieces"
                  min="1"
                  required
                />
              </div>

              <div>
                <Label>Size Breakdown *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {Object.entries(formData.sizeCurve).map(([size, qty]) => (
                    <div key={size}>
                      <Label htmlFor={`size-${size}`}>{size}</Label>
                      <Input
                        id={`size-${size}`}
                        type="number"
                        value={qty}
                        onChange={(e) => handleSizeCurveChange(size, parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Size curve total: {Object.values(formData.sizeCurve).reduce((a, b) => a + b, 0)}
                  {formData.total_qty > 0 && Object.values(formData.sizeCurve).reduce((a, b) => a + b, 0) !== formData.total_qty && (
                    <span className="text-red-600 ml-2">⚠️ Doesn't match total quantity</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dates & SLA Section */}
        <TabsContent value="dates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dates & Service Level Agreements
              </CardTitle>
              <CardDescription>Set target dates and delivery commitments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="target_delivery_date">Target Delivery Date *</Label>
                  <Input
                    id="target_delivery_date"
                    type="date"
                    value={formData.target_delivery_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_delivery_date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="urgency">Priority Level</Label>
                  <select
                    id="urgency"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                  >
                    <option value="NORMAL">Normal (7-14 days)</option>
                    <option value="URGENT">Urgent (3-7 days)</option>
                    <option value="RUSH">Rush (1-3 days) +25% Fee</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label>Stage Target Dates (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="designApprovalDate">Design Approval</Label>
                    <Input
                      id="designApprovalDate"
                      type="date"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cuttingCompletionDate">Cutting Completion</Label>
                    <Input
                      id="cuttingCompletionDate"
                      type="date"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="printingCompletionDate">Printing Completion</Label>
                    <Input
                      id="printingCompletionDate"
                      type="date"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sewingCompletionDate">Sewing Completion</Label>
                    <Input
                      id="sewingCompletionDate"
                      type="date"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commercials Section */}
        <TabsContent value="commercials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Commercial Terms
              </CardTitle>
              <CardDescription>Set pricing, payment terms, and commercial conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="unitPrice">Unit Price *</Label>
                  <div className="flex">
                    <select className="p-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50">
                      <option value="PHP">₱</option>
                      <option value="USD">$</option>
                    </select>
                    <Input
                      id="unitPrice"
                      type="number"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      step="0.01"
                      className="rounded-l-none"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    value={`₱${(formData.unitPrice * formData.total_qty).toLocaleString()}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="depositPercent">Deposit Percentage *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="depositPercent"
                      type="number"
                      value={formData.depositPercent}
                      onChange={(e) => setFormData(prev => ({ ...prev, depositPercent: parseInt(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      className="w-20"
                      required
                    />
                    <span className="text-gray-500">%</span>
                    <span className="text-sm text-gray-600 ml-2">
                      = ₱{((formData.unitPrice * formData.total_qty * formData.depositPercent) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms *</Label>
                  <select
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    required
                  >
                    {PAYMENT_TERMS.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="taxMode">Tax Mode *</Label>
                  <select
                    id="taxMode"
                    value={formData.taxMode}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxMode: e.target.value as any }))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="INCLUSIVE">Tax Inclusive</option>
                    <option value="EXCLUSIVE">Tax Exclusive (+12% VAT)</option>
                  </select>
                </div>
                
                <div>
                  <Label>Rush Fee</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="checkbox" id="rushFee" className="rounded" />
                    <Label htmlFor="rushFee" className="text-sm">Apply rush processing fee (+25%)</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routing Section */}
        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Production Routing
              </CardTitle>
              <CardDescription>Configure production workflow and routing templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Routing Template *</Label>
                <div className="mt-2 space-y-3">
                  {ROUTING_TEMPLATES[formData.method]?.map((template) => (
                    <div key={template.key} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id={template.key}
                        name="routingTemplate"
                        value={template.key}
                        checked={formData.routeTemplate === template.key}
                        onChange={(e) => setFormData(prev => ({ ...prev, routeTemplate: e.target.value }))}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <label htmlFor={template.key} className="flex items-center gap-2 cursor-pointer">
                          <span className="font-medium">{template.name}</span>
                          {template.default && (
                            <Badge variant="secondary" className="text-xs">Recommended</Badge>
                          )}
                          {template.guarded && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                              Ashley Guarded
                            </Badge>
                          )}
                        </label>
                      </div>
                    </div>
                  )) || (
                    <div className="text-gray-500">Select a print method to see routing options</div>
                  )}
                </div>
              </div>
              
              {formData.routingTemplate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Production Steps Preview</h4>
                  <div className="space-y-2">
                    {formData.method === 'SILKSCREEN' && formData.routingTemplate === 'SILK_OPTION_A' && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                          <span>Cutting → Fabric preparation and pattern cutting</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                          <span>Printing → Silkscreen application</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                          <span>Sewing → Assembly and construction</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">4</div>
                          <span>Quality Control → Final inspection</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">5</div>
                          <span>Packing → Packaging and shipping prep</span>
                        </div>
                      </>
                    )}
                    
                    {formData.method === 'SUBLIMATION' && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                          <span>Graphic Arts → Design preparation</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                          <span>Printing → Sublimation printing</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                          <span>Heat Press → Transfer application</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">4</div>
                          <span>Cutting → Pattern cutting post-print</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">5</div>
                          <span>Sewing → Assembly</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">6</div>
                          <span>Quality Control → Final inspection</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">7</div>
                          <span>Packing → Final packaging</span>
                        </div>
                      </>
                    )}
                    
                    {formData.method === 'DTF' && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                          <span>Receive Plain Tee → Blank garment inspection</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                          <span>DTF Application → Direct-to-film transfer</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                          <span>Quality Control → Final inspection</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">4</div>
                          <span>Packing → Final packaging</span>
                        </div>
                      </>
                    )}
                    
                    {formData.method === 'EMBROIDERY' && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                          <span>Cutting → Fabric preparation</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                          <span>Embroidery → Machine embroidery</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                          <span>Sewing → Assembly</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">4</div>
                          <span>Quality Control → Final inspection</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">5</div>
                          <span>Packing → Final packaging</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files & Notes Section */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Files & Notes
              </CardTitle>
              <CardDescription>Upload additional files and add order notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Additional Files</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button type="button" variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Reference images, specifications, brand guidelines, etc.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions, client preferences, production notes..."
                  rows={6}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Internal Tags</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">Rush Order</Badge>
                  <Badge variant="outline">VIP Client</Badge>
                  <Badge variant="outline">Repeat Customer</Badge>
                  <Button variant="ghost" size="sm" className="h-6">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => handleSubmit('DRAFT')}
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => handleSubmit('CREATE')}
          disabled={loading || ashleyAdvisories.some(a => a.type === 'ERROR')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create PO
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit('SEND_SUMMARY')}
          disabled={loading || ashleyAdvisories.some(a => a.type === 'ERROR')}
        >
          <Send className="w-4 h-4 mr-2" />
          Send Summary to Client
        </Button>
      </div>
    </div>
  )
}