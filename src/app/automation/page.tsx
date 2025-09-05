'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Zap, Bell, Clock, Mail, MessageSquare, Calendar, Play, Pause, Settings, Plus, Activity, AlertTriangle } from 'lucide-react'

interface Automation {
  id: string
  name: string
  type: 'CRON' | 'EVENT' | 'CONDITION'
  schedule?: string
  eventKey?: string
  conditionSql?: string
  action: {
    type: string
    templateId?: string
    channel: string
    to: string
  }
  enabled: boolean
  lastTriggered?: string
  nextTrigger?: string
  successCount: number
  failureCount: number
  createdAt: string
}

interface NotificationTemplate {
  id: string
  name: string
  channel: 'EMAIL' | 'SMS' | 'MESSENGER' | 'INAPP'
  subject?: string
  body: string
  locale: string
}

interface OutboxMessage {
  id: string
  channel: string
  toRef: string
  subject?: string
  body: string
  status: 'PENDING' | 'SENT' | 'FAILED'
  sentAt?: string
  errorMessage?: string
  createdAt: string
}

export default function AutomationPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('automations')
  const [automations, setAutomations] = useState<Automation[]>([])
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [messages, setMessages] = useState<OutboxMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAutomationData()
  }, [])

  const fetchAutomationData = async () => {
    setLoading(true)
    try {
      // Mock data for demonstration
      setAutomations([
        {
          id: '1',
          name: 'Daily Production Report',
          type: 'CRON',
          schedule: '0 9 * * 1-5',
          action: { type: 'NOTIFY', channel: 'EMAIL', to: 'managers' },
          enabled: true,
          lastTriggered: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          nextTrigger: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          successCount: 45,
          failureCount: 2,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Order Delay Alert',
          type: 'CONDITION',
          conditionSql: 'SELECT * FROM orders WHERE due_date < NOW() AND status != \'COMPLETED\'',
          action: { type: 'NOTIFY', channel: 'INAPP', to: 'csr' },
          enabled: true,
          lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          successCount: 12,
          failureCount: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'QC Failed Notification',
          type: 'EVENT',
          eventKey: 'ash.qc.failed',
          action: { type: 'NOTIFY', channel: 'SMS', to: 'production_manager' },
          enabled: false,
          successCount: 8,
          failureCount: 1,
          createdAt: new Date().toISOString()
        }
      ])

      setTemplates([
        {
          id: '1',
          name: 'Production Report Daily',
          channel: 'EMAIL',
          subject: 'Daily Production Summary - {{date}}',
          body: 'Production summary for {{date}}:\n\nOrders completed: {{completed_orders}}\nEfficiency: {{efficiency}}%\nDefect rate: {{defect_rate}}%',
          locale: 'en-PH'
        },
        {
          id: '2',
          name: 'Order Delay Alert',
          channel: 'INAPP',
          body: 'Order {{order_number}} is delayed. Due date: {{due_date}}. Current status: {{status}}',
          locale: 'en-PH'
        }
      ])

      setMessages([
        {
          id: '1',
          channel: 'EMAIL',
          toRef: 'manager@sorbetes.com',
          subject: 'Daily Production Summary - 2025-09-04',
          body: 'Production summary...',
          status: 'SENT',
          sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          channel: 'INAPP',
          toRef: 'user123',
          body: 'Order ORD-001 is delayed...',
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
      ])
    } catch (error) {
      console.error('Error fetching automation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      
      if (response.ok) {
        setAutomations(automations.map(a => 
          a.id === id ? { ...a, enabled } : a
        ))
      }
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CRON': return <Clock className="h-4 w-4" />
      case 'EVENT': return <Zap className="h-4 w-4" />
      case 'CONDITION': return <Activity className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL': return <Mail className="h-4 w-4" />
      case 'SMS': return <MessageSquare className="h-4 w-4" />
      case 'MESSENGER': return <MessageSquare className="h-4 w-4" />
      case 'INAPP': return <Bell className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate summary metrics
  const activeAutomations = automations.filter(a => a.enabled).length
  const totalMessages = messages.length
  const failedMessages = messages.filter(m => m.status === 'FAILED').length
  const pendingMessages = messages.filter(m => m.status === 'PENDING').length

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
          <h1 className="text-3xl font-bold text-gray-900">Automation</h1>
          <p className="text-gray-500 mt-1">Automated workflows and notifications</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Automation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Automation</DialogTitle>
                <DialogDescription>
                  Create a new automated workflow or notification rule.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Automation name" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Trigger type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRON">Schedule (Cron)</SelectItem>
                    <SelectItem value="EVENT">Event-based</SelectItem>
                    <SelectItem value="CONDITION">Condition-based</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTIFY">Send Notification</SelectItem>
                    <SelectItem value="CREATE_TASK">Create Task</SelectItem>
                    <SelectItem value="UPDATE_STATUS">Update Status</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAutomations}</div>
            <p className="text-xs text-muted-foreground">
              {automations.length} total automations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {pendingMessages} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMessages > 0 ? Math.round((totalMessages - failedMessages) / totalMessages * 100) : 100}%
            </div>
            <p className="text-xs text-muted-foreground">
              {failedMessages} failed messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Notification templates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="messages">Message Queue</TabsTrigger>
        </TabsList>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="grid gap-4">
            {automations.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No automations found</h3>
                    <p className="text-gray-500">Create your first automation to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              automations.map((automation) => (
                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getTypeIcon(automation.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{automation.name}</h3>
                            <Badge variant="secondary">{automation.type}</Badge>
                            <Badge className={automation.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {automation.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-4">
                              {automation.schedule && (
                                <span><strong>Schedule:</strong> {automation.schedule}</span>
                              )}
                              {automation.eventKey && (
                                <span><strong>Event:</strong> {automation.eventKey}</span>
                              )}
                              {automation.conditionSql && (
                                <span><strong>Condition:</strong> SQL Query</span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                {getChannelIcon(automation.action.channel)}
                                <span className="ml-1">{automation.action.channel}</span>
                              </span>
                              <span><strong>Target:</strong> {automation.action.to}</span>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-xs">
                              <span className="text-green-600">✓ {automation.successCount} successful</span>
                              {automation.failureCount > 0 && (
                                <span className="text-red-600">✗ {automation.failureCount} failed</span>
                              )}
                              {automation.lastTriggered && (
                                <span>Last: {new Date(automation.lastTriggered).toLocaleString()}</span>
                              )}
                              {automation.nextTrigger && (
                                <span>Next: {new Date(automation.nextTrigger).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={automation.enabled}
                          onCheckedChange={(enabled) => toggleAutomation(automation.id, enabled)}
                        />
                        <Button variant="outline" size="sm">
                          {automation.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getChannelIcon(template.channel)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">{template.name}</h3>
                          <Badge variant="secondary">{template.channel}</Badge>
                          <Badge variant="outline">{template.locale}</Badge>
                        </div>
                        
                        {template.subject && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Subject:</strong> {template.subject}
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {template.body.substring(0, 200)}
                          {template.body.length > 200 && '...'}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <div className="grid gap-4">
            {messages.map((message) => (
              <Card key={message.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getChannelIcon(message.channel)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-base font-medium">{message.toRef}</h3>
                          <Badge className={getStatusColor(message.status)}>
                            {message.status}
                          </Badge>
                          <Badge variant="outline">{message.channel}</Badge>
                        </div>
                        
                        {message.subject && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Subject:</strong> {message.subject}
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-700">
                          {message.body.substring(0, 150)}
                          {message.body.length > 150 && '...'}
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Created: {new Date(message.createdAt).toLocaleString()}
                          {message.sentAt && (
                            <span> • Sent: {new Date(message.sentAt).toLocaleString()}</span>
                          )}
                        </div>
                        
                        {message.errorMessage && (
                          <div className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                            Error: {message.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {message.status === 'PENDING' && (
                      <Button variant="outline" size="sm">
                        Retry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}