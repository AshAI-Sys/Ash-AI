// @ts-nocheck
// Mobile Sewing Operations Interface
// Touch-friendly interface for shop floor sewing operators

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Play, Pause, CheckCircle, Clock, Scan, User, Package, TrendingUp,
  Settings, QrCode, Camera, Zap, Target, Award, Timer, Activity,
  Smartphone, Users, Bell, Star, RefreshCw, DollarSign, Gauge,
  AlertTriangle, Minus, Plus, Home, Menu
} from 'lucide-react'
import { toast } from 'sonner'

interface SewingRun {
  id: string
  status: 'CREATED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  operationName: string
  bundleId: string
  orderNumber: string
  qtyGood: number
  qtyDefects: number
  qtyRejects: number
  targetQty: number
  pieceRate: number
  efficiency?: number
  actualMinutes?: number
  startedAt?: string
  endedAt?: string
  estimatedCompletionTime?: string
  realTimePerformance?: {
    currentPiecesPerHour: number
    targetPiecesPerHour: number
    currentEfficiency: number
    earnings: number
    qualityScore: number
    timeElapsed: number
    piecesCompleted: number
  }
}

export default function MobileSewingPage() {
  const { data: session } = useSession()
  const [activeRun, setActiveRun] = useState<SewingRun | null>(null)
  const [availableRuns, setAvailableRuns] = useState<SewingRun[]>([])
  const [loading, setLoading] = useState(false)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [qtyDialogOpen, setQtyDialogOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const timerRef = useRef<NodeJS.Timeout>()

  // Update time every second for active runs
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Load available runs
  useEffect(() => {
    loadAvailableRuns()
  }, [])

  const loadAvailableRuns = async () => {
    try {
      const response = await fetch('/api/sewing/runs')
      if (response.ok) {
        const data = await response.json()
        setAvailableRuns(data.runs || [])

        // Find active run
        const active = data.runs?.find((run: SewingRun) => run.status === 'IN_PROGRESS')
        if (active) {
          setActiveRun(active)
        }
      }
    } catch (error) {
      console.error('Failed to load runs:', error)
      // Mock data for demo
      const mockRuns = [
        {
          id: '1',
          status: 'CREATED' as const,
          operationName: 'Sleeve Attachment',
          bundleId: 'BDL-001',
          orderNumber: 'ORD-2024-001',
          qtyGood: 0,
          qtyDefects: 0,
          qtyRejects: 0,
          targetQty: 50,
          pieceRate: 2.50
        },
        {
          id: '2',
          status: 'CREATED' as const,
          operationName: 'Side Seam',
          bundleId: 'BDL-002',
          orderNumber: 'ORD-2024-002',
          qtyGood: 0,
          qtyDefects: 0,
          qtyRejects: 0,
          targetQty: 30,
          pieceRate: 3.00
        }
      ]
      setAvailableRuns(mockRuns)
    }
  }

  const startRun = async (runId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sewing/runs/${runId}/start`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setActiveRun(data.run)
        toast.success('Sewing run started!')
      }
    } catch (error) {
      console.error('Failed to start run:', error)
      toast.error('Failed to start run')
    } finally {
      setLoading(false)
    }
  }

  const pauseRun = async () => {
    if (!activeRun) return
    setLoading(true)
    try {
      const response = await fetch(`/api/sewing/runs/${activeRun.id}/pause`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setActiveRun(data.run)
        toast.success('Run paused')
      }
    } catch (error) {
      console.error('Failed to pause run:', error)
      toast.error('Failed to pause run')
    } finally {
      setLoading(false)
    }
  }

  const resumeRun = async () => {
    if (!activeRun) return
    setLoading(true)
    try {
      const response = await fetch(`/api/sewing/runs/${activeRun.id}/resume`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setActiveRun(data.run)
        toast.success('Run resumed')
      }
    } catch (error) {
      console.error('Failed to resume run:', error)
      toast.error('Failed to resume run')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantities = async (good: number, defects: number, rejects: number) => {
    if (!activeRun) return
    setLoading(true)
    try {
      const response = await fetch(`/api/sewing/runs/${activeRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qtyGood: good,
          qtyDefects: defects,
          qtyRejects: rejects
        })
      })
      if (response.ok) {
        const data = await response.json()
        setActiveRun(data.run)
        toast.success('Quantities updated')
      }
    } catch (error) {
      console.error('Failed to update quantities:', error)
      toast.error('Failed to update quantities')
    } finally {
      setLoading(false)
    }
  }

  const calculateElapsedTime = (startTime: string) => {
    const start = new Date(startTime)
    const elapsed = Math.floor((currentTime.getTime() - start.getTime()) / 1000)
    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const calculateEarnings = (qty: number, rate: number) => {
    return (qty * rate).toFixed(2)
  }

  const calculateEfficiency = (completed: number, target: number, elapsed: number) => {
    if (elapsed === 0) return 0
    const expectedRate = target / 480 // assuming 8 hour day
    const actualRate = completed / (elapsed / 60) // pieces per minute
    return Math.min(100, (actualRate / expectedRate) * 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2">
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sewing Station</h1>
            <p className="text-sm text-gray-600">{session?.user?.name || 'Operator'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/unified-dashboard'}>
            <Home className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Active Run Card */}
      {activeRun ? (
        <Card className="mb-4 shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-green-800">{activeRun.operationName}</CardTitle>
                <p className="text-sm text-green-600">Bundle: {activeRun.bundleId}</p>
              </div>
              <Badge
                className={`text-sm px-3 py-1 ${
                  activeRun.status === 'IN_PROGRESS'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-orange-100 text-orange-800 border-orange-200'
                }`}
              >
                {activeRun.status === 'IN_PROGRESS' ? (
                  <><Play className="w-4 h-4 mr-1" /> Active</>
                ) : (
                  <><Pause className="w-4 h-4 mr-1" /> Paused</>
                )}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Time and Progress */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center text-gray-600 mb-1">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="text-xs font-medium">Time Elapsed</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {activeRun.startedAt ? calculateElapsedTime(activeRun.startedAt) : '00:00:00'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center text-gray-600 mb-1">
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span className="text-xs font-medium">Earnings</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  ₱{calculateEarnings(activeRun.qtyGood, activeRun.pieceRate)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{activeRun.qtyGood}/{activeRun.targetQty}</span>
              </div>
              <Progress
                value={(activeRun.qtyGood / activeRun.targetQty) * 100}
                className="h-3 bg-gray-200"
              />
            </div>

            {/* Quantity Display */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-700">{activeRun.qtyGood}</div>
                <div className="text-xs text-green-600 font-medium">Good</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">{activeRun.qtyDefects}</div>
                <div className="text-xs text-yellow-600 font-medium">Defects</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-700">{activeRun.qtyRejects}</div>
                <div className="text-xs text-red-600 font-medium">Rejects</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {activeRun.status === 'IN_PROGRESS' ? (
                <Button
                  onClick={pauseRun}
                  disabled={loading}
                  className="h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={resumeRun}
                  disabled={loading}
                  className="h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
              )}

              <Dialog open={qtyDialogOpen} onOpenChange={setQtyDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Update Qty
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Update Quantities</DialogTitle>
                  </DialogHeader>
                  <QuantityUpdateDialog
                    activeRun={activeRun}
                    onUpdate={updateQuantities}
                    onClose={() => setQtyDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* No Active Run - Available Runs */
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800 px-2">Available Tasks</h2>

          {availableRuns.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-600 text-center">No tasks available</p>
                <p className="text-sm text-gray-500 text-center mt-1">Check back later or contact your supervisor</p>
                <Button
                  onClick={loadAvailableRuns}
                  className="mt-4 bg-blue-500 hover:bg-blue-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            availableRuns.map(run => (
              <Card key={run.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{run.operationName}</h3>
                      <p className="text-sm text-gray-600">Bundle: {run.bundleId}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {run.targetQty} pcs
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-green-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="font-semibold">₱{run.pieceRate}/pc</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Est. ₱{(run.targetQty * run.pieceRate).toFixed(2)}
                    </div>
                  </div>

                  <Button
                    onClick={() => startRun(run.id)}
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Task
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Quick Scanner Button */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-xl"
          >
            <QrCode className="w-6 h-6 text-white" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Bundle QR Code</DialogTitle>
          </DialogHeader>
          <ScannerDialog onClose={() => setScanDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Quantity Update Dialog Component
function QuantityUpdateDialog({
  activeRun,
  onUpdate,
  onClose
}: {
  activeRun: SewingRun
  onUpdate: (good: number, defects: number, rejects: number) => void
  onClose: () => void
}) {
  const [good, setGood] = useState(activeRun.qtyGood)
  const [defects, setDefects] = useState(activeRun.qtyDefects)
  const [rejects, setRejects] = useState(activeRun.qtyRejects)

  const handleUpdate = () => {
    onUpdate(good, defects, rejects)
    onClose()
  }

  return (
    <div className="space-y-4">
      {/* Good Quantity */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Good Pieces</label>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGood(Math.max(0, good - 1))}
            className="w-10 h-10 p-0"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            value={good}
            onChange={(e) => setGood(parseInt(e.target.value) || 0)}
            className="text-center text-lg font-semibold"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGood(good + 1)}
            className="w-10 h-10 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Defects */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Defects</label>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefects(Math.max(0, defects - 1))}
            className="w-10 h-10 p-0"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            value={defects}
            onChange={(e) => setDefects(parseInt(e.target.value) || 0)}
            className="text-center text-lg font-semibold"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDefects(defects + 1)}
            className="w-10 h-10 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Rejects */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Rejects</label>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejects(Math.max(0, rejects - 1))}
            className="w-10 h-10 p-0"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            value={rejects}
            onChange={(e) => setRejects(parseInt(e.target.value) || 0)}
            className="text-center text-lg font-semibold"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejects(rejects + 1)}
            className="w-10 h-10 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleUpdate} className="bg-blue-500 hover:bg-blue-600">
          Update
        </Button>
      </div>
    </div>
  )
}

// Scanner Dialog Component
function ScannerDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center">
        <Camera className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600 text-center">Scanner functionality</p>
        <p className="text-sm text-gray-500 text-center">Position QR code in frame</p>
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Or enter bundle ID manually"
          className="text-center"
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-600">
            Verify Bundle
          </Button>
        </div>
      </div>
    </div>
  )
}