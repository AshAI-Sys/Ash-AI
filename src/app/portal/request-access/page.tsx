// @ts-nocheck
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  Mail,
  Package,
  Shield,
  CheckCircle,
  AlertCircle,
  Send,
  Star,
  Sparkles,
  Users,
  Clock,
  Award,
  Zap,
  Target,
  TrendingUp,
  ArrowRight
} from 'lucide-react'

export default function RequestAccess() {
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/portal/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          order_number: orderNumber.trim()
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Access link sent! Please check your email.')
        setEmail('')
        setOrderNumber('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to send access link')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Branding & Features */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-600 bg-clip-text text-transparent">
                  ASH AI
                </h1>
                <p className="text-2xl text-gray-600 font-medium">Client Portal Access</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                Welcome to the Future of
                <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Apparel Manufacturing
                </span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Get instant access to your orders, track production in real-time, and collaborate 
                with our AI-powered manufacturing platform. Join 500+ satisfied clients.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">10K+</p>
                <p className="text-sm text-gray-600 font-medium">Orders Completed</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">500+</p>
                <p className="text-sm text-gray-600 font-medium">Happy Clients</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900">98%</p>
                <p className="text-sm text-gray-600 font-medium">On-Time Delivery</p>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Real-time Tracking</h3>
                </div>
                <p className="text-sm text-gray-600">Monitor every step of your production process live</p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">AI-Powered Insights</h3>
                </div>
                <p className="text-sm text-gray-600">Get intelligent analytics and recommendations</p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Lightning Fast</h3>
                </div>
                <p className="text-sm text-gray-600">Instant updates and notifications</p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Enterprise Security</h3>
                </div>
                <p className="text-sm text-gray-600">Bank-level security for your data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Access Form */}
        <div className="w-full max-w-lg mx-auto lg:mx-0">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-2xl shadow-gray-200/50 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-4 lg:hidden">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Request Access</h2>
              <p className="text-gray-600 text-lg">Get secure access to your manufacturing portal</p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200">
                  <Star className="w-3 h-3 mr-1" />
                  Trusted Platform
                </Badge>
                <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Instant Access
                </Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <Alert className={`${
                  status === 'success' ? 'border-green-200 bg-green-50' : 
                  status === 'error' ? 'border-red-200 bg-red-50' : ''
                }`}>
                  <div className="flex items-center space-x-2">
                    {status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={`font-medium ${
                      status === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your.email@company.com"
                      className="pl-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="orderNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                    Order Number <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="orderNumber"
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="REEF-2025-000123"
                      className="pl-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 font-medium">
                    Leave blank to access all your orders
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 text-base"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Sending Access Link...
                  </div>
                ) : (
                  <>
                    Send Access Link
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">Enterprise Security</span>
              </div>
              <div className="text-center text-xs text-gray-500 space-y-2">
                <p className="font-medium">🔒 Magic-link authentication with enterprise-grade encryption</p>
                <p>⏰ Access links expire in 24 hours for maximum security</p>
                <p>🛡️ SOC 2 compliant infrastructure with 99.9% uptime</p>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50/70 backdrop-blur-xl rounded-2xl border border-blue-200/50">
              <p className="text-xs text-blue-800 font-semibold text-center mb-2">Demo Access</p>
              <div className="text-xs text-center">
                <p className="font-medium text-blue-700">demo@client.com</p>
                <p className="text-blue-600">Try with any order number for instant demo access</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}