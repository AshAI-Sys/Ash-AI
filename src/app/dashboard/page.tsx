// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Layout from '@/components/Layout'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  FileText,
  Package,
  Palette,
  Plus,
  Printer,
  Scissors,
  Settings,
  Shield,
  Star,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  Zap
} from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    setMounted(true)
  }, [session, status, router])

  if (status === 'loading' || !mounted) {
    return (
      <div className="flex h-screen neural-bg items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6 mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-cyan-400/30 rounded-full blur-lg animate-pulse"></div>
            <div className="absolute inset-1 bg-gradient-to-br from-cyan-400/30 to-cyan-500/40 rounded-full border border-cyan-400/50 animate-pulse"></div>
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/60 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <img
                src="/ash-ai-logo-hero.svg"
                alt="ASH AI Logo"
                className="w-20 h-8 object-contain z-10 relative filter brightness-125 contrast-125 animate-pulse shadow-lg shadow-cyan-500/40"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-cyan-400/20 rounded-full animate-pulse"></div>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-cyan-300 font-medium">Loading ASH AI Dashboard...</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cyan-400/80">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">NEURAL INTERFACE STARTING</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen p-6">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>

      {/* Dashboard Header */}
      <div className="relative z-10 mb-8">
        <div className="hologram-card backdrop-blur-xl border-cyan-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="ai-orb w-12 h-12">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  🎖️ ASH AI Dashboard
                </h1>
                <p className="text-cyan-300 mt-1">
                  Neural Command Center - Welcome back, {session?.user?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/50 animate-pulse">
                <Activity className="w-4 h-4 mr-2" />
                System Online
              </Badge>
              <Button className="neon-btn">
                <Plus className="w-4 h-4 mr-2" />
                Quick Action
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hologram-card border-cyan-500/30 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-300">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">847</div>
            <p className="text-xs text-cyan-400">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hologram-card border-green-500/30 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-300">Production Efficiency</CardTitle>
            <Target className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">94.2%</div>
            <p className="text-xs text-green-400">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Optimal performance
            </p>
          </CardContent>
        </Card>

        <Card className="hologram-card border-purple-500/30 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₱2.4M</div>
            <p className="text-xs text-purple-400">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +8.2% this quarter
            </p>
          </CardContent>
        </Card>

        <Card className="hologram-card border-orange-500/30 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-300">AI Insights</CardTitle>
            <Brain className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">156</div>
            <p className="text-xs text-orange-400">
              <Zap className="w-3 h-3 inline mr-1" />
              Active recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="relative z-10 mb-8">
        <Card className="hologram-card border-cyan-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Actions & Navigation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button
                onClick={() => router.push('/orders')}
                className="neon-btn flex flex-col items-center gap-2 h-20"
              >
                <Package className="w-6 h-6" />
                <span className="text-xs">Orders</span>
              </Button>
              <Button
                onClick={() => router.push('/production')}
                className="neon-btn flex flex-col items-center gap-2 h-20"
              >
                <Target className="w-6 h-6" />
                <span className="text-xs">Production</span>
              </Button>
              <Button
                onClick={() => router.push('/design-approval')}
                className="neon-btn flex flex-col items-center gap-2 h-20"
              >
                <Palette className="w-6 h-6" />
                <span className="text-xs">Design</span>
              </Button>
              <Button
                onClick={() => router.push('/qc')}
                className="neon-btn flex flex-col items-center gap-2 h-20"
              >
                <Shield className="w-6 h-6" />
                <span className="text-xs">Quality</span>
              </Button>
              <Button
                onClick={() => router.push('/finance')}
                className="neon-btn flex flex-col items-center gap-2 h-20"
              >
                <Wallet className="w-6 h-6" />
                <span className="text-xs">Finance</span>
              </Button>
              <Button
                onClick={() => router.push('/ai-assistant')}
                className="neon-btn flex flex-col items-center gap-2 h-20"
              >
                <Brain className="w-6 h-6" />
                <span className="text-xs">Ashley AI</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Pipeline Status */}
      <div className="relative z-10 mb-8">
        <Card className="hologram-card border-cyan-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Production Pipeline Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                <Palette className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold text-white">24</div>
                <div className="text-xs text-blue-300">Design</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                <Scissors className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-white">18</div>
                <div className="text-xs text-yellow-300">Cutting</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-purple-500/30 bg-purple-500/10">
                <Printer className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-white">32</div>
                <div className="text-xs text-purple-300">Printing</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-green-500/30 bg-green-500/10">
                <Wrench className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-white">45</div>
                <div className="text-xs text-green-300">Sewing</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                <Shield className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-xs text-indigo-300">QC</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                <Package className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold text-white">8</div>
                <div className="text-xs text-cyan-300">Packing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and System Status */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hologram-card border-cyan-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div>
                <div className="font-medium text-white">#ASH-001247</div>
                <div className="text-sm text-blue-300">Nike Athletic Wear</div>
              </div>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                In Production
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div>
                <div className="font-medium text-white">#ASH-001248</div>
                <div className="text-sm text-yellow-300">Adidas Sports Collection</div>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                Design Review
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div>
                <div className="font-medium text-white">#ASH-001249</div>
                <div className="text-sm text-blue-300">Puma Lifestyle Series</div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50">
                Order Received
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hologram-card border-cyan-500/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-cyan-300">Production Line</div>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Operational
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-cyan-300">Quality Control</div>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                <Activity className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-cyan-300">Ashley AI</div>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse">
                <Brain className="w-3 h-3 mr-1" />
                Online
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-cyan-300">Client Portal</div>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                <Crown className="w-3 h-3 mr-1" />
                Available
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-cyan-300">Automation Engine</div>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/50 animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </Layout>
  )
}