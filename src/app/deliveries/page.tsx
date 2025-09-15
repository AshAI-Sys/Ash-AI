// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  Package,
  Plus,
  Navigation,
  Route,
  Smartphone,
  AlertTriangle,
  Eye,
  Edit,
  BarChart3,
  Target,
  Zap,
  Users,
  Map,
  Timer,
  DollarSign,
  Star,
  Phone,
  Mail,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Settings,
  Activity,
  TrendingUp,
  Brain
} from 'lucide-react'
import { Role } from '@prisma/client'

interface Delivery {
  id: string
  orderNumber: string
  clientName: string
  address: string
  driverName: string
  vehiclePlate: string
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  priority: number
  items: string
  notes?: string
  gpsLocation?: { lat: number; lng: number }
  estimatedArrival?: string
  customerContact?: string
  deliveryRoute?: string[]
  proofOfDelivery?: {
    signature?: string
    photo?: string
    receivedBy?: string
    timestamp?: string
  }
  deliveryFee?: number
  thirdPartyLogistics?: {
    provider: string
    trackingNumber: string
    cost: number
  }
}

interface Vehicle {
  id: string
  plateNumber: string
  type: string
  driverName: string
  active: boolean
  gpsLocation?: { lat: number; lng: number }
  currentRoute?: string
  fuelLevel?: number
  maintenanceStatus?: 'OK' | 'DUE' | 'OVERDUE'
  maxCapacity?: number
  currentLoad?: number
}

interface Driver {
  id: string
  name: string
  phone: string
  email: string
  licenseNumber: string
  rating: number
  totalDeliveries: number
  onTimeRate: number
  currentStatus: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY'
  currentLocation?: { lat: number; lng: number }
}

interface RouteOptimization {
  totalDistance: number
  estimatedTime: number
  fuelCost: number
  optimizedOrder: string[]
  mapUrl: string
}

const mockDeliveries: Delivery[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    clientName: 'ABC Company',
    address: '123 Business St, Makati City',
    driverName: 'Juan Dela Cruz',
    vehiclePlate: 'ABC-123',
    status: 'SCHEDULED',
    scheduledAt: '2025-09-15 14:00',
    priority: 1,
    items: '100 Summer Collection T-Shirts',
    gpsLocation: { lat: 14.5547, lng: 121.0244 },
    estimatedArrival: '2025-09-15 14:30',
    customerContact: '+63917-123-4567',
    deliveryFee: 500,
    deliveryRoute: ['Factory', 'Makati City', 'ABC Company']
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    clientName: 'XYZ Store',
    address: '456 Mall Ave, Quezon City',
    driverName: 'Pedro Santos',
    vehiclePlate: 'DEF-456',
    status: 'IN_TRANSIT',
    scheduledAt: '2025-09-15 10:00',
    startedAt: '2025-09-15 10:15',
    priority: 2,
    items: '50 Holiday Special Hoodies',
    gpsLocation: { lat: 14.6760, lng: 121.0437 },
    estimatedArrival: '2025-09-15 11:00',
    customerContact: '+63918-234-5678',
    deliveryFee: 300,
    thirdPartyLogistics: {
      provider: 'LBC Express',
      trackingNumber: 'LBC-789456123',
      cost: 250
    }
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    clientName: 'DEF Corp',
    address: '789 Office Tower, BGC',
    driverName: 'Juan Dela Cruz',
    vehiclePlate: 'ABC-123',
    status: 'DELIVERED',
    scheduledAt: '2025-09-14 13:00',
    startedAt: '2025-09-14 13:10',
    completedAt: '2025-09-14 15:30',
    priority: 1,
    items: '75 Corporate Polo Shirts',
    notes: 'Delivered to security desk, signed by Ms. Rodriguez',
    customerContact: '+63919-345-6789',
    deliveryFee: 750,
    proofOfDelivery: {
      signature: 'data:image/png;base64,signature_data',
      receivedBy: 'Ms. Rodriguez - Security Desk',
      timestamp: '2025-09-14 15:30'
    }
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    clientName: 'Sports Pro Inc',
    address: 'Alabang Town Center, Muntinlupa',
    driverName: 'Maria Garcia',
    vehiclePlate: 'GHI-789',
    status: 'SCHEDULED',
    scheduledAt: '2025-09-15 16:00',
    priority: 1,
    items: '200 Team Jerseys',
    gpsLocation: { lat: 14.4297, lng: 121.0403 },
    estimatedArrival: '2025-09-15 17:00',
    customerContact: '+63920-456-7890',
    deliveryFee: 1200,
    deliveryRoute: ['Factory', 'SLEX', 'Alabang', 'Sports Pro Inc']
  }
]

