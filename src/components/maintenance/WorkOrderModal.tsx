'use client'

import { useState } from 'react'
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
  Wrench, 
  AlertTriangle, 
  Calendar, 
  User, 
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Truck,
  Monitor,
  Package,
  Zap,
  Droplets,
  Thermometer,
  Activity,
  TrendingUp,
  FileText,
  Camera
} from 'lucide-react'

interface Asset {
  id: string
  assetId: string
  name: string
  type: 'MACHINE' | 'VEHICLE' | 'EQUIPMENT' | 'FACILITY' | 'IT'
  location: string
  status: 'OPERATIONAL' | 'DOWN' | 'MAINTENANCE' | 'DISPOSED'
  purchaseDate: string
  warrantyExpiry?: string
  lastMaintenance?: string
}

interface WorkOrder {
  id: string
  workOrderId: string
  title: string
  description: string
  assetId: string
  assetName: string
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY' | 'INSPECTION'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  assignedTo?: string
  requestedBy: string
  requestedDate: string
  scheduledDate?: string
  completedDate?: string
  estimatedHours: number
  actualHours?: number
  estimatedCost: number
  actualCost?: number
  parts: {
    name: string
    quantity: number
    cost: number
  }[]
  attachments?: string[]
  notes?: string
}

interface WorkOrderModalProps {
  workOrder?: WorkOrder
  onWorkOrderCreate?: (workOrder: WorkOrder) => void
  onWorkOrderUpdate?: (workOrder: WorkOrder) => void
  mode: 'create' | 'edit' | 'view'
}

const mockAssets: Asset[] = [
  {
    id: '1',
    assetId: 'MCH-001',
    name: 'Screen Printing Press #1',
    type: 'MACHINE',
    location: 'Production Floor A',
    status: 'OPERATIONAL',
    purchaseDate: '2022-03-15',
    warrantyExpiry: '2025-03-15',
    lastMaintenance: '2024-01-10'
  },
  {
    id: '2',
    assetId: 'MCH-002',
    name: 'Heat Press Machine',
    type: 'MACHINE',
    location: 'Production Floor B',
    status: 'DOWN',
    purchaseDate: '2021-08-20',
    lastMaintenance: '2023-12-15'
  },
  {
    id: '3',
    assetId: 'VHL-001',
    name: 'Delivery Truck',
    type: 'VEHICLE',
    location: 'Parking Area',
    status: 'OPERATIONAL',
    purchaseDate: '2020-05-10',
    lastMaintenance: '2024-01-05'
  },
  {
    id: '4',
    assetId: 'EQP-001',
    name: 'Air Compressor',
    type: 'EQUIPMENT',
    location: 'Utility Room',
    status: 'MAINTENANCE',
    purchaseDate: '2019-11-30',
    lastMaintenance: '2023-11-20'
  }
]

const workOrderTypes = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION']
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const assignees = ['John Smith', 'Maria Santos', 'Carlos Lopez', 'Ana Reyes']

