'use client'

import { useState, useRef } from 'react'
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
  QrCode, 
  Download, 
  Print, 
  Package, 
  Hash,
  Calendar,
  Building,
  Printer,
  Copy,
  CheckCircle
} from 'lucide-react'

interface BatchData {
  id: string
  batchNumber: string
  itemSku: string
  itemName: string
  quantity: number
  unit: string
  receivedDate: string
  supplier: string
  location: string
  expiryDate?: string
  lotNumber?: string
  qualityGrade: 'A' | 'B' | 'C'
  notes?: string
}

interface QRCodeGeneratorProps {
  onBatchCreate?: (batchData: BatchData) => void
}

export function QRCodeGenerator({ onBatchCreate }: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [batchData, setBatchData] = useState<Partial<BatchData>>({
    qualityGrade: 'A',
    receivedDate: new Date().toISOString().split('T')[0],
    quantity: 0
  })
  const [generatedQR, setGeneratedQR] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateBatchNumber = () => {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BATCH-${dateStr}-${random}`
  }

  const generateQRData = (batch: BatchData) => {
    return JSON.stringify({
      type: 'INVENTORY_BATCH',
      id: batch.id,
      batchNumber: batch.batchNumber,
      itemSku: batch.itemSku,
      quantity: batch.quantity,
      unit: batch.unit,
      receivedDate: batch.receivedDate,
      supplier: batch.supplier,
      location: batch.location,
      qualityGrade: batch.qualityGrade,
      timestamp: new Date().toISOString()
    })
  }

  const generateQRCode = async (data: string) => {
    // Simple QR code generation using canvas
    // In a real app, you'd use a proper QR code library like qrcode
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 200
    canvas.height = 200

    // Fill with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 200, 200)

    // Create a simple pattern (placeholder for actual QR code)
    ctx.fillStyle = 'black'
    const gridSize = 10
    const hash = data.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const shouldFill = ((x + y + hash) % 3) === 0
        if (shouldFill) {
          ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize)
        }
      }
    }

    return canvas.toDataURL('image/png')
  }

  const handleCreateBatch = async () => {
    if (!batchData.itemSku || !batchData.itemName || !batchData.quantity || !batchData.supplier) {
      return
    }

    const newBatch: BatchData = {
      id: `batch_${Date.now()}`,
      batchNumber: generateBatchNumber(),
      itemSku: batchData.itemSku,
      itemName: batchData.itemName,
      quantity: batchData.quantity,
      unit: batchData.unit || 'pcs',
      receivedDate: batchData.receivedDate || new Date().toISOString().split('T')[0],
      supplier: batchData.supplier,
      location: batchData.location || 'Warehouse-A',
      expiryDate: batchData.expiryDate,
      lotNumber: batchData.lotNumber,
      qualityGrade: batchData.qualityGrade || 'A',
      notes: batchData.notes
    }

    const qrData = generateQRData(newBatch)
    const qrImage = await generateQRCode(qrData)
    
    if (qrImage) {
      setGeneratedQR(qrImage)
      onBatchCreate?.(newBatch)
    }
  }

  const handleDownloadQR = () => {
    if (generatedQR) {
      const link = document.createElement('a')
      link.download = `batch-${batchData.batchNumber}-qr.png`
      link.href = generatedQR
      link.click()
    }
  }

  const handlePrintQR = () => {
    if (generatedQR) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>QR Code - ${batchData.batchNumber}</title></head>
            <body style="text-align: center; font-family: Arial, sans-serif;">
              <h2>${batchData.itemName}</h2>
              <p><strong>Batch:</strong> ${batchData.batchNumber}</p>
              <p><strong>SKU:</strong> ${batchData.itemSku}</p>
              <p><strong>Qty:</strong> ${batchData.quantity} ${batchData.unit}</p>
              <img src="${generatedQR}" style="margin: 20px;" />
              <p><strong>Received:</strong> ${batchData.receivedDate}</p>
              <p><strong>Supplier:</strong> ${batchData.supplier}</p>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const copyQRData = () => {
    if (batchData.batchNumber) {
      const qrData = generateQRData(batchData as BatchData)
      navigator.clipboard.writeText(qrData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const qualityGradeColors = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-yellow-100 text-yellow-800', 
    C: 'bg-red-100 text-red-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <QrCode className="mr-2 h-4 w-4" />
          Generate QR Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <QrCode className="h-5 w-5" />
            <span>Generate Inventory Batch QR Code</span>
          </DialogTitle>
          <DialogDescription>
            Create a new inventory batch with QR code for tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!generatedQR ? (
            // Batch Creation Form
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="itemSku">Item SKU *</Label>
                  <Input
                    id="itemSku"
                    value={batchData.itemSku || ''}
                    onChange={(e) => setBatchData({ ...batchData, itemSku: e.target.value })}
                    placeholder="e.g., CVC-160-WHITE"
                  />
                </div>

                <div>
                  <Label htmlFor="itemName">Item Name *</Label>
                  <Input
                    id="itemName"
                    value={batchData.itemName || ''}
                    onChange={(e) => setBatchData({ ...batchData, itemName: e.target.value })}
                    placeholder="e.g., CVC 160gsm White Fabric"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={batchData.quantity || ''}
                      onChange={(e) => setBatchData({ ...batchData, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={batchData.unit || ''}
                      onChange={(e) => setBatchData({ ...batchData, unit: e.target.value })}
                      placeholder="kg, pcs, m"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    value={batchData.supplier || ''}
                    onChange={(e) => setBatchData({ ...batchData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="receivedDate">Received Date</Label>
                  <Input
                    id="receivedDate"
                    type="date"
                    value={batchData.receivedDate || ''}
                    onChange={(e) => setBatchData({ ...batchData, receivedDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    value={batchData.location || ''}
                    onChange={(e) => setBatchData({ ...batchData, location: e.target.value })}
                    placeholder="Warehouse-A, Shelf-B1"
                  />
                </div>

                <div>
                  <Label htmlFor="lotNumber">Lot Number</Label>
                  <Input
                    id="lotNumber"
                    value={batchData.lotNumber || ''}
                    onChange={(e) => setBatchData({ ...batchData, lotNumber: e.target.value })}
                    placeholder="Optional lot number"
                  />
                </div>

                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={batchData.expiryDate || ''}
                    onChange={(e) => setBatchData({ ...batchData, expiryDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="qualityGrade">Quality Grade</Label>
                  <select
                    id="qualityGrade"
                    value={batchData.qualityGrade}
                    onChange={(e) => setBatchData({ ...batchData, qualityGrade: e.target.value as 'A' | 'B' | 'C' })}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="A">Grade A - Premium</option>
                    <option value="B">Grade B - Standard</option>
                    <option value="C">Grade C - Economy</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            // Generated QR Code Display
            <div className="space-y-6">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Batch Created Successfully</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Batch Number:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{batchData.batchNumber}</code>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{batchData.itemName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{batchData.receivedDate}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{batchData.supplier}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={qualityGradeColors[batchData.qualityGrade || 'A']}>
                          Grade {batchData.qualityGrade}
                        </Badge>
                        <span className="text-sm">{batchData.quantity} {batchData.unit}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <canvas ref={canvasRef} className="hidden" />
                      <img 
                        src={generatedQR} 
                        alt="QR Code" 
                        className="border border-gray-300 rounded-lg mb-3"
                        width={200}
                        height={200}
                      />
                      <p className="text-xs text-gray-500 text-center">
                        Scan to access batch information
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-2 justify-center">
                <Button variant="outline" onClick={handleDownloadQR}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={handlePrintQR}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={copyQRData}>
                  {copied ? (
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy Data'}
                </Button>
              </div>
            </div>
          )}

          {batchData.notes && (
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={batchData.notes || ''}
                onChange={(e) => setBatchData({ ...batchData, notes: e.target.value })}
                placeholder="Additional notes about this batch"
              />
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {generatedQR ? 'Close' : 'Cancel'}
          </Button>
          
          {!generatedQR && (
            <Button 
              onClick={handleCreateBatch}
              disabled={!batchData.itemSku || !batchData.itemName || !batchData.quantity || !batchData.supplier}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Generate QR Code
            </Button>
          )}
          
          {generatedQR && (
            <Button 
              onClick={() => {
                setGeneratedQR(null)
                setBatchData({ 
                  qualityGrade: 'A',
                  receivedDate: new Date().toISOString().split('T')[0],
                  quantity: 0 
                })
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Create Another Batch
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}