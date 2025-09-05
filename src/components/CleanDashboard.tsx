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
        createdAt: '2024-09-01T08:00:00Z',
        total: 15750
      },
      {
        id: 'SORB-2024-000098', 
        clientName: 'XYZ Company',
        apparelType: 'Hoodie',
        quantity: 25,
        status: 'PENDING',
        createdAt: '2024-08-31T16:30:00Z',
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
        createdAt: '2024-08-30T14:00:00Z',
        total: 22500
      },
      {
        id: 'SORB-2024-000099',
        clientName: 'GHI Company',
        apparelType: 'Jersey',
        quantity: 30,
        status: 'PENDING',
        createdAt: '2024-08-29T10:30:00Z',
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
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'System Admin'}!
        </h1>
        <p className="text-blue-100">Here's what's happening with your business today</p>
      </div>

      {/* Dashboard Toggle Buttons */}
      <div className="flex space-x-4 mb-6">
        <Button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
          📊 My Queue
        </Button>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          📈 Business Overview
        </Button>
        <Button 
          onClick={() => setShowAIDashboard(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
        >
          <Brain className="mr-2 h-4 w-4" />
          🧠 Ashley AI
        </Button>
      </div>

      {/* Ashley AI Dashboard Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ashley AI Dashboard</h2>
              <p className="text-sm text-gray-600">AI-powered business intelligence and insights</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              Last 7 Days
            </Button>
            <Button size="sm" className="bg-blue-600 text-white">
              📊 Viewing Period
            </Button>
            <Button size="sm" variant="outline">
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Modern Stats Cards Grid - Like Second Screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Orders - Blue */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
            <CardContent className="p-6 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Package className="w-8 h-8 text-white opacity-30" />
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-4xl font-bold mt-2">{stats.orders.total}</p>
                <p className="text-blue-100 text-xs mt-1">{stats.orders.pending} pending</p>
              </div>
            </CardContent>
          </Card>

          {/* Revenue - Green */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white">
            <CardContent className="p-6 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <DollarSign className="w-8 h-8 text-white opacity-30" />
              </div>
              <div>
                <p className="text-green-100 text-sm font-medium">Monthly Revenue</p>
                <p className="text-4xl font-bold mt-2">₱{(stats.revenue.thisMonth / 1000).toFixed(0)}K</p>
                <p className="text-green-100 text-xs mt-1">+8.2% growth</p>
              </div>
            </CardContent>
          </Card>

          {/* Performance - Purple */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <BarChart3 className="w-8 h-8 text-white opacity-30" />
              </div>
              <div>
                <p className="text-purple-100 text-sm font-medium">Completion Rate</p>
                <p className="text-4xl font-bold mt-2">94%</p>
                <p className="text-purple-100 text-xs mt-1">Quality Score</p>
              </div>
            </CardContent>
          </Card>

          {/* Alerts - Orange */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white">
            <CardContent className="p-6 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <AlertCircle className="w-8 h-8 text-white opacity-30" />
              </div>
              <div>
                <p className="text-orange-100 text-sm font-medium">Alerts</p>
                <p className="text-4xl font-bold mt-2">{stats.inventory.lowStock}</p>
                <p className="text-orange-100 text-xs mt-1">Low stock items</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* User Management */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-purple-800 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                User Management
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowUserManagement(!showUserManagement)}
                className="bg-purple-600 text-white hover:bg-purple-700">
                <Eye className="w-4 h-4 mr-2" />
                {showUserManagement ? 'Hide Details' : 'View All Users'}
              </Button>
            </div>
            <p className="text-sm text-purple-600">Manage staff accounts, roles, and performance metrics</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.slice(0, showUserManagement ? users.length : 2).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">{user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">{user.status}</Badge>
                    {showUserManagement && (
                      <>
                        <Button size="sm" variant="ghost">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {showUserManagement && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-purple-800">User Management Actions</h4>
                    <Button size="sm" className="bg-purple-600 text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add New User
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">Active Users</p>
                      <p className="text-xl font-bold text-green-600">{stats.users.active}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">Total Registered</p>
                      <p className="text-xl font-bold text-blue-600">{stats.users.total}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">Roles Assigned</p>
                      <p className="text-xl font-bold text-purple-600">8</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-blue-800 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Recent Orders
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowOrderManagement(!showOrderManagement)}
                className="bg-blue-600 text-white hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-2" />
                {showOrderManagement ? 'Hide Details' : 'View All Orders'}
              </Button>
            </div>
            <p className="text-sm text-blue-600">Track and manage order workflow</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(showOrderManagement ? allOrders : recentOrders).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-500">{order.clientName} • {order.quantity} {order.apparelType}s</p>
                      {showOrderManagement && <p className="text-xs text-gray-400">Total: ₱{order.total.toLocaleString()}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={
                      order.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {order.status}
                    </Badge>
                    {showOrderManagement && (
                      <>
                        <Button size="sm" variant="ghost">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {showOrderManagement && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-800">Order Management Actions</h4>
                    <Button size="sm" className="bg-blue-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      New Order
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">Pending</p>
                      <p className="text-xl font-bold text-yellow-600">{stats.orders.pending}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">In Progress</p>
                      <p className="text-xl font-bold text-blue-600">45</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">Completed</p>
                      <p className="text-xl font-bold text-green-600">{stats.orders.completed}</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700">Revenue</p>
                      <p className="text-xl font-bold text-purple-600">₱{stats.revenue.thisMonth.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Inventory Overview */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-green-800 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Inventory
            </CardTitle>
            <p className="text-sm text-green-600">Stock levels and alerts</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Items</span>
                <span className="font-bold text-green-800">{stats.inventory.items}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Low Stock</span>
                <Badge className="bg-orange-100 text-orange-800">{stats.inventory.lowStock}</Badge>
              </div>
              <Button 
                className="w-full bg-green-600 text-white hover:bg-green-700 mt-4"
                onClick={() => setShowInventoryManagement(!showInventoryManagement)}>
                {showInventoryManagement ? 'Hide Inventory' : 'View Full Inventory'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-orange-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Avg Performance
            </CardTitle>
            <p className="text-sm text-orange-600">Team productivity metrics</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-bold text-orange-800">88%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">On Time</span>
                <Badge className="bg-green-100 text-green-800">92%</Badge>
              </div>
              <Button className="w-full bg-orange-600 text-white hover:bg-orange-700 mt-4">
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Status */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-indigo-800 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Tasks Status
            </CardTitle>
            <p className="text-sm text-indigo-600">Production tasks overview</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.tasks.pending}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed Today</span>
                <span className="font-bold text-indigo-800">138</span>
              </div>
              <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700 mt-4"
                onClick={() => setShowTasksExpanded(true)}>
                View All Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expandable Inventory Management */}
      {showInventoryManagement && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-green-800">
                <Package className="w-6 h-6 mr-2 inline" />
                Inventory Management
              </CardTitle>
              <Button 
                variant="ghost" 
                onClick={() => setShowInventoryManagement(false)}
                className="text-green-600 hover:text-green-800"
              >
                Minimize
              </Button>
            </div>
            <p className="text-green-600 mt-2">Complete inventory tracking and stock management</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {inventory.map((item) => (
                <div key={item.id} className="p-4 bg-white rounded-lg border border-green-200 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category} • {item.supplier}</p>
                      <p className="text-xs text-gray-400">Last restocked: {item.lastRestocked}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Stock Level</p>
                      <p className={`text-lg font-bold ${item.quantity <= item.lowStockThreshold ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.quantity <= item.lowStockThreshold && (
                        <Badge className="bg-red-100 text-red-800">Low Stock</Badge>
                      )}
                      <Button size="sm" variant="ghost">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-green-800">Inventory Summary</h4>
                <Button size="sm" className="bg-green-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm font-medium text-gray-700">Total Items</p>
                  <p className="text-xl font-bold text-green-600">{stats.inventory.items}</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm font-medium text-gray-700">Low Stock Items</p>
                  <p className="text-xl font-bold text-red-600">{stats.inventory.lowStock}</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm font-medium text-gray-700">Categories</p>
                  <p className="text-xl font-bold text-blue-600">3</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm font-medium text-gray-700">Suppliers</p>
                  <p className="text-xl font-bold text-purple-600">5</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expandable Tasks Section */}
      {showTasksExpanded && (
        <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-800">Production Tasks & Activities</CardTitle>
              <Button 
                variant="ghost" 
                onClick={() => setShowTasksExpanded(false)}
                className="text-slate-600 hover:text-slate-800"
              >
                Minimize
              </Button>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <Button
                onClick={() => setTaskFilter('all')}
                className={taskFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}
                size="sm"
              >
                All Tasks
              </Button>
              <Button
                onClick={() => setTaskFilter('pending')}
                className={taskFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-200 text-yellow-700'}
                size="sm"
              >
                Pending
              </Button>
              <Button
                onClick={() => setTaskFilter('in-progress')}
                className={taskFilter === 'in-progress' ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-700'}
                size="sm"
              >
                In Progress
              </Button>
              <Button
                onClick={() => setTaskFilter('completed')}
                className={taskFilter === 'completed' ? 'bg-green-600 text-white' : 'bg-green-200 text-green-700'}
                size="sm"
              >
                Completed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStates.tasks ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading tasks...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tasks
                  .filter(task => taskFilter === 'all' || task.status.toLowerCase().replace('_', '-') === taskFilter)
                  .map((task) => (
                    <div key={task.id} className="p-4 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          task.status === 'PENDING' ? 'bg-yellow-100' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {task.status === 'PENDING' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                           task.status === 'IN_PROGRESS' ? <Activity className="w-5 h-5 text-blue-600" /> :
                           <CheckCircle className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{task.description}</p>
                          <p className="text-sm text-gray-500">{task.order.orderNumber} • {task.assignee.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {task.priority}
                        </Badge>
                        <Badge className={
                          task.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* AI Analytics Dashboard */}
      <AIAnalyticsDashboard 
        isOpen={showAIDashboard}
        onClose={() => setShowAIDashboard(false)}
      />
    </div>
  )
}
