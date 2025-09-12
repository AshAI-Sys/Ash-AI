// @ts-nocheck
'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Package, 
  Truck, 
  Users, 
  BarChart, 
  Settings, 
  LogOut,
  ClipboardList,
  Wallet,
  ShoppingCart,
  User,
  Palette,
  Printer,
  Scissors,
  Shield,
  CheckCircle2,
  Star,
  Building,
  Monitor,
  HeadphonesIcon,
  Search,
  Bell,
  Crown,
  Zap,
  Target,
  Brain,
  Menu,
  X,
  Factory,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { Role } from '@prisma/client'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

const roleInfo = {
  [Role.ADMIN]: { 
    title: 'System Administrator', 
    gradient: 'from-purple-500 to-pink-500',
    description: 'Full system access & control'
  },
  [Role.MANAGER]: { 
    title: 'Production Manager', 
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Oversee all operations'
  },
  [Role.GRAPHIC_ARTIST]: { 
    title: 'Graphic Artist', 
    gradient: 'from-pink-500 to-rose-500',
    description: 'Design & artwork creation'
  },
  [Role.SILKSCREEN_OPERATOR]: { 
    title: 'Silkscreen Operator', 
    gradient: 'from-indigo-500 to-blue-500',
    description: 'Screen printing specialist'
  },
  [Role.SUBLIMATION_OPERATOR]: { 
    title: 'Sublimation Operator', 
    gradient: 'from-emerald-500 to-teal-500',
    description: 'Sublimation printing expert'
  },
  [Role.DTF_OPERATOR]: { 
    title: 'DTF Operator', 
    gradient: 'from-orange-500 to-red-500',
    description: 'Direct-to-film printing'
  },
  [Role.EMBROIDERY_OPERATOR]: { 
    title: 'Embroidery Operator', 
    gradient: 'from-violet-500 to-purple-500',
    description: 'Embroidery specialist'
  },
  [Role.SEWING_OPERATOR]: { 
    title: 'Sewing Operator', 
    gradient: 'from-green-500 to-emerald-500',
    description: 'Garment construction'
  },
  [Role.QC_INSPECTOR]: { 
    title: 'Quality Inspector', 
    gradient: 'from-yellow-500 to-orange-500',
    description: 'Quality assurance'
  },
  [Role.FINISHING_STAFF]: { 
    title: 'Finishing Staff', 
    gradient: 'from-teal-500 to-cyan-500',
    description: 'Final product preparation'
  },
  [Role.DRIVER]: { 
    title: 'Delivery Driver', 
    gradient: 'from-slate-500 to-gray-500',
    description: 'Logistics & delivery'
  },
  [Role.PURCHASER]: { 
    title: 'Procurement Officer', 
    gradient: 'from-amber-500 to-yellow-500',
    description: 'Supply chain management'
  },
  [Role.WAREHOUSE_STAFF]: { 
    title: 'Warehouse Staff', 
    gradient: 'from-stone-500 to-amber-500',
    description: 'Inventory management'
  },
  [Role.ACCOUNTANT]: { 
    title: 'Accountant', 
    gradient: 'from-green-600 to-emerald-600',
    description: 'Financial operations'
  },
  [Role.LIVE_SELLER]: { 
    title: 'Live Seller', 
    gradient: 'from-pink-500 to-purple-500',
    description: 'Online sales specialist'
  },
  [Role.CSR]: { 
    title: 'Customer Service', 
    gradient: 'from-blue-500 to-indigo-500',
    description: 'Customer relations'
  },
  [Role.SALES_STAFF]: { 
    title: 'Sales Staff', 
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Sales operations'
  }
}

