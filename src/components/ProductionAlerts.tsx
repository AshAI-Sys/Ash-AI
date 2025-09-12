// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle,
  Clock,
  XCircle,
  Users,
  Package,
  RefreshCw,
  Bell,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface ProductionAlert {
  id: string
  type: 'BOTTLENECK' | 'OVERDUE' | 'QUALITY' | 'CAPACITY' | 'INVENTORY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  affectedEntity: string
  actionRequired: string
  created_at: string
  data?: Record<string, unknown>
}

interface AlertsSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
}

interface ProductionAlertsProps {
  userRole: string
}

const severityColors = {
  CRITICAL: 'bg-red-100 border-red-500 text-red-800',
  HIGH: 'bg-orange-100 border-orange-500 text-orange-800',
  MEDIUM: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  LOW: 'bg-blue-100 border-blue-500 text-blue-800'
}

const severityIcons = {
  CRITICAL: <XCircle className="h-5 w-5 text-red-500" />,
  HIGH: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  MEDIUM: <Clock className="h-5 w-5 text-yellow-500" />,
  LOW: <Bell className="h-5 w-5 text-blue-500" />
}

const typeIcons = {
  BOTTLENECK: <Users className="h-4 w-4" />,
  OVERDUE: <Clock className="h-4 w-4" />,
  QUALITY: <XCircle className="h-4 w-4" />,
  CAPACITY: <Users className="h-4 w-4" />,
  INVENTORY: <Package className="h-4 w-4" />
}

export function ProductionAlerts({ userRole }: ProductionAlertsProps) {
  const [alerts, setAlerts] = useState<ProductionAlert[]>([])
  const [summary, setSummary] = useState<AlertsSummary>({ total: 0, critical: 0, high: 0, medium: 0, low: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSeverity) params.append('severity', selectedSeverity)
      if (selectedType) params.append('type', selectedType)

      const response = await fetch(`/api/analytics/alerts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
        setSummary(data.summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch production alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [selectedSeverity, selectedType])

  const toggleAlertExpansion = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(alertId)) {
        newSet.delete(alertId)
      } else {
        newSet.add(alertId)
      }
      return newSet
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading && alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Production Alerts</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-gray-600">Total Alerts</div>
          </CardContent>
        </Card>
        
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{summary.high}</div>
            <div className="text-sm text-gray-600">High</div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{summary.medium}</div>
            <div className="text-sm text-gray-600">Medium</div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.low}</div>
            <div className="text-sm text-gray-600">Low</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Production Alerts
              </CardTitle>
              <CardDescription>
                Real-time alerts for production issues
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="BOTTLENECK">Bottlenecks</option>
                <option value="OVERDUE">Overdue</option>
                <option value="QUALITY">Quality</option>
                <option value="CAPACITY">Capacity</option>
                <option value="INVENTORY">Inventory</option>
              </select>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAlerts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts at this time</p>
              <p className="text-sm">Production is running smoothly!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border-l-4 rounded-lg ${severityColors[alert.severity]} bg-opacity-50`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {severityIcons[alert.severity]}
                        <Badge variant="outline" className="text-xs">
                          {alert.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(alert.created_at)}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1">
                        {alert.title}
                      </h4>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.description}
                      </p>
                      
                      {expandedAlerts.has(alert.id) && (
                        <div className="mt-3 p-3 bg-white bg-opacity-60 rounded border">
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Affected Entity: </span>
                              <span className="text-gray-700">{alert.affectedEntity}</span>
                            </div>
                            
                            <div>
                              <span className="font-medium">Action Required: </span>
                              <span className="text-gray-700">{alert.actionRequired}</span>
                            </div>
                            
                            {alert.data && (
                              <div className="mt-3">
                                <span className="font-medium">Details:</span>
                                <div className="mt-1 text-xs bg-gray-50 p-2 rounded">
                                  {alert.type === 'OVERDUE' && alert.data.orderNumber && (
                                    <div>Order: {alert.data.orderNumber}</div>
                                  )}
                                  {alert.type === 'CAPACITY' && (
                                    <div>
                                      Utilization: {alert.data.utilization?.toFixed(0)}% | 
                                      Active Tasks: {alert.data.activeTasks}
                                    </div>
                                  )}
                                  {alert.type === 'INVENTORY' && (
                                    <div>
                                      Current Stock: {alert.data.currentQuantity} | 
                                      Reorder Point: {alert.data.reorderPoint}
                                    </div>
                                  )}
                                  {alert.type === 'BOTTLENECK' && (
                                    <div>
                                      Pending Tasks: {alert.data.pendingCount}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAlertExpansion(alert.id)}
                    >
                      {expandedAlerts.has(alert.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}