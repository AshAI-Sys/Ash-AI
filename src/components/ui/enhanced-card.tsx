"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  gradient?: string
  hover?: boolean
  glowing?: boolean
  pulse?: boolean
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, title, description, icon, badge, gradient, hover = true, glowing = false, pulse = false, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "glass-card relative overflow-hidden border-white/40",
          hover && "hover:shadow-xl hover:scale-105 transition-all duration-300 hover:shadow-blue-500/20",
          glowing && "shadow-lg shadow-blue-500/25 ring-1 ring-blue-500/20",
          pulse && "animate-pulse",
          gradient && `bg-gradient-to-br ${gradient}`,
          className
        )}
        {...props}
      >
        {/* Animated background effect */}
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 animate-pulse opacity-50" />
        )}
        
        {(title || description || icon || badge) && (
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {icon && (
                  <div className="p-2 rounded-xl bg-white/80 shadow-lg border border-white/40">
                    {icon}
                  </div>
                )}
                <div>
                  {title && (
                    <CardTitle className="bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">
                      {title}
                    </CardTitle>
                  )}
                  {description && (
                    <CardDescription className="text-slate-600 mt-1">
                      {description}
                    </CardDescription>
                  )}
                </div>
              </div>
              {badge && badge}
            </div>
          </CardHeader>
        )}
        
        {children && (
          <CardContent className="relative">
            {children}
          </CardContent>
        )}
      </Card>
    )
  }
)

EnhancedCard.displayName = "EnhancedCard"

export { EnhancedCard }