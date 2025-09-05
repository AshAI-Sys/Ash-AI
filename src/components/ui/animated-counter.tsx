"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  prefix = "", 
  suffix = "",
  className = "",
  decimals = 0
}: AnimatedCounterProps) {
  const [currentValue, setCurrentValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let startValue = currentValue

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp
        startValue = currentValue
      }

      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const nextValue = startValue + (value - startValue) * easeOut
      setCurrentValue(nextValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  const displayValue = decimals > 0 
    ? currentValue.toFixed(decimals)
    : Math.floor(currentValue).toLocaleString()

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{displayValue}{suffix}
    </span>
  )
}

interface AnimatedProgressProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
  duration?: number
}

export function AnimatedProgress({
  value,
  max = 100,
  className = "",
  barClassName = "",
  duration = 1000
}: AnimatedProgressProps) {
  const [currentValue, setCurrentValue] = useState(0)
  const percentage = Math.min((value / max) * 100, 100)

  useEffect(() => {
    let startTime: number
    let startValue = currentValue

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp
        startValue = currentValue
      }

      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const nextValue = startValue + (percentage - startValue) * easeOut
      
      setCurrentValue(nextValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [percentage, duration])

  return (
    <div className={cn("w-full bg-gray-200 rounded-full h-2 overflow-hidden", className)}>
      <div 
        className={cn(
          "h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 shadow-lg",
          barClassName
        )}
        style={{ width: `${currentValue}%` }}
      />
    </div>
  )
}