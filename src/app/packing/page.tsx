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
import { Progress } from "@/components/ui/progress"
import { 
  Package, 
  Box, 
  Truck, 
  QrCode, 
  Barcode, 
  Scale, 
  Ruler, 
  PackageCheck,
  Zap,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Ship,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin
} from "lucide-react"

interface Carton {
  id: string
  cartonNumber: string
  order_id: string | null
  status: string
  dimensions: {
    length_cm: number
    width_cm: number
    height_cm: number
  }
  weightKg: number
  maxWeightKg: number | null
  qrCode: string
  barcode: string | null
  sealedAt: string | null
  created_at: string
  order?: {
    orderNumber: string
    clientName: string
  }
  contents: FinishedUnit[]
  cartonContents: CartonContent[]
  shipment?: {
    shipmentNumber: string
    status: string
    trackingNumber: string | null
  }
}

interface FinishedUnit {
  id: string
  sku: string
  sizeCode: string
  colorCode: string
  status: string
}

interface CartonContent {
  id: string
  sku: string
  qty: number
  weightKg: number | null
}

interface OptimizationResult {
  cartons: PackingSolution[]
  totalCartons: number
  avgUtilization: number
  estimatedCost: number
}

interface PackingSolution {
  carton_type: string
  contents: { sku: string; qty: number }[]
  utilization: number
  weight: number
}

const CARTON_TYPES = [
  { name: "Small", length_cm: 30, width_cm: 20, height_cm: 15, max_weight_kg: 5, cost: 25 },
  { name: "Medium", length_cm: 40, width_cm: 30, height_cm: 20, max_weight_kg: 10, cost: 35 },
  { name: "Large", length_cm: 50, width_cm: 40, height_cm: 30, max_weight_kg: 20, cost: 50 },
  { name: "XL", length_cm: 60, width_cm: 50, height_cm: 40, max_weight_kg: 30, cost: 75 }
]

const STATUS_COLORS = {
  "EMPTY": "bg-gray-500",
  "PARTIAL": "bg-yellow-500",
  "FULL": "bg-blue-500",
  "SEALED": "bg-green-500",
  "SHIPPED": "bg-purple-500"
}

