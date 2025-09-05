"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"

interface FloatingActionButtonProps {
  onClick?: () => void
  icon?: React.ReactNode
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "success" | "warning" | "danger"
  pulse?: boolean
  expanded?: boolean
  children?: React.ReactNode
  className?: string
}

const positionClasses = {
  "bottom-right": "fixed bottom-6 right-6",
  "bottom-left": "fixed bottom-6 left-6", 
  "top-right": "fixed top-6 right-6",
  "top-left": "fixed top-6 left-6"
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-14 h-14",
  lg: "w-16 h-16"
}

const variantClasses = {
  primary: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/50",
  secondary: "bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 shadow-gray-500/50",
  success: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/50",
  warning: "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 shadow-orange-500/50",
  danger: "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-500/50"
}

export function FloatingActionButton({
  onClick,
  icon = <Plus className="h-6 w-6" />,
  position = "bottom-right",
  size = "md",
  variant = "primary",
  pulse = false,
  expanded = false,
  children,
  className
}: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div className={cn(positionClasses[position], "z-50")}>
      <Button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          "rounded-full text-white shadow-2xl border-0 transition-all duration-300 hover:scale-110 active:scale-95",
          pulse && "animate-pulse",
          expanded && "rounded-2xl px-6 w-auto",
          className
        )}
      >
        <div className={cn(
          "flex items-center space-x-2 transition-all duration-300",
          expanded ? "opacity-100" : isHovered ? "opacity-100" : "opacity-100"
        )}>
          <div className="transition-transform duration-300 hover:rotate-180">
            {icon}
          </div>
          {expanded && children && (
            <span className="font-medium whitespace-nowrap">
              {children}
            </span>
          )}
        </div>

        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 animate-ping" />
        
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-0 hover:opacity-50 transition-opacity duration-300 blur-xl",
          variantClasses[variant]
        )} />
      </Button>
    </div>
  )
}

interface FloatingActionMenuProps {
  isOpen: boolean
  onToggle: () => void
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  items: Array<{
    icon: React.ReactNode
    label: string
    onClick: () => void
    variant?: "primary" | "secondary" | "success" | "warning" | "danger"
  }>
}

export function FloatingActionMenu({
  isOpen,
  onToggle,
  position = "bottom-right",
  items
}: FloatingActionMenuProps) {
  return (
    <div className={cn(positionClasses[position], "z-50")}>
      {/* Menu Items */}
      <div className={cn(
        "absolute transition-all duration-300 space-y-3",
        position.includes("bottom") ? "bottom-16" : "top-16",
        position.includes("right") ? "right-0" : "left-0",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
      )}>
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "transition-all duration-300",
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <Button
              onClick={item.onClick}
              size="sm"
              className={cn(
                "w-12 h-12 rounded-full shadow-xl transition-all duration-300 hover:scale-110",
                variantClasses[item.variant || "primary"]
              )}
              title={item.label}
            >
              {item.icon}
            </Button>
          </div>
        ))}
      </div>

      {/* Toggle Button */}
      <FloatingActionButton
        onClick={onToggle}
        icon={
          <div className="transition-transform duration-300">
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </div>
        }
        className="relative"
      />

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}
    </div>
  )
}