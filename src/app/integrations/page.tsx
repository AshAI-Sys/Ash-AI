"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ResponsiveLayout from "@/components/ResponsiveLayout"
import { 
  Plug, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Webhook,
  Workflow,
  Zap,
  Plus,
  Search,
  Filter,
  BarChart3,
  Clock,
  TrendingUp,
  Globe,
  Package,
  Truck,
  CreditCard
} from "lucide-react"

interface Integration {
  id: string
  name: string
  type: string
  provider: string
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "CONNECTING"
  is_active: boolean
  lastSync: string
  healthStatus: "HEALTHY" | "WARNING" | "CRITICAL"
  healthScore: number
  webhookSuccessRate: number
  totalWebhookCalls: number
  errorCount: number
  creator: { name: string }
  webhooks: any[]
  logs: any[]
  _count: { webhooks: number; automationRules: number }
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  successCount: number
  failureCount: number
  integration: { name: string; provider: string }
  performanceMetrics: {
    successRate: number
    totalDeliveries: number
    isHealthy: boolean
    lastDelivery: string
  }
}

interface Workflow {
  id: string
  name: string
  description: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
  is_active: boolean
  runCount: number
  successCount: number
  failureCount: number
  lastRun: string
  creator: { name: string }
  performanceMetrics: {
    successRate: number
    isHealthy: boolean
    totalAutomationRules: number
  }
}

interface AutomationRule {
  id: string
  name: string
  description: string
  is_active: boolean
  priority: number
  triggerCount: number
  lastTriggered: string
  integration?: { name: string; provider: string }
  workflow?: { name: string; status: string }
  performanceMetrics: {
    successRate: number
    isHealthy: boolean
    totalExecutions: number
  }
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [integrationsRes, webhooksRes, workflowsRes, automationRes] = await Promise.all([
        fetch('/api/integrations'),
        fetch('/api/webhooks'),
        fetch('/api/workflows'),
        fetch('/api/automation')
      ])

      if (!integrationsRes.ok || !webhooksRes.ok || !workflowsRes.ok || !automationRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [integrationsData, webhooksData, workflowsData, automationData] = await Promise.all([
        integrationsRes.json(),
        webhooksRes.json(),
        workflowsRes.json(),
        automationRes.json()
      ])

      setIntegrations(integrationsData.data || [])
      setWebhooks(webhooksData.data || [])
      setWorkflows(workflowsData.data || [])
      setAutomationRules(automationData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONNECTED": return "text-green-600 bg-green-50"
      case "DISCONNECTED": return "text-gray-600 bg-gray-50"
      case "ERROR": return "text-red-600 bg-red-50"
      case "CONNECTING": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case "HEALTHY": return "text-green-600"
      case "WARNING": return "text-yellow-600"
      case "CRITICAL": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ECOMMERCE": return <Globe className="h-4 w-4" />
      case "MARKETPLACE": return <BarChart3 className="h-4 w-4" />
      case "SOCIAL_MEDIA": return <TrendingUp className="h-4 w-4" />
      case "ACCOUNTING": return <BarChart3 className="h-4 w-4" />
      case "CRM": return <Activity className="h-4 w-4" />
      case "INVENTORY": return <Package className="h-4 w-4" />
      case "SHIPPING": return <Truck className="h-4 w-4" />
      case "PAYMENT": return <CreditCard className="h-4 w-4" />
      default: return <Plug className="h-4 w-4" />
    }
  }

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.provider.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || integration.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesType = typeFilter === "all" || integration.type.toLowerCase() === typeFilter.toLowerCase()
    
