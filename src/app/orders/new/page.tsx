'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  Save,
  Send,
  Upload,
  AlertTriangle,
  CheckCircle,
  Info,
  Calendar,
  Package,
  Palette,
  Ruler,
  DollarSign,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Brain,
  FileText,
  Image,
  Settings,
  ArrowLeft,
  Eye
} from 'lucide-react'

interface Client {
  id: string
  name: string
  company?: string
  emails: string[]
  phones: string[]
  billingAddress?: any
}

interface Brand {
  id: string
  name: string
  code: string
  settings: any
}

interface SizeCurve {
  [size: string]: number
}

interface Variant {
  color: string
  qty: number
}

interface OrderFormData {
  // Client & Brand
  clientId: string
  brandId: string
  channel?: string
  
  // Product & Design
  productType: string
  method: string
  designAssets?: File[]
  
  // Quantities & Size Curve
  totalQty: number
  sizeCurve: SizeCurve
  variants: Variant[]
  addons: string[]
  
  // Dates & SLAs
  targetDeliveryDate: string
  
  // Commercials
  unitPrice: number
  depositPercentage: number
  paymentTerms: string
  taxMode: string
  currency: string
  
  // Route
  routeTemplateKey: string
  
  // Files & Notes
  attachments: File[]
  notes: string
}

// Remove hardcoded data - fetch from API instead