export default function PackingPage() {
  const [cartons, setCartons] = useState<Carton[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("cartons")
  const [selectedCarton, setSelectedCarton] = useState<Carton | null>(null)
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)

  // New carton form
  const [newCarton, setNewCarton] = useState({
    order_id: "",
    cartonType: "Medium",
    maxWeightKg: 10,
    autoPackUnits: true
  })

  // Optimization form
  const [optimizationForm, setOptimizationForm] = useState({
    order_id: "",
    algorithm: "ASHLEY_AI"
  })

  const [filters, setFilters] = useState({
    status: "",
    order_id: ""
  })

  useEffect(() => {
    fetchCartons()
  }, [])

  const fetchCartons = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/packing")
      if (response.ok) {
        const data = await response.json()
        setCartons(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching cartons:", error)
    } finally {
      setLoading(false)
    }
  }

  const createCarton = async () => {
    try {
      const cartonType = CARTON_TYPES.find(ct => ct.name === newCarton.cartonType)
      if (!cartonType) return

      const response = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: newCarton.order_id || null,
          dimensions: {
            length_cm: cartonType.length_cm,
            width_cm: cartonType.width_cm,
            height_cm: cartonType.height_cm
          },
          maxWeightKg: newCarton.maxWeightKg,
          autoPackUnits: newCarton.autoPackUnits
        })
      })

      if (response.ok) {
        await fetchCartons()
        setNewCarton({
          order_id: "",
          cartonType: "Medium",
          maxWeightKg: 10,
          autoPackUnits: true
        })
      }
    } catch (error) {
      console.error("Error creating carton:", error)
    }
  }

  const sealCarton = async (cartonId: string) => {
    try {
      const response = await fetch("/api/packing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cartonId,
          status: "SEALED",
          sealedBy: "current-user-id" // TODO: Get from auth context
        })
      })

      if (response.ok) {
        await fetchCartons()
      }
    } catch (error) {
      console.error("Error sealing carton:", error)
    }
  }

  const runOptimization = async () => {
    try {
      const items = [
        // Mock data - in production, fetch from finished units
        { sku: "TEE-S-RED", qty: 10, length_cm: 25, width_cm: 20, height_cm: 2, weight_kg: 0.3 },
        { sku: "TEE-M-BLUE", qty: 15, length_cm: 27, width_cm: 22, height_cm: 2, weight_kg: 0.35 },
        { sku: "TEE-L-GREEN", qty: 8, length_cm: 30, width_cm: 25, height_cm: 2, weight_kg: 0.4 }
      ]

      const response = await fetch("/api/packing/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: optimizationForm.order_id,
          cartonTypes: CARTON_TYPES,
          items,
          algorithm: optimizationForm.algorithm
        })
      })

      if (response.ok) {
        const data = await response.json()
        setOptimizationResult(data.data.solution)
      }
    } catch (error) {
      console.error("Error running optimization:", error)
    }
  }

  const filteredCartons = cartons.filter(carton => {
    if (filters.status && carton.status !== filters.status) return false
    if (filters.order_id && carton.order_id !== filters.order_id) return false
    return true
  })

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-gray-500"
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 0.3) return "text-red-500"
    if (utilization < 0.7) return "text-yellow-500"
    return "text-green-500"
  }

  // Calculate metrics
  const totalCartons = cartons.length
  const emptyCartons = cartons.filter(c => c.status === "EMPTY").length
  const fullCartons = cartons.filter(c => c.status === "FULL").length
  const sealedCartons = cartons.filter(c => c.status === "SEALED").length
  const shippedCartons = cartons.filter(c => c.status === "SHIPPED").length

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading packing operations...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Packing & Cartonization</h1>
          <p className="text-muted-foreground">Optimize packing with Ashley AI and manage carton shipments</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowOptimizer(true)}
          >
            <Zap className="h-4 w-4" />
            Ashley AI Optimizer
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Carton
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Carton</DialogTitle>
                <DialogDescription>Set up a new carton for packing finished units</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="order">Order (Optional)</Label>
                  <Input
                    placeholder="Order ID"
                    value={newCarton.order_id}
                    onChange={(e) => setNewCarton(prev => ({ ...prev, order_id: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cartonType">Carton Type</Label>
                  <Select value={newCarton.cartonType} onValueChange={(value) => {
                    const type = CARTON_TYPES.find(ct => ct.name === value)
                    setNewCarton(prev => ({ 
                      ...prev, 
                      cartonType: value,
                      maxWeightKg: type?.max_weight_kg || 10
                    }))
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARTON_TYPES.map(type => (
                        <SelectItem key={type.name} value={type.name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{type.name}</span>
                            <span className="text-xs text-muted-foreground ml-4">
                              {type.length_cm}×{type.width_cm}×{type.height_cm}cm, {type.max_weight_kg}kg
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={newCarton.maxWeightKg}
                    onChange={(e) => setNewCarton(prev => ({ ...prev, maxWeightKg: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPack"
                    checked={newCarton.autoPackUnits}
                    onChange={(e) => setNewCarton(prev => ({ ...prev, autoPackUnits: e.target.checked }))}
                  />
                  <Label htmlFor="autoPack">Auto-pack available finished units</Label>
                </div>
                
                <Button onClick={createCarton} className="w-full">
                  Create Carton
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cartons</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCartons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empty</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptyCartons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full</CardTitle>
            <PackageCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullCartons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sealed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sealedCartons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippedCartons}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ashley AI Optimizer Dialog */}
      <Dialog open={showOptimizer} onOpenChange={setShowOptimizer}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Ashley AI Packing Optimizer
            </DialogTitle>
            <DialogDescription>
              Let Ashley AI optimize your packing for maximum efficiency and minimum cost
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order ID</Label>
                <Input
                  placeholder="Enter order ID"
                  value={optimizationForm.order_id}
                  onChange={(e) => setOptimizationForm(prev => ({ ...prev, order_id: e.target.value }))}
                />
              </div>
              <div>
                <Label>Algorithm</Label>
                <Select value={optimizationForm.algorithm} onValueChange={(value) => setOptimizationForm(prev => ({ ...prev, algorithm: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASHLEY_AI">Ashley AI (Recommended)</SelectItem>
                    <SelectItem value="BIN_PACKING">Traditional Bin Packing</SelectItem>
                    <SelectItem value="MANUAL">Manual Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={runOptimization} className="gap-2">
              <Zap className="h-4 w-4" />
              Run Optimization
            </Button>

            {optimizationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{optimizationResult.totalCartons}</div>
                    <div className="text-sm text-muted-foreground">Cartons Needed</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{Math.round(optimizationResult.avgUtilization * 100)}%</div>
                    <div className="text-sm text-muted-foreground">Avg Utilization</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₱{optimizationResult.estimatedCost}</div>
                    <div className="text-sm text-muted-foreground">Estimated Cost</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Packing Solution</h4>
                  {optimizationResult.cartons.map((carton, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{carton.carton_type}</Badge>
                        <span className={`text-sm ${getUtilizationColor(carton.utilization)}`}>
                          {Math.round(carton.utilization * 100)}% utilized
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Contents: {carton.contents.map(item => `${item.qty}× ${item.sku}`).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cartons">Carton Management</TabsTrigger>
          <TabsTrigger value="analytics">Packing Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="cartons" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Filter by Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="EMPTY">Empty</SelectItem>
                      <SelectItem value="PARTIAL">Partial</SelectItem>
                      <SelectItem value="FULL">Full</SelectItem>
                      <SelectItem value="SEALED">Sealed</SelectItem>
                      <SelectItem value="SHIPPED">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Order ID</Label>
                  <Input
                    placeholder="Filter by order"
                    value={filters.order_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, order_id: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={() => setFilters({ status: "", order_id: "" })}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cartons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCartons.map(carton => {
              const volume = carton.dimensions.length_cm * carton.dimensions.width_cm * carton.dimensions.height_cm / 1000 // liters
              const weightUtilization = carton.maxWeightKg ? (carton.weightKg / carton.maxWeightKg) * 100 : 0
              
              return (
                <Card key={carton.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{carton.cartonNumber}</CardTitle>
                      <Badge className={`${getStatusColor(carton.status)} text-white`}>
                        {carton.status}
                      </Badge>
                    </div>
                    {carton.order && (
                      <CardDescription>
                        {carton.order.orderNumber} - {carton.order.clientName}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Ruler className="h-3 w-3" />
                          Dimensions
                        </div>
                        <div className="font-mono">
                          {carton.dimensions.length_cm}×{carton.dimensions.width_cm}×{carton.dimensions.height_cm}cm
                        </div>
                        <div className="text-xs text-muted-foreground">{volume.toFixed(1)}L volume</div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Scale className="h-3 w-3" />
                          Weight
                        </div>
                        <div>{carton.weightKg.toFixed(2)}kg</div>
                        {carton.maxWeightKg && (
                          <div className="text-xs text-muted-foreground">
                            {weightUtilization.toFixed(0)}% capacity
                          </div>
                        )}
                      </div>
                    </div>

                    {weightUtilization > 0 && (
                      <Progress value={weightUtilization} className="h-2" />
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <QrCode className="h-3 w-3" />
                        <code>{carton.qrCode.substring(0, 10)}...</code>
                      </div>
                      {carton.barcode && (
                        <div className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          <code>{carton.barcode}</code>
                        </div>
                      )}
                    </div>

                    {carton.cartonContents.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Contents:</div>
                        {carton.cartonContents.map(content => (
                          <div key={content.id} className="text-xs text-muted-foreground">
                            {content.qty}× {content.sku}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedCarton(carton)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      {(carton.status === "FULL" || carton.status === "PARTIAL") && (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => sealCarton(carton.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Seal
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Packing Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {CARTON_TYPES.map(type => {
                  const typeCartons = cartons.filter(c => 
                    c.dimensions.length_cm === type.length_cm &&
                    c.dimensions.width_cm === type.width_cm &&
                    c.dimensions.height_cm === type.height_cm
                  )
                  const utilization = typeCartons.length > 0 ? 
                    typeCartons.reduce((sum, c) => sum + (c.maxWeightKg ? c.weightKg / c.maxWeightKg : 0), 0) / typeCartons.length * 100 : 0

                  return (
                    <div key={type.name} className="space-y-2">
                      <div className="flex justify-between">
                        <span>{type.name} Cartons</span>
                        <span className="text-sm text-muted-foreground">
                          {typeCartons.length} units, {utilization.toFixed(1)}% avg
                        </span>
                      </div>
                      <Progress value={utilization} className="h-2" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(STATUS_COLORS).map(status => {
                  const count = cartons.filter(c => c.status === status).length
                  const percentage = totalCartons > 0 ? (count / totalCartons) * 100 : 0
                  
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between">
                        <span>{status.toLowerCase().replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">
                          {count} cartons ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Carton Detail Dialog */}
      <Dialog open={!!selectedCarton} onOpenChange={() => setSelectedCarton(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedCarton?.cartonNumber}
            </DialogTitle>
            <DialogDescription>
              Carton details and contents
            </DialogDescription>
          </DialogHeader>
          
          {selectedCarton && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={`${getStatusColor(selectedCarton.status)} text-white`}>
                      {selectedCarton.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Dimensions</Label>
                    <p className="font-mono">
                      {selectedCarton.dimensions.length_cm} × {selectedCarton.dimensions.width_cm} × {selectedCarton.dimensions.height_cm} cm
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Weight</Label>
                    <p>{selectedCarton.weightKg.toFixed(2)} kg</p>
                    {selectedCarton.maxWeightKg && (
                      <Progress 
                        value={(selectedCarton.weightKg / selectedCarton.maxWeightKg) * 100} 
                        className="h-2 mt-1" 
                      />
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">QR Code</Label>
                    <p className="font-mono text-sm">{selectedCarton.qrCode}</p>
                  </div>
                  
                  {selectedCarton.barcode && (
                    <div>
                      <Label className="text-sm font-medium">Barcode</Label>
                      <p className="font-mono text-sm">{selectedCarton.barcode}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p>{new Date(selectedCarton.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selectedCarton.cartonContents.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Contents</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCarton.cartonContents.map(content => (
                        <TableRow key={content.id}>
                          <TableCell className="font-mono">{content.sku}</TableCell>
                          <TableCell>{content.qty}</TableCell>
                          <TableCell>{content.weightKg?.toFixed(2) || "—"} kg</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedCarton.shipment && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">Shipment Information</span>
                  </div>
                  <p className="text-sm">
                    {selectedCarton.shipment.shipmentNumber} - {selectedCarton.shipment.status}
                  </p>
                  {selectedCarton.shipment.trackingNumber && (
                    <p className="text-sm font-mono">
                      Tracking: {selectedCarton.shipment.trackingNumber}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}