// @ts-nocheck
'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Camera, 
  AlertTriangle, 
  Package, 
  Star, 
  Upload,
  Trash2,
  Eye,
  FileCheck,
  Clock,
  User,
  RotateCw
} from 'lucide-react'

interface QCItem {
  id: string
  orderNumber: string
  productName: string
  quantity: number
  clientName: string
  status: string
  dueDate?: string
  submittedBy: string
}

interface DefectType {
  id: string
  name: string
  category: 'CRITICAL' | 'MAJOR' | 'MINOR'
  description: string
}

interface MobileQCInspectionProps {
  qcItem: QCItem
  onSubmit: (result: QCResult) => void
  onCancel: () => void
}

interface QCResult {
  status: 'PASS' | 'FAIL' | 'PARTIAL'
  passedQuantity: number
  rejectedQuantity: number
  defects: { type: string, count: number, severity: string }[]
  notes: string
  photos: string[]
}

const commonDefects: DefectType[] = [
  { id: 'print_misalign', name: 'Print Misalignment', category: 'MAJOR', description: 'Print not centered or crooked' },
  { id: 'color_mismatch', name: 'Color Mismatch', category: 'MAJOR', description: 'Colors different from approved sample' },
  { id: 'fabric_defect', name: 'Fabric Defect', category: 'CRITICAL', description: 'Holes, stains, or fabric damage' },
  { id: 'size_error', name: 'Size Error', category: 'CRITICAL', description: 'Wrong size or dimensions' },
  { id: 'stitching_defect', name: 'Stitching Defect', category: 'MAJOR', description: 'Loose threads, uneven seams' },
  { id: 'print_quality', name: 'Print Quality', category: 'MINOR', description: 'Slight print imperfections' },
  { id: 'label_issue', name: 'Label Issue', category: 'MINOR', description: 'Missing or incorrect labels' },
  { id: 'packaging', name: 'Packaging', category: 'MINOR', description: 'Packaging defects' }
]

export function MobileQCInspection({ qcItem, onSubmit, onCancel }: MobileQCInspectionProps) {
  const [inspectionStatus, setInspectionStatus] = useState<'PASS' | 'FAIL' | 'PARTIAL' | ''>('')
  const [passedQty, setPassedQty] = useState(qcItem.quantity.toString())
  const [rejectedQty, setRejectedQty] = useState('0')
  const [selectedDefects, setSelectedDefects] = useState<{ [key: string]: number }>({})
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDefectSelection, setShowDefectSelection] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleStatusChange = (status: 'PASS' | 'FAIL' | 'PARTIAL') => {
    setInspectionStatus(status)
    
    if (status === 'PASS') {
      setPassedQty(qcItem.quantity.toString())
      setRejectedQty('0')
      setSelectedDefects({})
    } else if (status === 'FAIL') {
      setPassedQty('0')
      setRejectedQty(qcItem.quantity.toString())
      setShowDefectSelection(true)
    } else if (status === 'PARTIAL') {
      setShowDefectSelection(true)
    }
  }

  const handleDefectChange = (defectId: string, count: number) => {
    if (count === 0) {
      const newDefects = { ...selectedDefects }
      delete newDefects[defectId]
      setSelectedDefects(newDefects)
    } else {
      setSelectedDefects(prev => ({ ...prev, [defectId]: count }))
    }
  }

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setPhotos(prev => [...prev, e.target.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!inspectionStatus) return

    const passed = parseInt(passedQty) || 0
    const rejected = parseInt(rejectedQty) || 0
    
    if (passed + rejected !== qcItem.quantity) {
      alert('Passed + Rejected quantities must equal total quantity')
      return
    }

    setIsSubmitting(true)
    
    const result: QCResult = {
      status: inspectionStatus,
      passedQuantity: passed,
      rejectedQuantity: rejected,
      defects: Object.entries(selectedDefects).map(([defectId, count]) => {
        const defect = commonDefects.find(d => d.id === defectId)
        return {
          type: defect?.name || defectId,
          count,
          severity: defect?.category || 'MINOR'
        }
      }),
      notes,
      photos
    }

    try {
      await onSubmit(result)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSeverityColor = (category: string) => {
    switch (category) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300'
      case 'MAJOR': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MINOR': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="space-y-4 max-h-screen overflow-y-auto">
      {/* Item Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            QC Inspection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <strong>Order:</strong> {qcItem.orderNumber}
            </div>
            <div>
              <strong>Quantity:</strong> {qcItem.quantity} pcs
            </div>
            <div className="col-span-2">
              <strong>Product:</strong> {qcItem.productName}
            </div>
            <div className="col-span-2">
              <strong>Client:</strong> {qcItem.clientName}
            </div>
          </div>
          
          {qcItem.dueDate && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Clock className="w-4 h-4" />
              Due: {new Date(qcItem.dueDate).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Result */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Inspection Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Selection */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={inspectionStatus === 'PASS' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('PASS')}
              className={`${inspectionStatus === 'PASS' ? 'bg-green-500 hover:bg-green-600' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Pass
            </Button>
            <Button
              variant={inspectionStatus === 'PARTIAL' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('PARTIAL')}
              className={`${inspectionStatus === 'PARTIAL' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-300 text-orange-700 hover:bg-orange-50'}`}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Partial
            </Button>
            <Button
              variant={inspectionStatus === 'FAIL' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('FAIL')}
              className={`${inspectionStatus === 'FAIL' ? 'bg-red-500 hover:bg-red-600' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Fail
            </Button>
          </div>

          {/* Quantity Input */}
          {inspectionStatus && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passed
                </label>
                <input
                  type="number"
                  value={passedQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setPassedQty(e.target.value)
                    setRejectedQty((qcItem.quantity - val).toString())
                  }}
                  min="0"
                  max={qcItem.quantity}
                  className="w-full px-3 py-2 border rounded-lg text-lg font-bold text-green-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejected
                </label>
                <input
                  type="number"
                  value={rejectedQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setRejectedQty(e.target.value)
                    setPassedQty((qcItem.quantity - val).toString())
                  }}
                  min="0"
                  max={qcItem.quantity}
                  className="w-full px-3 py-2 border rounded-lg text-lg font-bold text-red-600"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Defects Selection */}
      {showDefectSelection && parseInt(rejectedQty) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Defects Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commonDefects.map(defect => (
              <div key={defect.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{defect.name}</h4>
                    <Badge className={`text-xs border ${getSeverityColor(defect.category)}`}>
                      {defect.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDefectChange(defect.id, Math.max(0, (selectedDefects[defect.id] || 0) - 1))}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">
                      {selectedDefects[defect.id] || 0}
                    </span>
                    <button
                      onClick={() => handleDefectChange(defect.id, (selectedDefects[defect.id] || 0) + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{defect.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Photo Upload Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Gallery
            </Button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
            multiple
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoCapture}
            className="hidden"
            multiple
          />

          {/* Photo Preview Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`QC Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add inspection notes, observations, or recommendations..."
            className="w-full px-3 py-2 border rounded-lg resize-none"
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white pt-4 pb-4 border-t space-y-2">
        <Button
          onClick={handleSubmit}
          disabled={!inspectionStatus || isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-600 h-12 text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <RotateCw className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileCheck className="w-5 h-5 mr-2" />
              Submit Inspection
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full h-12 text-base"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}