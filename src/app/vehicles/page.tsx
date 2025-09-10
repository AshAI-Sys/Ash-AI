"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Car, 
  Truck, 
  Bike, 
  Fuel, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Edit,
  Eye,
  Settings
} from "lucide-react"

interface Vehicle {
  id: string
  plateNumber: string
  type: string
  active: boolean
  created_at: string
  // Extended properties
  brand?: string
  model?: string
  year?: number
  fuelType?: string
  lastMaintenance?: string
  nextMaintenance?: string
  registrationExpiry?: string
  insuranceExpiry?: string
  odoReading?: number
}

const VEHICLE_TYPES = [
  { value: "Van", label: "Van", icon: Car },
  { value: "Truck", label: "Truck", icon: Truck },
  { value: "Motorcycle", label: "Motorcycle", icon: Bike }
]

const FUEL_TYPES = [
  { value: "GASOLINE", label: "Gasoline" },
  { value: "DIESEL", label: "Diesel" },
  { value: "ELECTRIC", label: "Electric" }
]

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

  // New vehicle form
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: "",
    type: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    fuelType: "GASOLINE"
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      // Mock data since API might not exist yet
      const mockVehicles: Vehicle[] = [
        {
          id: "1",
          plateNumber: "ABC-123",
          type: "Van",
          active: true,
          created_at: new Date().toISOString(),
          brand: "Toyota",
          model: "Hiace",
          year: 2020,
          fuelType: "DIESEL",
          odoReading: 45000,
          registrationExpiry: "2025-03-15",
          insuranceExpiry: "2025-01-20",
          lastMaintenance: "2024-08-15",
          nextMaintenance: "2024-11-15"
        },
        {
          id: "2",
          plateNumber: "XYZ-789",
          type: "Motorcycle",
          active: true,
          created_at: new Date().toISOString(),
          brand: "Honda",
          model: "Click 150i",
          year: 2022,
          fuelType: "GASOLINE",
          odoReading: 12000,
          registrationExpiry: "2025-05-10",
          insuranceExpiry: "2025-02-28",
          lastMaintenance: "2024-09-01",
          nextMaintenance: "2024-12-01"
        },
        {
          id: "3",
          plateNumber: "DEF-456",
          type: "Truck",
          active: true,
          created_at: new Date().toISOString(),
          brand: "Isuzu",
          model: "ELF",
          year: 2019,
          fuelType: "DIESEL",
          odoReading: 78000,
          registrationExpiry: "2024-12-30",
          insuranceExpiry: "2025-04-15",
          lastMaintenance: "2024-07-20",
          nextMaintenance: "2024-10-20"
        }
      ]
      setVehicles(mockVehicles)
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    } finally {
      setLoading(false)
    }
  }

  const addVehicle = async () => {
    try {
      // In production, this would make an API call
      const vehicle: Vehicle = {
        id: Date.now().toString(),
        plateNumber: newVehicle.plateNumber,
        type: newVehicle.type,
        active: true,
        created_at: new Date().toISOString(),
        brand: newVehicle.brand,
        model: newVehicle.model,
        year: newVehicle.year,
        fuelType: newVehicle.fuelType,
        odoReading: 0
      }
      
      setVehicles(prev => [...prev, vehicle])
      setShowAddVehicle(false)
      setNewVehicle({
        plateNumber: "",
        type: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        fuelType: "GASOLINE"
      })
    } catch (error) {
      console.error("Error adding vehicle:", error)
    }
  }

  const getVehicleIcon = (type: string) => {
    const vehicleType = VEHICLE_TYPES.find(vt => vt.value === type)
    return vehicleType?.icon || Car
  }

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: "unknown", color: "bg-gray-500" }
    
    const expiry = new Date(expiryDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) return { status: "expired", color: "bg-red-500" }
    if (daysUntilExpiry <= 30) return { status: "expiring", color: "bg-yellow-500" }
    return { status: "valid", color: "bg-green-500" }
  }

  const activeVehicles = vehicles.filter(v => v.active)
  const inactiveVehicles = vehicles.filter(v => !v.active)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading vehicles...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Management</h1>
          <p className="text-muted-foreground">Manage company vehicles, maintenance, and documentation</p>
        </div>
        
        <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>Register a new company vehicle</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plate Number</Label>
                  <Input
                    placeholder="ABC-123"
                    value={newVehicle.plateNumber}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, plateNumber: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Vehicle Type</Label>
                  <Select value={newVehicle.type} onValueChange={(value) => setNewVehicle(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(type => (
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Input
                    placeholder="Toyota"
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Model</Label>
                  <Input
                    placeholder="Hiace"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  />
                </div>
                
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={newVehicle.fuelType} onValueChange={(value) => setNewVehicle(prev => ({ ...prev, fuelType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(fuel => (
                        <SelectItem key={fuel.value} value={fuel.value}>
                          {fuel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={addVehicle} className="w-full" disabled={!newVehicle.plateNumber || !newVehicle.type}>
                Add Vehicle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Docs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicles.filter(v => {
                const regStatus = getExpiryStatus(v.registrationExpiry)
                const insStatus = getExpiryStatus(v.insuranceExpiry)
                return regStatus.status === "expiring" || insStatus.status === "expiring"
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vehicles.filter(v => {
                if (!v.nextMaintenance) return false
                const nextMaint = new Date(v.nextMaintenance)
                const now = new Date()
                return nextMaint <= now
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Fleet</CardTitle>
          <CardDescription>Complete list of company vehicles and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Maintenance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(vehicle => {
                const VehicleIcon = getVehicleIcon(vehicle.type)
                const regStatus = getExpiryStatus(vehicle.registrationExpiry)
                const insStatus = getExpiryStatus(vehicle.insuranceExpiry)
                
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <VehicleIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="font-medium">{vehicle.plateNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.brand} {vehicle.model}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>{vehicle.type}</TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div>{vehicle.year}</div>
                        <div className="text-muted-foreground">{vehicle.fuelType}</div>
                        {vehicle.odoReading && (
                          <div className="text-muted-foreground">{vehicle.odoReading.toLocaleString()} km</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${regStatus.color}`}></div>
                        <div className="text-sm">
                          {vehicle.registrationExpiry ? 
                            new Date(vehicle.registrationExpiry).toLocaleDateString() : 
                            "Not set"
                          }
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${insStatus.color}`}></div>
                        <div className="text-sm">
                          {vehicle.insuranceExpiry ? 
                            new Date(vehicle.insuranceExpiry).toLocaleDateString() : 
                            "Not set"
                          }
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {vehicle.nextMaintenance ? (
                          <div>
                            <div>Due: {new Date(vehicle.nextMaintenance).toLocaleDateString()}</div>
                            {vehicle.lastMaintenance && (
                              <div className="text-muted-foreground">
                                Last: {new Date(vehicle.lastMaintenance).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          "Not scheduled"
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={vehicle.active ? "default" : "secondary"}>
                        {vehicle.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedVehicle(vehicle)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vehicle Details Dialog */}
      <Dialog open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vehicle Details: {selectedVehicle?.plateNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedVehicle && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Vehicle Information</Label>
                    <div className="mt-2 space-y-1">
                      <p><strong>Type:</strong> {selectedVehicle.type}</p>
                      <p><strong>Brand:</strong> {selectedVehicle.brand}</p>
                      <p><strong>Model:</strong> {selectedVehicle.model}</p>
                      <p><strong>Year:</strong> {selectedVehicle.year}</p>
                      <p><strong>Fuel:</strong> {selectedVehicle.fuelType}</p>
                      {selectedVehicle.odoReading && (
                        <p><strong>Odometer:</strong> {selectedVehicle.odoReading.toLocaleString()} km</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Documentation Status</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Registration:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getExpiryStatus(selectedVehicle.registrationExpiry).color}`}></div>
                          <span className="text-sm">
                            {selectedVehicle.registrationExpiry ? 
                              new Date(selectedVehicle.registrationExpiry).toLocaleDateString() : 
                              "Not set"
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Insurance:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getExpiryStatus(selectedVehicle.insuranceExpiry).color}`}></div>
                          <span className="text-sm">
                            {selectedVehicle.insuranceExpiry ? 
                              new Date(selectedVehicle.insuranceExpiry).toLocaleDateString() : 
                              "Not set"
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Maintenance Schedule</Label>
                    <div className="mt-2 space-y-1">
                      {selectedVehicle.lastMaintenance && (
                        <p><strong>Last Service:</strong> {new Date(selectedVehicle.lastMaintenance).toLocaleDateString()}</p>
                      )}
                      {selectedVehicle.nextMaintenance && (
                        <p><strong>Next Service:</strong> {new Date(selectedVehicle.nextMaintenance).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}