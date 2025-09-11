import { Suspense } from 'react'
import { Metadata } from 'next'
import LiveProductionDashboard from '@/components/realtime/LiveProductionDashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Real-Time Production Dashboard | ASH AI',
  description: 'Live production monitoring, machine status, inventory tracking, and analytics',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* Quick stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function RealTimeDashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<LoadingSkeleton />}>
        <LiveProductionDashboard />
      </Suspense>
      
      {/* Additional Information */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Real-Time Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Live production progress tracking</li>
              <li>• Machine status monitoring</li>
              <li>• Inventory level updates</li>
              <li>• Automated alerts & notifications</li>
              <li>• Performance analytics</li>
              <li>• Bottleneck detection</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Update Frequency</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Dashboard: Every 5 seconds</li>
              <li>• Production: Every 5 seconds</li>
              <li>• Machines: Every 30 seconds</li>
              <li>• Inventory: Every 60 seconds</li>
              <li>• Analytics: Every 30 seconds</li>
              <li>• Alerts: Immediate</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">System Status</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• WebSocket: Connected</li>
              <li>• Production Tracker: Active</li>
              <li>• Machine Monitor: Active</li>
              <li>• Inventory Monitor: Active</li>
              <li>• Analytics Engine: Active</li>
              <li>• Redis Cache: Connected</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}