// @ts-nocheck
// Multi-Factor Authentication Setup Page
// Production-ready MFA implementation with QR codes and verification

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Smartphone,
  QrCode,
  Key,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'

interface MFASetupData {
  secret: string
  qrCode: string
  backupCodes: string[]
  appName: string
  accountName: string
}

export default function MFASetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [mfaData, setMfaData] = useState<MFASetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)

  const totalSteps = 4
  const progressPercentage = (currentStep / totalSteps) * 100

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user already has MFA enabled
    checkMFAStatus()
  }, [session, status, router])

  const checkMFAStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status')
      const data = await response.json()

      if (data.enabled) {
        router.push('/auth/mfa-manage')
        return
      }
    } catch (error) {
      console.error('Failed to check MFA status:', error)
    }
  }

  const initializeMFA = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        setMfaData(data.data)
        setCurrentStep(2)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to initialize MFA setup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Setup initialization failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const verifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          secret: mfaData?.secret
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'MFA verification successful!' })
        setCurrentStep(3)
      } else {
        setMessage({ type: 'error', text: data.error || 'Invalid verification code' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Verification failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const completeMFASetup = async () => {
    if (!backupCodesDownloaded) {
      setMessage({ type: 'error', text: 'Please download your backup codes before completing setup' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: mfaData?.secret
        })
      })

      const data = await response.json()

      if (data.success) {
        setCurrentStep(4)
        setMessage({ type: 'success', text: 'Multi-Factor Authentication has been successfully enabled!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enable MFA' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Setup completion failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const copySecret = async () => {
    if (mfaData?.secret) {
      await navigator.clipboard.writeText(mfaData.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    }
  }

  const downloadBackupCodes = () => {
    if (!mfaData?.backupCodes) return

    const content = `ASH AI - Multi-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}
Account: ${session?.user?.email}

IMPORTANT: Store these codes securely. Each code can only be used once.

${mfaData.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

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

    setBackupCodesDownloaded(true)
  }

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed'
    if (step === currentStep) return 'current'
    return 'pending'
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enable Multi-Factor Authentication</h1>
          <p className="text-gray-600">Add an extra layer of security to your ASH AI account</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {[
            { step: 1, title: 'Get Started', icon: Shield },
            { step: 2, title: 'Setup App', icon: QrCode },
            { step: 3, title: 'Verify', icon: Key },
            { step: 4, title: 'Complete', icon: CheckCircle }
          ].map(({ step, title, icon: Icon }) => {
            const status = getStepStatus(step)
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2
                  ${status === 'completed' ? 'bg-green-100 text-green-600' :
                    status === 'current' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-xs ${status === 'current' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-8">
            {/* Step 1: Introduction */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Secure Your Account</h2>
                  <p className="text-gray-600 mb-6">
                    Multi-Factor Authentication (MFA) adds an extra layer of security by requiring a code from your phone in addition to your password.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Smartphone className="h-8 w-8 text-blue-600 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Authenticator App Required</h3>
                    <p className="text-sm text-gray-600">
                      You'll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <Shield className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Enhanced Security</h3>
                    <p className="text-sm text-gray-600">
                      Protect your account from unauthorized access even if your password is compromised.
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This process takes about 5 minutes and significantly improves your account security.
                  </AlertDescription>
                </Alert>

                <div className="text-center">
                  <Button onClick={initializeMFA} disabled={loading} className="px-8">
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Begin Setup
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: QR Code Setup */}
            {currentStep === 2 && mfaData && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Scan QR Code</h2>
                  <p className="text-gray-600">
                    Open your authenticator app and scan the QR code below, or manually enter the setup key.
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-6">
                  {/* QR Code */}
                  <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                    <img
                      src={mfaData.qrCode}
                      alt="MFA QR Code"
                      className="w-48 h-48"
                    />
                  </div>

                  {/* Manual Setup Key */}
                  <div className="w-full max-w-md">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Manual Setup Key (if you can't scan)
                    </Label>
                    <div className="flex">
                      <Input
                        value={mfaData.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                        className="ml-2"
                      >
                        {secretCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* App Info */}
                  <div className="bg-gray-50 p-4 rounded-lg w-full">
                    <h4 className="font-medium text-gray-900 mb-2">Account Details:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>App:</strong> {mfaData.appName}</div>
                      <div><strong>Account:</strong> {mfaData.accountName}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(3)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    I've Added the Account
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Verification */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verify Setup</h2>
                  <p className="text-gray-600">
                    Enter the 6-digit code from your authenticator app to verify the setup.
                  </p>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  <div>
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setVerificationCode(value)
                        setMessage(null)
                      }}
                      placeholder="123456"
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the current code from your authenticator app
                    </p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={verifyMFA}
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Backup Codes and Completion */}
            {currentStep === 4 && mfaData && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Setup Complete!</h2>
                  <p className="text-gray-600">
                    Multi-Factor Authentication is now enabled for your account.
                  </p>
                </div>

                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Your account is now protected with Multi-Factor Authentication. You'll need your authenticator app to sign in.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Important Next Steps:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">1</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Keep your authenticator app installed and accessible on your primary device.
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">2</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Store your backup codes in a secure location separate from your device.
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">3</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Test your setup by signing out and signing back in.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <Button onClick={() => router.push('/dashboard')} className="px-8">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue to Dashboard
                  </Button>

                  <div className="text-sm text-gray-500">
                    You can manage your MFA settings in your{' '}
                    <button
                      onClick={() => router.push('/profile/security')}
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      security settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {message && (
              <Alert className={`mt-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                {message.type === 'error' ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Backup Codes Section (Step 3) */}
            {currentStep === 3 && message?.type === 'success' && mfaData && (
              <div className="mt-8 p-6 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Backup Codes</h3>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Important
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </p>

                <div className="space-y-4">
                  {!showBackupCodes ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowBackupCodes(true)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show Backup Codes
                    </Button>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded border font-mono text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          {mfaData.backupCodes.map((code, index) => (
                            <div key={index} className="text-center py-1">
                              {code}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowBackupCodes(false)}
                          className="flex-1"
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Codes
                        </Button>
                        <Button
                          onClick={downloadBackupCodes}
                          disabled={backupCodesDownloaded}
                          className="flex-1"
                        >
                          {backupCodesDownloaded ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Downloaded
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={completeMFASetup}
                    disabled={loading || !backupCodesDownloaded}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Completing Setup...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete MFA Setup
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}