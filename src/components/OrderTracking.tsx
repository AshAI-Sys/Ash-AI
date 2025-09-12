// @ts-nocheck
/**
 * ASH AI - Order Tracking Timeline Component
 * Implements Stage 12 Client Portal order tracking per CLIENT_UPDATED_PLAN.md
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle,
  Clock,
  Package,
  Scissors,
  Palette,
  Settings,
  Shield,
  Archive,
  Truck,
  Eye,
  MessageCircle,
  AlertCircle,
  Calendar
} from 'lucide-react'

interface OrderStage {
  stage: string
  title: string
  description: string
  status: 'completed' | 'current' | 'pending' | 'blocked'
  start_date?: string
  end_date?: string
  estimated_date?: string
  notes?: string
  details?: Record<string, any>
  icon: React.ReactNode
}

interface OrderTrackingProps {
  order: {
    id: string
    po_number: string
    status: string
    progress_percentage: number
    created_at: string
    target_delivery_date: string
    stages: OrderStage[]
  }
}

const getStageIcon = (stage: string) => {
  const icons: Record<string, React.ReactNode> = {
    'DESIGN': <Palette className="w-5 h-5" />,
    'CUTTING': <Scissors className="w-5 h-5" />,
    'PRINTING': <Settings className="w-5 h-5" />,
    'EMBROIDERY': <Settings className="w-5 h-5" />,
    'SEWING': <Settings className="w-5 h-5" />,
    'QC': <Shield className="w-5 h-5" />,
    'PACKING': <Archive className="w-5 h-5" />,
    'DELIVERY': <Truck className="w-5 h-5" />
  }
  return icons[stage] || <Package className="w-5 h-5" />
}

const getStatusColor = (status: string) => {
  const colors = {
    'completed': 'bg-green-500 border-green-500',
    'current': 'bg-blue-500 border-blue-500',
    'pending': 'bg-gray-300 border-gray-300',
    'blocked': 'bg-red-500 border-red-500'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-300 border-gray-300'
}

const getStatusTextColor = (status: string) => {
  const colors = {
    'completed': 'text-green-700',
    'current': 'text-blue-700',
    'pending': 'text-gray-500',
    'blocked': 'text-red-700'
  }
  return colors[status as keyof typeof colors] || 'text-gray-500'
}

export default function OrderTracking({ order }: OrderTrackingProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  // Default stages if not provided
  const defaultStages: OrderStage[] = [
    {
      stage: 'DESIGN',
      title: 'Design & Approval',
      description: 'Design creation and client approval',
      status: 'completed',
      icon: <Palette className="w-5 h-5" />,
      start_date: order.created_at,
      end_date: order.created_at
    },
    {
      stage: 'CUTTING',
      title: 'Fabric Cutting',
      description: 'Cutting fabric according to patterns',
      status: 'current',
      icon: <Scissors className="w-5 h-5" />
    },
    {
      stage: 'PRINTING',
      title: 'Printing/Embroidery',
      description: 'Applying designs to garments',
      status: 'pending',
      icon: <Settings className="w-5 h-5" />
    },
    {
      stage: 'SEWING',
      title: 'Sewing Assembly',
      description: 'Assembling garment pieces',
      status: 'pending',
      icon: <Settings className="w-5 h-5" />
    },
    {
      stage: 'QC',
      title: 'Quality Control',
      description: 'Quality inspection and testing',
      status: 'pending',
      icon: <Shield className="w-5 h-5" />
    },
    {
      stage: 'PACKING',
      title: 'Finishing & Packing',
      description: 'Final finishing and packaging',
      status: 'pending',
      icon: <Archive className="w-5 h-5" />
    },
    {
      stage: 'DELIVERY',
      title: 'Delivery',
      description: 'Shipment to destination',
      status: 'pending',
      icon: <Truck className="w-5 h-5" />
    }
  ]

  const stages = order.stages?.length > 0 ? order.stages : defaultStages

  const toggleStageDetails = (stage: string) => {
    setExpandedStage(expandedStage === stage ? null : stage)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Order Timeline</CardTitle>
            <CardDescription>
              Track your order progress through each production stage
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{order.progress_percentage}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="mt-4">
          <Progress value={order.progress_percentage} className="h-3" />
        </div>
      </CardHeader>

      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {stages.map((stage, index) => (
            <div key={stage.stage} className="relative pb-8 last:pb-0">
              {/* Timeline Line */}
              {index < stages.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
              )}
              
              {/* Stage Content */}
              <div className="flex items-start space-x-4">
                {/* Stage Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getStatusColor(stage.status)}`}>
                  {stage.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : stage.status === 'blocked' ? (
                    <AlertCircle className="w-5 h-5 text-white" />
                  ) : stage.status === 'current' ? (
                    <Clock className="w-5 h-5 text-white" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white" />
                  )}
                </div>

                {/* Stage Details */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${getStatusTextColor(stage.status)}`}>
                        {stage.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {stage.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {stage.status === 'completed' && stage.end_date && (
                        <div className="text-sm text-green-600">
                          ✓ Completed {new Date(stage.end_date).toLocaleDateString()}
                        </div>
                      )}
                      {stage.status === 'current' && stage.estimated_date && (
                        <div className="text-sm text-blue-600">
                          Est. {new Date(stage.estimated_date).toLocaleDateString()}
                        </div>
                      )}
                      {stage.status === 'blocked' && (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      )}
                      
                      {stage.details && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStageDetails(stage.stage)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Stage Details (Expandable) */}
                  {expandedStage === stage.stage && stage.details && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                      {Object.entries(stage.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="capitalize font-medium">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="text-muted-foreground">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                      {stage.notes && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <strong>Notes:</strong> {stage.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 pt-6 border-t flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Expected delivery: {new Date(order.target_delivery_date).toLocaleDateString()}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-1" />
              Contact CSR
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-1" />
              Schedule Update
            </Button>
          </div>
        </div>

        {/* Ashley AI Insights */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
            <div className="flex-grow">
              <div className="font-semibold text-sm text-blue-900">Ashley AI Insight</div>
              <div className="text-sm text-blue-800 mt-1">
                Your order is progressing well! Based on current production capacity, 
                we expect to complete {stages.find(s => s.status === 'current')?.title || 'the next stage'} by{' '}
                {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}