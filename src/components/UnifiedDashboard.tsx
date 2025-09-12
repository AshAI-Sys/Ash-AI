// @ts-nocheck
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
import { Peso } from '@/components/icons/Peso'
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
      case 'IN_PRODUCTION': return 'status-info'
      case 'DESIGN_APPROVAL': return 'status-warning'
      case 'QC': return 'bg-purple-50 text-purple-600 border-purple-200'
      case 'COMPLETED': return 'status-success'
      case 'ON_HOLD': return 'status-danger'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: newMessage,
      timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    }

    setChatMessages(prev => [...prev, userMessage])
    const currentMessage = newMessage
    setNewMessage('')

    try {
      // Call real OpenAI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage
        })
      })

      const data = await response.json()

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: data.response || data.fallback || "Sorry, I couldn't process your request.",
        timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      }
      
      setChatMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Ashley AI Error:', error)
      
      // Fallback response if API fails
      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: `I understand you're asking about "${currentMessage}". I'm experiencing some connectivity issues right now, but I recommend checking your production workflow for optimization opportunities.`,
        timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
      }
      setChatMessages(prev => [...prev, fallbackResponse])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Mobile-Optimized Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <img src="/Ash-AI.png" alt="ASH AI" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">ASH AI Dashboard</h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">Manufacturing Intelligence System</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-green-700 font-medium">System Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Dashboard Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Simple Tabs Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full mb-4 sm:mb-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm p-2 sm:p-3">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm p-2 sm:p-3">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="production" className="text-xs sm:text-sm p-2 sm:p-3">
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Production</span>
                <span className="sm:hidden">Prod</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm p-2 sm:p-3">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Charts</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Mobile Optimized */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {/* Mobile-Optimized Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-white/70 backdrop-blur-sm border border-blue-100 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4 sm:p-5 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1">
                      {stats.totalOrders.toLocaleString()}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 font-medium">Total Orders</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-green-100 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4 sm:p-5 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1">
                      {stats.activeOrders}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 font-medium">Active Orders</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-purple-100 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4 sm:p-5 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1">
                      ₱{(stats.revenue / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 font-medium">Revenue</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/70 backdrop-blur-sm border border-orange-100 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4 sm:p-5 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1">
                      {stats.efficiency}%
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 font-medium">Efficiency</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

        {/* Orders Tab - Mobile Optimized */}
        <TabsContent value="orders" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Order Management</h2>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 w-full sm:w-auto touch-manipulation">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="bg-white/70 backdrop-blur-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 sm:p-5">
                  {/* Mobile-First Order Layout */}
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{order.po_number}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{order.client}</p>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap`}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Amount and Due Date Row */}
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-slate-900">{formatCurrency(order.amount)}</p>
                        <p className="text-xs text-slate-500">Due: {new Date(order.due_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-700">{order.progress}%</p>
                        <p className="text-xs text-slate-500">Complete</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-1">
                      <Button size="sm" variant="ghost" className="px-3 py-1.5 text-xs sm:text-sm touch-manipulation hover:bg-slate-100">
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="ghost" className="px-3 py-1.5 text-xs sm:text-sm touch-manipulation hover:bg-slate-100">
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Production Tab - Mobile Optimized */}
        <TabsContent value="production" className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Production Control</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              { stage: 'Cutting', active: 2, completed: 15, efficiency: '92%', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
              { stage: 'Printing', active: 3, completed: 12, efficiency: '88%', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
              { stage: 'Sewing', active: 5, completed: 18, efficiency: '95%', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
              { stage: 'QC', active: 1, completed: 20, efficiency: '98%', color: 'text-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-100' },
              { stage: 'Packing', active: 2, completed: 17, efficiency: '94%', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' },
              { stage: 'Delivery', active: 1, completed: 16, efficiency: '89%', color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-100' }
            ].map((stage, index) => (
              <Card key={index} className={`bg-white/70 backdrop-blur-sm ${stage.borderColor} hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${stage.bgColor} rounded-lg`}>
                        <Settings className={`w-4 h-4 sm:w-5 sm:h-5 ${stage.color}`} />
                      </div>
                      <h3 className={`${stage.color} font-bold text-sm sm:text-base`}>{stage.stage}</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-600">Active Jobs</span>
                        <span className="text-sm sm:text-base font-bold text-slate-800">{stage.active}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-600">Completed</span>
                        <span className="text-sm sm:text-base font-bold text-slate-800">{stage.completed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-600">Efficiency</span>
                        <span className={`${stage.color} font-bold text-sm sm:text-base`}>{stage.efficiency}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>


        {/* Analytics Tab - Mobile Optimized */}
        <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Advanced Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-indigo-100 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-slate-800 text-base sm:text-lg font-bold">Production Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-3 sm:p-4 bg-indigo-50 rounded-2xl mx-auto w-fit mb-4">
                      <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-600" />
                    </div>
                    <p className="text-sm sm:text-base text-slate-500">Interactive charts and analytics coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border border-emerald-100 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-slate-800 text-base sm:text-lg font-bold">Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600 text-sm sm:text-base">Overall Quality Score</span>
                    <span className="text-emerald-600 font-bold text-lg sm:text-xl">98.7%</span>
                  </div>
                  <div className="border-t border-slate-100"></div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600 text-sm sm:text-base">Defect Rate</span>
                    <span className="text-red-600 font-semibold text-sm sm:text-base">1.3%</span>
                  </div>
                  <div className="border-t border-slate-100"></div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600 text-sm sm:text-base">Rework Required</span>
                    <span className="text-amber-600 font-semibold text-sm sm:text-base">2.1%</span>
                  </div>
                  <div className="border-t border-slate-100"></div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600 text-sm sm:text-base">Customer Satisfaction</span>
                    <span className="text-emerald-600 font-semibold text-sm sm:text-base">96.4%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
          </div>

          {/* Mobile-Optimized Ashley AI Chat */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border border-blue-100 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4 sm:p-5">
                {/* Chat Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">Ashley AI</h3>
                      <p className="text-xs sm:text-sm text-slate-600">Manufacturing Assistant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-700 font-medium">Online</span>
                  </div>
                </div>
                
                {/* Chat Messages */}
                <div className="h-48 sm:h-64 lg:h-72 overflow-y-auto mb-4 space-y-3 scroll-smooth">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-lg text-sm transition-all duration-200 ${
                        msg.type === 'user' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                          : 'bg-slate-50 text-slate-800 border border-slate-200 shadow-sm'
                      }`}>
                        <p className="leading-relaxed text-xs sm:text-sm">{msg.message}</p>
                        <p className="text-xs opacity-60 mt-2">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Chat Input */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask Ashley anything..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 h-10 text-sm border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 text-slate-800 bg-white/50"
                  />
                  <button 
                    onClick={sendMessage} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg transition-all duration-200 touch-manipulation"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 text-center mt-3 italic">AI-powered manufacturing insights</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}