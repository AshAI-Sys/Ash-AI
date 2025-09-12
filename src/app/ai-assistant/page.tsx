// @ts-nocheck
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { TikTokCenteredLayout, TikTokPageHeader, TikTokContentCard, TikTokMetricsGrid, TikTokMetricCard } from '@/components/TikTokCenteredLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain,
  Bot,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Settings,
  Database,
  Globe,
  Shield,
  Sparkles,
  Eye,
  MessageSquare,
  BarChart3
} from 'lucide-react'

interface AIInsight {
  id: string
  type: 'prediction' | 'alert' | 'optimization' | 'recommendation'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'production' | 'finance' | 'inventory' | 'orders' | 'users' | 'system'
  confidence: number
  actionRequired: boolean
  data?: Record<string, unknown>
}

interface AIMetric {
  id: string
  name: string
  value: number
  unit: string
  change: number
  trend: 'up' | 'down' | 'stable'
  category: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const AI_INSIGHTS: AIInsight[] = [
  {
    id: 'prod-efficiency',
    type: 'optimization',
    title: 'Production Efficiency Optimization',
    description: 'Workstation C shows 23% lower efficiency. Recommend maintenance check and operator training.',
    impact: 'high',
    category: 'production',
    confidence: 0.89,
    actionRequired: true,
    data: { workstation: 'C', efficiency: 67, target: 85 }
  },
  {
    id: 'inventory-forecast',
    type: 'prediction',
    title: 'Inventory Depletion Forecast',
    description: 'CVC-160-WHITE fabric will deplete in 4 days based on current order velocity.',
    impact: 'high',
    category: 'inventory',
    confidence: 0.94,
    actionRequired: true,
    data: { item: 'CVC-160-WHITE', daysLeft: 4, currentStock: 45 }
  },
  {
    id: 'revenue-trend',
    type: 'prediction',
    title: 'Revenue Growth Trend',
    description: 'Projected 12% revenue increase next month based on order patterns and seasonal analysis.',
    impact: 'medium',
    category: 'finance',
    confidence: 0.76,
    actionRequired: false,
    data: { projectedGrowth: 12, confidence: 76 }
  },
  {
    id: 'quality-alert',
    type: 'alert',
    title: 'Quality Score Alert',
    description: 'Quality scores dropped 8% this week. Investigate batch B-20250302-001 for defects.',
    impact: 'high',
    category: 'production',
    confidence: 0.91,
    actionRequired: true,
    data: { qualityDrop: 8, suspiciousBatch: 'B-20250302-001' }
  },
  {
    id: 'user-activity',
    type: 'recommendation',
    title: 'User Training Recommendation',
    description: 'New operators show 15% longer task completion times. Recommend additional training program.',
    impact: 'medium',
    category: 'users',
    confidence: 0.82,
    actionRequired: false,
    data: { completionTimeIncrease: 15, newOperators: 3 }
  },
  {
    id: 'system-performance',
    type: 'optimization',
    title: 'Database Performance Optimization',
    description: 'Query response times increased 20%. Recommend index optimization for order lookups.',
    impact: 'low',
    category: 'system',
    confidence: 0.88,
    actionRequired: false,
    data: { responseTimeIncrease: 20, affectedQueries: 'order_lookups' }
  }
]

const AI_METRICS: AIMetric[] = [
  {
    id: 'neural-efficiency',
    name: 'Neural Processing Efficiency',
    value: 94.2,
    unit: '%',
    change: 5.8,
    trend: 'up',
    category: 'AI Performance',
    description: 'Overall AI system performance and response accuracy',
    icon: Brain
  },
  {
    id: 'prediction-accuracy',
    name: 'Prediction Accuracy',
    value: 87.6,
    unit: '%',
    change: 2.3,
    trend: 'up',
    category: 'AI Quality',
    description: 'Accuracy of AI predictions over the last 30 days',
    icon: Target
  },
  {
    id: 'automation-rate',
    name: 'Process Automation',
    value: 73.4,
    unit: '%',
    change: -1.2,
    trend: 'down',
    category: 'Automation',
    description: 'Percentage of processes automated by AI',
    icon: Bot
  },
  {
    id: 'insights-generated',
    name: 'Daily Insights',
    value: 24,
    unit: '',
    change: 8,
    trend: 'up',
    category: 'Analytics',
    description: 'AI-generated insights and recommendations per day',
    icon: Sparkles
  },
  {
    id: 'response-time',
    name: 'Response Time',
    value: 0.32,
    unit: 's',
    change: -0.08,
    trend: 'up',
    category: 'Performance',
    description: 'Average AI response time for queries',
    icon: Zap
  },
  {
    id: 'data-processed',
    name: 'Data Processed',
    value: 1247,
    unit: 'GB',
    change: 156,
    trend: 'up',
    category: 'Throughput',
    description: 'Amount of data processed by AI systems today',
    icon: Database
  }
]

export default function AIAssistantPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [neuralMode, setNeuralMode] = useState<'overview' | 'detailed' | 'predictive'>('overview')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen neural-bg flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8 mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-teal-400/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-cyan-500/40 to-teal-400/40 rounded-full border border-cyan-400/50 animate-pulse"></div>
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/60 flex items-center justify-center shadow-xl shadow-cyan-500/20 animate-pulse">
              <img 
                src="/Ash-AI.png" 
                alt="ASH AI Logo" 
                className="w-10 h-10 object-contain z-10 relative filter brightness-110 contrast-110" 
              />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold glitch-text text-white mb-4 drop-shadow-lg" data-text="ASH AI">ASH AI</h1>
          <p className="text-cyan-300 font-medium">Initializing Ashley AI...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return TrendingUp
      case 'alert': return AlertTriangle
      case 'optimization': return Settings
      case 'recommendation': return Target
      default: return Brain
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'production': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'finance': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'inventory': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'orders': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
      case 'users': return 'bg-pink-500/20 text-pink-400 border-pink-500/50'
      case 'system': return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  return (
    <TikTokLayout>
      <TikTokCenteredLayout>
        <TikTokPageHeader
          title="Ashley AI Assistant"
          description="Advanced Neural Intelligence • Real-time ERP Analysis • Predictive Insights"
          icon={<Brain className="h-8 w-8 text-purple-600" />}
          actions={
            <div className="flex gap-2">
              {(['overview', 'detailed', 'predictive'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={neuralMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNeuralMode(mode)}
                  className={neuralMode === mode ? "bg-purple-600 hover:bg-purple-700" : "border-gray-300"}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          }
        />

        {/* AI Status Dashboard */}
        <TikTokMetricsGrid cols={3}>
          {AI_METRICS.map((metric) => (
            <TikTokMetricCard
              key={metric.id}
              title={metric.name}
              value={`${metric.value}${metric.unit}`}
              icon={<metric.icon className="w-4 h-4" />}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
              trend={{
                value: `${metric.trend === 'up' ? '+' : metric.trend === 'down' ? '-' : ''}${Math.abs(metric.change)}${metric.unit}`,
                direction: metric.trend === 'up' ? 'up' as const : metric.trend === 'down' ? 'down' as const : 'neutral' as const
              }}
            />
          ))}
        </TikTokMetricsGrid>

        {/* AI Insights */}
        <TikTokContentCard title="Ashley's Neural Insights & Recommendations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AI_INSIGHTS.map((insight) => {
              const InsightIcon = getInsightIcon(insight.type)
              return (
                <div
                  key={insight.id}
                  onClick={() => setSelectedInsight(insight)}
                  className="p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-all duration-300 cursor-pointer hover:bg-purple-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <InsightIcon className="w-4 h-4 text-purple-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                          {insight.category}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${
                          insight.impact === 'high' ? 'border-red-200 text-red-700 bg-red-50' :
                          insight.impact === 'medium' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                          'border-blue-200 text-blue-700 bg-blue-50'
                        }`}>
                          {insight.impact} impact
                        </Badge>
                        {insight.actionRequired && (
                          <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                            Action Required
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-semibold mb-2 text-gray-900">{insight.title}</h4>
                      <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {insight.type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </TikTokContentCard>

        {/* Detailed Insight Modal */}
        {selectedInsight && (
          <TikTokContentCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold">Detailed Analysis</h3>
              </div>
              <Button
                onClick={() => setSelectedInsight(null)}
                variant="outline"
                size="sm"
                className="border-gray-300"
              >
                Close
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{selectedInsight.title}</h3>
                <p className="text-gray-600 mb-4">{selectedInsight.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Impact Level:</span>
                    <Badge variant="outline" className={
                      selectedInsight.impact === 'high' ? 'border-red-200 text-red-700 bg-red-50' :
                      selectedInsight.impact === 'medium' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                      'border-blue-200 text-blue-700 bg-blue-50'
                    }>
                      {selectedInsight.impact}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Confidence:</span>
                    <span className="text-green-600">
                      {Math.round(selectedInsight.confidence * 100)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Category:</span>
                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
                      {selectedInsight.category}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Recommended Actions:</h4>
                <div className="space-y-2">
                  {selectedInsight.category === 'production' && (
                    <>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-green-700 text-sm">• Schedule maintenance check for affected workstation</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-blue-700 text-sm">• Arrange operator training session</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <p className="text-purple-700 text-sm">• Monitor efficiency metrics daily</p>
                      </div>
                    </>
                  )}
                  
                  {selectedInsight.category === 'inventory' && (
                    <>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-red-700 text-sm">• Place urgent reorder for depleting items</p>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                        <p className="text-yellow-700 text-sm">• Review supplier lead times</p>
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                        <p className="text-cyan-700 text-sm">• Adjust minimum stock levels</p>
                      </div>
                    </>
                  )}
                  
                  {selectedInsight.category === 'finance' && (
                    <>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-green-700 text-sm">• Prepare for increased production capacity</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-blue-700 text-sm">• Review pricing strategy</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TikTokContentCard>
        )}

        {/* Ashley AI System Status */}
        <TikTokMetricsGrid cols={3}>
          <TikTokMetricCard
            title="System Status"
            value="Operational"
            icon={<CheckCircle className="w-4 h-4" />}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
            trend={{
              value: "Neural networks at optimal performance",
              direction: 'neutral' as const
            }}
          />
          
          <TikTokMetricCard
            title="Data Sources"
            value="24/7"
            icon={<Globe className="w-4 h-4" />}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            trend={{
              value: "Continuous data ingestion from all ERP modules",
              direction: 'neutral' as const
            }}
          />
          
          <TikTokMetricCard
            title="Security Level"
            value="Maximum"
            icon={<Shield className="w-4 h-4" />}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
            trend={{
              value: "All AI processes secured with quantum encryption",
              direction: 'neutral' as const
            }}
          />
        </TikTokMetricsGrid>
      </TikTokCenteredLayout>
    </TikTokLayout>
  )
}