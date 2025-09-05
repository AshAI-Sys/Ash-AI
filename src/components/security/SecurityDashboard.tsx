'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Shield, 
  Key, 
  Lock, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Globe,
  Smartphone,
  Activity,
  Settings,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  QrCode
} from 'lucide-react'

interface SecurityEvent {
  id: string
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PERMISSION_DENIED' | 'DATA_ACCESS' | 'SYSTEM_CHANGE'
  user: string
  description: string
  ipAddress: string
  userAgent: string
  timestamp: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface TwoFactorAuth {
  id: string
  userId: string
  method: 'SMS' | 'EMAIL' | 'AUTHENTICATOR' | 'HARDWARE'
  enabled: boolean
  lastUsed?: string
  backupCodes: number
}

interface Permission {
  id: string
  name: string
  description: string
  category: 'SYSTEM' | 'DATA' | 'USER_MANAGEMENT' | 'FINANCIAL' | 'OPERATIONS'
  level: 'READ' | 'write' | 'admin'
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  color: string
}

export function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'permissions' | '2fa' | 'settings'>('overview')
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)

  const [securityEvents] = useState<SecurityEvent[]>([
    {
      id: 'evt_001',
      type: 'LOGIN_FAILED',
      user: 'unknown@email.com',
      description: 'Failed login attempt with invalid credentials',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      severity: 'MEDIUM'
    },
    {
      id: 'evt_002',
      type: 'DATA_ACCESS',
      user: 'admin@sorbetes.com',
      description: 'Accessed financial reports dashboard',
      ipAddress: '192.168.1.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      severity: 'LOW'
    },
    {
      id: 'evt_003',
      type: 'SYSTEM_CHANGE',
      user: 'admin@sorbetes.com',
      description: 'Modified user permissions for production team',
      ipAddress: '192.168.1.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      severity: 'HIGH'
    }
  ])

  const [twoFactorMethods] = useState<TwoFactorAuth[]>([
    {
      id: '2fa_001',
      userId: 'user_001',
      method: 'AUTHENTICATOR',
      enabled: true,
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      backupCodes: 8
    },
    {
      id: '2fa_002',
      userId: 'user_001',
      method: 'SMS',
      enabled: false,
      backupCodes: 0
    },
    {
      id: '2fa_003',
      userId: 'user_001',
      method: 'EMAIL',
      enabled: true,
      lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      backupCodes: 5
    }
  ])

  const [roles] = useState<Role[]>([
    {
      id: 'role_admin',
      name: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: ['system_admin', 'user_management', 'financial_access', 'data_export'],
      userCount: 2,
      color: 'bg-red-100 text-red-800'
    },
    {
      id: 'role_manager',
      name: 'Manager',
      description: 'Department management and reporting access',
      permissions: ['order_management', 'inventory_write', 'team_reports'],
      userCount: 5,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'role_operator',
      name: 'Operator',
      description: 'Production and quality control operations',
      permissions: ['production_read', 'quality_write', 'inventory_read'],
      userCount: 12,
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'role_viewer',
      name: 'Viewer',
      description: 'Read-only access to dashboards and reports',
      permissions: ['dashboard_read', 'reports_read'],
      userCount: 8,
      color: 'bg-gray-100 text-gray-800'
    }
  ])

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'LOGIN_SUCCESS': return CheckCircle
      case 'LOGIN_FAILED': return AlertTriangle
      case 'PERMISSION_DENIED': return Lock
      case 'DATA_ACCESS': return Eye
      case 'SYSTEM_CHANGE': return Settings
      default: return Activity
    }
  }

  const getMethodIcon = (method: TwoFactorAuth['method']) => {
    switch (method) {
      case 'SMS': return Smartphone
      case 'EMAIL': return Globe
      case 'AUTHENTICATOR': return QrCode
      case 'HARDWARE': return Key
      default: return Shield
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span>Security Center</span>
          </h2>
          <p className="text-gray-600">Comprehensive security monitoring and access control</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Security Report
          </Button>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-2xl font-bold text-green-600">94%</p>
                <p className="text-xs text-green-600">Excellent</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-blue-600">12</p>
                <p className="text-xs text-blue-600">Across 8 devices</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
                <p className="text-2xl font-bold text-orange-600">3</p>
                <p className="text-xs text-orange-600">Last 24 hours</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">2FA Enabled</p>
                <p className="text-2xl font-bold text-purple-600">89%</p>
                <p className="text-xs text-purple-600">Of all users</p>
              </div>
              <Key className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'overview', label: 'Overview', icon: Shield },
          { key: 'audit', label: 'Audit Log', icon: Activity },
          { key: 'permissions', label: 'Permissions', icon: Key },
          { key: '2fa', label: '2FA Setup', icon: Smartphone },
          { key: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => {
          const IconComponent = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all text-sm ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <IconComponent className="w-4 h-4 inline mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Security Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Security Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.slice(0, 5).map(event => {
                  const IconComponent = getEventIcon(event.type)
                  return (
                    <div key={event.id} className={`p-3 rounded-lg border ${getSeverityColor(event.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <IconComponent className="h-5 w-5 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{event.description}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {event.user} • {event.ipAddress}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Role Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={role.color}>
                        {role.name}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{role.description}</p>
                        <p className="text-xs text-gray-500">{role.permissions.length} permissions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{role.userCount}</p>
                      <p className="text-xs text-gray-500">users</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Security Audit Log</span>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Log
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityEvents.map(event => {
                const IconComponent = getEventIcon(event.type)
                return (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${getSeverityColor(event.severity)}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{event.description}</p>
                        <p className="text-sm text-gray-600">User: {event.user}</p>
                        <p className="text-xs text-gray-500">IP: {event.ipAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === '2fa' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>Two-Factor Authentication</span>
                </div>
                <Button onClick={() => setShow2FASetup(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Method
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {twoFactorMethods.map(method => {
                  const IconComponent = getMethodIcon(method.method)
                  return (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-6 w-6 text-gray-600" />
                        <div>
                          <p className="font-medium">{method.method}</p>
                          {method.lastUsed && (
                            <p className="text-sm text-gray-500">
                              Last used: {new Date(method.lastUsed).toLocaleDateString()}
                            </p>
                          )}
                          {method.backupCodes > 0 && (
                            <p className="text-xs text-gray-400">
                              {method.backupCodes} backup codes remaining
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={method.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {method.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Authenticator App Enabled</p>
                      <p className="text-sm text-blue-700">Your account is protected with time-based codes.</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Enable SMS Backup</p>
                      <p className="text-sm text-yellow-700">Add SMS as a backup 2FA method for account recovery.</p>
                      <Button size="sm" className="mt-2 bg-yellow-600 hover:bg-yellow-700">
                        Enable SMS
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start space-x-3">
                    <Key className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Backup Codes Available</p>
                      <p className="text-sm text-green-700">You have 8 backup codes for emergency access.</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        View Codes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Choose a method to secure your account with an additional layer of protection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <QrCode className="h-6 w-6 mb-2" />
                <span>Authenticator App</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Smartphone className="h-6 w-6 mb-2" />
                <span>SMS</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Globe className="h-6 w-6 mb-2" />
                <span>Email</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Key className="h-6 w-6 mb-2" />
                <span>Hardware Key</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}