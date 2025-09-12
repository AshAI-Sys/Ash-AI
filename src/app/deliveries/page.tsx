// @ts-nocheck
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Truck, MapPin, Clock, CheckCircle, Package, Plus } from 'lucide-react'
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
}

interface Vehicle {
  id: string
  plateNumber: string
  type: string
  driverName: string
  active: boolean
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
    scheduledAt: '2024-08-28 14:00',
    priority: 1,
    items: '100 Summer Collection T-Shirts'
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    clientName: 'XYZ Store',
    address: '456 Mall Ave, Quezon City',
    driverName: 'Pedro Santos',
    vehiclePlate: 'DEF-456',
    status: 'IN_TRANSIT',
    scheduledAt: '2024-08-28 10:00',
    startedAt: '2024-08-28 10:15',
    priority: 2,
    items: '50 Holiday Special Hoodies'
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    clientName: 'DEF Corp',
    address: '789 Office Tower, BGC',
    driverName: 'Juan Dela Cruz',
    vehiclePlate: 'ABC-123',
    status: 'DELIVERED',
    scheduledAt: '2024-08-27 13:00',
    startedAt: '2024-08-27 13:10',
    completedAt: '2024-08-27 15:30',
    priority: 1,
    items: '75 Corporate Polo Shirts',
    notes: 'Delivered to security desk, signed by Ms. Rodriguez'
  }
]

const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plateNumber: 'ABC-123',
    type: 'Van',
    driverName: 'Juan Dela Cruz',
    active: true
  },
  {
    id: '2',
    plateNumber: 'DEF-456',
    type: 'Motorcycle',
    driverName: 'Pedro Santos',
    active: true
  }
]

export default function DeliveriesPage() {
  const { data: session } = useSession()
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockDeliveries)
  const [vehicles] = useState<Vehicle[]>(mockVehicles)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')

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

  return (
    <ResponsiveLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isDriver ? 'My Deliveries' : 'Deliveries'}
            </h1>
            <p className="text-gray-600">
              {isDriver 
                ? 'Manage your assigned delivery routes and schedules'
                : 'Track and manage all delivery operations'
              }
            </p>
          </div>
          {!isDriver && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Delivery
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Scheduled</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{scheduledCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Transit</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{inTransitCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Delivered Today</CardDescription>
              <CardTitle className="text-2xl text-green-600">{todayDelivered}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Delivered</CardDescription>
              <CardTitle className="text-2xl">{deliveredCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'SCHEDULED', label: 'Scheduled' },
                  { value: 'IN_TRANSIT', label: 'In Transit' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
              />

              {!isDriver && (
                <Select
                  value={filterDriver}
                  onValueChange={setFilterDriver}
                  options={driverOptions}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deliveries List */}
        <div className="grid gap-4">
          {filteredDeliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-lg font-semibold">{delivery.orderNumber}</h3>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(delivery.priority)}>
                        Priority {delivery.priority}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">{delivery.clientName}</h4>
                      <p className="text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {delivery.address}
                      </p>
                      <p className="text-gray-600 mt-1">{delivery.items}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">Driver</p>
                        <p className="text-gray-600">{delivery.driverName}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Vehicle</p>
                        <p className="text-gray-600">{delivery.vehiclePlate}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Scheduled</p>
                        <p className="text-gray-600 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {delivery.scheduledAt}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {delivery.status === 'DELIVERED' ? 'Completed' : 
                           delivery.status === 'IN_TRANSIT' ? 'Started' : 'Status'}
                        </p>
                        <p className="text-gray-600">
                          {delivery.completedAt || delivery.startedAt || 'Not started'}
                        </p>
                      </div>
                    </div>

                    {delivery.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm">
                          <span className="font-medium">Notes:</span> {delivery.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {delivery.status === 'SCHEDULED' && isDriver && (
                      <Button 
                        onClick={() => handleStatusUpdate(delivery.id, 'IN_TRANSIT')}
                        size="sm"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Start Delivery
                      </Button>
                    )}
                    
                    {delivery.status === 'IN_TRANSIT' && isDriver && (
                      <Button 
                        onClick={() => handleStatusUpdate(delivery.id, 'DELIVERED')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Delivered
                      </Button>
                    )}

                    {delivery.status === 'DELIVERED' && (
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                        <p className="text-xs text-gray-600 mt-1">Completed</p>
                      </div>
                    )}

                    {!isDriver && delivery.status === 'SCHEDULED' && (
                      <Button variant="outline" size="sm">
                        Edit Schedule
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDeliveries.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries found</h3>
                <p className="text-gray-600">
                  {isDriver 
                    ? "You don't have any assigned deliveries at the moment."
                    : "No deliveries match the selected filters."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Vehicle Status (for non-drivers) */}
        {!isDriver && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Vehicle Status</CardTitle>
              <CardDescription>Current status of delivery vehicles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(vehicle => {
                  const currentDelivery = deliveries.find(d => 
                    d.vehiclePlate === vehicle.plateNumber && d.status === 'IN_TRANSIT'
                  )
                  
                  return (
                    <div key={vehicle.id} className="p-4 border rounded">
                      <div className="flex items-center gap-3 mb-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{vehicle.plateNumber}</p>
                          <p className="text-sm text-gray-600">{vehicle.type}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Driver: {vehicle.driverName}
                      </p>
                      <Badge className={currentDelivery ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                        {currentDelivery ? 'In Transit' : 'Available'}
                      </Badge>
                      {currentDelivery && (
                        <p className="text-xs text-gray-600 mt-1">
                          {currentDelivery.orderNumber} - {currentDelivery.clientName}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveLayout>
  )
}