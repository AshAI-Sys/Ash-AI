// @ts-nocheck
'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8'
}

export const Loading = ({ size = 'md', className, text }: LoadingProps) => {
  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  )
}

export const LoadingSpinner = ({ size = 'md', className }: Omit<LoadingProps, 'text'>) => {
  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

export const PageLoading = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* TikTok-style sidebar placeholder */}
      <div className="fixed left-0 top-0 h-full w-16 bg-black flex flex-col items-center py-4">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-8">
          <span className="text-black font-bold text-sm">🎵</span>
        </div>
      </div>
      
      {/* Enhanced loading content */}
      <div className="ml-16 flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          {/* Enhanced loading animation */}
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-blue-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-2 w-16 h-16 border-2 border-transparent border-l-teal-400 rounded-full animate-spin mx-auto" style={{ animationDuration: '2s' }}></div>
          </div>
          
          {/* ASH AI branding */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-700 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">🧠</span>
              </div>
              <div className="text-left">
                <span className="text-lg font-bold text-gray-900 block">ASH AI</span>
                <span className="text-sm font-medium text-gray-600">Neural Apparel Hub</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-gray-700 font-medium">Loading your workspace...</p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System initializing</span>
              </div>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="w-full max-w-xs mx-auto">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const TableLoading = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="w-full">
      {/* Table header skeleton */}
      <div className="border-b border-gray-200 pb-3 mb-3">
        <div className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/5"></div>
        </div>
      </div>
      
      {/* Table rows skeleton */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex space-x-4 items-center py-2">
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/5"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const CardLoading = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </div>
        
        {/* Content */}
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-4/5"></div>
          <div className="h-3 bg-gray-200 rounded w-3/5"></div>
        </div>
        
        {/* Stats or metrics */}
        <div className="flex space-x-4 pt-2">
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-2 pt-2 border-t border-gray-100">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  )
}