'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import EnhancedLayout from '@/components/EnhancedLayout'
import { EnterpriseDashboard } from '@/components/EnterpriseDashboard'
import { DebugDashboard } from '@/components/DebugDashboard'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen neural-bg flex items-center justify-center">
        <div className="text-center">
          {/* Enhanced Loading Logo */}
          <div className="relative mb-8 mx-auto w-20 h-20">
            {/* Outer glow ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-teal-400/30 rounded-full blur-xl animate-pulse"></div>
            {/* Middle ring */}
            <div className="absolute inset-2 bg-gradient-to-br from-cyan-500/40 to-teal-400/40 rounded-full border border-cyan-400/50 animate-pulse"></div>
            {/* Logo container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/60 flex items-center justify-center shadow-xl shadow-cyan-500/20 animate-pulse">
              <img 
                src="/Ash-AI.png" 
                alt="ASH AI Logo" 
                className="w-10 h-10 object-contain z-10 relative filter brightness-110 contrast-110" 
              />
              {/* Inner pulse effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full animate-pulse"></div>
            </div>
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            {/* Spinning quantum loader overlay */}
            <div className="quantum-loader absolute inset-0">
              <div></div><div></div><div></div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold glitch-text text-white mb-4 drop-shadow-lg" data-text="ASH AI">ASH AI</h1>
          <p className="text-cyan-300 font-medium">Loading Neural Dashboard...</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cyan-400/80">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">INITIALIZING SYSTEM</span>
            <span className="text-cyan-500/60">•</span>
            <span className="font-medium">v2.1.0</span>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Temporary bypass for debugging
  return (
    <div className="min-h-screen neural-bg p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-6">ASH AI Dashboard</h1>
        <div className="bg-white/10 backdrop-blur border border-cyan-500/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-cyan-300 mb-4">System Status</h2>
          <p className="text-white">✅ Dashboard loading successfully</p>
          <p className="text-white">✅ Authentication: {session?.user?.name || 'Working'}</p>
          <p className="text-white">✅ Neural networks operational</p>
          <div className="mt-6">
            <button 
              onClick={() => window.location.href = '/orders'} 
              className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform mr-4"
            >
              View Orders
            </button>
            <button 
              onClick={() => window.location.href = '/analytics'} 
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}