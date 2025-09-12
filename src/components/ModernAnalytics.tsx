// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Eye,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  Maximize2
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
  Legend,
  RadialBarChart,
  RadialBar,
  ComposedChart
} from 'recharts'

// Enhanced sample data
const productionMetrics = {
  efficiency: 89,
  capacity: 76,
  quality: 94,
  onTimeDelivery: 87
}

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  tasks: Math.floor(Math.random() * 20) + 10,
  efficiency: Math.floor(Math.random() * 30) + 70,
  quality: Math.floor(Math.random() * 20) + 80
}))

const departmentMetrics = [
  { name: 'Design', efficiency: 92, capacity: 76, quality: 95, tasks: 45 },
  { name: 'Silkscreen', efficiency: 88, capacity: 84, quality: 91, tasks: 67 },
  { name: 'DTF', efficiency: 91, capacity: 78, quality: 93, tasks: 52 },
  { name: 'Embroidery', efficiency: 85, capacity: 65, quality: 97, tasks: 34 },
  { name: 'QC', efficiency: 95, capacity: 62, quality: 99, tasks: 89 },
  { name: 'Finishing', efficiency: 87, capacity: 79, quality: 88, tasks: 43 }
]

const alertsData = [
  { severity: 'Critical', count: 3, color: '#EF4444' },
  { severity: 'High', count: 8, color: '#F59E0B' },
  { severity: 'Medium', count: 15, color: '#8B5CF6' },
  { severity: 'Low', count: 24, color: '#10B981' }
]

const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280']

export function ModernAnalytics() {
  const [activeView, setActiveView] = useState('overview')
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(false)
  const [expandedChart, setExpandedChart] = useState<string | null>(null)

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon: Icon, 
    color = 'blue',
    description 
  }: {
    title: string
    value: number
    change: number
    changeType: 'increase' | 'decrease'
    icon: React.ComponentType<{ className?: string }>
    color?: string
    description: string
  }) => (
    <div className="modern-card p-6 hover-lift group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r group-hover:scale-110 transition-transform ${
          color === 'blue' ? 'from-blue-500/20 to-blue-600/20' :
          color === 'green' ? 'from-emerald-500/20 to-emerald-600/20' :
          color === 'purple' ? 'from-purple-500/20 to-purple-600/20' :
          color === 'orange' ? 'from-orange-500/20 to-orange-600/20' :
          'from-red-500/20 to-red-600/20'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'blue' ? 'text-blue-400' :
            color === 'green' ? 'text-emerald-400' :
            color === 'purple' ? 'text-purple-400' :
            color === 'orange' ? 'text-orange-400' :
            'text-red-400'
          }`} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          changeType === 'increase' ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {changeType === 'increase' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-white mb-1">{value}%</h3>
        <p className="text-lg font-medium text-gray-300 mb-2">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  )

  const ChartContainer = ({ 
    title, 
    children, 
    actions,
    chartId 
  }: { 
    title: string
    children: React.ReactNode
    actions?: React.ReactNode
    chartId: string
  }) => (
    <div className={`modern-card p-6 hover-glow transition-all duration-300 ${
      expandedChart === chartId ? 'col-span-2' : ''
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={() => setExpandedChart(expandedChart === chartId ? null : chartId)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={`transition-all duration-300 ${
        expandedChart === chartId ? 'h-96' : 'h-80'
      }`}>
        {children}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Production Analytics</h1>
          <p className="text-gray-400">Real-time insights into your apparel manufacturing operations</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="modern-input"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button className="glass-button">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button className="glass-button">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button 
            onClick={() => setLoading(true)}
            className="glass-button primary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Overall Efficiency"
          value={productionMetrics.efficiency}
          change={5.2}
          changeType="increase"
          icon={Zap}
          color="blue"
          description="Production efficiency score"
        />
        <MetricCard
          title="Capacity Utilization"
          value={productionMetrics.capacity}
          change={-2.1}
          changeType="decrease"
          icon={Activity}
          color="purple"
          description="Team capacity utilization"
        />
        <MetricCard
          title="Quality Score"
          value={productionMetrics.quality}
          change={1.8}
          changeType="increase"
          icon={Target}
          color="green"
          description="Quality control pass rate"
        />
        <MetricCard
          title="On-Time Delivery"
          value={productionMetrics.onTimeDelivery}
          change={-0.5}
          changeType="decrease"
          icon={Clock}
          color="orange"
          description="Orders delivered on time"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 modern-card p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'production', label: 'Production', icon: Activity },
          { id: 'quality', label: 'Quality', icon: Target },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeView === tab.id
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Hourly Performance" chartId="hourly">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hour" stroke="#9CA3AF" />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Area yAxisId="left" type="monotone" dataKey="tasks" fill="#3B82F6" fillOpacity={0.2} stroke="#3B82F6" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Department Performance" chartId="departments">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="efficiency" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quality" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Alert Distribution" chartId="alerts">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {alertsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Capacity Overview" chartId="capacity">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={departmentMetrics.slice(0, 4)}>
                <RadialBar dataKey="capacity" cornerRadius={10} fill="#8B5CF6" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}

      {activeView === 'production' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartContainer title="Production Timeline" chartId="timeline">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      color: '#fff'
                    }} 
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#3B82F6" strokeWidth={3} fill="url(#productionGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="space-y-6">
            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Active Tasks</h3>
              <div className="space-y-4">
                {['Design Review', 'DTF Printing', 'Quality Check', 'Packaging'].map((task, index) => (
                  <div key={task} className="flex items-center justify-between">
                    <span className="text-gray-300">{task}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          style={{ width: `${Math.random() * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{Math.floor(Math.random() * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modern-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Team Status</h3>
              <div className="space-y-3">
                {['Available', 'Busy', 'Break', 'Offline'].map((status, index) => {
                  const counts = [12, 8, 3, 2]
                  const colors = ['text-green-400', 'text-blue-400', 'text-yellow-400', 'text-gray-400']
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <span className={`${colors[index]} font-medium`}>{status}</span>
                      <span className="text-white font-bold">{counts[index]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add more tab content as needed */}
    </div>
  )
}