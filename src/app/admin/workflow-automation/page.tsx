'use client'

/**
 * ASH AI ERP - Workflow Automation Admin Dashboard
 * Comprehensive control panel for managing automated workflows
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Play, 
  Pause, 
  BarChart3, 
  Zap, 
  Mail, 
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Activity
} from 'lucide-react'

interface WorkflowRule {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: number
  trigger: {
    type: string
    parameters?: Record<string, any>
  }
  actions: Array<{
    type: string
    parameters: Record<string, any>
  }>
  created_at: string
  updated_at: string
}

interface AutomationStats {
  total: number
  enabled: number
  disabled: number
  byTriggerType: Record<string, number>
  byPriority: Record<string, number>
}

interface NotificationStats {
  total: number
  sent: number
  pending: number
  failed: number
  byChannel: Record<string, number>
  byPriority: Record<string, number>
}

export default function WorkflowAutomationPage() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [automationStats, setAutomationStats] = useState<AutomationStats | null>(null)
  const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [automationEnabled, setAutomationEnabled] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load workflow rules
      const rulesResponse = await fetch('/api/workflows/rules')
      const rulesData = await rulesResponse.json()
      
      if (rulesData.success) {
        setRules(rulesData.data.rules)
        setAutomationStats(rulesData.data.statistics)
      }

      // Load notification statistics
      const notifResponse = await fetch('/api/notifications/send/status')
      const notifData = await notifResponse.json()
      
      if (notifData.success) {
        setNotificationStats(notifData.data.statistics)
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflows/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        setRules(prev => prev.map(rule => 
          rule.id === ruleId ? { ...rule, enabled } : rule
        ))
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/workflows/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRules(prev => prev.filter(rule => rule.id !== ruleId))
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-gray-600">Manage automated workflows and notifications</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Automation</span>
            <Switch 
              checked={automationEnabled}
              onCheckedChange={setAutomationEnabled}
            />
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats?.enabled || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {automationStats?.total || 0} total rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationStats?.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              {notificationStats?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notificationStats ? 
                Math.round((notificationStats.sent / (notificationStats.sent + notificationStats.failed)) * 100) || 0
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {notificationStats?.failed || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${automationEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-2xl font-bold">
                {automationEnabled ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              System status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Workflow Rules</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="tasks">Task Assignment</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Workflow Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Rules</CardTitle>
              <CardDescription>
                Manage automated workflow rules and their triggers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Switch 
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                      />
                      <div>
                        <h3 className="font-medium">{rule.name}</h3>
                        <p className="text-sm text-gray-600">{rule.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {rule.trigger.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Priority: {rule.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {rules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No workflow rules configured yet.
                    <br />
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Rule
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notificationStats && Object.entries(notificationStats.byChannel).map(([channel, count]) => (
                    <div key={channel} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {channel === 'EMAIL' && <Mail className="w-4 h-4" />}
                        {channel === 'SMS' && <MessageSquare className="w-4 h-4" />}
                        {channel === 'IN_APP' && <Users className="w-4 h-4" />}
                        <span className="capitalize">{channel.toLowerCase()}</span>
                      </div>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notificationStats && Object.entries(notificationStats.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {priority === 'URGENT' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {priority === 'HIGH' && <Clock className="w-4 h-4 text-orange-500" />}
                        {priority === 'NORMAL' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        {priority === 'LOW' && <CheckCircle className="w-4 h-4 text-gray-500" />}
                        <span className="capitalize">{priority.toLowerCase()}</span>
                      </div>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>
                Manage email, SMS, and in-app notification templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-8 text-gray-500">
                Notification template management coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Assignment Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Assignment Rules</CardTitle>
              <CardDescription>
                Configure how tasks are automatically assigned to operators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['GRAPHIC_ARTIST', 'OPERATOR', 'QC_INSPECTOR', 'SILKSCREEN_OPERATOR'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{role.replace('_', ' ')}</h3>
                      <p className="text-sm text-gray-600">
                        Auto-assignment strategy for {role.toLowerCase().replace('_', ' ')} tasks
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Skill Based</Badge>
                      <Switch defaultChecked />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workload Distribution</CardTitle>
              <CardDescription>
                Current task assignments and operator availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-8 text-gray-500">
                Workload analytics coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Performance</CardTitle>
              <CardDescription>
                Track the effectiveness of your workflow automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">90%</div>
                  <p className="text-sm text-gray-600">Orders Auto-Progressed</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">2.3h</div>
                  <p className="text-sm text-gray-600">Avg. Time Saved</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">85%</div>
                  <p className="text-sm text-gray-600">Task Auto-Assignment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-8 text-gray-500">
                Detailed analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}