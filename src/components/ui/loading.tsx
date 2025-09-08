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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-cyan-400 rounded-full animate-spin mx-auto animation-delay-150"></div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">ASH AI Loading</h3>
          <p className="text-gray-600">Initializing neural networks...</p>
        </div>
      </div>
    </div>
  )
}

export const TableLoading = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/5"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const CardLoading = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  )
}