'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Zap,
  Brain,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  Package,
  Cog,
  Award,
  Clock,
  RefreshCw
} from 'lucide-react'

interface AdvancedDashboardProps {
  className?: string
}

interface KPI {
  id: string
  name: string
  value: number
  unit: string
  target: number
  benchmark: number
  performance: 'excellent' | 'good' | 'average' | 'poor'
  trend: 'improving' | 'stable' | 'declining'
  trendPercentage: number
}

interface BusinessInsight {
  id: string
  category: string
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'recommendation'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  estimatedValue: number
  actionRequired: boolean
}

interface PredictionResult {
  id: string
  modelId: string
  targetDate: Date
  predictedValue: number
  confidence: number
  factors: Array<{ factor: string, influence: number }>
}

interface OptimizationSuggestion {
  id: string
  category: string
  title: string
  description: string
  impact: number
  effort: 'low' | 'medium' | 'high'
  roi: number
}

export default function AdvancedDashboard({ className }: AdvancedDashboardProps) {
  const [activeTab, setActiveTab] = useState('executive')
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  // Mock data states
  const [executiveData, setExecutiveData] = useState<any>(null)
  const [kpis, setKpis] = useState<KPI[]>([])
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Simulate API calls
      await Promise.all([
        loadExecutiveData(),
        loadKPIs(),
        loadInsights(),
        loadPredictions(),
        loadOptimizations()
      ])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadExecutiveData = async () => {
    // Simulate executive summary data
    setExecutiveData({
      summary: {
        criticalInsights: 2,
        opportunityValue: 125000,
        riskValue: 45000,
        avgPredictionConfidence: 87.5
      },
      performance: {
        overallScore: 82,
        efficiency: 87.5,
        quality: 96.8,
        delivery: 94.2,
        cost: 78.3
      }
    })
  }

  const loadKPIs = async () => {
    const mockKPIs: KPI[] = [
      {
        id: 'oee',
        name: 'Overall Equipment Effectiveness',
        value: 82.7,
        unit: '%',
        target: 85,
        benchmark: 75,
        performance: 'good',
        trend: 'improving',
        trendPercentage: 2.3
      },
      {
        id: 'quality',
        name: 'Quality Pass Rate',
        value: 96.8,
        unit: '%',
        target: 96,
        benchmark: 94,
        performance: 'excellent',
        trend: 'stable',
        trendPercentage: 0.8
      },
      {
        id: 'delivery',
        name: 'On-Time Delivery',
        value: 94.2,
        unit: '%',
        target: 95,
        benchmark: 92,
        performance: 'good',
        trend: 'improving',
        trendPercentage: 1.5
      },
      {
        id: 'productivity',
        name: 'Labor Productivity',
        value: 88.5,
        unit: 'units/hour',
        target: 95,
        benchmark: 92,
        performance: 'average',
        trend: 'improving',
        trendPercentage: 4.2
      }
    ]
    setKpis(mockKPIs)
  }

  const loadInsights = async () => {
    const mockInsights: BusinessInsight[] = [
      {
        id: 'insight_1',
        category: 'production',
        type: 'opportunity',
        title: 'Production Line Optimization Opportunity',
        description: 'Bottleneck analysis shows 18% efficiency improvement potential in sewing operations',
        impact: 'high',
        confidence: 92,
        estimatedValue: 75000,
        actionRequired: true
      },
      {
        id: 'insight_2',
        category: 'quality',
        type: 'risk',
        title: 'Quality Trend Deterioration',
        description: 'Embroidery defect rates increased 15% in the past week',
        impact: 'critical',
        confidence: 88,
        estimatedValue: -25000,
        actionRequired: true
      },
      {
        id: 'insight_3',
        category: 'finance',
        type: 'opportunity',
        title: 'Material Cost Optimization',
        description: 'Bulk purchasing agreements could reduce material costs by 12%',
        impact: 'high',
        confidence: 85,
        estimatedValue: 50000,
        actionRequired: false
      }
    ]
    setInsights(mockInsights)
  }

  const loadPredictions = async () => {
    const mockPredictions: PredictionResult[] = [
      {
        id: 'pred_1',
        modelId: 'demand_forecast',
        targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        predictedValue: 28,
        confidence: 87,
        factors: [
          { factor: 'seasonal_trend', influence: 15 },
          { factor: 'market_demand', influence: 8 },
          { factor: 'promotional_activity', influence: -3 }
        ]
      },
      {
        id: 'pred_2',
        modelId: 'quality_prediction',
        targetDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        predictedValue: 3.2,
        confidence: 91,
        factors: [
          { factor: 'operator_skill', influence: -5 },
          { factor: 'material_quality', influence: 2 },
          { factor: 'environmental', influence: 1 }
        ]
      }
    ]
    setPredictions(mockPredictions)
  }

  const loadOptimizations = async () => {
    const mockOptimizations: OptimizationSuggestion[] = [
      {
        id: 'opt_1',
        category: 'efficiency',
        title: 'Production Line Balancing',
        description: 'Redistribute workload to eliminate bottlenecks',
        impact: 18.2,
        effort: 'low',
        roi: 4.5
      },
      {
        id: 'opt_2',
        category: 'cost',
        title: 'Material Procurement Optimization',
        description: 'Optimize supplier contracts and ordering schedules',
        impact: 12.5,
        effort: 'medium',
        roi: 2.8
      }
    ]
    setOptimizations(mockOptimizations)
  }

  const TrendIcon = ({ trend, percentage }: { trend: string, percentage: number }) => {
    if (trend === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (trend === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <div className="h-4 w-4 bg-gray-400 rounded-full" />
  }

  const PerformanceBadge = ({ performance }: { performance: string }) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      average: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={colors[performance as keyof typeof colors]}>
        {performance.toUpperCase()}
      </Badge>
    )
  }

  const ImpactBadge = ({ impact }: { impact: string }) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    }

    return (
      <Badge className={colors[impact as keyof typeof colors]}>
        {impact.toUpperCase()}
      </Badge>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">AI-powered insights and predictive analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="kpis">KPIs & Benchmarks</TabsTrigger>
          <TabsTrigger value="insights">Business Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="space-y-6">
          {executiveData && (
            <>
              {/* Executive KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Overall Score</p>
                        <p className="text-2xl font-bold">{executiveData.performance.overallScore}</p>
                        <Progress value={executiveData.performance.overallScore} className="mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Opportunity Value</p>
                        <p className="text-xl font-bold">{formatCurrency(executiveData.summary.opportunityValue)}</p>
                        <p className="text-sm text-green-600">+12% vs last month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Risk Value</p>
                        <p className="text-xl font-bold">{formatCurrency(executiveData.summary.riskValue)}</p>
                        <p className="text-sm text-orange-600">{executiveData.summary.criticalInsights} critical items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">AI Confidence</p>
                        <p className="text-2xl font-bold">{executiveData.summary.avgPredictionConfidence}%</p>
                        <p className="text-sm text-gray-600">Prediction accuracy</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Performance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(executiveData.performance).slice(1).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize text-sm text-gray-600">
                            {key.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-3">
                            <Progress value={value as number} className="w-24" />
                            <span className="text-sm font-medium w-12 text-right">
                              {value}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Key Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-green-800">Quality Excellence</p>
                          <p className="text-sm text-green-600">Achieved 96.8% pass rate</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-blue-800">Efficiency Improvement</p>
                          <p className="text-sm text-blue-600">+4.2% productivity increase</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <Zap className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="font-medium text-purple-800">AI Automation</p>
                          <p className="text-sm text-purple-600">95% quality checkpoints automated</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {kpis.map((kpi) => (
              <Card key={kpi.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{kpi.name}</CardTitle>
                    <PerformanceBadge performance={kpi.performance} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold">
                          {kpi.value.toFixed(1)}<span className="text-lg text-gray-500 ml-1">{kpi.unit}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <TrendIcon trend={kpi.trend} percentage={kpi.trendPercentage} />
                          <span className="text-sm text-gray-600">
                            {kpi.trendPercentage.toFixed(1)}% vs last month
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current vs Target</span>
                        <span>{((kpi.value / kpi.target) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(kpi.value / kpi.target) * 100} />
                      
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Benchmark: {kpi.benchmark}{kpi.unit}</span>
                        <span>Target: {kpi.target}{kpi.unit}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{insight.title}</h3>
                        <ImpactBadge impact={insight.impact} />
                      </div>
                      <p className="text-gray-600 mb-4">{insight.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>Confidence: {insight.confidence}%</span>
                        <span>Category: {insight.category}</span>
                        <span>Type: {insight.type}</span>
                        {insight.estimatedValue !== 0 && (
                          <span className={insight.estimatedValue > 0 ? 'text-green-600' : 'text-red-600'}>
                            Value: {formatCurrency(Math.abs(insight.estimatedValue))}
                          </span>
                        )}
                      </div>
                    </div>
                    {insight.actionRequired && (
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <Card key={prediction.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg capitalize">
                        {prediction.modelId.replace('_', ' ')}
                      </h3>
                      <p className="text-gray-600">
                        Target: {new Date(prediction.targetDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{prediction.predictedValue.toFixed(1)}</p>
                      <p className="text-sm text-gray-600">{prediction.confidence}% confidence</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Influencing Factors:</h4>
                    <div className="space-y-2">
                      {prediction.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{factor.factor.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-16 rounded ${
                              factor.influence > 0 ? 'bg-green-200' : 'bg-red-200'
                            }`}>
                              <div
                                className={`h-full rounded ${
                                  factor.influence > 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.abs(factor.influence) * 5)}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">
                              {factor.influence > 0 ? '+' : ''}{factor.influence.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="space-y-4">
            {optimizations.map((optimization) => (
              <Card key={optimization.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{optimization.title}</h3>
                        <Badge className={
                          optimization.effort === 'low' ? 'bg-green-100 text-green-800' :
                          optimization.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {optimization.effort.toUpperCase()} EFFORT
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-4">{optimization.description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span>Impact: <strong>+{optimization.impact}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-500" />
                          <span>ROI: <strong>{optimization.roi}x</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-500" />
                          <span>Category: <strong>{optimization.category}</strong></span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm">
                      Implement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}