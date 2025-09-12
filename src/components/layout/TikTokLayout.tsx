// @ts-nocheck
'use client';

import React from 'react';
import TikTokSidebar from './TikTokSidebar';
import TikTokHeader from './TikTokHeader';

interface TikTokLayoutProps {
  children: React.ReactNode;
}

const TikTokLayout: React.FC<TikTokLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TikTokSidebar />
      <TikTokHeader />
      
      {/* Main content area - Mobile responsive */}
      <div className="ml-0 lg:ml-16 pt-36 sm:pt-40 lg:pt-44">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TikTokLayout;