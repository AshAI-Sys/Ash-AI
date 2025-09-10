/**
 * ASH AI - Neural Order Details Page
 * Advanced order management with futuristic status dashboard
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Layout from '@/components/Layout'
import { OrderStatusDashboard } from '@/components/ash/OrderStatusDashboard'
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
  Share
} from 'lucide-react'

interface OrderDetails {
  id: string
  po_number: string
  status: string
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
      router.push('/auth/signin')
      return
    }
    
    fetchOrderDetails()
  }, [session, status, order_id, router])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ash/orders/${order_id}`)
      
      if (response.ok) {
        const data = await response.json()
        setOrderDetails(data.order)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch order details')
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
      <Layout>
        <div className="neural-bg min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="quantum-loader w-16 h-16 mx-auto mb-8">
              <div></div><div></div><div></div>
            </div>
            <h1 className="text-3xl font-bold glitch-text text-white mb-4" data-text="ASH AI">ASH AI</h1>
            <p className="text-cyan-300 font-medium">Loading Order Details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) return null

  if (error) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen p-8">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </Layout>
    )
  }

  if (!orderDetails) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen p-8">
          <div className="max-w-2xl mx-auto">
            <Alert className="bg-slate-800/20 border-cyan-500/30 backdrop-blur-sm">
              <Package className="h-4 w-4 text-cyan-400" />
              <AlertDescription className="text-cyan-200">Order not found</AlertDescription>
            </Alert>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 12 }).map((_, i) => (
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button 
                onClick={() => router.back()}
                className="neon-btn p-3"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-4">
                <div className="ai-orb w-12 h-12">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold glitch-text text-white" data-text={orderDetails.po_number}>{orderDetails.po_number}</h1>
                  <p className="text-cyan-300 mt-1">
                    {orderDetails.brand.name} • {orderDetails.client.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30 px-4 py-2"
              >
                {orderDetails.status}
              </Badge>
              <Button className="neon-btn-outline px-4 py-2">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button className="neon-btn-outline px-4 py-2">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Enhanced Order Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="quantum-card border-cyan-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">Quantity</span>
                </div>
                <div className="text-2xl font-bold text-white">{orderDetails.total_qty}</div>
                <div className="text-xs text-cyan-400">pieces</div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-purple-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Palette className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Method</span>
                </div>
                <div className="text-2xl font-bold text-white">{orderDetails.method}</div>
                <div className="text-xs text-purple-400">{orderDetails.product_type}</div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-green-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium text-green-300">Value</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  ₱{((orderDetails.commercials?.unitPrice || 0) * orderDetails.total_qty).toLocaleString()}
                </div>
                <div className="text-xs text-green-400">
                  ₱{orderDetails.commercials?.unitPrice || 0}/pc
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-orange-500/30">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">Delivery</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {new Date(orderDetails.target_delivery_date).toLocaleDateString()}
                </div>
                <div className="text-xs text-orange-400">
                  {Math.ceil((new Date(orderDetails.target_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="status" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 bg-slate-900/60 backdrop-blur-sm border border-cyan-500/30">
              <TabsTrigger 
                value="status" 
                className="flex items-center gap-2 text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <TrendingUp className="w-4 h-4" />
                Status & Progress
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="flex items-center gap-2 text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="design" 
                className="flex items-center gap-2 text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <Camera className="w-4 h-4" />
                Design
              </TabsTrigger>
              <TabsTrigger 
                value="ashley" 
                className="flex items-center gap-2 text-cyan-300 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-200"
              >
                <Brain className="w-4 h-4" />
                Ashley AI
              </TabsTrigger>
            </TabsList>

            {/* Enhanced Status Dashboard */}
            <TabsContent value="status">
              <OrderStatusDashboard order_id={order_id} />
            </TabsContent>

            {/* Enhanced Order Details */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card className="quantum-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Package className="w-5 h-5 mr-2 text-cyan-400" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-cyan-300">PO Number</p>
                        <p className="font-medium text-white">{orderDetails.po_number}</p>
                      </div>
                      <div>
                        <p className="text-cyan-300">Status</p>
                        <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-500/30">{orderDetails.status}</Badge>
                      </div>
                      <div>
                        <p className="text-cyan-300">Product Type</p>
                        <p className="font-medium text-white">{orderDetails.product_type}</p>
                      </div>
                      <div>
                        <p className="text-cyan-300">Method</p>
                        <p className="font-medium text-white">{orderDetails.method}</p>
                      </div>
                      <div>
                        <p className="text-cyan-300">Total Quantity</p>
                        <p className="font-medium text-white">{orderDetails.total_qty} pcs</p>
                      </div>
                      <div>
                        <p className="text-cyan-300">Delivery Date</p>
                        <p className="font-medium text-white">
                          {new Date(orderDetails.target_delivery_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Information */}
                <Card className="quantum-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <User className="w-5 h-5 mr-2 text-cyan-400" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-cyan-300">Client Name</p>
                        <p className="font-medium text-white">{orderDetails.client.name}</p>
                      </div>
                      {orderDetails.client.company && (
                        <div>
                          <p className="text-cyan-300">Company</p>
                          <p className="font-medium text-white">{orderDetails.client.company}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-cyan-300">Contact</p>
                        <p className="font-medium text-white">
                          {orderDetails.client.emails?.[0] || 'No email provided'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Size Breakdown */}
                <Card className="quantum-card">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Shirt className="w-5 h-5 mr-2 text-cyan-400" />
                      Size Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(orderDetails.size_curve).map(([size, qty]) => (
                        <div key={size} className="text-center p-3 bg-slate-800/30 border border-cyan-500/20 rounded backdrop-blur-sm">
                          <p className="text-xs text-cyan-400">{size}</p>
                          <p className="font-bold text-white text-lg">{qty}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Commercials */}
                {orderDetails.commercials && (
                  <Card className="quantum-card">
                    <CardHeader>
                      <CardTitle className="flex items-center text-white">
                        <DollarSign className="w-5 h-5 mr-2 text-cyan-400" />
                        Commercial Terms
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {orderDetails.commercials.unitPrice && (
                        <div className="flex justify-between">
                          <span className="text-cyan-300">Unit Price:</span>
                          <span className="font-medium text-white">
                            {orderDetails.commercials.currency || 'PHP'} {orderDetails.commercials.unitPrice}
                          </span>
                        </div>
                      )}
                      {orderDetails.commercials.depositPct && (
                        <div className="flex justify-between">
                          <span className="text-cyan-300">Deposit:</span>
                          <span className="font-medium text-white">{orderDetails.commercials.depositPct}%</span>
                        </div>
                      )}
                      {orderDetails.commercials.paymentTerms && (
                        <div className="flex justify-between">
                          <span className="text-cyan-300">Payment Terms:</span>
                          <span className="font-medium text-white">{orderDetails.commercials.paymentTerms}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-cyan-500/30">
                        <div className="flex justify-between">
                          <span className="text-cyan-300">Total Value:</span>
                          <span className="font-bold text-green-400">
                            ₱{((orderDetails.commercials.unitPrice || 0) * orderDetails.total_qty).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Enhanced Design Tab */}
            <TabsContent value="design">
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Camera className="w-5 h-5 mr-2 text-cyan-400" />
                    Design Assets & Approvals
                  </CardTitle>
                  <CardDescription className="text-cyan-300">
                    Design files, mockups, and approval workflow for this order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Design Files */}
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold">Design Files</h3>
                      <div className="text-center py-8 text-cyan-300 border-2 border-dashed border-cyan-500/30 rounded-lg">
                        <Camera className="w-8 h-8 mx-auto mb-3 opacity-50 text-cyan-400" />
                        <p className="text-white mb-2">No design files uploaded</p>
                        <p className="text-sm">Drag & drop or click to upload</p>
                        <Button className="neon-btn-outline mt-4">
                          Upload Files
                        </Button>
                      </div>
                    </div>

                    {/* Approval Workflow */}
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold">Approval Status</h3>
                      <div className="space-y-3">
                        {[
                          { stage: 'Initial Design', status: 'pending', user: 'Designer' },
                          { stage: 'Client Review', status: 'waiting', user: 'Client' },
                          { stage: 'Final Approval', status: 'waiting', user: 'Manager' }
                        ].map((approval, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800/20 border border-cyan-500/20 rounded">
                            <div>
                              <p className="text-white font-medium">{approval.stage}</p>
                              <p className="text-sm text-cyan-300">by {approval.user}</p>
                            </div>
                            <Badge 
                              className={
                                approval.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                approval.status === 'pending' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                'bg-gray-500/20 text-gray-300 border-gray-500/30'
                              }
                            >
                              {approval.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Enhanced Ashley AI Tab */}
            <TabsContent value="ashley">
              <Card className="quantum-card border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Brain className="w-5 h-5 mr-2 text-purple-400" />
                    Ashley AI Assessment
                  </CardTitle>
                  <CardDescription className="text-cyan-300">
                    AI-powered insights, risk assessment, and recommendations for this order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {orderDetails.ai_risk_assessment ? (
                    <div className="space-y-6">
                      {/* Risk Level */}
                      <div className="flex items-center justify-between p-4 bg-slate-800/30 border border-cyan-500/20 rounded-lg backdrop-blur-sm">
                        <div>
                          <h3 className="font-semibold text-white">Risk Assessment</h3>
                          <p className="text-sm text-cyan-300">
                            AI Confidence: {Math.round((orderDetails.ai_risk_assessment.confidence || 0) * 100)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={
                              orderDetails.ai_risk_assessment.risk === 'GREEN' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                              orderDetails.ai_risk_assessment.risk === 'AMBER' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                              'bg-red-500/20 text-red-300 border-red-500/30'
                            }
                          >
                            {orderDetails.ai_risk_assessment.risk} RISK
                          </Badge>
                          <p className="text-xs text-cyan-400 mt-1">Last updated 2h ago</p>
                        </div>
                      </div>

                      {/* Issues */}
                      {orderDetails.ai_risk_assessment.issues?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 text-white">Issues Detected</h3>
                          <div className="space-y-2">
                            {orderDetails.ai_risk_assessment.issues.map((issue: any, index: number) => (
                              <div key={index} className="flex items-start p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 mr-2" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-yellow-300">{issue.type}</p>
                                  <p className="text-sm text-cyan-200">{issue.details}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {orderDetails.ai_risk_assessment.recommendations?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 text-white">Ashley's Recommendations</h3>
                          <div className="space-y-2">
                            {orderDetails.ai_risk_assessment.recommendations.map((rec: any, index: number) => (
                              <div key={index} className="flex items-start p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 mr-2" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-blue-300">{rec.title}</p>
                                  <p className="text-sm text-cyan-200">{rec.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Actions */}
                      <div className="flex space-x-3">
                        <Button className="neon-btn">
                          <Brain className="w-4 h-4 mr-2" />
                          Re-analyze Order
                        </Button>
                        <Button className="neon-btn-outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-cyan-300">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50 text-purple-400" />
                      <p className="text-white mb-2">No Ashley AI assessment available</p>
                      <p className="text-sm mb-4">Assessment will be generated when order is processed</p>
                      <Button className="neon-btn">
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Assessment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}