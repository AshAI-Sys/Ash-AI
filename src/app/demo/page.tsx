'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react'

export default function DemoLogin() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDemoLogin = () => {
    setIsLoading(true)
    // Simulate login process
    setTimeout(() => {
      // Create a demo session
      localStorage.setItem('demo_session', JSON.stringify({
        user: {
          id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@ash-ai.com',
          role: 'ADMIN',
          workspace_id: 'demo-workspace'
        },
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }))
      
      // Redirect to dashboard
      router.push('/dashboard')
    }, 1500)
  }

  return (
    <div className="min-h-screen neural-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-cyan-300 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <h1 className="text-4xl font-bold text-white mb-2">ASH AI Demo</h1>
          <p className="text-cyan-300">Experience the future of apparel manufacturing</p>
        </div>

        <div className="quantum-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Demo Access</h2>
            <p className="text-cyan-200 text-sm">No registration required - explore all features instantly</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">
                Demo Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-cyan-400" />
                <input
                  type="email"
                  value="demo@ash-ai.com"
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">
                Demo Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-cyan-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value="demo123"
                  disabled
                  className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-cyan-400 hover:text-cyan-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full neon-btn py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Logging in...
                </div>
              ) : (
                'Enter ASH AI Demo'
              )}
            </button>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
            <h3 className="text-white font-medium mb-2">🚀 Demo Features Include:</h3>
            <ul className="text-cyan-200 text-sm space-y-1">
              <li>• Complete ERP dashboard</li>
              <li>• Ashley AI analytics</li>
              <li>• Production management</li>
              <li>• Order tracking system</li>
              <li>• Client portal access</li>
              <li>• All 80+ features unlocked</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-6 text-cyan-400 text-sm">
          Demo session expires in 24 hours
        </div>
      </div>
    </div>
  )
}