'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Home,
  Package,
  Activity,
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
  ChevronRight,
  Gift,
  RotateCcw,
  Sparkles,
  Scissors,
  Palette,
  Truck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

// ASH AI Manufacturing Data based on CLIENT_UPDATED_PLAN.md
interface ManufacturingStats {
  totalOrders: number
  activeOrders: number
  completedOrders: number
  revenue: number
  efficiency: number
  alerts: number
}

interface ProductionStage {
  stage: string
  active: number
  completed: number
  efficiency: string
  color: string
  bgColor: string
  borderColor: string
}

interface ActiveOrder {
  po_number: string
  client: string
  status: string
  qty: number
  stage: string
}

export function TikTokStyleDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('home')
  const [isMobile, setIsMobile] = useState(false)

  // ASH AI Manufacturing Data from CLIENT_UPDATED_PLAN.md
  const [stats] = useState<ManufacturingStats>({
    totalOrders: 1247,
    activeOrders: 19, // Exact from plan: 19 active orders
    completedOrders: 1228,
    revenue: 2849750,
    efficiency: 94.2,
    alerts: 8 // Critical fixes needed
  })

  // Core Requirements Status from CLIENT_UPDATED_PLAN.md
  const coreRequirements = [
    { id: 1, name: 'Authentication & User Management', status: 'completed', progress: 100, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 2, name: 'Dashboard & Analytics', status: 'completed', progress: 100, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 3, name: 'Order Management System', status: 'needs_fix', progress: 70, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 4, name: 'Production Management', status: 'needs_fix', progress: 65, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 5, name: 'Quality Control System', status: 'needs_fix', progress: 60, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 6, name: 'Inventory Management', status: 'needs_fix', progress: 55, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 7, name: 'Human Resources', status: 'needs_fix', progress: 50, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 8, name: 'Financial Management', status: 'needs_fix', progress: 55, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 9, name: 'Client Portal', status: 'needs_fix', progress: 60, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 10, name: 'AI Integration (Ashley AI)', status: 'completed', progress: 100, color: 'text-green-600', bgColor: 'bg-green-50' }
  ]

  // Critical Fixes from CLIENT_UPDATED_PLAN.md
  const criticalFixes = [
    { priority: 1, title: 'Database & API Stability', items: ['Fix 170+ API endpoints', 'PostgreSQL migration', 'Connection pooling', 'Error handling'], urgent: true },
    { priority: 2, title: 'User Experience', items: ['Fix sidebar navigation', 'Add loading states', 'Responsive design', 'Error boundaries'], urgent: true },
    { priority: 3, title: 'Core Functionality', items: ['Order workflow automation', 'Production tracking', 'Quality checkpoints', 'Client communication'], urgent: false }
  ]

  // Immediate Action Items from CLIENT_UPDATED_PLAN.md
  const immediateActions = [
    { title: 'Fix database connection issues', status: 'pending', urgent: true },
    { title: 'Resolve API endpoint errors', status: 'pending', urgent: true },
    { title: 'Fix authentication flow', status: 'pending', urgent: true },
    { title: 'Implement proper error handling', status: 'pending', urgent: true },
    { title: 'Complete order management system', status: 'in_progress', urgent: false },
    { title: 'Fix production tracking', status: 'pending', urgent: false },
    { title: 'Implement quality control', status: 'pending', urgent: false },
    { title: 'Add inventory management', status: 'pending', urgent: false }
  ]

  const [productionStages] = useState<ProductionStage[]>([
    { stage: 'Material Preparation', active: 11, completed: 156, efficiency: '58%', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
    { stage: 'Screen Making/Sampling', active: 4, completed: 89, efficiency: '21%', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
    { stage: 'Cutting', active: 3, completed: 134, efficiency: '16%', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
    { stage: 'Sewing', active: 1, completed: 98, efficiency: '5%', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' }
  ])

  // Active orders from CLIENT_UPDATED_PLAN.md
  const [activeOrders] = useState<ActiveOrder[]>([
    { po_number: '020335', client: 'REEFER', status: 'MATERIAL PREPARATION', qty: 30, stage: 'Material Prep' },
    { po_number: '020334', client: 'REEFER', status: 'MATERIAL PREPARATION', qty: 30, stage: 'Material Prep' },
    { po_number: '020333', client: 'REEFER', status: 'MATERIAL PREPARATION', qty: 30, stage: 'Material Prep' },
    { po_number: '020332', client: 'REEFER', status: 'MATERIAL PREPARATION', qty: 30, stage: 'Material Prep' },
    { po_number: '020329', client: 'REVEL', status: 'MATERIAL PREPARATION', qty: 7, stage: 'Material Prep' },
    { po_number: '020320', client: 'HMS SOCIETY', status: 'CUTTING', qty: 21, stage: 'Cutting' },
    { po_number: '020317', client: 'PLEAD THE FIFTH', status: 'SEWING', qty: 65, stage: 'Sewing' }
  ])

  const tasks = [
    { id: '1', title: 'Fix database connection issues', count: 1, urgent: true },
    { id: '2', title: 'Resolve API endpoint errors', count: 170, urgent: true },
    { id: '3', title: 'Fix authentication flow', count: 1, urgent: true },
    { id: '4', title: 'Order workflow automation', count: 3, urgent: false },
    { id: '5', title: 'Production tracking fixes', count: 5, urgent: false }
  ]

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Dashboard', active: true },
    { id: 'orders', icon: Package, label: 'Orders' },
    { id: 'production', icon: Activity, label: 'Production' },
    { id: 'quality', icon: Target, label: 'Quality Control' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'ashley', icon: Brain, label: 'Ashley AI' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ]

  const mobileTabItems = [
    { id: 'home', icon: Home, label: 'Home', badge: null },
    { id: 'orders', icon: Package, label: 'Orders', badge: stats.activeOrders },
    { id: 'production', icon: Activity, label: 'Production', badge: null },
    { id: 'chat', icon: MessageSquare, label: 'Ashley', badge: null },
    { id: 'settings', icon: Settings, label: 'Settings', badge: stats.alerts }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MATERIAL PREPARATION': return 'bg-blue-50 text-blue-600 border-blue-200'
      case 'CUTTING': return 'bg-emerald-50 text-emerald-600 border-emerald-200'
      case 'SEWING': return 'bg-amber-50 text-amber-600 border-amber-200'
      case 'SCREEN MAKING': return 'bg-purple-50 text-purple-600 border-purple-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Mobile Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">ASH AI Manufacturing</span>
          </div>
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            {stats.alerts > 0 && (
              <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                {stats.alerts}
              </Badge>
            )}
          </div>
        </div>

        {/* Daily Overview Card */}
        <div className="p-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Production overview</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              
              <p className="text-sm text-gray-500 mb-4">Updated 09/09, 05:10 PM (GMT+08:00)</p>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue / 1000000)}M</p>
                  <p className="text-sm text-gray-500">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
                  <p className="text-sm text-gray-500">Active Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">348</p>
                  <p className="text-sm text-gray-500">Units in Prod</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Fixes Required - From CLIENT_UPDATED_PLAN.md */}
        <div className="px-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <span className="font-semibold text-gray-900">Critical Fixes Required</span>
          </div>
          
          <div className="space-y-3">
            {criticalFixes.map((fix, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={`${fix.urgent ? 'bg-red-500' : 'bg-orange-500'} text-white text-xs`}>
                        Priority {fix.priority}
                      </Badge>
                      <span className="text-gray-900 font-medium">{fix.title}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    {fix.items.slice(0, 2).map((item, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                        <span>{item}</span>
                      </div>
                    ))}
                    {fix.items.length > 2 && (
                      <div className="text-xs text-gray-500 mt-1">+{fix.items.length - 2} more items</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Immediate Action Items */}
        <div className="px-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-semibold text-gray-900">Immediate Actions</span>
          </div>
          
          <div className="space-y-3">
            {immediateActions.filter(action => action.urgent).map((action, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">{action.title}</span>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${action.urgent ? 'bg-red-500' : 'bg-gray-500'} text-white rounded-full px-2 py-1 text-xs`}>
                        {action.status}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Production Pipeline */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                <Activity className="w-4 h-4 text-gray-600" />
              </div>
              <span className="font-semibold text-gray-900">Production pipeline</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {productionStages.map((stage, index) => (
              <Card key={index} className={`bg-white border ${stage.borderColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold ${stage.color}`}>{stage.stage}</h3>
                      <p className="text-sm text-gray-600">{stage.active} active • {stage.completed} completed</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${stage.color}`}>{stage.efficiency}</p>
                      <p className="text-xs text-gray-500">Efficiency</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Active Orders */}
        <div className="px-4 mb-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Recent orders</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-3">
                {activeOrders.slice(0, 3).map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.po_number}</p>
                      <p className="text-sm text-gray-600">{order.client}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                        {order.stage}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{order.qty} pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ashley AI Assistant */}
        <div className="px-4 mb-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <Brain className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900">Ashley AI Assistant</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="grid grid-cols-5 py-2">
            {mobileTabItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center py-2 px-1 relative ${
                    activeTab === item.id ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
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

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* TikTok-style Sidebar - Desktop */}
      <div className="flex flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-gray-900">ASH AI</span>
            <Badge variant="outline" className="text-xs">Manufacturing</Badge>
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
                    ? 'bg-blue-50 text-blue-600'
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
              <h1 className="text-2xl font-bold text-gray-900">Manufacturing Dashboard</h1>
              <div className="flex items-center space-x-4 mt-1">
                <Tabs defaultValue="overview" className="w-auto">
                  <TabsList className="bg-transparent p-0 h-auto space-x-6">
                    <TabsTrigger value="overview" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="production" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none">
                      Production
                    </TabsTrigger>
                    <TabsTrigger value="quality" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none">
                      Quality Control
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="bg-transparent px-0 text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none">
                      Analytics
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
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                {stats.alerts > 0 && (
                  <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {stats.alerts}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Content - Stats and Production */}
            <div className="lg:col-span-3 space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
                        <div className="flex items-center mt-2">
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">12.5%</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Orders</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
                        <div className="flex items-center mt-2">
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">5.2%</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue / 1000000)}M</p>
                        <div className="flex items-center mt-2">
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">18.7%</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Efficiency</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.efficiency}%</p>
                        <div className="flex items-center mt-2">
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">2.1%</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Core Requirements Status from CLIENT_UPDATED_PLAN.md */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Core Requirements Progress</CardTitle>
                  <CardDescription>10 main modules as per CLIENT_UPDATED_PLAN.md</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coreRequirements.map((req) => (
                      <div key={req.id} className={`p-4 rounded-lg border ${req.bgColor} ${req.status === 'completed' ? 'border-green-200' : 'border-orange-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`font-semibold ${req.color} text-sm`}>{req.name}</h3>
                          <div className="flex items-center space-x-2">
                            {req.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            )}
                            <span className={`text-xs font-medium ${req.color}`}>{req.progress}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${req.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}`}
                            style={{ width: `${req.progress}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          {req.status === 'completed' ? '✅ Completed' : '🔧 Needs fixes'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Critical Fixes Required */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-red-600">🚨 Critical Fixes Required</CardTitle>
                  <CardDescription>Priority issues from CLIENT_UPDATED_PLAN.md</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {criticalFixes.map((fix, index) => (
                      <div key={index} className={`p-4 rounded-lg ${fix.urgent ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'} border`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className={`${fix.urgent ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
                              Priority {fix.priority}
                            </Badge>
                            <h3 className="font-semibold text-gray-900">{fix.title}</h3>
                          </div>
                          <AlertTriangle className={`w-5 h-5 ${fix.urgent ? 'text-red-500' : 'text-orange-500'}`} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {fix.items.map((item, i) => (
                            <div key={i} className="flex items-center space-x-2 text-sm text-gray-700">
                              <div className={`w-2 h-2 rounded-full ${fix.urgent ? 'bg-red-400' : 'bg-orange-400'}`}></div>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Production Pipeline Status */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Production Pipeline Status</CardTitle>
                  <CardDescription>Real-time view from CLIENT_UPDATED_PLAN.md data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productionStages.map((stage, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${stage.borderColor} ${stage.bgColor}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`font-semibold ${stage.color}`}>{stage.stage}</h3>
                          <Badge className={`${stage.color} bg-transparent`}>{stage.efficiency}</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Active</span>
                            <span className="font-semibold">{stage.active}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Completed</span>
                            <span className="font-semibold">{stage.completed}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Orders Table */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Active Purchase Orders</CardTitle>
                  <CardDescription>Current orders in production pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">PO Number</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeOrders.slice(0, 7).map((order, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{order.po_number}</td>
                            <td className="py-3 px-4 text-gray-600">{order.client}</td>
                            <td className="py-3 px-4 text-gray-600">{order.qty} pcs</td>
                            <td className="py-3 px-4">
                              <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                                {order.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{order.stage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Ashley AI & Tasks */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Today's Performance</CardTitle>
                  <p className="text-sm text-gray-500">Last updated: 15:44</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Units Produced</span>
                    <span className="font-semibold">348</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Quality Score</span>
                    <span className="font-semibold text-green-600">98.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">On-time Delivery</span>
                    <span className="font-semibold">94.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Workers</span>
                    <span className="font-semibold">127</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-blue-800">Ashley AI Assistant</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-sm font-medium">Production Optimization</p>
                      <p className="text-xs text-blue-600">Could increase efficiency by 4%</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-sm font-medium">Material Planning Alert</p>
                      <p className="text-xs text-orange-600">Low stock on 3 materials</p>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat with Ashley
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Priority Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tasks.filter(task => task.urgent || task.count > 0).map((task) => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium">{task.title}</span>
                      <Badge className={`${
                        task.urgent 
                          ? 'bg-red-500 text-white' 
                          : task.count > 0 
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {task.count}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}