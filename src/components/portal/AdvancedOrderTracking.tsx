// @ts-nocheck
'use client'

// 📱 ASH AI - Advanced Client Portal Order Tracking
// Real-time production tracking with interactive timeline

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Truck, 
  Scissors, 
  Palette, 
  Zap, 
  Eye,
  MessageCircle,
  Download,
  Star,
  MapPin,
  Camera,
  Play,
  Pause
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useWebSocket } from '@/lib/hooks/useWebSocket'

interface ProductionStage {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold'
  startedAt?: Date
  completedAt?: Date
  estimatedDuration: number // minutes
  actualDuration?: number
  quality?: {
    score: number
    issues: string[]
  }
  operator?: {
    name: string
    avatar?: string
  }
  photos?: string[]
  notes?: string
}

interface Order {
  id: string
  orderNumber: string
  productType: string
  quantity: number
  status: string
  progress: number
  estimatedCompletion: Date
  stages: ProductionStage[]
  client: {
    name: string
    email: string
  }
  design: {
    id: string
    mockupUrl: string
    approved: boolean
  }
  tracking: {
    currentStage: string
    location: string
    lastUpdate: Date
  }
}

interface AdvancedOrderTrackingProps {
  order_id: string
}

export function AdvancedOrderTracking({ order_id }: AdvancedOrderTrackingProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [showPhotos, setShowPhotos] = useState(false)
  
  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
    onMessage: (message) => {
      if (message.type === 'order_update' && message.data.order_id === order_id) {
        updateOrderStatus(message.data)
      }
    }
  })

  useEffect(() => {
    loadOrderData()
  }, [order_id])

  const loadOrderData = async () => {
    try {
      const response = await fetch(`/api/portal/orders/${order_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('portal_token')}`
        }
      })
      
      if (response.ok) {
        const orderData = await response.json()
        setOrder(orderData)
        if (orderData.stages.length > 0) {
          setSelectedStage(orderData.stages[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load order data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateOrderStatus = (updateData: any) => {
    setOrder(prev => {
      if (!prev) return prev
      
      return {
        ...prev,
        status: updateData.status || prev.status,
        progress: updateData.progress || prev.progress,
        stages: prev.stages.map(stage => 
          stage.id === updateData.stageId 
            ? { ...stage, ...updateData.stageUpdate }
            : stage
        ),
        tracking: {
          ...prev.tracking,
          ...updateData.tracking,
          lastUpdate: new Date()
        }
      }
    })
  }

  const getStageIcon = (stageName: string) => {
    const iconMap: Record<string, any> = {
      'design': Palette,
      'cutting': Scissors,
      'printing': Zap,
      'sewing': Package,
      'qc': CheckCircle,
      'packing': Package,
      'delivery': Truck
    }
    
    const IconComponent = iconMap[stageName.toLowerCase()] || Package
    return <IconComponent className="h-5 w-5" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'in_progress':
        return 'text-blue-600 bg-blue-100'
      case 'on_hold':
        return 'text-yellow-600 bg-yellow-100'
      case 'pending':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const calculateStageProgress = (stage: ProductionStage) => {
    if (stage.status === 'completed') return 100
    if (stage.status === 'pending') return 0
    
    // For in-progress stages, estimate based on time
    if (stage.startedAt) {
      const elapsed = Date.now() - new Date(stage.startedAt).getTime()
      const elapsedMinutes = elapsed / (1000 * 60)
      return Math.min(95, (elapsedMinutes / stage.estimatedDuration) * 100)
    }
    
    return 0
  }

  const downloadReport = async () => {
    try {
      const response = await fetch(`/api/portal/orders/${order_id}/report`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('portal_token')}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Order_${order?.orderNumber}_Report.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Order not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Order #{order.orderNumber}
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {order.quantity}x {order.productType}
              </CardDescription>
            </div>
            
            <div className="text-right">
              <Badge className={getStatusColor(order.status)} variant="outline">
                {order.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <div className="text-sm text-gray-600 mt-2">
                {isConnected && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Live Tracking Active
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Overall Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{Math.round(order.progress)}% Complete</span>
            </div>
            <Progress value={order.progress} className="h-3" />
            <div className="flex justify-between text-sm mt-2 text-gray-600">
              <span>Started: {format(new Date(order.stages[0]?.startedAt || new Date()), 'MMM dd, yyyy')}</span>
              <span>Est. Completion: {format(order.estimatedCompletion, 'MMM dd, yyyy')}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tracking Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="timeline">Production Timeline</TabsTrigger>
            <TabsTrigger value="details">Stage Details</TabsTrigger>
            <TabsTrigger value="quality">Quality Reports</TabsTrigger>
            <TabsTrigger value="photos">Progress Photos</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button variant="outline" onClick={() => setShowPhotos(true)}>
              <Camera className="h-4 w-4 mr-2" />
              View Photos
            </Button>
          </div>
        </div>

        {/* Timeline View */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Production Timeline</CardTitle>
              <CardDescription>
                Real-time progress through each production stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {order.stages.map((stage, index) => (
                  <div key={stage.id} className="relative">
                    {/* Timeline connector */}
                    {index < order.stages.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Stage Icon */}
                      <div className={`
                        flex items-center justify-center w-12 h-12 rounded-full border-2
                        ${stage.status === 'completed' ? 'bg-green-100 border-green-300 text-green-600' :
                          stage.status === 'in_progress' ? 'bg-blue-100 border-blue-300 text-blue-600' :
                          stage.status === 'on_hold' ? 'bg-yellow-100 border-yellow-300 text-yellow-600' :
                          'bg-gray-100 border-gray-300 text-gray-400'}
                      `}>
                        {stage.status === 'completed' ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : stage.status === 'in_progress' ? (
                          getStageIcon(stage.name)
                        ) : (
                          <Clock className="h-6 w-6" />
                        )}
                      </div>
                      
                      {/* Stage Content */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-lg">{stage.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Badge className={getStatusColor(stage.status)} variant="outline">
                                {stage.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              {stage.operator && (
                                <span>by {stage.operator.name}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-gray-600">
                            {stage.startedAt && (
                              <div>Started: {format(new Date(stage.startedAt), 'MMM dd, HH:mm')}</div>
                            )}
                            {stage.completedAt && (
                              <div>Completed: {format(new Date(stage.completedAt), 'MMM dd, HH:mm')}</div>
                            )}
                            {stage.status === 'in_progress' && stage.startedAt && (
                              <div>
                                Running for: {formatDistanceToNow(new Date(stage.startedAt))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Stage Progress Bar */}
                        {stage.status !== 'pending' && (
                          <div className="mb-3">
                            <Progress 
                              value={calculateStageProgress(stage)} 
                              className="h-2" 
                            />
                          </div>
                        )}
                        
                        {/* Quality Score */}
                        {stage.quality && (
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">
                              Quality Score: {stage.quality.score}/10
                            </span>
                            {stage.quality.issues.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {stage.quality.issues.length} issue{stage.quality.issues.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Stage Notes */}
                        {stage.notes && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {stage.notes}
                          </div>
                        )}
                        
                        {/* Photos Preview */}
                        {stage.photos && stage.photos.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {stage.photos.slice(0, 3).map((photo, photoIndex) => (
                              <img 
                                key={photoIndex}
                                src={photo}
                                alt={`${stage.name} progress`}
                                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                                onClick={() => setShowPhotos(true)}
                              />
                            ))}
                            {stage.photos.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600 cursor-pointer hover:bg-gray-200">
                                +{stage.photos.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage Details */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stage List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Production Stages</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {order.stages.map((stage) => (
                      <div
                        key={stage.id}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          selectedStage === stage.id 
                            ? 'bg-blue-100 border-2 border-blue-300' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedStage(stage.id)}
                      >
                        <div className="flex items-center gap-2">
                          {getStageIcon(stage.name)}
                          <span className="font-medium">{stage.name}</span>
                          <Badge className={getStatusColor(stage.status)} variant="outline">
                            {stage.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Selected Stage Details */}
            <div className="lg:col-span-2">
              {selectedStage && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {order.stages.find(s => s.id === selectedStage)?.name} Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const stage = order.stages.find(s => s.id === selectedStage)
                      if (!stage) return null
                      
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <div className="font-medium capitalize">
                                {stage.status.replace('_', ' ')}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Duration:</span>
                              <div className="font-medium">
                                {stage.actualDuration 
                                  ? `${stage.actualDuration} min`
                                  : `Est. ${stage.estimatedDuration} min`
                                }
                              </div>
                            </div>
                          </div>
                          
                          {stage.operator && (
                            <div className="flex items-center gap-2">
                              {stage.operator.avatar && (
                                <img 
                                  src={stage.operator.avatar}
                                  alt={stage.operator.name}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="text-sm text-gray-600">Operator:</div>
                                <div className="font-medium">{stage.operator.name}</div>
                              </div>
                            </div>
                          )}
                          
                          {stage.quality && (
                            <div>
                              <div className="text-sm text-gray-600 mb-2">Quality Assessment:</div>
                              <div className="flex items-center gap-2 mb-2">
                                <Progress value={stage.quality.score * 10} className="flex-1 h-2" />
                                <span className="text-sm font-medium">
                                  {stage.quality.score}/10
                                </span>
                              </div>
                              {stage.quality.issues.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-red-600">Issues:</span>
                                  <ul className="list-disc list-inside mt-1 text-gray-600">
                                    {stage.quality.issues.map((issue, index) => (
                                      <li key={index}>{issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {stage.notes && (
                            <div>
                              <div className="text-sm text-gray-600 mb-2">Notes:</div>
                              <div className="bg-gray-50 p-3 rounded text-sm">
                                {stage.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Quality Reports */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Reports</CardTitle>
              <CardDescription>
                Detailed quality assessments for each production stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.stages
                  .filter(stage => stage.quality)
                  .map((stage) => (
                    <div key={stage.id} className="border rounded p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          {getStageIcon(stage.name)}
                          <h3 className="font-medium">{stage.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{stage.quality!.score}/10</span>
                        </div>
                      </div>
                      
                      <Progress value={stage.quality!.score * 10} className="mb-3 h-2" />
                      
                      {stage.quality!.issues.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-red-600 mb-2">Issues Found:</h4>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {stage.quality!.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Photos */}
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Progress Photos</CardTitle>
              <CardDescription>
                Visual documentation of your order's production journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {order.stages
                  .filter(stage => stage.photos && stage.photos.length > 0)
                  .flatMap(stage => 
                    stage.photos!.map((photo, index) => (
                      <div key={`${stage.id}-${index}`} className="space-y-2">
                        <img 
                          src={photo}
                          alt={`${stage.name} progress`}
                          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                        <div className="text-xs text-center text-gray-600">
                          {stage.name}
                        </div>
                      </div>
                    ))
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Location */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <MapPin className="h-6 w-6 text-green-600" />
            <div>
              <div className="font-medium">Current Location</div>
              <div className="text-sm text-gray-600">{order.tracking.location}</div>
            </div>
            <div className="ml-auto text-sm text-gray-600">
              Last updated: {formatDistanceToNow(order.tracking.lastUpdate, { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedOrderTracking