'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  QrCode, 
  Camera, 
  Flashlight, 
  RotateCw, 
  Package, 
  CheckCircle,
  XCircle,
  History,
  Scan
} from 'lucide-react'

interface ScanResult {
  found: boolean
  item?: {
    id: string
    name: string
    sku: string
    quantity: number
    unit: string
  }
  stockStatus?: string
  currentStock?: number
  message?: string
}

interface MobileScannerProps {
  onScanResult: (code: string, result: ScanResult) => void
  isProcessing?: boolean
}

export function MobileScanner({ onScanResult, isProcessing = false }: MobileScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<string[]>([])
  const [manualCode, setManualCode] = useState('')
  const [flashEnabled, setFlashEnabled] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start camera for scanning
  const startScanning = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }, [])

  // Stop camera
  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Toggle flashlight
  const toggleFlash = useCallback(async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      if (track && 'applyConstraints' in track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled }]
          })
          setFlashEnabled(!flashEnabled)
        } catch (error) {
          console.log('Flash not supported on this device')
        }
      }
    }
  }, [flashEnabled])

  // Process manual code input
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return
    
    try {
      const response = await fetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: manualCode.trim(), action: 'lookup' })
      })
      
      const result = await response.json()
      setLastScanResult(result)
      setScanHistory(prev => [manualCode.trim(), ...prev.slice(0, 9)])
      onScanResult(manualCode.trim(), result)
      setManualCode('')
    } catch (error) {
      console.error('Error processing manual code:', error)
    }
  }

  // Process scanned QR/barcode (integrate with actual scanner library)
  const processScan = useCallback(async (code: string) => {
    try {
      const response = await fetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, action: 'lookup' })
      })
      
      const result = await response.json()
      setLastScanResult(result)
      setScanHistory(prev => [code, ...prev.slice(0, 9)])
      onScanResult(code, result)
      
      // Audio feedback
      if (result.found) {
        // Success beep - you can add audio feedback here
        navigator.vibrate && navigator.vibrate([100])
      } else {
        // Error beep
        navigator.vibrate && navigator.vibrate([100, 50, 100])
      }
    } catch (error) {
      console.error('Error processing scan:', error)
      setLastScanResult({
        found: false,
        message: 'Network error. Please try again.'
      })
    }
  }, [onScanResult])

  // Simulate successful scan for testing
  const simulateScan = (code: string) => {
    setManualCode(code)
    processScan(code)
  }

  return (
    <div className="space-y-4">
      {/* Camera Scanner */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[4/3]">
            {isScanning ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-48 border-2 border-white rounded-lg opacity-60"></div>
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-lg animate-pulse">
                      {/* Scanning line */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-bounce"></div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-300 mb-4">Tap to start scanning</p>
                  <Button
                    onClick={startScanning}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {isScanning && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFlash}
                className={flashEnabled ? 'bg-yellow-100' : ''}
              >
                <Flashlight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={stopScanning}>
                Stop
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => simulateScan('TEST123')}
                className="ml-auto"
              >
                Test Scan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Manual Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Enter barcode/QR/SKU"
              className="flex-1 px-3 py-2 border rounded-lg text-lg font-mono"
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit()
                }
              }}
            />
            <Button 
              onClick={handleManualSubmit}
              disabled={!manualCode.trim() || isProcessing}
              className="min-w-[80px]"
            >
              {isProcessing ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                'Scan'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {lastScanResult && (
        <Card className={`border-2 ${lastScanResult.found ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {lastScanResult.found ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                {lastScanResult.found && lastScanResult.item ? (
                  <>
                    <h3 className="font-semibold text-green-900 mb-1">
                      {lastScanResult.item.name}
                    </h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>SKU:</strong> {lastScanResult.item.sku}</p>
                      <p><strong>Stock:</strong> {lastScanResult.currentStock} {lastScanResult.item.unit}</p>
                      <p className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        lastScanResult.stockStatus === 'IN_STOCK' 
                          ? 'bg-green-100 text-green-800'
                          : lastScanResult.stockStatus === 'LOW_STOCK'
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {lastScanResult.stockStatus?.replace('_', ' ')}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-red-700">
                    <h3 className="font-semibold mb-1">Item Not Found</h3>
                    <p className="text-sm">{lastScanResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanHistory.slice(0, 5).map((code, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setManualCode(code)
                    handleManualSubmit()
                  }}
                  className="w-full text-left px-3 py-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors font-mono text-sm"
                >
                  {code}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}