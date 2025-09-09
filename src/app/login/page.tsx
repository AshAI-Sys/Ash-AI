'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Brain, Eye, EyeOff, Lock, Mail, Package, Shield, User } from 'lucide-react'

type LoginMode = 'admin' | 'client'

export default function UnifiedLogin() {
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
        // Admin login via NextAuth
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Invalid credentials')
        } else {
          router.push('/dashboard')
        }
      } else {
        // Client login via custom auth
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

  // Demo credentials
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
    <div className="simple-page-container">
      <div className="simple-content-wrapper max-w-md mx-auto mt-4 sm:mt-8 md:mt-20">
        {/* Simple Header - Mobile Responsive */}
        <div className="text-center mb-6 p-4 sm:mb-8 sm:p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <img src="/Ash-AI.png" alt="ASH AI Logo" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold simple-text-primary mb-2">
            ASH AI
          </h1>
          
          <p className="text-xs sm:text-sm simple-text-secondary mb-4 sm:mb-6">
            {mode === 'admin' ? 'Admin Portal' : 'Client Portal'}
          </p>

          {/* Simple Mode Switch - Mobile Responsive */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4 sm:mb-6">
            <button
              onClick={() => mode !== 'admin' && toggleMode()}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded transition-all ${
                mode === 'admin' 
                  ? 'simple-btn' 
                  : 'simple-btn-secondary'
              }`}
            >
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
              Admin
            </button>
            <button
              onClick={() => mode !== 'client' && toggleMode()}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded transition-all ${
                mode === 'client' 
                  ? 'simple-btn' 
                  : 'simple-btn-secondary'
              }`}
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
              Client
            </button>
          </div>
        </div>

        <div className="simple-card">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold simple-text-primary mb-2">
              {mode === 'admin' ? 'Admin Access' : 'Sign In'}
            </h2>
            <p className="text-sm simple-text-secondary">
              {mode === 'admin' 
                ? 'Administrative access to systems'
                : 'Enter your credentials to access portal'
              }
            </p>
          </div>
            {error && (
              <Alert variant="destructive" className={mode === 'admin' ? 'bg-red-500/20 backdrop-blur-sm border-red-500/50 neon-glow' : ''}>
                <AlertDescription className={mode === 'admin' ? 'text-red-300' : ''}>
                  {mode === 'admin' ? '⚠ NEURAL ACCESS DENIED: ' : ''}{error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm text-slate-700 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={mode === 'admin' ? 'admin@example.com' : 'your@email.com'}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-10 text-sm border-slate-200 rounded-lg focus:border-blue-300 focus:ring-blue-100 focus:ring-2 transition-all placeholder:text-slate-500 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-10 text-sm border-slate-200 rounded-lg focus:border-blue-300 focus:ring-blue-100 focus:ring-2 transition-all placeholder:text-slate-500 text-slate-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'client' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                    }
                  />
                  <Label htmlFor="rememberMe" className="text-sm">
                    Remember me for 30 days
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-elegant hover:shadow-soft transition-all duration-200 text-sm"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Signing In...
                  </div>
                ) : (
                  mode === 'admin' ? 'Sign In to Dashboard' : 'Sign In'
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold mb-2 text-blue-800">
                Demo Access (Development Only)
              </p>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillDemoCredentials}
                className="w-full mb-2 text-blue-700 border-blue-300 hover:bg-blue-100 rounded-md transition-all text-xs h-8"
              >
                Fill Demo Credentials
              </Button>
              
              <div className="text-xs space-y-1 text-blue-700">
                {mode === 'admin' ? (
                  <>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="font-semibold text-xs bg-blue-200 px-1.5 py-0.5 rounded text-xs">ADMIN</span>
                      <span className="font-mono text-xs">admin@example.com / admin123</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="font-semibold text-xs bg-slate-200 px-1.5 py-0.5 rounded text-xs">MANAGER</span>
                      <span className="font-mono text-xs">manager@example.com / admin123</span>
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-xs">Email: client@example.com • Password: demo123</p>
                )}
              </div>
            </div>

            {mode === 'client' && (
              <div className="text-center text-xs text-gray-600 mt-3">
                <p>Need help accessing your account?</p>
                <a href="mailto:support@ash-ai.com" className="text-blue-600 hover:underline">
                  Contact Support
                </a>
              </div>
            )}
        </div>

        <div className="text-center text-xs mt-4 text-slate-400">
          <p>© 2024 ASH AI. All rights reserved.</p>
          <p className="mt-1">
            {mode === 'admin' 
              ? 'Manufacturing intelligence platform' 
              : 'Secure client portal powered by ASH AI'
            }
          </p>
        </div>
      </div>
    </div>
  )
}