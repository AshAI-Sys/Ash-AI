// @ts-nocheck
// ASH AI Production Login Page
// Production ready with authentication

'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, LogIn, AlertCircle, Loader2, Shield } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push('/unified-dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      } else {
        // Successful login
        router.push('/unified-dashboard')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <img src="/Ash-AI.png" alt="ASH AI" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
            <p className="text-gray-600 mt-2">Sign in to ASH AI Production System</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            <div className="text-center text-sm">
              <p className="text-gray-600 mb-2">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-blue-600 hover:text-blue-500 font-medium">
                  Register here
                </Link>
              </p>
              <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-500 text-xs">
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Demo Credentials
            </h4>
            <div className="text-xs text-blue-800 space-y-1">
              <div><strong>Admin:</strong> admin@example.com / admin123</div>
              <div><strong>Manager:</strong> manager@example.com / manager123</div>
              <div><strong>Operator:</strong> sewing@example.com / sewing123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}