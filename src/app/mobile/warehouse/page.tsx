'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  QrCode, 
  Search, 
  MapPin,
  Truck,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Plus,
  Minus,
  Smartphone,
  Wifi,
  Battery
} from 'lucide-react'
import Layout from '@/components/Layout'

export default function MobileWarehousePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('scan')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center neural-bg">
      <div className="text-cyan-400 text-xl">Loading...</div>
    </div>
  }

  if (!session) return null

  return (
    <Layout>
      <div className="neural-bg min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white glitch-text flex items-center gap-3" data-text="MOBILE WAREHOUSE">
              <Smartphone className="w-8 h-8 text-cyan-400" />
              MOBILE WAREHOUSE
            </h1>
            <p className="text-cyan-300 font-mono">Real-time inventory tracking and management</p>
          </div>
          
          <div className="flex gap-3">
            <Button className="neon-btn-primary">
              <QrCode className="w-4 h-4 mr-2" />
              Scan
            </Button>
            <Button className="neon-btn-outline">
              <MapPin className="w-4 h-4 mr-2" />
              Locate
            </Button>
          </div>
        </div>

        {/* Device Status */}
        <Card className="quantum-card neon-glow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="ai-orb">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Device Status</h3>
                  <p className="text-sm text-cyan-300">Connected and ready</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-mono">ONLINE</span>
                </div>
                <div className="flex items-center gap-1">
                  <Battery className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-mono">85%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 rounded-lg p-1">
          {[
            { id: 'scan', label: 'QR Scanner', icon: QrCode },
            { id: 'search', label: 'Search', icon: Search },
            { id: 'movements', label: 'Movements', icon: Truck },
            { id: 'reports', label: 'Reports', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-mono text-sm ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'scan' && (
            <div className="space-y-6">
              {/* QR Scanner Interface */}
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-cyan-400" />
                    QR Code Scanner
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scanner Viewport */}
                  <div className="aspect-square max-w-sm mx-auto bg-slate-900/50 border-2 border-dashed border-cyan-500/50 rounded-lg flex items-center justify-center relative">
                    <div className="absolute inset-4 border-2 border-cyan-400 rounded-lg opacity-50 animate-pulse">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                    </div>
                    <div className="text-center">
                      <QrCode className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
                      <p className="text-cyan-300 font-mono">Position QR code within frame</p>
                    </div>
                  </div>

                  <Button className="neon-btn-primary w-full">
                    <QrCode className="w-4 h-4 mr-2" />
                    Start Scanner
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Scans */}
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white">Recent Scans</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { code: 'INV-CVC160-WHT-001', item: 'CVC 160 White Cotton', time: '2 min ago', status: 'success' },
                    { code: 'INV-POLY200-BLK-045', item: 'Polyester 200 Black', time: '5 min ago', status: 'success' },
                    { code: 'INV-ELASTIC-BAND-12', item: 'Elastic Band 2cm', time: '8 min ago', status: 'error' }
                  ].map((scan, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                      <div>
                        <p className="font-mono text-white text-sm">{scan.code}</p>
                        <p className="text-xs text-cyan-300">{scan.item}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{scan.time}</span>
                        {scan.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'search' && (
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-cyan-400" />
                  Inventory Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by item code, name, or location..."
                    className="cyber-input pl-10"
                  />
                </div>
                
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Enter search terms to find inventory items</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'movements' && (
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-400" />
                  Stock Movements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button className="neon-btn-primary h-16">
                    <div className="text-center">
                      <Plus className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-xs">Stock In</span>
                    </div>
                  </Button>
                  <Button className="neon-btn-outline h-16">
                    <div className="text-center">
                      <Minus className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-xs">Stock Out</span>
                    </div>
                  </Button>
                </div>
                
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">No recent movements recorded</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'reports' && (
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Mobile Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-900/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300">Today's Scans</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        47
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300">Movements Processed</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                        23
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300">Errors Detected</span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                        2
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}