// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Activity,
  Zap,
  Bot,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Factory,
  Award
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip } from 'recharts'
import { Role } from '@prisma/client'
import { StaffDashboard } from './StaffDashboard'

// Mock data for the admin dashboard
const revenueData = [
  { name: 'Jan', revenue: 45000 },
  { name: 'Feb', revenue: 52000 },
  { name: 'Mar', revenue: 48000 },
  { name: 'Apr', revenue: 61000 },
  { name: 'May', revenue: 55000 },
  { name: 'Jun', revenue: 67000 }
]

const ordersData = [
  { name: 'Jan', orders: 156 },
  { name: 'Feb', orders: 178 },
  { name: 'Mar', orders: 165 },
  { name: 'Apr', orders: 190 },
  { name: 'May', orders: 182 },
  { name: 'Jun', orders: 201 }
]

export function ProfessionalDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const userRole = session?.user?.role as Role

  // Show staff dashboard for non-admin/manager roles
  if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
    return <StaffDashboard />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ASH AI Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800 px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
            <Zap className="h-3 w-3 mr-1" />
            Real-time Data
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 px-3 py-1">
            <Bot className="h-3 w-3 mr-1" />
            AI Active
          </Badge>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Main Metrics Cards - Same as in the screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Orders Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                All View
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">TOTAL ORDERS</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">156</p>
                <div className="flex items-center text-green-600 text-sm">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span>123 completed</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                23 In progress • 10 pending
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Items Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <Factory className="h-6 w-6 text-green-600" />
              </div>
              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                Inventory
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">INVENTORY ITEMS</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">245</p>
                <p className="text-sm text-gray-500">Active inventory items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Card */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800">
                ₱ +7.1%
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">MONTHLY REVENUE</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-gray-900">₱45,000</p>
                <p className="text-sm text-gray-500">This month's earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Monthly Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip 
                    formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Revenue']}
                    labelStyle={{ color: '#666' }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Order Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} orders`, 'Orders']}
                    labelStyle={{ color: '#666' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Staff</p>
                <p className="text-xl font-bold text-gray-900">24</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-xl font-bold text-gray-900">18</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-xl font-bold text-gray-900">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}