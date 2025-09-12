// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Home,
  Package,
  Truck,
  Users,
  BarChart,
  Settings,
  ClipboardList,
  Wallet,
  ShoppingCart,
  User,
  Palette,
  Printer,
  Scissors,
  Shield,
  Zap,
  Brain,
  Calendar,
  FileText,
  Activity,
  Target,
  Layers,
  GitBranch,
  Wrench,
  Menu,
  X
} from 'lucide-react'
import AshleyAIChat from '@/components/ai/AshleyAIChat'

// Import all page components
// import { CleanDashboard } from '@/components/CleanDashboard' // Temporarily disabled due to syntax error
import { ModernOrdersPage } from '@/components/ModernOrdersPage'
import { EnterpriseDashboard } from '@/components/EnterpriseDashboard'
import { CleanAnalyticsDashboard } from '@/components/CleanAnalyticsDashboard'

export default function UnifiedDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
      return
    }
    setMounted(true)
  }, [session, status, router])

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading ASH AI Dashboard...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Home, 
      description: 'Main overview and analytics' 
    },
    { 
      id: 'orders', 
      label: 'Orders', 
      icon: ShoppingCart, 
      description: 'Order management and tracking' 
    },
    { 
      id: 'production', 
      label: 'Production', 
      icon: Layers, 
      description: 'Manufacturing and workflow' 
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart, 
      description: 'Business intelligence and insights' 
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: Package, 
      description: 'Stock and material management' 
    },
    { 
      id: 'qc', 
      label: 'Quality Control', 
      icon: Shield, 
      description: 'Quality assurance and testing' 
    },
    { 
      id: 'design', 
      label: 'Design', 
      icon: Palette, 
      description: 'Design approval and management' 
    },
    { 
      id: 'cutting', 
      label: 'Cutting', 
      icon: Scissors, 
      description: 'Cutting operations and planning' 
    },
    { 
      id: 'printing', 
      label: 'Printing', 
      icon: Printer, 
      description: 'Printing processes and schedules' 
    },
    { 
      id: 'packing', 
      label: 'Packing', 
      icon: Package, 
      description: 'Packaging and shipping prep' 
    },
    { 
      id: 'clients', 
      label: 'Clients', 
      icon: Users, 
      description: 'Client management and portal' 
    },
    { 
      id: 'finance', 
      label: 'Finance', 
      icon: Wallet, 
      description: 'Financial management and billing' 
    },
    { 
      id: 'maintenance', 
      label: 'Maintenance', 
      icon: Wrench, 
      description: 'Equipment maintenance and repair' 
    },
    { 
      id: 'automation', 
      label: 'Automation', 
      icon: Zap, 
      description: 'Workflow automation and rules' 
    },
    { 
      id: 'ai-assistant', 
      label: 'AI Assistant', 
      icon: Brain, 
      description: 'Ashley AI insights and analysis' 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      description: 'System configuration and preferences' 
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* TikTok-style Left Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 flex flex-col hidden lg:flex">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-800 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ASH AI</h1>
              <p className="text-xs text-gray-600">Smart Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name || 'User'}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Activity className="w-3 h-3 text-green-500" />
                System Online
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 flex-1 pt-16 lg:pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">

          {/* Content Area */}
          <div className="p-6">
            <TabsContent value="dashboard" className="mt-0">
              {/* TikTok-style Dashboard Content */}
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Stats - TikTok Style Centered */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Dashboard Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">847</div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">156</div>
                      <div className="text-sm text-gray-600">Active Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">₱2.4M</div>
                      <div className="text-sm text-gray-600">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-600 mb-1">94%</div>
                      <div className="text-sm text-gray-600">Efficiency</div>
                    </div>
                  </div>
                </div>

                {/* Production Pipeline Status - TikTok Style Centered */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Production Pipeline Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-semibold text-blue-800 mb-1">Design</div>
                      <div className="text-2xl font-bold text-blue-600">24</div>
                      <div className="text-xs text-blue-600">pending approval</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-semibold text-yellow-800 mb-1">Cutting</div>
                      <div className="text-2xl font-bold text-yellow-600">18</div>
                      <div className="text-xs text-yellow-600">in progress</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-semibold text-purple-800 mb-1">Printing</div>
                      <div className="text-2xl font-bold text-purple-600">32</div>
                      <div className="text-xs text-purple-600">scheduled</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-semibold text-green-800 mb-1">Sewing</div>
                      <div className="text-2xl font-bold text-green-600">45</div>
                      <div className="text-xs text-green-600">active</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-semibold text-indigo-800 mb-1">QC</div>
                      <div className="text-2xl font-bold text-indigo-600">12</div>
                      <div className="text-xs text-indigo-600">testing</div>
                    </div>
                    <div className="bg-cyan-50 rounded-lg p-4 text-center">
                      <div className="text-lg font-semibold text-cyan-800 mb-1">Packing</div>
                      <div className="text-2xl font-bold text-cyan-600">8</div>
                      <div className="text-xs text-cyan-600">ready to ship</div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity - TikTok Style */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <div>
                          <div className="font-medium text-gray-900">#ASH-001247</div>
                          <div className="text-sm text-gray-600">Nike Athletic Wear</div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">In Production</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div>
                          <div className="font-medium text-gray-900">#ASH-001248</div>
                          <div className="text-sm text-gray-600">Adidas Sports Collection</div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-700">Design Review</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div>
                          <div className="font-medium text-gray-900">#ASH-001249</div>
                          <div className="text-sm text-gray-600">Puma Lifestyle Series</div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">Order Received</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-gray-700">Production Line</div>
                        <Badge className="bg-green-100 text-green-700">Operational</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-gray-700">Quality Control</div>
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-gray-700">Ashley AI</div>
                        <Badge className="bg-cyan-100 text-cyan-700">Online</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-gray-700">Client Portal</div>
                        <Badge className="bg-green-100 text-green-700">Available</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="orders" className="mt-0">
              <ModernOrdersPage />
            </TabsContent>
            
            <TabsContent value="production" className="mt-0">
              <EnterpriseDashboard />
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-0">
              <CleanAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="inventory" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Inventory Management</h3>
                  <p className="text-gray-600 mb-6">Stock control and material tracking</p>
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2">
                    Manage Inventory
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qc" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Control</h3>
                  <p className="text-gray-600 mb-6">Quality assurance and testing processes</p>
                  <Button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2">
                    QC Dashboard
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Palette className="w-16 h-16 mx-auto mb-4 text-purple-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Design Management</h3>
                  <p className="text-gray-600 mb-6">Design approval and version control</p>
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2">
                    Design Center
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cutting" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Scissors className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Cutting Operations</h3>
                  <p className="text-gray-600 mb-6">Cutting planning and execution</p>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2">
                    Cutting Dashboard
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="printing" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Printer className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Printing Center</h3>
                  <p className="text-gray-600 mb-6">Print job management and scheduling</p>
                  <Button className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2">
                    Printing Hub
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="packing" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-cyan-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Packing Operations</h3>
                  <p className="text-gray-600 mb-6">Packaging and shipping preparation</p>
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2">
                    Packing Center
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Management</h3>
                  <p className="text-gray-600 mb-6">Customer portal and relationship management</p>
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2">
                    Client Portal
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="finance" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Wallet className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Management</h3>
                  <p className="text-gray-600 mb-6">Billing, payments, and financial reporting</p>
                  <Button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2">
                    Finance Center
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Wrench className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Maintenance Hub</h3>
                  <p className="text-gray-600 mb-6">Equipment maintenance and scheduling</p>
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2">
                    Maintenance Center
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="automation" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Automation Center</h3>
                  <p className="text-gray-600 mb-6">Workflow automation and business rules</p>
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2">
                    Automation Hub
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-assistant" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-cyan-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ashley AI Assistant</h3>
                  <p className="text-gray-600 mb-6">AI-powered insights and intelligent automation</p>
                  <Button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2">
                    AI Dashboard
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h3>
                  <p className="text-gray-600 mb-6">Configuration and system preferences</p>
                  <Button className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2">
                    Settings Panel
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-black to-gray-800 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-sm font-bold text-gray-900">ASH AI</h1>
            </div>
            <div className="text-xs text-gray-600">
              {session?.user?.name || 'User'}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            
            {/* Sidebar */}
            <div className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 flex flex-col">
              {/* Mobile Sidebar Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-black to-gray-800 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">ASH AI</h1>
                    <p className="text-xs text-gray-600">Smart Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <div className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm font-medium rounded-lg transition-colors group ${
                          isActive
                            ? 'bg-black text-white'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </nav>

              {/* Mobile Sidebar Footer */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {session?.user?.name || 'User'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Activity className="w-3 h-3 text-green-500" />
                      System Online
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ashley AI Chat - Always Available */}
      <AshleyAIChat />
    </div>
  )
}