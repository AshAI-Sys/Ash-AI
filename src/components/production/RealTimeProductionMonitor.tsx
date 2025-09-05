'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Bell,
  Settings,
  Play,
  Pause,
  BarChart3,
  Wrench,
  Users,
  Package
} from 'lucide-react'
import { RealTimeProductionOptimizer, type ProductionMetrics, type ProductionAlert } from '@/lib/production-optimizer'

interface RealTimeProductionMonitorProps {
  className?: string
}

export function RealTimeProductionMonitor({ className = '' }: RealTimeProductionMonitorProps) {
  const [optimizer] = useState(() => new RealTimeProductionOptimizer())
  const [isRunning, setIsRunning] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [alerts, setAlerts] = useState<ProductionAlert[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [metrics, setMetrics] = useState<ProductionMetrics[]>([])

  // Simulate real-time data updates
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      // Generate mock production metrics
      const currentMetrics: ProductionMetrics[] = [
        {
          timestamp: new Date().toISOString(),
          stationId: 'cutting-01',
          stationType: 'CUTTING',
          efficiency: 85 + Math.random() * 15,
          throughput: 45 + Math.random() * 15,
          qualityScore: 92 + Math.random() * 8,
          downtime: Math.random() * 5,
          operatorCount: 3,
          activeOperators: 2 + Math.floor(Math.random() * 2),
          maintenanceStatus: Math.random() > 0.9 ? 'OVERDUE' : 'CURRENT',
          temperature: 24 + Math.random() * 6,
          humidity: 45 + Math.random() * 20
        },
        {
          timestamp: new Date().toISOString(),
          stationId: 'sewing-01',
          stationType: 'SEWING',
          efficiency: 88 + Math.random() * 12,
          throughput: 35 + Math.random() * 20,
          qualityScore: 94 + Math.random() * 6,
          downtime: Math.random() * 8,
          operatorCount: 8,
          activeOperators: 6 + Math.floor(Math.random() * 3),
          maintenanceStatus: 'CURRENT',
          temperature: 26 + Math.random() * 4,
          humidity: 50 + Math.random() * 15
        },
        {
          timestamp: new Date().toISOString(),
          stationId: 'printing-01',
          stationType: 'PRINTING',
          efficiency: 82 + Math.random() * 18,
          throughput: 28 + Math.random() * 12,
          qualityScore: 91 + Math.random() * 9,
          downtime: Math.random() * 6,
          operatorCount: 4,
          activeOperators: 3 + Math.floor(Math.random() * 2),
          maintenanceStatus: Math.random() > 0.85 ? 'DUE_SOON' : 'CURRENT',
          temperature: 28 + Math.random() * 5,
          humidity: 40 + Math.random() * 20
        }
      ]

      setMetrics(currentMetrics)

      // Analyze metrics
      const analysis = optimizer.analyzeProductionMetrics(currentMetrics)
      setAlerts(analysis.alerts)
      setRecommendations(analysis.recommendations)
      setLastUpdate(new Date())
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [isRunning, optimizer])

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'LOW': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4" />
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />
      case 'MEDIUM': return <Clock className="w-4 h-4" />
      case 'LOW': return <CheckCircle className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getStationIcon = (type: string) => {
    switch (type) {
      case 'CUTTING': return <Package className="w-5 h-5" />
      case 'SEWING': return <Users className="w-5 h-5" />
      case 'PRINTING': return <Wrench className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="ai-orb-small">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Real-Time Production Monitor</h2>
            <p className="text-cyan-300">Live production analytics and optimization</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={`${isRunning ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
            <Activity className="w-3 h-3 mr-1" />
            {isRunning ? 'LIVE' : 'PAUSED'}
          </Badge>
          <Button
            onClick={() => setIsRunning(!isRunning)}
            className="neon-btn-outline"
            size="sm"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="text-xs text-cyan-300">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="quantum-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-400" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.severity)}
                      <div>
                        <div className="font-semibold text-white">{alert.title}</div>
                        <div className="text-sm opacity-80 mt-1">{alert.message}</div>
                        <div className="text-xs opacity-60 mt-2">
                          Station: {alert.stationId} • {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Badge className={getAlertColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  {alert.actionRequired && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-sm font-medium text-cyan-300">Action Required:</div>
                      <div className="text-sm mt-1">{alert.actionRequired}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.stationId} className="quantum-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStationIcon(metric.stationType)}
                  <div>
                    <div className="text-lg">{metric.stationType}</div>
                    <div className="text-sm text-cyan-300 font-normal">{metric.stationId}</div>
                  </div>
                </div>
                <Badge className={`${metric.efficiency >= 85 ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-orange-500/20 text-orange-400 border-orange-500/50'}`}>
                  {metric.efficiency.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Efficiency */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-cyan-300">Efficiency</span>
                  <span className="text-white">{metric.efficiency.toFixed(1)}%</span>
                </div>
                <Progress value={metric.efficiency} className="h-2" />
              </div>

              {/* Throughput */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-cyan-300">Throughput</span>
                  <span className="text-white">{metric.throughput.toFixed(0)} units/hr</span>
                </div>
                <div className="flex items-center gap-2">
                  {metric.throughput > 40 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-orange-400" />
                  )}
                  <span className={`text-sm ${metric.throughput > 40 ? 'text-green-400' : 'text-orange-400'}`}>
                    {metric.throughput > 40 ? 'Above target' : 'Below target'}
                  </span>
                </div>
              </div>

              {/* Quality Score */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-cyan-300">Quality Score</span>
                  <span className="text-white">{metric.qualityScore.toFixed(1)}%</span>
                </div>
                <Progress value={metric.qualityScore} className="h-2" />
              </div>

              {/* Operators */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-cyan-300">Operators</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="text-white">{metric.activeOperators}/{metric.operatorCount}</span>
                </div>
              </div>

              {/* Maintenance Status */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-cyan-300">Maintenance</span>
                <Badge className={`text-xs ${
                  metric.maintenanceStatus === 'CURRENT' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                  metric.maintenanceStatus === 'DUE_SOON' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  'bg-red-500/20 text-red-400 border-red-500/50'
                }`}>
                  {metric.maintenanceStatus.replace('_', ' ')}
                </Badge>
              </div>

              {/* Downtime */}
              {metric.downtime > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-cyan-300">Downtime</span>
                  <span className="text-orange-400">{metric.downtime.toFixed(1)}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="quantum-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 4).map((rec, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white">{rec.title}</div>
                      <div className="text-sm text-cyan-300 mt-1">{rec.description}</div>
                      {rec.impact && (
                        <div className="text-xs text-emerald-400 mt-2">
                          Expected Impact: {rec.impact}
                        </div>
                      )}
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                      {rec.confidence}% confident
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button className="neon-btn-primary">
          <BarChart3 className="w-4 h-4 mr-2" />
          View Detailed Analytics
        </Button>
        <Button className="neon-btn-outline">
          <Settings className="w-4 h-4 mr-2" />
          Configure Alerts
        </Button>
        <Button className="neon-btn-outline">
          <Wrench className="w-4 h-4 mr-2" />
          Schedule Maintenance
        </Button>
      </div>
    </div>
  )
}