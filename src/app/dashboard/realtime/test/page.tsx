'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Square, 
  RefreshCcw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity,
  Database,
  Wifi
} from 'lucide-react'

interface APIResponse {
  success: boolean
  data?: any
  message?: string
  error?: string
  timestamp?: string
}

interface ServiceStatus {
  name: string
  endpoint: string
  status: 'unknown' | 'healthy' | 'error'
  lastCheck?: Date
  response?: any
}

export default function RealTimeTestPage() {
  const { data: session } = useSession()
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Real-Time Init', endpoint: '/api/realtime/init', status: 'unknown' },
    { name: 'Production API', endpoint: '/api/realtime/production?summary=true', status: 'unknown' },
    { name: 'Machines API', endpoint: '/api/realtime/machines', status: 'unknown' },
    { name: 'Inventory API', endpoint: '/api/realtime/inventory?summary=true', status: 'unknown' },
    { name: 'Alerts API', endpoint: '/api/realtime/alerts?limit=5', status: 'unknown' },
    { name: 'Analytics API', endpoint: '/api/realtime/analytics?type=kpis', status: 'unknown' },
    { name: 'WebSocket Status', endpoint: '/api/realtime/websocket', status: 'unknown' }
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<any>(null)

  const checkService = async (service: ServiceStatus): Promise<ServiceStatus> => {
    try {
      const response = await fetch(service.endpoint)
      const data = await response.json()
      
      return {
        ...service,
        status: response.ok && data.success ? 'healthy' : 'error',
        lastCheck: new Date(),
        response: data
      }
    } catch (error) {
      return {
        ...service,
        status: 'error',
        lastCheck: new Date(),
        response: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  const checkAllServices = async () => {
    setIsLoading(true)
    
    try {
      const updatedServices = await Promise.all(
        services.map(service => checkService(service))
      )
      setServices(updatedServices)
    } catch (error) {
      console.error('Error checking services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeRealTimeServer = async () => {
    try {
      const response = await fetch('/api/realtime/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      })
      
      const data = await response.json()
      console.log('Initialize response:', data)
      
      // Check status after initialization
      setTimeout(() => checkAllServices(), 2000)
      
    } catch (error) {
      console.error('Error initializing real-time server:', error)
    }
  }

  const restartServices = async () => {
    try {
      const response = await fetch('/api/realtime/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' })
      })
      
      const data = await response.json()
      console.log('Restart response:', data)
      
      // Check status after restart
      setTimeout(() => checkAllServices(), 3000)
      
    } catch (error) {
      console.error('Error restarting services:', error)
    }
  }

  const startAllServices = async () => {
    try {
      await fetch('/api/realtime/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_all' })
      })

      setTimeout(() => checkAllServices(), 2000)
    } catch (error) {
      console.error('Error starting services:', error)
    }
  }

  const createTestAlert = async () => {
    try {
      await fetch('/api/realtime/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_custom',
          data: {
            type: 'custom',
            severity: 'high',
            title: 'Test Alert',
            message: 'This is a test alert created from the test dashboard'
          }
        })
      })
      
      console.log('Test alert created')
    } catch (error) {
      console.error('Error creating test alert:', error)
    }
  }

  const forceAnalyticsUpdate = async () => {
    try {
      await fetch('/api/realtime/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_kpi_update' })
      })
      
      console.log('Analytics update forced')
    } catch (error) {
      console.error('Error forcing analytics update:', error)
    }
  }

  useEffect(() => {
    checkAllServices()
  }, [])

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  if (!session) {
    return <div className="p-6">Please sign in to access the test dashboard</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Real-Time System Test Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={checkAllServices} 
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* System Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={initializeRealTimeServer} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Initialize Server
            </Button>
            <Button onClick={startAllServices} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start All Services
            </Button>
            <Button onClick={restartServices} variant="outline" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Restart Services
            </Button>
            <Button onClick={createTestAlert} variant="outline" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Create Test Alert
            </Button>
            <Button onClick={forceAnalyticsUpdate} variant="outline" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Force Analytics Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              API Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={service.status} />
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-500">{service.endpoint}</p>
                      {service.lastCheck && (
                        <p className="text-xs text-gray-400">
                          Last checked: {service.lastCheck.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.filter(s => s.response).map((service, index) => (
                <div key={index} className="border-l-4 border-l-blue-500 pl-4">
                  <p className="font-medium">{service.name}</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(service.response, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.open('/dashboard/realtime', '_blank')}
            >
              <Activity className="h-6 w-6" />
              <span>Live Dashboard</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={checkAllServices}
            >
              <RefreshCcw className="h-6 w-6" />
              <span>Health Check</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={createTestAlert}
            >
              <AlertTriangle className="h-6 w-6" />
              <span>Test Alert</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => console.log('Test completed')}
            >
              <CheckCircle className="h-6 w-6" />
              <span>Complete Test</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">5s</p>
              <p className="text-sm text-gray-600">Dashboard Updates</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">&lt;100ms</p>
              <p className="text-sm text-gray-600">API Response Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">&lt;30s</p>
              <p className="text-sm text-gray-600">Alert Delivery</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">50+</p>
              <p className="text-sm text-gray-600">Concurrent Users</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}