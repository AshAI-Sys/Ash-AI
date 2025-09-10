'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  Clock,
  DollarSign,
  Package,
  CheckCircle,
  RefreshCw,
  Lightbulb,
  Shield,
  Activity,
  BarChart3
} from 'lucide-react'
import { ashAI, type AIInsight, type OrderData } from '@/lib/ai-engine'

interface AIInsightsDashboardProps {
  orders: OrderData[]
  className?: string
}

export function AIInsightsDashboard({ orders, className = '' }: AIInsightsDashboardProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Generate AI insights
  const generateInsights = async () => {
    setLoading(true)
    try {
      // Simulate AI processing time for realism
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const aiInsights = ashAI.optimizeProduction(orders)
      setInsights(aiInsights)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('AI analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orders.length > 0) {
      generateInsights()
    }
  }, [orders])

  // AI-powered statistics
  const aiStats = useMemo(() => {
    if (orders.length === 0) return null

    const predictions = orders.map(order => ashAI.predictDeliveryDate(order))
    const risks = orders.map(order => ashAI.assessOrderRisk(order))
    const pricing = orders.map(order => ashAI.recommendPricing(order))
    const resources = ashAI.allocateResources(orders)

    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    const highRiskCount = risks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length
    const avgPricing = pricing.reduce((sum, p) => sum + p.suggestedPrice, 0) / pricing.length
    const totalRevenuePotential = pricing.reduce((sum, p, i) => sum + (p.suggestedPrice * orders[i].total_qty), 0)

    return {
      avgConfidence: Math.round(avgConfidence),
      highRiskCount,
      avgPricing: Math.round(avgPricing),
      totalRevenuePotential,
      efficiency: resources.efficiency,
      predictedDelays: predictions.filter(p => p.risks.length > 0).length
    }
  }, [orders])

  const getSeverityIcon = (severity: AIInsight['severity']) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'HIGH': return <AlertTriangle className="w-5 h-5 text-orange-400" />
      case 'MEDIUM': return <Clock className="w-5 h-5 text-yellow-400" />
      case 'LOW': return <CheckCircle className="w-5 h-5 text-green-400" />
    }
  }

  const getTypeIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'RISK': return <Shield className="w-4 h-4" />
      case 'OPPORTUNITY': return <Lightbulb className="w-4 h-4" />
      case 'OPTIMIZATION': return <Target className="w-4 h-4" />
      case 'PREDICTION': return <TrendingUp className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'RISK': return 'bg-red-100 text-red-800 border-red-200'
      case 'OPPORTUNITY': return 'bg-green-100 text-green-800 border-green-200'
      case 'OPTIMIZATION': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREDICTION': return 'bg-purple-100 text-purple-800 border-purple-200'
    }
  }

  if (!aiStats && orders.length === 0) {
    return (
      <div className={`quantum-card p-8 text-center ${className}`}>
        <Brain className="w-16 h-16 mx-auto text-cyan-400/50 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">ASH AI Ready</h3>
        <p className="text-cyan-300">Add orders to see AI-powered insights and recommendations</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ai-orb">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">ASH AI Insights</h2>
            <p className="text-cyan-300 text-sm">
              Powered by advanced machine learning • Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Button
          onClick={generateInsights}
          disabled={loading}
          className="neon-btn-outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* AI Stats Cards */}
      {aiStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="quantum-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-300 text-sm font-medium">AI Confidence</span>
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-2">{aiStats.avgConfidence}%</div>
            <Progress value={aiStats.avgConfidence} className="h-2" />
          </div>

          <div className="quantum-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-300 text-sm font-medium">High Risk Orders</span>
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">{aiStats.highRiskCount}</div>
            <div className="text-xs text-cyan-400">
              {Math.round((aiStats.highRiskCount / orders.length) * 100)}% of total
            </div>
          </div>

          <div className="quantum-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-300 text-sm font-medium">Predicted Delays</span>
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{aiStats.predictedDelays}</div>
            <div className="text-xs text-cyan-400">
              Require immediate attention
            </div>
          </div>

          <div className="quantum-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-300 text-sm font-medium">Production Efficiency</span>
              <BarChart3 className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(aiStats.efficiency)}%</div>
            <Progress value={aiStats.efficiency} className="h-2 mt-2" />
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="quantum-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-6 h-6 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Intelligent Recommendations</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
            {insights.length} insights
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4 p-4 border border-cyan-500/20 rounded-lg">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-cyan-500/20 rounded w-3/4"></div>
                    <div className="h-3 bg-cyan-500/10 rounded w-full"></div>
                    <div className="h-3 bg-cyan-500/10 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4" />
            <h4 className="text-white font-semibold mb-2">All Systems Optimal</h4>
            <p className="text-cyan-300 text-sm">
              No critical issues detected. Production running smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="group border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-400/40 transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(insight.severity)}
                      <Badge className={`${getTypeColor(insight.type)} border text-xs`}>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(insight.type)}
                          {insight.type}
                        </div>
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="text-white font-semibold group-hover:text-cyan-300 transition-colors">
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-cyan-400">
                        <Brain className="w-3 h-3" />
                        {insight.confidence}% confident
                      </div>
                    </div>
                    
                    <p className="text-cyan-300 text-sm mt-1 mb-3">
                      {insight.description}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <div>
                            <span className="text-yellow-400 text-sm font-medium">Recommendation:</span>
                            <p className="text-white text-sm mt-1">{insight.recommendation}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-green-400 mt-0.5" />
                          <div>
                            <span className="text-green-400 text-sm font-medium">Expected Impact:</span>
                            <p className="text-white text-sm mt-1">{insight.impact}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue Optimization */}
      {aiStats && (
        <div className="quantum-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Revenue Optimization</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-cyan-300 mb-2">Total Revenue Potential</div>
              <div className="text-3xl font-bold text-white mb-1">
                ₱{aiStats.totalRevenuePotential.toLocaleString()}
              </div>
              <div className="text-sm text-emerald-400">
                Based on AI-optimized pricing
              </div>
            </div>
            
            <div>
              <div className="text-sm text-cyan-300 mb-2">Average Unit Price</div>
              <div className="text-3xl font-bold text-white mb-1">
                ₱{aiStats.avgPricing.toLocaleString()}
              </div>
              <div className="text-sm text-cyan-400">
                Competitive market positioning
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}