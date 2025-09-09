'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
  import {
  Plus, 
  Package, 
  Building, 
  Calendar, 
  DollarSign,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileText,
  Truck,
  Search,
  Calculator
} from 'lucide-react'

interface Vendor {
  id: string
  name: string
  email: string
  phone: string
  rating: number
  specialties: string[]
  paymentTerms: string
  leadTime: number
}

interface POItem {
  id: string
  sku: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category: 'FABRIC' | 'INK' | 'THREAD' | 'PACKAGING' | 'EQUIPMENT' | 'OTHER'
  unit: string
  notes?: string
}

interface PurchaseOrderData {
  vendor?: Vendor
  requestedBy: string
  department: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  expectedDelivery: string
  paymentTerms: string
  shippingAddress: string
  notes?: string
  items: POItem[]
}

interface CreatePOModalProps {
  onPOCreate?: (poData: PurchaseOrderData) => void
}

const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'Fabric Suppliers Inc.',
    email: 'orders@fabricsuppliers.com',
    phone: '+63 2 8123 4567',
    rating: 4.8,
    specialties: ['Cotton Fabrics', 'Polyester Blends', 'Denim'],
    paymentTerms: 'Net 30',
    leadTime: 14
  },
  {
    id: '2',
    name: 'Ink & Supplies Co.',
    email: 'sales@inksupplies.ph',
    phone: '+63 2 8987 6543',
    rating: 4.6,
    specialties: ['Plastisol Inks', 'Water-based Inks', 'Screen Printing Supplies'],
    paymentTerms: 'Net 15',
    leadTime: 7
  },
  {
    id: '3',
    name: 'Packaging Materials Ltd.',
    email: 'info@packmat.com',
    phone: '+63 2 8456 7890',
    rating: 4.5,
    specialties: ['Polybags', 'Cartons', 'Labels', 'Hangtags'],
    paymentTerms: 'Net 45',
    leadTime: 10
  }
]

const mockItems = [
  { sku: 'CVC-160-WHITE', name: 'CVC 160gsm White Fabric', category: 'FABRIC', unit: 'kg', price: 45 },
  { sku: 'CVC-160-BLACK', name: 'CVC 160gsm Black Fabric', category: 'FABRIC', unit: 'kg', price: 48 },
  { sku: 'THREAD-WHITE', name: 'White Thread', category: 'THREAD', unit: 'spool', price: 50 },
  { sku: 'INK-PLT-BLACK', name: 'Plastisol Ink Black', category: 'INK', unit: 'bucket', price: 850 },
  { sku: 'POLYBAG-SM', name: 'Polybags Small', category: 'PACKAGING', unit: 'pcs', price: 5 },
]

