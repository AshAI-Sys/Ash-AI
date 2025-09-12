// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Package, 
  User, 
  Building2, 
  Calendar, 
  DollarSign,
  Palette,
  Shirt,
  AlertTriangle,
  CheckCircle,
  Brain,
  FileText,
  Camera,
  Clock,
  TrendingUp,
  Settings,
  Edit,
  Download,
  Share,
  Eye,
  MapPin,
  Phone,
  Mail,
  Scissors,
  Image,
  Paperclip,
  Tag,
  Layers
} from 'lucide-react'

interface OrderDetails {
  id: string
  po_number: string
  status: string
  
  // Enhanced Order Information
  company_name?: string
  requested_deadline?: string
  
  // Product Details
  product_name?: string
  service_type?: string
  garment_type?: string
  fabric_type?: string
  fabric_colors?: string[]
  
  // Options (checkboxes)
  options?: {
    with_collar?: boolean
    with_cuffs?: boolean
    with_combi?: boolean
    with_bias_tape?: boolean
    with_side_slit?: boolean
    with_flatbed?: boolean
    with_buttons?: boolean
    with_zipper?: boolean
    with_linings?: boolean
    with_pangiti?: boolean
    sleeveless?: boolean
    longsleeves?: boolean
    three_quarter_sleeves?: boolean
    pocket?: boolean
    reversible?: boolean
    raglan?: boolean
    hooded?: boolean
    long_tee?: boolean
    kangaroo_pocket?: boolean
    with_batok?: boolean
  }
  
  // Design Info
  screen_printed?: boolean
  embroidered_sublim?: boolean
  size_label?: string
  
  // Files & Notes
  notes?: string
  estimated_quantity?: number
  images?: string[]
  attachments?: string[]
  
