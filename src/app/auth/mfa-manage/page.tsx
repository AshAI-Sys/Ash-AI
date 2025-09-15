// @ts-nocheck
// MFA Management Page - Manage existing MFA settings
// Production-ready MFA configuration management

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Clock,
  ArrowLeft,
  Settings,
  Trash2,
  Plus
} from 'lucide-react'

interface MFAStatus {
  enabled: boolean
  hasSecret: boolean
  backupCodesCount: number
  enabledAt: string | null
  lastUsed: string | null
  accountSecurity: {
    mfaEnabled: boolean
    hasBackupCodes: boolean
    lowBackupCodes: boolean
    recommendActions: string[]
  }
}

export default function MFAManagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchMFAStatus()
  }, [session, status, router])

  const fetchMFAStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status')
      const data = await response.json()

      if (data.success) {
        setMfaStatus(data.data)

        // If MFA is not enabled, redirect to setup
        if (!data.data.enabled) {
          router.push('/auth/mfa-setup')
          return
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load MFA status' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load MFA status' })
    } finally {
      setLoading(false)
    }
  }

  const generateNewBackupCodes = async () => {
    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/mfa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        setBackupCodes(data.data.codes)
        setShowBackupCodes(true)
        setMessage({ type: 'success', text: 'New backup codes generated successfully' })
        // Refresh status
        fetchMFAStatus()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate backup codes' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate backup codes' })
    } finally {
      setActionLoading(false)
    }
  }

  const disableMFA = async () => {
    if (!disablePassword || !confirmDisable) {
      setMessage({ type: 'error', text: 'Please provide your password and confirm the action' })
      return
    }

    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: disablePassword,
          confirmDisable: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'MFA has been disabled successfully' })
        setTimeout(() => {
          router.push('/auth/mfa-setup')
        }, 2000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disable MFA' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disable MFA' })
    } finally {
      setActionLoading(false)
    }
  }

  const downloadBackupCodes = () => {
    if (backupCodes.length === 0) return

    const content = `ASH AI - Multi-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}
Account: ${session?.user?.email}

IMPORTANT: Store these codes securely. Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Instructions:
- Use these codes if you lose access to your authenticator app
- Each code works only once
- Keep them in a secure location separate from your device
- Generate new codes if you use more than half of them`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ash-ai-backup-codes-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getSecurityLevel = () => {
    if (!mfaStatus) return { level: 'unknown', color: 'gray', icon: Shield }

    if (mfaStatus.enabled && mfaStatus.backupCodesCount > 5) {
      return { level: 'excellent', color: 'green', icon: ShieldCheck }
    } else if (mfaStatus.enabled && mfaStatus.backupCodesCount > 2) {
      return { level: 'good', color: 'blue', icon: Shield }
    } else if (mfaStatus.enabled) {
      return { level: 'fair', color: 'yellow', icon: ShieldAlert }
    } else {
      return { level: 'poor', color: 'red', icon: ShieldAlert }
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span>Loading MFA settings...</span>
        </div>
      </div>
    )
  }

  const securityLevel = getSecurityLevel()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Factor Authentication</h1>
            <p className="text-gray-600">Manage your account security settings</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <securityLevel.icon className={`h-6 w-6 mr-2 text-${securityLevel.color}-600`} />
                  MFA Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Multi-Factor Authentication</span>
                    <Badge variant={mfaStatus?.enabled ? 'default' : 'destructive'}>
                      {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>

                  {mfaStatus?.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Enabled on</span>
                        <span className="text-sm">
                          {mfaStatus.enabledAt ? new Date(mfaStatus.enabledAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last used</span>
                        <span className="text-sm">
                          {mfaStatus.lastUsed ? new Date(mfaStatus.lastUsed).toLocaleDateString() : 'Never'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Backup codes</span>
                        <Badge variant={mfaStatus.backupCodesCount > 5 ? 'default' : 'destructive'}>
                          {mfaStatus.backupCodesCount} remaining
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Backup Codes Management */}
            {mfaStatus?.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2" />
                    Backup Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Backup codes can be used to access your account if you lose your authenticator device.
                      Each code can only be used once.
                    </p>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">
                          {mfaStatus.backupCodesCount} codes remaining
                        </div>
                        <div className="text-xs text-gray-500">
                          {mfaStatus.backupCodesCount < 3 && 'Consider generating new codes'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateNewBackupCodes}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Generate New
                          </>
                        )}
                      </Button>
                    </div>

                    {showBackupCodes && backupCodes.length > 0 && (
                      <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-orange-800">New Backup Codes</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={downloadBackupCodes}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                          {backupCodes.map((code, index) => (
                            <div key={index} className="p-2 bg-white rounded border text-center">
                              {code}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-orange-700 mt-3">
                          ⚠️ Save these codes securely. They replace your previous backup codes.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disable MFA */}
            {mfaStatus?.enabled && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <Trash2 className="h-5 w-5 mr-2" />
                    Disable MFA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!showDisableForm ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Disabling MFA will reduce your account security. Only disable if you're setting up a new device.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDisableForm(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disable MFA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          This will disable Multi-Factor Authentication for your account.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="disable-password">Current Password</Label>
                          <Input
                            id="disable-password"
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Enter your current password"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="confirm-disable"
                            checked={confirmDisable}
                            onChange={(e) => setConfirmDisable(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="confirm-disable" className="text-sm">
                            I understand this will reduce my account security
                          </Label>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDisableForm(false)
                            setDisablePassword('')
                            setConfirmDisable(false)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={disableMFA}
                          disabled={actionLoading || !disablePassword || !confirmDisable}
                        >
                          {actionLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Disabling...
                            </>
                          ) : (
                            'Confirm Disable'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-${securityLevel.color}-100`}>
                    <securityLevel.icon className={`h-8 w-8 text-${securityLevel.color}-600`} />
                  </div>
                  <div>
                    <div className={`text-lg font-semibold text-${securityLevel.color}-600 capitalize`}>
                      {securityLevel.level}
                    </div>
                    <div className="text-sm text-gray-500">Security Level</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {mfaStatus?.accountSecurity?.recommendActions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mfaStatus.accountSecurity.recommendActions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm text-gray-600">{action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => router.push('/profile/security')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Security Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => router.push('/auth/sessions')}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Active Sessions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => router.push('/security/audit-log')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Security Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mt-6">
            <Alert className={`${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              {message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                {message.text}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  )
}