    return matchesSearch && matchesStatus && matchesType
  })

  const overviewMetrics = {
    totalIntegrations: integrations.length,
    activeIntegrations: integrations.filter(i => i.is_active).length,
    healthyIntegrations: integrations.filter(i => i.healthStatus === "HEALTHY").length,
    totalWebhooks: webhooks.length,
    activeWorkflows: workflows.filter(w => w.is_active).length,
    activeAutomationRules: automationRules.filter(r => r.is_active).length
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Loading integration hub...</span>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integration & Automation Hub</h1>
            <p className="text-gray-600 mt-2">Manage third-party integrations, webhooks, and automation workflows</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Integration
          </Button>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Plug className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Integrations</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewMetrics.totalIntegrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewMetrics.activeIntegrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Healthy</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewMetrics.healthyIntegrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Webhook className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Webhooks</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewMetrics.totalWebhooks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Workflow className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewMetrics.activeWorkflows}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Automation</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewMetrics.activeAutomationRules}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search integrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="disconnected">Disconnected</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map((integration) => (
                <Card key={integration.id} className="glass-card hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(integration.type)}
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(integration.status)}>
                      {integration.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Provider: <span className="font-medium">{integration.provider}</span></p>
                        <p className="text-sm text-gray-600">Type: <span className="font-medium">{integration.type}</span></p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Health Score</span>
                          <span className={`text-sm font-medium ${getHealthColor(integration.healthStatus)}`}>
                            {integration.healthScore}%
                          </span>
                        </div>
                        <Progress value={integration.healthScore} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Webhooks</p>
                          <p className="text-lg font-semibold">{integration._count.webhooks}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Automation Rules</p>
                          <p className="text-lg font-semibold">{integration._count.automationRules}</p>
                        </div>
                      </div>

                      {integration.webhookSuccessRate > 0 && (
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Webhook Success Rate</span>
                            <span className="text-sm font-medium">{integration.webhookSuccessRate}%</span>
                          </div>
                          <Progress value={integration.webhookSuccessRate} className="h-1 mt-1" />
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-gray-500">
                          Last sync: {new Date(integration.lastSync).toLocaleDateString()}
                        </span>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredIntegrations.length === 0 && (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <Plug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
                  <p className="text-gray-600">Get started by adding your first integration</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {webhooks.map((webhook) => (
                <Card key={webhook.id} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Webhook className="h-5 w-5 mr-2 text-purple-600" />
                        {webhook.name}
                      </CardTitle>
                      <Badge variant={webhook.is_active ? "default" : "secondary"}>
                        {webhook.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Integration: <span className="font-medium">{webhook.integration.name}</span>
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="text-sm font-medium">{webhook.performanceMetrics.successRate}%</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Total Calls</p>
                          <p className="text-lg font-semibold">{webhook.performanceMetrics.totalDeliveries}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Events</p>
                          <p className="text-lg font-semibold">{webhook.events.length}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {webhook.performanceMetrics.isHealthy ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm">
                          {webhook.performanceMetrics.isHealthy ? "Healthy" : "Issues detected"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Workflow className="h-5 w-5 mr-2 text-indigo-600" />
                        {workflow.name}
                      </CardTitle>
                      <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workflow.description && (
                        <p className="text-sm text-gray-600">{workflow.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="text-sm font-medium">{workflow.performanceMetrics.successRate}%</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Total Runs</p>
                          <p className="text-lg font-semibold">{workflow.runCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Automation Rules</p>
                          <p className="text-lg font-semibold">{workflow.performanceMetrics.totalAutomationRules}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {workflow.performanceMetrics.isHealthy ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {workflow.performanceMetrics.isHealthy ? "Healthy" : "Issues detected"}
                          </span>
                        </div>
                        {workflow.lastRun && (
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(workflow.lastRun).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {automationRules.map((rule) => (
                <Card key={rule.id} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-orange-600" />
                        {rule.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">P{rule.priority}</Badge>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rule.description && (
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="text-sm font-medium">{rule.performanceMetrics.successRate}%</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Triggered</p>
                          <p className="text-lg font-semibold">{rule.triggerCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Executions</p>
                          <p className="text-lg font-semibold">{rule.performanceMetrics.totalExecutions}</p>
                        </div>
                      </div>

                      {(rule.integration || rule.workflow) && (
                        <div className="text-sm">
                          <p className="text-gray-500">Connected to:</p>
                          <p className="font-medium">
                            {rule.integration?.name || rule.workflow?.name}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {rule.performanceMetrics.isHealthy ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {rule.performanceMetrics.isHealthy ? "Healthy" : "Issues detected"}
                          </span>
                        </div>
                        {rule.lastTriggered && (
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(rule.lastTriggered).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  )
}