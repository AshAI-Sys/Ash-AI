// @ts-nocheck
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Home,
  Package,
  ShoppingCart,
  MessageSquare,
  Settings,
  Bell,
  ChevronRight,
  Play,
  Gift,
  RotateCcw,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface DashboardStats {
  revenue: number
  orders: number
  visitors: number
}

interface TaskItem {
  id: string
  title: string
  count: number
  urgent?: boolean
}

interface Mission {
  id: string
  title: string
  description: string
  progress: number
  total: number
  reward: number
  daysLeft: number
}

export function TikTokMobile() {
  const { data: session } = useSession()
  const [stats] = useState<DashboardStats>({
    revenue: 62991.64,
    orders: 200,
    visitors: 2914
  })

  const [tasks] = useState<TaskItem[]>([
    { id: '1', title: 'Orders ready to ship', count: 63, urgent: true },
    { id: '2', title: 'Pending returns', count: 1, urgent: true },
    { id: '3', title: 'Quality inspections', count: 8 },
    { id: '4', title: 'Production planning', count: 5 }
  ])

  const [missions] = useState<Mission[]>([
    {
      id: '1',
      title: 'Use GMV Max for LIVE ads to get ₱17,097 ad credit cashback!',
      description: 'Get ₱17.09K off ads',
      progress: 0,
      total: 56146,
      reward: 17097,
      daysLeft: 21
    }
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">ASH AI Manufacturing</span>
        </div>
        <Bell className="w-6 h-6 text-gray-600" />
      </div>

      {/* Daily Overview Card */}
      <div className="p-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-900">Daily overview</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
            
            <p className="text-sm text-gray-500 mb-4">Updated 09/09, 05:10 PM (GMT+08:00)</p>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue)}</p>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.orders}</p>
                <p className="text-sm text-gray-500">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.visitors)}</p>
                <p className="text-sm text-gray-500">Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
            <Package className="w-4 h-4 text-gray-600" />
          </div>
          <span className="font-semibold text-gray-900">Tasks</span>
        </div>
        
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">{task.title}</span>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={`${
                        task.urgent 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      } rounded-full px-2 py-1`}
                    >
                      {task.count}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Missions & Rewards Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
              <Gift className="w-4 h-4 text-gray-600" />
            </div>
            <span className="font-semibold text-gray-900">Missions & rewards</span>
          </div>
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {missions.map((mission) => (
            <Card key={mission.id} className="bg-white border border-gray-200 rounded-lg min-w-80 flex-shrink-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">
                  {mission.title}
                </h3>
                
                <div className="flex items-center space-x-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 text-xs font-medium">
                    AD
                  </Badge>
                  <span className="text-blue-600 font-semibold text-sm">
                    {mission.description}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 mb-3">{mission.daysLeft} days left</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {mission.progress}/{mission.total}
                    </span>
                    <Progress 
                      value={(mission.progress / mission.total) * 100} 
                      className="w-20 h-2"
                    />
                  </div>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium rounded-lg">
                    Go
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Shoppable Videos Section */}
      <div className="px-4 mb-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <Play className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-900">Shoppable videos</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns Section */}
      <div className="px-4 mb-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-900">Returns</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Opportunities Section */}
      <div className="px-4 mb-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-900">Product opportunities</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          <button className="flex flex-col items-center py-2 px-1 text-teal-600">
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1 text-gray-600">
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Products</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1 text-gray-600">
            <ShoppingCart className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Orders</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1 text-gray-600 relative">
            <MessageSquare className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Chat</span>
            <Badge className="absolute -top-1 right-2 w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
              5
            </Badge>
          </button>
          <button className="flex flex-col items-center py-2 px-1 text-gray-600">
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}