export function CreatePOModal({ onPOCreate }: CreatePOModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [poData, setPOData] = useState<PurchaseOrderData>({
    requestedBy: 'Production Team',
    department: 'Production',
    priority: 'MEDIUM',
    expectedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    shippingAddress: 'Sorbetes Apparel Studio, Main Warehouse',
    items: []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const totalSteps = 4
  const steps = [
    { number: 1, title: 'Vendor Selection', description: 'Choose supplier' },
    { number: 2, title: 'Order Details', description: 'Basic information' },
    { number: 3, title: 'Items', description: 'Add products' },
    { number: 4, title: 'Review', description: 'Confirm order' }
  ]

  const addItem = (item: typeof mockItems[0]) => {
    const newItem: POItem = {
      id: `item_${Date.now()}`,
      sku: item.sku,
      name: item.name,
      description: `${item.name} - Premium quality`,
      quantity: 1,
      unitPrice: item.price,
      totalPrice: item.price,
      category: item.category as POItem['category'],
      unit: item.unit
    }
    setPOData(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const updateItem = (itemId: string, field: keyof POItem, value: any) => {
    setPOData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value }
          if (field === 'quantity' || field === 'unitPrice') {
            updated.totalPrice = updated.quantity * updated.unitPrice
          }
          return updated
        }
        return item
      })
    }))
  }

  const removeItem = (itemId: string) => {
    setPOData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const calculateTotal = () => {
    return poData.items.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  const generatePONumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `PO-${year}-${month}-${random}`
  }

  const handleSubmit = () => {
    if (poData.vendor && poData.items.length > 0) {
      onPOCreate?.(poData)
      setIsOpen(false)
      resetForm()
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setPOData({
      requestedBy: 'Production Team',
      department: 'Production',
      priority: 'MEDIUM',
      expectedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentTerms: 'Net 30',
      shippingAddress: 'Sorbetes Apparel Studio, Main Warehouse',
      items: []
    })
  }

  const filteredItems = mockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const priorityColors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Create Purchase Order</span>
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps}: {steps[currentStep - 1].description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        <div className="space-y-6">
          {/* Step 1: Vendor Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Vendor</h3>
              <div className="grid gap-4">
                {mockVendors.map(vendor => (
                  <Card 
                    key={vendor.id}
                    className={`cursor-pointer transition-all ${
                      poData.vendor?.id === vendor.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setPOData(prev => ({ 
                      ...prev, 
                      vendor, 
                      paymentTerms: vendor.paymentTerms,
                      expectedDelivery: new Date(Date.now() + vendor.leadTime * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{vendor.name}</h4>
                          <p className="text-sm text-muted-foreground">{vendor.email}</p>
                          <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium">★ {vendor.rating}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{vendor.leadTime} days lead time</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-1">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {vendor.specialties.map(specialty => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Order Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requestedBy">Requested By</Label>
                  <Input
                    id="requestedBy"
                    value={poData.requestedBy}
                    onChange={(e) => setPOData(prev => ({ ...prev, requestedBy: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={poData.department}
                    onChange={(e) => setPOData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="Production">Production</option>
                    <option value="Design">Design</option>
                    <option value="Quality">Quality Control</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={poData.priority}
                    onChange={(e) => setPOData(prev => ({ ...prev, priority: e.target.value as PurchaseOrderData['priority'] }))}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                  <Input
                    id="expectedDelivery"
                    type="date"
                    value={poData.expectedDelivery}
                    onChange={(e) => setPOData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="shippingAddress">Shipping Address</Label>
                  <Input
                    id="shippingAddress"
                    value={poData.shippingAddress}
                    onChange={(e) => setPOData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={poData.notes || ''}
                    onChange={(e) => setPOData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or special requirements"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Items */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add Items</h3>
              
              {/* Search and Filter */}
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="ALL">All Categories</option>
                  <option value="FABRIC">Fabric</option>
                  <option value="INK">Ink</option>
                  <option value="THREAD">Thread</option>
                  <option value="PACKAGING">Packaging</option>
                </select>
              </div>

              {/* Available Items */}
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <h4 className="font-medium mb-2">Available Items</h4>
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <div key={item.sku} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">₱{item.price}/{item.unit}</span>
                        <Button size="sm" onClick={() => addItem(item)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Items */}
              {poData.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Selected Items ({poData.items.length})</h4>
                  <div className="space-y-2">
                    {poData.items.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-3">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <span className="text-sm font-medium">₱{item.totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="col-span-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="text-right mt-4 p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-end space-x-2">
                      <Calculator className="h-4 w-4" />
                      <span className="font-semibold">Total: ₱{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Purchase Order</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>Vendor Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">{poData.vendor?.name}</p>
                      <p className="text-sm text-muted-foreground">{poData.vendor?.email}</p>
                      <p className="text-sm text-muted-foreground">{poData.vendor?.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm">Payment Terms: {poData.paymentTerms}</p>
                      <p className="text-sm">Lead Time: {poData.vendor?.leadTime} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Order Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm"><span className="font-medium">PO Number:</span> {generatePONumber()}</p>
                      <p className="text-sm"><span className="font-medium">Requested By:</span> {poData.requestedBy}</p>
                      <p className="text-sm"><span className="font-medium">Department:</span> {poData.department}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium">Priority:</span>
                        <Badge className={priorityColors[poData.priority]}>
                          {poData.priority}
                        </Badge>
                      </div>
                      <p className="text-sm"><span className="font-medium">Expected Delivery:</span> {new Date(poData.expectedDelivery).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Items ({poData.items.length})</span>
                    </div>
                    <span className="text-lg font-bold">₱{calculateTotal().toFixed(2)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {poData.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₱{item.totalPrice.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x ₱{item.unitPrice}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {poData.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{poData.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : setIsOpen(false)}
            >
              {currentStep > 1 ? 'Previous' : 'Cancel'}
            </Button>
          </div>
          
          <div className="flex space-x-2">
            {currentStep < totalSteps ? (
              <Button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={
                  (currentStep === 1 && !poData.vendor) ||
                  (currentStep === 3 && poData.items.length === 0)
                }
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={!poData.vendor || poData.items.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Purchase Order
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}