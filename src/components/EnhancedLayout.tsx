// @ts-nocheck
/**
 * Enhanced Layout with Professional Navigation and Mobile Optimization
 * Complete responsive layout with all navigation features
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Package,
  BarChart3,
  Users,
  Settings,
  Palette,
  Scissors,
  Shirt,
  Shield,
  Archive,
  Truck,
  DollarSign,
  Wrench,
  Monitor,
  Brain,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Calendar,
  FileText,
  MessageCircle,
  Search,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavigationItem {
  name: string
  href: string
  icon: React.ReactNode
  badge?: number
  category: 'main' | 'production' | 'business' | 'system'
}

interface EnhancedLayoutProps {
  children: React.ReactNode
}

export default function EnhancedLayout({ children }: EnhancedLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const { data: session } = useSession()
  const pathname = usePathname()

  const navigationItems: NavigationItem[] = [
    // Main Navigation
    { name: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" />, category: 'main' },
    { name: 'Analytics', href: '/analytics', icon: <BarChart3 className="w-5 h-5" />, category: 'main' },
    { name: 'Orders', href: '/orders', icon: <Package className="w-5 h-5" />, badge: 5, category: 'main' },
    { name: 'Client Portal', href: '/client-portal', icon: <Monitor className="w-5 h-5" />, category: 'main' },
    
    // Production Stages
    { name: 'Production', href: '/production', icon: <Settings className="w-5 h-5" />, category: 'production' },
    { name: 'Design Studio', href: '/design', icon: <Palette className="w-5 h-5" />, category: 'production' },
    { name: 'Cutting', href: '/cutting', icon: <Scissors className="w-5 h-5" />, category: 'production' },
    { name: 'Printing', href: '/printing', icon: <Settings className="w-5 h-5" />, category: 'production' },
    { name: 'Sewing', href: '/sewing', icon: <Shirt className="w-5 h-5" />, category: 'production' },
    { name: 'Quality Control', href: '/qc', icon: <Shield className="w-5 h-5" />, category: 'production' },
    { name: 'Packing', href: '/packing', icon: <Archive className="w-5 h-5" />, category: 'production' },
    { name: 'Delivery', href: '/delivery', icon: <Truck className="w-5 h-5" />, category: 'production' },
    
    // Business Functions
    { name: 'Finance', href: '/finance', icon: <DollarSign className="w-5 h-5" />, category: 'business' },
    { name: 'HR Management', href: '/hr', icon: <Users className="w-5 h-5" />, category: 'business' },
    { name: 'Maintenance', href: '/maintenance', icon: <Wrench className="w-5 h-5" />, category: 'business' },
    
    // System & AI
    { name: 'Ashley AI', href: '/ai-assistant', icon: <Brain className="w-5 h-5" />, category: 'system' },
    { name: 'Reports', href: '/reports', icon: <FileText className="w-5 h-5" />, category: 'system' },
    { name: 'Messages', href: '/messages', icon: <MessageCircle className="w-5 h-5" />, badge: notifications, category: 'system' },
  ]

  const getCategoryTitle = (category: string) => {
    const titles = {
      'main': 'Main Navigation',
      'production': 'Production Stages',
      'business': 'Business Functions',
      'system': 'System & AI'
    }
    return titles[category as keyof typeof titles] || category
  }

  const isActiveLink = (href: string) => {
    return pathname === href || (pathname.startsWith(href) && href !== '/')
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  // Group navigation items by category
  const groupedNavigation = navigationItems.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
    return groups
  }, {} as Record<string, NavigationItem[]>)

  return (
    <div className="min-h-screen neural-bg flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        hologram-card sidebar-container
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center">
                <img 
                  src="/Ash-AI.png" 
                  alt="ASH AI" 
                  className="w-6 h-6 object-contain filter brightness-0 invert" 
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ASH AI</h1>
              <p className="text-xs text-cyan-400">Smart Hub v2.1.0</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-cyan-500/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="nav-scrollable px-4 py-6">
          <div className="space-y-8">
            {Object.entries(groupedNavigation).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 px-2">
                  {getCategoryTitle(category)}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        nav-item flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                        ${isActiveLink(item.href)
                          ? 'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-400'
                          : 'text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-200'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                      {item.badge && (
                        <Badge className="ml-auto bg-red-500 text-white text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="user-profile-fixed p-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/50 border border-cyan-500/20">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {session?.user?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session?.user?.name || 'Administrator'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {session?.user?.email || 'admin@ashsystem.com'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-white hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <div className="hidden md:flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search orders, clients, products..."
                    className="w-80 pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions - Moved to Orders Page */}

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative text-slate-400 hover:text-white">
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full p-0 flex items-center justify-center">
                    {notifications}
                  </Badge>
                )}
              </Button>

              {/* Calendar */}
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hidden md:flex">
                <Calendar className="w-5 h-5" />
              </Button>

              {/* Current Time */}
              <div className="hidden lg:block text-sm text-slate-400">
                {new Date().toLocaleTimeString('en-PH', {
                  timeZone: 'Asia/Manila',
                  hour12: true,
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}