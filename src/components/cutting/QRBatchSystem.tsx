'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  QrCode,
  Package,
  Eye,
  Download,
  Printer,
  Scan,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Calendar,
  Hash,
  Layers,
  Activity,
  BarChart3,
  Search,
  Filter,
  RefreshCw,
  Plus
} from 'lucide-react'

interface QRBatch {
  id: string
  batchNumber: string
  orderId: string
  poNumber: string
  designName: string
  cuttingJobId: string
  createdAt: string
  createdBy: string
  totalPieces: number
  scannedPieces: number
  currentStation: string
  status: 'created' | 'in_production' | 'completed' | 'quality_check' | 'shipped'
  qrCodes: QRPiece[]
}

interface QRPiece {
  id: string
  qrCode: string
  size: string
  pieceNumber: number
  color: string
  material: string
  scannedAt?: string
  scannedBy?: string
  currentLocation: string
  stationHistory: {
    station: string
    timestamp: string
    operator: string
    notes?: string
  }[]
}

interface QRBatchSystemProps {
  isOpen: boolean
  onClose: () => void
  cuttingJob?: any
}

const mockQRBatches: QRBatch[] = [
  {
    id: 'batch_001',
    batchNumber: 'QR-CUT-001-20240901',
    orderId: 'order_1',
    poNumber: 'REEF-2024-000123',
    designName: 'Corporate Logo Tee Design',
    cuttingJobId: 'cut_001',
    createdAt: '2024-09-01T08:30:00Z',
    createdBy: 'Maria Santos',
    totalPieces: 50,
    scannedPieces: 35,
    currentStation: 'Silkscreen',
    status: 'in_production',
    qrCodes: [
      {
        id: 'piece_001',
        qrCode: 'ASH-QR-001-001',
        size: 'M',
        pieceNumber: 1,
        color: 'Navy Blue',
        material: 'Cotton Jersey',
        scannedAt: '2024-09-01T09:15:00Z',
        scannedBy: 'Carlos Printing',
        currentLocation: 'Silkscreen Station 1',
        stationHistory: [
          {
            station: 'Cutting',
            timestamp: '2024-09-01T08:45:00Z',
            operator: 'Maria Santos',
            notes: 'Cut successfully'
          },
          {
            station: 'Quality Check',
            timestamp: '2024-09-01T09:00:00Z',
            operator: 'Ana QC',
            notes: 'Passed cutting inspection'
          },
          {
            station: 'Silkscreen',
            timestamp: '2024-09-01T09:15:00Z',
            operator: 'Carlos Printing',
            notes: 'Ready for printing'
          }
        ]
      }
    ]
  },
  {
    id: 'batch_002',
    batchNumber: 'QR-CUT-002-20240901',
    orderId: 'order_2',
    poNumber: 'SORB-2024-000098',
    designName: 'Sports Jersey All-Over Print',
    cuttingJobId: 'cut_002',
    createdAt: '2024-09-01T10:00:00Z',
    createdBy: 'Jose Cruz',
    totalPieces: 55,
    scannedPieces: 0,
    currentStation: 'Cutting Queue',
    status: 'created',
    qrCodes: []
  }
]