export function WorkOrderModal({ workOrder, onWorkOrderCreate, onWorkOrderUpdate, mode }: WorkOrderModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<WorkOrder>>(
    workOrder || {
      type: 'CORRECTIVE',
      priority: 'MEDIUM',
      status: 'OPEN',
      requestedBy: 'System User',
      requestedDate: new Date().toISOString().split('T')[0],
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedHours: 2,
      estimatedCost: 5000,
      parts: []
    }
  )
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(
    workOrder ? mockAssets.find(a => a.id === workOrder.assetId) || null : null
  )

  const totalSteps = mode === 'view' ? 1 : 3
  const isReadOnly = mode === 'view'

  const generateWorkOrderId = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `WO${year}${month}${day}-${random}`
  }

  const addPart = () => {
    const newPart = { name: '', quantity: 1, cost: 0 }
    setFormData(prev => ({
      ...prev,
      parts: [...(prev.parts || []), newPart]
    }))
  }

  const updatePart = (index: number, field: keyof WorkOrder['parts'][0], value: any) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts?.map((part, i) => 
        i === index ? { ...part, [field]: value } : part
      ) || []
    }))
  }

  const removePart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parts: prev.parts?.filter((_, i) => i !== index) || []
    }))
  }

  const calculateTotalPartsCost = () => {
    return formData.parts?.reduce((sum, part) => sum + (part.quantity * part.cost), 0) || 0
  }

  const handleSubmit = () => {
    if (!formData.title || !selectedAsset) return

    const workOrderData: WorkOrder = {
      id: workOrder?.id || `wo_${Date.now()}`,
      workOrderId: workOrder?.workOrderId || generateWorkOrderId(),
      title: formData.title!,
      description: formData.description || '',
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      type: formData.type || 'CORRECTIVE',
      priority: formData.priority || 'MEDIUM',
      status: formData.status || 'OPEN',
      assignedTo: formData.assignedTo,
      requestedBy: formData.requestedBy || 'System User',
      requestedDate: formData.requestedDate || new Date().toISOString().split('T')[0],
      scheduledDate: formData.scheduledDate,
      completedDate: formData.completedDate,
      estimatedHours: formData.estimatedHours || 2,
      actualHours: formData.actualHours,
      estimatedCost: (formData.estimatedCost || 0) + calculateTotalPartsCost(),
      actualCost: formData.actualCost,
      parts: formData.parts || [],
      attachments: formData.attachments,
      notes: formData.notes
    }

    if (mode === 'edit') {
      onWorkOrderUpdate?.(workOrderData)
    } else {
      onWorkOrderCreate?.(workOrderData)
    }
    
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setCurrentStep(1)
    setSelectedAsset(null)
    setFormData({
      type: 'CORRECTIVE',
      priority: 'MEDIUM',
      status: 'OPEN',
      requestedBy: 'System User',
      requestedDate: new Date().toISOString().split('T')[0],
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedHours: 2,
      estimatedCost: 5000,
      parts: []
    })
  }

  const getAssetIcon = (type: Asset['type']) => {
    switch (type) {
      case 'MACHINE': return Settings
      case 'VEHICLE': return Truck
      case 'EQUIPMENT': return Package
      case 'IT': return Monitor
      case 'FACILITY': return Package
      default: return Package
    }
  }

  const statusColors = {
    OPEN: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-orange-100 text-orange-800',
    ON_HOLD: 'bg-gray-100 text-gray-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  }

  const priorityColors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Work Order
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            {mode === 'edit' ? 'Edit' : 'View'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>
              {mode === 'create' ? 'Create Work Order' : 
               mode === 'edit' ? 'Edit Work Order' : 'Work Order Details'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' 
              ? 'View work order information and progress'
              : `Step ${currentStep} of ${totalSteps}: ${
                  currentStep === 1 ? 'Asset & Basic Info' :
                  currentStep === 2 ? 'Work Details' : 'Parts & Completion'
                }`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar - Only show for create/edit */}
        {!isReadOnly && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Step 1: Asset Selection & Basic Info */}
          {(currentStep === 1 || isReadOnly) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Asset & Basic Information</h3>
                {workOrder && (
                  <div className="flex space-x-2">
                    <Badge className={statusColors[workOrder.status]}>
                      {workOrder.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={priorityColors[workOrder.priority]}>
                      {workOrder.priority}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Work Order ID */}
              {workOrder && (
                <div>
                  <Label>Work Order ID</Label>
                  <Input
                    value={workOrder.workOrderId}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              )}

              {/* Asset Selection */}
              {!isReadOnly && (
                <div>
                  <Label htmlFor="asset">Select Asset *</Label>
                  <div className="grid gap-3 mt-2">
                    {mockAssets.map(asset => {
                      const AssetIcon = getAssetIcon(asset.type)
                      return (
                        <Card 
                          key={asset.id}
                          className={`cursor-pointer transition-all ${
                            selectedAsset?.id === asset.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedAsset(asset)
                            setFormData(prev => ({
                              ...prev,
                              assetId: asset.id,
                              assetName: asset.name
                            }))
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <AssetIcon className="h-8 w-8 text-gray-600" />
                                <div>
                                  <h4 className="font-medium">{asset.name}</h4>
                                  <p className="text-sm text-muted-foreground">{asset.assetId} • {asset.location}</p>
                                </div>
                              </div>
                              <Badge className={
                                asset.status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
                                asset.status === 'DOWN' ? 'bg-red-100 text-red-800' :
                                asset.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {asset.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Asset Info Display for view/edit mode */}
              {(isReadOnly || mode === 'edit') && selectedAsset && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-8 w-8 text-gray-600" />
                      <div>
                        <h4 className="font-medium">{selectedAsset.name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedAsset.assetId} • {selectedAsset.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Work Order Title *</Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                    placeholder="Brief description of the work needed"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Work Order Type</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as WorkOrder['type'] }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    {workOrderTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as WorkOrder['priority'] }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="requestedBy">Requested By</Label>
                  <Input
                    id="requestedBy"
                    value={formData.requestedBy || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  readOnly={isReadOnly}
                  className={`w-full mt-1 px-3 py-2 border border-input bg-background rounded-md min-h-[100px] ${
                    isReadOnly ? 'bg-gray-50' : ''
                  }`}
                  placeholder="Detailed description of the problem or work to be performed..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Work Details */}
          {(currentStep === 2 || isReadOnly) && (
            <div className="space-y-4">
              {!isReadOnly && <h3 className="text-lg font-semibold">Work Details</h3>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <select
                    id="assignedTo"
                    value={formData.assignedTo || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    <option value="">Select technician...</option>
                    {assignees.map(assignee => (
                      <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as WorkOrder['status'] }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="completedDate">Completed Date</Label>
                  <Input
                    id="completedDate"
                    type="date"
                    value={formData.completedDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, completedDate: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="actualHours">Actual Hours</Label>
                  <Input
                    id="actualHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.actualHours || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, actualHours: parseFloat(e.target.value) || 0 }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedCost">Estimated Labor Cost</Label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    min="0"
                    value={formData.estimatedCost || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="actualCost">Actual Total Cost</Label>
                  <Input
                    id="actualCost"
                    type="number"
                    min="0"
                    value={formData.actualCost || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, actualCost: parseFloat(e.target.value) || 0 }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Parts & Notes */}
          {(currentStep === 3 || isReadOnly) && (
            <div className="space-y-4">
              {!isReadOnly && <h3 className="text-lg font-semibold">Parts & Completion</h3>}
              
              {/* Parts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Parts Required</Label>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={addPart}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Part
                    </Button>
                  )}
                </div>
                
                {formData.parts && formData.parts.length > 0 ? (
                  <div className="space-y-2">
                    {formData.parts.map((part, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <Input
                                placeholder="Part name"
                                value={part.name}
                                onChange={(e) => updatePart(index, 'name', e.target.value)}
                                readOnly={isReadOnly}
                                className={`text-sm ${isReadOnly ? 'bg-gray-50' : ''}`}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={part.quantity}
                                onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                                readOnly={isReadOnly}
                                className={`text-sm ${isReadOnly ? 'bg-gray-50' : ''}`}
                              />
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="number"
                                min="0"
                                placeholder="Cost each"
                                value={part.cost}
                                onChange={(e) => updatePart(index, 'cost', parseFloat(e.target.value) || 0)}
                                readOnly={isReadOnly}
                                className={`text-sm ${isReadOnly ? 'bg-gray-50' : ''}`}
                              />
                            </div>
                            <div className="col-span-1">
                              <span className="text-sm font-medium">₱{(part.quantity * part.cost).toFixed(2)}</span>
                            </div>
                            <div className="col-span-1">
                              {!isReadOnly && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removePart(index)}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="text-right p-3 bg-gray-50 rounded">
                      <span className="font-semibold">Total Parts Cost: ₱{calculateTotalPartsCost().toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No parts added yet</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  readOnly={isReadOnly}
                  className={`w-full mt-1 px-3 py-2 border border-input bg-background rounded-md min-h-[80px] ${
                    isReadOnly ? 'bg-gray-50' : ''
                  }`}
                  placeholder="Additional notes, observations, or completion remarks..."
                />
              </div>

              {/* Cost Summary */}
              {(formData.estimatedCost || formData.actualCost || calculateTotalPartsCost() > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">₱{(formData.estimatedCost || 0).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Labor (Est.)</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-orange-600">₱{calculateTotalPartsCost().toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Parts</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">
                          ₱{((formData.actualCost || formData.estimatedCost || 0) + calculateTotalPartsCost()).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Est.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          {!isReadOnly ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : setIsOpen(false)}
              >
                {currentStep > 1 ? 'Previous' : 'Cancel'}
              </Button>
              
              <div className="flex space-x-2">
                {currentStep < totalSteps ? (
                  <Button 
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={
                      currentStep === 1 && (!formData.title || !selectedAsset)
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.title || !selectedAsset}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {mode === 'edit' ? 'Update Work Order' : 'Create Work Order'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}