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
import TopTaskbar from '@/components/TopTaskbar'

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

  // Temporarily bypass authentication for testing TikTok design
  if (!session) {
    // Create mock session for testing
    const mockSession = {
      user: {
        id: 'test-user',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'ADMIN' as Role
      }
    }

    // Use mock session data
    const mockUserSidebarItems = sidebarItems[mockSession.user.role] || []
    const mockCurrentRole = roleInfo[mockSession.user.role]

    return (
      <div className="flex h-screen bg-gray-50">
        {/* TikTok-style Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white text-sm font-bold">🎖️</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">ASH AI</h1>
                <p className="text-sm text-gray-600">Manufacturing Center</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{mockSession.user.name}</p>
                <p className="text-xs text-gray-600">{mockCurrentRole?.title}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-auto p-2">
            <div className="space-y-1">
              {mockUserSidebarItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 justify-start text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>

        {/* Ashley AI Chat Assistant */}
        <AshleyAIChat />
      </div>
    )
  }

  const userSidebarItems = sidebarItems[session.user.role] || []
  const currentRole = roleInfo[session.user.role]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* TikTok-style Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">🎖️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">ASH AI</h1>
              <p className="text-sm text-gray-600">Manufacturing Center</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-600">{currentRole?.title}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-auto p-2">
          <div className="space-y-1">
            {userSidebarItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 justify-start text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
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