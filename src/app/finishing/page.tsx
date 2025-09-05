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
  Package, 
  Scissors, 
  Zap, 
  Tags, 
  CheckCircle, 
  Clock, 
  User, 
  Package2, 
  Truck,
  QrCode,
  BarChart3,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin
} from "lucide-react"

interface FinishingRun {
  id: string
  orderId: string
  operationType: string
  operatorId: string
  startedAt: string | null
  endedAt: string | null
  materials: any[]
  notes: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    clientName: string
    apparelType: string
    quantity: number
  }
  operator: {
    id: string
    name: string
    email: string
  }
  finishedUnits: FinishedUnit[]
}

interface FinishedUnit {
  id: string
  sku: string
  sizeCode: string
  colorCode: string
  qrCode: string
  status: string
  cartonId: string | null
  finishedAt: string
  packedAt: string | null
}

interface Order {
  id: string
  orderNumber: string
  clientName: string
  apparelType: string
  quantity: number
  status: string
}

const OPERATION_TYPES = [
  { value: "TRIM_TAGS", label: "Trim Tags", icon: Scissors },
  { value: "STEAM_PRESS", label: "Steam Press", icon: Zap },
  { value: "FOLD_PACK", label: "Fold & Pack", icon: Package },
  { value: "ATTACH_LABELS", label: "Attach Labels", icon: Tags },
  { value: "QUALITY_CHECK", label: "Quality Check", icon: CheckCircle },
  { value: "IRONING", label: "Ironing", icon: Zap },
  { value: "SPOT_CLEANING", label: "Spot Cleaning", icon: CheckCircle },
  { value: "HAND_FINISHING", label: "Hand Finishing", icon: User }
]

const OPERATION_COLORS = {
  "TRIM_TAGS": "bg-blue-500",
  "STEAM_PRESS": "bg-orange-500", 
  "FOLD_PACK": "bg-green-500",
  "ATTACH_LABELS": "bg-purple-500",
  "QUALITY_CHECK": "bg-red-500",
  "IRONING": "bg-orange-400",
  "SPOT_CLEANING": "bg-cyan-500",
  "HAND_FINISHING": "bg-pink-500"
}

