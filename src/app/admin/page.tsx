'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { InteractiveCharts } from '@/components/analytics/InteractiveCharts'
import { PaymentIntegration } from '@/components/integrations/PaymentIntegration'
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics'
import { SecurityDashboard } from '@/components/security/SecurityDashboard'
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'
import { 
  Settings, 
  BarChart3, 
  CreditCard, 
  Brain, 
  Shield, 
  Activity,
  Palette,
  Zap,
  Database,
  Users,
  Bell,
  Monitor
} from 'lucide-react'

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'analytics' | 'integrations' | 'ai' | 'security' | 'performance' | 'appearance'>('overview')

  const sections = [
    { key: 'overview', label: 'Overview', icon: Settings, color: 'text-gray-600' },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-blue-600' },
    { key: 'integrations', label: 'Integrations', icon: CreditCard, color: 'text-green-600' },
    { key: 'ai', label: 'AI Engine', icon: Brain, color: 'text-purple-600' },
    { key: 'security', label: 'Security', icon: Shield, color: 'text-red-600' },
    { key: 'performance', label: 'Performance', icon: Activity, color: 'text-orange-600' },
    { key: 'appearance', label: 'Appearance', icon: Palette, color: 'text-pink-600' }
  ]

  const systemStats = [
    { label: 'System Uptime', value: '99.9%', icon: Monitor, color: 'text-green-600' },
    { label: 'Active Users', value: '27', icon: Users, color: 'text-blue-600' },
    { label: 'Database Health', value: 'Excellent', icon: Database, color: 'text-green-600' },
    { label: 'API Response', value: '145ms', icon: Zap, color: 'text-yellow-600' }
  ]

  const recentActivities = [
    { action: 'Payment integration updated', user: 'Admin', time: '5 minutes ago', type: 'integration' },
    { action: 'Security audit completed', user: 'System', time: '1 hour ago', type: 'security' },
    { action: 'AI model retrained', user: 'Ashley AI', time: '2 hours ago', type: 'ai' },
    { action: 'Performance optimization run', user: 'System', time: '4 hours ago', type: 'performance' },
    { action: 'New analytics dashboard created', user: 'Admin', time: '6 hours ago', type: 'analytics' }
  ]

  return (
    <ResponsiveLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Settings className="h-8 w-8 text-gray-700" />
              <span>System Administration</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced system management and configuration
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Button variant="outline">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {sections.map(section => {
            const IconComponent = section.icon
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key as string)}
                className={`flex-shrink-0 px-4 py-2 rounded-md font-medium transition-all text-sm whitespace-nowrap ${
                  activeSection === section.key
                    ? 'bg-white dark:bg-gray-700 shadow-sm'
                    : 'hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <IconComponent className={`w-4 h-4 inline mr-2 ${section.color}`} />
                {section.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* System Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {systemStats.map((stat, index) => {
                  const IconComponent = stat.icon
                  return (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                          </div>
                          <IconComponent className={`h-8 w-8 ${stat.color}`} />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection('analytics')}
                    >
                      <BarChart3 className="h-6 w-6 mb-2 text-blue-600" />
                      <span>View Analytics</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection('integrations')}
                    >
                      <CreditCard className="h-6 w-6 mb-2 text-green-600" />
                      <span>Manage Integrations</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection('security')}
                    >
                      <Shield className="h-6 w-6 mb-2 text-red-600" />
                      <span>Security Center</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => setActiveSection('ai')}
                    >
                      <Brain className="h-6 w-6 mb-2 text-purple-600" />
                      <span>AI Dashboard</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent System Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant="outline" 
                            className={`
                              ${activity.type === 'integration' ? 'border-green-200 text-green-800' : ''}
                              ${activity.type === 'security' ? 'border-red-200 text-red-800' : ''}
                              ${activity.type === 'ai' ? 'border-purple-200 text-purple-800' : ''}
                              ${activity.type === 'performance' ? 'border-orange-200 text-orange-800' : ''}
                              ${activity.type === 'analytics' ? 'border-blue-200 text-blue-800' : ''}
                            `}
                          >
                            {activity.type}
                          </Badge>
                          <div>
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-sm text-gray-500">by {activity.user}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && <InteractiveCharts />}

          {/* Integrations Section */}
          {activeSection === 'integrations' && <PaymentIntegration />}

          {/* AI Section */}
          {activeSection === 'ai' && <PredictiveAnalytics />}

          {/* Security Section */}
          {activeSection === 'security' && <SecurityDashboard />}

          {/* Performance Section */}
          {activeSection === 'performance' && <PerformanceDashboard />}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <span>Theme & Appearance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-gray-600">Switch between light and dark themes</p>
                    </div>
                    <ThemeToggle />
                  </div>
                  
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Color Themes (Coming Soon)</h4>
                    <div className="grid grid-cols-6 gap-4">
                      {[
                        { name: 'Blue', color: 'bg-blue-600' },
                        { name: 'Purple', color: 'bg-purple-600' },
                        { name: 'Green', color: 'bg-green-600' },
                        { name: 'Red', color: 'bg-red-600' },
                        { name: 'Orange', color: 'bg-orange-600' },
                        { name: 'Pink', color: 'bg-pink-600' }
                      ].map(theme => (
                        <div key={theme.name} className="text-center">
                          <div className={`w-12 h-12 ${theme.color} rounded-lg mx-auto mb-2 cursor-pointer hover:scale-105 transition-transform`}></div>
                          <p className="text-xs text-gray-600">{theme.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">ResponsiveLayout Options (Coming Soon)</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input type="radio" id="compact" name="layout" defaultChecked />
                        <label htmlFor="compact" className="text-sm">Compact ResponsiveLayout</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input type="radio" id="comfortable" name="layout" />
                        <label htmlFor="comfortable" className="text-sm">Comfortable ResponsiveLayout</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input type="radio" id="spacious" name="layout" />
                        <label htmlFor="spacious" className="text-sm">Spacious ResponsiveLayout</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  )
}