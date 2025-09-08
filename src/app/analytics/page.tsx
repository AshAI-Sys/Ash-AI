'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import EnhancedLayout from '@/components/EnhancedLayout'
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
      <EnhancedLayout>
        <div className="min-h-screen gradient-mesh relative overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </EnhancedLayout>
    )
  }

  if (!session || !canViewAnalytics) {
    return (
      <EnhancedLayout>
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
                You don&apos;t have permission to view analytics and reporting.
              </p>
            </div>
          </div>
        </div>
      </EnhancedLayout>
    )
  }

  return (
    <EnhancedLayout>
      <div className="min-h-screen gradient-mesh relative overflow-hidden">
        {/* Floating background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 gradient-purple rounded-full opacity-20 float morph-shape"></div>
          <div className="absolute top-40 right-16 w-24 h-24 gradient-green rounded-full opacity-30 float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 gradient-blue rounded-full opacity-15 float morph-shape" style={{animationDelay: '4s'}}></div>
          <div className="absolute bottom-16 right-16 w-28 h-28 gradient-pink rounded-full opacity-25 float" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 p-6 space-y-6">
          {/* Header */}
          <div className="glass-card p-8 rounded-3xl slide-in-up">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">Stage 10: Advanced Analytics</h1>
                <p className="text-white/80 text-lg">
                  AI-powered insights, predictive analytics, and comprehensive reporting
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="glass-card border border-white/20 text-white hover:bg-white/10 px-6 py-3 rounded-2xl font-semibold hover-scale"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button className="gradient-blue text-white px-6 py-3 rounded-2xl font-semibold hover-scale">
                  <Download className="w-5 h-5 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>

          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 slide-in-left">
            {kpis.map((kpi) => (
              <div key={kpi.id} className={`glass-card p-6 rounded-3xl hover-scale ${getKPIBgColor(kpi)} border border-white/10`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(kpi.category)}
                    <span className="text-sm font-medium text-white/60">{kpi.category}</span>
                  </div>
                  {kpi.activeAlerts > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {kpi.activeAlerts} Alert{kpi.activeAlerts > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-white text-sm">{kpi.name}</h3>
                  <div className="flex items-end gap-2">
                    <span className={`text-2xl font-bold ${getKPIColor(kpi)}`}>
                      {kpi.currentValue}{kpi.unit}
                    </span>
                    {kpi.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : kpi.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>Target: {kpi.targetValue}{kpi.unit}</span>
                      <span>{kpi.percentageChange > 0 ? '+' : ''}{kpi.percentageChange}%</span>
                    </div>
                    <Progress 
                      value={Math.min(kpi.targetAchievement, 110)} 
                      className="h-2 bg-white/20" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="glass-card p-6 rounded-3xl slide-in-right">
            <Tabs defaultValue="insights" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-white/10 rounded-2xl">
                <TabsTrigger value="insights" className="data-[state=active]:bg-white/20 rounded-xl text-white">
                  AI Insights
                </TabsTrigger>
                <TabsTrigger value="forecasts" className="data-[state=active]:bg-white/20 rounded-xl text-white">
                  Forecasting
                </TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-white/20 rounded-xl text-white">
                  Reports
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-white/20 rounded-xl text-white">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="space-y-6">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Brain className="h-5 w-5 mr-2" />
                      AI-Powered Business Insights
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Automated analysis and recommendations from Ashley AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.map((insight) => (
                        <div key={insight.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-yellow-400" />
                                <Badge className={getInsightColor(insight.impact)}>
                                  {insight.impact} Impact
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-white/60">
                                <Target className="h-4 w-4" />
                                {Math.round(insight.confidence * 100)}% Confidence
                              </div>
                            </div>
                            <Badge variant="outline" className="text-white border-white/20">
                              {insight.category}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold text-white mb-2">{insight.title}</h3>
                          <p className="text-white/70 mb-4">{insight.description}</p>
                          
                          {insight.recommendation && (
                            <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg mb-3">
                              <p className="text-sm text-blue-300 font-medium">Recommendation:</p>
                              <p className="text-sm text-blue-200">{insight.recommendation}</p>
                            </div>
                          )}
                          
                          {insight.potentialImpact && (
                            <div className="text-sm text-green-400">
                              <span className="font-medium">Potential Impact: </span>
                              {insight.potentialImpact}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="forecasts" className="space-y-6">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Predictive Forecasting
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Machine learning powered predictions for business planning
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {forecasts.map((forecast) => (
                        <div key={forecast.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white">{forecast.name}</h3>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              <span className="text-sm text-green-400">{Math.round(forecast.accuracy * 100)}% Accurate</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-white/60">Type:</span>
                              <Badge variant="outline" className="text-white border-white/20">
                                {forecast.type}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-white/60">Period:</span>
                              <span className="text-white font-medium">{forecast.period}</span>
                            </div>
                            
                            {forecast.type === "SALES" && (
                              <div className="pt-3 border-t border-white/10">
                                <div className="text-lg font-bold text-green-400 mb-1">
                                  ₱{forecast.prediction.projectedRevenue?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-white/60">Projected Revenue</div>
                              </div>
                            )}
                            
                            {forecast.type === "INVENTORY" && (
                              <div className="pt-3 border-t border-white/10">
                                <div className="text-lg font-bold text-yellow-400 mb-1">
                                  {forecast.prediction.materialsAtRisk?.length || 0} Materials at Risk
                                </div>
                                <div className="text-sm text-white/60">
                                  {forecast.prediction.materialsAtRisk?.join(", ") || "None"}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <PieChart className="h-5 w-5 mr-2" />
                      Executive Reports
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Comprehensive business intelligence reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: "Executive Dashboard", icon: BarChart3, description: "High-level KPI overview" },
                        { name: "Production Analytics", icon: Factory, description: "Manufacturing performance" },
                        { name: "Financial Summary", icon: DollarSign, description: "Revenue and profitability" },
                        { name: "Quality Metrics", icon: Shield, description: "Quality control analysis" },
                        { name: "Customer Analytics", icon: Users, description: "Customer satisfaction trends" },
                        { name: "Operational Efficiency", icon: Activity, description: "Process optimization insights" }
                      ].map((report) => (
                        <Button
                          key={report.name}
                          variant="outline"
                          className="h-24 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10"
                        >
                          <report.icon className="h-6 w-6 mb-2" />
                          <span className="font-medium">{report.name}</span>
                          <span className="text-xs text-white/60 text-center">{report.description}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Settings className="h-5 w-5 mr-2" />
                      Analytics Configuration
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Configure KPIs, alerts, and reporting parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "KPI Metrics", icon: Target, description: "Manage key performance indicators" },
                        { name: "Alert Rules", icon: AlertTriangle, description: "Configure automated alerts" },
                        { name: "Data Quality", icon: Shield, description: "Data validation and monitoring" },
                        { name: "Report Templates", icon: PieChart, description: "Customize report formats" }
                      ].map((setting) => (
                        <Button
                          key={setting.name}
                          variant="outline"
                          className="w-full justify-start glass-card border-white/20 text-white hover:bg-white/10 p-4"
                        >
                          <setting.icon className="h-5 w-5 mr-3" />
                          <div className="text-left">
                            <div className="font-medium">{setting.name}</div>
                            <div className="text-sm text-white/60">{setting.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </EnhancedLayout>
  )
}