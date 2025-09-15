// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Brain,
  Cpu,
  Zap,
  Target,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  Users,
  Settings,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Timer,
  Cog,
  Factory,
  Package,
  Eye,
  Edit,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Database,
  Monitor,
  Gauge,
  Lightning,
  Layers,
  Grid3X3,
  Workflow,
  Shuffle
} from 'lucide-react'
import { Role } from '@prisma/client'

interface ProductionOrder {
  id: string
  orderNumber: string
  clientName: string
  productType: string
  quantity: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'
  scheduledStart: string
  scheduledEnd: string
  actualStart?: string
  actualEnd?: string
  progress: number
  estimatedHours: number
  actualHours?: number
  assignedResources: string[]
  bottlenecks?: string[]
}

interface Resource {
  id: string
  name: string
  type: 'MACHINE' | 'OPERATOR' | 'STATION'
  capacity: number
  utilization: number
  efficiency: number
  skillLevel?: string
  maintenanceSchedule?: string
  currentOrder?: string
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE' | 'OFFLINE'
}

interface CapacityAnalysis {
  department: string
  totalCapacity: number
  currentUtilization: number
  plannedUtilization: number
  bottleneckRisk: number
  efficiency: number
  availableHours: number
  plannedHours: number
}

interface DemandForecast {
  period: string
  predictedDemand: number
  confidence: number
  trendDirection: 'UP' | 'DOWN' | 'STABLE'
  seasonalFactor: number
  historicalAverage: number
}

interface ProductionSchedule {
  timeSlot: string
  station: string
  orderNumber: string
  operation: string
  duration: number
  operatorRequired: string
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED'
}

const mockProductionOrders: ProductionOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    clientName: 'ABC Company',
    productType: 'T-Shirts',
    quantity: 500,
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    scheduledStart: '2025-09-15T08:00',
    scheduledEnd: '2025-09-17T17:00',
    actualStart: '2025-09-15T08:15',
    progress: 65,
    estimatedHours: 16,
    actualHours: 12,
    assignedResources: ['Cutting Station 1', 'Operator Juan', 'Sewing Line A'],
    bottlenecks: ['Printing Queue']
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    clientName: 'XYZ Store',
    productType: 'Hoodies',
    quantity: 200,
    priority: 'MEDIUM',
    status: 'PLANNED',
    scheduledStart: '2025-09-18T08:00',
    scheduledEnd: '2025-09-20T17:00',
    progress: 0,
    estimatedHours: 24,
    assignedResources: ['Cutting Station 2', 'Operator Maria', 'Sewing Line B']
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    clientName: 'Sports Pro',
    productType: 'Jerseys',
    quantity: 150,
    priority: 'HIGH',
    status: 'DELAYED',
    scheduledStart: '2025-09-16T08:00',
    scheduledEnd: '2025-09-18T17:00',
    progress: 25,
    estimatedHours: 20,
    actualHours: 8,
    assignedResources: ['Cutting Station 3', 'Operator Pedro'],
    bottlenecks: ['Embroidery Machine', 'Quality Control']
  }
]

const mockResources: Resource[] = [
  {
    id: '1',
    name: 'Cutting Station 1',
    type: 'STATION',
    capacity: 8,
    utilization: 85,
    efficiency: 92,
    currentOrder: 'ORD-001',
    status: 'BUSY'
  },
  {
    id: '2',
    name: 'Sewing Line A',
    type: 'STATION',
    capacity: 10,
    utilization: 75,
    efficiency: 88,
    currentOrder: 'ORD-001',
    status: 'BUSY'
  },
  {
    id: '3',
    name: 'Operator Juan',
    type: 'OPERATOR',
    capacity: 8,
    utilization: 90,
    efficiency: 95,
    skillLevel: 'Expert',
    currentOrder: 'ORD-001',
    status: 'BUSY'
  },
  {
    id: '4',
    name: 'Printing Machine 1',
    type: 'MACHINE',
    capacity: 6,
    utilization: 60,
    efficiency: 85,
    maintenanceSchedule: '2025-09-20',
    status: 'AVAILABLE'
  },
  {
    id: '5',
    name: 'Operator Maria',
    type: 'OPERATOR',
    capacity: 8,
    utilization: 45,
    efficiency: 91,
    skillLevel: 'Advanced',
    status: 'AVAILABLE'
  }
]

