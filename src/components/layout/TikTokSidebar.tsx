'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const TikTokSidebar = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { icon: '🏠', href: '/dashboard', tooltip: 'Dashboard', label: 'Dashboard' },
    { icon: '📊', href: '/analytics', tooltip: 'Analytics', label: 'Analytics' },
    { icon: '🎯', href: '/ai-assistant', tooltip: 'AI Assistant', label: 'AI Assistant' },
    { icon: '👥', href: '/users', tooltip: 'Users', label: 'Users' },
    { icon: '📦', href: '/inventory', tooltip: 'Inventory', label: 'Inventory' },
    { icon: '🏭', href: '/production', tooltip: 'Production', label: 'Production' },
    { icon: '🚚', href: '/deliveries', tooltip: 'Deliveries', label: 'Deliveries' },
    { icon: '💰', href: '/finance', tooltip: 'Finance', label: 'Finance' },
    { icon: '📋', href: '/reports', tooltip: 'Reports', label: 'Reports' },
    { icon: '⚙️', href: '/settings', tooltip: 'Settings', label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-black text-white p-2 rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-black transform transition-transform duration-300 z-50 lg:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Mobile header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">🎵</span>
            </div>
            <div>
              <h2 className="text-white font-bold">ASH AI</h2>
              <p className="text-gray-400 text-sm">Neural Apparel Hub</p>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="py-4">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors ${
                pathname === item.href ? 'bg-gray-800 text-white border-r-2 border-white' : ''
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile bottom section */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">👤</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">User Profile</p>
              <p className="text-gray-400 text-xs">System Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-16 bg-black flex-col items-center py-4 z-50">
        {/* TikTok Logo */}
        <div className="mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">🎵</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col space-y-4 flex-1">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`relative group w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {item.tooltip}
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom section */}
        <div className="mt-auto">
          <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">👤</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default TikTokSidebar;