// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Car, 
  Navigation, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Eye,
  Settings,
  Zap,
  Route,
  DollarSign,
  Timer
} from "lucide-react"

interface Shipment {
  id: string
  shipmentNumber: string
  status: string
  recipientName: string
  recipientPhone: string
  recipientAddress: any
  totalWeightKg: number
  totalCartons: number
  estimatedCost: number | null
  pickupDate: string | null
  estimatedETA: string | null
  order?: {
    orderNumber: string
    clientName: string
  }
  cartons: Carton[]
  trips: Trip[]
  carrierBookings: CarrierBooking[]
}

interface Carton {
  id: string
  cartonNumber: string
  weightKg: number
  qrCode: string
}

interface Trip {
  id: string
  status: string
  startedAt: string | null
  endedAt: string | null
  driver: {
    name: string
  }
  vehicle: {
    plateNumber: string
    type: string
  }
  stops: TripStop[]
}

interface TripStop {
  id: string
  stopNo: number
  consigneeName: string
  address: any
  status: string
  eta: string | null
}

interface CarrierBooking {
  id: string
  provider: string
  status: string
  bookingRef: string | null
  trackingNumber: string | null
}

interface Vehicle {
  id: string
  plateNumber: string
  type: string
  active: boolean
}

interface Driver {
  id: string
  name: string
  email: string
  active: boolean
}

const STATUS_COLORS = {
  "DRAFT": "bg-gray-500",
  "CONFIRMED": "bg-blue-500",
  "PICKED_UP": "bg-yellow-500",
  "IN_TRANSIT": "bg-orange-500",
  "DELIVERED": "bg-green-500",
  "CANCELLED": "bg-red-500",
  "RETURNED": "bg-purple-500"
}

const TRIP_STATUS_COLORS = {
  "PLANNED": "bg-gray-500",
  "IN_PROGRESS": "bg-blue-500",
  "COMPLETED": "bg-green-500",
  "CANCELLED": "bg-red-500"
}

