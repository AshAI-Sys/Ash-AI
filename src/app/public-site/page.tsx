'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  Eye, 
  Edit, 
  Settings,
  TrendingUp,
  Users,
  MessageCircle,
  ExternalLink,
  Smartphone,
  Monitor,
  TabletSmartphone
} from 'lucide-react'
import Layout from '@/components/Layout'

export default function PublicSitePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center neural-bg">
      <div className="text-cyan-400 text-xl">Loading...</div>
    </div>
  }

  if (!session) return null

  const siteStats = {
    visitors: 1247,
    pageViews: 3891,
    inquiries: 23,
    uptime: 99.9
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white glitch-text flex items-center gap-3" data-text="PUBLIC WEBSITE">
              <Globe className="w-8 h-8 text-cyan-400" />
              PUBLIC WEBSITE
            </h1>
            <p className="text-cyan-300 font-mono">Company website and client portal management</p>
          </div>
          
          <div className="flex gap-3">
            <Button className="neon-btn-primary">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button className="neon-btn-outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Site
            </Button>
          </div>
        </div>

        {/* Site Status */}
        <Card className="quantum-card neon-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="ai-orb">
                  <Globe className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    Website Status
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      ONLINE
                    </Badge>
                  </h3>
                  <p className="text-sm text-cyan-300">
                    sorbetes-apparel.com • Last updated 2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{siteStats.uptime}%</p>
                  <p className="text-xs text-green-400">UPTIME</p>
                </div>
                <Button className="neon-btn-outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Site
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">UNIQUE VISITORS</p>
                  <p className="text-3xl font-bold text-white">{siteStats.visitors.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs">+12% this week</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">PAGE VIEWS</p>
                  <p className="text-3xl font-bold text-white">{siteStats.pageViews.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-green-400">
                    <Eye className="w-3 h-3" />
                    <span className="text-xs">+18% vs last week</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <Eye className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">INQUIRIES</p>
                  <p className="text-3xl font-bold text-white">{siteStats.inquiries}</p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-xs">5 pending response</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <MessageCircle className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">MOBILE TRAFFIC</p>
                  <p className="text-3xl font-bold text-white">67%</p>
                  <div className="flex items-center gap-1 text-blue-400">
                    <Smartphone className="w-3 h-3" />
                    <span className="text-xs">Mobile-first</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <Smartphone className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Globe },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'content', label: 'Content', icon: Edit },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-mono text-sm ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Traffic Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span className="text-cyan-300">Desktop</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-blue-400 rounded-full"></div>
                      </div>
                      <span className="text-white font-mono text-sm">33%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-green-400" />
                      <span className="text-cyan-300">Mobile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-green-400 rounded-full"></div>
                      </div>
                      <span className="text-white font-mono text-sm">67%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-cyan-400" />
                    Recent Inquiries
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: 'John Rivera', email: 'j.rivera@email.com', subject: 'Bulk Order Inquiry', time: '2 hours ago' },
                    { name: 'Maria Santos', email: 'm.santos@company.com', subject: 'Custom Design Request', time: '5 hours ago' },
                    { name: 'Alex Chen', email: 'alex@startup.ph', subject: 'Partnership Inquiry', time: '1 day ago' }
                  ].map((inquiry, index) => (
                    <div key={index} className="p-3 bg-slate-900/30 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-white text-sm">{inquiry.name}</span>
                        <span className="text-xs text-gray-400">{inquiry.time}</span>
                      </div>
                      <p className="text-xs text-cyan-300 mb-1">{inquiry.email}</p>
                      <p className="text-sm text-gray-300">{inquiry.subject}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab !== 'overview' && (
            <Card className="quantum-card">
              <CardContent className="p-8 text-center">
                <div className="ai-orb mx-auto mb-4">
                  <Settings className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
                </h3>
                <p className="text-cyan-300 mb-4">
                  This section of the public website management is currently under development.
                </p>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  COMING SOON
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}