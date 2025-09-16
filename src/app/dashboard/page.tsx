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
  Zap,
  ArrowUp,
  ArrowDown,
  Info,
  MessageCircle,
  Bell,
  HelpCircle,
  ChevronDown,
  Filter,
  Search,
  Calendar as CalendarIcon,
  LineChart
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
      <div className="min-h-screen bg-gray-50">
        {/* TikTok-style Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            {/* Top navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🎖️</span>
                  </div>
                  <span className="text-gray-900 font-medium">Manufacturing Center</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Customer messages
                </Button>
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="w-4 h-4" />
                  Help
                </Button>
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
              </div>
            </div>

            {/* Analytics Header */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-6 border-b border-gray-200">
              <button className="pb-3 border-b-2 border-blue-500 text-blue-600 font-medium">Home</button>
              <button className="pb-3 text-gray-600 hover:text-gray-900">Growth & insights</button>
              <button className="pb-3 text-gray-600 hover:text-gray-900">LIVE & video</button>
              <button className="pb-3 text-gray-600 hover:text-gray-900">Product card</button>
              <button className="pb-3 text-gray-600 hover:text-gray-900">Production</button>
              <button className="pb-3 text-gray-600 hover:text-gray-900">Manufacturing</button>
              <button className="pb-3 text-gray-600 hover:text-gray-900">Post purchase</button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-12 gap-6">

            {/* Left Section - Business Data */}
            <div className="col-span-8">
              {/* Business Data Cards */}
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Business data</h2>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm font-medium">Daily</button>
                    <button className="px-3 py-1 text-gray-600 rounded text-sm hover:bg-gray-100">Traffic</button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    Last 7 days: Sep 02, 2025 - Sep 09, 2025
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* GMV Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">GMV</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">₱ 271,303</div>
                    <div className="text-sm text-gray-600 mb-2">vs last 7 days: +83.09%</div>
                    <button className="text-blue-600 text-sm font-medium">View breakdown</button>
                  </div>

                  {/* Gross Revenue Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Gross revenue</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">₱ 284,728</div>
                    <div className="text-sm text-gray-600 mb-2">vs last 7 days: +89.34%</div>
                    <button className="text-blue-600 text-sm font-medium">View breakdown</button>
                  </div>

                  {/* Items Sold Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Items sold</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">884</div>
                    <div className="text-sm text-gray-600 mb-2">vs last 7 days: +65.86%</div>
                  </div>
                </div>

                {/* Chart Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">GMV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Gross revenue</span>
                    </div>
                  </div>

                  {/* Simulated Chart */}
                  <div className="h-64 flex items-end justify-between px-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-8 bg-blue-500 rounded-t"
                            style={{ height: `${Math.random() * 120 + 40}px` }}
                          ></div>
                          <div
                            className="w-8 bg-green-500 rounded-t"
                            style={{ height: `${Math.random() * 100 + 30}px` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">Sep 0{i + 3}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sales Sources */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Sales sources</h2>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm font-medium">Highest GMV</button>
                    <button className="px-3 py-1 text-gray-600 rounded text-sm hover:bg-gray-100">Most views</button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* LIVE Orders */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">LIVE</span>
                      </div>
                      <button className="text-blue-600 text-sm">View analytics ›</button>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">₱42,535.08 GMV from 1 golf sponsored accounts.</div>

                    <div className="text-xs text-gray-600 mb-2">Top 5 LIVE streams, ranked by GMV</div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">₱17,164.69</div>
                          <div className="text-xs text-gray-500">2024/09/08 19:07 | @peejhance</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">₱16,303.22</div>
                          <div className="text-xs text-gray-500">2024/09/08 09:25 | @peejhance</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Videos */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">Videos</span>
                      </div>
                      <button className="text-blue-600 text-sm">View analytics ›</button>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">₱239 GMV from 1 direct accounts.</div>

                    <div className="text-xs text-gray-600 mb-2">Top 3 videos, ranked by GMV</div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded">
                          <img src="/api/placeholder/32/32" alt="Video thumbnail" className="w-full h-full rounded object-cover" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">₱239</div>
                          <div className="text-xs text-gray-500">2024/09/13 17:44 | ₱99 Headset Ultra...</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded">
                          <img src="/api/placeholder/32/32" alt="Video thumbnail" className="w-full h-full rounded object-cover" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">₱0</div>
                          <div className="text-xs text-gray-500">2024/07/17 16:09 | 40% Player + HDD...</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Cards */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">Product cards</span>
                      </div>
                      <button className="text-blue-600 text-sm">View analytics ›</button>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">₱8,802.38 GMV from 16 product cards.</div>

                    <div className="text-xs text-gray-600 mb-2">Top 3 product cards by GMV</div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded">
                          <img src="/api/placeholder/32/32" alt="Product" className="w-full h-full rounded object-cover" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">₱2,310.90</div>
                          <div className="text-xs text-gray-500">SIREN CLOTH PRINT - DARK GRAY (S) #1</div>
                          <div className="text-xs text-green-600">🟢 Estimated P9 16% ⚡6 product this li...</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded">
                          <img src="/api/placeholder/32/32" alt="Product" className="w-full h-full rounded object-cover" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">₱937.18</div>
                          <div className="text-xs text-gray-500">SIREN CLOTH PRINT - CHAMPION PIGSHI</div>
                          <div className="text-xs text-green-600">🟢 Estimated P9 32% ⚡8 product this li...</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Today's Data */}
            <div className="col-span-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Today's data</h3>
                  <div className="flex items-center gap-1 text-blue-600 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Trends
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">Last updated: 17:39</div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">GMV</div>
                    <div className="text-xl font-bold text-gray-900">₱ 62,991</div>
                    <div className="text-xs text-gray-500">Yesterday ₱96,378.46</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Items sold</div>
                    <div className="text-xl font-bold text-gray-900">200</div>
                    <div className="text-xs text-gray-500">Yesterday 284</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Visitors</div>
                    <div className="text-xl font-bold text-gray-900">2,947</div>
                    <div className="text-xs text-gray-500">Yesterday 2,534</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Customers</div>
                    <div className="text-xl font-bold text-gray-900">128</div>
                    <div className="text-xs text-gray-500">Yesterday 161</div>
                  </div>
                </div>

                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-orange-600 text-xs">🔥</span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 ml-2">
                    No campaigns.<br />
                    Join now ›
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="font-medium text-gray-900">Business accelerator</span>
                    <button className="text-blue-600 text-sm ml-auto">More ›</button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Optimize production that f...</span>
                      <span className="text-green-600">Could increase sales by 7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Optimize product images</span>
                      <span className="text-green-600">Could increase sales by 7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Improve search traffic wit...</span>
                      <span className="text-green-600">Could increase sales by 7%</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm">Yesterday</button>
                    <button className="px-3 py-1 text-gray-600 rounded text-sm hover:bg-gray-100">Last 7 days</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}