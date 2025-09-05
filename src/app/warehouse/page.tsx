"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Package, 
  QrCode, 
  Scan, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Eye,
  Camera
} from "lucide-react"

interface ScanOutRecord {
  id: string
  cartonId: string
  shipmentId: string
  scannedOutAt: string
  carton: {
    cartonNumber: string
    qrCode: string
    weightKg: number
  }
  tripStop?: {
    stopNo: number
    consigneeName: string
  }
}

interface InventoryMovement {
  id: string
  type: "IN" | "OUT" | "TRANSFER" | "REJECT"
  item: string
  quantity: number
  reason: string
  timestamp: string
  reference?: string
}

export default function WarehousePage() {
  const [scanOutRecords, setScanOutRecords] = useState<ScanOutRecord[]>([])
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("scan-out")
  const [showScanDialog, setShowScanDialog] = useState(false)
  const [scanForm, setScanForm] = useState({
    shipmentId: "",
    qrCode: "",
    scannedBy: "current-user"
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Mock data for demonstration
      const mockScanOutRecords: ScanOutRecord[] = [
        {
          id: "1",
          cartonId: "carton_1",
          shipmentId: "ship_1",
          scannedOutAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
          carton: {
            cartonNumber: "CTN-000001",
            qrCode: "QR-CTN-000001-1234567890",
            weightKg: 5.2
          },
          tripStop: {
            stopNo: 1,
            consigneeName: "Acme Corporation"
          }
        },
        {
          id: "2",
          cartonId: "carton_2",
          shipmentId: "ship_1",
          scannedOutAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
          carton: {
            cartonNumber: "CTN-000002",
            qrCode: "QR-CTN-000002-0987654321",
            weightKg: 4.8
          },
          tripStop: {
            stopNo: 1,
            consigneeName: "Acme Corporation"
          }
        },
        {
          id: "3",
          cartonId: "carton_3",
          shipmentId: "ship_2",
          scannedOutAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
          carton: {
            cartonNumber: "CTN-000003",
            qrCode: "QR-CTN-000003-1122334455",
            weightKg: 6.1
          },
          tripStop: {
            stopNo: 1,
            consigneeName: "Beta Industries"
          }
        }
      ]

      const mockInventoryMovements: InventoryMovement[] = [
        {
          id: "1",
          type: "OUT",
          item: "Cotton Fabric - White",
          quantity: 50,
          reason: "Production Order ORD-2024-0892",
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          reference: "ORD-2024-0892"
        },
        {
          id: "2",
          type: "IN",
          item: "Plastisol Ink - Black",
          quantity: 10,
          reason: "Purchase Order PO-2024-156",
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          reference: "PO-2024-156"
        },
        {
          id: "3",
          type: "OUT",
          item: "Polyester Thread",
          quantity: 25,
          reason: "Sewing Operation",
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          reference: "SEW-2024-445"
        }
      ]

      setScanOutRecords(mockScanOutRecords)
      setInventoryMovements(mockInventoryMovements)
    } catch (error) {
      console.error("Error fetching warehouse data:", error)
    } finally {
      setLoading(false)
    }
  }

  const scanOutCarton = async () => {
    try {
      const response = await fetch("/api/delivery/warehouse/scan-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentId: scanForm.shipmentId,
          cartonId: scanForm.qrCode, // Assuming QR code contains carton ID
          scannedBy: scanForm.scannedBy
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Scan out successful:", result)
        await fetchData()
        setShowScanDialog(false)
        setScanForm({
          shipmentId: "",
          qrCode: "",
          scannedBy: "current-user"
        })
      } else {
        const error = await response.json()
        console.error("Scan out failed:", error)
      }
    } catch (error) {
      console.error("Error scanning out carton:", error)
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "IN": return "bg-green-500"
      case "OUT": return "bg-blue-500"
      case "TRANSFER": return "bg-yellow-500"
      case "REJECT": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "IN": return ArrowLeft
      case "OUT": return ArrowRight
      case "TRANSFER": return Package
      case "REJECT": return AlertTriangle
      default: return Package
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading warehouse operations...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Operations</h1>
          <p className="text-muted-foreground">Manage inventory movements and shipment scanning</p>
        </div>
        
        <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <QrCode className="h-4 w-4" />
              Scan Out Carton
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan Out Carton</DialogTitle>
              <DialogDescription>Scan carton QR code for shipment handover</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Shipment ID</Label>
                <Input
                  placeholder="Enter shipment ID"
                  value={scanForm.shipmentId}
                  onChange={(e) => setScanForm(prev => ({ ...prev, shipmentId: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Carton QR Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Scan or enter QR code"
                    value={scanForm.qrCode}
                    onChange={(e) => setScanForm(prev => ({ ...prev, qrCode: e.target.value }))}
                  />
                  <Button variant="outline" size="icon">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={scanOutCarton} 
                className="w-full"
                disabled={!scanForm.shipmentId || !scanForm.qrCode}
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan Out Carton
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartons Scanned Today</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scanOutRecords.length}</div>
            <p className="text-xs text-muted-foreground">
              +{scanOutRecords.filter(r => {
                const scanTime = new Date(r.scannedOutAt)
                const now = new Date()
                return scanTime.toDateString() === now.toDateString()
              }).length} from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(scanOutRecords.map(r => r.shipmentId)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for pickup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Movements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryMovements.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scan-out">Scan Out Records</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Movements</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
        </TabsList>

        <TabsContent value="scan-out" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Recent Scan Out Records
              </CardTitle>
              <CardDescription>
                Cartons scanned for shipment handover to drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carton</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Scanned At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanOutRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">{record.carton.cartonNumber}</div>
                        <div className="text-sm text-muted-foreground">ID: {record.cartonId}</div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-mono text-sm">{record.carton.qrCode.substring(0, 20)}...</div>
                      </TableCell>
                      
                      <TableCell>{record.carton.weightKg} kg</TableCell>
                      
                      <TableCell>
                        {record.tripStop && (
                          <div>
                            <div className="font-medium">Stop {record.tripStop.stopNo}</div>
                            <div className="text-sm text-muted-foreground">
                              {record.tripStop.consigneeName}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {new Date(record.scannedOutAt).toLocaleString()}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Scanned Out
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Movements
              </CardTitle>
              <CardDescription>
                Real-time inventory transactions and stock changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryMovements.map(movement => {
                    const MovementIcon = getMovementIcon(movement.type)
                    
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getMovementTypeColor(movement.type)} text-white`}>
                              <MovementIcon className="h-3 w-3 mr-1" />
                              {movement.type}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium">{movement.item}</div>
                        </TableCell>
                        
                        <TableCell>
                          <div className={`font-medium ${movement.type === 'OUT' ? 'text-red-600' : 'text-green-600'}`}>
                            {movement.type === 'OUT' ? '-' : '+'}{movement.quantity}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">{movement.reason}</div>
                        </TableCell>
                        
                        <TableCell>
                          {movement.reference && (
                            <div className="font-mono text-sm">{movement.reference}</div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            {new Date(movement.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeft className="h-5 w-5" />
                Receiving Operations
              </CardTitle>
              <CardDescription>
                Incoming inventory and purchase order receiving
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Receiving Module</h3>
              <p className="text-muted-foreground mb-4">
                Purchase order receiving and inventory intake functionality
              </p>
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                View Purchase Orders
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}