  // Legacy fields
  brand: {
    name: string
    code: string
  }
  client: {
    name: string
    company?: string
    emails: string[]
  }
  product_type: string
  method: string
  total_qty: number
  size_curve: Record<string, number>
  variants?: Array<{ color: string; qty: number }>
  target_delivery_date: string
  commercials?: {
    unitPrice?: number
    depositPct?: number
    paymentTerms?: string
    currency?: string
  }
  ai_risk_assessment?: {
    risk: string
    confidence: number
    issues: any[]
    recommendations: any[]
  }
  created_at: string
  updated_at: string
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const order_id = params.id as string

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchOrderDetails()
  }, [session, status, order_id, router])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${order_id}`)
      
      if (response.ok) {
        const data = await response.json()
        setOrderDetails(data.order)
      } else {
        // Mock data for development
        setOrderDetails({
          id: order_id,
          po_number: `ASH-2025-${order_id.slice(-6).toUpperCase()}`,
          status: 'IN_PRODUCTION',
          company_name: 'Premium Sportswear Co.',
          requested_deadline: '2025-09-20',
          product_name: 'Custom Team Jersey',
          service_type: 'Sew and Print / Embro',
          garment_type: 'Jersey',
          fabric_type: 'Dri-Fit',
          fabric_colors: ['Navy Blue', 'White', 'Red'],
          options: {
            with_collar: true,
            with_cuffs: false,
            sleeveless: false,
            longsleeves: true,
            pocket: true,
            with_buttons: false
          },
          screen_printed: true,
          embroidered_sublim: false,
          size_label: 'Print',
          notes: 'Team logo on chest, player numbers on back. Use team colors as specified.',
          estimated_quantity: 25,
          images: ['team-logo.png', 'jersey-mockup.jpg'],
          attachments: ['team-specs.pdf', 'logo-vector.ai'],
          brand: { name: 'Premium Sports', code: 'PSP' },
          client: { 
            name: 'Tigers Basketball Team', 
            company: 'Local Sports League',
            emails: ['coach@tigers.com'] 
          },
          product_type: 'Jersey',
          method: 'SILKSCREEN',
          total_qty: 25,
          size_curve: { S: 3, M: 8, L: 10, XL: 4 },
          target_delivery_date: '2025-09-20',
          commercials: {
            unitPrice: 850,
            depositPct: 50,
            paymentTerms: '50/50',
            currency: 'PHP'
          },
          created_at: '2025-09-01T10:00:00Z',
          updated_at: '2025-09-12T08:30:00Z'
        })
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
      setError('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ASH AI</h1>
          <p className="text-gray-600">Loading Order Details...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>Order not found</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Helper function to get enabled options
  const getEnabledOptions = () => {
    if (!orderDetails.options) return []
    return Object.entries(orderDetails.options)
      .filter(([key, value]) => value)
      .map(([key, value]) => ({
        key,
        label: key.split('_').map(word => 
          word === 'with' ? 'w/' : 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* TikTok-Style Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => router.back()}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Orders
                </Button>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{orderDetails.po_number}</h1>
                  <p className="text-gray-600">
                    {orderDetails.product_name} • {orderDetails.client.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge 
                  variant={orderDetails.status === 'DELIVERED' ? 'default' : 'secondary'}
                  className="px-3 py-1"
                >
                  {orderDetails.status.replace(/_/g, ' ')}
                </Badge>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* TikTok-Style Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{orderDetails.total_qty}</div>
              <div className="text-sm text-gray-600">Total Pieces</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">{orderDetails.method}</div>
              <div className="text-sm text-gray-600">{orderDetails.service_type}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                ₱{((orderDetails.commercials?.unitPrice || 0) * orderDetails.total_qty).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                ₱{orderDetails.commercials?.unitPrice || 0}/pc
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {new Date(orderDetails.target_delivery_date).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">
                {Math.ceil((new Date(orderDetails.target_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-1">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <FileText className="w-4 h-4 mr-2" />
                Order Details
              </TabsTrigger>
              <TabsTrigger value="product" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <Shirt className="w-4 h-4 mr-2" />
                Product Info
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <Camera className="w-4 h-4 mr-2" />
                Files & Design
              </TabsTrigger>
              <TabsTrigger value="status" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Production Status
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Enhanced Order Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Information */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">PO Number:</span>
                      <span className="font-medium text-gray-900">{orderDetails.po_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="secondary">{orderDetails.status.replace(/_/g, ' ')}</Badge>
                    </div>
                    {orderDetails.company_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Company:</span>
                        <span className="font-medium text-gray-900">{orderDetails.company_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Requested Deadline:</span>
                      <span className="font-medium text-gray-900">
                        {orderDetails.requested_deadline ? 
                          new Date(orderDetails.requested_deadline).toLocaleDateString() :
                          new Date(orderDetails.target_delivery_date).toLocaleDateString()
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(orderDetails.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(orderDetails.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client Name:</span>
                      <span className="font-medium text-gray-900">{orderDetails.client.name}</span>
                    </div>
                    {orderDetails.client.company && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Company:</span>
                        <span className="font-medium text-gray-900">{orderDetails.client.company}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contact:</span>
                      <span className="font-medium text-gray-900">
                        {orderDetails.client.emails?.[0] || 'No email provided'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span className="font-medium text-gray-900">
                        {orderDetails.brand.name} ({orderDetails.brand.code})
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Size Breakdown */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Layers className="w-5 h-5 mr-2 text-blue-600" />
                    Size Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(orderDetails.size_curve).map(([size, qty]) => (
                      <div key={size} className="text-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium">{size}</p>
                        <p className="font-bold text-gray-900 text-lg">{qty}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Commercial Terms */}
              {orderDetails.commercials && (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                      Commercial Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {orderDetails.commercials.unitPrice && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="font-medium text-gray-900">
                          {orderDetails.commercials.currency || 'PHP'} {orderDetails.commercials.unitPrice}
                        </span>
                      </div>
                    )}
                    {orderDetails.commercials.depositPct && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deposit:</span>
                        <span className="font-medium text-gray-900">{orderDetails.commercials.depositPct}%</span>
                      </div>
                    )}
                    {orderDetails.commercials.paymentTerms && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Terms:</span>
                        <span className="font-medium text-gray-900">{orderDetails.commercials.paymentTerms}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-bold text-green-600">
                          ₱{((orderDetails.commercials.unitPrice || 0) * orderDetails.total_qty).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Enhanced Product Information Tab */}
          <TabsContent value="product">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Details */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Shirt className="w-5 h-5 mr-2 text-blue-600" />
                    Product Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    {orderDetails.product_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Product Name:</span>
                        <span className="font-medium text-gray-900">{orderDetails.product_name}</span>
                      </div>
                    )}
                    {orderDetails.service_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Type:</span>
                        <span className="font-medium text-gray-900">{orderDetails.service_type}</span>
                      </div>
                    )}
                    {orderDetails.garment_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Garment Type:</span>
                        <span className="font-medium text-gray-900">{orderDetails.garment_type}</span>
                      </div>
                    )}
                    {orderDetails.fabric_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fabric Type:</span>
                        <span className="font-medium text-gray-900">{orderDetails.fabric_type}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Production Method:</span>
                      <span className="font-medium text-gray-900">{orderDetails.method}</span>
                    </div>
                    {orderDetails.estimated_quantity && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Quantity:</span>
                        <span className="font-medium text-gray-900">{orderDetails.estimated_quantity} pcs</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Fabric Colors */}
              {orderDetails.fabric_colors && orderDetails.fabric_colors.length > 0 && (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Palette className="w-5 h-5 mr-2 text-blue-600" />
                      Fabric Colors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {orderDetails.fabric_colors.map((color, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Design Information */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Tag className="w-5 h-5 mr-2 text-blue-600" />
                    Design Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Screen Printed:</span>
                      <Badge variant={orderDetails.screen_printed ? "default" : "secondary"}>
                        {orderDetails.screen_printed ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Embroidered/Sublimation:</span>
                      <Badge variant={orderDetails.embroidered_sublim ? "default" : "secondary"}>
                        {orderDetails.embroidered_sublim ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {orderDetails.size_label && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size Label:</span>
                        <span className="font-medium text-gray-900">{orderDetails.size_label}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Product Options */}
              {getEnabledOptions().length > 0 && (
                <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Settings className="w-5 h-5 mr-2 text-blue-600" />
                      Product Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {getEnabledOptions().map((option) => (
                        <Badge key={option.key} variant="outline" className="justify-center py-2">
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {orderDetails.notes && (
                <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      Order Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{orderDetails.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Files & Design Tab */}
          <TabsContent value="files">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Images */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Image className="w-5 h-5 mr-2 text-blue-600" />
                    Images ({orderDetails.images?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orderDetails.images && orderDetails.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {orderDetails.images.map((image, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg text-center">
                          <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-700 truncate">{image}</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No images uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attachments */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <Paperclip className="w-5 h-5 mr-2 text-blue-600" />
                    Attachments ({orderDetails.attachments?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orderDetails.attachments && orderDetails.attachments.length > 0 ? (
                    <div className="space-y-3">
                      {orderDetails.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{attachment}</span>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No attachments uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Production Status Tab */}
          <TabsContent value="status">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Production Status
                </CardTitle>
                <CardDescription>
                  Real-time production progress and milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Production Timeline */}
                  <div className="space-y-4">
                    {[
                      { stage: 'Order Confirmed', status: 'completed', date: '2025-09-01' },
                      { stage: 'Design Approved', status: 'completed', date: '2025-09-03' },
                      { stage: 'Cutting', status: 'completed', date: '2025-09-05' },
                      { stage: 'Printing', status: 'in_progress', date: '2025-09-07' },
                      { stage: 'Sewing', status: 'pending', date: '2025-09-10' },
                      { stage: 'Quality Control', status: 'pending', date: '2025-09-15' },
                      { stage: 'Packaging', status: 'pending', date: '2025-09-18' },
                      { stage: 'Delivery', status: 'pending', date: '2025-09-20' }
                    ].map((milestone, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <div className={`w-4 h-4 rounded-full ${
                          milestone.status === 'completed' ? 'bg-green-500' :
                          milestone.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{milestone.stage}</p>
                          <p className="text-sm text-gray-600">{milestone.date}</p>
                        </div>
                        <Badge 
                          variant={
                            milestone.status === 'completed' ? 'default' :
                            milestone.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }
                        >
                          {milestone.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}