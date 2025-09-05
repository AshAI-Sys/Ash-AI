'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModernCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
}

export function ModernCard({ 
  children, 
  className, 
  hover = false, 
  glow = false,
  padding = 'lg',
  onClick 
}: ModernCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }

  return (
    <div 
      className={cn(
        'modern-card',
        paddingClasses[padding],
        hover && 'hover-lift cursor-pointer',
        glow && 'hover-glow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}