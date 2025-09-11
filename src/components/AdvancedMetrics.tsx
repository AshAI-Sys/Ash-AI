'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricsProps {
  data?: any
  timeRange?: string
}

export default function AdvancedMetrics({ data, timeRange = "7 days" }: MetricsProps) {
  const metrics = [
    { label: "Production Efficiency", value: "94.2%", trend: "+5.1%" },
    { label: "Order Completion Rate", value: "97.8%", trend: "+2.3%" },
    { label: "Quality Score (AQL)", value: "99.1%", trend: "+1.2%" },
    { label: "Material Utilization", value: "89.7%", trend: "+3.4%" },
    { label: "On-Time Delivery", value: "96.5%", trend: "+4.2%" },
    { label: "Customer Satisfaction", value: "98.3%", trend: "+1.8%" }
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Advanced Metrics ({timeRange})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-slate-50 rounded-lg p-3 border">
              <div className="text-xs text-slate-600 mb-1">{metric.label}</div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-slate-900">{metric.value}</div>
                <div className="text-xs text-green-600 font-medium">{metric.trend}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-800 font-medium mb-1">🤖 Ashley AI Insight</div>
          <div className="text-sm text-blue-700">
            Production efficiency is trending upward. Consider optimizing material flow to reach 95%+ efficiency.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}