export default function FinishingPage() {
  const [finishingRuns, setFinishingRuns] = useState<FinishingRun[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("operations")
  const [filters, setFilters] = useState({
    operationType: "",
    operatorId: "",
    orderId: "",
    status: ""
  })

  // New operation form
  const [newOperation, setNewOperation] = useState({
    orderId: "",
    operationType: "",
    operatorId: "",
    materials: [],
    notes: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [runsResponse, ordersResponse] = await Promise.all([
        fetch("/api/finishing"),
        fetch("/api/orders?status=QC_PASSED")
      ])

      if (runsResponse.ok) {
        const runsData = await runsResponse.json()
        setFinishingRuns(runsData.data || [])
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setOrders(ordersData.data || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const startNewOperation = async () => {
    try {
      const response = await fetch("/api/finishing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOperation)
      })

      if (response.ok) {
        await fetchData()
        setNewOperation({
          orderId: "",
          operationType: "",
          operatorId: "",
          materials: [],
          notes: ""
        })
      }
    } catch (error) {
      console.error("Error starting operation:", error)
    }
  }

  const completeOperation = async (runId: string) => {
    try {
      const response = await fetch("/api/finishing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: runId,
          endedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error("Error completing operation:", error)
    }
  }

  const getOperationIcon = (operationType: string) => {
    const operation = OPERATION_TYPES.find(op => op.value === operationType)
    const IconComponent = operation?.icon || Package
    return <IconComponent className="h-4 w-4" />
  }

  const getOperationColor = (operationType: string) => {
    return OPERATION_COLORS[operationType as keyof typeof OPERATION_COLORS] || "bg-gray-500"
  }

  const filteredRuns = finishingRuns.filter(run => {
    if (filters.operationType && run.operationType !== filters.operationType) return false
    if (filters.operatorId && run.operatorId !== filters.operatorId) return false
    if (filters.orderId && run.orderId !== filters.orderId) return false
    return true
  })

  const activeRuns = filteredRuns.filter(run => !run.endedAt)
  const completedRuns = filteredRuns.filter(run => run.endedAt)

  // Calculate metrics
  const totalUnitsFinished = finishingRuns.reduce((sum, run) => sum + run.finishedUnits.length, 0)
  const unitsReadyForPacking = finishingRuns.reduce((sum, run) => 
    sum + run.finishedUnits.filter(unit => unit.status === "READY").length, 0
  )
  const unitsPacked = finishingRuns.reduce((sum, run) => 
    sum + run.finishedUnits.filter(unit => unit.status === "PACKED").length, 0
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading finishing operations...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Finishing & Packing</h1>
          <p className="text-muted-foreground">Manage final operations and prepare orders for shipment</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Start New Operation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start Finishing Operation</DialogTitle>
              <DialogDescription>Begin a new finishing operation for quality-passed orders</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order">Order</Label>
                  <Select value={newOperation.orderId} onValueChange={(value) => setNewOperation(prev => ({ ...prev, orderId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.clientName} ({order.quantity} pcs)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="operation">Operation Type</Label>
                  <Select value={newOperation.operationType} onValueChange={(value) => setNewOperation(prev => ({ ...prev, operationType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATION_TYPES.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <div className="flex items-center gap-2">
                            {getOperationIcon(op.value)}
                            {op.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="operator">Operator ID</Label>
                <Input
                  placeholder="Enter operator ID"
                  value={newOperation.operatorId}
                  onChange={(e) => setNewOperation(prev => ({ ...prev, operatorId: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  placeholder="Operation notes..."
                  value={newOperation.notes}
                  onChange={(e) => setNewOperation(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              
              <Button onClick={startNewOperation} className="w-full">
                Start Operation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRuns.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Finished</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnitsFinished}</div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Packing</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitsReadyForPacking}</div>
            <p className="text-xs text-muted-foreground">Units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packed Units</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitsPacked}</div>
            <p className="text-xs text-muted-foreground">Ready to ship</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="units">Finished Units</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={filters.operationType} onValueChange={(value) => setFilters(prev => ({ ...prev, operationType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Operations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Operations</SelectItem>
                    {OPERATION_TYPES.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.orderId} onValueChange={(value) => setFilters(prev => ({ ...prev, orderId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Orders</SelectItem>
                    {orders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Operator ID"
                  value={filters.operatorId}
                  onChange={(e) => setFilters(prev => ({ ...prev, operatorId: e.target.value }))}
                />

                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ operationType: "", operatorId: "", orderId: "", status: "" })}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Operations */}
          {activeRuns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeRuns.map(run => (
                    <div key={run.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge className={`${getOperationColor(run.operationType)} text-white`}>
                            {getOperationIcon(run.operationType)}
                            {OPERATION_TYPES.find(op => op.value === run.operationType)?.label}
                          </Badge>
                          <div>
                            <p className="font-medium">{run.order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">{run.order.clientName}</p>
                          </div>
                        </div>
                        <Button onClick={() => completeOperation(run.id)}>
                          Complete
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Operator</p>
                          <p>{run.operator.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Started</p>
                          <p>{run.startedAt ? new Date(run.startedAt).toLocaleString() : "Not started"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Units</p>
                          <p>{run.finishedUnits.length} finished</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Completed Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Recent Completed Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRuns.slice(0, 10).map(run => {
                    const duration = run.startedAt && run.endedAt ? 
                      Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / (1000 * 60)) : null
                    
                    return (
                      <TableRow key={run.id}>
                        <TableCell>
                          <Badge className={`${getOperationColor(run.operationType)} text-white`}>
                            {getOperationIcon(run.operationType)}
                            {OPERATION_TYPES.find(op => op.value === run.operationType)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{run.order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">{run.order.clientName}</p>
                          </div>
                        </TableCell>
                        <TableCell>{run.operator.name}</TableCell>
                        <TableCell>{duration ? `${duration} min` : "N/A"}</TableCell>
                        <TableCell>{run.finishedUnits.length}</TableCell>
                        <TableCell>{run.endedAt ? new Date(run.endedAt).toLocaleString() : "N/A"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Finished Units Management</CardTitle>
              <CardDescription>Track individual finished units and their packing status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>QR Code</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Finished</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishingRuns.flatMap(run => run.finishedUnits).slice(0, 20).map(unit => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          <code className="text-xs">{unit.qrCode.substring(0, 12)}...</code>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{unit.sku}</TableCell>
                      <TableCell>{unit.sizeCode}</TableCell>
                      <TableCell>{unit.colorCode}</TableCell>
                      <TableCell>
                        {finishingRuns.find(run => run.finishedUnits.some(u => u.id === unit.id))?.order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={unit.status === "READY" ? "default" : unit.status === "PACKED" ? "secondary" : "outline"}>
                          {unit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(unit.finishedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {unit.status === "READY" && (
                          <Button size="sm" variant="outline">
                            Pack
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Operation Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {OPERATION_TYPES.map(op => {
                    const opRuns = completedRuns.filter(run => run.operationType === op.value)
                    const avgDuration = opRuns.length > 0 ? 
                      opRuns.reduce((sum, run) => {
                        const duration = run.startedAt && run.endedAt ? 
                          (new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / (1000 * 60) : 0
                        return sum + duration
                      }, 0) / opRuns.length : 0
                    
                    return (
                      <div key={op.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getOperationIcon(op.value)}
                            <span className="text-sm font-medium">{op.label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {opRuns.length} runs, {Math.round(avgDuration)}min avg
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((opRuns.length / Math.max(completedRuns.length, 1)) * 100, 100)} 
                          className="h-2" 
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Production Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{activeRuns.length}</div>
                      <div className="text-sm text-muted-foreground">Active Operations</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{completedRuns.length}</div>
                      <div className="text-sm text-muted-foreground">Completed Today</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Units Ready</span>
                      <span className="text-sm font-medium">{unitsReadyForPacking}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Units Packed</span>
                      <span className="text-sm font-medium">{unitsPacked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <span className="text-sm font-medium">
                        {totalUnitsFinished > 0 ? Math.round((unitsPacked / totalUnitsFinished) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}