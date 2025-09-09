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
} from '@/components/ui/dialog'
  import {
  Package,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Bot,
  Beaker,
  Droplet,
  Zap
} from 'lucide-react'

interface MaterialLogModalProps {
  isOpen: boolean
  onClose: () => void
  printRun: any
  onLog: (data: any) => void
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  uom: string
  availableQty: number
  batches: {
    id: string
    batchNumber: string
    availableQty: number
    expiryDate?: string
  }[]
}

interface MaterialEntry {
  itemId: string
  itemName: string
  uom: string
  qty: number
  batchId?: string
  batchNumber?: string
}

const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Plastisol Ink - Black',
    sku: 'INK-PLAST-BLK',
    category: 'Inks',
    uom: 'g',
    availableQty: 2500,
    batches: [
      { id: '1a', batchNumber: 'INK240901', availableQty: 1500, expiryDate: '2025-09-01' },
      { id: '1b', batchNumber: 'INK240815', availableQty: 1000, expiryDate: '2025-08-15' }
    ]
  },
  {
    id: '2',
    name: 'Sublimation Paper A4',
    sku: 'PAP-SUB-A4',
    category: 'Papers',
    uom: 'sheets',
    availableQty: 5000,
    batches: [
      { id: '2a', batchNumber: 'PAP240820', availableQty: 5000 }
    ]
  },
  {
    id: '3',
    name: 'DTF Hot Melt Powder',
    sku: 'POW-DTF-HM',
    category: 'Powders',
    uom: 'g',
    availableQty: 800,
    batches: [
      { id: '3a', batchNumber: 'POW240825', availableQty: 800, expiryDate: '2025-02-25' }
    ]
  },
  {
    id: '4',
    name: 'Embroidery Thread - White',
    sku: 'THR-EMB-WHT',
    category: 'Threads',
    uom: 'cone',
    availableQty: 50,
    batches: [
      { id: '4a', batchNumber: 'THR240810', availableQty: 50 }
    ]
  },
  {
    id: '5',
    name: 'Screen Cleaner',
    sku: 'CLN-SCR-001',
    category: 'Chemicals',
    uom: 'ml',
    availableQty: 1200,
    batches: [
      { id: '5a', batchNumber: 'CLN240801', availableQty: 1200, expiryDate: '2026-08-01' }
    ]
  }
]

