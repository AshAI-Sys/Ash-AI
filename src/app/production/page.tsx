'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import EnhancedLayout from '@/components/EnhancedLayout'
import ProductionStages from '@/components/ProductionStages'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  BarChart3,
  Settings,
  Users,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { RealTimeProductionMonitor } from '@/components/production/RealTimeProductionMonitor'

export default function ProductionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('stages')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Mock production summary data
  const productionSummary = {
    totalStations: 12,
    activeStations: 11,
    efficiency: 89.3,
    dailyOutput: 1247,
    alertCount: 3,
    onTimeDelivery: 94.2
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen neural-bg flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8 mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-teal-400/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-cyan-500/40 to-teal-400/40 rounded-full border border-cyan-400/50 animate-pulse"></div>
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/60 flex items-center justify-center shadow-xl shadow-cyan-500/20 animate-pulse">
              <img 
                src="/Ash-AI.png" 
                alt="ASH AI Logo" 
                className="w-10 h-10 object-contain z-10 relative filter brightness-110 contrast-110" 
              />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold glitch-text text-white mb-4 drop-shadow-lg" data-text="ASH AI">ASH AI</h1>
          <p className="text-cyan-300 font-medium">Loading Production System...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <EnhancedLayout>
      <div className="neural-bg min-h-screen">
      {/* Quantum Field Background */}
      <div className="quantum-field">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="quantum-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold glitch-text text-white mb-2" data-text="Production Command">
                Production Command
              </h1>
              <p className="text-cyan-300 text-lg">
                Real-time production monitoring and optimization
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="status-hologram status-active">
                SYSTEM ONLINE
              </div>
              <Button className="neon-btn">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="hologram-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-sm text-cyan-300">Active Stations</div>
                    <div className="text-xl font-bold text-white">{productionSummary.activeStations}/{productionSummary.totalStations}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="text-sm text-cyan-300">Efficiency</div>
                    <div className="text-xl font-bold text-white">{productionSummary.efficiency}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-sm text-cyan-300">Daily Output</div>
                    <div className="text-xl font-bold text-white">{productionSummary.dailyOutput.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-sm text-cyan-300">On-Time</div>
                    <div className="text-xl font-bold text-white">{productionSummary.onTimeDelivery}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {productionSummary.alertCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <div>
                    <div className="text-sm text-cyan-300">Alerts</div>
                    <div className={`text-xl font-bold ${productionSummary.alertCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {productionSummary.alertCount}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <div>
                    <div className="text-sm text-cyan-300">AI Status</div>
                    <div className="text-sm font-bold text-green-400">ACTIVE</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/20 border border-cyan-500/30">
            <TabsTrigger value="stages" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Settings className="w-4 h-4 mr-2" />
              Production Stages
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Activity className="w-4 h-4 mr-2" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Clock className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages">
            <ProductionStages />
          </TabsContent>

          <TabsContent value="monitor">
            <RealTimeProductionMonitor />
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Production Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Advanced Analytics</h3>
                  <p className="text-cyan-300 mb-6">Comprehensive production analytics dashboard coming soon</p>
                  <Button className="neon-btn-primary">
                    <Zap className="w-4 h-4 mr-2" />
                    Enable Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Production Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Smart Scheduling</h3>
                  <p className="text-cyan-300 mb-6">AI-powered production scheduling system coming soon</p>
                  <Button className="neon-btn-primary">
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Team Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Team Dashboard</h3>
                  <p className="text-cyan-300 mb-6">Real-time team performance and assignment tracking coming soon</p>
                  <Button className="neon-btn-primary">
                    <Zap className="w-4 h-4 mr-2" />
                    View Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </EnhancedLayout>
  )
}