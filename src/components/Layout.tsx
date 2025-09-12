// @ts-nocheck
'use client'

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
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { Role } from '@prisma/client'
import AshleyAIChat from '@/components/ai/AshleyAIChat'

interface LayoutProps {
  children: React.ReactNode
}

const roleInfo = {
  ADMIN: { 
    title: 'System Administrator', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Full system access & control'
  },
  MANAGER: { 
    title: 'Production Manager', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Oversee all operations'
  },
  GRAPHIC_ARTIST: { 
    title: 'Graphic Artist', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Design & artwork creation'
  },
  SILKSCREEN_OPERATOR: { 
    title: 'Silkscreen Operator', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Screen printing specialist'
  },
  SUBLIMATION_OPERATOR: { 
    title: 'Sublimation Operator', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Sublimation printing expert'
  },
  DTF_OPERATOR: { 
    title: 'DTF Operator', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Direct-to-film printing'
  },
  EMBROIDERY_OPERATOR: { 
    title: 'Embroidery Operator', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Embroidery specialist'
  },
  SEWING_OPERATOR: { 
    title: 'Sewing Operator', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Garment construction'
  },
  QC_INSPECTOR: { 
    title: 'Quality Inspector', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Quality assurance'
  },
  FINISHING_STAFF: { 
    title: 'Finishing Staff', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Final product preparation'
  },
  DRIVER: { 
    title: 'Delivery Driver', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Logistics & delivery'
  },
  PURCHASER: { 
    title: 'Procurement Officer', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Supply chain management'
  },
  WAREHOUSE_STAFF: { 
    title: 'Warehouse Staff', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Inventory management'
  },
  ACCOUNTANT: { 
    title: 'Accountant', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Financial operations'
  },
  LIVE_SELLER: { 
    title: 'Live Seller', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Online sales specialist'
  },
  CSR: { 
    title: 'Customer Service', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Customer relations'
  },
  SALES_STAFF: { 
    title: 'Sales Staff', 
    gradient: 'from-cyan-400/20 to-cyan-500/30',
    description: 'Sales operations'
  },
}

const sidebarItems = {
  [Role.ADMIN]: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: 'HOME' },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: '23' },
    { name: 'Design & Approval', href: '/design-approval', icon: Palette, badge: '4' },
    { name: 'Inventory', href: '/inventory', icon: Package, badge: '15' },
    { name: 'Production Tracking', href: '/production-tracking', icon: Activity, badge: 'LIVE' },
    { name: 'Production Monitor', href: '/production', icon: Target, badge: 'AI' },
    { name: 'Ashley AI Assistant', href: '/ai-assistant', icon: Brain, badge: 'AI' },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: 'HOT' },
    { name: 'Mobile Warehouse', href: '/mobile/warehouse', icon: Search, badge: null },
    { name: 'Users', href: '/users', icon: Users, badge: null },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'BIR Compliance', href: '/compliance', icon: Shield, badge: '2' },
    { name: 'Reports', href: '/reports', icon: BarChart, badge: null },
    { name: 'Public Site', href: '/public-site', icon: Building, badge: 'PUBLIC' },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null },
    { name: 'Admin', href: '/admin', icon: Settings, badge: null },
  ],
  MANAGER: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: 'HOME' },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: '23' },
    { name: 'Design & Approval', href: '/design-approval', icon: Palette, badge: '4' },
    { name: 'Inventory', href: '/inventory', icon: Package, badge: '15' },
    { name: 'Production Tracking', href: '/production-tracking', icon: Activity, badge: 'LIVE' },
    { name: 'Production Monitor', href: '/production', icon: Target, badge: 'AI' },
    { name: 'Ashley AI Assistant', href: '/ai-assistant', icon: Brain, badge: 'AI' },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: 'HOT' },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'BIR Compliance', href: '/compliance', icon: Shield, badge: null },
    { name: 'Reports', href: '/reports', icon: BarChart, badge: null },
  ],
  GRAPHIC_ARTIST: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '5' },
    { name: 'Design Management', href: '/design-approval', icon: Palette, badge: 'NEW' },
  ],
  SILKSCREEN_OPERATOR: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '3' },
  ],
  SUBLIMATION_OPERATOR: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '2' },
  ],
  DTF_OPERATOR: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '4' },
  ],
  EMBROIDERY_OPERATOR: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '1' },
  ],
  SEWING_OPERATOR: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '6' },
  ],
  QC_INSPECTOR: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'QC Queue', href: '/qc', icon: Shield, badge: '8' },
  ],
  FINISHING_STAFF: [
    { name: 'Dashboard & Tasks', href: '/dashboard', icon: Home, badge: '3' },
  ],
  DRIVER: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Deliveries', href: '/deliveries', icon: Truck, badge: '5' },
  ],
  PURCHASER: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, badge: '2' },
    { name: 'Vendors', href: '/vendors', icon: Building, badge: null },
  ],
  WAREHOUSE_STAFF: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Inventory & AI', href: '/inventory', icon: Package, badge: 'BETA' },
    { name: 'Mobile Warehouse', href: '/mobile/warehouse', icon: Search, badge: 'NEW' },
  ],
  ACCOUNTANT: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Finance', href: '/finance', icon: Wallet, badge: null },
    { name: 'BIR Compliance', href: '/compliance', icon: Shield, badge: '3' },
    { name: 'Reports', href: '/reports', icon: BarChart, badge: null },
  ],
  LIVE_SELLER: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: 'LIVE' },
  ],
  CSR: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Orders', href: '/orders', icon: HeadphonesIcon, badge: '12' },
    { name: 'Live Selling', href: '/live-selling', icon: Monitor, badge: null },
  ],
  SALES_STAFF: [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Orders', href: '/orders', icon: ClipboardList, badge: '7' },
  ],
}

