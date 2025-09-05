'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Scan,
  QrCode,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Package,
  MapPin,
  Activity,
  Target,
  Zap,
  Camera,
  Mic,
  FileText,
  Send,
  RefreshCw,
  Settings,
  Bell,
  Home,
  BarChart3,
  MessageSquare,
  Eye
} from 'lucide-react'

interface WorkStation {
  id: string
  name: string
  type: 'cutting' | 'printing' | 'sewing' | 'quality' | 'packing'
  currentJob?: {
    id: string
    name: string
    poNumber: string
    priority: 'high' | 'medium' | 'low'
    estimatedTime: number
    elapsedTime: number
    pieces: {
      total: number
      completed: number
    }
  }
  status: 'idle' | 'active' | 'paused' | 'maintenance'
  operator: string
  efficiency: number
  todayStats: {
    completed: number
    target: number
    quality: number
  }
}

interface MobileProductionInterfaceProps {
  station: WorkStation
  onScan: (qrCode: string) => void
  onStatusUpdate: (status: string, notes?: string) => void
}

const mockStation: WorkStation = {
  id: 'station_cut_1',
  name: 'Cutting Station 1',
  type: 'cutting',
  currentJob: {
    id: 'cut_001',
    name: 'Corporate Logo Tee Design',
    poNumber: 'REEF-2024-000123',
    priority: 'high',
    estimatedTime: 45,
    elapsedTime: 23,
    pieces: {
      total: 50,
      completed: 28
    }
  },
  status: 'active',
  operator: 'Maria Santos',
  efficiency: 94,
  todayStats: {
    completed: 156,
    target: 180,
    quality: 98
  }
}

export function MobileProductionInterface() {
  const [station, setStation] = useState<WorkStation>(mockStation)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'work' | 'scanner' | 'stats' | 'help'>('work')

  const handleScan = (code: string) => {
    setScannedCode(code)
    setShowScanner(false)
    // Process scanned QR code - secure backend processing
    onWorkstationUpdate({ action: 'scan_qr', code: code.substring(0, 50) })
  }

  const handleStatusChange = (newStatus: string) => {
    setStation(prev => ({ ...prev, status: newStatus as any }))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'paused': return 'text-orange-600 bg-orange-100'
      case 'idle': return 'text-gray-600 bg-gray-100'
      case 'maintenance': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />
      case 'paused': return <Pause className="w-4 h-4" />
      case 'idle': return <Clock className="w-4 h-4" />
      case 'maintenance': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{station.name}</h1>
              <p className="text-sm text-gray-600">Operator: {station.operator}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getStatusColor(station.status)} border`}>
                {getStatusIcon(station.status)}
                <span className="ml-1 capitalize">{station.status}</span>
              </Badge>
              <Button size="sm" variant="ghost">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20 space-y-4">
        {activeTab === 'work' && (
          <>
            {/* Current Job Card */}
            {station.currentJob ? (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Current Job
                    </CardTitle>
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(station.currentJob.priority)}`}></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">{station.currentJob.name}</h3>
                    <p className="text-sm text-gray-600">{station.currentJob.poNumber}</p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{station.currentJob.pieces.completed} / {station.currentJob.pieces.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(station.currentJob.pieces.completed / station.currentJob.pieces.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{station.currentJob.elapsedTime}m</div>
                      <div className="text-xs text-gray-600">Elapsed</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{station.currentJob.estimatedTime}m</div>
                      <div className="text-xs text-gray-600">Estimated</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {station.status === 'active' ? (
                      <Button 
                        onClick={() => handleStatusChange('paused')}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Job
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleStatusChange('active')}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Job
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleStatusChange('completed')}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Job</h3>
                  <p className="text-gray-600">Waiting for job assignment</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setActiveTab('scanner')}
                    className="h-16 flex-col bg-indigo-500 hover:bg-indigo-600 text-white"
                  >
                    <QrCode className="w-6 h-6 mb-1" />
                    <span className="text-sm">Scan QR</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-16 flex-col"
                  >
                    <AlertTriangle className="w-6 h-6 mb-1" />
                    <span className="text-sm">Report Issue</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-16 flex-col"
                  >
                    <Eye className="w-6 h-6 mb-1" />
                    <span className="text-sm">View Instructions</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-16 flex-col"
                  >
                    <MessageSquare className="w-6 h-6 mb-1" />
                    <span className="text-sm">Send Message</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{station.todayStats.completed}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                    <div className="text-xs text-gray-500">Target: {station.todayStats.target}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{station.efficiency}%</div>
                    <div className="text-xs text-gray-600">Efficiency</div>
                    <div className="text-xs text-gray-500">Above avg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-900">{station.todayStats.quality}%</div>
                    <div className="text-xs text-gray-600">Quality</div>
                    <div className="text-xs text-gray-500">Excellent</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'scanner' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <QrCode className="w-5 h-5 mr-2" />
                  QR Code Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Viewfinder */}
                <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-8 border-2 border-white border-dashed rounded-lg"></div>
                  <Camera className="w-12 h-12 text-white" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-center text-sm">
                      Position QR code within the frame
                    </p>
                  </div>
                </div>

                {/* Manual Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Or enter QR code manually:</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter QR code..."
                      value={scannedCode}
                      onChange={(e) => setScannedCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleScan(scannedCode)}
                      disabled={!scannedCode}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Recent Scans */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recent Scans</h4>
                  <div className="space-y-2">
                    {['ASH-QR-001-025', 'ASH-QR-001-024', 'ASH-QR-001-023'].map((code, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-mono">{code}</span>
                        <span className="text-xs text-gray-500">2min ago</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Efficiency Gauge */}
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="8"
                          strokeDasharray={`${(station.efficiency / 100) * 314} 314`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{station.efficiency}%</div>
                          <div className="text-xs text-gray-600">Efficiency</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Performance */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">This Week</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {['Mon', 'Tue', 'Wed', 'Thu'].map((day, index) => (
                        <div key={day} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {[98, 94, 96, 92][index]}%
                          </div>
                          <div className="text-xs text-gray-600">{day}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Achievements</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <Target className="w-8 h-8 text-green-600" />
                        <div>
                          <div className="font-medium text-green-900">Quality Champion</div>
                          <div className="text-sm text-green-700">99% quality rate this week</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Zap className="w-8 h-8 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-900">Speed Demon</div>
                          <div className="text-sm text-blue-700">15% above target efficiency</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Help & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start h-12">
                    <FileText className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Work Instructions</div>
                      <div className="text-sm text-gray-500">View current job guidelines</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <MessageSquare className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Contact Supervisor</div>
                      <div className="text-sm text-gray-500">Send message or request help</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Report Issue</div>
                      <div className="text-sm text-gray-500">Equipment or quality problems</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <Settings className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Settings</div>
                      <div className="text-sm text-gray-500">App preferences and profile</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">Emergency Contact</div>
                    <div className="text-sm text-red-700">Call: 09XX-XXX-XXXX</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4">
          {[
            { key: 'work', icon: Home, label: 'Work' },
            { key: 'scanner', icon: QrCode, label: 'Scanner' },
            { key: 'stats', icon: BarChart3, label: 'Stats' },
            { key: 'help', icon: MessageSquare, label: 'Help' }
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex flex-col items-center justify-center py-3 px-2 ${
                activeTab === key
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}