export function MaterialLogModal({ isOpen, onClose, printRun, onLog }: MaterialLogModalProps) {
  const [materials, setMaterials] = useState<MaterialEntry[]>([])
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (printRun) {
      // Filter items based on print method
      const relevantCategories = getRelevantCategoriesForMethod(printRun.method)
      const filtered = mockInventoryItems.filter(item => 
        relevantCategories.includes(item.category)
      )
      setAvailableItems(filtered)
    }
    
    // Reset form when modal opens/closes
    if (isOpen) {
      setMaterials([])
      setSelectedItemId('')
      setSelectedBatchId('')
      setQuantity('')
    }
  }, [printRun, isOpen])

  const getRelevantCategoriesForMethod = (method: string): string[] => {
    switch (method) {
      case 'SILKSCREEN': return ['Inks', 'Chemicals', 'Films']
      case 'SUBLIMATION': return ['Inks', 'Papers']
      case 'DTF': return ['Inks', 'Films', 'Powders']
      case 'EMBROIDERY': return ['Threads', 'Stabilizers']
      default: return ['Inks', 'Papers', 'Powders', 'Threads', 'Chemicals']
    }
  }

  const selectedItem = availableItems.find(item => item.id === selectedItemId)
  const selectedBatch = selectedItem?.batches.find(batch => batch.id === selectedBatchId)
  const maxAvailable = selectedBatch?.availableQty || selectedItem?.availableQty || 0

  const handleAddMaterial = () => {
    if (!selectedItem || !quantity || parseFloat(quantity) <= 0) return

    const qty = parseFloat(quantity)
    if (qty > maxAvailable) {
      alert(`Quantity exceeds available stock (${maxAvailable} ${selectedItem.uom})`)
      return
    }

    const materialEntry: MaterialEntry = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      uom: selectedItem.uom,
      qty: qty,
      batchId: selectedBatchId || undefined,
      batchNumber: selectedBatch?.batchNumber || 'N/A'
    }

    setMaterials([...materials, materialEntry])
    
    // Reset form
    setSelectedItemId('')
    setSelectedBatchId('')
    setQuantity('')
  }

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (materials.length === 0) return

    setIsSubmitting(true)
    try {
      // Log each material separately via API
      for (const material of materials) {
        await fetch(`/api/printing/runs/${printRun.id}/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: material.itemId,
            uom: material.uom,
            qty: material.qty,
            sourceBatchId: material.batchId
          })
        })
      }
      
      onLog({ materials })
    } catch (error) {
      console.error('Error logging materials:', error)
      alert('Error logging materials. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTotalCost = () => {
    // Simplified cost calculation - in real app, would use actual material costs
    return materials.reduce((total, material) => {
      const baseCost = material.uom === 'g' ? 0.05 : 
                     material.uom === 'ml' ? 0.02 :
                     material.uom === 'sheets' ? 0.10 :
                     material.uom === 'cone' ? 15.00 : 1.00
      return total + (material.qty * baseCost)
    }, 0)
  }

  if (!printRun) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto ash-glass backdrop-blur-xl border border-white/20">
        <DialogHeader className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-t-lg"></div>
          <DialogTitle className="relative flex items-center space-x-3 text-2xl font-bold">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center ash-animate-pulse-slow">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="ash-gradient-text">Log Material Usage</span>
          </DialogTitle>
          <DialogDescription className="relative text-lg text-slate-600 mt-2">
            Record materials consumed for print run: {printRun.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Print Run Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Order:</span>
                  <span className="ml-2 text-blue-800">{printRun.orderNumber}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Method:</span>
                  <span className="ml-2 text-blue-800">{printRun.method}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Machine:</span>
                  <span className="ml-2 text-blue-800">{printRun.machineName}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Status:</span>
                  <Badge className="ml-2 bg-blue-100 text-blue-800">{printRun.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ashley AI Recommendations */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">Ashley AI Material Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {printRun.method === 'SILKSCREEN' && (
                  <>
                    <div className="flex items-start space-x-2">
                      <Droplet className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">Typical ink usage: 2-3g per shirt for standard coverage</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Beaker className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">Use screen cleaner after every 50 prints for quality maintenance</p>
                    </div>
                  </>
                )}
                {printRun.method === 'SUBLIMATION' && (
                  <>
                    <div className="flex items-start space-x-2">
                      <Package className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">Use 1 sheet of sublimation paper per garment</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">Ensure paper has adequate ink saturation for full-color prints</p>
                    </div>
                  </>
                )}
                {printRun.method === 'DTF' && (
                  <>
                    <div className="flex items-start space-x-2">
                      <Droplet className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">Apply powder evenly: ~1-2g per design depending on size</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800">Shake off excess powder to prevent over-application</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Material Selection */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-green-600" />
                <span>Add Material Usage</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="material" className="text-sm font-medium">Material</Label>
                  <select
                    id="material"
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value)
                      setSelectedBatchId('')
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-lg enhanced-input"
                  >
                    <option value="">Select Material</option>
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.availableQty} {item.uom} available)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedItem && selectedItem.batches.length > 1 && (
                  <div>
                    <Label htmlFor="batch" className="text-sm font-medium">Batch (Optional)</Label>
                    <select
                      id="batch"
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg enhanced-input"
                    >
                      <option value="">Any batch</option>
                      {selectedItem.batches.map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchNumber} ({batch.availableQty} {selectedItem.uom})
                          {batch.expiryDate && ` - Exp: ${new Date(batch.expiryDate).toLocaleDateString()}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity" className="text-sm font-medium">
                    Quantity {selectedItem && `(${selectedItem.uom})`}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="enhanced-input"
                    min="0"
                    step="0.1"
                    max={maxAvailable}
                  />
                  {selectedItem && (
                    <p className="text-xs text-gray-500 mt-1">
                      Max available: {maxAvailable} {selectedItem.uom}
                    </p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleAddMaterial}
                disabled={!selectedItem || !quantity || parseFloat(quantity) <= 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
            </CardContent>
          </Card>

          {/* Materials List */}
          {materials.length > 0 && (
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span>Materials to Log</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {materials.length} item{materials.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{material.itemName}</div>
                        <div className="text-sm text-gray-600">
                          Quantity: {material.qty} {material.uom}
                          {material.batchNumber !== 'N/A' && (
                            <span className="ml-2">• Batch: {material.batchNumber}</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleRemoveMaterial(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Cost Summary */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-800">Estimated Material Cost:</span>
                    <span className="font-bold text-blue-900">₱{getTotalCost().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={materials.length === 0 || isSubmitting}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Logging...' : `Log ${materials.length} Material${materials.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}