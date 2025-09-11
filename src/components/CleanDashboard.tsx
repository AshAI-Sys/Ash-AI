'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle,
  Search,
  Bell,
  Settings,
  BarChart3,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Loader2,
  ShoppingCart,
  UserPlus,
  Eye,
  Edit3,
  Trash2,
  Filter,
  Plus,
  ChevronRight,
  Brain,
  Sparkles,
  Printer,
  Zap
} from 'lucide-react'
import { AIAnalyticsDashboard } from '@/components/ai/AIAnalyticsDashboard'

interface DashboardStats {
  orders: { total: number, pending: number, completed: number }
  inventory: { items: number, lowStock: number }
  revenue: { total: number, thisMonth: number }
  tasks: { total: number, pending: number }
  users: { total: number, active: number, registered: number }
}

export function CleanDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    orders: { total: 156, pending: 23, completed: 133 },
    inventory: { items: 245, lowStock: 8 },
    revenue: { total: 125000, thisMonth: 45000 },
    tasks: { total: 47, pending: 12 },
    users: { total: 5, active: 5, registered: 5 }
  })
  const [users, setUsers] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'orders' | 'inventory' | 'tasks' | 'reports'>('overview')
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showOrderManagement, setShowOrderManagement] = useState(false)
  const [showInventoryManagement, setShowInventoryManagement] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showTasksExpanded, setShowTasksExpanded] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')
  const [showAIDashboard, setShowAIDashboard] = useState(false)
  const [loadingStates, setLoadingStates] = useState({
    stats: false,
    notifications: false,
    activities: false,
    tasks: false
  })

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Fetch all data on component mount
  useEffect(() => {
    if (!isLoading) {
      fetchUsers()
      fetchRecentOrders()
      fetchInventory()
      fetchTasks()
    }
  }, [isLoading])
  
  // Fetch tasks when expanded
  useEffect(() => {
    if (showTasksExpanded && tasks.length === 0) {
      fetchTasks()
    }
  }, [showTasksExpanded, tasks.length])
  
  const fetchUsers = async () => {
    // Mock users data
    const mockUsers = [
      {
        id: '1',
        name: 'System Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        status: 'active',
        avatar: '',
        lastLogin: '2024-09-01T10:30:00Z'
      },
      {
        id: '2',
        name: 'John Smith',
        email: 'john@example.com',
        role: 'MANAGER', 
        status: 'active',
        avatar: '',
        lastLogin: '2024-09-01T09:15:00Z'
      },
      {
        id: '3',
        name: 'Maria Garcia',
        email: 'maria@example.com',
        role: 'GRAPHIC_ARTIST',
        status: 'active', 
        avatar: '',
        lastLogin: '2024-09-01T08:45:00Z'
      }
    ]
    setUsers(mockUsers)
  }
  
  const fetchRecentOrders = async () => {
    // Mock recent orders data
    const mockOrders = [
      {
        id: 'REEF-2024-000123',
        clientName: 'ABC Corporation',
        apparelType: 'T-Shirt',
        quantity: 50,
        status: 'IN_PROGRESS',
        created_at: '2024-09-01T08:00:00Z',
        total: 15750
      },
      {
        id: 'SORB-2024-000098', 
        clientName: 'XYZ Company',
        apparelType: 'Hoodie',
        quantity: 25,
        status: 'PENDING',
        created_at: '2024-08-31T16:30:00Z',
        total: 12500
      }
    ]
    setRecentOrders(mockOrders)
    setAllOrders([...mockOrders, ...generateMoreOrders()])
  }

  const generateMoreOrders = () => {
    return [
      {
        id: 'REEF-2024-000124',
        clientName: 'DEF Industries',
        apparelType: 'Polo Shirt',
        quantity: 75,
        status: 'COMPLETED',
        created_at: '2024-08-30T14:00:00Z',
        total: 22500
      },
      {
        id: 'SORB-2024-000099',
        clientName: 'GHI Company',
        apparelType: 'Jersey',
        quantity: 30,
        status: 'PENDING',
        created_at: '2024-08-29T10:30:00Z',
        total: 18000
      }
    ]
  }

  const fetchInventory = async () => {
    // Mock inventory data
    const mockInventory = [
      {
        id: 1,
        name: 'Cotton T-Shirt Blanks',
        category: 'Apparel',
        quantity: 150,
        lowStockThreshold: 20,
        supplier: 'Textile Co.',
        lastRestocked: '2024-08-25'
      },
      {
        id: 2,
        name: 'Plastisol Ink - Black',
        category: 'Printing Supplies',
        quantity: 8,
        lowStockThreshold: 10,
        supplier: 'Ink Supply Ltd.',
        lastRestocked: '2024-08-20'
      },
      {
        id: 3,
        name: 'Hoodie Blanks',
        category: 'Apparel',
        quantity: 45,
        lowStockThreshold: 15,
        supplier: 'Premium Blanks',
        lastRestocked: '2024-08-28'
      }
    ]
    setInventory(mockInventory)
  }

  const fetchTasks = async () => {
    setLoadingStates(prev => ({ ...prev, tasks: true }))
    
    // Simulate API call - replace with actual API
    setTimeout(() => {
      const mockTasks = [
        {
          id: '1',
          taskType: 'CUTTING',
          description: 'Cut fabric for Order #REEF-2024-000123',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: '2024-09-05',
          order: {
            orderNumber: 'REEF-2024-000123',
            clientName: 'ABC Corporation',
            apparelType: 'T-Shirt',
            quantity: 50
          },
          assignee: {
            name: 'John Doe',
            role: 'SILKSCREEN_OPERATOR'
          }
        },
        {
          id: '2', 
          taskType: 'PRINTING',
          description: 'Silkscreen printing for Order #SORB-2024-000098',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: '2024-09-06',
          order: {
            orderNumber: 'SORB-2024-000098',
            clientName: 'XYZ Company',
            apparelType: 'Hoodie',
            quantity: 25
          },
          assignee: {
            name: 'Jane Smith',
            role: 'SILKSCREEN_OPERATOR'
          }
        },
        {
          id: '3',
          taskType: 'QC',
          description: 'Quality check for completed batch',
          status: 'COMPLETED',
          priority: 'LOW',
          dueDate: '2024-09-03',
          completedAt: '2024-09-03T10:30:00Z',
          order: {
            orderNumber: 'REEF-2024-000120',
            clientName: 'Local Business',
            apparelType: 'Polo',
            quantity: 30
          },
          assignee: {
            name: 'Mike Johnson',
            role: 'QC_INSPECTOR'
          }
        }
      ]
      setTasks(mockTasks)
      setLoadingStates(prev => ({ ...prev, tasks: false }))
    }, 1000)
  }

  const quickActions = [
    { label: 'New Order', icon: Package, color: 'bg-blue-500', onClick: () => window.location.href = '/orders' },
    { label: 'Add Inventory', icon: Package, color: 'bg-green-500', onClick: () => window.location.href = '/inventory' },
    { label: 'View Reports', icon: BarChart3, color: 'bg-purple-500', onClick: () => window.location.href = '/reports' },
    { label: 'Manage Users', icon: Users, color: 'bg-orange-500', onClick: () => window.location.href = '/users' }
  ]

  const recentActivities = [
    { 
      id: 1, 
      type: 'order', 
      title: 'New order #1045 created',
      subtitle: 'Corporate polo shirts - 25 pieces',
      time: '2 minutes ago',
      status: 'new'
    },
    {
      id: 2,
      type: 'inventory',
      title: 'Low stock alert',
      subtitle: 'White cotton t-shirts (5 remaining)',
      time: '15 minutes ago', 
      status: 'warning'
    },
    {
      id: 3,
      type: 'task',
      title: 'Design approved',
      subtitle: 'Order #1042 ready for production',
      time: '1 hour ago',
      status: 'completed'
    },
    {
      id: 4,
      type: 'payment',
      title: 'Payment received',
      subtitle: '₱15,750 from ABC Company',
      time: '2 hours ago',
      status: 'completed'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4" />
      case 'inventory': return <AlertCircle className="w-4 h-4" />
      case 'task': return <CheckCircle className="w-4 h-4" />
      case 'payment': return <DollarSign className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'warning': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default: return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TikTok-Style Three-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 tiktok-three-column">
        
        {/* LEFT SECTION: Business Data Cards (300px) */}
        <div className="w-full lg:w-80 space-y-4 tiktok-left-section">
          {/* GMV Card */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">GMV</p>
                  <p className="text-3xl font-bold text-gray-900">₱{stats.revenue.thisMonth.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">+8.2%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gross Revenue Card */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Gross revenue</p>
                  <p className="text-3xl font-bold text-gray-900">₱{stats.revenue.total.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">+12.5%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Sold Card */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Items sold</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.orders.total}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500">+5.3%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER SECTION: Main Chart Area (flex-grow) */}
        <div className="flex-1 lg:mr-4">
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200 h-96">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Production Pipeline Status</CardTitle>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="text-sm">
                    Last 7 Days
                  </Button>
                  <Button size="sm" className="bg-blue-600 text-white text-sm">
                    View analysis
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {/* Chart Placeholder - Main Visual Focal Point */}
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Production Analytics Chart</p>
                  <p className="text-sm text-gray-500">Real-time manufacturing pipeline visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SECTION: Today's Data & Info (300px) */}
        <div className="w-full lg:w-80 space-y-4 tiktok-right-section">
          {/* Today's Data Panel */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Items sold</span>
                <span className="text-sm font-semibold text-gray-900">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Visitors</span>
                <span className="text-sm font-semibold text-gray-900">1,247</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Orders</span>
                <span className="text-sm font-semibold text-gray-900">{stats.orders.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Efficiency Rate</span>
                <span className="text-sm font-semibold text-green-600">94%</span>
              </div>
            </CardContent>
          </Card>

          {/* Business Accelerator Panel */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900">Business accelerator</CardTitle>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-600">PRODUCTION OPTIMIZATION</span>
                  <span className="text-xs text-blue-600">New</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">Optimize cutting workflow</p>
                <Button size="sm" className="bg-blue-600 text-white text-xs px-3 py-1 h-6">
                  View details
                </Button>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-600">QUALITY INSIGHTS</span>
                  <span className="text-xs text-green-600">Trending</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">QC metrics improved 12%</p>
                <Button size="sm" className="bg-green-600 text-white text-xs px-3 py-1 h-6">
                  Learn more
                </Button>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-600">AI ASSISTANT</span>
                  <span className="text-xs text-purple-600">Available</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">Ashley AI suggestions</p>
                <Button 
                  size="sm" 
                  onClick={() => setShowAIDashboard(true)}
                  className="bg-purple-600 text-white text-xs px-3 py-1 h-6"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Open Ashley
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BOTTOM SECTIONS: Sales Sources Style Layout */}
      <div className="p-4 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Production Status (LIVE equivalent) */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900">Production Status</CardTitle>
                <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-6">
                  View analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-900">Cutting Stage</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">In Progress</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Printing Queue</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800 text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">QC Completed</span>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">94% Pass Rate</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quality Reports (Videos equivalent) */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900">Quality Reports</CardTitle>
                <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-6">
                  View analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Daily QC Score</p>
                  <p className="text-xs text-gray-600">Batch #QC-001</p>
                </div>
                <span className="text-lg font-bold text-green-600">94%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Pending Reviews</p>
                  <p className="text-xs text-gray-600">Requires attention</p>
                </div>
                <span className="text-lg font-bold text-yellow-600">3</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Passed Items</p>
                  <p className="text-xs text-gray-600">Today's production</p>
                </div>
                <span className="text-lg font-bold text-blue-600">{stats.orders.completed}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders (Product Cards equivalent) */}
          <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-900">Recent Orders</CardTitle>
                <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-6">
                  View analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.id}</p>
                    <p className="text-xs text-gray-600">{order.clientName} • {order.quantity} pcs</p>
                  </div>
                  <Badge className={
                    order.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  } size="sm">
                    {order.status === 'IN_PROGRESS' ? 'Active' : 
                     order.status === 'COMPLETED' ? 'Done' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Analytics Dashboard */}
      <AIAnalyticsDashboard 
        isOpen={showAIDashboard}
        onClose={() => setShowAIDashboard(false)}
      />
    </div>
  )
}
