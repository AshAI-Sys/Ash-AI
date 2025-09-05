"use client"

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Role } from '@prisma/client'
import { 
  Home,
  Package,
  Users,
  BarChart3,
  Settings,
  FileText,
  Palette,
  Scissors,
  Truck,
  Calendar,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User,
  Factory,
  ClipboardList,
  Target,
  Award,
  Activity,
  CheckCircle2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PortalLayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  roles: Role[]
  badge?: string | number
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    href: '/dashboard',
    roles: [Role.ADMIN, Role.MANAGER, Role.GRAPHIC_ARTIST, Role.SEWING_OPERATOR, Role.DTF_OPERATOR, Role.QC_INSPECTOR]
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <FileText className="w-5 h-5" />,
    href: '/orders',
    roles: [Role.ADMIN, Role.MANAGER],
    badge: '12'
  },
  {
    id: 'tasks',
    label: 'My Tasks',
    icon: <ClipboardList className="w-5 h-5" />,
    href: '/tasks',
    roles: [Role.GRAPHIC_ARTIST, Role.SEWING_OPERATOR, Role.DTF_OPERATOR, Role.QC_INSPECTOR],
    badge: '3'
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    icon: <Activity className="w-5 h-5" />,
    href: '/ai-assistant',
    roles: [Role.ADMIN, Role.MANAGER],
    badge: 'NEW'
  },
  {
    id: 'production',
    label: 'Production',
    icon: <Factory className="w-5 h-5" />,
    href: '/production',
    roles: [Role.ADMIN, Role.MANAGER]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: <Package className="w-5 h-5" />,
    href: '/inventory',
    roles: [Role.ADMIN, Role.MANAGER],
    badge: '24'
  },
  {
    id: 'design',
    label: 'Design',
    icon: <Palette className="w-5 h-5" />,
    href: '/design',
    roles: [Role.ADMIN, Role.MANAGER, Role.GRAPHIC_ARTIST]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart3 className="w-5 h-5" />,
    href: '/reports',
    roles: [Role.ADMIN, Role.MANAGER]
  },
  {
    id: 'users',
    label: 'Team',
    icon: <Users className="w-5 h-5" />,
    href: '/users',
    roles: [Role.ADMIN, Role.MANAGER]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    href: '/settings',
    roles: [Role.ADMIN, Role.MANAGER]
  }
]

export function PortalLayout({ children }: PortalLayoutProps) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!session?.user) {
    return <div>{children}</div>
  }

  const userRole = session.user.role as Role
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole))
  
  const isStaff = ![Role.ADMIN, Role.MANAGER].includes(userRole)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Sorbetes</h1>
                <p className="text-sm text-gray-500">Studio</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole?.replace('_', ' ')}
                </p>
              </div>
              {!isStaff && (
                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-xs">
                  System Admin
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {filteredMenuItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-400 group-hover:text-gray-600">
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="bg-blue-50 text-blue-600 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </a>
              ))}
            </div>
          </nav>

          {/* Navigation Status */}
          <div className="p-4 border-t border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Navigation</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 text-xs font-medium">Online</span>
                </div>
              </div>
              
              {isStaff && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tasks</span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                    3 pending
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">System</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 text-xs">Operational</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Actions */}
          <div className="p-4 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-600 hover:text-red-600"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Good morning, {session.user.name}! ✨
                </h2>
                <p className="text-sm text-gray-600">
                  {isStaff 
                    ? "Welcome to your personal workspace. Stay focused and complete your assigned tasks with excellence."
                    : "Welcome to your business comprehensive dashboard. Monitor operations, track performance, and manage your apparel production with style and efficiency."
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
              </Button>
              
              <Button variant="ghost" size="sm">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}