// @ts-nocheck
'use client'

// 🤖 ASH AI - Advanced Predictive Analytics Dashboard
// AI-powered insights and forecasting visualization

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  LineChart,
  PieChart,
  Zap,
  Clock,
  DollarSign,
  Users,
  Package,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { PredictionResult, predictiveEngine } from '@/lib/ai/predictive-engine'

interface PredictionCard {
  title: string
  type: 'efficiency' | 'quality' | 'demand' | 'cost' | 'capacity'
  status: 'loading' | 'success' | 'warning' | 'error'
  data?: PredictionResult
  icon: any
}

export function PredictiveAnalyticsDashboard() {
  const [predictions, setPredictions] = useState<PredictionCard[]>([
    { title: 'Production Efficiency', type: 'efficiency', status: 'loading', icon: TrendingUp },
    { title: 'Quality Forecast', type: 'quality', status: 'loading', icon: Target },
    { title: 'Demand Prediction', type: 'demand', status: 'loading', icon: BarChart3 },
    { title: 'Cost Optimization', type: 'cost', status: 'loading', icon: DollarSign },
    { title: 'Capacity Planning', type: 'capacity', status: 'loading', icon: Users }
  ])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadPredictions()
  }, [])

  const loadPredictions = async () => {
    setIsRefreshing(true)
    
    try {
      // Load all predictions in parallel
      const results = await Promise.allSettled([
        predictiveEngine.predictProductionEfficiency('sample-order-id'),
        predictiveEngine.predictQualityIssues('sample-order-id', 'PRINTING'),
        predictiveEngine.forecastDemand('Tee', 90),
        predictiveEngine.analyzeCostOptimization('sample-order-id', { materials: 1000, labor: 500 }),
        predictiveEngine.predictCapacityRequirements(30)
      ])

      setPredictions(prev => prev.map((pred, index) => {
        const result = results[index]
        return {
          ...pred,
          status: result.status === 'fulfilled' ? 'success' : 'error',
          data: result.status === 'fulfilled' ? result.value as PredictionResult : undefined
        }
      }))
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load predictions:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Loading</Badge>
    }
  }

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`
  }

  const renderPredictionContent = (prediction: PredictionCard) => {
    if (prediction.status === 'loading') {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )
    }

    if (prediction.status === 'error' || !prediction.data) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load prediction data. Please try refreshing.
          </AlertDescription>
        </Alert>
      )
    }

    const { data } = prediction
    const Icon = prediction.icon

    return (
      <div className="space-y-4">
        {/* Header with confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-blue-600" />
            <span className="font-medium">{prediction.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getConfidenceColor(data.confidence)}`}>
              {formatConfidence(data.confidence)} confident
            </span>
            {getStatusBadge(prediction.status)}
          </div>
        </div>

        {/* Prediction visualization */}
        {prediction.type === 'efficiency' && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Expected Efficiency</span>
              <span className="font-medium">{data.prediction.efficiency}%</span>
            </div>
            <Progress value={data.prediction.efficiency} className="h-2" />
            
            {data.prediction.bottlenecks?.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Bottlenecks detected:</strong> {data.prediction.bottlenecks.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {prediction.type === 'quality' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Defect Probability</span>
                <div className="font-medium text-lg">
                  {data.prediction.defectProbability || '2.3'}%
                </div>
              </div>
              <div>
                <span className="text-gray-600">Risk Level</span>
                <div className="font-medium text-lg">
                  {data.prediction.riskLevel || 'LOW'}
                </div>
              </div>
            </div>
            
            {data.prediction.criticalPoints?.length > 0 && (
              <div>
                <span className="text-sm font-medium">Critical Control Points:</span>
                <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
                  {data.prediction.criticalPoints.map((point: string, index: number) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {prediction.type === 'cost' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Potential Savings</span>
                <div className="font-medium text-lg text-green-600">
                  ₱{data.prediction.potentialSavings?.toLocaleString() || '25,000'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">ROI</span>
                <div className="font-medium text-lg">
                  {data.prediction.roi || '15.2'}%
                </div>
              </div>
            </div>
          </div>
        )}

        {prediction.type === 'capacity' && (
          <div className="space-y-3">
            {data.prediction.bottlenecks?.map((bottleneck: string, index: number) => (
              <Alert key={index} className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong>Capacity constraint:</strong> {bottleneck}
                </AlertDescription>
              </Alert>
            ))}
            
            <div className="text-sm">
              <span className="font-medium">Recommended Actions:</span>
              <ul className="list-disc list-inside mt-1 text-gray-600">
                {data.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Key factors */}
        {data.factors.length > 0 && (
          <div>
            <span className="text-sm font-medium">Key Factors:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.factors.map((factor, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {factor.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div>
            <span className="text-sm font-medium">Recommendations:</span>
            <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
              {data.recommendations.slice(0, 2).map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
          <span>Model: {data.modelVersion}</span>
          <span>Timeframe: {data.timeframe}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI Predictive Analytics
          </h2>
          <p className="text-gray-600">
            Advanced machine learning insights for production optimization
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            onClick={loadPredictions}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Status Indicator */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Ashley AI Active</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-sm text-gray-600">
              Running {predictions.length} predictive models
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="text-sm text-gray-600">
              {predictions.filter(p => p.status === 'success').length} models healthy
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prediction Cards */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.map((prediction, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{prediction.title}</CardTitle>
                  <CardDescription>
                    AI-powered {prediction.type} analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderPredictionContent(prediction)}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictions
              .filter(p => ['efficiency', 'quality', 'capacity'].includes(p.type))
              .map((prediction, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{prediction.title}</CardTitle>
                    <CardDescription>
                      Production optimization insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderPredictionContent(prediction)}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {predictions
              .filter(p => ['demand', 'cost'].includes(p.type))
              .map((prediction, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{prediction.title}</CardTitle>
                    <CardDescription>
                      Business intelligence and optimization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderPredictionContent(prediction)}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights Summary</CardTitle>
              <CardDescription>
                Key insights and recommendations from all predictive models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {predictions
                .filter(p => p.status === 'success' && p.data?.recommendations.length > 0)
                .map((prediction, index) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4">
                    <h4 className="font-medium text-sm">{prediction.title}</h4>
                    <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
                      {prediction.data!.recommendations.map((rec, recIndex) => (
                        <li key={recIndex}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PredictiveAnalyticsDashboard