export function QRBatchSystem({ isOpen, onClose, cuttingJob }: QRBatchSystemProps) {
  const [batches, setBatches] = useState<QRBatch[]>(mockQRBatches)
  const [selectedBatch, setSelectedBatch] = useState<QRBatch | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showScanner, setShowScanner] = useState(false)

  if (!isOpen) return null

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_production': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'quality_check': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'shipped': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created': return <Plus className="w-4 h-4" />
      case 'in_production': return <Activity className="w-4 h-4" />
      case 'quality_check': return <CheckCircle className="w-4 h-4" />
      case 'completed': return <Package className="w-4 h-4" />
      case 'shipped': return <MapPin className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const generateQRBatch = (job: any) => {
    const newBatch: QRBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: `QR-CUT-${job.id.toUpperCase()}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      orderId: job.orderId,
      poNumber: job.poNumber,
      designName: job.designName,
      cuttingJobId: job.id,
      createdAt: new Date().toISOString(),
      createdBy: 'Current User',
      totalPieces: job.pieces.reduce((acc: number, p: any) => acc + p.quantity, 0),
      scannedPieces: 0,
      currentStation: 'Cutting',
      status: 'created',
      qrCodes: []
    }

    // Generate QR codes for each piece
    const pieceCounter = 1
    newBatch.qrCodes = job.pieces.flatMap((piece: any) => 
      Array.from({ length: piece.quantity }, (_, i) => ({
        id: `piece_${pieceCounter + i}`,
        qrCode: `ASH-QR-${newBatch.batchNumber}-${String(pieceCounter + i).padStart(3, '0')}`,
        size: piece.size,
        pieceNumber: pieceCounter + i,
        color: job.materials[0]?.color || 'Unknown',
        material: job.materials[0]?.type || 'Unknown',
        currentLocation: 'Cutting Station',
        stationHistory: [{
          station: 'Cutting',
          timestamp: new Date().toISOString(),
          operator: newBatch.createdBy,
          notes: 'QR code generated'
        }]
      }))
    )

    setBatches(prev => [newBatch, ...prev])
    return newBatch
  }

  const handlePrintQRCodes = (batch: QRBatch) => {
    // Secure print job handled by backend API
    onUpdate({ action: 'print_qr_batch', batchId: batch.id })
  }

  const stats = {
    totalBatches: batches.length,
    inProduction: batches.filter(b => b.status === 'in_production').length,
    completed: batches.filter(b => b.status === 'completed').length,
    totalPieces: batches.reduce((acc, b) => acc + b.totalPieces, 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="glass-card w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">QR Batch System</CardTitle>
                <p className="text-white/70">Track pieces throughout production with QR codes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowScanner(!showScanner)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                <Scan className="w-4 h-4 mr-2" />
                Scanner
              </Button>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {!selectedBatch ? (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">{stats.totalBatches}</div>
                    <div className="text-sm text-blue-600">Total Batches</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-900">{stats.inProduction}</div>
                    <div className="text-sm text-purple-600">In Production</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
                    <div className="text-sm text-green-600">Completed</div>
                  </CardContent>
                </Card>
                <Card className="enhanced-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-900">{stats.totalPieces}</div>
                    <div className="text-sm text-orange-600">Total Pieces</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search batches by number, design, or PO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white md:w-48"
                >
                  <option value="all">All Status</option>
                  <option value="created">Created</option>
                  <option value="in_production">In Production</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="completed">Completed</option>
                  <option value="shipped">Shipped</option>
                </select>
              </div>

              {/* Batches List */}
              <div className="space-y-4">
                {filteredBatches.map((batch) => (
                  <Card key={batch.id} className="enhanced-card hover-lift cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900 text-lg">{batch.batchNumber}</h4>
                            <Badge className={`text-xs ${getStatusColor(batch.status)}`}>
                              {getStatusIcon(batch.status)}
                              <span className="ml-1 capitalize">{batch.status.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Design:</span> {batch.designName}
                            </div>
                            <div>
                              <span className="font-medium">PO Number:</span> {batch.poNumber}
                            </div>
                            <div>
                              <span className="font-medium">Station:</span> {batch.currentStation}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {new Date(batch.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Production Progress</span>
                              <span>{batch.scannedPieces} / {batch.totalPieces} pieces</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${(batch.scannedPieces / batch.totalPieces) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-6">
                          <Button
                            size="sm"
                            onClick={() => setSelectedBatch(batch)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintQRCodes(batch)}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print QR
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Generate New Batch */}
              {cuttingJob && (
                <Card className="enhanced-card border-dashed border-2 border-indigo-300">
                  <CardContent className="p-6 text-center">
                    <QrCode className="w-12 h-12 mx-auto text-indigo-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate QR Batch</h3>
                    <p className="text-gray-600 mb-4">
                      Create QR codes for {cuttingJob.designName} cutting job
                    </p>
                    <Button
                      onClick={() => generateQRBatch(cuttingJob)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Generate QR Batch
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Batch Details View */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batchNumber}</h2>
                  <p className="text-gray-600">{selectedBatch.designName} • {selectedBatch.poNumber}</p>
                </div>
                <Button onClick={() => setSelectedBatch(null)} variant="outline">
                  ← Back to Batches
                </Button>
              </div>

              {/* Batch Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="enhanced-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Package className="w-8 h-8 text-blue-600" />
                      <div>
                        <div className="text-2xl font-bold text-blue-900">{selectedBatch.totalPieces}</div>
                        <div className="text-sm text-blue-600">Total Pieces</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="enhanced-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Scan className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="text-2xl font-bold text-green-900">{selectedBatch.scannedPieces}</div>
                        <div className="text-sm text-green-600">Scanned</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="enhanced-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-8 h-8 text-purple-600" />
                      <div>
                        <div className="text-lg font-bold text-purple-900">{selectedBatch.currentStation}</div>
                        <div className="text-sm text-purple-600">Current Station</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="enhanced-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="w-8 h-8 text-orange-600" />
                      <div>
                        <div className="text-2xl font-bold text-orange-900">
                          {Math.round((selectedBatch.scannedPieces / selectedBatch.totalPieces) * 100)}%
                        </div>
                        <div className="text-sm text-orange-600">Complete</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* QR Codes List */}
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle>QR Code Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedBatch.qrCodes.length > 0 ? (
                      selectedBatch.qrCodes.slice(0, 10).map((qrPiece) => (
                        <div key={qrPiece.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <QrCode className="w-8 h-8 text-indigo-600" />
                            <div>
                              <div className="font-medium text-gray-900">{qrPiece.qrCode}</div>
                              <div className="text-sm text-gray-600">
                                Size {qrPiece.size} • {qrPiece.color} • {qrPiece.currentLocation}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {qrPiece.scannedAt && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Scanned
                              </Badge>
                            )}
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No QR codes generated yet
                      </div>
                    )}
                    
                    {selectedBatch.qrCodes.length > 10 && (
                      <div className="text-center py-2 text-gray-500 text-sm">
                        ... and {selectedBatch.qrCodes.length - 10} more pieces
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* QR Scanner Modal */}
          {showScanner && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
              <Card className="w-full max-w-md glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">QR Code Scanner</CardTitle>
                    <Button onClick={() => setShowScanner(false)} variant="ghost" className="text-white">
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <Scan className="w-16 h-16 mx-auto text-white mb-4" />
                  <p className="text-white mb-4">Point camera at QR code to scan</p>
                  <div className="w-48 h-48 mx-auto border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                    <span className="text-white/70">Camera viewfinder</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  )
}