// @ts-nocheck
'use client'

import { Loader2, Package, Clock, RefreshCw } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  variant?: 'default' | 'orders' | 'data'
}

export function LoadingSpinner({ size = 'md', text, variant = 'default' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  const getIcon = () => {
    switch (variant) {
      case 'orders':
        return <Package className={`${sizeClasses[size]} animate-spin text-cyan-400`} />
      case 'data':
        return <RefreshCw className={`${sizeClasses[size]} animate-spin text-cyan-400`} />
      default:
        return <Loader2 className={`${sizeClasses[size]} animate-spin text-cyan-400`} />
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {getIcon()}
      {text && (
        <span className="text-sm text-cyan-300 font-medium animate-pulse">
          {text}
        </span>
      )}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="skeleton h-4 w-20 rounded"></div>
          <div className="skeleton h-4 w-32 rounded"></div>
          <div className="skeleton h-4 w-24 rounded"></div>
          <div className="skeleton h-4 w-16 rounded"></div>
          <div className="skeleton h-4 w-20 rounded"></div>
          <div className="skeleton h-4 w-12 rounded"></div>
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="quantum-card p-6">
          <div className="space-y-4">
            <div className="skeleton h-6 w-3/4 rounded"></div>
            <div className="skeleton h-4 w-1/2 rounded"></div>
            <div className="skeleton h-4 w-2/3 rounded"></div>
            <div className="flex gap-2">
              <div className="skeleton h-6 w-16 rounded-full"></div>
              <div className="skeleton h-6 w-20 rounded-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrdersLoadingState() {
  return (
    <div className="neural-bg min-h-screen">
      <div className="container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="skeleton h-8 w-48 rounded mb-4"></div>
          <div className="skeleton h-4 w-64 rounded"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="quantum-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="skeleton h-6 w-16 rounded mb-2"></div>
                  <div className="skeleton h-8 w-20 rounded"></div>
                </div>
                <div className="skeleton h-10 w-10 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter Skeleton */}
        <div className="quantum-card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="skeleton h-10 flex-1 rounded"></div>
            <div className="skeleton h-10 w-32 rounded"></div>
            <div className="skeleton h-10 w-24 rounded"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="quantum-card p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="quantum-loader w-12 h-12 mx-auto mb-4">
                <div></div><div></div><div></div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Loading Orders</h3>
              <p className="text-cyan-300">Fetching your order data...</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-cyan-300 font-medium">{text}</span>
      </div>
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  text?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function ProgressBar({ progress, text, variant = 'default' }: ProgressBarProps) {
  const variants = {
    default: 'from-cyan-400 to-cyan-600',
    success: 'from-green-400 to-green-600', 
    warning: 'from-yellow-400 to-yellow-600',
    error: 'from-red-400 to-red-600'
  }

  return (
    <div className="w-full">
      {text && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-cyan-300">{text}</span>
          <span className="text-sm text-cyan-400 font-mono">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-slate-800/30 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${variants[variant]} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          <div className="h-full w-full bg-white/20 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export function RefreshButton({ 
  onRefresh, 
  loading = false, 
  text = 'Refresh',
  lastUpdated 
}: { 
  onRefresh: () => void
  loading?: boolean
  text?: string
  lastUpdated?: Date
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onRefresh}
        disabled={loading}
        className="neon-btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {text}
      </button>
      {lastUpdated && (
        <span className="text-xs text-cyan-400/70">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}