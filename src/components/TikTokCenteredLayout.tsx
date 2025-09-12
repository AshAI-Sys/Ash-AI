// @ts-nocheck
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TikTokCenteredLayoutProps {
  children: React.ReactNode
  className?: string
}

export const TikTokCenteredLayout: React.FC<TikTokCenteredLayoutProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn("max-w-6xl mx-auto space-y-6", className)}>
      {children}
    </div>
  )
}

interface TikTokPageHeaderProps {
  title: string
  description: string
  actions?: React.ReactNode
  icon?: React.ReactNode
}

export const TikTokPageHeader: React.FC<TikTokPageHeaderProps> = ({ 
  title, 
  description, 
  actions,
  icon 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            <p className="text-gray-600 text-lg">
              {description}
            </p>
          </div>
        </div>
        
        {actions && (
          <div className="flex gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

interface TikTokContentCardProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export const TikTokContentCard: React.FC<TikTokContentCardProps> = ({ 
  children, 
  className,
  title 
}) => {
  return (
    <Card className={cn("bg-white border border-gray-200 shadow-sm", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  )
}

interface TikTokMetricsGridProps {
  children: React.ReactNode
  cols?: 2 | 3 | 4
  className?: string
}

export const TikTokMetricsGrid: React.FC<TikTokMetricsGridProps> = ({ 
  children, 
  cols = 4,
  className 
}) => {
  const colsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  }

  return (
    <div className={cn(`grid gap-4 ${colsClass[cols]}`, className)}>
      {children}
    </div>
  )
}

interface TikTokMetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  iconColor?: string
  iconBgColor?: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
}

export const TikTokMetricCard: React.FC<TikTokMetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  trend
}) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgColor}`}>
            <div className={`w-4 h-4 ${iconColor}`}>
              {icon}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">{title}</div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            {trend && (
              <div className={`text-xs mt-1 ${
                trend.direction === 'up' ? 'text-green-600' : 
                trend.direction === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {trend.value}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}