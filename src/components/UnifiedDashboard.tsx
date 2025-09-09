'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  AlertCircle,
  Brain,
  Zap,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Bell,
  Settings,
  Truck,
  MessageSquare,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

interface DashboardStats {
  totalOrders: number
  activeOrders: number
  completedOrders: number
  revenue: number
  efficiency: number
  alerts: number
}

interface Order {
  id: string
  po_number: string
  client: string
  status: string
  amount: number
  due_date: string
  progress: number
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  message: string
  timestamp: string
}

export function UnifiedDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 1247,
    activeOrders: 23,
    completedOrders: 1224,
    revenue: 2849750,
    efficiency: 94.2,
    alerts: 3
  })

  const [orders] = useState<Order[]>([
    {
      id: '1',
      po_number: 'ASH-2025-001',
      client: 'Premium Apparel Co.',
      status: 'IN_PRODUCTION',
      amount: 125000,
      due_date: '2025-01-15',
      progress: 65
    },
    {
      id: '2',
      po_number: 'ASH-2025-002',
      client: 'Fashion Forward Inc.',
      status: 'DESIGN_APPROVAL',
      amount: 85000,
      due_date: '2025-01-20',
      progress: 30
    },
    {
      id: '3',
      po_number: 'ASH-2025-003',
      client: 'Urban Style Ltd.',
      status: 'QC',
      amount: 95000,
      due_date: '2025-01-12',
      progress: 90
    }
  ])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: 'Hello! I\'m Ashley AI. How can I help optimize your production today?',
      timestamp: '10:00 AM'
    }
  ])
  const [newMessage, setNewMessage] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PRODUCTION': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'DESIGN_APPROVAL': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'QC': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'COMPLETED': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'ON_HOLD': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: newMessage,
      timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    }

    setChatMessages(prev => [...prev, userMessage])
    setNewMessage('')

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: `I understand you're asking about "${newMessage}". Based on current data, I recommend optimizing your production workflow for better efficiency.`,
        timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  return (
    <div className="p-6 max-w-full flex gap-6">
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                ASH AI Command Center
              </h1>
              <p className="text-slate-400">
                Unified control panel for all your apparel production needs
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/20">
                System Operational
              </Badge>
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  {new Date().toLocaleDateString('en-PH', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-lg font-semibold text-white">
                  {new Date().toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Unified Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-800/50 border border-cyan-500/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Package className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <Settings className="w-4 h-4 mr-2" />
            Production
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Orders</p>
                    <p className="text-3xl font-bold text-white">{stats.totalOrders.toLocaleString()}</p>
                    <p className="text-xs text-green-400 flex items-center mt-1">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      +12% from last month
                    </p>
                  </div>
                  <div className="p-3 bg-cyan-500/20 rounded-full">
                    <Package className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Active Orders</p>
                    <p className="text-3xl font-bold text-white">{stats.activeOrders}</p>
                    <p className="text-xs text-blue-400 flex items-center mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      In production
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <Zap className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Revenue</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(stats.revenue)}</p>
                    <p className="text-xs text-green-400 flex items-center mt-1">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      +18% from last month
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Efficiency</p>
                    <p className="text-3xl font-bold text-white">{stats.efficiency}%</p>
                    <p className="text-xs text-purple-400 flex items-center mt-1">
                      <Target className="w-3 h-3 mr-1" />
                      Above target
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-full">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Order Management</h2>
            <div className="flex space-x-2">
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>

          <Card className="hologram-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-cyan-500/10">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-semibold text-white">{order.po_number}</p>
                          <p className="text-sm text-slate-400">{order.client}</p>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} border`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="font-semibold text-white">{formatCurrency(order.amount)}</p>
                        <p className="text-sm text-slate-400">Due: {order.due_date}</p>
                      </div>
                      
                      <div className="w-20">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{order.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-teal-400 h-2 rounded-full"
                            style={{ width: `${order.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="border-cyan-500/20">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-cyan-500/20">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Tab */}
        <TabsContent value="production" className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Production Control</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { stage: 'Cutting', active: 2, completed: 15, efficiency: '92%', color: 'cyan' },
              { stage: 'Printing', active: 3, completed: 12, efficiency: '88%', color: 'blue' },
              { stage: 'Sewing', active: 5, completed: 18, efficiency: '95%', color: 'purple' },
              { stage: 'QC', active: 1, completed: 20, efficiency: '98%', color: 'green' },
              { stage: 'Packing', active: 2, completed: 17, efficiency: '94%', color: 'teal' },
              { stage: 'Delivery', active: 1, completed: 16, efficiency: '89%', color: 'pink' }
            ].map((stage, index) => (
              <Card key={index} className="hologram-card">
                <CardHeader>
                  <CardTitle className={`text-${stage.color}-400 flex items-center`}>
                    <Settings className="w-5 h-5 mr-2" />
                    {stage.stage}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Jobs</span>
                      <span className="text-white font-bold">{stage.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed</span>
                      <span className="text-white font-bold">{stage.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Efficiency</span>
                      <span className={`text-${stage.color}-400 font-bold`}>{stage.efficiency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>


        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="hologram-card">
              <CardHeader>
                <CardTitle className="text-white">Production Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                    <p>Interactive charts and analytics coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardHeader>
                <CardTitle className="text-white">Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Overall Quality Score</span>
                    <span className="text-green-400 font-bold text-2xl">98.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Defect Rate</span>
                    <span className="text-red-400 font-bold">1.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rework Required</span>
                    <span className="text-yellow-400 font-bold">2.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Customer Satisfaction</span>
                    <span className="text-green-400 font-bold">96.4%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Always Visible AI Chat Sidebar */}
      <div className="w-80 flex-shrink-0">
        <Card className="hologram-card h-full sticky top-6">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">Ashley AI</CardTitle>
                <CardDescription className="text-xs">Always here to help</CardDescription>
              </div>
              <div className="ml-auto">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[250px] p-3 rounded-lg text-sm ${
                    msg.type === 'user' 
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white' 
                      : 'bg-slate-800 text-white border border-purple-500/20'
                  }`}>
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask Ashley AI..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-slate-800 border-cyan-500/20 text-white placeholder-slate-400 text-sm"
              />
              <Button 
                onClick={sendMessage} 
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-purple-500 px-3"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-2 text-center">
              <p className="text-xs text-slate-500">AI assistant for production optimization</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}