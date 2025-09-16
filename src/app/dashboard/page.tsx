// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Layout from '@/components/Layout'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  FileText,
  Package,
  Palette,
  Plus,
  Printer,
  Scissors,
  Settings,
  Shield,
  Star,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  Zap,
  ArrowUp,
  ArrowDown,
  Info,
  MessageCircle,
  Bell,
  HelpCircle,
  ChevronDown,
  Filter,
  Search,
  Calendar as CalendarIcon,
  LineChart,
  Eye,
  PlayCircle,
  ShoppingCart,
  Video,
  Shirt
} from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('home')

  // Mock data for TikTok-style analytics
  const businessData = [
    {
      title: 'GMV',
      value: '₱271,303',
      subtitle: 'vs last 7 days: +43.56%',
      trend: 'up',
      color: 'teal'
    },
    {
      title: 'Gross revenue',
      value: '₱264,728',
      subtitle: 'vs last 7 days: +44.58%',
      trend: 'up',
      color: 'teal'
    },
    {
      title: 'Items sold',
      value: '884',
      subtitle: 'vs last 7 days: +56.4%',
      trend: 'up',
      color: 'orange'
    }
  ]

  const todaysData = {
    gmv: '₱62,991',
    yesterdayGmv: '₱96,378.46',
    itemsSold: '200',
    yesterdayItems: '284',
    visitors: '2,947',
    yesterdayVisitors: '2,534',
    customers: '128',
    yesterdayCustomers: '161'
  }

  const salesSources = [
    {
      type: 'LIVE',
      icon: PlayCircle,
      value: '₱42,524.68',
      subtitle: 'GMV from 1 self operated accounts',
      color: 'red',
      topItems: [
        { name: 'Sorbetes Jersey', price: '₱17,164.69', date: '2025/09/16 18:01' },
        { name: 'Custom Hoodie', price: '₱16,303.22', date: '2025/09/16 09:25' }
      ]
    },
    {
      type: 'Videos',
      icon: Video,
      value: '₱259',
      subtitle: 'GMV from 1 linked accounts',
      color: 'orange',
      topItems: [
        { name: 'DTF Print Tee', price: '₱259', date: '2024/09/15 17:43' },
        { name: 'Embroidered Polo', price: '₱0', date: '2024/07/07 10:38' }
      ]
    },
    {
      type: 'Product cards',
      icon: ShoppingCart,
      value: '₱6,662.36',
      subtitle: 'GMV from 16 product cards',
      color: 'blue',
      topItems: [
        { name: 'Sublimation Jersey', price: '₱2,310.90', date: 'SHIRT/F CLOTH MENS - DARK GRAY' },
        { name: 'Screen Print Tee', price: '₱937.18', date: 'SHIRT/F CLOTHING - CHAMPION BLACK' }
      ]
    }
  ]

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-8">
              {[
                { key: 'home', label: 'Home' },
                { key: 'growth', label: 'Growth & insights' },
                { key: 'live', label: 'LIVE & video' },
                { key: 'product', label: 'Product card' },
                { key: 'products', label: 'Product' },
                { key: 'marketing', label: 'Marketing' },
                { key: 'purchase', label: 'Post purchase' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Business Data and Chart */}
            <div className="col-span-8">
              {/* Business Data Cards */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Business data</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                      Omni
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      TikTok
                    </Badge>
                    <span className="text-sm text-gray-500">Last 7 days</span>
                    <span className="text-sm text-gray-500">Sep 02, 2025 - Sep 08, 2025</span>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {businessData.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm text-gray-600">{item.title}</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {item.value}
                      </div>
                      <div className={`text-sm flex items-center gap-1 ${
                        item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.trend === 'up' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                        {item.subtitle}
                      </div>
                      <div className="mt-2">
                        <Button variant="link" size="sm" className="p-0 h-auto text-teal-600">
                          View breakdown
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Chart Area */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">GMV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Gross revenue</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Daily movement (₱)</div>
                </div>

                {/* Mock Chart */}
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border">
                  <div className="text-center">
                    <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Chart visualization area</p>
                    <p className="text-sm text-gray-400">Revenue trends over time</p>
                  </div>
                </div>

                <div className="flex justify-center mt-4 space-x-4 text-xs text-gray-500">
                  <span>Sep 02</span>
                  <span>Sep 03</span>
                  <span>Sep 04</span>
                  <span>Sep 05</span>
                  <span>Sep 06</span>
                  <span>Sep 07</span>
                  <span>Sep 08</span>
                </div>
              </Card>
            </div>

            {/* Right Column - Today's Data */}
            <div className="col-span-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Today's data</h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <span className="text-sm text-teal-600">Trends</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">Last updated: 17:39</div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">GMV</div>
                    <div className="text-xl font-bold text-gray-900">{todaysData.gmv}</div>
                    <div className="text-xs text-gray-500">Yesterday {todaysData.yesterdayGmv}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Items sold</div>
                    <div className="text-xl font-bold text-gray-900">{todaysData.itemsSold}</div>
                    <div className="text-xs text-gray-500">Yesterday {todaysData.yesterdayItems}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Visitors</div>
                    <div className="text-xl font-bold text-gray-900">{todaysData.visitors}</div>
                    <div className="text-xs text-gray-500">Yesterday {todaysData.yesterdayVisitors}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Customers</div>
                    <div className="text-xl font-bold text-gray-900">{todaysData.customers}</div>
                    <div className="text-xs text-gray-500">Yesterday {todaysData.yesterdayCustomers}</div>
                  </div>
                </div>

                {/* Campaign Section */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-orange-600 text-xs">🔥</span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 ml-2">
                    No campaigns.<br />
                    Join now ›
                  </div>
                </div>

                {/* Business Accelerator */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium text-gray-900">Business accelerator</span>
                    <button className="text-blue-600 text-sm ml-auto">More ›</button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Optimize production that f...</span>
                      <span className="text-green-600">Could increase sales by 7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Optimize product images</span>
                      <span className="text-green-600">Could increase sales by 7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Improve search traffic wit...</span>
                      <span className="text-green-600">Could increase sales by 7%</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm">Yesterday</button>
                    <button className="px-3 py-1 text-gray-600 rounded text-sm hover:bg-gray-100">Last 7 days</button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Sales Sources Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Sales sources</h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">Highest GMV</Badge>
                <Badge variant="outline">Most views</Badge>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">Yesterday</Button>
                  <Button variant="outline" size="sm">Last 7 days</Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {salesSources.map((source, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <source.icon className={`w-5 h-5 ${
                      source.color === 'red' ? 'text-red-500' :
                      source.color === 'orange' ? 'text-orange-500' :
                      'text-blue-500'
                    }`} />
                    <span className="font-medium text-gray-900">{source.type}</span>
                    <Button variant="link" size="sm" className="ml-auto p-0 text-blue-600">
                      View analysis ›
                    </Button>
                  </div>

                  <div className="text-2xl font-bold text-gray-900 mb-1">{source.value}</div>
                  <div className="text-sm text-gray-600 mb-4">{source.subtitle}</div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-900">
                      Top {source.type === 'Product cards' ? '2 product cards' :
                           source.type === 'Videos' ? '3 videos' : '3 LIVE streams'} by GMV
                    </div>

                    {source.topItems.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <Shirt className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.price}</div>
                          <div className="text-xs text-gray-500">{item.date}</div>
                        </div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}