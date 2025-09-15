// @ts-nocheck
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Package,
  User,
  BarChart3,
  ShoppingCart,
  Bell,
  Search,
  Plus,
  ClipboardList,
  Users,
  Target,
  Wallet,
  Settings,
  ChevronDown,
  Activity,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

interface TopTaskbarProps {
  className?: string
}

export default function TopTaskbar({ className = '' }: TopTaskbarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState(8)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  if (!session) return null

  return (
    <div className={`w-full bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/30 shadow-xl shadow-cyan-500/10 relative z-50 ${className}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90"></div>
      <div className="absolute inset-0 circuit-pattern opacity-10"></div>

      <div className="relative px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">

          {/* Left Section - Main Navigation */}
          <div className="flex items-center gap-4 flex-1">

            {/* Orders Section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-cyan-300 hover:text-white hover:bg-cyan-500/20 px-3 py-2 rounded-lg transition-all duration-300 border border-transparent hover:border-cyan-500/30">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Orders</span>
                  <Badge className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full">23</Badge>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800/95 backdrop-blur-xl border border-cyan-500/30 shadow-xl shadow-cyan-500/20">
                <DropdownMenuLabel className="text-cyan-300 font-bold">Order Management</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-cyan-500/30" />
                <DropdownMenuItem onClick={() => router.push('/orders')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  All Orders
                  <Badge className="ml-auto bg-blue-500/20 text-blue-300">23</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders?status=pending')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Pending Orders
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-300">8</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders?status=in_production')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Activity className="w-4 h-4 mr-2" />
                  In Production
                  <Badge className="ml-auto bg-green-500/20 text-green-300">12</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders?status=completed')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completed
                  <Badge className="ml-auto bg-cyan-500/20 text-cyan-300">3</Badge>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Analytics Section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-cyan-300 hover:text-white hover:bg-cyan-500/20 px-3 py-2 rounded-lg transition-all duration-300 border border-transparent hover:border-cyan-500/30">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Analytics</span>
                  <Badge className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full animate-pulse">LIVE</Badge>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800/95 backdrop-blur-xl border border-cyan-500/30 shadow-xl shadow-cyan-500/20">
                <DropdownMenuLabel className="text-cyan-300 font-bold">Analytics & Reports</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-cyan-500/30" />
                <DropdownMenuItem onClick={() => router.push('/analytics')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard Analytics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/reports/production')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Target className="w-4 h-4 mr-2" />
                  Production Reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/reports/financial')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Financial Reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/reports/efficiency')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Efficiency Metrics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Purchase Orders Section */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-cyan-300 hover:text-white hover:bg-cyan-500/20 px-3 py-2 rounded-lg transition-all duration-300 border border-transparent hover:border-cyan-500/30">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Purchase Orders</span>
                  <Badge className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">7</Badge>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800/95 backdrop-blur-xl border border-cyan-500/30 shadow-xl shadow-cyan-500/20">
                <DropdownMenuLabel className="text-cyan-300 font-bold">Purchase Orders</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-cyan-500/30" />
                <DropdownMenuItem onClick={() => router.push('/purchase-orders')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  All Purchase Orders
                  <Badge className="ml-auto bg-purple-500/20 text-purple-300">7</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/purchase-orders/create')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New PO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/purchase-orders?status=pending')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Pending Approval
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-300">3</Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/vendors')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Vendors
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>

          {/* Center Section - Search */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                placeholder="Search orders, products..."
                className="pl-10 pr-4 py-2 w-64 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-400/60 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all duration-300"
              />
            </div>
          </div>

          {/* Right Section - User & System Info */}
          <div className="flex items-center gap-4">

            {/* System Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-cyan-300 font-medium">SYSTEM ONLINE</span>
            </div>

            {/* Current Time */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-lg">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-cyan-300 font-medium">
                {currentTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>

            {/* Notifications */}
            <Button variant="ghost" className="relative p-2 text-cyan-300 hover:text-white hover:bg-cyan-500/20 rounded-lg transition-all duration-300">
              <Bell className="w-4 h-4" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full border border-slate-900">
                  {notifications}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-cyan-300 hover:text-white hover:bg-cyan-500/20 px-3 py-2 rounded-lg transition-all duration-300 border border-transparent hover:border-cyan-500/30">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">{session?.user?.name?.split(' ')[0] || 'User'}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-slate-800/95 backdrop-blur-xl border border-cyan-500/30 shadow-xl shadow-cyan-500/20" align="end">
                <DropdownMenuLabel className="text-cyan-300 font-bold">
                  {session?.user?.name}
                  <div className="text-xs text-cyan-400 font-normal mt-1">
                    {session?.user?.role?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-cyan-500/30" />
                <DropdownMenuItem onClick={() => router.push('/profile')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Target className="w-4 h-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cyan-500/30" />
                <DropdownMenuItem onClick={() => router.push('/finance')} className="text-white hover:bg-cyan-500/20 cursor-pointer">
                  <Wallet className="w-4 h-4 mr-2" />
                  Financial Overview
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Action Button */}
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>

          </div>
        </div>
      </div>

      {/* Mobile Search (when hidden on desktop) */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
          <input
            type="text"
            placeholder="Search orders, products..."
            className="pl-10 pr-4 py-2 w-full bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-400/60 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  )
}