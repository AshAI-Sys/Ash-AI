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
  Car, 
  Navigation, 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Camera, 
  DollarSign, 
  FileText, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Fuel,
  Receipt,
  QrCode,
  PlayCircle,
  Square,
  Route,
  Timer,
  Zap
} from "lucide-react"

interface Trip {
  id: string
  status: string
  startedAt: string | null
  endedAt: string | null
  odoStart: number | null
  odoEnd: number | null
  shipment: {
    shipmentNumber: string
    recipientName: string
    order?: {
      orderNumber: string
      clientName: string
    }
  }
  driver: {
    name: string
  }
  vehicle: {
    plateNumber: string
    type: string
  }
  stops: TripStop[]
  expenses: TripExpense[]
}

interface TripStop {
  id: string
  stopNo: number
  consigneeName: string
  address: any
  phone: string | null
  status: string
  eta: string | null
  arrivedAt: string | null
  departedAt: string | null
  failReason: string | null
  stopCartons: StopCarton[]
}

interface StopCarton {
  id: string
  cartonId: string
  scannedOutAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  carton: {
    cartonNumber: string
    qrCode: string
    weightKg: number
  }
}

interface TripExpense {
  id: string
  type: string
  amount: number
  receiptUrl: string | null
  created_at: string
}

const EXPENSE_TYPES = [
  { value: "FUEL", label: "Fuel", icon: Fuel },
  { value: "TOLL", label: "Toll", icon: DollarSign },
  { value: "PARKING", label: "Parking", icon: Car },
  { value: "REPAIR", label: "Repair", icon: AlertTriangle },
  { value: "OTHER", label: "Other", icon: Receipt }
]

