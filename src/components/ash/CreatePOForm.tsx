// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, AlertTriangle, CheckCircle, Package, Shirt, Palette, DollarSign, Route, FileText } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AshleyInsights } from './AshleyInsights'

const createPOSchema = z.object({
  // Client & Brand
  client_id: z.string().optional(),
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  brand_id: z.string().min(1, 'Brand is required'),
  channel: z.string().optional(),

  // Product & Design  
  productType: z.string().min(1, 'Product type is required'),
  method: z.enum(['SILKSCREEN', 'SUBLIMATION', 'DTF', 'EMBROIDERY']),
  
  // Quantities & Sizes
  total_qty: z.number().min(1, 'Quantity must be at least 1'),
  sizeCurve: z.record(z.number()).refine(
    (curve) => Object.values(curve).reduce((a, b) => a + b, 0) > 0,
    'Size curve must have at least one item'
  ),

  // Dates & SLAs
  target_delivery_date: z.date(),

  // Commercials
  unitPrice: z.number().min(0).optional(),
  depositPct: z.number().min(0).max(100).optional(),
  paymentTerms: z.string().optional(),
  currency: z.string().default('PHP'),

  // Route
  routeTemplateKey: z.string().optional(),

  // Notes
  notes: z.string().optional()
})

type CreatePOFormData = z.infer<typeof createPOSchema>

interface CreatePOFormProps {
  onSuccess?: (order: any) => void
  onCancel?: () => void
}

