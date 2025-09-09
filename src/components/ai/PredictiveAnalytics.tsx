'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Zap,
  Calendar,
  DollarSign,
  Package,
  Users,
  Activity,
  BarChart3,
  Lightbulb,
  Clock,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react'
import {
    LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts'

interface PredictionModel {
  id: string
  name: string
  type: 'DEMAND_FORECAST' | 'QUALITY_PREDICTION' | 'MAINTENANCE_ALERT' | 'COST_OPTIMIZATION'
  accuracy: number
  lastTrained: string
  predictions: number
  status: 'ACTIVE' | 'TRAINING' | 'OFFLINE'
}

interface Prediction {
  id: string
  model: string
  category: 'SALES' | 'PRODUCTION' | 'MAINTENANCE' | 'QUALITY' | 'INVENTORY'
  title: string
  description: string
  confidence: number
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  timeline: string
  recommendation: string
  data: any
  createdAt: string
}

interface ForecastData {
  date: string
  actual?: number
  predicted: number
  confidence_upper: number
  confidence_lower: number
  category: string
}

export function PredictiveAnalytics() {
  const [activeModel, setActiveModel] = useState<string>('demand_forecast')
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d')

  const [models] = useState<PredictionModel[]>([
    {
      id: 'demand_forecast',
      name: 'Demand Forecasting',
      type: 'DEMAND_FORECAST',
      accuracy: 94.2,
      lastTrained: '2024-08-28T10:30:00Z',
      predictions: 156,
      status: 'ACTIVE'
    },
    {
      id: 'quality_prediction',
      name: 'Quality Prediction',
      type: 'QUALITY_PREDICTION',
      accuracy: 89.7,
      lastTrained: '2024-08-27T15:45:00Z',
      predictions: 89,
      status: 'ACTIVE'
    },
    {
      id: 'maintenance_alert',
      name: 'Predictive Maintenance',
      type: 'MAINTENANCE_ALERT',
      accuracy: 96.1,
      lastTrained: '2024-08-26T09:15:00Z',
      predictions: 23,
      status: 'TRAINING'
    },
    {
      id: 'cost_optimization',
      name: 'Cost Optimization',
      type: 'COST_OPTIMIZATION',
      accuracy: 87.3,
      lastTrained: '2024-08-25T14:20:00Z',
      predictions: 67,
      status: 'ACTIVE'
    }
  ])

  const [predictions] = useState<Prediction[]>([
    {
      id: 'pred_001',
      model: 'demand_forecast',
      category: 'SALES',
      title: 'Increased T-Shirt Demand Expected',
      description: 'AI predicts 35% increase in t-shirt orders over the next 2 weeks due to seasonal trends and marketing campaigns.',
      confidence: 92,
      impact: 'HIGH',
      timeline: '14 days',
      recommendation: 'Increase fabric inventory by 40% and schedule additional production capacity.',
      data: { expectedIncrease: 35, category: 't-shirts', duration: 14 },
      createdAt: '2024-08-29T08:00:00Z'
    },
    {
      id: 'pred_002',
      model: 'quality_prediction',
      category: 'QUALITY',
      title: 'Potential Quality Issues in Batch #247',
      description: 'Machine learning model detected patterns indicating 15% higher defect rate in current production batch.',
      confidence: 88,
      impact: 'MEDIUM',
      timeline: '3 days',
      recommendation: 'Implement additional quality checks and inspect machine calibration.',
      data: { batchNumber: '247', expectedDefectRate: 15, currentRate: 3.2 },
      createdAt: '2024-08-29T06:30:00Z'
    },
    {
      id: 'pred_003',
      model: 'maintenance_alert',
      category: 'MAINTENANCE',
      title: 'Screen Press #2 Maintenance Required',
      description: 'Predictive maintenance algorithm indicates 85% probability of breakdown within 10 days if not serviced.',
      confidence: 95,
      impact: 'HIGH',
      timeline: '10 days',
      recommendation: 'Schedule maintenance immediately to prevent production downtime.',
      data: { asset: 'Screen Press #2', breakdownProbability: 85, recommendedAction: 'immediate_maintenance' },
      createdAt: '2024-08-29T05:15:00Z'
    }
  ])

  const [forecastData] = useState<ForecastData[]>([
    { date: '2024-08-20', actual: 45, predicted: 43, confidence_upper: 48, confidence_lower: 38, category: 'orders' },
    { date: '2024-08-21', actual: 52, predicted: 51, confidence_upper: 56, confidence_lower: 46, category: 'orders' },
    { date: '2024-08-22', actual: 38, predicted: 40, confidence_upper: 45, confidence_lower: 35, category: 'orders' },
    { date: '2024-08-23', actual: 61, predicted: 58, confidence_upper: 63, confidence_lower: 53, category: 'orders' },
    { date: '2024-08-24', actual: 47, predicted: 49, confidence_upper: 54, confidence_lower: 44, category: 'orders' },
    { date: '2024-08-25', actual: 55, predicted: 54, confidence_upper: 59, confidence_lower: 49, category: 'orders' },
    { date: '2024-08-26', actual: 42, predicted: 44, confidence_upper: 49, confidence_lower: 39, category: 'orders' },
    { date: '2024-08-27', predicted: 58, confidence_upper: 65, confidence_lower: 51, category: 'orders' },
    { date: '2024-08-28', predicted: 62, confidence_upper: 69, confidence_lower: 55, category: 'orders' },
    { date: '2024-08-29', predicted: 67, confidence_upper: 74, confidence_lower: 60, category: 'orders' },
    { date: '2024-08-30', predicted: 71, confidence_upper: 78, confidence_lower: 64, category: 'orders' },
    { date: '2024-08-31', predicted: 75, confidence_upper: 82, confidence_lower: 68, category: 'orders' }
  ])

  const runAnalysis = async () => {
    setIsRunningAnalysis(true)
    // Simulate AI analysis
    setTimeout(() => {
      setIsRunningAnalysis(false)
    }, 3000)
  }

  const getModelStatusColor = (status: PredictionModel['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'TRAINING': return 'bg-yellow-100 text-yellow-800'
      case 'OFFLINE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImpactColor = (impact: Prediction['impact']) => {
    switch (impact) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: Prediction['category']) => {
    switch (category) {
      case 'SALES': return DollarSign
      case 'PRODUCTION': return Package
      case 'MAINTENANCE': return Settings
      case 'QUALITY': return Target
      case 'INVENTORY': return Package
      default: return Activity
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{new Date(label).toLocaleDateString()}</p>
          {data.actual && <p className="text-blue-600">Actual: {data.actual}</p>}
          <p className="text-purple-600">Predicted: {data.predicted}</p>
          <p className="text-gray-500 text-sm">
            Confidence: {data.confidence_lower} - {data.confidence_upper}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>Predictive Analytics Engine</span>
          </h2>
          <p className="text-gray-600">AI-powered forecasting and business intelligence</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={runAnalysis} disabled={isRunningAnalysis}>
            {isRunningAnalysis ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Run Analysis
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* AI Models Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map(model => (
          <Card key={model.id} className={`cursor-pointer transition-all ${
            activeModel === model.id ? 'border-purple-500 bg-purple-50' : 'hover:shadow-md'
          }`} onClick={() => setActiveModel(model.id)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className={getModelStatusColor(model.status)}>
                  {model.status}
                </Badge>
                <div className="text-2xl font-bold text-purple-600">
                  {model.accuracy}%
                </div>
              </div>
              <h3 className="font-semibold mb-1">{model.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{model.predictions} predictions made</p>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="mr-1 h-3 w-3" />
                Updated {new Date(model.lastTrained).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Demand Forecast - Next 7 Days</span>
            </CardTitle>
            <div className="flex space-x-2">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Confidence Interval */}
              <Area
                type="monotone"
                dataKey="confidence_upper"
                stackId="1"
                stroke="transparent"
                fill="#e0e7ff"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="confidence_lower"
                stackId="1"
                stroke="transparent"
                fill="white"
              />
              
              {/* Actual Data */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              
              {/* Predicted Data */}
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              />
              
              {/* Today's Reference Line */}
              <ReferenceLine x="2024-08-26" stroke="#ef4444" strokeDasharray="2 2" label="Today" />
            </AreaChart>
          </ResponsiveContainer>
          
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Actual Data</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded border-dashed border-2 border-purple-500"></div>
              <span>Predicted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-indigo-200 rounded"></div>
              <span>Confidence Interval</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Recent AI Predictions</span>
            <Badge variant="outline">
              {predictions.length} Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictions.map(prediction => {
              const IconComponent = getCategoryIcon(prediction.category)
              return (
                <div key={prediction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{prediction.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {prediction.category}
                          </Badge>
                          <Badge className={getImpactColor(prediction.impact)}>
                            {prediction.impact} IMPACT
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{prediction.description}</p>
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-blue-800 mb-1">
                            💡 AI Recommendation:
                          </p>
                          <p className="text-sm text-blue-700">{prediction.recommendation}</p>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Target className="h-3 w-3" />
                            <span>{prediction.confidence}% confidence</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Timeline: {prediction.timeline}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Brain className="h-3 w-3" />
                            <span>Model: {prediction.model}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Prediction Accuracy</p>
                <p className="text-2xl font-bold text-green-900">91.8%</p>
                <div className="flex items-center mt-1">
                  <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">+2.3% this month</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Active Models</p>
                <p className="text-2xl font-bold text-blue-900">
                  {models.filter(m => m.status === 'ACTIVE').length}
                </p>
                <p className="text-xs text-blue-600">
                  {models.filter(m => m.status === 'TRAINING').length} training
                </p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Cost Savings</p>
                <p className="text-2xl font-bold text-purple-900">₱125,400</p>
                <div className="flex items-center mt-1">
                  <ArrowUp className="h-3 w-3 text-purple-600 mr-1" />
                  <span className="text-xs text-purple-600">AI optimizations</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}