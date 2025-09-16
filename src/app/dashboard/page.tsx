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
              <h2 className="text-2xl font-bold text-white mb-4">📈 Business Overview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-white font-semibold mb-3">🔥 Today's Highlights</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Active Orders</span>
                      <span className="text-yellow-400 font-bold">24</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Production Lines</span>
                      <span className="text-green-400 font-bold">8/10</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Quality Score</span>
                      <span className="text-blue-400 font-bold">98.5%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-600">
                  <h3 className="text-white font-semibold mb-3">⚡ Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/orders')}
                      className="w-full text-left p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors text-gray-300 text-sm"
                    >
                      📝 Create Purchase Order
                    </button>
                    <button
                      onClick={() => router.push('/production')}
                      className="w-full text-left p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors text-gray-300 text-sm"
                    >
                      🔍 Track Production
                    </button>
                    <button
                      onClick={() => router.push('/finance')}
                      className="w-full text-left p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors text-gray-300 text-sm"
                    >
                      💳 Generate Invoice
                    </button>
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