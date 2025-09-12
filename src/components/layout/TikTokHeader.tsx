// @ts-nocheck
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const TikTokHeader = () => {
  const pathname = usePathname();

  const navigationTabs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/analytics' },
    { label: 'AI Assistant', href: '/ai-assistant' },
    { label: 'Orders', href: '/orders' },
    { label: 'Inventory', href: '/inventory' },
    { label: 'Production', href: '/production' },
    { label: 'Reports', href: '/reports' },
    { label: 'Settings', href: '/settings' },
  ];

  const getPageTitle = (pathname: string) => {
    const pageMap: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/analytics': 'Analytics & Insights',
      '/ai-assistant': 'AI Assistant',
      '/orders': 'Order Management',
      '/inventory': 'Inventory Management',
      '/production': 'Production Management',
      '/reports': 'Reports & Analytics',
      '/settings': 'Settings',
      '/finance': 'Financial Management',
      '/users': 'User Management',
      '/deliveries': 'Delivery Management'
    }
    return pageMap[pathname] || 'Dashboard'
  };

  const getBreadcrumbs = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', href: '/dashboard', icon: Home }];
    
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      const segmentMap: { [key: string]: string } = {
        'dashboard': 'Dashboard',
        'analytics': 'Analytics',
        'ai-assistant': 'AI Assistant',
        'orders': 'Orders',
        'inventory': 'Inventory',
        'production': 'Production',
        'reports': 'Reports',
        'settings': 'Settings',
        'finance': 'Finance',
        'users': 'Users',
        'deliveries': 'Deliveries'
      };
      
      if (segmentMap[segment]) {
        breadcrumbs.push({
          name: segmentMap[segment],
          href: currentPath,
          icon: null
        });
      }
    });
    
    return breadcrumbs;
  };

  return (
    <div className="fixed top-0 left-0 lg:left-16 right-0 bg-white border-b border-gray-200 z-40">
      {/* Top section with logo and title */}
      <div className="flex items-center px-4 sm:px-6 py-4 ml-0 lg:ml-0">
        <div className="flex items-center space-x-3 ml-12 lg:ml-0">
          {/* ASH AI Logo - Updated for mobile */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">🧠</span>
            </div>
            <div className="hidden sm:flex space-x-1">
              <span className="text-sm font-medium text-gray-600">ASH</span>
              <span className="text-sm font-medium text-gray-900">AI System</span>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
          <button className="text-gray-500 hover:text-gray-700 p-2">
            <span className="text-sm">🔔</span>
          </button>
          <button className="text-gray-500 hover:text-gray-700 p-2 hidden sm:block">
            <span className="text-sm">❓</span>
          </button>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-xs">👤</span>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation - Mobile responsive */}
      <div className="px-4 sm:px-6 py-2 border-b border-gray-100 ml-12 lg:ml-0">
        <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm overflow-x-auto">
          {getBreadcrumbs(pathname).map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.href}>
              {index > 0 && (
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
              )}
              <Link
                href={breadcrumb.href}
                className={`flex items-center space-x-1 hover:text-gray-700 transition-colors whitespace-nowrap ${
                  index === getBreadcrumbs(pathname).length - 1 
                    ? 'text-gray-900 font-medium' 
                    : 'text-gray-500'
                }`}
              >
                {breadcrumb.icon && (
                  <breadcrumb.icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                )}
                <span className="truncate">{breadcrumb.name}</span>
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Main title - Mobile responsive */}
      <div className="px-4 sm:px-6 pb-4 pt-2 ml-12 lg:ml-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{getPageTitle(pathname)}</h1>
      </div>

      {/* Navigation tabs - Mobile responsive with horizontal scroll */}
      <div className="px-4 sm:px-6 ml-12 lg:ml-0">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto pb-2">
          {navigationTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                pathname === tab.href
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default TikTokHeader;