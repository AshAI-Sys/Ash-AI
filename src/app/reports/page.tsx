// @ts-nocheck
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { BarChart3, Download, Filter, TrendingUp, Package, DollarSign, Clock, Shield, Activity, PieChart as PieChartIcon, CheckCircle } from 'lucide-react'
import { Role } from '@prisma/client'

const productionData = [
  { month: 'Jan', orders: 45, completed: 42, revenue: 125000 },
  { month: 'Feb', orders: 38, completed: 35, revenue: 108000 },
  { month: 'Mar', orders: 52, completed: 50, revenue: 156000 },
  { month: 'Apr', orders: 41, completed: 39, revenue: 132000 },
  { month: 'May', orders: 48, completed: 45, revenue: 142000 },
  { month: 'Jun', orders: 55, completed: 52, revenue: 168000 }
]

const brandData = [
  { name: 'Reefer', value: 65, color: '#8884d8' },
  { name: 'Sorbetes', value: 35, color: '#82ca9d' }
]

const departmentPerformance = [
  { dept: 'Design', completed: 95, pending: 5, rejected: 2 },
  { dept: 'Printing', completed: 88, pending: 8, rejected: 4 },
  { dept: 'Sewing', completed: 92, pending: 6, rejected: 2 },
  { dept: 'QC', completed: 85, pending: 10, rejected: 5 },
  { dept: 'Finishing', completed: 98, pending: 2, rejected: 0 }
]

const inventoryTurnover = [
  { item: 'Cotton T-Shirts', turnover: 8.5, stock: 'Optimal' },
  { item: 'Printing Inks', turnover: 12.2, stock: 'High' },
  { item: 'Thread', turnover: 6.8, stock: 'Low' },
  { item: 'DTF Film', turnover: 9.1, stock: 'Optimal' }
]

