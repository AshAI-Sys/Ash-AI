// @ts-nocheck
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Package,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  Calendar,
  Download,
  Upload,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Music,
  Video,
  ShoppingBag,
  Target,
  Eye,
  MessageCircle,
  Star,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'

export function ExactTikTokAnalytics() {
  const [selectedTab, setSelectedTab] = useState('Home')
  
  const tabs = [
    'Home',
    'Core',
    'Fixes', 
    'Plan',
    'Metrics',
    'PO',
    'Delivery'
  ]

  // ASH AI ERP data mapped to TikTok format
  const businessData = {
    gmv: { value: '₱271,303.61', change: '+65.59%', period: 'vs last 7 days' },
    grossRevenue: { value: '₱284,728.21', change: '+66.54%', period: 'vs last 7 days' },
    itemsSold: { value: '884', change: '+95.54%', period: 'vs last 7 days' }
  }

  const todaysData = {
    gmv: '₱54,272.05',
    itemsSold: '171',
    visitors: '2,678',
    customers: '111'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header with TikTok branding */}
      <div className="bg-black text-white px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* TikTok Logo */}
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Music className="w-5 h-5 text-black" />
          </div>
          <span className="font-semibold">ASH AI</span>
          <span className="text-gray-300">ERP Center</span>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar - TikTok Style */}
        <div className="w-16 bg-white border-r border-gray-200 min-h-screen py-4">
          <div className="flex flex-col items-center space-y-4">
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <Home className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <Package className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <BarChart3 className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <Users className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <Target className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <ShoppingBag className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <Video className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-3 rounded-lg hover:bg-gray-100 transition-colors">
              <Settings className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {/* Analytics Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Analytics</h1>
            
            {/* Tab Navigation - TikTok Style */}
            <div className="flex justify-center space-x-8 mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    selectedTab === tab
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Business Data Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Business data</h2>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-teal-500 text-white">Sales</Badge>
                    <Badge variant="outline">Traffic</Badge>
                    <span className="text-sm text-gray-500 ml-4">Last 7 days: Sep 02, 2025 — Sep 08, 2025</span>
                    <Button variant="ghost" size="sm">
                      <Calendar className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Top 3 Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* System Performance Card */}
                  <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">System Performance</span>
                      <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">₱271,303.61</div>
                    <div className="text-sm text-gray-500 mb-2">vs last 7 days • +65.59%</div>
                    <Button variant="link" className="text-teal-600 p-0 h-auto font-normal text-sm">
                      View breakdown ›
                    </Button>
                  </Card>

                  {/* User Experience Card */}
                  <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">User Experience</span>
                      <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">₱284,728.21</div>
                    <div className="text-sm text-gray-500 mb-2">vs last 7 days • +66.54%</div>
                    <Button variant="link" className="text-teal-600 p-0 h-auto font-normal text-sm">
                      View breakdown ›
                    </Button>
                  </Card>

                  {/* Business Value Card */}
                  <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Business Value</span>
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">884</div>
                    <div className="text-sm text-gray-500 mb-2">vs last 7 days • +95.54%</div>
                    <Button className="w-6 h-6 p-0 bg-gray-100 hover:bg-gray-200 rounded-full">
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                    </Button>
                  </Card>
                </div>

                {/* Chart Area */}
                <Card className="bg-white p-6 border border-gray-200 rounded-lg mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">System Performance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">User Experience</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      System Performance (₱) | User Experience (₱)
                    </div>
                  </div>
                  
                  {/* Simulated Chart */}
                  <div className="h-64 relative bg-gradient-to-t from-gray-50 to-transparent rounded-lg">
                    <div className="absolute bottom-0 left-0 right-0 h-48">
                      {/* Chart lines simulation */}
                      <svg className="w-full h-full">
                        <path
                          d="M 0 190 Q 100 160 200 140 T 400 120 T 600 100 T 800 90"
                          fill="none"
                          stroke="#14b8a6"
                          strokeWidth="2"
                        />
                        <path
                          d="M 0 180 Q 100 150 200 130 T 400 110 T 600 95 T 800 85"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                        />
                      </svg>
                      {/* Data points */}
                      <div className="absolute top-20 right-40 bg-white border rounded-lg p-2 shadow-lg">
                        <div className="text-sm font-medium">₹9,999.63</div>
                        <div className="text-sm font-medium">₹10,043.63</div>
                      </div>
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-4">
                      <span>Sep 02</span>
                      <span>Sep 03</span>
                      <span>Sep 04</span>
                      <span>Sep 05</span>
                      <span>Sep 06</span>
                      <span>Sep 07</span>
                      <span>Sep 08</span>
                    </div>
                  </div>
                </Card>

                {/* Core Requirements Sources - replacing Sales sources */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Core Requirements</h3>
                    <div className="flex gap-2">
                      <Button className="bg-teal-500 text-white text-sm px-3 py-1 h-auto">
                        All Systems
                      </Button>
                      <Button variant="ghost" className="text-gray-500 text-sm px-3 py-1 h-auto">
                        Critical Only
                      </Button>
                      <div className="flex gap-2 ml-4">
                        <Button className="bg-gray-100 text-gray-700 text-sm px-3 py-1 h-auto">
                          Yesterday
                        </Button>
                        <Button variant="ghost" className="text-gray-500 text-sm px-3 py-1 h-auto">
                          Last 7 days
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Authentication System */}
                    <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="font-medium text-gray-900">AUTHENTICATION</span>
                        </div>
                        <Button variant="link" className="text-teal-600 p-0 h-auto text-sm">
                          View analysis ›
                        </Button>
                      </div>
                      
                      <div className="text-2xl font-bold text-gray-900 mb-1">₱42,934.08</div>
                      <div className="text-sm text-gray-500 mb-4">System value from 4 integrated modules.</div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">Top 3 AUTH modules, ranked by usage</div>
                        
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                            <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">₱17,164.69</div>
                            <div className="text-xs text-gray-500">2025/09/08 18:01 @reefer.co</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                            <div className="w-4 h-4 bg-orange-500 rounded"></div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">₱16,303.22</div>
                            <div className="text-xs text-gray-500">2025/09/08 09:25 @reefer.co</div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Order Management */}
                    <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="font-medium text-gray-900">ORDER MANAGEMENT</span>
                        </div>
                        <Button variant="link" className="text-teal-600 p-0 h-auto text-sm">
                          View analysis ›
                        </Button>
                      </div>
                      
                      <div className="text-2xl font-bold text-gray-900 mb-1">₱259</div>
                      <div className="text-sm text-gray-500 mb-4">Processing from 1 linked workflow.</div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">Top 3 workflows, ranked by efficiency</div>
                        
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                            <Video className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">₱259</div>
                            <div className="text-xs text-gray-500">2024/10/13 17:44 Bulk Processing</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                            <Video className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">₱0</div>
                            <div className="text-xs text-gray-500">2024/12/07 18:08 Auto Routing</div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Quality Control */}
                    <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                          <span className="font-medium text-gray-900">QUALITY CONTROL</span>
                        </div>
                        <Button variant="link" className="text-teal-600 p-0 h-auto text-sm">
                          View analysis ›
                        </Button>
                      </div>
                      
                      <div className="text-2xl font-bold text-gray-900 mb-1">₱6,602.38</div>
                      <div className="text-sm text-gray-500 mb-4">QC value from 18 inspection points.</div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">Top 3 QC systems, ranked by impact</div>
                        
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">₱2,310.90</div>
                            <div className="text-xs text-gray-500">
                              QUALITY INSPECTION • FINAL REVIEW
                            </div>
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                              <span>● Estimated PV 16%</span>
                              <span>🔍 if product title is...</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">₱937.18</div>
                            <div className="text-xs text-gray-500">
                              QUALITY TESTING • BATCH CHECK  
                            </div>
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                              <span>● Estimated PV 33%</span>
                              <span>🔍 if product title is...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80">
              {/* Today's Data Card */}
              <Card className="bg-white p-4 border border-gray-200 rounded-lg mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Today's data</h3>
                  <div className="flex items-center gap-1 text-teal-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Trends</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-4">Last updated: 15:44</div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm text-gray-500">System Performance</div>
                      <div className="text-lg font-bold text-gray-900">₱54,272.05</div>
                      <div className="text-xs text-gray-500">Yesterday ₱51,056.46</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Active Modules</div>
                      <div className="text-lg font-bold text-gray-900">171</div>
                      <div className="text-xs text-gray-500">Yesterday 179</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-500">Active Users</div>
                      <div className="text-xl font-bold text-gray-900">2,678</div>
                      <div className="text-xs text-gray-500">Yesterday 2,534</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Admin Sessions</div>
                      <div className="text-xl font-bold text-gray-900">111</div>
                      <div className="text-xs text-gray-500">Yesterday 114</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-4">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                        <span className="text-xs font-medium text-orange-700">
                          {['₱2', '₱1', '₱3', '₱2', '₱4'][i]}
                        </span>
                      </div>
                    ))}
                    <Button variant="link" className="text-teal-600 text-sm p-0 h-auto ml-2">
                      Join now ›
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Business Accelerator */}
              <Card className="bg-white p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Business accelerator</h3>
                  </div>
                  <Button variant="link" className="text-teal-600 text-sm p-0 h-auto">
                    More ›
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-sm text-gray-900">
                      Optimize production flow that f...
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Could increase sales by 7%
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-sm text-gray-900">
                      Optimize order management
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Could increase sales by 7%
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-sm text-gray-900">
                      Improve system performance opt...
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Could increase sales by 5%
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}