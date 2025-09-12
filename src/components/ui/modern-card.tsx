// @ts-nocheck
import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  value?: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: LucideIcon
  gradient?: string
}

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ 
    className, 
    title, 
    subtitle, 
    value, 
    change, 
    changeType = 'neutral',
    icon: Icon,
    gradient = 'from-indigo-500 to-purple-600',
    children,
    ...props 
  }, ref) => {
    const changeColors = {
      positive: 'text-emerald-600 bg-emerald-50',
      negative: 'text-red-600 bg-red-50',
      neutral: 'text-slate-600 bg-slate-50'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "group relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-sm border border-white/20 shadow-modern hover:shadow-modern-lg transition-all duration-300 card-hover",
          className
        )}
        {...props}
      >
        {/* Background decoration */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full -translate-y-16 translate-x-16 group-hover:opacity-10 transition-opacity duration-300",
          gradient
        )} />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && (
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {title}
                </p>
              )}
              
              {value && (
                <p className="text-3xl font-bold text-slate-900 mb-2">
                  {value}
                </p>
              )}
              
              {subtitle && (
                <p className="text-sm text-slate-500">
                  {subtitle}
                </p>
              )}

              {change && (
                <div className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-3",
                  changeColors[changeType]
                )}>
                  {change}
                </div>
              )}
            </div>

            {Icon && (
              <div className={cn(
                "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300",
                gradient
              )}>
                <Icon className="w-6 h-6" />
              </div>
            )}
          </div>

          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
      </div>
    )
  }
)

ModernCard.displayName = "ModernCard"

export { ModernCard }