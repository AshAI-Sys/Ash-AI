// @ts-nocheck
// Loading States Component - CLIENT_UPDATED_PLAN.md Implementation
// Comprehensive loading indicators for better user experience

import { Loader2, Package, BarChart3, Users, Brain } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${className}`} 
    />
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function LoadingCard({ title, description, icon }: LoadingCardProps) {
  return (
    <div className="simple-card animate-pulse">
      <div className="simple-flex mb-4">
        {icon && (
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1">
          {title && (
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          )}
          {description && (
            <div className="h-4 bg-gray-100 rounded w-full"></div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  )
}

export function LoadingOrderCard() {
  return (
    <LoadingCard
      title="Loading Order..."
      icon={<Package className="w-6 h-6 text-gray-400" />}
    />
  )
}

export function LoadingAnalyticsCard() {
  return (
    <LoadingCard
      title="Loading Analytics..."
      icon={<BarChart3 className="w-6 h-6 text-gray-400" />}
    />
  )
}

export function LoadingUserCard() {
  return (
    <LoadingCard
      title="Loading Users..."
      icon={<Users className="w-6 h-6 text-gray-400" />}
    />
  )
}

export function LoadingAICard() {
  return (
    <LoadingCard
      title="Processing with AI..."
      icon={<Brain className="w-6 h-6 text-gray-400" />}
    />
  )
}

interface LoadingTableProps {
  rows?: number
  columns?: number
}

export function LoadingTable({ rows = 5, columns = 4 }: LoadingTableProps) {
  return (
    <div className="simple-card">
      <div className="animate-pulse">
        {/* Table Header */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4 mb-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-6 bg-gray-100 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface LoadingPageProps {
  title?: string
  description?: string
}

export function LoadingPage({ title = "Loading...", description }: LoadingPageProps) {
  return (
    <div className="simple-page-container">
      <div className="simple-content-wrapper">
        <div className="simple-header">
          <div className="simple-flex">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              {description && (
                <div className="h-4 bg-gray-100 rounded w-64 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
        
        <div className="simple-main">
          <div className="text-center py-16">
            <LoadingSpinner size="lg" className="mx-auto mb-4 text-blue-600" />
            <h2 className="text-lg font-semibold simple-text-primary mb-2">{title}</h2>
            {description && (
              <p className="simple-text-secondary">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface LoadingDashboardProps {
  sections?: number
}

export function LoadingDashboard({ sections = 4 }: LoadingDashboardProps) {
  return (
    <div className="simple-page-container">
      <div className="simple-content-wrapper">
        {/* Loading Header */}
        <div className="simple-header">
          <div className="simple-flex justify-between">
            <div className="simple-flex">
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              <div>
                <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-100 rounded w-64 animate-pulse"></div>
              </div>
            </div>
            <div className="simple-flex">
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="simple-main">
          {/* Stats Cards */}
          <div className="simple-grid mb-8">
            {Array.from({ length: sections }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
          
          {/* Main Content Area */}
          <div className="simple-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <div className="space-y-6">
              <LoadingTable rows={8} columns={5} />
              <LoadingTable rows={6} columns={3} />
            </div>
            <div className="space-y-6">
              <LoadingAnalyticsCard />
              <LoadingAICard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for loading states
export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState)
  
  const startLoading = () => setIsLoading(true)
  const stopLoading = () => setIsLoading(false)
  
  return { isLoading, startLoading, stopLoading }
}

// Higher-order component for loading states
interface WithLoadingProps {
  isLoading: boolean
  loadingComponent?: React.ReactNode
  children: React.ReactNode
}

export function WithLoading({ isLoading, loadingComponent, children }: WithLoadingProps) {
  if (isLoading) {
    return loadingComponent || <LoadingPage />
  }
  
  return <>{children}</>
}