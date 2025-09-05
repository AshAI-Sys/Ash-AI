'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  BarChart3,
  Lightbulb,
  Zap,
  Activity
} from 'lucide-react'
import type { ForecastResult } from '@/lib/ai'

interface AIForecastingProps {
  orderIds?: string[]
  showDetails?: boolean
}

export function AIForecasting({ orderIds, showDetails = true }: AIForecastingProps) {
  const [forecasts, setForecasts] = useState<ForecastResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchForecasts()
  }, [orderIds])  

  const fetchForecasts = async () => {
    try {
      setIsLoading(true)
      const params = orderIds ? `?orderIds=${orderIds.join(',')}` : ''
      const response = await fetch(`/api/ai/forecasts${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setForecasts(data)
      }
    } catch (error) {
      console.error('Error fetching forecasts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'from-green-400 to-green-500'
    if (confidence >= 0.6) return 'from-yellow-400 to-yellow-500'
    return 'from-red-400 to-red-500'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence'
    if (confidence >= 0.6) return 'Medium confidence'
    return 'Low confidence'
  }

  const getDaysUntilCompletion = (date: Date) => {
    const today = new Date()
    const diffTime = new Date(date).getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'bg-red-500/20 text-red-300 border-red-500/30'
    if (days <= 7) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    return 'bg-green-500/20 text-green-300 border-green-500/30'
  }

  const getUrgencyIcon = (days: number) => {
    if (days <= 3) return <Zap className="w-4 h-4" />
    if (days <= 7) return <AlertTriangle className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500 animate-pulse">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">AI Project Forecasting</CardTitle>
              <CardDescription className="text-white/70">Analyzing completion timelines...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (forecasts.length === 0) {
    return (
      <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">AI Project Forecasting</CardTitle>
              <CardDescription className="text-white/70">No active projects to forecast</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">All projects are completed or no active orders found.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-none shadow-modern-lg backdrop-blur-xl slide-in-up">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500 float">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-white">AI Project Forecasting</CardTitle>
            <CardDescription className="text-white/70">
              {forecasts.length} project timeline{forecasts.length !== 1 ? 's' : ''} analyzed
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {forecasts.map((forecast, index) => {
            const daysLeft = getDaysUntilCompletion(forecast.estimatedCompletionDate)
            
            return (
              <div
                key={forecast.orderId}
                className="group p-5 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 stagger-animation border border-white/10 hover:border-white/20"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-gradient">
                        Order #{forecast.orderId.slice(-8)}
                      </h4>
                      <p className="text-sm text-white/70">
                        Estimated completion: {forecast.estimatedCompletionDate.toDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={`px-3 py-1 text-sm border ${getUrgencyColor(daysLeft)}`}>
                    <div className="flex items-center gap-1">
                      {getUrgencyIcon(daysLeft)}
                      {daysLeft > 0 ? `${daysLeft} days` : 'Overdue'}
                    </div>
                  </Badge>
                </div>

                {/* Confidence Indicator */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/70">Forecast confidence:</span>
                    <span className="text-white font-medium">
                      {getConfidenceText(forecast.confidence)} ({(forecast.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getConfidenceColor(forecast.confidence)} transition-all duration-1000`}
                      style={{ width: `${(forecast.confidence * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>

                {/* Critical Path */}
                {showDetails && (
                  <div className="mb-4">
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Critical Path
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {forecast.criticalPath.map((step, stepIndex) => (
                        <div
                          key={stepIndex}
                          className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-white/80"
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            stepIndex === 0 ? 'bg-green-400' :
                            stepIndex < forecast.criticalPath.length / 2 ? 'bg-yellow-400' :
                            'bg-white/40'
                          }`} />
                          {step.replace('_', ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {forecast.riskFactors.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      Risk Factors
                    </h5>
                    <div className="space-y-1">
                      {forecast.riskFactors.map((risk, riskIndex) => (
                        <div
                          key={riskIndex}
                          className="flex items-center gap-2 text-sm text-yellow-300 bg-yellow-500/10 px-3 py-2 rounded-lg"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          {risk}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {forecast.recommendations.length > 0 && showDetails && (
                  <div>
                    <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-400" />
                      AI Recommendations
                    </h5>
                    <div className="space-y-1">
                      {forecast.recommendations.map((rec, recIndex) => (
                        <div
                          key={recIndex}
                          className="flex items-center gap-2 text-sm text-blue-300 bg-blue-500/10 px-3 py-2 rounded-lg"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline visualization */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/70" />
                      <span className="text-white/70">Timeline</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white/70">Started</span>
                      <div className="flex-1 h-1 bg-white/10 rounded-full min-w-[100px] relative overflow-hidden">
                        {/* Progress bar based on confidence and risk factors */}
                        <div 
                          className={`h-full bg-gradient-to-r ${getConfidenceColor(forecast.confidence)} transition-all duration-1000`}
                          style={{ 
                            width: `${Math.max(20, forecast.confidence * 60)}%` 
                          }} 
                        />
                        {/* Current position indicator */}
                        <div className="absolute top-0 right-0 w-1 h-full bg-white/50" />
                      </div>
                      <span className="text-white/70">Complete</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-white/5">
              <Activity className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {forecasts.filter(f => getDaysUntilCompletion(f.estimatedCompletionDate) <= 7).length}
              </div>
              <div className="text-sm text-white/70">Due This Week</div>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-white/5">
              <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {(forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-white/70">Avg Confidence</div>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-white/5">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {forecasts.filter(f => f.riskFactors.length > 0).length}
              </div>
              <div className="text-sm text-white/70">At Risk Projects</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}