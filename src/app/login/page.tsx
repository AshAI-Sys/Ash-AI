// @ts-nocheck
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

type LoginMode = 'admin' | 'client'

export default function TikTokLogin() {
  const [mode, setMode] = useState<LoginMode>('admin')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'admin') {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Invalid credentials')
        } else {
          router.push('/analytics')
        }
      } else {
        const response = await fetch('/api/client-portal/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            remember_me: formData.rememberMe
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          router.push('/client-portal')
        } else {
          setError(data.error || 'Login failed')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    if (mode === 'admin') {
      setFormData({
        email: 'admin@example.com',
        password: 'admin123',
        rememberMe: false
      })
    } else {
      setFormData({
        email: 'client@example.com',
        password: 'demo123',
        rememberMe: false
      })
    }
  }

  const toggleMode = () => {
    setMode(mode === 'admin' ? 'client' : 'admin')
    setFormData({ email: '', password: '', rememberMe: false })
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* TikTok Sidebar */}
      <div className="fixed left-0 top-0 h-full w-16 bg-black flex flex-col items-center py-4">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-8">
          <span className="text-black font-bold text-sm">🎵</span>
        </div>
      </div>

      {/* Main Login Content */}
      <div className="ml-16 flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* TikTok Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">🎵</span>
              </div>
              <span className="text-lg font-medium text-gray-600">TikTok</span>
              <span className="text-lg font-medium text-gray-900">Seller Center</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sign in to your account</h1>
            <p className="text-gray-600">Access your dashboard and manage your business</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Mode Toggle */}
            <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('admin')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  mode === 'admin'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setMode('client')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  mode === 'client'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Client
              </button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-11 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                  }
                />
                <Label htmlFor="rememberMe" className="text-sm text-gray-700">
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-black hover:bg-gray-800 text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm font-medium text-teal-800 mb-2">
                Demo Credentials
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillDemoCredentials}
                className="w-full mb-3 text-teal-700 border-teal-300 hover:bg-teal-100"
              >
                Use Demo Credentials
              </Button>
              <div className="text-xs text-teal-700">
                {mode === 'admin' ? (
                  <p className="font-mono">admin@example.com / admin123</p>
                ) : (
                  <p className="font-mono">client@example.com / demo123</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-gray-500">
            <p>© 2024 TikTok Seller Center. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}