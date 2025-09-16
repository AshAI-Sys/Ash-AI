// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎵</div>
          <h1 className="text-4xl font-bold text-white mb-4">Loading ASH AI...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      {/* TikTok-Style Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">ASH AI</h1>
              <p className="text-gray-400 text-xs">Manufacturing ERP</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Home"
            >
              <div className="w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full animate-pulse"></div>
            </button>
            <button
              onClick={() => router.push('/client-portal')}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Client Portal"
            >
              <span className="text-white text-lg">💬</span>
            </button>
            <button
              onClick={() => alert('Notifications: No new alerts')}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Notifications"
            >
              <span className="text-white text-lg">🔔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* TikTok-Style Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 backdrop-blur-sm border border-pink-500/30 rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">💰</span>
              <span className="text-green-400 text-sm font-bold bg-green-400/20 px-2 py-1 rounded-full">+43.56%</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Revenue</h3>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">₱271,303</p>
            <p className="text-gray-400 text-sm">Last 7 days</p>
          </div>

          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📦</span>
              <span className="text-blue-400 text-sm font-bold bg-blue-400/20 px-2 py-1 rounded-full">LIVE</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Production</h3>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">884</p>
            <p className="text-gray-400 text-sm">Items this week</p>
          </div>

          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🤖</span>
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">AI Status</h3>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">ACTIVE</p>
            <p className="text-gray-400 text-sm">All systems operational</p>
          </div>
        </div>

        {/* TikTok-Style Navigation Tabs */}
        <div className="flex space-x-1 bg-black/50 backdrop-blur-sm rounded-2xl p-1 border border-gray-700">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'orders', label: '📋 Orders', icon: '📋' },
            { id: 'production', label: '🏭 Production', icon: '🏭' },
            { id: 'ai', label: '🤖 AI Hub', icon: '🤖' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TikTok-Style Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-2xl transform hover:scale-105 transition-all shadow-lg"
          >
            <div className="text-2xl mb-2">➕</div>
            <div>New Order</div>
          </button>

          <button
            onClick={() => router.push('/production')}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-6 rounded-2xl transform hover:scale-105 transition-all shadow-lg"
          >
            <div className="text-2xl mb-2">🏭</div>
            <div>Production</div>
          </button>

          <button
            onClick={() => router.push('/analytics')}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-4 px-6 rounded-2xl transform hover:scale-105 transition-all shadow-lg"
          >
            <div className="text-2xl mb-2">📊</div>
            <div>Analytics</div>
          </button>

          <button
            onClick={() => router.push('/ai-assistant')}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl transform hover:scale-105 transition-all shadow-lg"
          >
            <div className="text-2xl mb-2">🤖</div>
            <div>Ask Ashley</div>
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-black/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Business Data Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 text-sm font-medium">GMV</span>
                    <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">+43.56%</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">₱271,303</div>
                  <div className="text-xs text-gray-400">vs last 7 days</div>
                  <div className="text-xs text-blue-400 mt-2 cursor-pointer hover:text-blue-300">View breakdown ↗</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-400 text-sm font-medium">Gross revenue</span>
                    <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">+48.34%</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">₱284,728</div>
                  <div className="text-xs text-gray-400">vs last 7 days</div>
                  <div className="text-xs text-purple-400 mt-2 cursor-pointer hover:text-purple-300">View breakdown ↗</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-400 text-sm font-medium">Items sold</span>
                    <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">+64.6%</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">884</div>
                  <div className="text-xs text-gray-400">vs last 7 days</div>
                  <div className="text-xs text-green-400 mt-2 cursor-pointer hover:text-green-300">View breakdown ↗</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-400 text-sm font-medium">Today's data</span>
                    <span className="text-gray-400 text-xs">Last updated: 17:39</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">₱62,991</div>
                  <div className="text-xs text-gray-400">Yesterday ₱50,340</div>
                  <div className="text-xs text-orange-400 mt-2 cursor-pointer hover:text-orange-300">Trends ↗</div>
                </div>
              </div>

              {/* Performance Chart Area */}
              <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Business performance</h3>
                  <div className="flex space-x-2">
                    <button className="text-xs px-3 py-1 bg-blue-500 text-white rounded-full">GMV</button>
                    <button className="text-xs px-3 py-1 bg-gray-600 text-gray-300 rounded-full hover:bg-gray-500">Gross revenue</button>
                  </div>
                </div>

                {/* Simple Chart Area */}
                <div className="bg-gray-800/30 rounded-lg p-4 h-48 border border-gray-700/50">
                  <div className="flex items-end h-full space-x-2">
                    {[40, 45, 35, 55, 60, 48, 65, 70, 58, 75, 80, 85].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm flex-1"
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Sep 02</span>
                    <span className="text-green-400">↗ +43.56%</span>
                    <span>Sep 08</span>
                  </div>
                </div>
              </div>

              {/* Sales Sources Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      LIVE
                    </h4>
                    <span className="text-blue-400 text-xs cursor-pointer hover:text-blue-300">View analytics ↗</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">₱42,934.04</div>
                  <div className="text-xs text-gray-400 mb-3">GMV from 1 out of operated accounts</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold">S</div>
                      <div>
                        <div className="text-white">₱17,164.69</div>
                        <div className="text-xs text-gray-400">2025/09/16 16:01 • @norbertcx</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium flex items-center">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                      Videos
                    </h4>
                    <span className="text-blue-400 text-xs cursor-pointer hover:text-blue-300">View analytics ↗</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">₱239</div>
                  <div className="text-xs text-gray-400 mb-3">GMV from 1 direct accounts</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white">🎥</div>
                      <div>
                        <div className="text-white">₱259</div>
                        <div className="text-xs text-gray-400">2024/09/15 17:44 • #99 Hoodied Little...</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      Product cards
                    </h4>
                    <span className="text-blue-400 text-xs cursor-pointer hover:text-blue-300">View analytics ↗</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">₱6,602.38</div>
                  <div className="text-xs text-gray-400 mb-3">GMV from 16 product cards</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-white">👕</div>
                      <div>
                        <div className="text-white">₱2,310.90</div>
                        <div className="text-xs text-gray-400">SUPER CLOTH PRINT - DARK DAYS (D) #2</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Accelerator */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">🚀 Business accelerator</h4>
                  <span className="text-green-400 text-xs cursor-pointer hover:text-green-300">More ↗</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Optimize product info that f...</span>
                    <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs">Could increase sales by 7%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Optimize product margins</span>
                    <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs">Could increase sales by 7%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Improve search traffic wit...</span>
                    <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs">Could increase sales by 7%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">📋 Order Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/orders')}
                  className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4 hover:bg-blue-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">📝 Create New Order</h3>
                  <p className="text-gray-400 text-sm">Start a new purchase order</p>
                </button>
                <button
                  onClick={() => router.push('/orders')}
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">📊 View All Orders</h3>
                  <p className="text-gray-400 text-sm">Manage existing orders</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'production' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">🏭 Production Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/production')}
                  className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-xl p-4 hover:bg-purple-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">🔍 Track Production</h3>
                  <p className="text-gray-400 text-sm">Monitor manufacturing progress</p>
                </button>
                <button
                  onClick={() => router.push('/qc')}
                  className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 hover:bg-yellow-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">✅ Quality Control</h3>
                  <p className="text-gray-400 text-sm">QC inspection and reports</p>
                </button>
                <button
                  onClick={() => router.push('/inventory')}
                  className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30 rounded-xl p-4 hover:bg-teal-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">📦 Inventory</h3>
                  <p className="text-gray-400 text-sm">Material and stock management</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">🤖 Ashley AI Hub</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/ai-assistant')}
                  className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">💬 Chat with Ashley</h3>
                  <p className="text-gray-400 text-sm">AI assistant for manufacturing insights</p>
                </button>
                <button
                  onClick={() => router.push('/analytics')}
                  className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-4 hover:bg-pink-500/30 transition-colors text-left"
                >
                  <h3 className="text-white font-semibold mb-2">📈 AI Analytics</h3>
                  <p className="text-gray-400 text-sm">AI-powered business insights</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}