const productTypes = ['Tee', 'Hoodie', 'Jersey', 'Uniform', 'Custom']
const methods = ['Silkscreen', 'Sublimation', 'DTF', 'Embroidery']
const channels = ['Direct', 'CSR', 'Shopee', 'TikTok', 'Lazada']
const routeTemplates = {
  'SILK_OPTION_A': 'Cut → Print → Sew → QC → Pack (Default)',
  'SILK_OPTION_B': 'Cut → Sew → Print → QC → Pack (Ashley Guarded)',
  'SUBLIMATION_DEFAULT': 'GA → Print → Heat Press → Cut → Sew → QC → Pack',
  'DTF_DEFAULT': 'Receive Plain Tee → DTF → QC → Pack',
  'EMBROIDERY_DEFAULT': 'Cut → Emb → Sew → QC → Pack'
}

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export default function NewOrderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [ashleyValidation, setAshleyValidation] = useState<any>(null)
  const [validationLoading, setValidationLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const [formData, setFormData] = useState<OrderFormData>({
    clientId: '',
    brandId: '',
    channel: '',
    productType: '',
    method: '',
    totalQty: 0,
    sizeCurve: {},
    variants: [],
    addons: [],
    targetDeliveryDate: '',
    unitPrice: 0,
    depositPercentage: 50,
    paymentTerms: '50/50',
    taxMode: 'VAT_INCLUSIVE',
    currency: 'PHP',
    routeTemplateKey: '',
    attachments: [],
    notes: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // Fetch clients and brands securely from API
    fetchInitialData()
  }, [session, status, router])

  const fetchInitialData = async () => {
    try {
      setLoadingData(true)
      const [clientsRes, brandsRes] = await Promise.all([
        fetch('/api/clients', { 
          headers: { 'Authorization': `Bearer ${session?.user?.accessToken || ''}` }
        }),
        fetch('/api/brands', {
          headers: { 'Authorization': `Bearer ${session?.user?.accessToken || ''}` }
        })
      ])

      if (clientsRes.ok && brandsRes.ok) {
        const clientsData = await clientsRes.json()
        const brandsData = await brandsRes.json()
        
        setClients(clientsData.clients || [])
        setBrands(brandsData.brands || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // Don't expose error details to user
    } finally {
      setLoadingData(false)
    }
  }

  // Auto-select default route when method changes
  useEffect(() => {
    if (formData.method) {
      let defaultRoute = ''
      switch (formData.method) {
        case 'Silkscreen':
          defaultRoute = 'SILK_OPTION_A'
          break
        case 'Sublimation':
          defaultRoute = 'SUBLIMATION_DEFAULT'
          break
        case 'DTF':
          defaultRoute = 'DTF_DEFAULT'
          break
        case 'Embroidery':
          defaultRoute = 'EMBROIDERY_DEFAULT'
          break
      }
      setFormData(prev => ({ ...prev, routeTemplateKey: defaultRoute }))
    }
  }, [formData.method])

  // Validate size curve totals
  const sizeCurveValid = Object.values(formData.sizeCurve).reduce((sum, qty) => sum + qty, 0) === formData.totalQty

  // Ashley AI Validation
  const runAshleyValidation = async () => {
    setValidationLoading(true)
    
    // Simulate AI validation
    setTimeout(() => {
      const validation = {
        risk: 'AMBER',
        issues: [
          {
            type: 'CAPACITY',
            workcenter: 'PRINTING',
            details: '+18% over capacity in week of Sep 15',
            severity: 'WARNING'
          },
          {
            type: 'STOCK',
            item: 'Black Fabric 240gsm',
            shortBy: '28 kg',
            action: 'PR_DRAFTED',
            severity: 'INFO'
          }
        ],
        advice: [
          'Split run: 300 pcs this week, 150 next',
          'Consider subcontracting printing for 2 days'
        ],
        assumptions: {
          printingRatePcsPerHr: 55,
          utilization: 0.8
        }
      }
      
      setAshleyValidation(validation)
      setValidationLoading(false)
    }, 2000)
  }

  const handleSubmit = async (action: 'draft' | 'create' | 'send') => {
    setIsLoading(true)
    
    // Validate form
    if (!formData.clientId || !formData.brandId || !formData.productType || !formData.method) {
      alert('Please fill in all required fields')
      setIsLoading(false)
      return
    }
    
    if (!sizeCurveValid) {
      alert('Size curve quantities must equal total quantity')
      setIsLoading(false)
      return
    }

    try {
      // In production, this would call the actual API
      const response = await fetch('/api/ash/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          ...formData,
          action
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Order ${result.po_number} ${action === 'draft' ? 'saved as draft' : action === 'create' ? 'created successfully' : 'created and sent to client'}!`)
        router.push('/orders')
      } else {
        throw new Error('Failed to create order')
      }
    } catch (error) {
      alert('Error creating order: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSizeCurveChange = (size: string, qty: string) => {
    const quantity = parseInt(qty) || 0
    setFormData(prev => ({
      ...prev,
      sizeCurve: {
        ...prev.sizeCurve,
        [size]: quantity
      }
    }))
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="neural-bg min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="quantum-loader w-16 h-16 mx-auto mb-8">
              <div></div><div></div><div></div>
            </div>
            <h1 className="text-3xl font-bold glitch-text text-white mb-4" data-text="ASH AI">ASH AI</h1>
            <p className="text-cyan-300 font-medium">Initializing Neural Order System...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) return null

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 p-8 space-y-8">
        {/* Neural Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.back()}
              className="neon-btn p-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center space-x-4">
                <div className="ai-orb w-12 h-12">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold glitch-text text-white" data-text="Neural Order Creation">Neural Order Creation</h1>
              </div>
              <p className="text-cyan-300 mt-2 ml-16">Advanced AI-powered order intake system</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={runAshleyValidation}
              disabled={validationLoading}
              className="neon-btn hover:scale-105 transition-all duration-300"
            >
              {validationLoading ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Ashley Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Ashley AI Validate
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Client & Brand */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-white">
                  <Users className="w-6 h-6 mr-3 text-cyan-400" />
                  Client & Brand
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Client *</Label>
                    <div className="flex space-x-2">
                      <select
                        value={formData.clientId}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                        className="cyber-select flex-1"
                        required
                      >
                        <option value="">Select client...</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name} {client.company && `(${client.company})`}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        onClick={() => setShowClientModal(true)}
                        className="neon-btn px-4"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Brand *</Label>
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData(prev => ({ ...prev, brandId: e.target.value }))}
                      className="cyber-select w-full"
                      required
                    >
                      <option value="">Select brand...</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name} ({brand.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Channel</Label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData(prev => ({ ...prev, channel: e.target.value }))}
                    className="cyber-select w-full md:w-1/2"
                  >
                    <option value="">Select channel...</option>
                    {channels.map(channel => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Product & Design */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-white">
                  <Package className="w-6 h-6 mr-3 text-cyan-400" />
                  Product & Design
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Product Type *</Label>
                    <select
                      value={formData.productType}
                      onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value }))}
                      className="cyber-select w-full"
                      required
                    >
                      <option value="">Select product type...</option>
                      {productTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Method *</Label>
                    <select
                      value={formData.method}
                      onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="cyber-select w-full"
                      required
                    >
                      <option value="">Select method...</option>
                      {methods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Design Assets</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-cyan-500/30 rounded-xl cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 transition-all duration-300 backdrop-blur-sm">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-cyan-400" />
                        <p className="mb-2 text-sm text-cyan-200">
                          <span className="font-semibold">Click to upload</span> design files
                        </p>
                        <p className="text-xs text-cyan-400">PNG, JPG, AI, PDF (MAX. 10MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept=".png,.jpg,.jpeg,.ai,.pdf"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          // Basic client-side validation
                          const validFiles = files.filter(file => {
                            const maxSize = 10 * 1024 * 1024 // 10MB
                            const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
                            
                            if (file.size > maxSize) {
                              alert(`File ${file.name} is too large. Maximum size is 10MB.`)
                              return false
                            }
                            
                            if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.ai')) {
                              alert(`File ${file.name} is not an allowed type. Only PNG, JPG, PDF, and AI files are allowed.`)
                              return false
                            }
                            
                            return true
                          })
                          
                          if (validFiles.length > 0) {
                            setFormData(prev => ({ 
                              ...prev, 
                              attachments: [...prev.attachments, ...validFiles] 
                            }))
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantities & Size Curve */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-white">
                  <Ruler className="w-6 h-6 mr-3 text-cyan-400" />
                  Quantities & Size Curve
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Total Quantity *</Label>
                  <Input
                    type="number"
                    value={formData.totalQty}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalQty: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter total quantity"
                    className="cyber-input w-full md:w-1/2"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Size Curve *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {standardSizes.map(size => (
                      <div key={size} className="text-center">
                        <Label className="text-xs font-medium text-cyan-400 mb-1 block">{size}</Label>
                        <Input
                          type="number"
                          value={formData.sizeCurve[size] || ''}
                          onChange={(e) => handleSizeCurveChange(size, e.target.value)}
                          placeholder="0"
                          className="cyber-input text-center text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center space-x-4">
                    <span className="text-sm text-cyan-300">
                      Total: {Object.values(formData.sizeCurve).reduce((sum, qty) => sum + qty, 0)} pieces
                    </span>
                    {!sizeCurveValid && formData.totalQty > 0 && (
                      <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-300 border-red-500/30">
                        Size curve must equal total quantity
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commercials */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-white">
                  <DollarSign className="w-6 h-6 mr-3 text-cyan-400" />
                  Commercials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Unit Price (PHP)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="cyber-input"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Deposit %</Label>
                    <Input
                      type="number"
                      value={formData.depositPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, depositPercentage: parseInt(e.target.value) || 0 }))}
                      placeholder="50"
                      className="cyber-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Payment Terms</Label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                      className="cyber-select w-full"
                    >
                      <option value="50/50">50/50</option>
                      <option value="net 15">Net 15</option>
                      <option value="net 30">Net 30</option>
                      <option value="100% advance">100% Advance</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Tax Mode</Label>
                    <select
                      value={formData.taxMode}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxMode: e.target.value }))}
                      className="cyber-select w-full"
                    >
                      <option value="VAT_INCLUSIVE">VAT Inclusive</option>
                      <option value="VAT_EXCLUSIVE">VAT Exclusive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Target Delivery Date *</Label>
                  <Input
                    type="date"
                    value={formData.targetDeliveryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetDeliveryDate: e.target.value }))}
                    className="cyber-input w-full md:w-1/2"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Production Route */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-white">
                  <Settings className="w-6 h-6 mr-3 text-cyan-400" />
                  Production Route
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Route Template</Label>
                  <select
                    value={formData.routeTemplateKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, routeTemplateKey: e.target.value }))}
                    className="cyber-select w-full"
                  >
                    <option value="">Select route template...</option>
                    {Object.entries(routeTemplates).map(([key, description]) => (
                      <option key={key} value={key}>{description}</option>
                    ))}
                  </select>
                </div>
                <Button variant="outline" className="neon-btn-outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize Route
                </Button>
              </CardContent>
            </Card>

            {/* Files & Notes */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl text-white">
                  <FileText className="w-6 h-6 mr-3 text-cyan-400" />
                  Files & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-cyan-300 mb-2 block">Notes & Special Instructions</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any special instructions, client requirements, or notes..."
                    className="cyber-input min-h-[100px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Ashley AI Validation */}
            {ashleyValidation && (
              <Card className="quantum-card border-purple-500/30">
                <CardHeader className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 backdrop-blur-sm">
                  <CardTitle className="flex items-center text-lg text-white">
                    <Brain className="w-5 h-5 mr-3 text-purple-300" />
                    Ashley AI Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      ashleyValidation.risk === 'GREEN' ? 'bg-green-400 animate-pulse' : 
                      ashleyValidation.risk === 'AMBER' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400 animate-pulse'
                    }`}></div>
                    <span className="font-semibold text-cyan-200">Risk Level: {ashleyValidation.risk}</span>
                  </div>
                  
                  {ashleyValidation.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-cyan-300">Issues Detected:</h4>
                      {ashleyValidation.issues.map((issue: any, idx: number) => (
                        <div key={idx} className="text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 backdrop-blur-sm">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                            <div>
                              <span className="font-medium text-yellow-300">{issue.type}:</span>
                              <p className="text-cyan-200 mt-1">{issue.details}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {ashleyValidation.advice.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-cyan-300">Recommendations:</h4>
                      {ashleyValidation.advice.map((advice: string, idx: number) => (
                        <div key={idx} className="text-sm bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 backdrop-blur-sm">
                          <div className="flex items-start space-x-2">
                            <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                            <p className="text-cyan-200">{advice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            <Card className="quantum-card border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-white">
                  <Eye className="w-5 h-5 mr-3 text-green-400" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Total Quantity:</span>
                    <span className="font-semibold text-white">{formData.totalQty} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Unit Price:</span>
                    <span className="font-semibold text-white">₱{formData.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300">Subtotal:</span>
                    <span className="font-semibold text-white">₱{(formData.totalQty * formData.unitPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-cyan-500/30 pt-2">
                    <span className="text-cyan-300">Deposit ({formData.depositPercentage}%):</span>
                    <span className="font-bold text-green-400">
                      ₱{((formData.totalQty * formData.unitPrice) * (formData.depositPercentage / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handleSubmit('send')}
                disabled={isLoading || !sizeCurveValid}
                className="neon-btn w-full py-3 font-semibold"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create & Send to Client
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleSubmit('create')}
                disabled={isLoading || !sizeCurveValid}
                className="neon-btn-outline w-full py-3 font-semibold"
              >
                <Package className="w-4 h-4 mr-2" />
                Create PO
              </Button>
              
              <Button
                onClick={() => handleSubmit('draft')}
                disabled={isLoading}
                className="neon-btn-ghost w-full py-3 font-semibold"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  )
}