const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plateNumber: 'ABC-123',
    type: 'Van',
    driverName: 'Juan Dela Cruz',
    active: true,
    gpsLocation: { lat: 14.5547, lng: 121.0244 },
    currentRoute: 'Makati Route',
    fuelLevel: 75,
    maintenanceStatus: 'OK',
    maxCapacity: 500,
    currentLoad: 100
  },
  {
    id: '2',
    plateNumber: 'DEF-456',
    type: 'Motorcycle',
    driverName: 'Pedro Santos',
    active: true,
    gpsLocation: { lat: 14.6760, lng: 121.0437 },
    currentRoute: 'QC Route',
    fuelLevel: 50,
    maintenanceStatus: 'DUE',
    maxCapacity: 50,
    currentLoad: 50
  },
  {
    id: '3',
    plateNumber: 'GHI-789',
    type: 'Truck',
    driverName: 'Maria Garcia',
    active: true,
    gpsLocation: { lat: 14.4297, lng: 121.0403 },
    currentRoute: 'South Route',
    fuelLevel: 90,
    maintenanceStatus: 'OK',
    maxCapacity: 1000,
    currentLoad: 200
  }
]

const mockDrivers: Driver[] = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    phone: '+63917-111-2222',
    email: 'juan@ashdelivery.com',
    licenseNumber: 'A01-12-345678',
    rating: 4.8,
    totalDeliveries: 1250,
    onTimeRate: 95,
    currentStatus: 'ON_DELIVERY',
    currentLocation: { lat: 14.5547, lng: 121.0244 }
  },
  {
    id: '2',
    name: 'Pedro Santos',
    phone: '+63918-333-4444',
    email: 'pedro@ashdelivery.com',
    licenseNumber: 'B02-23-456789',
    rating: 4.6,
    totalDeliveries: 890,
    onTimeRate: 92,
    currentStatus: 'ON_DELIVERY',
    currentLocation: { lat: 14.6760, lng: 121.0437 }
  },
  {
    id: '3',
    name: 'Maria Garcia',
    phone: '+63919-555-6666',
    email: 'maria@ashdelivery.com',
    licenseNumber: 'C03-34-567890',
    rating: 4.9,
    totalDeliveries: 670,
    onTimeRate: 98,
    currentStatus: 'AVAILABLE',
    currentLocation: { lat: 14.4297, lng: 121.0403 }
  },
  {
    id: '4',
    name: 'Carlos Reyes',
    phone: '+63920-777-8888',
    email: 'carlos@ashdelivery.com',
    licenseNumber: 'D04-45-678901',
    rating: 4.7,
    totalDeliveries: 455,
    onTimeRate: 94,
    currentStatus: 'AVAILABLE'
  }
]

