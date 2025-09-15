// @ts-nocheck
// Security Dashboard - Centralized Security Monitoring
// Real-time security analytics, threat detection, and compliance monitoring

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  AlertTriangle,
  Users,
  Key,
  Lock,
  Activity,
  Eye,
  Clock,
  TrendingUp,
  Server,
  Database,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface SecurityMetrics {
  overall_score: number
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  active_sessions: number
  failed_logins: number
  suspicious_activities: number
  vulnerabilities: number
  compliance_score: number
  uptime_percentage: number
}

interface SecurityEvent {
  id: string
  type: 'LOGIN_ATTEMPT' | 'PERMISSION_CHANGE' | 'DATA_ACCESS' | 'SYSTEM_CHANGE' | 'SECURITY_ALERT'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  user_id?: string
  user_name?: string
  ip_address: string
  description: string
  timestamp: string
  status: 'RESOLVED' | 'INVESTIGATING' | 'OPEN'
}

interface ThreatAlert {
  id: string
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_BREACH' | 'SYSTEM_INTRUSION' | 'MALWARE'
  affected_systems: string[]
  recommendations: string[]
  timestamp: string
  auto_resolved: boolean
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [threats, setThreats] = useState<ThreatAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchSecurityData()
    // Refresh every 30 seconds for real-time monitoring
    const interval = setInterval(fetchSecurityData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSecurityData = async () => {
    try {
      const [metricsRes, eventsRes, threatsRes] = await Promise.all([
        fetch('/api/security/metrics'),
        fetch('/api/security/events'),
        fetch('/api/security/threats')
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data)
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData.data || [])
      }

      if (threatsRes.ok) {
        const threatsData = await threatsRes.json()
        setThreats(threatsData.data || [])
      }

    } catch (error) {
      console.error('Failed to fetch security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100'
      case 'HIGH': return 'text-orange-600 bg-orange-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'LOW': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <XCircle className="h-5 w-5 text-red-600" />
      case 'HIGH': return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case 'MEDIUM': return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'LOW': return <CheckCircle className="h-5 w-5 text-green-600" />
      default: return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600">Real-time security monitoring and threat detection</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Live Monitoring
          </Badge>
          <Button onClick={fetchSecurityData} variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Security Score</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.overall_score}%</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <Progress value={metrics.overall_score} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Threat Level</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {getThreatLevelIcon(metrics.threat_level)}
                    <span className="text-lg font-semibold">{metrics.threat_level}</span>
                  </div>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.active_sessions}</p>
                  <p className="text-xs text-gray-500">
                    {metrics.failed_logins} failed logins today
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Uptime</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.uptime_percentage}%</p>
                  <p className="text-xs text-gray-500">
                    {metrics.vulnerabilities} vulnerabilities detected
                  </p>
                </div>
                <Server className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="threats">Threat Alerts</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Security Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.description}</p>
                        <p className="text-xs text-gray-500">
                          {event.user_name || 'System'} • {event.ip_address} • {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={`text-xs ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Database Security</span>
                    </div>
                    <Badge className="text-green-600 bg-green-100">Secure</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Network Security</span>
                    </div>
                    <Badge className="text-green-600 bg-green-100">Protected</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Authentication</span>
                    </div>
                    <Badge className="text-yellow-600 bg-yellow-100">MFA Pending</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Data Encryption</span>
                    </div>
                    <Badge className="text-green-600 bg-green-100">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events Log</CardTitle>
              <p className="text-sm text-gray-600">Comprehensive log of all security-related activities</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {event.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{event.description}</p>
                      <p className="text-xs text-gray-500">
                        User: {event.user_name || 'System'} • IP: {event.ip_address} • {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={event.status === 'RESOLVED' ? 'text-green-600' : 'text-orange-600'}>
                      {event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Detection & Alerts</CardTitle>
              <p className="text-sm text-gray-600">AI-powered threat detection and automated response</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threats.map((threat) => (
                  <div key={threat.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">{threat.title}</h3>
                          <Badge className={`${getSeverityColor(threat.severity)}`}>
                            {threat.severity}
                          </Badge>
                          {threat.auto_resolved && (
                            <Badge className="text-green-600 bg-green-100">Auto-Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{threat.description}</p>
                        <p className="text-xs text-gray-500">
                          Category: {threat.category} • {new Date(threat.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Affected Systems</h4>
                        <div className="flex flex-wrap gap-1">
                          {threat.affected_systems.map((system, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {threat.recommendations.map((rec, index) => (
                            <li key={index}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">BIR Tax Compliance</span>
                    <Badge className="text-green-600 bg-green-100">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Privacy (DPA)</span>
                    <Badge className="text-green-600 bg-green-100">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ISO 27001</span>
                    <Badge className="text-yellow-600 bg-yellow-100">In Progress</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SOC 2 Type II</span>
                    <Badge className="text-gray-600 bg-gray-100">Not Started</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics && (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Overall Security Score</span>
                          <span>{metrics.overall_score}%</span>
                        </div>
                        <Progress value={metrics.overall_score} />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Compliance Score</span>
                          <span>{metrics.compliance_score}%</span>
                        </div>
                        <Progress value={metrics.compliance_score} />
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Last security audit: 15 days ago<br/>
                          Next scheduled audit: 45 days
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}