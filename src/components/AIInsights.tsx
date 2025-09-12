// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Target,
  Activity,
  BarChart3,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import type { AIInsight } from '@/lib/ai'

interface AIInsightsProps {
  userRole: string
  limit?: number
  showActions?: boolean
}

export function AIInsights({ userRole, limit = 10, showActions = true }: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [])  

  const fetchInsights = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/insights')
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights')
      }
      
      const data = await response.json()
      setInsights(data.slice(0, limit))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const applyAssignmentSuggestion = async (insight: AIInsight) => {
    try {
      const data = insight.data as { taskId: string; suggestedAssignee: string }
      const response = await fetch('/api/ai/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: data.taskId,
          assigneeId: data.suggestedAssignee
        })
      })

      if (response.ok) {
        // Remove the applied insight from the list
        setInsights(prev => prev.filter(i => i.id !== insight.id))
      } else {
        throw new Error('Failed to apply assignment')
      }
    } catch (err) {
      console.error('Error applying assignment:', err)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'ASSIGNMENT':
        return <Users className="w-5 h-5" />
      case 'FORECAST':
        return <TrendingUp className="w-5 h-5" />
      case 'INVENTORY':
        return <Package className="w-5 h-5" />
      case 'PRICING':
        return <DollarSign className="w-5 h-5" />
      case 'ANOMALY':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <Brain className="w-5 h-5" />
    }
  }


  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getInsightIconColor = (type: string) => {
    switch (type) {
      case 'ASSIGNMENT':
        return 'bg-blue-100 text-blue-600 border border-blue-200'
      case 'FORECAST':
        return 'bg-green-100 text-green-600 border border-green-200'
      case 'INVENTORY':
        return 'bg-orange-100 text-orange-600 border border-orange-200'
      case 'PRICING':
        return 'bg-yellow-100 text-yellow-600 border border-yellow-200'
      case 'ANOMALY':
        return 'bg-red-100 text-red-600 border border-red-200'
      default:
        return 'bg-gray-100 text-gray-600 border border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader className="border-b border-white/20 bg-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/30 border border-blue-300/50 animate-pulse">
              <Brain className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white">AI Insights</CardTitle>
              <CardDescription className="text-sm text-white/80">Loading intelligent recommendations...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-lg bg-white/10 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                    <div className="h-3 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader className="border-b border-white/20 bg-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/30 border border-red-300/50">
              <XCircle className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white">AI Insights</CardTitle>
              <CardDescription className="text-sm text-white/80">Failed to load insights</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-red-200 mb-4 font-medium">{error}</p>
          <Button 
            onClick={fetchInsights} 
            className="bg-blue-500/80 hover:bg-blue-500 text-white font-semibold backdrop-blur-sm border border-blue-400/50"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader className="border-b border-white/20 bg-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/30 border border-green-300/50">
              <CheckCircle className="w-5 h-5 text-green-200" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white">AI Insights</CardTitle>
              <CardDescription className="text-sm text-white/80">All systems running optimally</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-white/60 mx-auto mb-4" />
            <p className="text-white/90 text-base font-medium">No recommendations at the moment. Everything looks great! ✨</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
      <CardHeader className="border-b border-white/20 bg-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/30 border border-blue-300/50">
              <Brain className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white">AI Insights</CardTitle>
              <CardDescription className="text-sm text-white/80">
                {insights.length} intelligent recommendation{insights.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={fetchInsights}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/20"
          >
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={insight.id}
              className="group p-4 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white/20 border border-white/30 flex-shrink-0`}>
                  <div className="text-white">
                    {getInsightIcon(insight.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white leading-tight text-base">
                      {insight.title}
                    </h4>
                    <Badge className={`px-3 py-1 text-xs font-semibold rounded-full bg-white/20 text-white border border-white/30 ml-2 flex-shrink-0`}>
                      {insight.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-white/90 text-sm mb-3 leading-relaxed font-medium">
                    {insight.description}
                  </p>

                  {/* Action Buttons */}
                  {showActions && insight.type === 'ASSIGNMENT' && (userRole === 'ADMIN' || userRole === 'MANAGER') ? (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => applyAssignmentSuggestion(insight)}
                        className="bg-blue-500/80 hover:bg-blue-500 text-white text-xs font-semibold backdrop-blur-sm border border-blue-400/50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Apply Suggestion
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white hover:text-white hover:bg-white/20 text-xs border-white/30 backdrop-blur-sm"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  ) : null}

                  {/* Forecast Actions */}
                  {showActions && insight.type === 'FORECAST' && (userRole === 'ADMIN' || userRole === 'MANAGER') ? (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs border-gray-300"
                      >
                        <BarChart3 className="w-4 h-4 mr-1.5" />
                        View Timeline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs border-gray-300"
                      >
                        <Target className="w-4 h-4 mr-1.5" />
                        Optimize
                      </Button>
                    </div>
                  ) : null}

                  {/* Inventory Actions */}
                  {showActions && insight.type === 'INVENTORY' && ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'PURCHASER'].includes(userRole) ? (
                    <div className="flex items-center gap-2 mt-3">
                      {insight.data && typeof insight.data === 'object' && 'action' in insight.data && (insight.data as { action: string }).action === 'RESTOCK' ? (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                        >
                          <Package className="w-4 h-4 mr-1.5" />
                          Create PO
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs border-gray-300"
                      >
                        View Item
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  ) : null}

                  {/* Pricing Actions */}
                  {showActions && insight.type === 'PRICING' && ['ADMIN', 'MANAGER', 'SALES_STAFF'].includes(userRole) ? (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                      >
                        <DollarSign className="w-4 h-4 mr-1.5" />
                        Apply Pricing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs border-gray-300"
                      >
                        Market Analysis
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Time indicator */}
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(insight.created_at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>

              {/* Progress indicator for assignments */}
              {insight.type === 'ASSIGNMENT' && insight.data && typeof insight.data === 'object' && 'confidence' in insight.data && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600 font-medium">Confidence:</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000 rounded-full"
                        style={{ width: `${((insight.data as { confidence: number }).confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-gray-900 font-semibold text-sm">
                      {((insight.data as { confidence: number }).confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}