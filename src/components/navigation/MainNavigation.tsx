// @ts-nocheck
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
        { id: 'orders-workflow', label: 'Workflow Status', href: '/orders/workflow', icon: <Activity className="w-4 h-4" /> },
        { id: 'orders-quotes', label: 'Quotes & Estimates', href: '/orders/quotes', icon: <FileText className="w-4 h-4" /> },
        { id: 'orders-tracking', label: 'Order Tracking', href: '/orders/tracking', icon: <Truck className="w-4 h-4" /> }
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
        { id: 'production-efficiency', label: 'Efficiency Metrics', href: '/production/efficiency', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'production-cutting', label: 'Cutting Operations', href: '/production/cutting', icon: <Activity className="w-4 h-4" /> },
        { id: 'production-sewing', label: 'Sewing Operations', href: '/production/sewing', icon: <Activity className="w-4 h-4" /> },
        { id: 'production-printing', label: 'Printing Operations', href: '/production/printing', icon: <Activity className="w-4 h-4" /> }
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
        { id: 'quality-capa', label: 'CAPA Management', href: '/quality/capa', icon: <FileText className="w-4 h-4" /> },
        { id: 'quality-audits', label: 'Quality Audits', href: '/quality/audits', icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'quality-certificates', label: 'Certificates', href: '/quality/certificates', icon: <FileText className="w-4 h-4" /> }
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
        { id: 'inventory-materials', label: 'Raw Materials', href: '/inventory/materials', icon: <Package className="w-4 h-4" /> },
        { id: 'inventory-suppliers', label: 'Supplier Management', href: '/inventory/suppliers', icon: <Truck className="w-4 h-4" /> },
        { id: 'inventory-purchasing', label: 'Purchase Orders', href: '/inventory/purchasing', icon: <FileText className="w-4 h-4" /> },
        { id: 'inventory-receiving', label: 'Receiving', href: '/inventory/receiving', icon: <Package className="w-4 h-4" /> },
        { id: 'inventory-warehouses', label: 'Warehouse Management', href: '/inventory/warehouses', icon: <Home className="w-4 h-4" /> }
      ]
    },
    {
      id: 'clients',
      label: 'Client Management',
      href: '/clients',
      icon: <Users className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'CLIENT'],
      children: [
        { id: 'clients-list', label: 'All Clients', href: '/clients', icon: <Users className="w-4 h-4" /> },
        { id: 'clients-brands', label: 'Brand Management', href: '/clients/brands', icon: <Package className="w-4 h-4" /> },
        { id: 'clients-contracts', label: 'Contracts', href: '/clients/contracts', icon: <FileText className="w-4 h-4" /> },
        { id: 'clients-communications', label: 'Communications', href: '/clients/communications', icon: <Bell className="w-4 h-4" /> },
        { id: 'clients-portal', label: 'Client Portal', href: '/client-portal', icon: <UserCircle className="w-4 h-4" /> }
      ]
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
        { id: 'finance-reports', label: 'Financial Reports', href: '/finance/reports', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'finance-accounts', label: 'Accounts Receivable', href: '/finance/accounts-receivable', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'finance-payables', label: 'Accounts Payable', href: '/finance/accounts-payable', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'finance-budgets', label: 'Budget Planning', href: '/finance/budgets', icon: <BarChart3 className="w-4 h-4" /> }
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
        { id: 'hr-payroll', label: 'Payroll Processing', href: '/hr/payroll', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'hr-performance', label: 'Performance Reviews', href: '/hr/performance', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'hr-training', label: 'Training Programs', href: '/hr/training', icon: <Users className="w-4 h-4" /> },
        { id: 'hr-benefits', label: 'Benefits Management', href: '/hr/benefits', icon: <Users className="w-4 h-4" /> }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      href: '/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER'],
      children: [
        { id: 'analytics-dashboard', label: 'Analytics Dashboard', href: '/analytics', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'analytics-production', label: 'Production Reports', href: '/analytics/production', icon: <Activity className="w-4 h-4" /> },
        { id: 'analytics-sales', label: 'Sales Reports', href: '/analytics/sales', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'analytics-financial', label: 'Financial Analysis', href: '/analytics/financial', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'analytics-kpi', label: 'KPI Monitoring', href: '/analytics/kpi', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'analytics-forecasting', label: 'Forecasting', href: '/analytics/forecasting', icon: <BarChart3 className="w-4 h-4" /> }
      ]
    },
    {
      id: 'ai-assistant',
      label: 'Ashley AI',
      href: '/ai-assistant',
      icon: <Brain className="w-5 h-5" />,
      requiredRoles: ['ADMIN', 'MANAGER', 'OPERATOR'],
      children: [
        { id: 'ai-chat', label: 'AI Chat Assistant', href: '/ai-assistant', icon: <Brain className="w-4 h-4" /> },
        { id: 'ai-insights', label: 'AI Insights', href: '/ai-assistant/insights', icon: <Zap className="w-4 h-4" /> },
        { id: 'ai-recommendations', label: 'Recommendations', href: '/ai-assistant/recommendations', icon: <Brain className="w-4 h-4" /> },
        { id: 'ai-automation', label: 'AI Automation', href: '/ai-assistant/automation', icon: <Zap className="w-4 h-4" /> }
      ]
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
      {/* Mobile-Optimized Top Navigation Bar */}
      <div className={`bg-white/95 backdrop-blur-sm border-b border-slate-150 ${className}`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          {/* Left Section */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors lg:hidden touch-manipulation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            {/* Responsive Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-subtle">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-h2 text-slate-800 font-serif hidden xs:block">ASH AI</span>
            </Link>

            {/* Mobile Breadcrumbs - Simplified */}
            <nav className="hidden sm:flex items-center space-x-2 sm:space-x-3 text-xs sm:text-body-sm ml-2 sm:ml-6">
              {breadcrumbs.slice(-2).map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  <Link 
                    href={crumb.href}
                    className={`hover:text-slate-800 transition-colors font-medium truncate max-w-24 sm:max-w-none ${
                      index === breadcrumbs.slice(-2).length - 1 
                        ? 'text-slate-800' 
                        : 'text-slate-500'
                    }`}
                    title={crumb.label}
                  >
                    {crumb.label}
                  </Link>
                  {index < breadcrumbs.slice(-2).length - 1 && (
                    <span className="text-slate-300">/</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Mobile-Optimized Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search - Hidden on mobile, shown on tablet+ */}
            <button className="hidden sm:block p-2 sm:p-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 touch-manipulation">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 sm:p-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 touch-manipulation">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shadow-subtle text-[10px] sm:text-xs">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>

            {/* Mobile User Menu */}
            <div className="flex items-center space-x-2 sm:space-x-4 pl-1 sm:pl-2">
              <div className="hidden lg:block text-right">
                <p className="text-slate-800 font-semibold text-body-sm">{session?.user?.name}</p>
                <p className="text-slate-500 text-caption font-medium">{session?.user?.role}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-subtle">
                <span className="text-white font-semibold text-sm sm:text-base">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-full max-w-xs sm:w-80 md:w-72 bg-white/95 backdrop-blur-sm border-r border-slate-150 shadow-elegant transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Sidebar Header */}
          <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-subtle">
                  <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-h3 font-semibold text-slate-800">ASH AI</h2>
                  <p className="text-xs sm:text-body-sm text-slate-500 font-medium">Manufacturing Intelligence</p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <nav className="flex-1 p-4 sm:p-6 lg:p-8 space-y-2 sm:space-y-3 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <div key={item.id}>
                <div className="relative">
                  {item.children ? (
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-body-sm font-medium transition-all duration-200 touch-manipulation ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 shadow-subtle'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <span className={`${isActive(item.href) ? 'text-blue-600' : 'text-slate-500'}`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-100 text-red-600 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold min-w-[20px] text-center">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
                        isExpanded(item.id) ? 'rotate-180' : ''
                      }`} />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 sm:space-x-4 px-3 sm:px-4 py-3 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-body-sm font-medium transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 shadow-subtle'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <span className={`${isActive(item.href) ? 'text-blue-600' : 'text-slate-500'} flex-shrink-0`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="bg-red-100 text-red-600 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold ml-auto min-w-[20px] text-center flex-shrink-0">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>

                {/* Mobile Sub-menu */}
                {item.children && isExpanded(item.id) && (
                  <div className="ml-6 sm:ml-8 mt-1 sm:mt-2 space-y-1 border-l border-slate-100 pl-3 sm:pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className={`flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-body-sm transition-all duration-200 ${
                          isActive(child.href)
                            ? 'bg-blue-50 text-blue-700 shadow-subtle'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <span className={`${isActive(child.href) ? 'text-blue-600' : 'text-slate-400'} flex-shrink-0`}>
                          {child.icon}
                        </span>
                        <span className="truncate text-xs sm:text-sm">{child.label}</span>
                        {child.badge && (
                          <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-semibold ml-auto min-w-[18px] text-center flex-shrink-0">
                            {child.badge > 9 ? '9+' : child.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile Sidebar Footer */}
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-150">
            <Link
              href="/settings"
              className="flex items-center space-x-3 sm:space-x-4 px-3 sm:px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg sm:rounded-xl transition-all duration-200 text-sm sm:text-body-sm font-medium touch-manipulation"
              onClick={() => setIsSidebarOpen(false)}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
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