export default function DeliveriesPage() {
  const { data: session } = useSession()
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockDeliveries)
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles)
  const [drivers] = useState<Driver[]>(mockDrivers)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('deliveries')
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimization | null>(null)
  const [realTimeUpdates, setRealTimeUpdates] = useState(true)

  // Simulate real-time GPS updates
  useEffect(() => {
    if (!realTimeUpdates) return

    const interval = setInterval(() => {
      setVehicles(prev => prev.map(vehicle => ({
        ...vehicle,
        gpsLocation: vehicle.gpsLocation ? {
          lat: vehicle.gpsLocation.lat + (Math.random() - 0.5) * 0.001,
          lng: vehicle.gpsLocation.lng + (Math.random() - 0.5) * 0.001
        } : undefined,
        fuelLevel: Math.max(0, (vehicle.fuelLevel || 0) - Math.random() * 0.5)
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [realTimeUpdates])

  const isDriver = session?.user.role === Role.DRIVER
  const canManageDeliveries = session?.user.role === Role.ADMIN || 
                             session?.user.role === Role.MANAGER ||
                             isDriver

  if (!canManageDeliveries) {
    return (
      <ResponsiveLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                You don't have permission to view delivery information.
              </p>
            </CardContent>
          </Card>
        </div>
      </ResponsiveLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800'
      case 'IN_TRANSIT': return 'bg-yellow-100 text-yellow-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800'
      case 2: return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusUpdate = (deliveryId: string, newStatus: string) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    
    setDeliveries(prev =>
      prev.map(delivery => {
        if (delivery.id === deliveryId) {
          const updated = { ...delivery, status: newStatus as 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' }
          
          if (newStatus === 'IN_TRANSIT' && !delivery.startedAt) {
            updated.startedAt = now
          } else if (newStatus === 'DELIVERED' && !delivery.completedAt) {
            updated.completedAt = now
          }
          
          return updated
        }
        return delivery
      })
    )
  }

  // Filter deliveries for drivers to only see their own
  const filteredDeliveries = deliveries.filter(delivery => {
    if (isDriver && session?.user.name) {
      // Only show deliveries assigned to this driver
      if (delivery.driverName !== session.user.name) return false
    }
    
    if (filterStatus !== 'all' && delivery.status !== filterStatus) return false
    if (filterDriver !== 'all' && delivery.driverName !== filterDriver) return false
    
    return true
  })

  const scheduledCount = filteredDeliveries.filter(d => d.status === 'SCHEDULED').length
  const inTransitCount = filteredDeliveries.filter(d => d.status === 'IN_TRANSIT').length
  const deliveredCount = filteredDeliveries.filter(d => d.status === 'DELIVERED').length
  const todayDelivered = filteredDeliveries.filter(d => 
    d.status === 'DELIVERED' && d.completedAt?.startsWith('2024-08-28')
  ).length

  const driverOptions = [
    { value: 'all', label: 'All Drivers' },
    ...Array.from(new Set(deliveries.map(d => d.driverName))).map(driver => ({
      value: driver,
      label: driver
    }))
  ]

  // Route optimization function
  const optimizeRoute = () => {
    const scheduledDeliveries = deliveries.filter(d => d.status === 'SCHEDULED')
    if (scheduledDeliveries.length === 0) {
      alert('No scheduled deliveries to optimize')
      return
    }

    // Mock route optimization calculation
    const optimization: RouteOptimization = {
      totalDistance: 45.2,
      estimatedTime: 180,
      fuelCost: 850,
      optimizedOrder: scheduledDeliveries.map(d => d.orderNumber),
      mapUrl: 'https://maps.google.com/optimized-route'
    }

    setRouteOptimization(optimization)
    alert(`🎯 ROUTE OPTIMIZATION COMPLETE!\n\nOptimized ${scheduledDeliveries.length} deliveries:\n• Total Distance: ${optimization.totalDistance} km\n• Estimated Time: ${Math.floor(optimization.estimatedTime/60)}h ${optimization.estimatedTime%60}m\n• Fuel Cost: ₱${optimization.fuelCost}\n\nRoute saved and ready for dispatch!`)
  }

  return (
    <TikTokLayout>
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

        <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-6">
          {/* Neural Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold glitch-text text-white mb-2" data-text="DELIVERY COMMAND CENTER">
                🚛 DELIVERY COMMAND CENTER
              </h1>
              <p className="text-cyan-300 text-lg font-mono">
                {isDriver
                  ? 'Neural delivery route management for assigned operations'
                  : 'Advanced logistics control with GPS tracking & route optimization'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="neon-btn"
                onClick={() => setRealTimeUpdates(!realTimeUpdates)}
              >
                <Activity className={`w-4 h-4 mr-2 ${realTimeUpdates ? 'animate-pulse' : ''}`} />
                {realTimeUpdates ? 'LIVE TRACKING ON' : 'ENABLE TRACKING'}
              </Button>

              {!isDriver && (
                <>
                  <Button className="neon-btn" onClick={optimizeRoute}>
                    <Route className="w-4 h-4 mr-2" />
                    OPTIMIZE ROUTES
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="neon-btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        SCHEDULE DELIVERY
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl quantum-card">
                      <DialogHeader>
                        <DialogTitle className="text-white">Schedule New Delivery</DialogTitle>
                        <DialogDescription className="text-cyan-300">
                          Create delivery assignment with route optimization
                        </DialogDescription>
                      </DialogHeader>
                      <div className="p-4 text-center">
                        <div className="ai-orb mx-auto mb-4">
                          <Truck className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className="text-cyan-300 font-mono">
                          NEURAL DELIVERY SCHEDULER<br/>
                          Advanced scheduling interface with AI-powered route optimization,
                          driver assignment matrix, and real-time delivery tracking.
                        </p>
                        <Button className="neon-btn mt-4">
                          <Brain className="w-4 h-4 mr-2" />
                          ACTIVATE SCHEDULER
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

        {/* Neural Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hologram-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300 font-mono">SCHEDULED</p>
                  <p className="text-3xl font-bold text-white">{scheduledCount}</p>
                </div>
                <div className="ai-orb">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-cyan-300 mt-2">Awaiting dispatch</p>
            </CardContent>
          </Card>

          <Card className="hologram-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300 font-mono">IN TRANSIT</p>
                  <p className="text-3xl font-bold text-white">{inTransitCount}</p>
                </div>
                <div className="ai-orb">
                  <Navigation className={`h-6 w-6 text-yellow-400 ${realTimeUpdates ? 'animate-pulse' : ''}`} />
                </div>
              </div>
              <p className="text-xs text-cyan-300 mt-2">Live tracking active</p>
            </CardContent>
          </Card>

          <Card className="hologram-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300 font-mono">DELIVERED TODAY</p>
                  <p className="text-3xl font-bold text-white">{todayDelivered}</p>
                </div>
                <div className="ai-orb">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <p className="text-xs text-green-400 mt-2">Mission complete</p>
            </CardContent>
          </Card>

          <Card className="hologram-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300 font-mono">TOTAL VALUE</p>
                  <p className="text-3xl font-bold text-white">₱{deliveries.reduce((sum, d) => sum + (d.deliveryFee || 0), 0).toLocaleString()}</p>
                </div>
                <div className="ai-orb">
                  <DollarSign className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-purple-400 mt-2">Revenue tracking</p>
            </CardContent>
          </Card>
        </div>

        {/* Neural Command Interface */}
        <Card className="quantum-card border-cyan-500/30 mb-8">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="deliveries" className="cyber-tab">
                  <Truck className="w-4 h-4 mr-2" />
                  DELIVERIES
                </TabsTrigger>
                <TabsTrigger value="drivers" className="cyber-tab">
                  <Users className="w-4 h-4 mr-2" />
                  DRIVERS
                </TabsTrigger>
                <TabsTrigger value="vehicles" className="cyber-tab">
                  <Map className="w-4 h-4 mr-2" />
                  FLEET
                </TabsTrigger>
                <TabsTrigger value="analytics" className="cyber-tab">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  ANALYTICS
                </TabsTrigger>
              </TabsList>

              {/* Search and Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    placeholder="SEARCH NEURAL DELIVERY DATABASE..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="cyber-input pl-10"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="cyber-select"
                >
                  <option value="all">ALL STATUS</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                {!isDriver && (
                  <select
                    value={filterDriver}
                    onChange={(e) => setFilterDriver(e.target.value)}
                    className="cyber-select"
                  >
                    <option value="all">ALL DRIVERS</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.name}>{driver.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <TabsContent value="deliveries">
                {/* Enhanced Deliveries List */}
                <div className="space-y-4">
                  {filteredDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="quantum-card border-cyan-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h3 className="text-lg font-semibold text-white">{delivery.orderNumber}</h3>
                              <Badge className={getStatusColor(delivery.status)}>
                                {delivery.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={getPriorityColor(delivery.priority)}>
                                Priority {delivery.priority}
                              </Badge>
                            </div>

                            <div className="mb-4">
                              <h4 className="font-medium text-white mb-1">{delivery.clientName}</h4>
                              <p className="text-cyan-300 flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {delivery.address}
                              </p>
                              <p className="text-cyan-300 mt-1">{delivery.items}</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-white">Driver</p>
                                <p className="text-cyan-300">{delivery.driverName}</p>
                              </div>
                              <div>
                                <p className="font-medium text-white">Vehicle</p>
                                <p className="text-cyan-300">{delivery.vehiclePlate}</p>
                              </div>
                              <div>
                                <p className="font-medium text-white">Scheduled</p>
                                <p className="text-cyan-300 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {delivery.scheduledAt}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {delivery.status === 'DELIVERED' ? 'Completed' :
                                   delivery.status === 'IN_TRANSIT' ? 'Started' : 'Status'}
                                </p>
                                <p className="text-cyan-300">
                                  {delivery.completedAt || delivery.startedAt || 'Not started'}
                                </p>
                              </div>
                            </div>

                            {delivery.notes && (
                              <div className="mt-4 p-3 bg-gray-800/50 rounded border border-cyan-500/30">
                                <p className="text-sm text-cyan-300">
                                  <span className="font-medium text-white">Notes:</span> {delivery.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {delivery.status === 'SCHEDULED' && isDriver && (
                              <Button
                                onClick={() => handleStatusUpdate(delivery.id, 'IN_TRANSIT')}
                                size="sm"
                                className="neon-btn"
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                Start Delivery
                              </Button>
                            )}

                            {delivery.status === 'IN_TRANSIT' && isDriver && (
                              <Button
                                onClick={() => handleStatusUpdate(delivery.id, 'DELIVERED')}
                                size="sm"
                                className="neon-btn-success"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Delivered
                              </Button>
                            )}

                            {delivery.status === 'DELIVERED' && (
                              <div className="text-center">
                                <div className="ai-orb mb-2">
                                  <CheckCircle className="w-6 h-6 text-green-400" />
                                </div>
                                <p className="text-xs text-green-400 font-mono">COMPLETE</p>
                              </div>
                            )}

                            {!isDriver && delivery.status === 'SCHEDULED' && (
                              <Button variant="outline" size="sm" className="cyber-btn-outline">
                                <Edit className="w-4 h-4 mr-1" />
                                Edit Schedule
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredDeliveries.length === 0 && (
                    <Card className="quantum-card border-cyan-500/20">
                      <CardContent className="p-12 text-center">
                        <div className="ai-orb mb-4 mx-auto">
                          <Package className="w-12 h-12 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No deliveries found</h3>
                        <p className="text-cyan-300">
                          {isDriver
                            ? "You don't have any assigned deliveries at the moment."
                            : "No deliveries match the selected filters."
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="drivers">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drivers.map((driver) => (
                    <Card key={driver.id} className="quantum-card border-cyan-500/20">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="ai-orb">
                            <Users className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{driver.name}</h3>
                            <Badge className={driver.currentStatus === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                           driver.currentStatus === 'ON_DELIVERY' ? 'bg-yellow-100 text-yellow-800' :
                                           'bg-gray-100 text-gray-800'}>
                              {driver.currentStatus.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-300">Rating</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-white font-mono">{driver.rating}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-300">Total Deliveries</span>
                            <span className="text-white font-mono">{driver.totalDeliveries}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-300">On-Time Rate</span>
                            <span className="text-white font-mono">{driver.onTimeRate}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-300">Contact</span>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Phone className="w-3 h-3 text-cyan-400" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Mail className="w-3 h-3 text-cyan-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="vehicles">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehicles.map((vehicle) => {
                    const currentDelivery = deliveries.find(d =>
                      d.vehiclePlate === vehicle.plateNumber && d.status === 'IN_TRANSIT'
                    )

                    return (
                      <Card key={vehicle.id} className="quantum-card border-cyan-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="ai-orb">
                              <Truck className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{vehicle.plateNumber}</h3>
                              <p className="text-cyan-300 text-sm">{vehicle.type}</p>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-300">Driver</span>
                              <span className="text-white">{vehicle.driverName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-300">Status</span>
                              <Badge className={currentDelivery ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                                {currentDelivery ? 'In Transit' : 'Available'}
                              </Badge>
                            </div>
                            {vehicle.fuelLevel && (
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-300">Fuel Level</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-700 rounded overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        vehicle.fuelLevel > 50 ? 'bg-green-400' :
                                        vehicle.fuelLevel > 25 ? 'bg-yellow-400' : 'bg-red-400'
                                      }`}
                                      style={{ width: `${vehicle.fuelLevel}%` }}
                                    />
                                  </div>
                                  <span className="text-white font-mono text-xs">{Math.round(vehicle.fuelLevel)}%</span>
                                </div>
                              </div>
                            )}
                            {vehicle.maintenanceStatus && (
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-300">Maintenance</span>
                                <Badge className={vehicle.maintenanceStatus === 'OK' ? 'bg-green-100 text-green-800' :
                                               vehicle.maintenanceStatus === 'DUE' ? 'bg-yellow-100 text-yellow-800' :
                                               'bg-red-100 text-red-800'}>
                                  {vehicle.maintenanceStatus}
                                </Badge>
                              </div>
                            )}
                            {currentDelivery && (
                              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-400/30 rounded">
                                <p className="text-yellow-300 text-xs font-mono">
                                  CURRENT MISSION: {currentDelivery.orderNumber}
                                </p>
                                <p className="text-yellow-200 text-xs">
                                  {currentDelivery.clientName}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="quantum-card border-cyan-500/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        Delivery Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-300">On-Time Rate</span>
                          <span className="text-white font-mono text-xl">94.2%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{ width: '94.2%' }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-cyan-300">Avg Delivery Time</p>
                            <p className="text-white font-mono">42 min</p>
                          </div>
                          <div>
                            <p className="text-cyan-300">Success Rate</p>
                            <p className="text-white font-mono">99.1%</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="quantum-card border-cyan-500/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-400" />
                        Route Efficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-300">Fuel Efficiency</span>
                          <span className="text-white font-mono text-xl">87%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-purple-400 h-2 rounded-full" style={{ width: '87%' }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-cyan-300">Avg Distance</p>
                            <p className="text-white font-mono">23.4 km</p>
                          </div>
                          <div>
                            <p className="text-cyan-300">Cost per km</p>
                            <p className="text-white font-mono">₱18.50</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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