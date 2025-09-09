'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  ShoppingCart,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Filter,
  Calendar,
  Eye
} from 'lucide-react'
  import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

// Sample data - replace with real API calls
const revenueData = [
  { month: 'Jan', revenue: 65000, orders: 45 },
  { month: 'Feb', revenue: 78000, orders: 52 },
  { month: 'Mar', revenue: 85000, orders: 61 },
  { month: 'Apr', revenue: 92000, orders: 68 },
  { month: 'May', revenue: 108000, orders: 75 },
  { month: 'Jun', revenue: 125000, orders: 89 }
]

const taskData = [
  { name: 'Completed', value: 156, color: '#10B981' },
  { name: 'In Progress', value: 43, color: '#F59E0B' },
  { name: 'Pending', value: 28, color: '#EF4444' },
  { name: 'Review', value: 15, color: '#8B5CF6' }
]

const departmentData = [
  { name: 'Design', efficiency: 92, workload: 76 },
  { name: 'Printing', efficiency: 88, workload: 84 },
  { name: 'QC', efficiency: 95, workload: 62 },
  { name: 'Finishing', efficiency: 85, workload: 79 },
  { name: 'Shipping', efficiency: 90, workload: 58 }
]

interface ModernDashboardProps {
  userRole: string
}

export function ModernDashboard({ userRole }: ModernDashboardProps) {
  const { data: session } = useSession()
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(false)

  // Animated counters
  const [counters, setCounters] = useState({
    totalOrders: 0,
    revenue: 0,
    activeTasks: 0,
    efficiency: 0
  })

  useEffect(() => {
    // Animate counters on mount
    const timer = setTimeout(() => {
      setCounters({
        totalOrders: 156,
        revenue: 125000,
        activeTasks: 43,
        efficiency: 89
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const StatCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon: Icon, 
    color = 'blue',
    prefix = '',
    suffix = ''
  }: {
    title: string
    value: number | string
    change: number
    changeType: 'increase' | 'decrease'
    icon: React.ComponentType<{ className?: string }>
    color?: string
    prefix?: string
    suffix?: string
  }) => (
    <div className="modern-card p-6 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${
          color === 'blue' ? 'from-blue-500/20 to-blue-600/20' :
          color === 'green' ? 'from-emerald-500/20 to-emerald-600/20' :
          color === 'purple' ? 'from-purple-500/20 to-purple-600/20' :
          color === 'orange' ? 'from-orange-500/20 to-orange-600/20' :
          'from-gray-500/20 to-gray-600/20'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'blue' ? 'text-blue-400' :
            color === 'green' ? 'text-emerald-400' :
            color === 'purple' ? 'text-purple-400' :
            color === 'orange' ? 'text-orange-400' :
            'text-gray-400'
          }`} />
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          changeType === 'increase' ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {changeType === 'increase' ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(change)}%
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </h3>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </div>
  )

  const RecentActivity = ({ activities }: { activities: { type: string; message: string; time: string; priority: string }[] }) => (
    <div className="modern-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
        <button className="glass-button text-sm">
          <Eye className="w-4 h-4 mr-2" />
          View All
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              activity.type === 'order' ? 'bg-blue-500/20 text-blue-400' :
              activity.type === 'task' ? 'bg-purple-500/20 text-purple-400' :
              activity.type === 'alert' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {activity.type === 'order' && <ShoppingCart className="w-5 h-5" />}
              {activity.type === 'task' && <CheckCircle className="w-5 h-5" />}
              {activity.type === 'alert' && <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{activity.message}</p>
              <p className="text-gray-400 text-xs">{activity.time}</p>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full ${
              activity.priority === 'high' ? 'bg-red-500/20 text-red-400' :
              activity.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {activity.priority}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {session?.user?.name}! 👋
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your apparel production today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="modern-input"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="glass-button primary">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Orders"
          value={counters.totalOrders}
          change={12.5}
          changeType="increase"
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Monthly Revenue"
          value={counters.revenue}
          change={8.3}
          changeType="increase"
          icon={DollarSign}
          color="green"
          prefix="₱"
        />
        <StatCard
          title="Active Tasks"
          value={counters.activeTasks}
          change={-5.2}
          changeType="decrease"
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Efficiency Score"
          value={counters.efficiency}
          change={3.1}
          changeType="increase"
          icon={Target}
          color="orange"
          suffix="%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Revenue Trend</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              Revenue
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Task Distribution */}
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Task Distribution</h3>
            <button className="text-blue-400 hover:text-blue-300 text-sm">View Details</button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {taskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Performance */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Department Performance</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              Efficiency
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              Workload
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={departmentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
              }} 
            />
            <Bar dataKey="efficiency" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="workload" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="modern-card p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full glass-button text-left flex items-center gap-3">
              <Plus className="w-5 h-5 text-blue-400" />
              Create New Order
            </button>
            <button className="w-full glass-button text-left flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              Schedule Task
            </button>
            <button className="w-full glass-button text-left flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Generate Report
            </button>
            <button className="w-full glass-button text-left flex items-center gap-3">
              <Package className="w-5 h-5 text-orange-400" />
              Check Inventory
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity activities={[
            { type: 'order', message: 'New order #ORD-156 received from ABC Corp', time: '2 minutes ago', priority: 'high' },
            { type: 'task', message: 'DTF printing completed for order #ORD-154', time: '15 minutes ago', priority: 'medium' },
            { type: 'alert', message: 'Low inventory alert: White Cotton T-shirts', time: '1 hour ago', priority: 'high' },
            { type: 'task', message: 'Quality check passed for order #ORD-153', time: '2 hours ago', priority: 'low' },
            { type: 'order', message: 'Order #ORD-152 marked as delivered', time: '3 hours ago', priority: 'medium' }
          ]} />
        </div>
      </div>
    </div>
  )
}