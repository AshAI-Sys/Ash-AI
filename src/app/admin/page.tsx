// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { TikTokCenteredLayout, TikTokPageHeader, TikTokContentCard, TikTokMetricsGrid, TikTokMetricCard } from '@/components/TikTokCenteredLayout'
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
  Monitor,
  Server,
  Cpu,
  HardDrive,
  Network,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Globe,
  Lock,
  Wifi,
  RefreshCw
} from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<'overview' | 'analytics' | 'integrations' | 'ai' | 'security' | 'performance' | 'appearance'>('overview')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) return null

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
    { 
      label: 'System Uptime', 
      value: '99.9%', 
      icon: Monitor, 
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-100',
      trend: { value: '+0.2% vs last month', direction: 'up' as const }
    },
    { 
      label: 'Active Users', 
      value: '127', 
      icon: Users, 
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100',
      trend: { value: '+15 vs yesterday', direction: 'up' as const }
    },
    { 
      label: 'Database Health', 
      value: 'Excellent', 
      icon: Database, 
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-100',
      trend: { value: 'All systems operational', direction: 'neutral' as const }
    },
    { 
      label: 'API Response', 
      value: '145ms', 
      icon: Zap, 
      iconColor: 'text-yellow-600',
      iconBgColor: 'bg-yellow-100',
      trend: { value: '-12ms improvement', direction: 'up' as const }
    },
    { 
      label: 'Server Load', 
      value: '23%', 
      icon: Server, 
      iconColor: 'text-purple-600',
      iconBgColor: 'bg-purple-100',
      trend: { value: 'Normal load', direction: 'neutral' as const }
    },
    { 
      label: 'CPU Usage', 
      value: '45%', 
      icon: Cpu, 
      iconColor: 'text-orange-600',
      iconBgColor: 'bg-orange-100',
      trend: { value: '-5% vs avg', direction: 'up' as const }
    },
    { 
      label: 'Memory Usage', 
      value: '67%', 
      icon: HardDrive, 
      iconColor: 'text-red-600',
      iconBgColor: 'bg-red-100',
      trend: { value: '+3% vs yesterday', direction: 'down' as const }
    },
    { 
      label: 'Network I/O', 
      value: '2.4 GB/s', 
      icon: Network, 
      iconColor: 'text-indigo-600',
      iconBgColor: 'bg-indigo-100',
      trend: { value: 'Peak: 3.1 GB/s', direction: 'neutral' as const }
    }
  ]

  const recentActivities = [
    { action: 'Payment integration updated', user: 'Admin', time: '5 minutes ago', type: 'integration' },
    { action: 'Security audit completed', user: 'System', time: '1 hour ago', type: 'security' },
    { action: 'AI model retrained', user: 'Ashley AI', time: '2 hours ago', type: 'ai' },
    { action: 'Performance optimization run', user: 'System', time: '4 hours ago', type: 'performance' },
    { action: 'New analytics dashboard created', user: 'Admin', time: '6 hours ago', type: 'analytics' }
  ]

  return (
    <TikTokLayout>
      <TikTokCenteredLayout>
        <TikTokPageHeader
          title="System Administration"
          description="Advanced system management and configuration"
          icon={<Settings className="h-8 w-8 text-gray-700" />}
          actions={
            <>
              <ThemeToggle />
              <Button variant="outline" className="border-gray-300">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
            </>
          }
        />

        {/* Navigation */}
        <TikTokContentCard>
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
            {sections.map(section => {
              const IconComponent = section.icon
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key as typeof activeSection)}
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
        </TikTokContentCard>

        {/* Content */}
        <div className="space-y-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* System Status Cards */}
              <TikTokMetricsGrid cols={4}>
                {systemStats.map((stat, index) => (
                  <TikTokMetricCard
                    key={index}
                    title={stat.label}
                    value={stat.value}
                    icon={<stat.icon className="w-4 h-4" />}
                    iconColor={stat.iconColor}
                    iconBgColor={stat.iconBgColor}
                    trend={stat.trend}
                  />
                ))}
              </TikTokMetricsGrid>

              {/* Quick Actions */}
              <TikTokContentCard title="Quick Actions">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col border-gray-300 hover:bg-blue-50"
                    onClick={() => setActiveSection('analytics')}
                  >
                    <BarChart3 className="h-6 w-6 mb-2 text-blue-600" />
                    <span>View Analytics</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col border-gray-300 hover:bg-green-50"
                    onClick={() => setActiveSection('integrations')}
                  >
                    <CreditCard className="h-6 w-6 mb-2 text-green-600" />
                    <span>Manage Integrations</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col border-gray-300 hover:bg-red-50"
                    onClick={() => setActiveSection('security')}
                  >
                    <Shield className="h-6 w-6 mb-2 text-red-600" />
                    <span>Security Center</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col border-gray-300 hover:bg-purple-50"
                    onClick={() => setActiveSection('ai')}
                  >
                    <Brain className="h-6 w-6 mb-2 text-purple-600" />
                    <span>AI Dashboard</span>
                  </Button>
                </div>
              </TikTokContentCard>

              {/* Recent Activities */}
              <TikTokContentCard title="Recent System Activities">
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={`
                            ${activity.type === 'integration' ? 'border-green-200 text-green-800 bg-green-50' : ''}
                            ${activity.type === 'security' ? 'border-red-200 text-red-800 bg-red-50' : ''}
                            ${activity.type === 'ai' ? 'border-purple-200 text-purple-800 bg-purple-50' : ''}
                            ${activity.type === 'performance' ? 'border-orange-200 text-orange-800 bg-orange-50' : ''}
                            ${activity.type === 'analytics' ? 'border-blue-200 text-blue-800 bg-blue-50' : ''}
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
              </TikTokContentCard>
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
              <TikTokContentCard>
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <Palette className="h-5 w-5 text-pink-600" />
                    <h3 className="text-xl font-semibold">Theme & Appearance</h3>
                  </div>

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
                    <h4 className="font-medium mb-4">Layout Options (Coming Soon)</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input type="radio" id="compact" name="layout" defaultChecked />
                        <label htmlFor="compact" className="text-sm">Compact Layout</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input type="radio" id="comfortable" name="layout" />
                        <label htmlFor="comfortable" className="text-sm">Comfortable Layout</label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input type="radio" id="spacious" name="layout" />
                        <label htmlFor="spacious" className="text-sm">Spacious Layout</label>
                      </div>
                    </div>
                  </div>
                </div>
              </TikTokContentCard>
            </div>
          )}
        </div>
      </TikTokCenteredLayout>
    </TikTokLayout>
  )
}