export default function DispatchPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("board")
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [showAssignDriver, setShowAssignDriver] = useState(false)
  const [show3PLQuotes, setShow3PLQuotes] = useState(false)
  const [quotes, setQuotes] = useState<any[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(false)

  // Assignment form
  const [driverAssignment, setDriverAssignment] = useState({
    shipmentId: "",
    driverId: "",
    vehicleId: "",
    stops: [] as any[]
  })

  const [filters, setFilters] = useState({
    status: "",
    date: "",
    driver: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [shipmentsResponse, vehiclesResponse, driversResponse] = await Promise.all([
        fetch("/api/shipments"),
        fetch("/api/vehicles?active=true"),
        fetch("/api/users?role=DRIVER")
      ])

      if (shipmentsResponse.ok) {
        const shipmentsData = await shipmentsResponse.json()
        setShipments(shipmentsData.data || [])
      }

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json()
        setVehicles(vehiclesData.data || [])
      } else {
        // Fallback mock data
        setVehicles([
          { id: "1", plateNumber: "ABC-123", type: "Van", active: true },
          { id: "2", plateNumber: "XYZ-789", type: "Motorcycle", active: true },
          { id: "3", plateNumber: "DEF-456", type: "Truck", active: true }
        ])
      }

      if (driversResponse.ok) {
        const driversData = await driversResponse.json()
        setDrivers(driversData.data || [])
      } else {
        // Fallback mock data
        setDrivers([
          { id: "driver1", name: "Juan Cruz", email: "juan@example.com", active: true },
          { id: "driver2", name: "Maria Santos", email: "maria@example.com", active: true },
          { id: "driver3", name: "Pedro Garcia", email: "pedro@example.com", active: true }
        ])
      }

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const assignDriver = async () => {
    try {
      const response = await fetch(`/api/shipments/${driverAssignment.shipmentId}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driverAssignment.driverId,
          vehicleId: driverAssignment.vehicleId,
          stops: driverAssignment.stops
        })
      })

      if (response.ok) {
        await fetchData()
        setShowAssignDriver(false)
        setDriverAssignment({
          shipmentId: "",
          driverId: "",
          vehicleId: "",
          stops: []
        })
      }
    } catch (error) {
      console.error("Error assigning driver:", error)
    }
  }

  const get3PLQuotes = async (shipmentId: string) => {
    try {
      setLoadingQuotes(true)
      const response = await fetch(`/api/delivery/3pl?shipmentId=${shipmentId}`)
      
      if (response.ok) {
        const data = await response.json()
        setQuotes(data.data.quotes || [])
        setShow3PLQuotes(true)
      }
    } catch (error) {
      console.error("Error getting 3PL quotes:", error)
    } finally {
      setLoadingQuotes(false)
    }
  }

  const book3PLShipment = async (shipmentId: string, provider: string, quote: any) => {
    try {
      const response = await fetch("/api/delivery/3pl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentId,
          provider,
          selectedQuote: quote
        })
      })

      if (response.ok) {
        await fetchData()
        setShow3PLQuotes(false)
        setQuotes([])
      }
    } catch (error) {
      console.error("Error booking 3PL shipment:", error)
    }
  }

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-gray-500"
  }

  const getTripStatusColor = (status: string) => {
    return TRIP_STATUS_COLORS[status as keyof typeof TRIP_STATUS_COLORS] || "bg-gray-500"
  }

  const filteredShipments = shipments.filter(shipment => {
    if (filters.status && shipment.status !== filters.status) return false
    if (filters.driver && !shipment.trips.some(trip => trip.driver.name.toLowerCase().includes(filters.driver.toLowerCase()))) return false
    return true
  })

  // Calculate metrics
  const totalShipments = shipments.length
  const readyForDispatch = shipments.filter(s => s.status === "CONFIRMED").length
  const inTransit = shipments.filter(s => s.status === "IN_TRANSIT").length
  const delivered = shipments.filter(s => s.status === "DELIVERED").length

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dispatch board...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispatch Board</h1>
          <p className="text-muted-foreground">Manage deliveries, assign drivers, and track shipments</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              // Ashley AI optimization coming soon
            }}
          >
            <Zap className="h-4 w-4" />
            Ashley AI Optimize
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShipments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Dispatch</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyForDispatch}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransit}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="board">Dispatch Board</TabsTrigger>
          <TabsTrigger value="trips">Active Trips</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Status Filter</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="CONFIRMED">Ready for Dispatch</SelectItem>
                      <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Driver</Label>
                  <Input
                    placeholder="Search driver..."
                    value={filters.driver}
                    onChange={(e) => setFilters(prev => ({ ...prev, driver: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={() => setFilters({ status: "", date: "", driver: "" })}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shipments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShipments.map(shipment => (
              <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{shipment.shipmentNumber}</CardTitle>
                    <Badge className={`${getStatusColor(shipment.status)} text-white`}>
                      {shipment.status}
                    </Badge>
                  </div>
                  {shipment.order && (
                    <CardDescription>
                      {shipment.order.orderNumber} - {shipment.order.clientName}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>{shipment.recipientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{shipment.recipientPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">
                        {typeof shipment.recipientAddress === 'object' ? 
                          `${shipment.recipientAddress.street}, ${shipment.recipientAddress.city}` :
                          shipment.recipientAddress
                        }
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Weight</div>
                      <div className="font-medium">{shipment.totalWeightKg.toFixed(1)} kg</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cartons</div>
                      <div className="font-medium">{shipment.totalCartons}</div>
                    </div>
                  </div>

                  {shipment.estimatedETA && (
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4" />
                      <span>ETA: {new Date(shipment.estimatedETA).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Trip Information */}
                  {shipment.trips.length > 0 && (
                    <div className="space-y-2">
                      {shipment.trips.map(trip => (
                        <div key={trip.id} className="p-2 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getTripStatusColor(trip.status)} text-white text-xs`}>
                                {trip.status}
                              </Badge>
                              <span className="text-sm font-medium">{trip.driver.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {trip.vehicle.plateNumber}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {trip.stops.length} stops
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3PL Booking Information */}
                  {shipment.carrierBookings.length > 0 && (
                    <div className="space-y-1">
                      {shipment.carrierBookings.map(booking => (
                        <div key={booking.id} className="p-2 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{booking.provider}</div>
                            <Badge variant="outline">{booking.status}</Badge>
                          </div>
                          {booking.trackingNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {booking.trackingNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    
                    {shipment.status === "CONFIRMED" && shipment.trips.length === 0 && (
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setDriverAssignment(prev => ({ 
                              ...prev, 
                              shipmentId: shipment.id,
                              stops: [{
                                consigneeName: shipment.recipientName,
                                address: shipment.recipientAddress,
                                phone: shipment.recipientPhone,
                                cartonIds: shipment.cartons.map(c => c.id)
                              }]
                            }))
                            setShowAssignDriver(true)
                          }}
                        >
                          <User className="h-3 w-3 mr-1" />
                          Assign Driver
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => get3PLQuotes(shipment.id)}
                          disabled={loadingQuotes}
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          3PL
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Trips</CardTitle>
              <CardDescription>Monitor ongoing deliveries and driver activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.flatMap(s => s.trips).filter(trip => trip.status !== "COMPLETED").map(trip => {
                    const completedStops = trip.stops.filter(stop => stop.status === "DELIVERED").length
                    const totalStops = trip.stops.length
                    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0
                    
                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-mono">{trip.id.substring(0, 8)}</TableCell>
                        <TableCell>{trip.driver.name}</TableCell>
                        <TableCell>{trip.vehicle.plateNumber}</TableCell>
                        <TableCell>
                          <Badge className={`${getTripStatusColor(trip.status)} text-white`}>
                            {trip.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{completedStops}/{totalStops}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">{Math.round(progress)}%</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Navigation className="h-3 w-3 mr-1" />
                            Track
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>On-time Delivery</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>First Attempt Success</span>
                    <span className="font-medium">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Customer Satisfaction</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₱2,450</div>
                    <div className="text-sm text-muted-foreground">Avg Cost per Delivery</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₱15.50</div>
                    <div className="text-sm text-muted-foreground">Cost per KM</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Driver Costs</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3PL Costs</span>
                    <span className="font-medium">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel & Maintenance</span>
                    <span className="font-medium">5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Driver Assignment Dialog */}
      <Dialog open={showAssignDriver} onOpenChange={setShowAssignDriver}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>Assign a driver and vehicle for this delivery</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Driver</Label>
                <Select value={driverAssignment.driverId} onValueChange={(value) => setDriverAssignment(prev => ({ ...prev, driverId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.active).map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Vehicle</Label>
                <Select value={driverAssignment.vehicleId} onValueChange={(value) => setDriverAssignment(prev => ({ ...prev, vehicleId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.active).map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plateNumber} ({vehicle.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={assignDriver} className="w-full" disabled={!driverAssignment.driverId || !driverAssignment.vehicleId}>
              Assign Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3PL Quotes Dialog */}
      <Dialog open={show3PLQuotes} onOpenChange={setShow3PLQuotes}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>3PL Delivery Quotes</DialogTitle>
            <DialogDescription>Compare rates and book with third-party logistics providers</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingQuotes ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Getting quotes...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotes.map((quote, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{quote.provider}</CardTitle>
                        <div className="text-2xl font-bold">₱{quote.price}</div>
                      </div>
                      <CardDescription>{quote.serviceName}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>ETA:</span>
                          <span>{new Date(quote.estimatedETA).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pickup:</span>
                          <span>{quote.pickupTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Weight:</span>
                          <span>{quote.maxWeight} kg</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {quote.features.map((feature: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => book3PLShipment(selectedShipment?.id || "", quote.provider.toLowerCase(), quote)}
                      >
                        Book with {quote.provider}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipment Detail Dialog */}
      <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Shipment Details: {selectedShipment?.shipmentNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedShipment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Recipient</Label>
                    <p>{selectedShipment.recipientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedShipment.recipientPhone}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm">
                      {typeof selectedShipment.recipientAddress === 'object' ? 
                        `${selectedShipment.recipientAddress.street}, ${selectedShipment.recipientAddress.city}, ${selectedShipment.recipientAddress.state}` :
                        selectedShipment.recipientAddress
                      }
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Shipment Info</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Weight: {selectedShipment.totalWeightKg} kg</div>
                      <div>Cartons: {selectedShipment.totalCartons}</div>
                      <div>Status: <Badge className={`${getStatusColor(selectedShipment.status)} text-white`}>{selectedShipment.status}</Badge></div>
                      <div>Cost: {selectedShipment.estimatedCost ? `₱${selectedShipment.estimatedCost}` : "TBD"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedShipment.cartons.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Cartons</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedShipment.cartons.map(carton => (
                      <div key={carton.id} className="p-2 bg-muted rounded text-sm">
                        <div className="font-mono">{carton.cartonNumber}</div>
                        <div className="text-xs text-muted-foreground">{carton.weightKg} kg</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}