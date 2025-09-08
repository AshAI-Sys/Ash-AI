'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Monitor, 
  Play, 
  Pause, 
  ShoppingCart,
  Eye,
  Heart,
  MessageCircle,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Zap,
  Video,
  Radio
} from 'lucide-react'
import Layout from '@/components/Layout'

export default function LiveSellingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLive, setIsLive] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

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

  const liveStats = {
    viewers: 247,
    orders: 23,
    revenue: 45680,
    engagement: 94.2
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white glitch-text flex items-center gap-3" data-text="LIVE SELLING">
              <Monitor className="w-8 h-8 text-cyan-400" />
              LIVE SELLING
              {isLive && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
              )}
            </h1>
            <p className="text-cyan-300 font-mono">Multi-platform live streaming and sales management</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              className={`neon-btn-primary ${isLive ? 'bg-red-500/20 border-red-500' : ''}`}
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Go Live
                </>
              )}
            </Button>
            <Button className="neon-btn-outline">
              <Video className="w-4 h-4 mr-2" />
              Setup
            </Button>
          </div>
        </div>

        {/* Live Status */}
        <Card className={`quantum-card ${isLive ? 'neon-glow border-red-500/50' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`ai-orb ${isLive ? 'animate-pulse' : ''}`}>
                  <Monitor className={`w-6 h-6 ${isLive ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    Stream Status
                    <Badge className={isLive ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-500/20 text-gray-400 border-gray-500/50'}>
                      {isLive ? 'LIVE' : 'OFFLINE'}
                    </Badge>
                  </h3>
                  <p className="text-sm text-cyan-300">
                    {isLive ? 'Broadcasting to TikTok, Facebook, Shopee Live' : 'Stream setup ready • Click Go Live to start'}
                  </p>
                </div>
              </div>
              {isLive && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white animate-pulse">{liveStats.viewers}</p>
                    <p className="text-xs text-cyan-400">VIEWERS</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">₱{liveStats.revenue.toLocaleString()}</p>
                    <p className="text-xs text-green-400">REVENUE</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - Only show when live */}
        {isLive && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="quantum-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-cyan-300 font-mono">LIVE VIEWERS</p>
                    <p className="text-3xl font-bold text-white animate-pulse">{liveStats.viewers}</p>
                    <div className="flex items-center gap-1 text-green-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs">+12 in last 5min</span>
                    </div>
                  </div>
                  <div className="ai-orb animate-pulse">
                    <Eye className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-cyan-300 font-mono">ORDERS</p>
                    <p className="text-3xl font-bold text-white">{liveStats.orders}</p>
                    <div className="flex items-center gap-1 text-green-400">
                      <ShoppingCart className="w-3 h-3" />
                      <span className="text-xs">5 in queue</span>
                    </div>
                  </div>
                  <div className="ai-orb">
                    <Package className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-cyan-300 font-mono">LIVE REVENUE</p>
                    <p className="text-3xl font-bold text-white">₱{liveStats.revenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-xs">+₱2,340 last hour</span>
                    </div>
                  </div>
                  <div className="ai-orb">
                    <DollarSign className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-cyan-300 font-mono">ENGAGEMENT</p>
                    <p className="text-3xl font-bold text-white">{liveStats.engagement}%</p>
                    <div className="flex items-center gap-1 text-green-400">
                      <Heart className="w-3 h-3" />
                      <span className="text-xs">High engagement</span>
                    </div>
                  </div>
                  <div className="ai-orb">
                    <Heart className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 rounded-lg p-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Monitor },
            { id: 'products', label: 'Products', icon: Package },
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    Platform Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { platform: 'TikTok Live', status: isLive ? 'live' : 'ready', viewers: isLive ? 124 : 0 },
                    { platform: 'Facebook Live', status: isLive ? 'live' : 'ready', viewers: isLive ? 89 : 0 },
                    { platform: 'Shopee Live', status: isLive ? 'live' : 'ready', viewers: isLive ? 34 : 0 }
                  ].map((platform, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-900/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          platform.status === 'live' ? 'bg-red-400 animate-pulse' : 'bg-green-400'
                        }`}></div>
                        <span className="text-cyan-300">{platform.platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {platform.viewers > 0 && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                            {platform.viewers} viewers
                          </Badge>
                        )}
                        <Badge className={
                          platform.status === 'live' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : 'bg-green-500/20 text-green-400 border-green-500/50'
                        }>
                          {platform.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-cyan-400" />
                    Live Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLive ? (
                    <>
                      {[
                        { user: 'fashionista_ph', comment: 'Love the blue hoodie! How much?', time: 'now', platform: 'TikTok' },
                        { user: 'maria_santos', comment: 'Available ba sa small size?', time: '1m', platform: 'Facebook' },
                        { user: 'buyer_123', comment: 'Add to cart please!', time: '2m', platform: 'Shopee' }
                      ].map((comment, index) => (
                        <div key={index} className="p-3 bg-slate-900/30 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-white text-sm">{comment.user}</span>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                                {comment.platform}
                              </Badge>
                              <span className="text-xs text-gray-400">{comment.time}</span>
                            </div>
                          </div>
                          <p className="text-sm text-cyan-300">{comment.comment}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400">Comments will appear here when live</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab !== 'dashboard' && (
            <Card className="quantum-card">
              <CardContent className="p-8 text-center">
                <div className="ai-orb mx-auto mb-4">
                  <Zap className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Live Selling {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h3>
                <p className="text-cyan-300 mb-4">
                  This section is currently under development and will be available soon.
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