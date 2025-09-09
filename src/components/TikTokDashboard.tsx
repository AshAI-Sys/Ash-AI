'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Home,
  Package,
  BarChart3,
  Users,
  Settings,
  Bell,
  Search,
  Calendar,
  MessageSquare,
  Zap,
  Target,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Play,
  ShoppingCart,
  Brain,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

interface DashboardStats {
  revenue: number
  orders: number
  visitors: number
  efficiency: number
}

interface TaskItem {
  id: string
  title: string
  count: number
  urgent?: boolean
}

export function TikTokDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('home')
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 62991.64,
    orders: 200,
    visitors: 2914,
    efficiency: 94.2
  })

  const [tasks] = useState<TaskItem[]>([
    { id: '1', title: 'Orders ready to ship', count: 63, urgent: true },
    { id: '2', title: 'Pending returns', count: 1, urgent: true },
    { id: '3', title: 'Quality inspections', count: 8 },
    { id: '4', title: 'Material requests', count: 12 }
  ])

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home', active: true },
    { id: 'orders', icon: Package, label: 'Orders' },
    { id: 'production', icon: Activity, label: 'Production' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'quality', icon: Target, label: 'Quality' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'ai', icon: Brain, label: 'Ashley AI' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ]

  const mobileTabItems = [
    { id: 'home', icon: Home, label: 'Home', badge: null },
    { id: 'products', icon: Package, label: 'Products', badge: null },
    { id: 'orders', icon: ShoppingCart, label: 'Orders', badge: null },
    { id: 'chat', icon: MessageSquare, label: 'Chat', badge: 5 },
    { id: 'settings', icon: Settings, label: 'Settings', badge: null }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* TikTok-style Sidebar - Desktop */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-gray-900">ASH AI</span>
            <Badge variant="outline" className="text-xs">Seller Center</Badge>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <div className="flex items-center space-x-4 mt-1">
                <Tabs defaultValue="home" className="w-auto">
                  <TabsList className="bg-transparent p-0 h-auto space-x-6">
                    <TabsTrigger value="home" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none">
                      Home
                    </TabsTrigger>
                    <TabsTrigger value="growth" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none">
                      Growth & insights
                    </TabsTrigger>
                    <TabsTrigger value="live" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none">
                      LIVE & video
                    </TabsTrigger>
                    <TabsTrigger value="product" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none">
                      Product card
                    </TabsTrigger>
                    <TabsTrigger value="marketing" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-gray-900 rounded-none">
                      Marketing
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Last 7 days: Sep 02, 2025 - Sep 08, 2025
              </Button>
              <Button variant="outline" size="sm">
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                Trends
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Content - Stats and Charts */}
            <div className="lg:col-span-3 space-y-6">
              {/* Business Data Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GMV Card */}
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">GMV</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(271303)}</p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-gray-600">Vs last 7 days</span>
                          <div className="flex items-center ml-2">
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">63.59%</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-teal-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gross Revenue Card */}
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Gross revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(284728)}</p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-gray-600">Vs last 7 days</span>
                          <div className="flex items-center ml-2">
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">66.54%</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Items Sold Card */}
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Items sold</p>
                        <p className="text-2xl font-bold text-gray-900">884</p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-gray-600">Vs last 7 days</span>
                          <div className="flex items-center ml-2">
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">96.54%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Area */}
              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Analytics Chart Coming Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales Sources */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Sales sources</CardTitle>
                  <div className="flex space-x-4">
                    <Button variant="default" size="sm" className="bg-teal-600 hover:bg-teal-700">
                      Highest GMV
                    </Button>
                    <Button variant="outline" size="sm">
                      Most views
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LIVE */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium">LIVE</span>
                        <Button variant="link" className="text-teal-600 p-0 h-auto">
                          View analysis →
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{formatCurrency(42934.08)} GMV from 1 self-operated accounts.</p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                            <span className="text-xs font-medium">📱</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{formatCurrency(17164.69)}</p>
                            <p className="text-xs text-gray-500">2025/09/08 18:01 @reefer.co</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Videos */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="font-medium">Videos</span>
                        <Button variant="link" className="text-teal-600 p-0 h-auto">
                          View analysis →
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">₱259 GMV from 1 linked accounts.</p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-pink-100 rounded flex items-center justify-center">
                            <Play className="w-4 h-4 text-pink-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">₱259</p>
                            <p className="text-xs text-gray-500">2024/10/13 17:44 ₱99 Hoodies! Limi...</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Cards */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                        <span className="font-medium">Product cards</span>
                        <Button variant="link" className="text-teal-600 p-0 h-auto">
                          View analysis →
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{formatCurrency(6602.38)} GMV from 18 product cards.</p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{formatCurrency(2310.90)}</p>
                            <p className="text-xs text-gray-500">REEFER CLOTHING - DARK DAYS [BLACK]</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Today's Data */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Today's data</CardTitle>
                  <p className="text-sm text-gray-500">Last updated: 15:44</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">GMV</span>
                    <span className="font-semibold">{formatCurrency(54272)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Items sold</span>
                    <span className="font-semibold">171</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Visitors</span>
                    <span className="font-semibold">2,678</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customers</span>
                    <span className="font-semibold">111</span>
                  </div>
                </CardContent>
              </Card>

              {/* Business Accelerator */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Business accelerator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">Optimize product(s) that f...</p>
                    <p className="text-xs text-green-600">Could increase sales by 7%</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">Optimize product image(s)</p>
                    <p className="text-xs text-green-600">Could increase sales by 7%</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">Improve search traffic wit...</p>
                    <p className="text-xs text-green-600">Could increase sales by 3%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden">
        <div className="grid grid-cols-5 py-2">
          {mobileTabItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-2 px-1 relative ${
                  activeTab === item.id ? 'text-teal-600' : 'text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.badge && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {item.badge}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}