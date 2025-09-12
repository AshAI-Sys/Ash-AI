// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft,
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
  Eye,
  X,
  Clock
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

interface OrderFormData {
  // Order Information
  client_id: string
  company_name: string
  requested_deadline: string
  
  // Product Details
  product_name: string
  service_type: string
  garment_type: string
  fabric_type: string
  fabric_colors: string[]
  
  // Options (checkboxes)
  options: {
    with_collar: boolean
    with_cuffs: boolean
    with_combi: boolean
    with_bias_tape: boolean
    with_side_slit: boolean
    with_flatbed: boolean
    with_buttons: boolean
    with_zipper: boolean
    with_linings: boolean
    with_pangiti: boolean
    sleeveless: boolean
    longsleeves: boolean
    three_quarter_sleeves: boolean
    pocket: boolean
    reversible: boolean
    raglan: boolean
    hooded: boolean
    long_tee: boolean
    kangaroo_pocket: boolean
    with_batok: boolean
  }
  
  // Design Info
  screen_printed: boolean
  embroidered_sublim: boolean
  size_label: string
  
  // Notes
  notes: string
  
  // Quantity & Files
  estimated_quantity: number
  images: File[]
  attachments: File[]
  
  // Legacy fields (for compatibility)
  brand_id: string
  channel: string
  product_type: string
  method: string
  total_qty: number
  target_delivery_date: string
  unitPrice: number
  depositPercentage: number
  paymentTerms: string
  taxMode: string
  currency: string
}

// Sample data
const clients = [
  { id: '1', name: 'Premium Apparel Co.', company: 'Premium Apparel', emails: ['contact@premium.com'], phones: ['+63 912 345 6789'] },
  { id: '2', name: 'Fashion Forward Ltd.', company: 'Fashion Forward', emails: ['info@fashionforward.com'], phones: ['+63 917 888 9999'] },
  { id: '3', name: 'Urban Style Boutique', company: 'Urban Style', emails: ['orders@urbanstyle.ph'], phones: ['+63 918 777 8888'] }
]

const garmentTypes = [
  'Tee', 'Polo Shirt', 'Hoodie', 'Jersey', 'Uniform', 'Tank Top', 'Long Sleeve', 'Jacket', 'Dress', 'Custom'
]

const fabricTypes = [
  'Cotton 100%', 'Cotton Blend', 'Polyester', 'Cotton-Polyester', 'Bamboo', 'Linen', 'Dri-Fit', 'Jersey Knit', 'French Terry', 'Custom'
]

const colorOptions = [
  'White', 'Black', 'Navy Blue', 'Royal Blue', 'Red', 'Maroon', 'Green', 'Gray', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Beige'
]

