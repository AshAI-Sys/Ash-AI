// @ts-nocheck
'use client'

import { useState, useEffect, useMemo, useCallback, memo, Suspense, lazy } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loading, CardLoading } from '@/components/ui/loading'
import { 
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle,
  AlertTriangle,
  Home,
  Settings
} from 'lucide-react'

// Lazy load heavy components
const ChartComponent = lazy(() => import('@/components/ChartComponent').catch(() => ({ default: () => <div>Chart unavailable</div> })))
const AdvancedMetrics = lazy(() => import('@/components/AdvancedMetrics').catch(() => ({ default: () => <div>Advanced metrics unavailable</div> })))

interface AnalyticsData {
  systemPerformance: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  userExperience: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  businessValue: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  coreRequirements: {
    authentication: { value: number; status: 'good' | 'warning' | 'critical' }
    orderManagement: { value: number; status: 'good' | 'warning' | 'critical' }
    qualityControl: { value: number; status: 'good' | 'warning' | 'critical' }
  }
}

// Memoized metric card component for performance
const MetricCard = memo(({ title, value, change, trend, color, icon: Icon }: {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down'
  color: string
  icon: any
}) => (
  <Card variant="metric" className="hover:shadow-lg transition-all duration-300">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-gray-700">{title}</span>
          <div className={`w-2 h-2 ${color} rounded-full`}></div>
        </div>
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs sm:text-sm text-gray-600 mb-2">
        <span className="hidden sm:inline">Vs last 7 days: </span>
        <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? '+' : '-'}{change.toFixed(2)}%
        </span>
      </div>
      <Button variant="link" className="text-blue-600 p-0 h-auto text-xs sm:text-sm hover:text-blue-700">
        View breakdown →
      </Button>
    </CardContent>
  </Card>
))

