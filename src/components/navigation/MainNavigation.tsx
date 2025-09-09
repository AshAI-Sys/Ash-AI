'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  LayoutDashboard, Package, Activity, CheckCircle2, Users, 
  BarChart3, Settings, Bell, Search, Menu, X, ChevronDown,
  ChevronRight, Brain, Zap, DollarSign, FileText, Truck,
  UserCircle, LogOut, Home
} from 'lucide-react';

// Main Navigation System - CLIENT_UPDATED_PLAN.md Implementation
// Comprehensive navigation with role-based access and breadcrumbs

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  requiredRoles?: string[];
  children?: NavItem[];
}

interface MainNavigationProps {
  className?: string;
}

export default function MainNavigation({ className = '' }: MainNavigationProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(3);

  // Navigation structure based on CLIENT_UPDATED_PLAN.md
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'OPERATOR', 'CLIENT']
    },
    {
      id: 'orders',
      label: 'Order Management',
      href: '/orders',
      icon: <Package className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
      children: [
        { id: 'orders-list', label: 'All Orders', href: '/orders', icon: <Package className="w-4 h-4" /> },
        { id: 'orders-create', label: 'Create Order', href: '/orders/create', icon: <Package className="w-4 h-4" /> },
        { id: 'orders-workflow', label: 'Workflow Status', href: '/orders/workflow', icon: <Activity className="w-4 h-4" /> }
      ]
    },
    {
      id: 'production',
      label: 'Production Control',
      href: '/production',
      icon: <Activity className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'PRODUCTION_MANAGER', 'OPERATOR'],
      children: [
        { id: 'production-dashboard', label: 'Production Dashboard', href: '/production', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'production-tracking', label: 'Real-Time Tracking', href: '/production/tracking', icon: <Zap className="w-4 h-4" />, badge: 8 },
        { id: 'production-scheduling', label: 'Production Schedule', href: '/production/schedule', icon: <Activity className="w-4 h-4" /> },
        { id: 'production-efficiency', label: 'Efficiency Metrics', href: '/production/efficiency', icon: <BarChart3 className="w-4 h-4" /> }
      ]
    },
    {
      id: 'quality',
      label: 'Quality Control',
      href: '/quality',
      icon: <CheckCircle2 className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'QC_INSPECTOR'],
      children: [
        { id: 'quality-inspections', label: 'Active Inspections', href: '/quality/inspections', icon: <CheckCircle2 className="w-4 h-4" />, badge: 5 },
        { id: 'quality-defects', label: 'Defect Tracking', href: '/quality/defects', icon: <X className="w-4 h-4" /> },
        { id: 'quality-metrics', label: 'Quality Metrics', href: '/quality/metrics', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'quality-capa', label: 'CAPA Management', href: '/quality/capa', icon: <FileText className="w-4 h-4" /> }
      ]
    },
    {
      id: 'inventory',
      label: 'Inventory System',
      href: '/inventory',
      icon: <Package className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'],
      children: [
        { id: 'inventory-stock', label: 'Stock Levels', href: '/inventory/stock', icon: <Package className="w-4 h-4" /> },
        { id: 'inventory-materials', label: 'Materials', href: '/inventory/materials', icon: <Package className="w-4 h-4" /> },
        { id: 'inventory-suppliers', label: 'Supplier Management', href: '/inventory/suppliers', icon: <Truck className="w-4 h-4" /> }
      ]
    },
    {
      id: 'clients',
      label: 'Client Management',
      href: '/clients',
      icon: <Users className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'CLIENT']
    },
    {
      id: 'finance',
      label: 'Financial Management',
      href: '/finance',
      icon: <DollarSign className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'FINANCE_MANAGER'],
      children: [
        { id: 'finance-invoices', label: 'Invoices', href: '/finance/invoices', icon: <FileText className="w-4 h-4" /> },
        { id: 'finance-payments', label: 'Payments', href: '/finance/payments', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'finance-reports', label: 'Financial Reports', href: '/finance/reports', icon: <BarChart3 className="w-4 h-4" /> }
      ]
    },
    {
      id: 'hr',
      label: 'Human Resources',
      href: '/hr',
      icon: <Users className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'HR_MANAGER'],
      children: [
        { id: 'hr-employees', label: 'Employee Management', href: '/hr/employees', icon: <Users className="w-4 h-4" /> },
        { id: 'hr-attendance', label: 'Attendance Tracking', href: '/hr/attendance', icon: <Activity className="w-4 h-4" /> },
        { id: 'hr-payroll', label: 'Payroll Processing', href: '/hr/payroll', icon: <DollarSign className="w-4 h-4" /> }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      href: '/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER']
    },
    {
      id: 'ai-assistant',
      label: 'Ashley AI',
      href: '/ai-assistant',
      icon: <Brain className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'OPERATOR']
    }
  ];

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    if (!session?.user?.role) return [];
    
    return navItems.filter(item => 
      !item.requiredRoles || item.requiredRoles.includes(session.user.role)
    ).map(item => ({
      ...item,
      children: item.children?.filter(child => 
        !child.requiredRoles || child.requiredRoles.includes(session.user.role)
      )
    }));
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const isExpanded = (itemId: string) => expandedItems.includes(itemId);

  // Generate breadcrumbs
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      { label: 'Home', href: '/dashboard' }
    ];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      
      // Find matching nav item
      const findItem = (items: NavItem[]): NavItem | null => {
        for (const item of items) {
          if (item.href === currentPath) return item;
          if (item.children) {
            const found = findItem(item.children);
            if (found) return found;
          }
        }
        return null;
      };

      const item = findItem(getFilteredNavItems());
      if (item) {
        breadcrumbs.push({ label: item.label, href: item.href });
      } else {
        // Fallback to capitalized segment
        breadcrumbs.push({ 
          label: segment.charAt(0).toUpperCase() + segment.slice(1), 
          href: currentPath 
        });
      }
    }

    return breadcrumbs;
  };

  const filteredNavItems = getFilteredNavItems();
  const breadcrumbs = generateBreadcrumbs();

  return (
    <>
      {/* Top Navigation Bar */}
      <div className={`bg-white/10 backdrop-blur-xl border-b border-white/20 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors lg:hidden"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ASH AI</span>
            </Link>

            {/* Breadcrumbs */}
            <nav className="hidden md:flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  <Link 
                    href={crumb.href}
                    className={`hover:text-white transition-colors ${
                      index === breadcrumbs.length - 1 
                        ? 'text-white font-semibold' 
                        : 'text-blue-200'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-blue-300" />
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="hidden md:block text-right">
                <p className="text-white font-semibold">{session?.user?.name}</p>
                <p className="text-blue-200 text-sm">{session?.user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/10 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">ASH AI</h2>
                <p className="text-xs text-blue-200">Smart Manufacturing</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <div key={item.id}>
                <div className="relative">
                  {item.children ? (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-500/20 text-white'
                          : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        isExpanded(item.id) ? 'rotate-180' : ''
                      }`} />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-500/20 text-white'
                          : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center ml-auto">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>

                {/* Sub-menu */}
                {item.children && isExpanded(item.id) && (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-blue-500/20 text-white'
                            : 'text-blue-300 hover:bg-white/10 hover:text-white'
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                        {child.badge && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[16px] text-center ml-auto">
                            {child.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/20">
            <Link
              href="/settings"
              className="flex items-center space-x-2 px-3 py-2 text-blue-200 hover:bg-white/10 hover:text-white rounded-lg transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}