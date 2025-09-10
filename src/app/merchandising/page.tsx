'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Brain, Target, Sparkles, Calendar, BarChart3, PieChart, LineChart, RefreshCw } from 'lucide-react'

interface TrendInsight {
  id: string
  category: 'COLOR' | 'DESIGN' | 'SEASON' | 'DEMOGRAPHIC'
  insight: string
  confidence: number
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  timeframe: string
  dataPoints: number
  created_at: string
}

interface ForecastData {
  productType: string
  predicted_demand: number
  confidence_interval: {
    lower: number
    upper: number
  }
  seasonal_factor: number
  trend_factor: number
  period: string
}

interface ReprintRecommendation {
  id: string
  orderNumber: string
  originalQuantity: number
  suggestedQuantity: number
  reasoning: string
  confidence: number
  potentialRevenue: number
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  created_at: string
}

export default function MerchandisingPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('insights')
  const [trends, setTrends] = useState<TrendInsight[]>([])
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [reprints, setReprints] = useState<ReprintRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMerchandisingData()
  }, [])

  const fetchMerchandisingData = async () => {
    setLoading(true)
    try {
      // Mock data for demonstration
      setTrends([
        {
          id: '1',
          category: 'COLOR',
          insight: 'Pastel colors showing 45% increase in demand this quarter, particularly mint green and coral pink',
          confidence: 87,
          impact: 'HIGH',
          timeframe: 'Next 3 months',
          dataPoints: 1250,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          category: 'DESIGN',
          insight: 'Minimalist text-based designs outperforming graphic-heavy designs by 32%',
          confidence: 92,
          impact: 'MEDIUM',
          timeframe: 'Next 2 months',
          dataPoints: 890,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          category: 'SEASON',
          insight: 'Early summer preparation showing strong correlation with UV-reactive prints',
          confidence: 78,
          impact: 'MEDIUM',
          timeframe: 'Next 6 weeks',
          dataPoints: 560,
          created_at: new Date().toISOString()
        }
      ])

      setForecasts([
        {
          productType: 'T-Shirts',
          predicted_demand: 1250,
          confidence_interval: { lower: 1100, upper: 1400 },
          seasonal_factor: 1.2,
          trend_factor: 1.05,
          period: 'Next 30 days'
        },
        {
          productType: 'Hoodies',
          predicted_demand: 680,
          confidence_interval: { lower: 600, upper: 760 },
          seasonal_factor: 0.8,
          trend_factor: 1.15,
          period: 'Next 30 days'
        },
        {
          productType: 'Jerseys',
          predicted_demand: 420,
          confidence_interval: { lower: 380, upper: 480 },
          seasonal_factor: 1.1,
          trend_factor: 0.95,
          period: 'Next 30 days'
        }
      ])

      setReprints([
        {
          id: '1',
          orderNumber: 'ORD-2024-1156',
          originalQuantity: 500,
          suggestedQuantity: 300,
          reasoning: 'Similar designs showing 85% reorder rate. Customer segment highly engaged.',
          confidence: 89,
          potentialRevenue: 45000,
          urgency: 'HIGH',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          orderNumber: 'ORD-2024-1089',
          originalQuantity: 200,
          suggestedQuantity: 150,
          reasoning: 'Color variant trending upward. Limited time opportunity.',
          confidence: 76,
          potentialRevenue: 22500,
          urgency: 'MEDIUM',
          created_at: new Date().toISOString()
        }
      ])
    } catch (error) {
      console.error('Error fetching merchandising data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50'
    if (confidence >= 75) return 'text-blue-600 bg-blue-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'COLOR': return '🎨'
      case 'DESIGN': return '✨'
      case 'SEASON': return '📅'
      case 'DEMOGRAPHIC': return '👥'
      default: return '📊'
    }
  }

  // Calculate summary metrics
  const totalPredictedDemand = forecasts.reduce((sum, f) => sum + f.predicted_demand, 0)
  const avgConfidence = trends.reduce((sum, t) => sum + t.confidence, 0) / trends.length
  const totalPotentialRevenue = reprints.reduce((sum, r) => sum + r.potentialRevenue, 0)
  const highImpactInsights = trends.filter(t => t.impact === 'HIGH').length

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merchandising AI</h1>
          <p className="text-gray-500 mt-1">AI-powered insights and recommendations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={fetchMerchandisingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Demand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPredictedDemand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days forecast
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgConfidence)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Impact Insights</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highImpactInsights}</div>
            <p className="text-xs text-muted-foreground">
              Critical opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reprint Potential</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{Math.round(totalPotentialRevenue / 1000)}K</div>
            <p className="text-xs text-muted-foreground">
              Revenue opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Trend Insights</TabsTrigger>
          <TabsTrigger value="forecasts">Demand Forecasts</TabsTrigger>
          <TabsTrigger value="reprints">Reprint Recommendations</TabsTrigger>
        </TabsList>

        {/* Trend Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {trends.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
                    <p className="text-gray-500">AI is analyzing data to generate insights.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              trends.map((trend) => (
                <Card key={trend.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl">
                          {getCategoryIcon(trend.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-3">
                            <Badge variant="secondary">{trend.category}</Badge>
                            <Badge className={getImpactColor(trend.impact)}>
                              {trend.impact} Impact
                            </Badge>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(trend.confidence)}`}>
                              {trend.confidence}% confidence
                            </div>
                          </div>
                          
                          <p className="text-gray-800 mb-3 leading-relaxed">
                            {trend.insight}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {trend.timeframe}
                            </span>
                            <span>
                              📊 {trend.dataPoints.toLocaleString()} data points
                            </span>
                            <span>
                              Generated {new Date(trend.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Demand Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          <div className="grid gap-4">
            {forecasts.map((forecast, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <LineChart className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold">{forecast.productType}</h3>
                    </div>
                    <Badge variant="outline">{forecast.period}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {forecast.predicted_demand.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Predicted Demand</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">
                        {forecast.confidence_interval.lower.toLocaleString()} - {forecast.confidence_interval.upper.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Confidence Range</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${forecast.seasonal_factor >= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                        {forecast.seasonal_factor >= 1 ? '+' : ''}{Math.round((forecast.seasonal_factor - 1) * 100)}%
                      </div>
                      <div className="text-sm text-gray-500">Seasonal Factor</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${forecast.trend_factor >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                        {forecast.trend_factor >= 1 ? <TrendingUp className="h-5 w-5 inline" /> : <TrendingDown className="h-5 w-5 inline" />}
                        {forecast.trend_factor >= 1 ? '+' : ''}{Math.round((forecast.trend_factor - 1) * 100)}%
                      </div>
                      <div className="text-sm text-gray-500">Trend Factor</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Reprint Recommendations Tab */}
        <TabsContent value="reprints" className="space-y-4">
          <div className="grid gap-4">
            {reprints.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reprint recommendations</h3>
                    <p className="text-gray-500">AI will suggest reprints when opportunities are identified.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              reprints.map((reprint) => (
                <Card key={reprint.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-3">
                          <h3 className="text-lg font-semibold">{reprint.orderNumber}</h3>
                          <Badge className={getUrgencyColor(reprint.urgency)}>
                            {reprint.urgency} Priority
                          </Badge>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(reprint.confidence)}`}>
                            {reprint.confidence}% confidence
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          {reprint.reasoning}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="font-medium text-gray-600">Original Quantity</div>
                            <div className="text-xl font-bold">{reprint.originalQuantity.toLocaleString()}</div>
                          </div>
                          
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-medium text-blue-600">Suggested Quantity</div>
                            <div className="text-xl font-bold text-blue-700">{reprint.suggestedQuantity.toLocaleString()}</div>
                          </div>
                          
                          <div className="bg-green-50 p-3 rounded">
                            <div className="font-medium text-green-600">Potential Revenue</div>
                            <div className="text-xl font-bold text-green-700">₱{reprint.potentialRevenue.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-6">
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                        <Button size="sm">
                          Create Reprint
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}