export function CleanAnalyticsDashboard() {
  // Memoized analytics data to prevent unnecessary re-renders
  const analyticsData = useMemo<AnalyticsData>(() => ({
    systemPerformance: { value: 271303.61, change: 65.50, trend: 'up' },
    userExperience: { value: 284728.21, change: 60.54, trend: 'up' },
    businessValue: { value: 884, change: 50.54, trend: 'up' },
    coreRequirements: {
      authentication: { value: 42934.08, status: 'good' },
      orderManagement: { value: 259, status: 'good' },
      qualityControl: { value: 6602.38, status: 'good' }
    }
  }), [])

  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 7 days')
  const [isLoading, setIsLoading] = useState(false)

  // Memoized metrics for performance
  const metrics = useMemo(() => [
    {
      title: 'GMV',
      value: `₱ ${analyticsData.systemPerformance.value.toLocaleString()}`,
      change: analyticsData.systemPerformance.change,
      trend: analyticsData.systemPerformance.trend,
      color: 'bg-teal-500',
      icon: TrendingUp
    },
    {
      title: 'Gross revenue',
      value: `₱ ${analyticsData.userExperience.value.toLocaleString()}`,
      change: analyticsData.userExperience.change,
      trend: analyticsData.userExperience.trend,
      color: 'bg-teal-500',
      icon: DollarSign
    },
    {
      title: 'Items sold',
      value: analyticsData.businessValue.value,
      change: analyticsData.businessValue.change,
      trend: analyticsData.businessValue.trend,
      color: 'bg-gray-400',
      icon: Package
    }
  ], [analyticsData])

  // Optimized handlers with useCallback
  const handleTimeframeChange = useCallback((timeframe: string) => {
    setIsLoading(true)
    setSelectedTimeframe(timeframe)
    // Simulate API call
    setTimeout(() => setIsLoading(false), 300)
  }, [])

  const handleRefreshData = useCallback(() => {
    setIsLoading(true)
    // Simulate data refresh
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-optimized TikTok Header */}
      <div className="bg-black text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-black font-bold text-xs">🧠</span>
        </div>
        <span className="text-white font-medium text-sm sm:text-base">ASH AI Analytics</span>
        
        {/* Mobile menu indicator */}
        <div className="ml-auto lg:hidden">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="flex min-h-screen bg-gray-50">
        {/* Left Sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:flex w-16 bg-white border-r border-gray-200 flex-col items-center py-4 space-y-4">
          <div className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
            <Home className="w-5 h-5 text-gray-600 hover:text-blue-500" />
          </div>
          <div className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
            <Package className="w-5 h-5 text-gray-600 hover:text-blue-500" />
          </div>
          <div className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
            <Users className="w-5 h-5 text-gray-600 hover:text-blue-500" />
          </div>
          <div className="p-2 rounded bg-blue-50 border border-blue-200 cursor-pointer">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
            <Activity className="w-5 h-5 text-gray-600 hover:text-blue-500" />
          </div>
          <div className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
            <DollarSign className="w-5 h-5 text-gray-600 hover:text-blue-500" />
          </div>
          <div className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors">
            <Settings className="w-5 h-5 text-gray-600 hover:text-blue-500" />
          </div>
        </div>

        {/* Main Content Area - Mobile responsive */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Center Content - Mobile optimized */}
          <div className="flex-1 p-4 sm:p-6">
            {/* Analytics Header - Mobile responsive */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Analytics</h1>
              
              {/* Tab Navigation - Mobile responsive with horizontal scroll */}
              <div className="flex space-x-4 sm:space-x-8 border-b border-gray-200 overflow-x-auto pb-2 scrollbar-hide">
                {['Home', 'Growth & insights', 'LIVE & video', 'Product card', 'Product', 'Marketing', 'Post purchase'].map((tab, index) => (
                  <button
                    key={tab}
                    className={`pb-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                      index === 0 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Data Section - Mobile responsive */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Business data</h2>
                
                {/* Mobile-stacked controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white text-xs sm:text-sm">
                      Sales
                    </Button>
                    <Button size="sm" variant="outline" className="text-gray-600 text-xs sm:text-sm">
                      Traffic
                    </Button>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-600 order-last sm:order-none">
                    <span className="hidden sm:inline">Last 7 days: Sep 02, 2025 — Sep 09, 2025</span>
                    <span className="sm:hidden">Last 7 days</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm">Chart</Button>
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm">Export</Button>
                  </div>
                </div>
              </div>
              
              {/* Optimized responsive grid with loading states */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {isLoading ? (
                  <>
                    <CardLoading />
                    <CardLoading />
                    <CardLoading />
                  </>
                ) : (
                  metrics.map((metric, index) => (
                    <MetricCard key={metric.title} {...metric} />
                  ))
                )}
              </div>

              {/* Chart Area - Mobile responsive with Suspense */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                      <span className="text-xs sm:text-sm text-gray-600">GMV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                      <span className="text-xs sm:text-sm text-gray-600">Gross revenue</span>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">GMV (₱) | Gross revenue (₱)</span>
                    <span className="sm:hidden">Performance Trends</span>
                  </div>
                </div>

                {/* Chart - Touch-friendly with responsive height and performance optimization */}
                <Suspense fallback={
                  <div className="h-48 sm:h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Loading size="lg" text="Loading chart..." />
                  </div>
                }>
                  <div className="h-48 sm:h-64 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden touch-pan-x">
                  <svg className="w-full h-full" viewBox="0 0 400 200" style={{touchAction: 'pan-x'}}>
                    <defs>
                      <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                      </pattern>
                      {/* Gradient fills for better mobile visibility */}
                      <linearGradient id="gmvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.1"/>
                      </linearGradient>
                      <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* GMV Area */}
                    <path
                      d="M 0 160 Q 80 140 160 120 T 320 80 T 400 60 L 400 200 L 0 200 Z"
                      fill="url(#gmvGradient)"
                    />
                    
                    {/* Revenue Area */}
                    <path
                      d="M 0 180 Q 80 160 160 140 T 320 100 T 400 80 L 400 200 L 0 200 Z"
                      fill="url(#revenueGradient)"
                    />
                    
                    {/* GMV Line */}
                    <path
                      d="M 0 160 Q 80 140 160 120 T 320 80 T 400 60"
                      stroke="#14b8a6"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                    
                    {/* Gross Revenue Line */}
                    <path
                      d="M 0 180 Q 80 160 160 140 T 320 100 T 400 80"
                      stroke="#f97316"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                    
                    {/* Interactive data points with better touch targets */}
                    <g className="cursor-pointer">
                      <circle cx="320" cy="80" r="8" fill="#14b8a6" fillOpacity="0.2" className="hover:r-10 transition-all" />
                      <circle cx="320" cy="80" r="5" fill="#14b8a6" className="hover:r-6 transition-all" />
                      <text x="330" y="75" className="text-xs fill-gray-600 hidden sm:block">₱271,303</text>
                    </g>
                    <g className="cursor-pointer">
                      <circle cx="320" cy="100" r="8" fill="#f97316" fillOpacity="0.2" className="hover:r-10 transition-all" />
                      <circle cx="320" cy="100" r="5" fill="#f97316" className="hover:r-6 transition-all" />
                      <text x="330" y="95" className="text-xs fill-gray-600 hidden sm:block">₱284,728</text>
                    </g>
                  </svg>
                  
                  <div className="absolute bottom-2 left-0 right-0 flex justify-between px-2 sm:px-4 text-xs text-gray-500">
                    <span className="hidden sm:inline">Sep 02</span>
                    <span className="sm:hidden">02</span>
                    <span className="hidden sm:inline">Sep 03</span>
                    <span className="sm:hidden">03</span>
                    <span className="hidden sm:inline">Sep 04</span>
                    <span className="sm:hidden">04</span>
                    <span className="hidden sm:inline">Sep 05</span>
                    <span className="sm:hidden">05</span>
                    <span className="hidden sm:inline">Sep 06</span>
                    <span className="sm:hidden">06</span>
                    <span className="hidden sm:inline">Sep 07</span>
                    <span className="sm:hidden">07</span>
                    <span className="hidden sm:inline">Sep 08</span>
                    <span className="sm:hidden">08</span>
                  </div>
                  </div>
                </Suspense>
              </div>

              {/* Sales Sources Section - Mobile responsive */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Sales sources</h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white text-xs sm:text-sm">
                      Highest GMV
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm">
                      Most views
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* LIVE */}
                  <Card className="bg-white border border-gray-200 rounded-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          LIVE
                        </h4>
                        <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">
                          View analysis →
                        </Button>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">₱{analyticsData.coreRequirements.authentication.value.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 mb-4">GMV from 1 self-operated accounts.</div>
                      <div className="text-sm font-medium text-gray-900 mb-2">Top 3 LIVE streams, ranked by GMV</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-200 rounded flex items-center justify-center">
                            <span className="text-xs">📱</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">₱{(analyticsData.coreRequirements.authentication.value / 2.5).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">2025/09/08 18:01 | @reeferco</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Videos */}
                  <Card className="bg-white border border-gray-200 rounded-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Videos
                        </h4>
                        <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">
                          View analysis →
                        </Button>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">₱{analyticsData.coreRequirements.orderManagement.value}</div>
                      <div className="text-sm text-gray-600 mb-4">GMV from 1 linked accounts.</div>
                      <div className="text-sm font-medium text-gray-900 mb-2">Top 3 videos, ranked by GMV</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center">
                            <span className="text-xs">🎬</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">₱259</div>
                            <div className="text-xs text-gray-500">2024/10/13 17:44 | P99 Hoodies! Limi...</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Product Cards */}
                  <Card className="bg-white border border-gray-200 rounded-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          Product cards
                        </h4>
                        <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">
                          View analysis →
                        </Button>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">₱{analyticsData.coreRequirements.qualityControl.value.toLocaleString()}</div>
                      <div className="text-sm text-gray-600 mb-4">GMV from 18 product cards.</div>
                      <div className="text-sm font-medium text-gray-900 mb-2">Top 3 product cards by GMV</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                            <span className="text-xs text-white">👕</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">₱2,310.90</div>
                            <div className="text-xs text-gray-500">REEFER CLOTHING - DARK DAYS [BLAC...</div>
                            <div className="text-xs text-green-600">🟢 Estimated PV 16% ⭐ If product title is...</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Mobile responsive Today's Data */}
          <div className="w-full lg:w-80 p-4 sm:p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Today's data</h3>
                <Button variant="link" className="text-blue-600 p-0 h-auto text-xs sm:text-sm hover:text-blue-700">Trends →</Button>
              </div>
              
              <div className="text-right mb-4">
                <div className="text-xs text-gray-500">Last updated: 15:44</div>
              </div>

              {/* Mobile responsive metric grid */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:space-y-4 lg:gap-0">
                <div className="text-center lg:text-right">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">GMV</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">₱54,272.05</div>
                  <div className="text-xs text-gray-500">Yesterday ₱67,266.46</div>
                </div>
                
                <div className="text-center lg:text-right">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Items sold</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">171</div>
                  <div className="text-xs text-gray-500">Yesterday 179</div>
                </div>

                <div className="text-center lg:text-right">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Visitors</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">2,678</div>
                  <div className="text-xs text-gray-500">Yesterday 2,534</div>
                </div>
                
                <div className="text-center lg:text-right">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Customers</div>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">111</div>
                  <div className="text-xs text-gray-500">Yesterday 114</div>
                </div>
              </div>

              {/* Campaign Status */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-xs">🏷️</span>
                    </div>
                    <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-xs">🎯</span>
                    </div>
                    <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-xs">📊</span>
                    </div>
                    <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-xs">🔥</span>
                    </div>
                    <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-xs">💰</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">No campaign...</span>
                  <Button variant="link" className="text-blue-600 p-0 h-auto text-xs ml-auto">Join now →</Button>
                </div>
              </div>

              {/* Business Accelerator */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <h4 className="font-medium text-gray-900">Business accelerator</h4>
                  </div>
                  <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">More →</Button>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-gray-900 mb-1">Optimize product(s) that f...</div>
                    <div className="text-xs text-green-600">Could increase sales by 7%</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-900 mb-1">Optimize product image(s)</div>
                    <div className="text-xs text-green-600">Could increase sales by 7%</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-900 mb-1">Improve search traffic wit...</div>
                    <div className="text-xs text-green-600">Could increase sales by 5%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}