const mockCapacityAnalysis: CapacityAnalysis[] = [
  {
    department: 'Cutting',
    totalCapacity: 24,
    currentUtilization: 20.4,
    plannedUtilization: 22.8,
    bottleneckRisk: 15,
    efficiency: 92,
    availableHours: 3.6,
    plannedHours: 1.2
  },
  {
    department: 'Printing',
    totalCapacity: 18,
    currentUtilization: 10.8,
    plannedUtilization: 16.2,
    bottleneckRisk: 75,
    efficiency: 85,
    availableHours: 7.2,
    plannedHours: 1.8
  },
  {
    department: 'Sewing',
    totalCapacity: 40,
    currentUtilization: 30,
    plannedUtilization: 38,
    bottleneckRisk: 25,
    efficiency: 88,
    availableHours: 10,
    plannedHours: 2
  },
  {
    department: 'Quality Control',
    totalCapacity: 16,
    currentUtilization: 9.6,
    plannedUtilization: 14.4,
    bottleneckRisk: 45,
    efficiency: 96,
    availableHours: 6.4,
    plannedHours: 1.6
  }
]

const mockDemandForecast: DemandForecast[] = [
  {
    period: 'Week 38',
    predictedDemand: 1250,
    confidence: 87,
    trendDirection: 'UP',
    seasonalFactor: 1.15,
    historicalAverage: 1087
  },
  {
    period: 'Week 39',
    predictedDemand: 1450,
    confidence: 82,
    trendDirection: 'UP',
    seasonalFactor: 1.25,
    historicalAverage: 1160
  },
  {
    period: 'Week 40',
    predictedDemand: 1380,
    confidence: 79,
    trendDirection: 'STABLE',
    seasonalFactor: 1.19,
    historicalAverage: 1159
  },
  {
    period: 'Week 41',
    predictedDemand: 1200,
    confidence: 85,
    trendDirection: 'DOWN',
    seasonalFactor: 1.05,
    historicalAverage: 1143
  }
]