export function CreatePOForm({ onSuccess, onCancel }: CreatePOFormProps) {
  const [brands, setBrands] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [ashleyAssessment, setAshleyAssessment] = useState<any>(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)

  const form = useForm<CreatePOFormData>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      channel: 'Direct',
      currency: 'PHP',
      depositPct: 50,
      paymentTerms: '50/50',
      sizeCurve: { S: 0, M: 0, L: 0, XL: 0 }
    }
  })

  const watchedTotalQty = form.watch('total_qty')
  const watchedSizeCurve = form.watch('sizeCurve')

  // Load brands and clients
  useEffect(() => {
    loadBrands()
    loadClients()
  }, [])

  // Validate size curve totals
  useEffect(() => {
    if (watchedTotalQty && watchedSizeCurve) {
      const curveTotal = Object.values(watchedSizeCurve).reduce((sum, qty) => sum + (qty || 0), 0)
      if (curveTotal !== watchedTotalQty) {
        form.setError('sizeCurve', {
          message: `Size breakdown (${curveTotal}) must equal total quantity (${watchedTotalQty})`
        })
      } else {
        form.clearErrors('sizeCurve')
      }
    }
  }, [watchedTotalQty, watchedSizeCurve, form])

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brands')
      const data = await response.json()
      setBrands(data.brands || [])
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const loadClients = async () => {
    try {
      const response = await fetch('/api/ash/clients')
      const data = await response.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const onSubmit = async (data: CreatePOFormData) => {
    setLoading(true)
    setAshleyAssessment(null)

    try {
      const response = await fetch('/api/ash/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          // Legacy compatibility
          clientName: data.clientName,
          designName: data.productType,
          apparelType: data.productType
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const result = await response.json()
      setAshleyAssessment(result.ashleyAssessment)

      if (result.ashleyAssessment?.risk === 'RED') {
        // Show Ashley blocking issues but don't submit yet
        return
      }

      // Success - order created
      onSuccess?.(result.order)
    } catch (error) {
      console.error('Error creating PO:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create order'
      })
    } finally {
      setLoading(false)
    }
  }

  const createNewClient = async (clientData: { name: string; email: string; company?: string }) => {
    try {
      const response = await fetch('/api/ash/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      })

      if (!response.ok) {
        throw new Error('Failed to create client')
      }

      const result = await response.json()
      setClients([result.client, ...clients])
      form.setValue('client_id', result.client.id)
      form.setValue('clientName', result.client.name)
      setShowNewClientModal(false)
    } catch (error) {
      console.error('Error creating client:', error)
    }
  }

  const handleSizeCurveChange = (size: string, value: string) => {
    const qty = parseInt(value) || 0
    form.setValue(`sizeCurve.${size}`, qty)
  }

  const distributeEvenly = () => {
    const total = form.getValues('total_qty') || 0
    if (total > 0) {
      const perSize = Math.floor(total / 4)
      const remainder = total % 4
      
      form.setValue('sizeCurve', {
        S: perSize,
        M: perSize + (remainder > 0 ? 1 : 0),
        L: perSize + (remainder > 1 ? 1 : 0),
        XL: perSize + (remainder > 2 ? 1 : 0)
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Production Order</h1>
          <p className="text-muted-foreground mt-1">ASH AI Powered Order Intake</p>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Client
                </TabsTrigger>
                <TabsTrigger value="product" className="flex items-center gap-2">
                  <Shirt className="h-4 w-4" />
                  Product
                </TabsTrigger>
                <TabsTrigger value="quantities" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Quantities
                </TabsTrigger>
                <TabsTrigger value="dates" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Dates
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="routing" className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Routing
                </TabsTrigger>
              </TabsList>

              {/* Client & Brand */}
              <TabsContent value="client" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client & Brand Information</CardTitle>
                    <CardDescription>Select or create client and choose brand</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client</Label>
                        <Select 
                          value={form.watch('client_id')} 
                          onValueChange={(value) => {
                            form.setValue('client_id', value)
                            const client = clients.find(c => c.id === value)
                            if (client) form.setValue('clientName', client.name)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select existing client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex flex-col">
                                  <span>{client.name}</span>
                                  {client.company && (
                                    <span className="text-xs text-muted-foreground">{client.company}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNewClientModal(true)}
                        >
                          + New Client
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name *</Label>
                        <Input
                          id="clientName"
                          {...form.register('clientName')}
                          placeholder="Enter client name"
                        />
                        {form.formState.errors.clientName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.clientName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Brand *</Label>
                        <Select 
                          value={form.watch('brand_id')}
                          onValueChange={(value) => form.setValue('brand_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map(brand => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name} ({brand.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.brand_id && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.brand_id.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select 
                          value={form.watch('channel')}
                          onValueChange={(value) => form.setValue('channel', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Direct">Direct</SelectItem>
                            <SelectItem value="CSR">CSR</SelectItem>
                            <SelectItem value="Shopee">Shopee</SelectItem>
                            <SelectItem value="TikTok">TikTok</SelectItem>
                            <SelectItem value="Lazada">Lazada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Product & Design */}
              <TabsContent value="product" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Product & Design Details</CardTitle>
                    <CardDescription>Specify product type and printing method</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Product Type *</Label>
                        <Select 
                          value={form.watch('productType')}
                          onValueChange={(value) => form.setValue('productType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tee">T-Shirt</SelectItem>
                            <SelectItem value="Hoodie">Hoodie</SelectItem>
                            <SelectItem value="Jersey">Jersey</SelectItem>
                            <SelectItem value="Uniform">Uniform</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.formState.errors.productType && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.productType.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Print Method *</Label>
                        <Select 
                          value={form.watch('method')}
                          onValueChange={(value) => form.setValue('method', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SILKSCREEN">
                              <div className="flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Silkscreen
                              </div>
                            </SelectItem>
                            <SelectItem value="SUBLIMATION">Sublimation</SelectItem>
                            <SelectItem value="DTF">DTF</SelectItem>
                            <SelectItem value="EMBROIDERY">Embroidery</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.formState.errors.method && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.method.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Quantities & Sizes */}
              <TabsContent value="quantities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quantities & Size Breakdown</CardTitle>
                    <CardDescription>Enter total quantity and size distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="total_qty">Total Quantity *</Label>
                        <Input
                          id="total_qty"
                          type="number"
                          min="1"
                          {...form.register('total_qty', { valueAsNumber: true })}
                          placeholder="Enter total quantity"
                        />
                        {form.formState.errors.total_qty && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.total_qty.message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={distributeEvenly}
                          className="mb-0"
                        >
                          Distribute Evenly
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Size Breakdown *</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {['S', 'M', 'L', 'XL'].map(size => (
                          <div key={size} className="space-y-1">
                            <Label className="text-center block">{size}</Label>
                            <Input
                              type="number"
                              min="0"
                              value={form.watch(`sizeCurve.${size}`) || ''}
                              onChange={(e) => handleSizeCurveChange(size, e.target.value)}
                              className="text-center"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: {Object.values(form.watch('sizeCurve')).reduce((sum, qty) => sum + (qty || 0), 0)}
                      </div>
                      {form.formState.errors.sizeCurve && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.sizeCurve.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dates & SLAs */}
              <TabsContent value="dates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline & Delivery</CardTitle>
                    <CardDescription>Set target delivery date</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target Delivery Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !form.watch('target_delivery_date') && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('target_delivery_date') 
                              ? format(form.watch('target_delivery_date'), 'PPP') 
                              : "Pick a date"
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={form.watch('target_delivery_date')}
                            onSelect={(date) => date && form.setValue('target_delivery_date', date)}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.target_delivery_date && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.target_delivery_date.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pricing */}
              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing & Payment Terms</CardTitle>
                    <CardDescription>Set unit price and payment structure</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Unit Price</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                          <Input
                            id="unitPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            {...form.register('unitPrice', { valueAsNumber: true })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="depositPct">Deposit %</Label>
                        <Input
                          id="depositPct"
                          type="number"
                          min="0"
                          max="100"
                          {...form.register('depositPct', { valueAsNumber: true })}
                          placeholder="50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select 
                          value={form.watch('paymentTerms')}
                          onValueChange={(value) => form.setValue('paymentTerms', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50/50">50/50</SelectItem>
                            <SelectItem value="100% Advance">100% Advance</SelectItem>
                            <SelectItem value="COD">Cash on Delivery</SelectItem>
                            <SelectItem value="Net 15">Net 15 Days</SelectItem>
                            <SelectItem value="Net 30">Net 30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Routing */}
              <TabsContent value="routing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Production Routing</CardTitle>
                    <CardDescription>Select production workflow template</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Route Template</Label>
                      <Select 
                        value={form.watch('routeTemplateKey')}
                        onValueChange={(value) => form.setValue('routeTemplateKey', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-select default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SILK_OPTION_A">
                            Silkscreen Standard (Cut → Print → Sew)
                          </SelectItem>
                          <SelectItem value="SILK_OPTION_B">
                            <div className="flex items-center gap-2">
                              Silkscreen Alt (Cut → Sew → Print)
                              <Badge variant="destructive" className="text-xs">⚠️ Ashley Guarded</Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="SUBL_DEFAULT">
                            Sublimation Standard (GA → Print → Heat → Cut → Sew)
                          </SelectItem>
                          <SelectItem value="DTF_DEFAULT">
                            DTF Standard (Receive → DTF → QC)
                          </SelectItem>
                          <SelectItem value="EMB_DEFAULT">
                            Embroidery Standard (Cut → Emb → Sew)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes & Special Instructions</Label>
                      <Textarea
                        id="notes"
                        {...form.register('notes')}
                        rows={3}
                        placeholder="Enter any special requirements or notes..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Save as Draft
                  </Button>
                  <Button type="submit" disabled={loading} className="min-w-32">
                    {loading ? 'Creating...' : 'Create PO'}
                  </Button>
                </div>

                {form.formState.errors.root && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {form.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </form>
        </div>

        {/* Ashley AI Sidebar */}
        <div className="space-y-6">
          <AshleyInsights assessment={ashleyAssessment} />
          
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Total Quantity:</span>
                <span className="font-medium">{form.watch('total_qty') || 0} pcs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Method:</span>
                <span className="font-medium">{form.watch('method') || 'Not selected'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Estimated Value:</span>
                <span className="font-medium">
                  ₱{((form.watch('unitPrice') || 0) * (form.watch('total_qty') || 0)).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}