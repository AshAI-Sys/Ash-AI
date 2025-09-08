'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import EnhancedLayout from '@/components/EnhancedLayout'
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
  Eye
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
    <EnhancedLayout>
      <div className="neural-bg min-h-screen relative">
        <div className="quantum-field">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>
        
        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="ai-orb">
                  <Brain className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold glitch-text text-white" data-text="ASHLEY AI COMMAND CENTER">
                    ASHLEY AI COMMAND CENTER
                  </h1>
                  <p className="text-cyan-300 font-mono mt-2">
                    Advanced Neural Intelligence • Real-time ERP Analysis • Predictive Insights
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {(['overview', 'detailed', 'predictive'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNeuralMode(mode)}
                    className={`neon-btn-outline ${neuralMode === mode ? 'text-cyan-400 border-cyan-400' : ''}`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Status Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {AI_METRICS.map((metric) => {
              const IconComponent = metric.icon
              return (
                <Card key={metric.id} className="quantum-card border-cyan-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="ai-orb-small">
                          <IconComponent className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm text-cyan-300 font-mono">{metric.category}</p>
                          <h3 className="text-lg font-bold text-white">{metric.name}</h3>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {metric.value}{metric.unit}
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${
                          metric.trend === 'up' ? 'text-green-400' : 
                          metric.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {metric.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : metric.trend === 'down' ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <Activity className="w-4 h-4" />
                          )}
                          {Math.abs(metric.change)}{metric.unit}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-3">{metric.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* AI Insights */}
          <Card className="quantum-card border-purple-500/30 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <div className="ai-orb mr-3">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                NEURAL INSIGHTS & RECOMMENDATIONS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {AI_INSIGHTS.map((insight) => {
                  const InsightIcon = getInsightIcon(insight.type)
                  return (
                    <div
                      key={insight.id}
                      onClick={() => setSelectedInsight(insight)}
                      className="p-4 rounded-lg border border-gray-600/30 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer hover:bg-slate-800/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="ai-orb-small">
                          <InsightIcon className="w-4 h-4 text-cyan-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getCategoryColor(insight.category)}>
                              {insight.category.toUpperCase()}
                            </Badge>
                            <Badge className={getImpactColor(insight.impact)}>
                              {insight.impact.toUpperCase()} IMPACT
                            </Badge>
                            {insight.actionRequired && (
                              <div className="neural-pulse">
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                                  ACTION REQUIRED
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          <h4 className="text-white font-semibold mb-2">{insight.title}</h4>
                          <p className="text-cyan-300 text-sm mb-3">{insight.description}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-400 font-mono">
                                {Math.round(insight.confidence * 100)}% CONFIDENCE
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-400 font-mono">
                              {insight.type.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Insight Modal */}
          {selectedInsight && (
            <Card className="quantum-card border-cyan-500/30 mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center">
                    <div className="ai-orb mr-3">
                      <Eye className="w-6 h-6 text-cyan-400" />
                    </div>
                    DETAILED ANALYSIS
                  </div>
                  <Button
                    onClick={() => setSelectedInsight(null)}
                    className="neon-btn-outline"
                  >
                    CLOSE
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">{selectedInsight.title}</h3>
                    <p className="text-cyan-300 mb-4">{selectedInsight.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Impact Level:</span>
                        <Badge className={getImpactColor(selectedInsight.impact)}>
                          {selectedInsight.impact.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Confidence:</span>
                        <span className="text-green-400 font-mono">
                          {Math.round(selectedInsight.confidence * 100)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Category:</span>
                        <Badge className={getCategoryColor(selectedInsight.category)}>
                          {selectedInsight.category.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Recommended Actions:</h4>
                    <div className="space-y-2">
                      {selectedInsight.category === 'production' && (
                        <>
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-green-400 text-sm">• Schedule maintenance check for affected workstation</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-blue-400 text-sm">• Arrange operator training session</p>
                          </div>
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-purple-400 text-sm">• Monitor efficiency metrics daily</p>
                          </div>
                        </>
                      )}
                      
                      {selectedInsight.category === 'inventory' && (
                        <>
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-sm">• Place urgent reorder for depleting items</p>
                          </div>
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-yellow-400 text-sm">• Review supplier lead times</p>
                          </div>
                          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <p className="text-cyan-400 text-sm">• Adjust minimum stock levels</p>
                          </div>
                        </>
                      )}
                      
                      {selectedInsight.category === 'finance' && (
                        <>
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-green-400 text-sm">• Prepare for increased production capacity</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-blue-400 text-sm">• Review pricing strategy</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Neural System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="quantum-card border-green-500/30">
              <CardContent className="p-6 text-center">
                <div className="ai-orb mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">System Status</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  ALL SYSTEMS OPERATIONAL
                </Badge>
                <p className="text-xs text-gray-400 mt-3">
                  Neural networks running at optimal performance
                </p>
              </CardContent>
            </Card>

            <Card className="quantum-card border-blue-500/30">
              <CardContent className="p-6 text-center">
                <div className="ai-orb mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Data Sources</h3>
                <div className="text-2xl font-bold text-blue-400 mb-2">24/7</div>
                <p className="text-xs text-gray-400">
                  Continuous data ingestion from all ERP modules
                </p>
              </CardContent>
            </Card>

            <Card className="quantum-card border-purple-500/30">
              <CardContent className="p-6 text-center">
                <div className="ai-orb mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Security Level</h3>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                  MAXIMUM ENCRYPTION
                </Badge>
                <p className="text-xs text-gray-400 mt-3">
                  All AI processes secured with quantum encryption
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EnhancedLayout>
  )
}