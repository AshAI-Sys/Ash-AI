// @ts-nocheck
/**
 * Ashley AI Insights Component
 * Real-time AI-powered insights and recommendations for ASH AI ERP
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  BarChart3,
  Lightbulb,
  Shield,
  DollarSign,
  Users,
  Package,
  Activity
} from 'lucide-react'

interface AshleyInsight {
  id: string
  type: 'ALERT' | 'RECOMMENDATION' | 'FORECAST' | 'OPTIMIZATION' | 'PERFORMANCE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'PRODUCTION' | 'QUALITY' | 'FINANCE' | 'HR' | 'INVENTORY' | 'DELIVERY'
  title: string
  description: string
  impact_score: number
  confidence: number
  actionable: boolean
  created_at: string
  data?: Record<string, any>
  recommendations?: string[]
}

interface AshleyInsightsProps {
  workspace_id?: string
  refreshInterval?: number
  maxInsights?: number
}

const getInsightIcon = (type: string) => {
  const icons = {
    'ALERT': <AlertTriangle className="w-5 h-5 text-red-500" />,
    'RECOMMENDATION': <Lightbulb className="w-5 h-5 text-yellow-500" />,
    'FORECAST': <TrendingUp className="w-5 h-5 text-blue-500" />,
    'OPTIMIZATION': <Zap className="w-5 h-5 text-purple-500" />,
    'PERFORMANCE': <BarChart3 className="w-5 h-5 text-green-500" />
  }
  return icons[type as keyof typeof icons] || <Brain className="w-5 h-5 text-gray-500" />
}

const getCategoryIcon = (category: string) => {
  const icons = {
    'PRODUCTION': <Package className="w-4 h-4" />,
    'QUALITY': <Shield className="w-4 h-4" />,
    'FINANCE': <DollarSign className="w-4 h-4" />,
    'HR': <Users className="w-4 h-4" />,
    'INVENTORY': <Package className="w-4 h-4" />,
    'DELIVERY': <Target className="w-4 h-4" />
  }
  return icons[category as keyof typeof icons] || <Activity className="w-4 h-4" />
}

const getPriorityColor = (priority: string) => {
  const colors = {
    'LOW': 'bg-gray-100 text-gray-700 border-gray-300',
    'MEDIUM': 'bg-blue-100 text-blue-700 border-blue-300',
    'HIGH': 'bg-orange-100 text-orange-700 border-orange-300',
    'CRITICAL': 'bg-red-100 text-red-700 border-red-300'
  }
  return colors[priority as keyof typeof colors] || colors.LOW
}

export default function AshleyInsights({ 
  workspace_id = 'default', 
  refreshInterval = 300000, // 5 minutes
  maxInsights = 8 
}: AshleyInsightsProps) {
  const [insights, setInsights] = useState<AshleyInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    loadInsights()
    const interval = setInterval(loadInsights, refreshInterval)
    return () => clearInterval(interval)
  }, [workspace_id, refreshInterval])

  const loadInsights = async () => {
    try {
      setError(null)
      
      // For demo purposes, generate simulated insights
      const simulatedInsights = generateSimulatedInsights()
      setInsights(simulatedInsights.slice(0, maxInsights))
      setLastUpdate(new Date())
      
      // In production, this would call the actual API
      // const response = await fetch(`/api/ai/ashley/insights?workspace_id=${workspace_id}`)
      // if (response.ok) {
      //   const data = await response.json()
      //   setInsights(data.insights.slice(0, maxInsights))
      // }
    } catch (err) {
      console.error('Failed to load Ashley insights:', err)
      setError('Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }

  const generateSimulatedInsights = (): AshleyInsight[] => {
    const now = new Date()
    
    return [
      {
        id: '1',
        type: 'ALERT',
        priority: 'HIGH',
        category: 'PRODUCTION',
        title: 'Capacity Bottleneck Detected',
        description: 'Silkscreen station will reach 95% capacity next week based on current orders.',
        impact_score: 8.5,
        confidence: 0.89,
        actionable: true,
        created_at: now.toISOString(),
        recommendations: [
          'Schedule overtime for silkscreen operators',
          'Consider outsourcing 20% of silkscreen work',
          'Delay non-urgent orders by 2-3 days'
        ]
      },
      {
        id: '2',
        type: 'FORECAST',
        priority: 'MEDIUM',
        category: 'FINANCE',
        title: 'Revenue Forecast Updated',
        description: 'Projected to exceed monthly revenue target by 12% based on current pipeline.',
        impact_score: 7.2,
        confidence: 0.82,
        actionable: false,
        created_at: new Date(now.getTime() - 30000).toISOString(),
        data: { projected_revenue: 450000, target_revenue: 402000 }
      },
      {
        id: '3',
        type: 'OPTIMIZATION',
        priority: 'MEDIUM',
        category: 'INVENTORY',
        title: 'Material Purchase Optimization',
        description: 'Switching to bulk orders for cotton fabric can reduce costs by 8.5%.',
        impact_score: 6.8,
        confidence: 0.94,
        actionable: true,
        created_at: new Date(now.getTime() - 120000).toISOString(),
        recommendations: [
          'Place bulk order for 2000m white cotton',
          'Consolidate fabric purchases with supplier A',
          'Review quarterly contract pricing'
        ]
      },
      {
        id: '4',
        type: 'PERFORMANCE',
        priority: 'LOW',
        category: 'QUALITY',
        title: 'QC Performance Improvement',
        description: 'Defect rate has decreased by 15% this month - excellent progress!',
        impact_score: 5.5,
        confidence: 0.96,
        actionable: false,
        created_at: new Date(now.getTime() - 180000).toISOString(),
        data: { current_defect_rate: 0.018, previous_defect_rate: 0.021 }
      },
      {
        id: '5',
        type: 'RECOMMENDATION',
        priority: 'MEDIUM',
        category: 'HR',
        title: 'Training Recommendation',
        description: 'Sewing operators could benefit from advanced DTF application training.',
        impact_score: 6.0,
        confidence: 0.78,
        actionable: true,
        created_at: new Date(now.getTime() - 240000).toISOString(),
        recommendations: [
          'Schedule DTF training for 6 operators',
          'Contact training provider for group discount',
          'Plan training during low-capacity period'
        ]
      },
      {
        id: '6',
        type: 'ALERT',
        priority: 'CRITICAL',
        category: 'DELIVERY',
        title: 'Delivery Risk Identified',
        description: 'Order PO-2024-1125 at risk of missing deadline due to material delays.',
        impact_score: 9.2,
        confidence: 0.91,
        actionable: true,
        created_at: new Date(now.getTime() - 300000).toISOString(),
        recommendations: [
          'Contact client about 2-day delay',
          'Expedite material delivery',
          'Consider partial shipment if client agrees'
        ]
      }
    ]
  }

  const handleInsightAction = (insight: AshleyInsight) => {
    // In a real implementation, this would trigger workflow actions
    if (process.env.NODE_ENV === 'development') {
      console.log('Acting on insight:', insight.id)
    }
    // TODO: Implement actual workflow actions
  }

  if (loading && insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <CardTitle>Ashley AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading AI insights...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Brain className="w-5 h-5 text-blue-600" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <CardTitle>Ashley AI Insights</CardTitle>
          </div>
          <div className="text-xs text-muted-foreground">
            {lastUpdate && `Updated ${lastUpdate.toLocaleTimeString()}`}
          </div>
        </div>
        <CardDescription>
          Real-time AI-powered recommendations and alerts for your operations
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(insight.priority)}`}
                      >
                        {insight.priority}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        {getCategoryIcon(insight.category)}
                        <span>{insight.category}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {insight.description}
                    </p>

                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-gray-700">Recommendations:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-2">
                          {insight.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Target className="w-3 h-3" />
                          <span>Impact: {insight.impact_score}/10</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(insight.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {insight.actionable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInsightAction(insight)}
                          className="text-xs"
                        >
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {insights.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No insights available at the moment</p>
            <p className="text-xs">Ashley is analyzing your data...</p>
          </div>
        )}

        {insights.length > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <Button variant="ghost" size="sm" onClick={loadInsights} disabled={loading}>
              <Brain className="w-4 h-4 mr-1" />
              {loading ? 'Refreshing...' : 'Refresh Insights'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}