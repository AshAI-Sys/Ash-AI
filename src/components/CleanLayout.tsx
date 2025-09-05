'use client'

import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Package,
  BarChart3,
  Users,
  DollarSign,
  FileText,
  Monitor,
  Shield,
  Brain,
  Building
} from 'lucide-react'
import Link from 'next/link'
import { Role } from '@prisma/client'

interface CleanLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home,
    roles: ['ALL'] 
  },
  { 
    name: 'AI Assistant', 
    href: '/ai', 
    icon: Brain,
    badge: 'NEW',
    roles: [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF] 
  },
  { 
    name: 'Orders', 
    href: '/orders', 
    icon: FileText,
    roles: [Role.ADMIN, Role.MANAGER, Role.CSR, Role.SALES_STAFF] 
  },
  { 
    name: 'Inventory', 
    href: '/inventory', 
    icon: Package,
    roles: [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF, Role.PURCHASER] 
  },
  { 
    name: 'Live Selling', 
    href: '/live-selling', 
    icon: Monitor,
    badge: 'HOT',
    roles: [Role.ADMIN, Role.MANAGER, Role.LIVE_SELLER, Role.CSR] 
  },
  { 
    name: 'Mobile Warehouse', 
    href: '/mobile/warehouse', 
    icon: Search,
    roles: [Role.ADMIN, Role.WAREHOUSE_STAFF] 
  },
  { 
    name: 'Finance', 
    href: '/finance', 
    icon: DollarSign,
    roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] 
  },
  { 
    name: 'BIR Compliance', 
    href: '/compliance', 
    icon: Shield,
    roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] 
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: BarChart3,
    roles: [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] 
  },
  { 
    name: 'Users', 
    href: '/users', 
    icon: Users,
    roles: [Role.ADMIN] 
  },
  { 
    name: 'Public Site', 
    href: '/public-site', 
    icon: Building,
    badge: 'PUBLIC',
    roles: [Role.ADMIN, Role.MANAGER] 
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    roles: [Role.ADMIN, Role.MANAGER] 
  }
]

export function CleanLayout({ children, title, subtitle }: CleanLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const userRole = session?.user?.role as Role
  
  // Filter navigation items based on user role
  const visibleNavItems = navigationItems.filter(item => 
    item.roles.includes('ALL') || item.roles.includes(userRole)
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Implement search logic here
      console.log('Searching for:', searchQuery)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <Link href="/dashboard" className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-gray-900">Sorbetes Studio</h1>
                </div>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8 hidden md:block">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search orders, inventory, tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
              
              <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-sm">
                  <div className="font-medium text-gray-900">{session?.user?.name}</div>
                  <div className="text-gray-500 text-xs">{session?.user?.role}</div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </form>

              {/* Mobile Navigation Items */}
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.name}</span>
                  {item.badge && (
                    <Badge className="ml-2 text-xs" variant="secondary">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex-1 flex flex-col min-h-0 pt-4 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-4 space-y-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500" />
                {item.name}
                {item.badge && (
                  <Badge className="ml-auto text-xs" variant="secondary">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              )}
              {subtitle && (
                <p className="text-gray-600">{subtitle}</p>
              )}
            </div>
          )}

          {/* Page Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}