// @ts-nocheck
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, Zap, Target, Shield, BarChart3, Users, Sparkles, Play, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    
    if (session) {
      router.push('/unified-dashboard')
      return
    }
    
    setMounted(true)
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6)
    }, 3000)
    return () => clearInterval(interval)
  }, [session, status, router])

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Production",
      description: "Ashley AI optimizes your entire manufacturing workflow with predictive analytics and smart automation.",
      color: "from-cyan-400 to-teal-400"
    },
    {
      icon: Target,
      title: "Smart Order Management",
      description: "Streamlined order processing with real-time tracking and intelligent routing optimization.",
      color: "from-teal-400 to-cyan-400"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time insights and forecasting to make data-driven decisions for your business.",
      color: "from-cyan-400 to-slate-700"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with role-based access control and audit trails.",
      color: "from-slate-700 to-cyan-400"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Seamless collaboration tools for teams across design, production, and quality control.",
      color: "from-teal-400 to-slate-700"
    },
    {
      icon: Zap,
      title: "Automation Engine",
      description: "Automated workflows, notifications, and process optimization to maximize efficiency.",
      color: "from-cyan-400 to-teal-400"
    }
  ]

  const testimonials = [
    {
      name: "Maria Santos",
      role: "CEO, Premium Apparel Co.",
      content: "ASH AI transformed our production efficiency by 300%. The AI insights are game-changing.",
      rating: 5
    },
    {
      name: "John Chen",
      role: "Operations Manager, Fashion Forward",
      content: "Best investment we've made. The system pays for itself within months.",
      rating: 5
    },
    {
      name: "Sarah Kim",
      role: "Production Director, Style Works",
      content: "Finally, a system that understands apparel manufacturing. Ashley AI is brilliant.",
      rating: 5
    }
  ]

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ASH AI</h1>
          <p className="text-gray-600">Initializing Manufacturing System...</p>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="simple-page-container">
      <div className="simple-content-wrapper">
        {/* Simple Header */}
        <div className="simple-header">
          <div className="simple-flex justify-between">
            <div className="simple-flex">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <img src="/Ash-AI.png" alt="ASH AI" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold simple-text-primary">ASH AI</h1>
                <p className="text-xs sm:text-sm simple-text-secondary">Apparel Smart Hub</p>
              </div>
            </div>
            
            <div className="simple-flex gap-2 sm:gap-4">
              <Link href="/auth/signin">
                <button className="simple-btn text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">Access Portal</button>
              </Link>
            </div>
          </div>
        </div>

        {/* Simple Main Content */}
        <div className="simple-main">
          <div className="text-center py-8 sm:py-12 md:py-16 px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold simple-text-primary mb-3 sm:mb-4">
              Welcome to ASH AI
            </h1>
            <p className="text-sm sm:text-base md:text-lg simple-text-secondary mb-6 sm:mb-8 max-w-2xl mx-auto">
              Intelligent apparel manufacturing system powered by AI. 
              Streamline your operations from design to delivery.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
              <Link href="/auth/signin">
                <button className="simple-btn w-full sm:w-auto text-xs px-4 py-2">Get Started</button>
              </Link>
              <Link href="/demo">
                <button className="simple-btn simple-btn-secondary w-full sm:w-auto text-xs px-4 py-2">Learn More</button>
              </Link>
            </div>

            {/* Simple Stats - Mobile Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
              <div className="simple-card text-center p-3 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-blue-600 mb-1 sm:mb-2">1,247</div>
                <div className="text-xs sm:text-sm simple-text-muted">Total Orders</div>
              </div>
              <div className="simple-card text-center p-3 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-green-600 mb-1 sm:mb-2">23</div>
                <div className="text-xs sm:text-sm simple-text-muted">Active Orders</div>
              </div>
              <div className="simple-card text-center p-3 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-purple-600 mb-1 sm:mb-2">₱2.8M</div>
                <div className="text-xs sm:text-sm simple-text-muted">Revenue</div>
              </div>
              <div className="simple-card text-center p-3 sm:p-6">
                <div className="text-lg sm:text-2xl font-bold text-orange-600 mb-1 sm:mb-2">94.2%</div>
                <div className="text-xs sm:text-sm simple-text-muted">Efficiency</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
