// @ts-nocheck
'use client'

import React, { useEffect, useState } from 'react'
import { useRealTimeData } from '@/hooks/useRealTimeData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cog, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Wifi,
  WifiOff,
  RefreshCcw,
  Bell,
  BellOff
} from 'lucide-react'

interface LiveProductionDashboardProps {
  className?: string
}

export default function LiveProductionDashboard({ className }: LiveProductionDashboardProps) {
  const {
    isConnected,
    isConnecting,
    error,
    reconnectCount,
    connect,
    disconnect,
    alerts,
    productionUpdates,
    machineUpdates,
    inventoryUpdates,
    analytics,
    onAlert,
    onProduction,
    onMachine,
    onInventory,
    onAnalytics,
    getAlertsBySeverity,
    subscribe,
    unsubscribe
  } = useRealTimeData()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastAlertTime, setLastAlertTime] = useState<Date | null>(null)

  // Subscribe to real-time channels on mount
  useEffect(() => {
    if (isConnected) {
      subscribe('production')
      subscribe('machine')
      subscribe('inventory')
    }

    return () => {
      if (isConnected) {
        unsubscribe('production')
        unsubscribe('machine')
        unsubscribe('inventory')
      }
    }
  }, [isConnected, subscribe, unsubscribe])

  // Handle new alerts with sound
  useEffect(() => {
    onAlert((alert) => {
      setLastAlertTime(new Date())
      
      if (soundEnabled && (alert.severity === 'high' || alert.severity === 'critical')) {
        // Play alert sound (you'd implement this with actual audio)
        console.log('🔔 Alert sound:', alert.title)
      }
    })
  }, [onAlert, soundEnabled])

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Connected</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </>
      ) : isConnecting ? (
        <>
          <RefreshCcw className="h-4 w-4 text-yellow-500 animate-spin" />
          <span className="text-sm text-yellow-600">Connecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">Disconnected</span>
          {reconnectCount > 0 && (
            <span className="text-xs text-gray-500">({reconnectCount} attempts)</span>
          )}
        </>
      )}
    </div>
  )

  const AlertSeverityBadge = ({ severity }: { severity: string }) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge className={colors[severity as keyof typeof colors] || colors.medium}>
        {severity.toUpperCase()}
      </Badge>
    )
  }

  const TrendIndicator = ({ trend, value }: { trend: 'up' | 'down' | 'stable', value: number }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const KPICard = ({ kpi }: { kpi: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{kpi.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">
                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
              </span>
              <span className="text-sm text-gray-500">{kpi.unit}</span>
            </div>
            {kpi.target && (
              <p className="text-xs text-gray-500">Target: {kpi.target}{kpi.unit}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <TrendIndicator trend={kpi.trend} value={kpi.trendPercent} />
              <span className="text-sm text-gray-600">{kpi.trendPercent.toFixed(1)}%</span>
            </div>
            <Badge 
              className={
                kpi.status === 'good' ? 'bg-green-100 text-green-800' :
                kpi.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }
            >
              {kpi.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ProductionUpdateCard = ({ update }: { update: any }) => (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">{update.orderId}</p>
            <p className="text-sm text-gray-600">{update.workcenterId}</p>
            <Progress value={update.progress} className="mt-2 h-2" />
          </div>
          <div className="text-right ml-4">
            <Badge className={
              update.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
              update.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }>
              {update.status}
            </Badge>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(update.progress)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const MachineStatusCard = ({ machine }: { machine: any }) => (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              machine.status === 'running' ? 'bg-green-500' :
              machine.status === 'idle' ? 'bg-yellow-500' :
              machine.status === 'maintenance' ? 'bg-blue-500' :
              'bg-red-500'
            }`}></div>
            <div>
              <p className="font-medium">{machine.machineId}</p>
              <p className="text-sm text-gray-600">{machine.status.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{Math.round(machine.utilization)}%</p>
            <p className="text-xs text-gray-500">utilization</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const AlertCard = ({ alert }: { alert: any }) => (
    <Card className="mb-2 border-l-4 border-l-red-500">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="font-medium">{alert.title}</p>
            </div>
            <p className="text-sm text-gray-600">{alert.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <AlertSeverityBadge severity={alert.severity} />
        </div>
      </CardContent>
    </Card>
  )

  const criticalAlerts = getAlertsBySeverity('critical')
  const highAlerts = getAlertsBySeverity('high')
  const runningMachines = machineUpdates.filter(m => m.status === 'running').length
  const totalMachines = machineUpdates.length
  const activeOrders = productionUpdates.length

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with connection status and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Live Production Dashboard</h1>
          <ConnectionStatus />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
          {!isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              disabled={isConnecting}
            >
              <RefreshCcw className={`h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
              {isConnecting ? 'Connecting...' : 'Reconnect'}
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">Connection Error</p>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Cog className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Machines Running</p>
                <p className="text-2xl font-bold">{runningMachines}/{totalMachines}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <p className="text-2xl font-bold">{criticalAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Last Update</p>
                <p className="text-sm font-medium">
                  {lastAlertTime ? lastAlertTime.toLocaleTimeString() : 'No updates'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="kpis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kpis">Real-Time KPIs</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics?.kpis.map((kpi) => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
            {!analytics?.kpis.length && (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No KPI data available. Analytics engine may not be running.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Production Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {productionUpdates.slice(0, 10).map((update, index) => (
                    <ProductionUpdateCard key={`${update.orderId}-${update.workcenterId}-${index}`} update={update} />
                  ))}
                  {productionUpdates.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No production updates yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Orders in Progress</span>
                    <span className="font-medium">{activeOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed Today</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Progress</span>
                    <span className="font-medium">
                      {productionUpdates.length > 0 
                        ? Math.round(productionUpdates.reduce((sum, u) => sum + u.progress, 0) / productionUpdates.length)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Machine Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {machineUpdates.map((machine, index) => (
                    <MachineStatusCard key={`${machine.machineId}-${index}`} machine={machine} />
                  ))}
                  {machineUpdates.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No machine data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Machine Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Machines</span>
                    <span className="font-medium">{totalMachines}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Running</span>
                    <span className="font-medium text-green-600">{runningMachines}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Idle</span>
                    <span className="font-medium text-yellow-600">
                      {machineUpdates.filter(m => m.status === 'idle').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Maintenance</span>
                    <span className="font-medium text-blue-600">
                      {machineUpdates.filter(m => m.status === 'maintenance').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Error</span>
                    <span className="font-medium text-red-600">
                      {machineUpdates.filter(m => m.status === 'error').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {alerts.slice(0, 10).map((alert, index) => (
                    <AlertCard key={`${alert.id}-${index}`} alert={alert} />
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-gray-500">No alerts - everything looks good!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      Critical
                    </span>
                    <span className="font-medium">{criticalAlerts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      High
                    </span>
                    <span className="font-medium">{highAlerts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      Medium
                    </span>
                    <span className="font-medium">{getAlertsBySeverity('medium').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Low
                    </span>
                    <span className="font-medium">{getAlertsBySeverity('low').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}