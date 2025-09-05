'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Shield,
  Zap,
  Activity,
  BarChart3
} from 'lucide-react'
import { ashAI, type OrderData } from '@/lib/ai-engine'

interface SmartOrderAnalysisProps {
  order: OrderData
  className?: string
}

interface OrderInsights {
  deliveryPrediction: ReturnType<typeof ashAI.predictDeliveryDate>
  riskAssessment: ReturnType<typeof ashAI.assessOrderRisk>
  pricingRecommendation: ReturnType<typeof ashAI.recommendPricing>
}

export function SmartOrderAnalysis({ order, className = '' }: SmartOrderAnalysisProps) {
  const [insights, setInsights] = useState<OrderInsights | null>(null)
  const [loading, setLoading] = useState(true)

  // Generate AI insights for the order
  useEffect(() => {
    const generateInsights = async () => {
      setLoading(true)
      try {
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 600))

        const deliveryPrediction = ashAI.predictDeliveryDate(order)
        const riskAssessment = ashAI.assessOrderRisk(order)
        const pricingRecommendation = ashAI.recommendPricing(order)

        setInsights({
          deliveryPrediction,
          riskAssessment,
          pricingRecommendation
        })
      } catch (error) {
        console.error('AI analysis failed:', error)
      } finally {
        setLoading(false)
      }
    }

    generateInsights()
  }, [order])

  // Calculate days difference
  const daysDifference = useMemo(() => {
    if (!insights) return 0
    const targetDate = new Date(order.targetDeliveryDate)
    const predictedDate = new Date(insights.deliveryPrediction.estimatedDate)
    return Math.round((targetDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24))
  }, [insights, order.targetDeliveryDate])

  if (loading) {
    return (
      <div className={`quantum-card p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="ai-orb-small animate-pulse">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
            <p className="text-cyan-300 text-sm">Processing order insights...</p>
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-cyan-500/20 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-cyan-500/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className={`quantum-card p-6 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Analysis Failed</h3>
          <p className="text-cyan-300 text-sm">Unable to generate AI insights for this order</p>
        </div>
      </div>
    )
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'LOW': return 'text-green-400 bg-green-500/10 border-green-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4" />
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />
      case 'MEDIUM': return <Clock className="w-4 h-4" />
      case 'LOW': return <CheckCircle className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ai-orb-small">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Smart Order Analysis</h3>
            <p className="text-cyan-300 text-sm">AI-powered insights for Order {order.id}</p>
          </div>
        </div>
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
          <Activity className="w-3 h-3 mr-1" />
          Live Analysis
        </Badge>
      </div>

      {/* Delivery Prediction */}
      <div className="quantum-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h4 className="text-white font-semibold">Delivery Prediction</h4>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
            {insights.deliveryPrediction.confidence}% confident
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-cyan-300 mb-2">Predicted Delivery</div>
            <div className="text-xl font-bold text-white mb-1">
              {new Date(insights.deliveryPrediction.estimatedDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className={`text-sm ${daysDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {daysDifference >= 0 ? 
                `${daysDifference} days before deadline` : 
                `${Math.abs(daysDifference)} days after deadline`
              }
            </div>
          </div>

          <div>
            <div className="text-sm text-cyan-300 mb-2">Target Delivery</div>
            <div className="text-xl font-bold text-white mb-1">
              {new Date(order.targetDeliveryDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="text-sm text-cyan-400">Client deadline</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-cyan-300 mb-3">Confidence Score</div>
          <Progress value={insights.deliveryPrediction.confidence} className="h-2" />
        </div>

        {/* Factors */}
        <div className="mt-6">
          <div className="text-sm text-cyan-300 mb-3">Key Factors</div>
          <div className="space-y-2">
            {insights.deliveryPrediction.factors.slice(0, 3).map((factor, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                <span className="text-white">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risks */}
        {insights.deliveryPrediction.risks.length > 0 && (
          <div className="mt-6">
            <div className="text-sm text-cyan-300 mb-3">Risk Factors</div>
            <div className="space-y-2">
              {insights.deliveryPrediction.risks.slice(0, 2).map((risk, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-red-300">{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Risk Assessment */}
      <div className="quantum-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h4 className="text-white font-semibold">Risk Assessment</h4>
          <Badge className={`border ${getRiskColor(insights.riskAssessment.riskLevel)}`}>
            <div className="flex items-center gap-1">
              {getRiskIcon(insights.riskAssessment.riskLevel)}
              {insights.riskAssessment.riskLevel}
            </div>
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-cyan-300 mb-2">Risk Score</div>
            <div className="text-3xl font-bold text-white mb-2">
              {insights.riskAssessment.riskScore}
              <span className="text-lg text-cyan-400">/100</span>
            </div>
            <Progress value={insights.riskAssessment.riskScore} className="h-2" />
          </div>

          <div>
            <div className="text-sm text-cyan-300 mb-2">Risk Level</div>
            <div className={`text-xl font-bold mb-1 ${getRiskColor(insights.riskAssessment.riskLevel).split(' ')[0]}`}>
              {insights.riskAssessment.riskLevel}
            </div>
            <div className="text-sm text-cyan-400">
              {insights.riskAssessment.riskLevel === 'LOW' && 'Order is on track'}
              {insights.riskAssessment.riskLevel === 'MEDIUM' && 'Monitor closely'}
              {insights.riskAssessment.riskLevel === 'HIGH' && 'Requires attention'}
              {insights.riskAssessment.riskLevel === 'CRITICAL' && 'Immediate action needed'}
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        {insights.riskAssessment.riskFactors.length > 0 && (
          <div className="mt-6">
            <div className="text-sm text-cyan-300 mb-3">Risk Factors</div>
            <div className="space-y-2">
              {insights.riskAssessment.riskFactors.slice(0, 3).map((factor, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                  <span className="text-white">{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mitigations */}
        {insights.riskAssessment.mitigations.length > 0 && (
          <div className="mt-6">
            <div className="text-sm text-cyan-300 mb-3">Recommended Actions</div>
            <div className="space-y-2">
              {insights.riskAssessment.mitigations.slice(0, 3).map((mitigation, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Target className="w-3 h-3 text-green-400" />
                  <span className="text-white">{mitigation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Intelligence */}
      <div className="quantum-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h4 className="text-white font-semibold">Pricing Intelligence</h4>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-xs">
            {insights.pricingRecommendation.confidence}% confident
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-cyan-300 mb-2">Suggested Unit Price</div>
            <div className="text-3xl font-bold text-white mb-1">
              ₱{insights.pricingRecommendation.suggestedPrice.toLocaleString()}
            </div>
            <div className="text-sm text-emerald-400">Per unit</div>
          </div>

          <div>
            <div className="text-sm text-cyan-300 mb-2">Total Order Value</div>
            <div className="text-3xl font-bold text-white mb-1">
              ₱{(insights.pricingRecommendation.suggestedPrice * order.totalQty).toLocaleString()}
            </div>
            <div className="text-sm text-cyan-400">
              {order.totalQty} units × ₱{insights.pricingRecommendation.suggestedPrice.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-cyan-300 mb-3">Pricing Analysis</div>
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="text-sm text-white">{insights.pricingRecommendation.competitiveAnalysis}</p>
          </div>
        </div>

        {/* Pricing Factors */}
        <div className="mt-6">
          <div className="text-sm text-cyan-300 mb-3">Pricing Factors</div>
          <div className="space-y-2">
            {insights.pricingRecommendation.factors.slice(0, 4).map((factor, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span className="text-white">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button className="neon-btn-primary flex-1">
          <Zap className="w-4 h-4 mr-2" />
          Apply Recommendations
        </Button>
        <Button className="neon-btn-outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          View Detailed Analysis
        </Button>
      </div>
    </div>
  )
}