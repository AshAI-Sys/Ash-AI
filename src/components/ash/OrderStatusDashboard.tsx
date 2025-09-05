/**
 * ASH AI - Neural Order Status Dashboard
 * Futuristic order lifecycle visualization with AI-powered insights
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Pause, 
  Play, 
  X, 
  ChevronRight,
  Package,
  Truck,
  QrCode,
  Scissors,
  Palette,
  Shirt,
  Shield,
  Archive,
  History,
  Brain,
  TrendingUp
} from 'lucide-react'

interface OrderStatusDashboardProps {
  orderId: string
}

interface OrderStatusInfo {
  order: {
    id: string
    po_number: string
    status: string
    progress_percentage: number
    brand: { name: string; code: string }
    client: { name: string; company?: string }
    routing_steps: Array<{
      id: string
      name: string
      status: string
      sequence: number
    }>
  }
  current_status: string
  valid_transitions: Array<{
    action: string
    to: string
    description: string
    required_role?: string[]
  }>
  status_history: Array<{
    id: string
    before_data: any
    after_data: any
    metadata: any
    created_at: string
  }>
}

const statusConfig = {
  INTAKE: {
    label: 'Order Intake',
    color: 'bg-blue-500',
    icon: Package,
    description: 'Order received and being processed'
  },
  DESIGN_PENDING: {
    label: 'Design Pending',
    color: 'bg-purple-500',
    icon: Palette,
    description: 'Waiting for design work'
  },
  DESIGN_APPROVAL: {
    label: 'Design Approval',
    color: 'bg-yellow-500',
    icon: Brain,
    description: 'Design ready for client approval'
  },
  PRODUCTION_PLANNED: {
    label: 'Production Planned',
    color: 'bg-indigo-500',
    icon: TrendingUp,
    description: 'Production scheduled and planned'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-orange-500',
    icon: Scissors,
    description: 'Production in progress'
  },
  QC: {
    label: 'Quality Control',
    color: 'bg-red-500',
    icon: Shield,
    description: 'Quality inspection in progress'
  },
  PACKING: {
    label: 'Packing',
    color: 'bg-green-500',
    icon: Archive,
    description: 'Order being packed'
  },
  READY_FOR_DELIVERY: {
    label: 'Ready for Delivery',
    color: 'bg-teal-500',
    icon: Truck,
    description: 'Ready for shipment'
  },
  DELIVERED: {
    label: 'Delivered',
    color: 'bg-emerald-500',
    icon: CheckCircle,
    description: 'Order delivered to client'
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-gray-500',
    icon: Archive,
    description: 'Order completed and closed'
  },
  ON_HOLD: {
    label: 'On Hold',
    color: 'bg-yellow-600',
    icon: Pause,
    description: 'Order temporarily on hold'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-600',
    icon: X,
    description: 'Order cancelled'
  }
}

export function OrderStatusDashboard({ orderId }: OrderStatusDashboardProps) {
  const [statusInfo, setStatusInfo] = useState<OrderStatusInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    fetchStatusInfo()
  }, [orderId])

  const fetchStatusInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ash/orders/${orderId}/status`)
      
      if (response.ok) {
        const data = await response.json()
        setStatusInfo(data)
      } else {
        console.error('Failed to fetch status info')
      }
    } catch (error) {
      console.error('Error fetching status info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusTransition = async (action: string, reason?: string) => {
    try {
      setTransitioning(true)
      
      const response = await fetch(`/api/ash/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      })

      const result = await response.json()

      if (result.success) {
        // Refresh status info
        await fetchStatusInfo()
        alert(`✅ ${result.message}`)
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Error transitioning status:', error)
      alert('❌ Failed to transition status')
    } finally {
      setTransitioning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="quantum-loader w-12 h-12">
          <div></div><div></div><div></div>
        </div>
      </div>
    )
  }

  if (!statusInfo) {
    return (
      <Alert className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">Failed to load order status information</AlertDescription>
      </Alert>
    )
  }

  const currentStatusConfig = statusConfig[statusInfo.current_status as keyof typeof statusConfig]
  const StatusIcon = currentStatusConfig?.icon || Package

  return (
    <div className="space-y-8">
      {/* Neural Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="ai-orb w-10 h-10">
            <StatusIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold glitch-text text-white" data-text="Status Dashboard">Status Dashboard</h1>
            <p className="text-cyan-300 mt-1">
              {statusInfo.order.po_number} - {statusInfo.order.brand.name}
            </p>
          </div>
        </div>
        <Badge 
          className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30 px-4 py-2 text-sm backdrop-blur-sm"
        >
          <StatusIcon className="w-4 h-4 mr-2" />
          {currentStatusConfig?.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Status Display */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Overview */}
          <Card className="quantum-card border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <TrendingUp className="w-5 h-5 mr-2 text-cyan-400" />
                Progress Overview
              </CardTitle>
              <CardDescription className="text-cyan-300">
                Overall order completion: {statusInfo.order.progress_percentage}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-cyan-300">Progress</span>
                  <span className="text-white font-bold">{statusInfo.order.progress_percentage}%</span>
                </div>
                <div className="w-full bg-slate-800/30 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${statusInfo.order.progress_percentage}%` }}
                  >
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Neural Status Timeline */}
              <div className="space-y-3">
                {Object.entries(statusConfig).slice(0, 9).map(([status, config], index) => {
                  const Icon = config.icon
                  const isActive = status === statusInfo.current_status
                  const isPassed = getStatusOrder(status) < getStatusOrder(statusInfo.current_status)
                  
                  return (
                    <div 
                      key={status}
                      className={`flex items-center p-4 rounded-lg transition-all duration-300 backdrop-blur-sm ${
                        isActive ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-lg shadow-cyan-500/10' :
                        isPassed ? 'bg-green-500/10 border border-green-500/30' :
                        'bg-slate-800/20 border border-slate-600/30'
                      }`}
                    >
                      <div className={`p-3 rounded-full mr-4 transition-all duration-300 ${
                        isActive ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30' :
                        isPassed ? 'bg-green-500 shadow-lg shadow-green-500/30' : 
                        'bg-slate-600'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{config.label}</h4>
                        <p className="text-sm text-cyan-300">{config.description}</p>
                      </div>
                      {isActive && (
                        <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-500/30 animate-pulse">
                          Current
                        </Badge>
                      )}
                      {isPassed && (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Production Steps */}
          <Card className="quantum-card border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Scissors className="w-5 h-5 mr-2 text-purple-400" />
                Production Steps
              </CardTitle>
              <CardDescription className="text-cyan-300">
                Detailed production workflow progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusInfo.order.routing_steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className="flex items-center p-4 bg-slate-800/20 border border-slate-600/30 rounded-lg backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30"
                  >
                    <div className="mr-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.status === 'DONE' ? 'bg-green-500 text-white' :
                        step.status === 'IN_PROGRESS' ? 'bg-orange-500 text-white' :
                        step.status === 'READY' ? 'bg-cyan-500 text-white' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {step.sequence}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{step.name}</h4>
                      <p className="text-sm text-cyan-300">Production Step {step.sequence}</p>
                    </div>
                    <Badge 
                      className={
                        step.status === 'DONE' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        step.status === 'IN_PROGRESS' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                        step.status === 'READY' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                        'bg-slate-500/20 text-slate-300 border-slate-500/30'
                      }
                    >
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
                {statusInfo.order.routing_steps.length === 0 && (
                  <div className="text-center py-8">
                    <Scissors className="w-8 h-8 mx-auto mb-3 opacity-50 text-purple-400" />
                    <p className="text-cyan-300 text-sm">
                      No production steps defined yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & History Sidebar */}
        <div className="space-y-8">
          {/* Available Actions */}
          <Card className="quantum-card border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ChevronRight className="w-5 h-5 mr-2 text-green-400" />
                Available Actions
              </CardTitle>
              <CardDescription className="text-cyan-300">
                Status transitions you can perform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusInfo.valid_transitions.map((transition) => (
                <Button
                  key={transition.action}
                  className="neon-btn-outline w-full justify-start text-left"
                  onClick={() => handleStatusTransition(transition.action)}
                  disabled={transitioning}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  {transition.description}
                </Button>
              ))}
              
              {statusInfo.valid_transitions.length === 0 && (
                <div className="text-center py-8">
                  <ChevronRight className="w-8 h-8 mx-auto mb-3 opacity-50 text-green-400" />
                  <p className="text-cyan-300 text-sm">
                    No actions available for current status
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="quantum-card border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <QrCode className="w-5 h-5 mr-2 text-blue-400" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-cyan-300">PO Number:</span>
                <span className="font-medium text-white">{statusInfo.order.po_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300">Client:</span>
                <span className="font-medium text-white">{statusInfo.order.client.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300">Brand:</span>
                <span className="font-medium text-white">{statusInfo.order.brand.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-300">Progress:</span>
                <span className="font-medium text-green-400">{statusInfo.order.progress_percentage}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card className="quantum-card border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <History className="w-5 h-5 mr-2 text-orange-400" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {statusInfo.status_history.map((entry) => (
                  <div key={entry.id} className="text-sm p-3 bg-slate-800/20 border border-slate-600/30 rounded backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                          <span className="font-medium text-white">
                            {(entry.before_data as any)?.status} → {(entry.after_data as any)?.status}
                          </span>
                        </div>
                        {entry.metadata?.reason && (
                          <p className="text-cyan-300 mt-2 pl-4">
                            {entry.metadata.reason}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-cyan-400 ml-2">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {statusInfo.status_history.length === 0 && (
                  <div className="text-center py-8">
                    <History className="w-8 h-8 mx-auto mb-3 opacity-50 text-orange-400" />
                    <p className="text-cyan-300 text-sm">
                      No status changes yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Helper function to determine status order
function getStatusOrder(status: string): number {
  const order = {
    'INTAKE': 0,
    'DESIGN_PENDING': 1,
    'DESIGN_APPROVAL': 2,
    'PRODUCTION_PLANNED': 3,
    'IN_PROGRESS': 4,
    'QC': 5,
    'PACKING': 6,
    'READY_FOR_DELIVERY': 7,
    'DELIVERED': 8,
    'CLOSED': 9,
    'ON_HOLD': -1,
    'CANCELLED': -2
  }
  
  return order[status as keyof typeof order] || 0
}