export default function ProductionPlanningPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<ProductionOrder[]>(mockProductionOrders)
  const [resources, setResources] = useState<Resource[]>(mockResources)
  const [activeTab, setActiveTab] = useState('overview')
  const [optimizationRunning, setOptimizationRunning] = useState(false)
  const [lastOptimized, setLastOptimized] = useState(new Date())

  const canManageProduction = session?.user.role === Role.ADMIN ||
                             session?.user.role === Role.MANAGER ||
                             session?.user.role === Role.PRODUCTION_MANAGER

  // Simulate AI optimization
  const runOptimization = () => {
    setOptimizationRunning(true)

    setTimeout(() => {
      // Simulate optimization results
      setOrders(prev => prev.map(order => ({
        ...order,
        progress: order.status === 'IN_PROGRESS' ? Math.min(100, order.progress + Math.random() * 20) : order.progress,
        estimatedHours: order.estimatedHours * (0.85 + Math.random() * 0.2) // 15-5% variance
      })))

      setResources(prev => prev.map(resource => ({
        ...resource,
        utilization: Math.min(95, resource.utilization + (Math.random() - 0.5) * 10),
        efficiency: Math.min(100, resource.efficiency + (Math.random() - 0.3) * 5)
      })))

      setOptimizationRunning(false)
      setLastOptimized(new Date())

      alert('🧠 AI OPTIMIZATION COMPLETE!\n\nProduction schedule optimized with:\n• 12% efficiency improvement\n• 3.5 hour reduction in lead time\n• Bottleneck prediction active\n• Resource allocation optimized')
    }, 3000)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'PLANNED': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'DELAYED': return 'bg-red-500/20 text-red-400 border-red-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getResourceStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'BUSY': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'MAINTENANCE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'OFFLINE': return 'bg-red-500/20 text-red-400 border-red-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  if (!canManageProduction) {
    return (
      <TikTokLayout>
        <div className="neural-bg min-h-screen p-6">
          <Card className="quantum-card max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="ai-orb mx-auto mb-4">
                <Factory className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">ACCESS DENIED</h3>
              <p className="text-red-400 mb-4">Insufficient permissions for production planning</p>
              <p className="text-sm text-gray-400">Contact system administrator for production access.</p>
            </CardContent>
          </Card>
        </div>
      </TikTokLayout>
    )
  }

  return (
    <TikTokLayout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
          {/* Neural Production Planning Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold glitch-text text-white mb-3" data-text="PRODUCTION PLANNING ENGINE">
                🏭 PRODUCTION PLANNING ENGINE
              </h1>
              <p className="text-cyan-300 text-xl font-mono">
                AI-powered capacity optimization • Resource allocation matrix • Bottleneck prediction • Demand forecasting
              </p>
            </div>

            <div className="flex gap-4">
              <div className="hologram-card p-4">
                <div className="text-center">
                  <p className="text-sm text-cyan-300 font-mono">LAST OPTIMIZED</p>
                  <p className="text-lg font-bold text-white">{lastOptimized.toLocaleTimeString()}</p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50 mt-1">
                    <Activity className="w-3 h-3 mr-1" />
                    ACTIVE
                  </Badge>
                </div>
              </div>

              <Button
                className={`neon-btn-primary ${optimizationRunning ? 'animate-pulse' : ''}`}
                onClick={runOptimization}
                disabled={optimizationRunning}
              >
                <Brain className="w-4 h-4 mr-2" />
                {optimizationRunning ? 'OPTIMIZING...' : 'AI OPTIMIZE'}
              </Button>
            </div>
          </div>

          {/* Advanced Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">OVERALL EFFICIENCY</p>
                    <p className="text-3xl font-bold text-white">91.2%</p>
                    <p className="text-xs text-green-400 mt-1">+5.8% from optimization</p>
                  </div>
                  <div className="ai-orb">
                    <Gauge className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">CAPACITY UTILIZATION</p>
                    <p className="text-3xl font-bold text-white">78.5%</p>
                    <p className="text-xs text-blue-400 mt-1">Optimized allocation</p>
                  </div>
                  <div className="ai-orb">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">BOTTLENECK RISK</p>
                    <p className="text-3xl font-bold text-white">25%</p>
                    <p className="text-xs text-yellow-400 mt-1">Printing department</p>
                  </div>
                  <div className="ai-orb">
                    <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">ON-TIME DELIVERY</p>
                    <p className="text-3xl font-bold text-white">94.7%</p>
                    <p className="text-xs text-purple-400 mt-1">Performance target</p>
                  </div>
                  <div className="ai-orb">
                    <Target className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Neural Command Interface */}
          <Card className="quantum-card border-cyan-500/30 mb-8">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="overview" className="cyber-tab">
                    <Monitor className="w-4 h-4 mr-2" />
                    OVERVIEW
                  </TabsTrigger>
                  <TabsTrigger value="capacity" className="cyber-tab">
                    <Gauge className="w-4 h-4 mr-2" />
                    CAPACITY
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="cyber-tab">
                    <Calendar className="w-4 h-4 mr-2" />
                    SCHEDULE
                  </TabsTrigger>
                  <TabsTrigger value="forecast" className="cyber-tab">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    FORECAST
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="cyber-tab">
                    <Users className="w-4 h-4 mr-2" />
                    RESOURCES
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  {/* Production Orders Overview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">Active Production Orders</h3>
                      <Button className="neon-btn">
                        <Shuffle className="w-4 h-4 mr-2" />
                        REBALANCE LOAD
                      </Button>
                    </div>

                    {orders.map((order) => (
                      <Card key={order.id} className="quantum-card border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="ai-orb">
                                <Package className="w-6 h-6 text-cyan-400" />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-white">{order.orderNumber}</h4>
                                <p className="text-cyan-300">{order.clientName} - {order.productType}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getPriorityColor(order.priority)}>
                                {order.priority}
                              </Badge>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Quantity</p>
                              <p className="text-white font-mono">{order.quantity} units</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Progress</p>
                              <p className="text-white font-mono">{order.progress}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Est. Hours</p>
                              <p className="text-white font-mono">{order.estimatedHours}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Actual Hours</p>
                              <p className="text-white font-mono">{order.actualHours || 0}h</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                            <div
                              className="bg-cyan-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${order.progress}%` }}
                            />
                          </div>

                          {/* Assigned Resources */}
                          <div className="mb-4">
                            <p className="text-sm text-gray-400 mb-2">Assigned Resources</p>
                            <div className="flex flex-wrap gap-2">
                              {order.assignedResources.map((resource, index) => (
                                <Badge key={index} className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                  {resource}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Bottlenecks */}
                          {order.bottlenecks && order.bottlenecks.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm text-red-400 mb-2">Bottlenecks Detected</p>
                              <div className="flex flex-wrap gap-2">
                                {order.bottlenecks.map((bottleneck, index) => (
                                  <Badge key={index} className="bg-red-500/20 text-red-400 border-red-500/50">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {bottleneck}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button className="neon-btn-outline text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              DETAILS
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Edit className="w-3 h-3 mr-1" />
                              RESCHEDULE
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Workflow className="w-3 h-3 mr-1" />
                              OPTIMIZE
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="capacity">
                  {/* Capacity Analysis */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white mb-4">Capacity Analysis by Department</h3>

                    {mockCapacityAnalysis.map((dept, index) => (
                      <Card key={index} className="quantum-card border-purple-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-white">{dept.department}</h4>
                            <Badge className={dept.bottleneckRisk > 50 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'}>
                              {dept.bottleneckRisk}% Risk
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Total Capacity</p>
                              <p className="text-white font-mono">{dept.totalCapacity}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Current Utilization</p>
                              <p className="text-white font-mono">{dept.currentUtilization}h ({Math.round(dept.currentUtilization/dept.totalCapacity*100)}%)</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Efficiency</p>
                              <p className="text-white font-mono">{dept.efficiency}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Available Hours</p>
                              <p className="text-white font-mono">{dept.availableHours}h</p>
                            </div>
                          </div>

                          {/* Utilization Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                            <div
                              className={`h-4 rounded-full transition-all duration-500 ${dept.currentUtilization/dept.totalCapacity > 0.8 ? 'bg-red-400' : dept.currentUtilization/dept.totalCapacity > 0.6 ? 'bg-yellow-400' : 'bg-green-400'}`}
                              style={{ width: `${(dept.currentUtilization/dept.totalCapacity)*100}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400">Current utilization: {Math.round(dept.currentUtilization/dept.totalCapacity*100)}%</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="forecast">
                  {/* Demand Forecast */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white mb-4">AI Demand Forecasting</h3>

                    {mockDemandForecast.map((forecast, index) => (
                      <Card key={index} className="quantum-card border-green-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-white">{forecast.period}</h4>
                            <div className="flex gap-2">
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                {forecast.confidence}% Confidence
                              </Badge>
                              <Badge className={forecast.trendDirection === 'UP' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : forecast.trendDirection === 'DOWN' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-500/20 text-gray-400 border-gray-500/50'}>
                                {forecast.trendDirection}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Predicted Demand</p>
                              <p className="text-white font-mono text-lg">{forecast.predictedDemand} units</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Historical Average</p>
                              <p className="text-white font-mono">{forecast.historicalAverage} units</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Seasonal Factor</p>
                              <p className="text-white font-mono">{forecast.seasonalFactor}x</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Variance</p>
                              <p className={`font-mono ${(forecast.predictedDemand - forecast.historicalAverage) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {forecast.predictedDemand > forecast.historicalAverage ? '+' : ''}{forecast.predictedDemand - forecast.historicalAverage} units
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="resources">
                  {/* Resource Management */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Resource Allocation Matrix</h3>

                    {resources.map((resource) => (
                      <Card key={resource.id} className="quantum-card border-blue-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="ai-orb">
                                {resource.type === 'MACHINE' ? <Cog className="w-6 h-6 text-blue-400" /> :
                                 resource.type === 'OPERATOR' ? <Users className="w-6 h-6 text-green-400" /> :
                                 <Factory className="w-6 h-6 text-purple-400" />}
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-white">{resource.name}</h4>
                                <p className="text-cyan-300">{resource.type}</p>
                              </div>
                            </div>
                            <Badge className={getResourceStatusColor(resource.status)}>
                              {resource.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Capacity</p>
                              <p className="text-white font-mono">{resource.capacity}h/day</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Utilization</p>
                              <p className="text-white font-mono">{resource.utilization}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Efficiency</p>
                              <p className="text-white font-mono">{resource.efficiency}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Current Order</p>
                              <p className="text-white font-mono">{resource.currentOrder || 'None'}</p>
                            </div>
                          </div>

                          {/* Utilization Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${resource.utilization > 85 ? 'bg-red-400' : resource.utilization > 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                              style={{ width: `${resource.utilization}%` }}
                            />
                          </div>

                          {resource.skillLevel && (
                            <div className="mt-2">
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                Skill: {resource.skillLevel}
                              </Badge>
                            </div>
                          )}

                          {resource.maintenanceSchedule && (
                            <div className="mt-2">
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                                <Clock className="w-3 h-3 mr-1" />
                                Maintenance: {resource.maintenanceSchedule}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </TikTokLayout>
  )
}