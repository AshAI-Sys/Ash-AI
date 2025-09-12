// @ts-nocheck
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import TikTokLayout from '@/components/layout/TikTokLayout'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="relative mb-6 mx-auto w-16 h-16">
              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
                <img 
                  src="/Ash-AI.png" 
                  alt="ASH AI Logo" 
                  className="w-8 h-8 object-contain opacity-60" 
                />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">ASH AI</h1>
            <p className="text-gray-600">Loading Production System...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <TikTokLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Production Command
              </h1>
              <p className="text-gray-600 text-lg">
                Real-time production monitoring and optimization
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                SYSTEM ONLINE
              </div>
              <Button variant="outline" className="border-gray-300">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Active Stations</div>
                  <div className="text-xl font-bold text-gray-900">{productionSummary.activeStations}/{productionSummary.totalStations}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Efficiency</div>
                  <div className="text-xl font-bold text-gray-900">{productionSummary.efficiency}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Daily Output</div>
                  <div className="text-xl font-bold text-gray-900">{productionSummary.dailyOutput.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">On-Time</div>
                  <div className="text-xl font-bold text-gray-900">{productionSummary.onTimeDelivery}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${productionSummary.alertCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  {productionSummary.alertCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600">Alerts</div>
                  <div className={`text-xl font-bold ${productionSummary.alertCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {productionSummary.alertCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">AI Status</div>
                  <div className="text-sm font-bold text-green-600">ACTIVE</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="stages" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <Settings className="w-4 h-4 mr-2" />
                Production Stages
              </TabsTrigger>
              <TabsTrigger value="monitor" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <Activity className="w-4 h-4 mr-2" />
                Live Monitor
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <Clock className="w-4 h-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                <Users className="w-4 h-4 mr-2" />
                Team
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stages">
            <ProductionStages />
          </TabsContent>

          <TabsContent value="monitor">
            <RealTimeProductionMonitor />
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Production Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                    <BarChart3 className="w-16 h-16 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
                  <p className="text-gray-600 mb-6">Comprehensive production analytics dashboard coming soon</p>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Zap className="w-4 h-4 mr-2" />
                    Enable Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Production Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                    <Clock className="w-16 h-16 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
                  <p className="text-gray-600 mb-6">AI-powered production scheduling system coming soon</p>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Team Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                    <Users className="w-16 h-16 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Dashboard</h3>
                  <p className="text-gray-600 mb-6">Real-time team performance and assignment tracking coming soon</p>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
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
    </TikTokLayout>
  )
}