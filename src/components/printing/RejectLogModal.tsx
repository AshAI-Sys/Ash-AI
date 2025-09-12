// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
  import {
  AlertTriangle,
  Camera,
  Upload,
  CheckCircle,
  Bot,
  TrendingDown,
  DollarSign,
  User,
  Building,
  Truck,
  X
} from 'lucide-react'

interface RejectLogModalProps {
  isOpen: boolean
  onClose: () => void
  printRun: any
  onLog: (data: any) => void
}

const rejectReasons = {
  'SILKSCREEN': [
    { code: 'MISALIGNMENT', label: 'Misalignment', severity: 'HIGH' },
    { code: 'GHOST', label: 'Ghost Image', severity: 'MEDIUM' },
    { code: 'INCOMPLETE_CURE', label: 'Incomplete Cure', severity: 'HIGH' },
    { code: 'COLOR_VARIATION', label: 'Color Variation', severity: 'MEDIUM' },
    { code: 'PINHOLES', label: 'Pin Holes', severity: 'LOW' },
    { code: 'STAINING', label: 'Ink Staining', severity: 'MEDIUM' }
  ],
  'SUBLIMATION': [
    { code: 'BLURRED_PRINT', label: 'Blurred Print', severity: 'HIGH' },
    { code: 'COLOR_VARIATION', label: 'Color Variation', severity: 'MEDIUM' },
    { code: 'INCOMPLETE_TRANSFER', label: 'Incomplete Transfer', severity: 'HIGH' },
    { code: 'PAPER_WRINKLE', label: 'Paper Wrinkle', severity: 'MEDIUM' },
    { code: 'HEAT_MARKS', label: 'Heat Marks', severity: 'MEDIUM' }
  ],
  'DTF': [
    { code: 'PEEL', label: 'Peeling', severity: 'HIGH' },
    { code: 'CRACK', label: 'Cracking', severity: 'HIGH' },
    { code: 'ADHESION_FAIL', label: 'Adhesion Failure', severity: 'HIGH' },
    { code: 'POWDER_EXCESS', label: 'Excess Powder', severity: 'LOW' },
    { code: 'INCOMPLETE_MELT', label: 'Incomplete Melt', severity: 'MEDIUM' }
  ],
  'EMBROIDERY': [
    { code: 'THREAD_BREAK', label: 'Thread Break', severity: 'MEDIUM' },
    { code: 'PUCKERING', label: 'Puckering', severity: 'HIGH' },
    { code: 'NEEDLE_HOLE', label: 'Large Needle Holes', severity: 'MEDIUM' },
    { code: 'DENSITY_ISSUE', label: 'Density Issues', severity: 'MEDIUM' },
    { code: 'REGISTRATION', label: 'Registration Error', severity: 'HIGH' }
  ]
}

const generalReasons = [
  { code: 'FABRIC_DEFECT', label: 'Fabric Defect', severity: 'MEDIUM' },
  { code: 'OPERATOR_ERROR', label: 'Operator Error', severity: 'MEDIUM' },
  { code: 'MACHINE_MALFUNCTION', label: 'Machine Malfunction', severity: 'HIGH' },
  { code: 'MATERIAL_DEFECT', label: 'Material Defect', severity: 'MEDIUM' },
  { code: 'DESIGN_ERROR', label: 'Design Error', severity: 'HIGH' },
  { code: 'OTHER', label: 'Other', severity: 'MEDIUM' }
]

const costAttributions = [
  { value: 'SUPPLIER', label: 'Supplier', icon: Truck, description: 'Material or equipment supplier fault' },
  { value: 'STAFF', label: 'Staff', icon: User, description: 'Operator or staff error' },
  { value: 'COMPANY', label: 'Company', icon: Building, description: 'Process or system issue' },
  { value: 'CLIENT', label: 'Client', icon: DollarSign, description: 'Client design or specification issue' }
]

