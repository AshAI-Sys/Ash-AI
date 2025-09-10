'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Settings,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Zap,
  Brain,
  TrendingUp,
  Calendar,
  FileText,
  Wrench,
  Shield,
  Star,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react'

export function TikTokStyleAnalytics() {
  const [selectedTab, setSelectedTab] = useState('Home')
  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 7 days')

  // ASH AI ERP Data - keeping exact same content from original
  const executiveSummary = {
    performance: { value: '94.5%', change: '+2.1%', trend: 'up' },
    ux: { value: '87.2%', change: '+5.4%', trend: 'up' },
    business: { value: '91.8%', change: '+3.2%', trend: 'up' }
  }

  const coreRequirements = [
    { name: 'Authentication System', status: 'done', progress: 100 },
    { name: 'Dashboard Interface', status: 'done', progress: 95 },
    { name: 'Order Management', status: 'progress', progress: 85 },
    { name: 'Production Pipeline', status: 'progress', progress: 78 },
    { name: 'Quality Control', status: 'progress', progress: 82 },
    { name: 'Client Portal', status: 'done', progress: 92 }
  ]

  const currentPOs = [
    {
      id: 'PO-001',
      client: 'TechCorp Inc.',
      amount: '₱284,728',
      units: 1200,
      status: 'In Production',
      progress: 65,
      dueDate: '2025-09-15'
    },
    {
      id: 'PO-002',
      client: 'Fashion Forward',
      amount: '₱156,450',
      units: 800,
      status: 'Design Approval',
      progress: 25,
      dueDate: '2025-09-20'
    },
    {
      id: 'PO-003',
      client: 'SportsMania',
      amount: '₱432,120',
      units: 2000,
      status: 'Quality Check',
      progress: 90,
      dueDate: '2025-09-12'
    }
  ]

  const tabs = ['Home', 'Core', 'Fixes', 'Plan', 'Metrics', 'PO', 'Delivery']

  const sidebarItems = [
    { icon: Home, label: 'Executive Summary', active: true },
    { icon: CheckCircle, label: 'Core Requirements' },
    { icon: AlertCircle, label: 'Critical Fixes' },
    { icon: Target, label: 'Implementation Plan' },
    { icon: BarChart3, label: 'Success Metrics' },
    { icon: Package, label: 'PO List' },
    { icon: ShoppingCart, label: 'Final Delivery' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Left Sidebar - Matching TikTok style */}
      <div className="fixed left-0 top-0 w-16 h-full bg-black flex flex-col items-center py-4 z-50">
        <div className="mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
        </div>
        
        {sidebarItems.map((item, index) => (
          <button
            key={index}
            className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center transition-colors ${
              item.active 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="ml-16 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ASH AI ERP Analytics</h1>
          
          {/* Tabs */}
          <div className="flex gap-6 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`pb-3 px-1 font-medium text-sm transition-colors ${
                  selectedTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Business Data Cards */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Business data</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Last 7 days</span>
                  <span>Sep 02, 2025 - Sep 08, 2025</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">System Performance</span>
                    <Badge variant="secondary" className="bg-teal-100 text-teal-700">Performance</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">94.5%</span>
                    <span className="text-sm text-green-600 flex items-center">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +2.1%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">vs last 7 days • +6.59%</p>
                </Card>

                <Card className="p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">User Experience</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">UX Score</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">87.2%</span>
                    <span className="text-sm text-green-600 flex items-center">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +5.4%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">vs last 7 days • +8.24%</p>
                </Card>

                <Card className="p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Business Value</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">Revenue</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">₱873K</span>
                    <span className="text-sm text-green-600 flex items-center">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      +3.2%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">vs last 7 days • +95.54%</p>
                </Card>
              </div>

              {/* Production Pipeline Chart */}
              <Card className="p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Production Pipeline Status</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Active Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Completed</span>
                    </div>
                  </div>
                </div>
                
                {/* Simulated Chart Area */}
                <div className="h-64 bg-gradient-to-t from-blue-50 to-transparent rounded-lg flex items-end justify-between px-4 pb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-blue-500 rounded-t" style={{ height: '120px' }}></div>
                    <span className="text-xs text-gray-500 mt-2">Design</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-blue-500 rounded-t" style={{ height: '180px' }}></div>
                    <span className="text-xs text-gray-500 mt-2">Production</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-blue-500 rounded-t" style={{ height: '140px' }}></div>
                    <span className="text-xs text-gray-500 mt-2">QC</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 bg-green-500 rounded-t" style={{ height: '200px' }}></div>
                    <span className="text-xs text-gray-500 mt-2">Shipping</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Core Requirements Section (replacing Sales Sources) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Core Requirements</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-teal-600 border-teal-600">
                    All Systems
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-500">
                    Critical Only
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Authentication</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-teal-600">
                      View analysis →
                    </Button>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">₱432,934.08</p>
                  <p className="text-sm text-gray-500">Revenue from 4 integrated systems</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-sm text-gray-600">Top 3 AUTH systems, ranked by usage</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Multi-factor Auth</span>
                        </div>
                        <span className="text-sm font-medium">₱17,164.69</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Order Management</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-teal-600">
                      View analysis →
                    </Button>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">₱259</p>
                  <p className="text-sm text-gray-500">Processing from 12 active orders</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-sm text-gray-600">Top 3 workflows, ranked by efficiency</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">Bulk Processing</span>
                        </div>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Quality Control</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-teal-600">
                      View analysis →
                    </Button>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">₱6,602.38</p>
                  <p className="text-sm text-gray-500">QC value from 18 inspections</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-sm text-gray-600">Top 3 QC areas, ranked by impact</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">Final Inspection</span>
                        </div>
                        <span className="text-sm font-medium">₱2,310.90</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-4">
            {/* Today's Data */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Today's data</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>Trends</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">Last updated: 15:44</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active POs</p>
                    <p className="text-lg font-bold">₱54,272.05</p>
                    <p className="text-xs text-gray-500">Yesterday ₱51,056.46</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Units</p>
                    <p className="text-lg font-bold">171</p>
                    <p className="text-xs text-gray-500">Yesterday 179</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Active Clients</p>
                    <p className="text-xl font-bold">2,678</p>
                    <p className="text-xs text-gray-500">Yesterday 2,534</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Major Accounts</p>
                    <p className="text-xl font-bold">111</p>
                    <p className="text-xs text-gray-500">Yesterday 114</p>
                  </div>
                </div>

                <div className="flex gap-1 mt-3">
                  {['₱2.5K', '₱1.8K', '₱3.1K', '₱2.9K', '₱4.2K'].map((value, i) => (
                    <div key={i} className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-orange-700">{i + 1}</span>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-teal-600">
                    Join now →
                  </Button>
                </div>
              </div>
            </Card>

            {/* Business Accelerator */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-900">Business accelerator</h3>
                </div>
                <Button variant="ghost" size="sm" className="text-teal-600">
                  More →
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Optimize production flow</p>
                    <p className="text-xs text-gray-500">Could increase sales by 7%</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Optimize order processing</p>
                    <p className="text-xs text-gray-500">Could increase sales by 7%</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Improve search traffic optimization</p>
                    <p className="text-xs text-gray-500">Could increase sales by 5%</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
              </div>
            </Card>

            {/* Current PO List Table */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Current PO List Status</h3>
              <div className="space-y-3">
                {currentPOs.map((po) => (
                  <div key={po.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{po.id}</span>
                      <Badge variant={po.status === 'In Production' ? 'default' : 'secondary'}>
                        {po.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{po.client}</p>
                    <p className="text-lg font-bold text-gray-900">{po.amount}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>{po.units} units</span>
                      <span>{po.progress}% complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all" 
                        style={{ width: `${po.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">₱873,298</p>
                    <p className="text-xs text-gray-500">Total Pipeline Value</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">4,000</p>
                    <p className="text-xs text-gray-500">Total Units</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}