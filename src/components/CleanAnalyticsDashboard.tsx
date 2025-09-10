'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface AnalyticsData {
  systemPerformance: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  userExperience: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  businessValue: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  coreRequirements: {
    authentication: { value: number; status: 'good' | 'warning' | 'critical' }
    orderManagement: { value: number; status: 'good' | 'warning' | 'critical' }
    qualityControl: { value: number; status: 'good' | 'warning' | 'critical' }
  }
}

export function CleanAnalyticsDashboard() {
  const [analyticsData] = useState<AnalyticsData>({
    systemPerformance: { value: 271303.61, change: 65.50, trend: 'up' },
    userExperience: { value: 284728.21, change: 60.54, trend: 'up' },
    businessValue: { value: 884, change: 50.54, trend: 'up' },
    coreRequirements: {
      authentication: { value: 42934.08, status: 'good' },
      orderManagement: { value: 259, status: 'good' },
      qualityControl: { value: 6602.38, status: 'good' }
    }
  })

  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 7 days')

  return (
    <div className="min-h-screen bg-white">
      {/* TikTok Black Header */}
      <div className="bg-black text-white px-4 py-2 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-black font-bold text-xs">TT</span>
        </div>
        <span className="text-white font-medium">Seller Center</span>
      </div>

      <div className="p-6">
        {/* Header Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                All Systems
              </Badge>
              <Button variant="outline" size="sm">
                {selectedTimeframe}: Sep 02, 2025 — Sep 09, 2025
              </Button>
            </div>
          </div>

          {/* TikTok-style Tab Navigation */}
          <nav className="border-b border-gray-200">
            <div className="flex space-x-8">
              {['Home', 'Core', 'Fixes', 'Plan', 'Metrics', 'P.O', 'Delivery'].map((tab) => (
                <button
                  key={tab}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm transition-all ${
                    tab === 'Home' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

        {/* Business Data Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* System Performance Card */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm font-medium text-gray-700">System Performance</CardTitle>
                  <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">₱{analyticsData.systemPerformance.value.toLocaleString()}</div>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span>vs last 7 days: +₱{analyticsData.systemPerformance.change}</span>
                </div>
                <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm">
                  View breakdown →
                </Button>
              </CardContent>
            </Card>

            {/* User Experience Card */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm font-medium text-gray-700">User Experience</CardTitle>
                  <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">₱{analyticsData.userExperience.value.toLocaleString()}</div>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span>vs last 7 days: +₱{analyticsData.userExperience.change}</span>
                </div>
                <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm">
                  View breakdown →
                </Button>
              </CardContent>
            </Card>

            {/* Business Value Card */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm font-medium text-gray-700">Business Value</CardTitle>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{analyticsData.businessValue.value}</div>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span>vs last 7 days: +₱{analyticsData.businessValue.change}</span>
                </div>
                <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm">
                  View breakdown →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Performance Chart */}
          <div className="lg:col-span-3">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">System Performance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">User Experience</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">System Performance (%) | User Experience (%)</div>
                  </div>
                </div>
                
                {/* Simplified Chart Representation */}
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* System Performance Line */}
                  <path
                    d="M 0 160 Q 80 140 160 120 T 320 80 T 400 60"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    fill="none"
                  />
                  
                  {/* User Experience Line */}
                  <path
                    d="M 0 180 Q 80 160 160 140 T 320 100 T 400 80"
                    stroke="#f97316"
                    strokeWidth="2"
                    fill="none"
                  />
                  
                  {/* Data points */}
                  <circle cx="320" cy="80" r="3" fill="#06b6d4" />
                  <circle cx="320" cy="100" r="3" fill="#f97316" />
                </svg>
                
                {/* X-axis labels */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-xs text-gray-500">
                  <span>Sep 01</span>
                  <span>Sep 03</span>
                  <span>Sep 05</span>
                  <span>Sep 07</span>
                  <span>Sep 09</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Data Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-sm font-medium text-gray-700">Today's data</CardTitle>
                  <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">Trends →</Button>
                </div>
                
                <div className="space-y-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Last Update: 16:41</div>
                  <div className="text-lg font-semibold text-gray-900">Active Modules</div>
                  <div className="text-2xl font-bold text-gray-900">₱4,272.05</div>
                  <div className="text-xs text-gray-500">vs 9am PH/2PM SG</div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">Active Users</div>
                  <div className="text-2xl font-bold text-gray-900">2,678</div>
                  <div className="text-xs text-gray-500">Activity/12hr</div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">API Sessions</div>
                  <div className="text-2xl font-bold text-gray-900">111</div>
                  <div className="text-xs text-gray-500">requests</div>
                </div>
                
                {/* Status indicators */}
                <div className="flex justify-end gap-1 mt-4">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-gray-500 ml-2">API health</span>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Business Accelerator */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm mt-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                    <CardTitle className="text-sm font-medium text-gray-700">Business accelerator</CardTitle>
                  </div>
                  <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm">More →</Button>
                </div>
                
                <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Optimize production flow than f...</div>
                  <div className="text-xs text-cyan-600">CASH INCREASE 30% • 4/5 ★</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Optimize order management</div>
                  <div className="text-xs text-cyan-600">CASH INCREASE 30% • 4/5 ★</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Improve system performance opt...</div>
                  <div className="text-xs text-cyan-600">CASH INCREASE 30% • 4/5 ★</div>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Core Requirements Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Authentication Card */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <CardTitle className="text-sm font-medium text-gray-700">AUTHENTICATION</CardTitle>
                  </div>
                  <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm">View analysis →</Button>
                </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">₱{analyticsData.coreRequirements.authentication.value.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mb-4">System build from 4 integrated modules</div>
              <div className="text-sm text-gray-600 mb-4">Try 3 AUTH modules, ranked by usage</div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                  <span className="text-sm text-gray-700">2DCAHS [701] 65% pattern 4.00</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                  <span className="text-sm text-gray-700">2DCAHS [20 &lt;= 28] 65% [000]</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Management Card */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <CardTitle className="text-sm font-medium text-gray-600">ORDER MANAGEMENT</CardTitle>
                <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm ml-auto">View analysis →</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">{analyticsData.coreRequirements.orderManagement.value}</div>
              <div className="text-sm text-gray-600 mb-4">Processing from 1 linked workflow</div>
              <div className="text-sm text-gray-600 mb-4">Try 3 workflows, ranked by efficiency</div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
                  <span className="text-sm text-gray-700">2DCAHS [11 44 613 Process.kg]</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-sm"></div>
                  <span className="text-sm text-gray-700">2DCAHS [102 242 Pickup]</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Control Card */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                <CardTitle className="text-sm font-medium text-gray-600">QUALITY CONTROL</CardTitle>
                <Button variant="link" className="text-cyan-600 p-0 h-auto text-sm ml-auto">View analysis →</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">₱{analyticsData.coreRequirements.qualityControl.value.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mb-4">Up 36hrs from 16 inspection points</div>
              <div className="text-sm text-gray-600 mb-4">Try 3 QC systems, ranked by impact</div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800 rounded-sm"></div>
                  <span className="text-sm text-gray-700">QUALITY INSPECTION • FINAL REVIEW</span>
                  <div className="ml-auto text-xs text-green-600">✓ Complete | Processing 16% ★</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800 rounded-sm"></div>
                  <span className="text-sm text-gray-700">QUALITY TESTING • BATCH CHECK</span>
                  <div className="ml-auto text-xs text-green-600">✓ Complete | Processing 16% ★</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}