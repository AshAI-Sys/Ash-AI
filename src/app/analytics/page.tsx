'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  Settings,
  Download,
  RefreshCw,
  Lightbulb,
  PieChart,
  Activity,
  DollarSign,
  Users,
  Factory,
  Shield
} from 'lucide-react'
import { Role } from '@prisma/client'

interface KPIMetric {
  id: string
  name: string
  category: string
  unit: string
  currentValue: number
  targetValue: number
  trend: "up" | "down" | "stable"
  percentageChange: number
  targetAchievement: number
  isOnTarget: boolean
  activeAlerts: number
}

interface BusinessInsight {
  id: string
  title: string
  category: string
  description: string
  impact: string
  confidence: number
  recommendation?: string
  potentialImpact?: string
}

interface ForecastData {
  id: string
  name: string
  type: string
  period: string
  accuracy: number
  status: string
  prediction: {
    value: number
    confidence: number
    factors: string[]
    stockoutRisk?: string
    materialsAtRisk?: string[]
    projectedRevenue?: number
    totalValue?: number
  }
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kpis, setKpis] = useState<KPIMetric[]>([])
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const canViewAnalytics = session?.user.role === Role.ADMIN || 
                          session?.user.role === Role.MANAGER

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!canViewAnalytics) {
      router.push('/dashboard')
      return
    }

    fetchAnalyticsData()
  }, [session, status, router, canViewAnalytics])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Mock comprehensive analytics data
      const mockKPIs: KPIMetric[] = [
        {
          id: "1",
          name: "Overall Equipment Effectiveness",
          category: "OPERATIONAL",
          unit: "%",
          currentValue: 87.2,
          targetValue: 85.0,
          trend: "up",
          percentageChange: 3.5,
          targetAchievement: 102.6,
          isOnTarget: true,
          activeAlerts: 0
        },
        {
          id: "2", 
          name: "Order Fulfillment Rate",
          category: "OPERATIONAL",
          unit: "%",
          currentValue: 94.8,
          targetValue: 95.0,
          trend: "stable",
          percentageChange: 0.2,
          targetAchievement: 99.8,
          isOnTarget: true,
          activeAlerts: 1
        },
        {
          id: "3",
          name: "Gross Profit Margin",
          category: "FINANCIAL",
          unit: "%",
          currentValue: 31.6,
          targetValue: 30.0,
          trend: "up",
          percentageChange: 8.2,
          targetAchievement: 105.3,
          isOnTarget: true,
          activeAlerts: 0
        },
        {
          id: "4",
          name: "Quality Pass Rate",
          category: "QUALITY",
          unit: "%",
          currentValue: 96.4,
          targetValue: 97.0,
          trend: "down",
          percentageChange: -1.8,
          targetAchievement: 99.4,
          isOnTarget: false,
          activeAlerts: 2
        },
        {
          id: "5",
          name: "Customer Satisfaction Score",
          category: "CUSTOMER",
          unit: "/10",
          currentValue: 8.7,
          targetValue: 8.5,
          trend: "up",
          percentageChange: 4.8,
          targetAchievement: 102.4,
          isOnTarget: true,
          activeAlerts: 0
        },
        {
          id: "6",
          name: "Employee Productivity Index",
          category: "EMPLOYEE",
          unit: "index",
          currentValue: 118.3,
          targetValue: 115.0,
          trend: "up",
          percentageChange: 6.2,
          targetAchievement: 102.9,
          isOnTarget: true,
          activeAlerts: 0
        }
      ]

      const mockInsights: BusinessInsight[] = [
        {
          id: "ai_001",
          title: "Production Efficiency Opportunity",
          category: "OPPORTUNITY",
          description: "Stage 4 (Printing) shows 15% higher efficiency on Wednesdays. Consider scheduling high-priority orders midweek.",
          impact: "MEDIUM",
          confidence: 0.87,
          recommendation: "Reschedule 2-3 high-priority orders per week to Wednesdays to improve overall throughput.",
          potentialImpact: "8-12% improvement in printing stage efficiency"
        },
        {
          id: "ai_002",
          title: "Inventory Risk Alert",
          category: "RISK",
          description: "DTF film inventory trending toward stockout in 18-22 days based on current consumption patterns.",
          impact: "HIGH",
          confidence: 0.92,
          recommendation: "Place urgent purchase order for DTF film (minimum 2000 units) within next 3 days.",
          potentialImpact: "Prevent production delays affecting 8-12 orders"
        },
        {
          id: "ai_003",
          title: "Quality Pattern Detected",
          category: "TREND",
          description: "Screen printing reject rate decreased 24% after implementing Monday morning equipment calibration routine.",
          impact: "MEDIUM",
          confidence: 0.79,
          recommendation: "Standardize Monday calibration routine across all printing equipment and track results.",
          potentialImpact: "Potential 20-25% reduction in overall print reject rate"
        }
      ]

      const mockForecasts: ForecastData[] = [
        {
          id: "1",
          name: "Q1 2025 Sales Forecast",
          type: "SALES",
          period: "2025-Q1",
          accuracy: 0.89,
          status: "COMPLETED",
          prediction: {
            value: 9240000,
            confidence: 89,
            factors: ["Seasonal trends", "Historical data", "Market analysis"],
            projectedRevenue: 9240000
          }
        },
        {
          id: "2",
          name: "February Inventory Needs",
          type: "INVENTORY",
          period: "2025-02",
          accuracy: 0.94,
          status: "COMPLETED",
          prediction: {
            value: 1310000,
            confidence: 94,
            factors: ["Current stock levels", "Order pipeline", "Lead times"],
            stockoutRisk: "medium",
            materialsAtRisk: ["DTF Film", "Cotton Fabric"],
            totalValue: 1310000
          }
        }
      ]

      setKpis(mockKPIs)
      setInsights(mockInsights)
      setForecasts(mockForecasts)
      setLoading(false)
    } catch (_error) {
      console.error("Error fetching analytics data:", _error)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  const getKPIColor = (kpi: KPIMetric) => {
    if (kpi.activeAlerts > 0) return "text-red-600"
    if (kpi.isOnTarget) return "text-green-600"
    return "text-yellow-600"
  }

  const getKPIBgColor = (kpi: KPIMetric) => {
    if (kpi.activeAlerts > 0) return "bg-red-50"
    if (kpi.isOnTarget) return "bg-green-50"
    return "bg-yellow-50"
  }

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case "HIGH": return "bg-red-100 text-red-800"
      case "MEDIUM": return "bg-yellow-100 text-yellow-800"
      case "LOW": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "FINANCIAL": return <DollarSign className="h-4 w-4" />
      case "OPERATIONAL": return <Factory className="h-4 w-4" />
      case "QUALITY": return <Shield className="h-4 w-4" />
      case "CUSTOMER": return <Users className="h-4 w-4" />
      case "EMPLOYEE": return <Users className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  if (status === 'loading' || loading) {
    return (
      <TikTokLayout>
        <div className="flex items-center justify-center h-64">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </TikTokLayout>
    )
  }

  if (!session || !canViewAnalytics) {
    return (
      <TikTokLayout>
        <div className="flex items-center justify-center h-64">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don&apos;t have permission to view analytics and reporting.
            </p>
          </div>
        </div>
      </TikTokLayout>
    )
  }

  return (
    <TikTokLayout>
      <div className="space-y-6">
        {/* Business Data Cards - TikTok Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Business data</h2>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-4"
                >
                  Sales
                </Button>
                <Button
                  size="sm" 
                  variant="outline"
                  className="text-gray-700 border-gray-300 rounded-full px-4"
                >
                  Traffic
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Last 7 days • Sep 02, 2025 - Sep 08, 2025</span>
              <Button size="sm" variant="outline">📅</Button>
              <Button size="sm" variant="outline">📊</Button>
            </div>
          </div>

          {/* Metrics Grid - TikTok Style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">GMV 💰</h3>
                <span className="text-xs text-gray-500">ℹ️</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">₱271,303.01</div>
              <div className="text-sm text-gray-600">
                vs last 7 days • <span className="text-green-600">+65.59%</span>
              </div>
              <Button size="sm" variant="link" className="text-teal-600 p-0 h-auto">
                View breakdown &gt;
              </Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Gross revenue 💰</h3>
                <span className="text-xs text-gray-500">ℹ️</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">₱284,728.01</div>
              <div className="text-sm text-gray-600">
                vs last 7 days • <span className="text-green-600">+66.54%</span>
              </div>
              <Button size="sm" variant="link" className="text-teal-600 p-0 h-auto">
                View breakdown &gt;
              </Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Items sold 📦</h3>
                <span className="text-xs text-gray-500">ℹ️</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">884</div>
              <div className="text-sm text-gray-600">
                vs last 7 days • <span className="text-green-600">+95.54%</span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Analytics Chart Placeholder</p>
            </div>
          </div>
        </div>

        {/* Today's Data - Right Sidebar Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's data</h2>
            <div className="flex items-center text-sm text-gray-600">
              📈 Trends
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">GMV 💰</h3>
              <div className="text-2xl font-bold text-gray-900">₱54,272.05</div>
              <div className="text-sm text-gray-600">Yesterday ₱51,705.46</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Items sold 📦</h3>
              <div className="text-2xl font-bold text-gray-900">171</div>
              <div className="text-sm text-gray-600">Yesterday 179</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Visitors 👥</h3>
              <div className="text-2xl font-bold text-gray-900">2,678</div>
              <div className="text-sm text-gray-600">Yesterday 2,534</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Customers 👤</h3>
              <div className="text-2xl font-bold text-gray-900">111</div>
              <div className="text-sm text-gray-600">Yesterday 114</div>
            </div>
          </div>
        </div>

        {/* Sales Sources */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Sales sources</h2>
            <div className="flex space-x-2">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                Highest GMV
              </Button>
              <Button size="sm" variant="outline">
                Most views
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LIVE */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">📺 LIVE</h3>
                <Button size="sm" variant="link" className="text-teal-600">
                  View analysis &gt;
                </Button>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-2">₱42,934.08</div>
              <p className="text-sm text-gray-600 mb-3">GMV from 1 self-operated accounts.</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Top 3 LIVE streams, ranked by GMV</h4>
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-200 rounded flex items-center justify-center">
                      📺
                    </div>
                    <div>
                      <div className="font-medium">₱17,164.69</div>
                      <div className="text-sm text-gray-600">2025/09/08 18:01 • @teeferco</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Videos */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">🎥 Videos</h3>
                <Button size="sm" variant="link" className="text-teal-600">
                  View analysis &gt;
                </Button>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-2">₱259</div>
              <p className="text-sm text-gray-600 mb-3">GMV from 1 linked accounts.</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Top 3 videos, ranked by GMV</h4>
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center">
                      🎥
                    </div>
                    <div>
                      <div className="font-medium">₱259</div>
                      <div className="text-sm text-gray-600">2024/10/13 17:44 • ₱99 Hoodied Limi...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product cards */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">🏷️ Product cards</h3>
                <Button size="sm" variant="link" className="text-teal-600">
                  View analysis &gt;
                </Button>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-2">₱6,602.38</div>
              <p className="text-sm text-gray-600 mb-3">GMV from 18 product cards.</p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Top 3 product cards by GMV</h4>
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-black rounded">
                        <span className="text-white text-xs">👕</span>
                      </div>
                      <div>
                        <div className="font-medium">₱2,310.90</div>
                        <div className="text-sm text-gray-600">REFFEX CLOTHING - DARK DAYS [BLACK]</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TikTokLayout>
  )
}