function Layout({ children }: LayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="flex h-screen neural-bg items-center justify-center">
        <div className="text-center">
          {/* Enhanced Loading Logo */}
          <div className="relative mb-6 mx-auto w-16 h-16">
            {/* Outer glow ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-cyan-400/30 rounded-full blur-lg animate-pulse"></div>
            {/* Middle ring */}
            <div className="absolute inset-1 bg-gradient-to-br from-cyan-400/30 to-cyan-500/40 rounded-full border border-cyan-400/50 animate-pulse"></div>
            {/* Logo container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/60 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <img 
                src="/ash-ai-logo-hero.svg" 
                alt="ASH AI Logo" 
                className="w-20 h-8 object-contain z-10 relative filter brightness-125 contrast-125 animate-pulse shadow-lg shadow-cyan-500/40" 
              />
              {/* Inner pulse effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-cyan-400/20 rounded-full animate-pulse"></div>
            </div>
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-cyan-300 font-medium">Loading...</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cyan-400/80">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">SYSTEM STARTING</span>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const userSidebarItems = sidebarItems[session.user.role] || []
  const currentRole = roleInfo[session.user.role]

  return (
    <div className="flex h-screen neural-bg relative overflow-hidden">
      {/* Quantum Field Background */}
      <div className="quantum-field">
        {Array.from({ length: 20 }).map((_, i) => (
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
      
      {/* Circuit Pattern Overlay */}
      <div className="absolute inset-0 circuit-pattern opacity-20"></div>
      {/* Responsive Futuristic AI Sidebar */}
      <div className="w-20 sm:w-64 lg:w-80 hologram-card sidebar-container backdrop-blur-2xl shadow-2xl border-r border-cyan-500/30 relative z-10 transition-all duration-300">
        {/* Solid Color Background */}
        <div className="absolute inset-0 bg-slate-900/95"></div>

        {/* Enhanced Futuristic AI Logo Section */}
        <div className="relative p-4 sm:p-6 lg:p-10 border-b border-cyan-500/30 data-stream">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Enhanced Logo Container - Now Horizontal for New Logo - BIGGER SIZE */}
            <div className="relative group shrink-0 w-40 h-16 sm:w-44 sm:h-18 lg:w-48 lg:h-20">
              {/* Outer glow ring */}
              <div className="absolute inset-0 bg-cyan-400/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
              {/* Middle ring */}
              <div className="absolute inset-1 bg-cyan-500/30 rounded-2xl border border-cyan-400/50 group-hover:border-cyan-300/70 transition-all duration-300"></div>
              {/* Logo container */}
              <div className="relative w-full h-full rounded-2xl bg-slate-800/90 border-2 border-cyan-500/60 flex items-center justify-center group-hover:scale-105 transition-all duration-500 shadow-xl shadow-cyan-500/20 backdrop-blur-sm">
                <img 
                  src="/ash-ai-logo-hero.svg" 
                  alt="ASH AI Logo" 
                  className="w-36 h-14 sm:w-40 sm:h-16 lg:w-44 lg:h-18 object-contain z-10 relative filter brightness-125 contrast-125 group-hover:brightness-150 group-hover:scale-105 transition-all duration-300" 
                />
                {/* Inner pulse effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-cyan-400/20 rounded-2xl opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300"></div>
              </div>
              {/* Status indicator */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            
            {/* Enhanced Text Labels */}
            <div className="hidden sm:block min-w-0 flex-1">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold glitch-text text-white drop-shadow-lg" data-text="ASH AI">
                  ASH AI
                </h1>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs sm:text-sm text-cyan-300 font-semibold tracking-wider uppercase">
                    Neural Apparel Hub
                  </p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-cyan-400/80">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">SYSTEM ACTIVE</span>
                    </div>
                    <span className="text-cyan-500/60">•</span>
                    <span className="font-medium">v2.1.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile version - Show abbreviated info */}
            <div className="sm:hidden flex flex-col min-w-0">
              <h1 className="text-sm font-bold text-white glitch-text" data-text="ASH">ASH</h1>
              <p className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">AI SYSTEM</p>
            </div>
          </div>
        </div>

        {/* Responsive Futuristic Role Badge */}
        <div className="relative px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
          <div className="quantum-card neon-glow">
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="status-hologram status-active"></div>
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider hidden sm:block">Neural Role</p>
              </div>
              <p className="text-sm sm:text-lg lg:text-xl font-bold text-white drop-shadow-lg truncate">{currentRole?.title}</p>
              <p className="text-xs sm:text-sm text-cyan-200 mt-1 sm:mt-2 font-medium hidden sm:block">{currentRole?.description}</p>
            </div>
          </div>
        </div>
        
        <nav className="relative flex-1 overflow-hidden flex flex-col">
          <div className="px-2 sm:px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400/10 to-cyan-400/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 shrink-0">
                <Brain className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-cyan-300 uppercase tracking-wider hidden sm:block">
                Neural Interface
              </p>
            </div>
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-1 px-2 sm:px-4 lg:px-6 pb-4" style={{WebkitOverflowScrolling: 'touch'}}>
            {userSidebarItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex items-center px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-cyan-300 hover:text-white rounded-2xl transition-all duration-500 btn-animate overflow-hidden hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20"
                  style={{animationDelay: `${index * 0.05}s`}}
                  title={item.name}
                >
                  {/* Futuristic hover background effect */}
                  <div className="absolute inset-0 bg-cyan-500/25 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-2xl" />
                  <div className="absolute inset-0 border border-cyan-500/0 group-hover:border-cyan-500/30 transition-all duration-300 rounded-2xl" />
                  
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all duration-500 shadow-lg group-hover:shadow-xl group-hover:scale-110 border border-cyan-500/20 shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 text-cyan-400 group-hover:text-white transition-colors duration-300" />
                  </div>
                  
                  <div className="flex-1 ml-3 sm:ml-4 relative">
                    <span className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-100 transition-colors duration-300 truncate">{item.name}</span>
                  </div>
                  
                  {item.badge && (
                    <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-300 border shrink-0 ${
                      item.badge === 'LIVE' 
                        ? 'bg-cyan-400/15 text-cyan-300 animate-pulse border-cyan-400/50 shadow-cyan-400/30' 
                        : item.badge === 'NEW'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-cyan-400/30'
                        : item.badge === 'HOT'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-cyan-400/30'
                        : item.badge === 'BETA'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-cyan-400/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 group-hover:text-white'
                    } hidden sm:flex items-center justify-center`}>
                      <span className="hidden sm:inline">{item.badge}</span>
                      <span className="sm:hidden w-2 h-2 rounded-full bg-current animate-pulse"></span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Responsive Futuristic User Profile - Fixed at bottom */}
        <div className="w-full p-2 sm:p-4 lg:p-8 user-profile-fixed shrink-0 border-t border-cyan-500/30">
          <div className="quantum-card neon-glow group hover:scale-105 transition-all duration-500">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="ai-orb w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white drop-shadow-lg z-10 relative" />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-cyan-300 font-semibold tracking-wider uppercase truncate">
                    {currentRole?.title}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="neon-btn text-red-400 hover:text-white hover:bg-red-500/20 hover:border-red-500 rounded-2xl btn-animate group hover:scale-110 transition-all duration-300 p-2 sm:p-3 shrink-0"
                title="Neural Disconnect"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-pulse group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Futuristic Main Content Area */}
      <div className="flex-1 overflow-auto neural-bg relative">
        {/* Data Stream Background */}
        <div className="absolute inset-0 data-stream opacity-30"></div>
        
        {/* Futuristic Quick Access Orb for Management Roles */}
        {(['ADMIN', 'MANAGER'].includes(session.user.role as string)) && (
          <Link
            href="/dashboard"
            className="fixed top-6 right-6 z-50 group"
            title="Neural Dashboard Access"
          >
            <div className="ai-orb w-14 h-14 neon-glow hover:scale-110 hover:rotate-6 transition-all duration-500">
              <Home className="w-7 h-7 text-white drop-shadow-lg group-hover:scale-110 transition-transform duration-300 z-10 relative" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center border border-green-300/50 animate-pulse">
                <span className="text-[8px] font-bold text-white">Δ</span>
              </div>
            </div>
          </Link>
        )}
        
        <div className="relative z-10">
          {children}
        </div>
      </div>
      
      {/* Ashley AI Chat Assistant */}
      <AshleyAIChat />
    </div>
  )
}

export { Layout }
export default Layout