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
  Wrench
} from 'lucide-react'
import AshleyAIChat from '@/components/ai/AshleyAIChat'

// Import all page components
import { CleanDashboard } from '@/components/CleanDashboard'
import { ModernOrdersPage } from '@/components/ModernOrdersPage'
import { EnterpriseDashboard } from '@/components/EnterpriseDashboard'
import { ExactTikTokAnalytics } from '@/components/ExactTikTokAnalytics'

export default function UnifiedDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mounted, setMounted] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ASH AI Dashboard</h1>
                <p className="text-xs text-gray-400">Apparel Smart Hub - All-in-One</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
              <Activity className="w-3 h-3 mr-1" />
              System Online
            </Badge>
            <div className="text-sm text-gray-300">
              Welcome, {session?.user?.name || 'User'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <div className="sticky top-20 z-40 bg-black/10 backdrop-blur-xl border-b border-white/10">
            <TabsList className="w-full h-auto p-2 bg-transparent border-none rounded-none overflow-x-auto flex-nowrap">
              <div className="flex gap-1 min-w-max px-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/50 rounded-xl whitespace-nowrap border border-transparent transition-all"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  )
                })}
              </div>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <TabsContent value="dashboard" className="mt-0">
              <CleanDashboard />
            </TabsContent>
            
            <TabsContent value="orders" className="mt-0">
              <ModernOrdersPage />
            </TabsContent>
            
            <TabsContent value="production" className="mt-0">
              <EnterpriseDashboard />
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-0">
              <ExactTikTokAnalytics />
            </TabsContent>

            <TabsContent value="inventory" className="mt-0">
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Inventory Management</h3>
                <p className="text-gray-400 mb-6">Stock control and material tracking</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Manage Inventory
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="qc" className="mt-0">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Quality Control</h3>
                <p className="text-gray-400 mb-6">Quality assurance and testing processes</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  QC Dashboard
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="design" className="mt-0">
              <div className="text-center py-12">
                <Palette className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Design Management</h3>
                <p className="text-gray-400 mb-6">Design approval and version control</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Design Center
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="cutting" className="mt-0">
              <div className="text-center py-12">
                <Scissors className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Cutting Operations</h3>
                <p className="text-gray-400 mb-6">Cutting planning and execution</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Cutting Dashboard
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="printing" className="mt-0">
              <div className="text-center py-12">
                <Printer className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Printing Center</h3>
                <p className="text-gray-400 mb-6">Print job management and scheduling</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Printing Hub
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="packing" className="mt-0">
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Packing Operations</h3>
                <p className="text-gray-400 mb-6">Packaging and shipping preparation</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Packing Center
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="mt-0">
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Client Management</h3>
                <p className="text-gray-400 mb-6">Customer portal and relationship management</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Client Portal
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="finance" className="mt-0">
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Financial Management</h3>
                <p className="text-gray-400 mb-6">Billing, payments, and financial reporting</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Finance Center
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-0">
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Maintenance Hub</h3>
                <p className="text-gray-400 mb-6">Equipment maintenance and scheduling</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Maintenance Center
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="automation" className="mt-0">
              <div className="text-center py-12">
                <Zap className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Automation Center</h3>
                <p className="text-gray-400 mb-6">Workflow automation and business rules</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Automation Hub
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ai-assistant" className="mt-0">
              <div className="text-center py-12">
                <Brain className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Ashley AI Assistant</h3>
                <p className="text-gray-400 mb-6">AI-powered insights and intelligent automation</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  AI Dashboard
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">System Settings</h3>
                <p className="text-gray-400 mb-6">Configuration and system preferences</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Settings Panel
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Ashley AI Chat - Always Available */}
      <AshleyAIChat />
    </div>
  )
}