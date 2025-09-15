// @ts-nocheck
// Email Verification Page - Account activation
// Production-ready email verification with security

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  AlertTriangle,
  Mail,
  RefreshCw,
  ArrowRight,
  Shield,
  Clock
} from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'resend'>('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    } else {
      setStatus('resend')
      setMessage('No verification token provided. Enter your email to resend verification.')
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/register?action=verify&token=${verificationToken}`)
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Your email has been verified successfully! You can now log in to your account.')
      } else {
        if (data.error?.includes('expired')) {
          setStatus('expired')
          setMessage('Your verification link has expired. Please request a new one.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed. Please try again.')
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage('Verification failed. Please check your internet connection and try again.')
    }
  }

  const handleResendVerification = async () => {
    if (!resendEmail) {
      setMessage('Please enter your email address')
      return
    }

    setResendLoading(true)
    try {
      const response = await fetch(`/api/auth/register?action=resend&email=${encodeURIComponent(resendEmail)}`)
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Verification email sent successfully! Please check your inbox.')
      } else {
        setMessage(data.error || 'Failed to send verification email')
      }
    } catch (error) {
      setMessage('Failed to send verification email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
      case 'expired':
        return <AlertTriangle className="h-8 w-8 text-red-600" />
      case 'resend':
        return <Mail className="h-8 w-8 text-blue-600" />
      default:
        return <Shield className="h-8 w-8 text-gray-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
      case 'expired':
        return 'text-red-600'
      case 'loading':
      case 'resend':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...'
      case 'success':
        return 'Email Verified Successfully!'
      case 'error':
        return 'Verification Failed'
      case 'expired':
        return 'Verification Link Expired'
      case 'resend':
        return 'Resend Verification Email'
      default:
        return 'Email Verification'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-2xl ${getStatusColor()}`}>
            {getStatusTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Message */}
          <div className="text-center">
            <p className="text-gray-600">{message}</p>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Please wait while we verify your email...</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Your account is now active and ready to use!
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button onClick={() => router.push('/auth/signin')} className="w-full">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Sign In to Your Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {message}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button
                  onClick={() => setStatus('resend')}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Request New Verification Email
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/auth/signin')}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          )}

          {/* Expired State */}
          {status === 'expired' && (
            <div className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <Clock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700">
                  Verification links expire after 24 hours for security. Please request a new one.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setStatus('resend')}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Get New Verification Link
              </Button>
            </div>
          )}

          {/* Resend Email Form */}
          {status === 'resend' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email Address</Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter the email address you used to register your account
                </p>
              </div>

              <Button
                onClick={handleResendVerification}
                disabled={resendLoading || !resendEmail}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Email
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/auth/signin"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* Additional Help */}
          <div className="pt-6 border-t">
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                Having trouble? Contact our support team
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <a href="mailto:support@ash-ai.com" className="text-blue-600 hover:text-blue-500">
                  support@ash-ai.com
                </a>
                <span className="text-gray-300">|</span>
                <Link href="/support" className="text-blue-600 hover:text-blue-500">
                  Help Center
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}