export default function NewOrderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  const [formData, setFormData] = useState<OrderFormData>({
    // Order Information
    client_id: '',
    company_name: '',
    requested_deadline: '',
    
    // Product Details
    product_name: '',
    service_type: '',
    garment_type: '',
    fabric_type: '',
    fabric_colors: [],
    
    // Options
    options: {
      with_collar: false,
      with_cuffs: false,
      with_combi: false,
      with_bias_tape: false,
      with_side_slit: false,
      with_flatbed: false,
      with_buttons: false,
      with_zipper: false,
      with_linings: false,
      with_pangiti: false,
      sleeveless: false,
      longsleeves: false,
      three_quarter_sleeves: false,
      pocket: false,
      reversible: false,
      raglan: false,
      hooded: false,
      long_tee: false,
      kangaroo_pocket: false,
      with_batok: false
    },
    
    // Design Info
    screen_printed: false,
    embroidered_sublim: false,
    size_label: '',
    
    // Notes
    notes: '',
    
    // Quantity & Files
    estimated_quantity: 0,
    images: [],
    attachments: [],
    
    // Legacy fields
    brand_id: '1',
    channel: 'Direct',
    product_type: '',
    method: 'SILKSCREEN',
    total_qty: 0,
    target_delivery_date: '',
    unitPrice: 0,
    depositPercentage: 50,
    paymentTerms: '50/50',
    taxMode: 'VAT_INCLUSIVE',
    currency: 'PHP'
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    // Auto-sync estimated quantity with total quantity
    if (formData.estimated_quantity > 0) {
      setFormData(prev => ({ 
        ...prev, 
        total_qty: prev.estimated_quantity,
        product_type: prev.garment_type
      }))
    }
  }, [session, status, router, formData.estimated_quantity, formData.garment_type])

  // Validation function
  const validateForm = (): string[] => {
    const errors: string[] = []
    
    if (!formData.client_id) errors.push("Client is required")
    if (!formData.product_name) errors.push("Product name is required")
    if (!formData.service_type) errors.push("Service type is required")
    if (!formData.garment_type) errors.push("Garment type is required")
    if (!formData.fabric_type) errors.push("Fabric type is required")
    if (formData.fabric_colors.length === 0) errors.push("At least one fabric color is required")
    if (!formData.screen_printed && !formData.embroidered_sublim) errors.push("At least one Design Info option must be selected")
    if (formData.estimated_quantity <= 0) errors.push("Quantity must be greater than 0")
    if (!formData.requested_deadline) errors.push("Requested deadline is required")
    
    // Check if deadline is at least 4 working days from today
    if (formData.requested_deadline) {
      const deadlineDate = new Date(formData.requested_deadline)
      const today = new Date()
      const workingDaysLater = new Date(today)
      workingDaysLater.setDate(today.getDate() + 4)
      
      if (deadlineDate < workingDaysLater) {
        errors.push("Deadline cannot be earlier than today + 4 working days")
      }
    }
    
    return errors
  }

  const handleFabricColorToggle = (color: string) => {
    setFormData(prev => ({
      ...prev,
      fabric_colors: prev.fabric_colors.includes(color)
        ? prev.fabric_colors.filter(c => c !== color)
        : [...prev.fabric_colors, color]
    }))
  }

  const handleOptionToggle = (option: keyof typeof formData.options) => {
    setFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [option]: !prev.options[option]
      }
    }))
  }

  const handleFileUpload = (files: FileList | null, type: 'images' | 'attachments') => {
    if (!files) return
    
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    
    fileArray.forEach(file => {
      if (type === 'images') {
        if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
          validFiles.push(file)
        } else {
          alert(`Image ${file.name} is invalid. Only images under 10MB are allowed.`)
        }
      } else {
        const allowedTypes = ['application/pdf', 'application/illustrator', 'application/photoshop', 'application/zip']
        const allowedExtensions = ['.pdf', '.ai', '.psd', '.zip']
        const isValidType = allowedTypes.includes(file.type) || 
                          allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        
        if (isValidType && file.size <= 50 * 1024 * 1024) {
          validFiles.push(file)
        } else {
          alert(`File ${file.name} is invalid. Only PDF, AI, PSD, ZIP files under 50MB are allowed.`)
        }
      }
    })
    
    if (type === 'images' && formData.images.length + validFiles.length > 10) {
      alert('Maximum 10 images allowed')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...validFiles]
    }))
  }

  const removeFile = (index: number, type: 'images' | 'attachments') => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (action: 'draft' | 'create' | 'send') => {
    const errors = validateForm()
    
    if (errors.length > 0 && action !== 'draft') {
      setValidationErrors(errors)
      return
    }
    
    setValidationErrors([])
    setIsLoading(true)
    
    try {
      // Prepare form data for submission
      const submitData = {
        ...formData,
        target_delivery_date: formData.requested_deadline,
        action
      }
      
      // In a real implementation, this would call the API
      setTimeout(() => {
        alert(`Order ${action === 'draft' ? 'saved as draft' : action === 'create' ? 'created successfully' : 'created and sent to client'}!`)
        router.push('/orders')
      }, 2000)
      
    } catch (error) {
      alert('Error creating order: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ASH AI</h1>
          <p className="text-gray-600">Loading Order System...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* TikTok-Style Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => router.back()}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Add New Order</h1>
                  <p className="text-gray-600">Create a new production order</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card className="bg-red-50 border-red-200 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Please fix the following errors:</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Order Information */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Client <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select client...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} {client.company && `(${client.company})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Clothing/Company</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter clothing/company name"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    Requested Deadline <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.requested_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, requested_deadline: e.target.value }))}
                    className="w-full md:w-1/2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 4 working days from today
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="Enter product name"
                    className="w-full"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Service Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2">
                    {['Sew and Print / Embro', 'Sew Only', 'Print / Embro Only'].map(service => (
                      <label key={service} className="flex items-center">
                        <input
                          type="radio"
                          name="service_type"
                          value={service}
                          checked={formData.service_type === service}
                          onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Garment Type <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={formData.garment_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, garment_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select garment type...</option>
                      {garmentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">
                      Fabric Type <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={formData.fabric_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, fabric_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select fabric type...</option>
                      {fabricTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Fabric Colors <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {colorOptions.map(color => (
                      <label key={color} className="flex items-center space-x-2">
                        <Checkbox
                          checked={formData.fabric_colors.includes(color)}
                          onCheckedChange={() => handleFabricColorToggle(color)}
                        />
                        <span className="text-sm text-gray-700">{color}</span>
                      </label>
                    ))}
                  </div>
                  {formData.fabric_colors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.fabric_colors.map(color => (
                        <Badge key={color} variant="secondary" className="text-xs">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  Options
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries({
                    with_collar: 'w/ Collar',
                    with_cuffs: 'w/ Cuffs',
                    with_combi: 'w/ Combi',
                    with_bias_tape: 'w/ Bias Tape',
                    with_side_slit: 'w/ Side Slit',
                    with_flatbed: 'w/ Flatbed',
                    with_buttons: 'w/ Buttons',
                    with_zipper: 'w/ Zipper',
                    with_linings: 'w/ Linings',
                    with_pangiti: 'w/ Pangiti',
                    sleeveless: 'Sleeveless',
                    longsleeves: 'Longsleeves',
                    three_quarter_sleeves: '3/4 Sleeves',
                    pocket: 'Pocket',
                    reversible: 'Reversible',
                    raglan: 'Raglan',
                    hooded: 'Hooded',
                    long_tee: 'Long Tee',
                    kangaroo_pocket: 'Kangaroo Pocket',
                    with_batok: 'w/ Batok'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.options[key as keyof typeof formData.options]}
                        onCheckedChange={() => handleOptionToggle(key as keyof typeof formData.options)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Design Info */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <Palette className="w-5 h-5 mr-2 text-blue-600" />
                  Design Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.screen_printed}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, screen_printed: !!checked }))}
                    />
                    <span className="text-sm text-gray-700">Screen Printed</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.embroidered_sublim}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, embroidered_sublim: !!checked }))}
                    />
                    <span className="text-sm text-gray-700">Embroidered / Sublimation</span>
                  </label>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Size Label</Label>
                  <div className="space-y-2">
                    {['Sew', 'Print', 'None'].map(option => (
                      <label key={option} className="flex items-center">
                        <input
                          type="radio"
                          name="size_label"
                          value={option}
                          checked={formData.size_label === option}
                          onChange={(e) => setFormData(prev => ({ ...prev, size_label: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter notes, remarks, or other options..."
                  className="w-full min-h-[100px] resize-none"
                />
              </CardContent>
            </Card>

            {/* Quantity & Files */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <Ruler className="w-5 h-5 mr-2 text-blue-600" />
                  Quantity & Files
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    Estimated Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.estimated_quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter estimated quantity"
                    className="w-full md:w-1/2"
                    min="1"
                    required
                  />
                </div>
                
                {/* Upload Images */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Upload Images <span className="text-gray-500">(max 10)</span>
                  </Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Image className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> images
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG (MAX. 10MB each)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files, 'images')}
                      />
                    </label>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.images.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index, 'images')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Attach Files */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Attach Files</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> files
                        </p>
                        <p className="text-xs text-gray-500">PDF, AI, PSD, ZIP (MAX. 50MB each)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept=".pdf,.ai,.psd,.zip"
                        onChange={(e) => handleFileUpload(e.target.files, 'attachments')}
                      />
                    </label>
                  </div>
                  
                  {formData.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index, 'attachments')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <Eye className="w-5 h-5 mr-2 text-blue-600" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium text-gray-900">{formData.product_name || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Garment Type:</span>
                    <span className="font-medium text-gray-900">{formData.garment_type || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Type:</span>
                    <span className="font-medium text-gray-900">{formData.service_type || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium text-gray-900">{formData.estimated_quantity || 0} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Colors:</span>
                    <span className="font-medium text-gray-900">{formData.fabric_colors.length} colors</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Images:</span>
                    <span className="font-medium text-gray-900">{formData.images.length} files</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attachments:</span>
                    <span className="font-medium text-gray-900">{formData.attachments.length} files</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handleSubmit('send')}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
                disabled={isLoading}
                variant="outline"
                className="w-full py-3 font-semibold"
              >
                <Package className="w-4 h-4 mr-2" />
                Create Order
              </Button>
              
              <Button
                onClick={() => handleSubmit('draft')}
                disabled={isLoading}
                variant="ghost"
                className="w-full py-3 font-semibold"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}