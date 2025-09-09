'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Scan,
  Camera,
  CameraOff,
  Target,
  CheckCircle,
  AlertCircle,
  Package,
  Zap,
  Database,
  Clock,
  Activity,
  RefreshCw,
  X,
  Upload,
  FileImage,
  Search,
  Cpu,
  Eye
} from 'lucide-react'

interface ScanResult {
  id: string
  type: 'inventory_batch' | 'product' | 'location' | 'unknown'
  data: any
  timestamp: Date
  confidence: number
  rawData: string
}

interface QRScannerProps {
  onScanResult?: (result: ScanResult) => void
  onBatchUpdate?: (batchData: any) => void
}

export function QRScanner({ onScanResult, onBatchUpdate }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Neural pattern recognition for QR data
  const analyzeQRData = (rawData: string): ScanResult => {
    try {
      // Try to parse as JSON first (for inventory batches)
      const parsed = JSON.parse(rawData)
      
      if (parsed.type === 'INVENTORY_BATCH') {
        return {
          id: `scan_${Date.now()}`,
          type: 'inventory_batch',
          data: parsed,
          timestamp: new Date(),
          confidence: 0.95,
          rawData
        }
      }
      
      // Check for product codes
      if (rawData.match(/^[A-Z]{3}-\d{3}-[A-Z]+$/)) {
        return {
          id: `scan_${Date.now()}`,
          type: 'product',
          data: { sku: rawData },
          timestamp: new Date(),
          confidence: 0.88,
          rawData
        }
      }
      
      // Check for location codes
      if (rawData.match(/^LOC-[A-Z]\d+-[A-Z]\d+$/)) {
        return {
          id: `scan_${Date.now()}`,
          type: 'location',
          data: { location: rawData },
          timestamp: new Date(),
          confidence: 0.92,
          rawData
        }
      }
      
      return {
        id: `scan_${Date.now()}`,
        type: 'unknown',
        data: { content: rawData },
        timestamp: new Date(),
        confidence: 0.5,
        rawData
      }
    } catch (e) {
      // Plain text QR code
      return {
        id: `scan_${Date.now()}`,
        type: 'unknown',
        data: { content: rawData },
        timestamp: new Date(),
        confidence: 0.6,
        rawData
      }
    }
  }

  // Initialize camera stream
  const startCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        
        // Start scanning loop
        scanLoop()
      }
    } catch (error) {
      setCameraError('Unable to access camera. Please check permissions.')
      console.error('Camera access error:', error)
    }
  }

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  // Scanning loop for QR detection
  const scanLoop = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Simple QR detection simulation (in real app, use a QR library like jsQR)
      simulateQRDetection()
    }

    if (isScanning) {
      requestAnimationFrame(scanLoop)
    }
  }

  // Simulate QR detection (replace with real QR library)
  const simulateQRDetection = () => {
    // Simulate occasional QR detection for demo
    if (Math.random() < 0.001) { // Very low chance for demo
      const sampleBatchData = {
        type: 'INVENTORY_BATCH',
        id: 'batch_20250903001',
        batchNumber: 'BATCH-20250903-001',
        itemSku: 'CVC-160-WHITE',
        quantity: 150,
        unit: 'kg',
        receivedDate: '2025-09-03',
        supplier: 'Premium Textiles Inc.',
        location: 'Warehouse-A',
        qualityGrade: 'A',
        timestamp: new Date().toISOString()
      }
      
      handleScanDetection(JSON.stringify(sampleBatchData))
    }
  }

  // Handle QR detection
  const handleScanDetection = (rawData: string) => {
    const result = analyzeQRData(rawData)
    setCurrentScan(result)
    setScanResults(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 scans
    
    onScanResult?.(result)
    
    if (result.type === 'inventory_batch' && onBatchUpdate) {
      onBatchUpdate(result.data)
    }

    // Stop scanning after successful detection
    stopCamera()
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // In a real app, you'd process the image file to extract QR code
    // For demo, we'll simulate a successful scan
    setTimeout(() => {
      const sampleData = 'CVC-160-WHITE'
      handleScanDetection(sampleData)
    }, 1000)
  }

  // Manual input simulation
  const handleManualScan = () => {
    const input = prompt('Enter QR Code Data (or use sample):')
    if (input) {
      handleScanDetection(input)
    } else {
      // Use sample data
      const sampleBatch = {
        type: 'INVENTORY_BATCH',
        id: 'batch_demo',
        batchNumber: 'BATCH-20250903-DEMO',
        itemSku: 'DEMO-100-BLUE',
        itemName: 'Demo Fabric Blue',
        quantity: 75,
        unit: 'meters',
        receivedDate: '2025-09-03',
        supplier: 'Demo Supplier Co.',
        location: 'Warehouse-B',
        qualityGrade: 'A'
      }
      handleScanDetection(JSON.stringify(sampleBatch))
    }
  }

  useEffect(() => {
    return () => {
      stopCamera() // Cleanup on unmount
    }
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inventory_batch': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'product': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'location': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'unknown': return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      default: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inventory_batch': return Package
      case 'product': return Target
      case 'location': return Database
      case 'unknown': return Search
      default: return Scan
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="neon-btn-primary">
          <Scan className="mr-2 h-4 w-4" />
          Neural QR Scanner
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[85vh] neural-bg border border-cyan-500/30">
        <div className="quantum-field">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
          <DialogHeader className="border-b border-cyan-500/20 pb-4">
            <DialogTitle className="flex items-center text-white glitch-text" data-text="NEURAL QR SCANNER">
              <div className="ai-orb mr-3">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              NEURAL QR SCANNER
              <div className="ml-auto flex items-center gap-2">
                {isScanning && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <div className="neural-pulse mr-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    SCANNING
                  </Badge>
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="text-cyan-300 font-mono">
              Advanced Pattern Recognition • Real-time Processing • Multi-format Support
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Scanner Mode Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScanMode('camera')}
                  className={`neon-btn-outline ${scanMode === 'camera' ? 'text-cyan-400 border-cyan-400' : ''}`}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  CAMERA
                </button>
                <button
                  onClick={() => setScanMode('upload')}
                  className={`neon-btn-outline ${scanMode === 'upload' ? 'text-cyan-400 border-cyan-400' : ''}`}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  UPLOAD
                </button>
                <button
                  onClick={handleManualScan}
                  className="neon-btn-outline"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  DEMO SCAN
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scanner Interface */}
                <Card className="quantum-card border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="text-white font-mono">SCANNER INTERFACE</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {scanMode === 'camera' ? (
                      <div className="space-y-4">
                        <div className="relative bg-black rounded-lg overflow-hidden border border-cyan-500/30">
                          {isScanning ? (
                            <>
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-64 object-cover"
                              />
                              <canvas ref={canvasRef} className="hidden" />
                              
                              {/* Scanner Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 border-2 border-cyan-400 relative">
                                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
                                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400"></div>
                                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400"></div>
                                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>
                                  
                                  {/* Scanning Line */}
                                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400 animate-pulse"></div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="h-64 flex items-center justify-center">
                              <div className="text-center">
                                <div className="ai-orb mx-auto mb-4">
                                  <CameraOff className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-400 font-mono">Camera Inactive</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {cameraError && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-sm font-mono">{cameraError}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {!isScanning ? (
                            <Button onClick={startCamera} className="neon-btn-primary flex-1">
                              <Camera className="w-4 h-4 mr-2" />
                              START CAMERA
                            </Button>
                          ) : (
                            <Button onClick={stopCamera} className="neon-btn-outline flex-1">
                              <X className="w-4 h-4 mr-2" />
                              STOP CAMERA
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div
                          className="border-2 border-dashed border-cyan-500/30 rounded-lg p-12 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FileImage className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                          <p className="text-white font-mono mb-2">Upload QR Code Image</p>
                          <p className="text-cyan-400 text-sm">Click to select file or drag and drop</p>
                        </div>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Scan Result */}
                <Card className="quantum-card border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-white font-mono">SCAN RESULT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentScan ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getTypeColor(currentScan.type)}>
                              {currentScan.type.toUpperCase().replace('_', ' ')}
                            </Badge>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {Math.round(currentScan.confidence * 100)}% CONFIDENCE
                            </Badge>
                          </div>
                          
                          <div className="neural-pulse">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {currentScan.type === 'inventory_batch' && (
                            <>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Batch:</span>
                                  <p className="text-cyan-400 font-mono">{currentScan.data.batchNumber}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Item:</span>
                                  <p className="text-white">{currentScan.data.itemName || currentScan.data.itemSku}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Quantity:</span>
                                  <p className="text-green-400">{currentScan.data.quantity} {currentScan.data.unit}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Supplier:</span>
                                  <p className="text-purple-400">{currentScan.data.supplier}</p>
                                </div>
                              </div>
                              
                              <Button 
                                onClick={() => onBatchUpdate?.(currentScan.data)}
                                className="neon-btn-primary w-full"
                              >
                                <Package className="w-4 h-4 mr-2" />
                                UPDATE INVENTORY
                              </Button>
                            </>
                          )}
                          
                          {currentScan.type !== 'inventory_batch' && (
                            <div className="space-y-2">
                              <div>
                                <span className="text-gray-400 text-sm">Raw Data:</span>
                                <p className="text-cyan-400 font-mono text-sm break-all">
                                  {currentScan.rawData}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-400 font-mono">
                          Scanned: {currentScan.timestamp.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="ai-orb mx-auto mb-4">
                          <Target className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-400 font-mono">No scan detected yet</p>
                        <p className="text-xs text-gray-500 mt-2">Point camera at QR code or upload image</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Scan History */}
              {scanResults.length > 0 && (
                <Card className="quantum-card border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="text-white font-mono">SCAN HISTORY</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {scanResults.map((result) => {
                        const TypeIcon = getTypeIcon(result.type)
                        return (
                          <div
                            key={result.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-600/30 hover:border-cyan-500/30 transition-colors cursor-pointer"
                            onClick={() => setCurrentScan(result)}
                          >
                            <div className="ai-orb-small">
                              <TypeIcon className="w-4 h-4 text-cyan-400" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getTypeColor(result.type)}>
                                  {result.type.toUpperCase().replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-400 font-mono">
                                  {Math.round(result.confidence * 100)}%
                                </span>
                              </div>
                              <p className="text-sm text-cyan-300 truncate">
                                {result.type === 'inventory_batch' 
                                  ? result.data.batchNumber 
                                  : result.rawData}
                              </p>
                            </div>
                            
                            <div className="text-xs text-gray-400 font-mono">
                              {result.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}