export default function ReportsPage() {
  const { data: session } = useSession()
  const [reportType, setReportType] = useState<'production' | 'financial' | 'inventory' | 'performance'>('production')
  const [dateRange, setDateRange] = useState('last-6-months')

  const canViewReports = session?.user.role === Role.ADMIN || 
                        session?.user.role === Role.MANAGER ||
                        session?.user.role === Role.ACCOUNTANT

  if (!canViewReports) {
    return (
      <ResponsiveLayout>
        <div className="min-h-screen gradient-mesh relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 gradient-purple rounded-full opacity-20 float morph-shape"></div>
            <div className="absolute top-40 right-16 w-24 h-24 gradient-pink rounded-full opacity-30 float" style={{animationDelay: '2s'}}></div>
          </div>
          <div className="relative z-10 p-6">
            <div className="glass-card p-12 rounded-3xl text-center max-w-lg mx-auto mt-20">
              <div className="gradient-red w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Access Denied</h3>
              <p className="text-white/70 text-lg">
                You don't have permission to view reports and analytics.
              </p>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="min-h-screen gradient-mesh relative overflow-hidden">
        {/* Floating background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 gradient-purple rounded-full opacity-20 float morph-shape"></div>
          <div className="absolute top-40 right-16 w-24 h-24 gradient-green rounded-full opacity-30 float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 gradient-blue rounded-full opacity-15 float morph-shape" style={{animationDelay: '4s'}}></div>
          <div className="absolute bottom-16 right-16 w-28 h-28 gradient-pink rounded-full opacity-25 float" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-16 w-20 h-20 gradient-orange rounded-full opacity-30 float" style={{animationDelay: '3s'}}></div>
        </div>

        <div className="relative z-10 p-6">
          {/* Header Section */}
          <div className="glass-card p-8 rounded-3xl mb-8 slide-in-up">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">Reports & Analytics</h1>
                <p className="text-white/80 text-lg">
                  Business insights and performance analytics
                </p>
              </div>
              <div className="flex gap-3">
                <div className="hidden lg:flex glass-card p-4 rounded-2xl items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-white/80" />
                  <div>
                    <div className="text-2xl font-bold text-white">4</div>
                    <div className="text-white/60 text-sm">Report Types</div>
                  </div>
                </div>
                <Button className="glass-card border border-white/20 text-white hover:bg-white/10 px-6 py-3 rounded-2xl font-semibold hover-scale">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </Button>
                <Button className="gradient-blue text-white px-6 py-3 rounded-2xl font-semibold hover-scale">
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Beautiful Report Type Selection */}
          <div className="glass-card p-6 rounded-3xl mb-8 slide-in-left">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-5 h-5 text-white/80 mr-2" />
              <h3 className="text-white/90 font-semibold">Report Categories</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'production', label: 'Production', icon: Package, gradient: 'gradient-blue' },
                { key: 'financial', label: 'Financial', icon: DollarSign, gradient: 'gradient-green' },
                { key: 'inventory', label: 'Inventory', icon: Package, gradient: 'gradient-purple' },
                { key: 'performance', label: 'Performance', icon: TrendingUp, gradient: 'gradient-orange' }
              ].map(({ key, label, icon: Icon, gradient }) => (
                <Button
                  key={key}
                  onClick={() => setReportType(key as 'production' | 'financial' | 'inventory' | 'performance')}
                  className={`px-6 py-3 rounded-2xl font-semibold hover-scale transition-all ${
                    reportType === key 
                      ? `${gradient} text-white shadow-lg` 
                      : 'glass-card border border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Beautiful Date Range Selector */}
          <div className="glass-card p-6 rounded-3xl mb-8 slide-in-right">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-white/80 mr-2" />
                <span className="text-white/90 font-semibold">Date Range:</span>
              </div>
              <Select
                value={dateRange}
                onValueChange={setDateRange}
                options={[
                  { value: 'last-7-days', label: 'Last 7 Days' },
                  { value: 'last-30-days', label: 'Last 30 Days' },
                  { value: 'last-3-months', label: 'Last 3 Months' },
                  { value: 'last-6-months', label: 'Last 6 Months' },
                  { value: 'last-year', label: 'Last Year' },
                  { value: 'custom', label: 'Custom Range' }
                ]}
              />
            </div>
          </div>

        {/* Beautiful Production Reports */}
        {reportType === 'production' && (
          <div className="space-y-8 slide-in-up">
            {/* Beautiful Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Orders', value: '279', change: '+12% from last month', icon: Package, gradient: 'gradient-blue', positive: true },
                { title: 'Completed Orders', value: '263', change: '94% completion rate', icon: CheckCircle, gradient: 'gradient-green', positive: true },
                { title: 'Avg Production Time', value: '5.2 days', change: '+0.3 days from target', icon: Clock, gradient: 'gradient-orange', positive: false },
                { title: 'Quality Pass Rate', value: '92%', change: '-2% from last month', icon: TrendingUp, gradient: 'gradient-purple', positive: false }
              ].map((metric, index) => (
                <div
                  key={metric.title}
                  className="glass-card p-6 rounded-3xl hover-scale stagger-animation"
                  style={{animationDelay: `${index * 100}ms`}}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${metric.gradient} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                      <metric.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{metric.value}</div>
                      <div className={`text-sm font-medium ${
                        metric.positive ? 'text-green-300' : 'text-red-300'
                      }`}>{metric.change}</div>
                    </div>
                  </div>
                  <div className="text-white/80 font-medium">{metric.title}</div>
                </div>
              ))}
            </div>

            {/* Beautiful Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-6 rounded-3xl hover-scale">
                <div className="flex items-center mb-6">
                  <BarChart3 className="w-6 h-6 text-white/80 mr-3" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Production Trends</h3>
                    <p className="text-white/70">Orders vs Completion over time</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: 'white', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'white', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.8)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '12px',
                          color: 'white'
                        }} 
                      />
                      <Bar dataKey="orders" fill="#667eea" name="Orders" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#43e97b" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 rounded-3xl hover-scale">
                <div className="flex items-center mb-6">
                  <PieChartIcon className="w-6 h-6 text-white/80 mr-3" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Brand Distribution</h3>
                    <p className="text-white/70">Orders by brand</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={brandData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {brandData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.8)', 
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '12px',
                          color: 'white'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Beautiful Department Performance */}
            <div className="glass-card p-6 rounded-3xl hover-scale">
              <div className="flex items-center mb-6">
                <Activity className="w-6 h-6 text-white/80 mr-3" />
                <div>
                  <h3 className="text-xl font-bold text-white">Department Performance</h3>
                  <p className="text-white/70">Task completion rates by department</p>
                </div>
              </div>
              <div className="space-y-6">
                {departmentPerformance.map((dept, index) => (
                  <div key={dept.dept} className="glass-card p-4 rounded-2xl stagger-animation" style={{animationDelay: `${index * 100}ms`}}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-white">{dept.dept}</span>
                      <span className="text-white/70 font-medium">
                        {dept.completed}% completion rate
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div 
                        className="progress-bar h-3 rounded-full transition-all duration-1000" 
                        style={{ width: `${dept.completed}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-white/60 mt-2">
                      <span>Completed: {dept.completed}</span>
                      <span>Pending: {dept.pending}</span>
                      <span>Rejected: {dept.rejected}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Beautiful Financial Reports */}
        {reportType === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className="text-2xl">₱831,000</CardTitle>
                  <p className="text-sm text-green-600">+18% from last period</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Net Profit</CardDescription>
                  <CardTitle className="text-2xl">₱249,300</CardTitle>
                  <p className="text-sm text-green-600">30% margin</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Receivables</CardDescription>
                  <CardTitle className="text-2xl">₱125,500</CardTitle>
                  <p className="text-sm text-yellow-600">15% of total sales</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Outstanding Payables</CardDescription>
                  <CardTitle className="text-2xl">₱68,200</CardTitle>
                  <p className="text-sm text-red-600">Due in 15 days avg</p>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Monthly revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Reports */}
        {reportType === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Items</CardDescription>
                  <CardTitle className="text-2xl">1,247</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Value</CardDescription>
                  <CardTitle className="text-2xl">₱485,600</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Low Stock Items</CardDescription>
                  <CardTitle className="text-2xl text-yellow-600">23</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Turnover</CardDescription>
                  <CardTitle className="text-2xl">9.2x</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover Analysis</CardTitle>
                <CardDescription>Stock movement and optimization opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inventoryTurnover.map((item) => (
                    <div key={item.item} className="flex items-center justify-between p-4 border rounded">
                      <div>
                        <p className="font-medium">{item.item}</p>
                        <p className="text-sm text-gray-600">Turnover: {item.turnover}x per year</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.stock === 'High' ? 'bg-red-100 text-red-800' :
                          item.stock === 'Low' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Reports */}
        {reportType === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Users</CardDescription>
                  <CardTitle className="text-2xl">24</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Performance</CardDescription>
                  <CardTitle className="text-2xl">87%</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Tasks Completed</CardDescription>
                  <CardTitle className="text-2xl">1,456</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>On-time Delivery</CardDescription>
                  <CardTitle className="text-2xl">92%</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Staff Performance Metrics</CardTitle>
                <CardDescription>Individual and department performance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Detailed performance metrics and analytics will be displayed here.
                  This includes individual staff ratings, department efficiency, 
                  and productivity trends over time.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </ResponsiveLayout>
  )
}