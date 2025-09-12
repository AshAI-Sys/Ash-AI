// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Package, 
  Calendar, 
  DollarSign,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react'
import { CreatePOModal } from '@/components/purchase-orders/CreatePOModal'

interface PurchaseOrder {
  id: string
  po_number: string
  vendor: string
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
  totalAmount: number
  currency: string
  orderDate: string
  expectedDelivery: string
  items: {
    sku: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  notes?: string
}

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    po_number: 'PO-2024-001',
    vendor: 'Fabric Suppliers Inc.',
    status: 'APPROVED',
    totalAmount: 25000,
    currency: 'PHP',
    orderDate: '2024-01-15',
    expectedDelivery: '2024-01-25',
    items: [
      { sku: 'CVC-160-WHITE', name: 'CVC 160gsm White Fabric', quantity: 500, unitPrice: 45, totalPrice: 22500 },
      { sku: 'THREAD-WHITE', name: 'White Thread', quantity: 50, unitPrice: 50, totalPrice: 2500 }
    ],
    notes: 'Urgent order for upcoming production run'
  },
  {
    id: '2',
    po_number: 'PO-2024-002',
    vendor: 'Ink & Supplies Co.',
    status: 'PENDING',
    totalAmount: 18500,
    currency: 'PHP',
    orderDate: '2024-01-16',
    expectedDelivery: '2024-01-30',
    items: [
      { sku: 'INK-PLT-BLACK', name: 'Plastisol Ink Black', quantity: 20, unitPrice: 850, totalPrice: 17000 },
      { sku: 'CLEANER-SC', name: 'Screen Cleaner', quantity: 10, unitPrice: 150, totalPrice: 1500 }
    ]
  },
  {
    id: '3',
    po_number: 'PO-2024-003',
    vendor: 'Packaging Materials Ltd.',
    status: 'RECEIVED',
    totalAmount: 12000,
    currency: 'PHP',
    orderDate: '2024-01-10',
    expectedDelivery: '2024-01-20',
    items: [
      { sku: 'POLYBAG-SM', name: 'Polybags Small', quantity: 1000, unitPrice: 5, totalPrice: 5000 },
      { sku: 'CARTON-MD', name: 'Cartons Medium', quantity: 100, unitPrice: 70, totalPrice: 7000 }
    ]
  }
]

const statusConfig = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', icon: FileText },
  PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  ORDERED: { color: 'bg-purple-100 text-purple-800', icon: ShoppingCart },
  RECEIVED: { color: 'bg-green-100 text-green-800', icon: Package },
  CANCELLED: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filteredOrders = purchaseOrders.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.vendor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <ResponsiveLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
            <p className="text-muted-foreground">
              Manage inventory procurement and supplier orders
            </p>
          </div>
          <CreatePOModal onPOCreate={(poData) => {
            const newPO = {
              id: `po_${Date.now()}`,
              po_number: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
              vendor: poData.vendor?.name || '',
              status: 'DRAFT' as const,
              totalAmount: poData.items.reduce((sum, item) => sum + item.totalPrice, 0),
              currency: 'PHP',
              orderDate: new Date().toISOString().split('T')[0],
              expectedDelivery: poData.expectedDelivery,
              items: poData.items.map(item => ({
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
              })),
              notes: poData.notes
            }
            setPurchaseOrders(prev => [newPO, ...prev])
          }} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchaseOrders.filter(po => po.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {purchaseOrders.filter(po => po.status === 'RECEIVED').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0), 'PHP')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by PO number or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="ORDERED">Ordered</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Purchase Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((po) => {
            const StatusIcon = statusConfig[po.status].icon
            return (
              <Card key={po.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">{po.po_number}</CardTitle>
                        <p className="text-sm text-muted-foreground">{po.vendor}</p>
                      </div>
                    </div>
                    <Badge className={statusConfig[po.status].color}>
                      {po.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Order: {formatDate(po.orderDate)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Expected: {formatDate(po.expectedDelivery)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatCurrency(po.totalAmount, po.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted rounded-md p-3 mb-4">
                    <p className="text-sm font-medium mb-2">Items ({po.items.length})</p>
                    {po.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>
                          {item.quantity} x {formatCurrency(item.unitPrice, po.currency)}
                        </span>
                      </div>
                    ))}
                    {po.items.length > 2 && (
                      <p className="text-sm text-muted-foreground">
                        +{po.items.length - 2} more items
                      </p>
                    )}
                  </div>

                  {po.notes && (
                    <div className="bg-blue-50 rounded-md p-3 mb-4">
                      <p className="text-sm text-blue-800">{po.notes}</p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {po.status === 'DRAFT' && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No purchase orders found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first purchase order'
                }
              </p>
              {!searchTerm && statusFilter === 'ALL' && (
                <CreatePOModal onPOCreate={(poData) => {
                  const newPO = {
                    id: `po_${Date.now()}`,
                    po_number: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
                    vendor: poData.vendor?.name || '',
                    status: 'DRAFT' as const,
                    totalAmount: poData.items.reduce((sum, item) => sum + item.totalPrice, 0),
                    currency: 'PHP',
                    orderDate: new Date().toISOString().split('T')[0],
                    expectedDelivery: poData.expectedDelivery,
                    items: poData.items.map(item => ({
                      sku: item.sku,
                      name: item.name,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      totalPrice: item.totalPrice
                    })),
                    notes: poData.notes
                  }
                  setPurchaseOrders(prev => [newPO, ...prev])
                }} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveLayout>
  )
}