export default function DriverPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("current")
  const [selectedStop, setSelectedStop] = useState<TripStop | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showPODForm, setShowPODForm] = useState(false)
  const [showScanCarton, setShowScanCarton] = useState(false)

  // Forms
  const [startTripForm, setStartTripForm] = useState({ odoStart: 0 })
  const [endTripForm, setEndTripForm] = useState({ odoEnd: 0 })
  const [expenseForm, setExpenseForm] = useState({
    type: "",
    amount: 0,
    receiptUrl: ""
  })
  const [podForm, setPODForm] = useState({
    recipientName: "",
    signatureUrl: "",
    photoUrl: "",
    deliveryAction: "DELIVER", // DELIVER or FAIL
    failReason: ""
  })
  const [scanForm, setScanForm] = useState({ qrCode: "" })

  // Mock current driver (in production, get from auth context)
  const currentDriverId = "driver1"

  useEffect(() => {
    fetchTrips()
    const interval = setInterval(fetchTrips, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/delivery/trips?driverId=${currentDriverId}`)
      
      if (response.ok) {
        const data = await response.json()
        const fetchedTrips = data.data || []
        setTrips(fetchedTrips)
        
        // Set active trip
        const currentActiveTrip = fetchedTrips.find((trip: Trip) => trip.status === "IN_PROGRESS")
        setActiveTrip(currentActiveTrip || null)
      }
    } catch (error) {
      console.error("Error fetching trips:", error)
    } finally {
      setLoading(false)
    }
  }

  const startTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/delivery/trips/${tripId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ odoStart: startTripForm.odoStart })
      })

      if (response.ok) {
        await fetchTrips()
        setStartTripForm({ odoStart: 0 })
      }
    } catch (error) {
      console.error("Error starting trip:", error)
    }
  }

  const endTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/delivery/trips/${tripId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ odoEnd: endTripForm.odoEnd })
      })

      if (response.ok) {
        await fetchTrips()
        setEndTripForm({ odoEnd: 0 })
      }
    } catch (error) {
      console.error("Error ending trip:", error)
    }
  }

  const scanCarton = async (tripStopId: string) => {
    try {
      // In production, this would validate the QR code against stop cartons
      console.log("Scanning carton:", scanForm.qrCode, "for stop:", tripStopId)
      
      // Simulate scan success
      setScanForm({ qrCode: "" })
      setShowScanCarton(false)
      await fetchTrips()
    } catch (error) {
      console.error("Error scanning carton:", error)
    }
  }

  const submitPOD = async () => {
    try {
      if (!selectedStop || !activeTrip) return

      const response = await fetch("/api/delivery/pod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentId: activeTrip.shipment ? activeTrip.id : "", // Assuming shipment relation
          tripId: activeTrip.id,
          tripStopId: selectedStop.id,
          recipientName: podForm.recipientName,
          signatureUrl: podForm.signatureUrl,
          photoUrl: podForm.photoUrl,
          deliveryAction: podForm.deliveryAction,
          failReason: podForm.failReason,
          geo: {
            lat: 14.5995, // Mock coordinates (Manila)
            lon: 120.9842,
            accuracy: 5
          }
        })
      })

      if (response.ok) {
        await fetchTrips()
        setShowPODForm(false)
        setPODForm({
          recipientName: "",
          signatureUrl: "",
          photoUrl: "",
          deliveryAction: "DELIVER",
          failReason: ""
        })
        setSelectedStop(null)
      }
    } catch (error) {
      console.error("Error submitting POD:", error)
    }
  }

  const addExpense = async () => {
    try {
      if (!activeTrip) return

      const response = await fetch(`/api/delivery/trips/${activeTrip.id}/expense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm)
      })

      if (response.ok) {
        await fetchTrips()
        setShowExpenseForm(false)
        setExpenseForm({
          type: "",
          amount: 0,
          receiptUrl: ""
        })
      }
    } catch (error) {
      console.error("Error adding expense:", error)
    }
  }

  const getStopStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500"
      case "DELIVERED": return "bg-green-500"
      case "FAILED": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getStopStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED": return CheckCircle
      case "FAILED": return XCircle
      default: return Clock
    }
  }

  const plannedTrips = trips.filter(trip => trip.status === "PLANNED")
  const completedTrips = trips.filter(trip => trip.status === "COMPLETED")

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading driver dashboard...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-muted-foreground">Manage your delivery trips and track progress</p>
        </div>
        
        {activeTrip && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowExpenseForm(true)}
            >
              <Receipt className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
        )}
      </div>

      {/* Active Trip Card */}
      {activeTrip && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Active Trip: {activeTrip.shipment.shipmentNumber}
              </CardTitle>
              <Badge className="bg-blue-500 text-white">IN PROGRESS</Badge>
            </div>
            <CardDescription>
              {activeTrip.shipment.order?.orderNumber} - {activeTrip.shipment.recipientName}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Car className="h-4 w-4" />
                  <span className="text-sm font-medium">Vehicle</span>
                </div>
                <div className="font-bold">{activeTrip.vehicle.plateNumber}</div>
                <div className="text-xs text-muted-foreground">{activeTrip.vehicle.type}</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Route className="h-4 w-4" />
                  <span className="text-sm font-medium">Stops</span>
                </div>
                <div className="font-bold">
                  {activeTrip.stops.filter(s => s.status === "DELIVERED").length}/{activeTrip.stops.length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm font-medium">Started</span>
                </div>
                <div className="font-bold">
                  {activeTrip.startedAt ? new Date(activeTrip.startedAt).toLocaleTimeString() : "Not started"}
                </div>
              </div>
            </div>

            {/* Trip Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Trip Progress</span>
                <span>
                  {activeTrip.stops.filter(s => s.status === "DELIVERED").length} of {activeTrip.stops.length} stops
                </span>
              </div>
              <Progress 
                value={(activeTrip.stops.filter(s => s.status === "DELIVERED").length / activeTrip.stops.length) * 100} 
                className="h-3" 
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex-1 gap-2">
                    <Square className="h-4 w-4" />
                    End Trip
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>End Trip</DialogTitle>
                    <DialogDescription>Enter the ending odometer reading</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Odometer End</Label>
                      <Input
                        type="number"
                        value={endTripForm.odoEnd}
                        onChange={(e) => setEndTripForm({ odoEnd: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <Button onClick={() => endTrip(activeTrip.id)} className="w-full">
                      End Trip
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" className="flex-1 gap-2">
                <Navigation className="h-4 w-4" />
                Navigate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stops List for Active Trip */}
      {activeTrip && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Stops</CardTitle>
            <CardDescription>Complete deliveries in order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrip.stops.sort((a, b) => a.stopNo - b.stopNo).map(stop => {
                const StatusIcon = getStopStatusIcon(stop.status)
                
                return (
                  <div key={stop.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {stop.stopNo}
                        </div>
                        <div>
                          <div className="font-medium">{stop.consigneeName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {typeof stop.address === 'object' ? 
                              `${stop.address.street}, ${stop.address.city}` : 
                              stop.address
                            }
                          </div>
                          {stop.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {stop.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStopStatusColor(stop.status)} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {stop.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Cartons for this stop */}
                    {stop.stopCartons.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-2">Cartons ({stop.stopCartons.length})</div>
                        <div className="grid grid-cols-3 gap-2">
                          {stop.stopCartons.map(stopCarton => (
                            <div key={stopCarton.id} className="p-2 bg-muted rounded text-xs">
                              <div className="font-mono">{stopCarton.carton.cartonNumber}</div>
                              <div className="text-muted-foreground">{stopCarton.carton.weightKg}kg</div>
                              {stopCarton.deliveredAt && (
                                <div className="text-green-600">✓ Delivered</div>
                              )}
                              {stopCarton.failedAt && (
                                <div className="text-red-600">✗ Failed</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {stop.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedStop(stop)
                            setShowScanCarton(true)
                          }}
                        >
                          <QrCode className="h-3 w-3 mr-1" />
                          Scan Cartons
                        </Button>
                        
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedStop(stop)
                            setPODForm(prev => ({ ...prev, recipientName: stop.consigneeName }))
                            setShowPODForm(true)
                          }}
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          Complete Delivery
                        </Button>
                      </div>
                    )}

                    {stop.status === "FAILED" && stop.failReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="font-medium text-red-800">Failed:</div>
                        <div className="text-red-700">{stop.failReason}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">Current Trip</TabsTrigger>
          <TabsTrigger value="planned">Planned Trips</TabsTrigger>
          <TabsTrigger value="history">Trip History</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {!activeTrip ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Trip</h3>
                <p className="text-muted-foreground mb-4">You don't have any active trips at the moment.</p>
                {plannedTrips.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You have {plannedTrips.length} planned trip{plannedTrips.length > 1 ? 's' : ''} waiting to start.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Your current active trip is shown above.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="planned">
          <div className="space-y-4">
            {plannedTrips.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Planned Trips</h3>
                  <p className="text-muted-foreground">No trips are scheduled for you at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              plannedTrips.map(trip => (
                <Card key={trip.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{trip.shipment.shipmentNumber}</CardTitle>
                      <Badge className="bg-yellow-500 text-white">PLANNED</Badge>
                    </div>
                    <CardDescription>
                      {trip.shipment.order?.orderNumber} - {trip.shipment.recipientName}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Vehicle</div>
                        <div className="font-medium">{trip.vehicle.plateNumber} ({trip.vehicle.type})</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Stops</div>
                        <div className="font-medium">{trip.stops.length} locations</div>
                      </div>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full gap-2">
                          <PlayCircle className="h-4 w-4" />
                          Start Trip
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start Trip</DialogTitle>
                          <DialogDescription>Enter the starting odometer reading</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Odometer Start</Label>
                            <Input
                              type="number"
                              value={startTripForm.odoStart}
                              onChange={(e) => setStartTripForm({ odoStart: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <Button onClick={() => startTrip(trip.id)} className="w-full">
                            Start Trip
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {completedTrips.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Trip History</h3>
                  <p className="text-muted-foreground">Your completed trips will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              completedTrips.map(trip => (
                <Card key={trip.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{trip.shipment.shipmentNumber}</CardTitle>
                      <Badge className="bg-green-500 text-white">COMPLETED</Badge>
                    </div>
                    <CardDescription>
                      Completed on {trip.endedAt ? new Date(trip.endedAt).toLocaleDateString() : 'Unknown'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">
                          {trip.startedAt && trip.endedAt ? 
                            `${Math.round((new Date(trip.endedAt).getTime() - new Date(trip.startedAt).getTime()) / (1000 * 60 * 60))}h` : 
                            'N/A'
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Distance</div>
                        <div className="font-medium">
                          {trip.odoStart && trip.odoEnd ? `${trip.odoEnd - trip.odoStart} km` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Expenses</div>
                        <div className="font-medium">
                          ₱{trip.expenses.reduce((sum, expense) => sum + expense.amount, 0)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Trip Expenses</CardTitle>
              <CardDescription>Track fuel, tolls, and other trip-related expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {activeTrip ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Current trip: {activeTrip.shipment.shipmentNumber}
                  </div>
                  
                  {activeTrip.expenses.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No expenses recorded for this trip.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeTrip.expenses.map(expense => {
                        const ExpenseIcon = EXPENSE_TYPES.find(t => t.value === expense.type)?.icon || Receipt
                        
                        return (
                          <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <ExpenseIcon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">
                                  {EXPENSE_TYPES.find(t => t.value === expense.type)?.label || expense.type}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(expense.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">₱{expense.amount}</div>
                              {expense.receiptUrl && (
                                <div className="text-xs text-muted-foreground">Receipt attached</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Start a trip to record expenses.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Form Dialog */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a trip-related expense</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Expense Type</Label>
              <Select value={expenseForm.type} onValueChange={(value) => setExpenseForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Amount (PHP)</Label>
              <Input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label>Receipt Photo (Optional)</Label>
              <Input
                type="url"
                placeholder="Receipt photo URL"
                value={expenseForm.receiptUrl}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, receiptUrl: e.target.value }))}
              />
            </div>
            
            <Button onClick={addExpense} className="w-full" disabled={!expenseForm.type || expenseForm.amount <= 0}>
              Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* POD Form Dialog */}
      <Dialog open={showPODForm} onOpenChange={setShowPODForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proof of Delivery</DialogTitle>
            <DialogDescription>Complete the delivery or mark as failed</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={podForm.deliveryAction === "DELIVER" ? "default" : "outline"}
                onClick={() => setPODForm(prev => ({ ...prev, deliveryAction: "DELIVER" }))}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Delivered
              </Button>
              <Button
                variant={podForm.deliveryAction === "FAIL" ? "default" : "outline"}
                onClick={() => setPODForm(prev => ({ ...prev, deliveryAction: "FAIL" }))}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Failed
              </Button>
            </div>

            <div>
              <Label>Recipient Name</Label>
              <Input
                value={podForm.recipientName}
                onChange={(e) => setPODForm(prev => ({ ...prev, recipientName: e.target.value }))}
              />
            </div>

            {podForm.deliveryAction === "FAIL" && (
              <div>
                <Label>Failure Reason</Label>
                <Select value={podForm.failReason} onValueChange={(value) => setPODForm(prev => ({ ...prev, failReason: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recipient_unavailable">Recipient Unavailable</SelectItem>
                    <SelectItem value="wrong_address">Wrong Address</SelectItem>
                    <SelectItem value="refused_delivery">Refused Delivery</SelectItem>
                    <SelectItem value="access_restricted">Access Restricted</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Photo</Label>
              <Input
                type="url"
                placeholder="Photo URL"
                value={podForm.photoUrl}
                onChange={(e) => setPODForm(prev => ({ ...prev, photoUrl: e.target.value }))}
              />
            </div>

            {podForm.deliveryAction === "DELIVER" && (
              <div>
                <Label>Signature</Label>
                <Input
                  type="url"
                  placeholder="Signature URL"
                  value={podForm.signatureUrl}
                  onChange={(e) => setPODForm(prev => ({ ...prev, signatureUrl: e.target.value }))}
                />
              </div>
            )}

            <Button onClick={submitPOD} className="w-full" disabled={!podForm.recipientName}>
              Submit POD
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scan Carton Dialog */}
      <Dialog open={showScanCarton} onOpenChange={setShowScanCarton}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Cartons</DialogTitle>
            <DialogDescription>Scan carton QR codes for this stop</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>QR Code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter QR code"
                  value={scanForm.qrCode}
                  onChange={(e) => setScanForm({ qrCode: e.target.value })}
                />
                <Button onClick={() => selectedStop && scanCarton(selectedStop.id)}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}