const navigationByRole = {
  [Role.ADMIN]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: 'HOME' },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: '23' },
    { name: 'Design', href: '/design', icon: Palette, badge: '4' },
    { name: 'Cutting', href: '/cutting', icon: Scissors, badge: null },
    { name: 'Production Tracking', href: '/production-tracking', icon: Activity, badge: '8' },
    { name: 'Routing Templates', href: '/routing-templates', icon: Factory, badge: null },
    { name: 'Inventory', href: '/inventory', icon: Package, badge: '15' },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: 'LIVE' },
    { name: 'Mobile Warehouse', href: '/mobile/warehouse', icon: Search, badge: 'NEW' },
    { name: 'Users', href: '/users', icon: Users, badge: null },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'BIR Compliance', href: '/compliance', icon: Shield, badge: '2' },
    { name: 'Reports', href: '/reports', icon: BarChart, badge: null },
    { name: 'HR', href: '/hr', icon: Users, badge: null },
    { name: 'Analytics', href: '/analytics', icon: Brain, badge: 'AI' },
    { name: 'Integrations', href: '/integrations', icon: Zap, badge: 'NEW' },
    { name: 'Admin', href: '/admin', icon: Settings, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.MANAGER]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: 'HOME' },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: '23' },
    { name: 'Design', href: '/design', icon: Palette, badge: '4' },
    { name: 'Cutting', href: '/cutting', icon: Scissors, badge: null },
    { name: 'Production Tracking', href: '/production-tracking', icon: Activity, badge: '8' },
    { name: 'Routing Templates', href: '/routing-templates', icon: Factory, badge: null },
    { name: 'Inventory', href: '/inventory', icon: Package, badge: '15' },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: 'LIVE' },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'BIR Compliance', href: '/compliance', icon: Shield, badge: null },
    { name: 'Reports', href: '/reports', icon: BarChart, badge: null },
    { name: 'HR', href: '/hr', icon: Users, badge: null },
    { name: 'Analytics', href: '/analytics', icon: Brain, badge: 'AI' },
    { name: 'Integrations', href: '/integrations', icon: Zap, badge: 'NEW' },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.GRAPHIC_ARTIST]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '5' },
    { name: 'Design Management', href: '/design', icon: Palette, badge: 'NEW' },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.SILKSCREEN_OPERATOR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '3' },
    { name: 'Production', href: '/production', icon: Printer, badge: null },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.SUBLIMATION_OPERATOR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '2' },
    { name: 'Production', href: '/production', icon: Printer, badge: null },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.DTF_OPERATOR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '4' },
    { name: 'Production', href: '/production', icon: Printer, badge: null },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.EMBROIDERY_OPERATOR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '1' },
    { name: 'Production', href: '/production', icon: Star, badge: null },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.SEWING_OPERATOR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '6' },
    { name: 'Production', href: '/production', icon: Scissors, badge: null },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.QC_INSPECTOR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'QC Queue', href: '/qc', icon: Shield, badge: '8' },
    { name: 'Production', href: '/production', icon: Package, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.FINISHING_STAFF]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: '3' },
    { name: 'Production', href: '/production', icon: Package, badge: null },
    { name: 'QC Queue', href: '/qc', icon: CheckCircle2, badge: null },
    { name: 'Deliveries', href: '/deliveries', icon: Truck, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.DRIVER]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Deliveries', href: '/deliveries', icon: Truck, badge: '5' },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.PURCHASER]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, badge: '2' },
    { name: 'Vendors', href: '/vendors', icon: Building, badge: null },
    { name: 'Inventory', href: '/inventory', icon: Package, badge: null },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.WAREHOUSE_STAFF]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Inventory & AI', href: '/inventory', icon: Package, badge: 'BETA' },
    { name: 'Mobile Warehouse', href: '/mobile/warehouse', icon: Search, badge: 'NEW' },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.ACCOUNTANT]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'BIR Compliance', href: '/compliance', icon: Shield, badge: '3' },
    { name: 'Reports', href: '/reports', icon: BarChart, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.LIVE_SELLER]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: 'LIVE' },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.CSR]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Orders', href: '/orders', icon: HeadphonesIcon, badge: '12' },
    { name: 'Client Portal', href: '/client-portal', icon: User, badge: null },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ],
  [Role.SALES_STAFF]: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: '7' },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null }
  ]
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!session?.user) {
    return <div>{children}</div>
  }

  const userRole = session.user.role as Role
  const navigation = navigationByRole[userRole] || navigationByRole[Role.GRAPHIC_ARTIST]
  const roleData = roleInfo[userRole] || roleInfo[Role.GRAPHIC_ARTIST]

  const handleSignOut = () => {
    signOut({ redirect: false }).then(() => {
      router.push('/')
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* Beautiful Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMyIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+CjwvZz4KPHN2Zz4=')] opacity-30"></div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-white/40 shadow-lg shadow-blue-500/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 flex items-center justify-center shadow-lg border border-white/30`}>
              <img src="/Ash-AI.png" alt="ASH AI Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">ASH AI</h1>
              <p className="text-xs bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent font-medium">{roleData.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-300"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-white/40 shadow-2xl shadow-blue-500/10">
            <div className="px-4 py-2 space-y-1 max-h-96 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className="group flex items-center justify-between px-4 py-3 rounded-xl text-slate-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.badge && (
                      <div className={`px-2 py-1 rounded-full text-xs font-bold shadow-lg transition-all duration-300 ${
                        item.badge === 'LIVE' 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse' 
                          : item.badge === 'NEW'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : item.badge === 'BETA'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 group-hover:from-white/20 group-hover:to-white/10 group-hover:text-white'
                      }`}>
                        {item.badge}
                      </div>
                    )}
                  </Link>
                )
              })}
              <div className="border-t border-white/30 pt-2 mt-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 transition-all duration-300 w-full text-left hover:scale-105 hover:shadow-lg"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-80">
        <div className="flex flex-col h-full bg-gradient-to-b from-white/95 via-white/90 to-blue-50/50 backdrop-blur-2xl shadow-2xl shadow-blue-500/10 border-r border-white/40 relative overflow-hidden">
          {/* Beautiful Animated Background */}
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-br ${roleData.gradient} rounded-full -translate-y-40 translate-x-40 animate-pulse blur-3xl`} />
            <div className={`absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr ${roleData.gradient} rounded-full translate-y-32 -translate-x-32 animate-pulse blur-2xl`} />
            <div className={`absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-r ${roleData.gradient} rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse blur-xl opacity-50`} />
          </div>

          {/* Logo Section */}
          <div className="relative p-8 border-b border-white/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-0 hover:scale-110 transition-all duration-500 border border-white/60 group">
                <img src="/Ash-AI.png" alt="ASH AI Logo" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  ASH AI
                </h1>
                <p className="text-sm bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent font-semibold">
                  Apparel Management System
                </p>
              </div>
            </div>
          </div>

          {/* Beautiful Role Badge */}
          <div className="relative px-6 py-4">
            <div className={`p-4 rounded-xl bg-gradient-to-br ${roleData.gradient} relative overflow-hidden shadow-xl shadow-black/20 border border-white/20`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/5 animate-pulse" />
              <div className="relative">
                <p className="text-xs font-bold text-white/95 mb-1 uppercase tracking-wider">Current Role</p>
                <p className="text-lg font-bold text-white drop-shadow-lg">{roleData.title}</p>
                <p className="text-xs text-white/90 mt-1 font-medium">{roleData.description}</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="relative px-6 py-2">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-br from-white/80 via-blue-50/60 to-purple-50/60 border border-white/40 shadow-lg">
              <div className={`w-10 h-10 bg-gradient-to-br ${roleData.gradient} rounded-xl flex items-center justify-center shadow-lg border border-white/30`}>
                <User className="h-5 w-5 text-white drop-shadow-lg" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">{session.user.name || session.user.email}</p>
                <p className="text-xs bg-gradient-to-r from-slate-500 to-purple-500 bg-clip-text text-transparent font-semibold">{roleData.title}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="relative flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center shadow-lg">
                  <Bell className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-xs font-bold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider">
                  Navigation
                </p>
              </div>
            </div>
            
            {navigation.map((item, index) => {
              const Icon = item.icon
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="group relative flex items-center px-4 py-3 text-slate-600 hover:text-white rounded-xl transition-all duration-500 overflow-hidden hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  {/* Beautiful hover background effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${roleData.gradient} opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-xl`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                  
                  <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/80 via-blue-50/60 to-purple-50/60 group-hover:from-white/20 group-hover:to-white/10 transition-all duration-500 shadow-lg group-hover:shadow-xl group-hover:scale-110 border border-white/40">
                    <Icon className="w-5 h-5 relative z-10 text-slate-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  
                  <div className="flex-1 ml-3 relative flex items-center justify-between">
                    <span className="font-bold text-sm group-hover:text-white transition-colors duration-300">{item.name}</span>
                    {item.badge && (
                      <div className={`px-2 py-1 rounded-full text-xs font-bold shadow-lg transition-all duration-300 ${
                        item.badge === 'LIVE' 
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse shadow-red-500/50' 
                          : item.badge === 'NEW'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/50'
                          : item.badge === 'BETA'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/50'
                          : item.badge === 'HOME'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-blue-500/50'
                          : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 group-hover:from-white/20 group-hover:to-white/10 group-hover:text-white'
                      }`}>
                        {item.badge}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Theme Toggle & Sign Out */}
          <div className="relative p-6 space-y-4">
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 rounded-xl p-3 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20 font-medium"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-80">
        <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white/30 to-blue-50/30 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjAyIi8+CjwvZz4KPHN2Zz4=')] opacity-40"></div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-white/40 shadow-2xl shadow-blue-500/10 z-40">
        <div className="flex items-center justify-around px-2 py-3">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className="group flex flex-col items-center p-2 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-110"
              >
                <div className="relative">
                  <Icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" />
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors duration-300 mt-1">{item.name}</span>
              </Link>
            )
          })}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="group flex flex-col items-center p-2 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:scale-110"
          >
            <Menu className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" />
            <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors duration-300 mt-1">More</span>
          </button>
        </div>
      </div>
    </div>
  )
}