export function RejectLogModal({ isOpen, onClose, printRun, onLog }: RejectLogModalProps) {
  const [reasonCode, setReasonCode] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [costAttribution, setCostAttribution] = useState<string>('')
  const [bundleId, setBundleId] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!printRun) return null

  const availableReasons = [
    ...(rejectReasons[printRun.method as keyof typeof rejectReasons] || []),
    ...generalReasons
  ]

  const selectedReason = availableReasons.find(r => r.code === reasonCode)
  const selectedAttribution = costAttributions.find(a => a.value === costAttribution)

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      setPhotoFile(file)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    // Reset file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async () => {
    if (!reasonCode || !quantity || !costAttribution) {
      alert('Please fill in all required fields')
      return
    }

    const qty = parseFloat(quantity)
    if (qty <= 0) {
      alert('Quantity must be greater than 0')
      return
    }

    setIsSubmitting(true)
    try {
      // Upload photo if provided
      let photoUrl = null
      if (photoFile) {
        const formData = new FormData()
        formData.append('photo', photoFile)
        formData.append('context', `reject-${printRun.id}-${Date.now()}`)
        
        // In a real app, you'd upload to a file storage service
        // For now, we'll create a temporary URL
        photoUrl = URL.createObjectURL(photoFile)
      }

      const rejectData = {
        reasonCode,
        qty,
        costAttribution,
        bundleId: bundleId || null,
        photoUrl,
        notes
      }

      const response = await fetch(`/api/printing/runs/${printRun.id}/rejects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectData)
      })

      if (response.ok) {
        onLog(rejectData)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to log reject')
      }
    } catch (error) {
      console.error('Error logging reject:', error)
      alert('Error logging reject. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getImpactLevel = () => {
    const qty = parseFloat(quantity) || 0
    const total = printRun.totalGood + printRun.totalReject + qty
    const newRejectRate = total > 0 ? ((printRun.totalReject + qty) / total) * 100 : 0
    
    if (newRejectRate > 15) return { level: 'HIGH', color: 'red', message: 'High impact - Reject rate > 15%' }
    if (newRejectRate > 5) return { level: 'MEDIUM', color: 'yellow', message: 'Medium impact - Reject rate > 5%' }
    return { level: 'LOW', color: 'green', message: 'Low impact - Acceptable reject rate' }
  }

  const impact = getImpactLevel()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto ash-glass backdrop-blur-xl border border-white/20">
        <DialogHeader className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 rounded-t-lg"></div>
          <DialogTitle className="relative flex items-center space-x-3 text-2xl font-bold">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center ash-animate-pulse-slow">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <span className="ash-gradient-text">Log Reject Record</span>
          </DialogTitle>
          <DialogDescription className="relative text-lg text-slate-600 mt-2">
            Record quality issues and rejects for print run: {printRun.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Print Run Info */}
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-red-600 font-medium">Order:</span>
                  <span className="ml-2 text-red-800">{printRun.orderNumber}</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Method:</span>
                  <span className="ml-2 text-red-800">{printRun.method}</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Current Good:</span>
                  <span className="ml-2 text-red-800">{printRun.totalGood}</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Current Rejects:</span>
                  <span className="ml-2 text-red-800">{printRun.totalReject}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reject Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reason Selection */}
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span>Reject Reason</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reason" className="text-sm font-medium">Reason Code *</Label>
                  <select
                    id="reason"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg enhanced-input"
                  >
                    <option value="">Select reason</option>
                    <optgroup label={`${printRun.method} Specific`}>
                      {(rejectReasons[printRun.method as keyof typeof rejectReasons] || []).map(reason => (
                        <option key={reason.code} value={reason.code}>
                          {reason.label} ({reason.severity})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="General Reasons">
                      {generalReasons.map(reason => (
                        <option key={reason.code} value={reason.code}>
                          {reason.label} ({reason.severity})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <Label htmlFor="quantity" className="text-sm font-medium">Rejected Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="enhanced-input"
                    min="1"
                    step="1"
                  />
                </div>

                <div>
                  <Label htmlFor="bundle" className="text-sm font-medium">Bundle ID (Optional)</Label>
                  <Input
                    id="bundle"
                    value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                    placeholder="Enter bundle ID if applicable"
                    className="enhanced-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cost Attribution */}
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <span>Cost Attribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Who is responsible? *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {costAttributions.map((attribution) => (
                      <div 
                        key={attribution.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          costAttribution === attribution.value 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                        onClick={() => setCostAttribution(attribution.value)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <attribution.icon className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-sm">{attribution.label}</span>
                          {costAttribution === attribution.value && (
                            <CheckCircle className="w-4 h-4 text-orange-600 ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{attribution.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Assessment */}
                {quantity && (
                  <div className={`p-3 rounded-lg border ${
                    impact.color === 'red' ? 'bg-red-50 border-red-200' :
                    impact.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className={`w-4 h-4 ${
                        impact.color === 'red' ? 'text-red-600' :
                        impact.color === 'yellow' ? 'text-yellow-600' :
                        'text-green-600'
                      }`} />
                      <span className={`font-medium text-sm ${
                        impact.color === 'red' ? 'text-red-800' :
                        impact.color === 'yellow' ? 'text-yellow-800' :
                        'text-green-800'
                      }`}>
                        Impact: {impact.level}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      impact.color === 'red' ? 'text-red-700' :
                      impact.color === 'yellow' ? 'text-yellow-700' :
                      'text-green-700'
                    }`}>
                      {impact.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Photo Upload */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <span>Photo Evidence (Recommended)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!photoFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload photo of the defect</p>
                  <p className="text-xs text-gray-500 mb-4">PNG, JPG up to 10MB</p>
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Button variant="outline" className="pointer-events-none">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Camera className="w-6 h-6 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{photoFile.name}</p>
                      <p className="text-xs text-gray-500">{(photoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={removePhoto}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
                <span>Additional Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue in detail, root cause analysis, corrective actions taken..."
                className="min-h-24"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/500 characters
              </p>
            </CardContent>
          </Card>

          {/* Ashley AI Analysis */}
          {selectedReason && quantity && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-800">Ashley AI Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedReason.code === 'MISALIGNMENT' && (
                    <>
                      <div className="text-sm text-blue-700">• Check screen registration and garment positioning</div>
                      <div className="text-sm text-blue-700">• Verify press setup and alignment guides</div>
                      <div className="text-sm text-blue-700">• Consider operator training if recurring</div>
                    </>
                  )}
                  {selectedReason.code === 'PEEL' && (
                    <>
                      <div className="text-sm text-blue-700">• Check heat press temperature and pressure settings</div>
                      <div className="text-sm text-blue-700">• Verify transfer film quality and storage conditions</div>
                      <div className="text-sm text-blue-700">• Ensure proper pre-treatment of garments</div>
                    </>
                  )}
                  {selectedReason.code === 'THREAD_BREAK' && (
                    <>
                      <div className="text-sm text-blue-700">• Check thread tension settings</div>
                      <div className="text-sm text-blue-700">• Inspect needle condition and size compatibility</div>
                      <div className="text-sm text-blue-700">• Verify thread quality and age</div>
                    </>
                  )}
                  <div className="text-sm text-blue-700">• Consider implementing additional QC checkpoint</div>
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
            disabled={!reasonCode || !quantity || !costAttribution || isSubmitting}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Logging...' : 'Log Reject'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}