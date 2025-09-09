import { Metadata } from 'next'
import { Suspense } from 'react'
import { MobileWorkflowInterface } from '@/components/mobile/MobileWorkflowInterface'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Mobile Workflow - ASH AI',
  description: 'Mobile-optimized production workflow interface',
}

function MobileWorkflowSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface MobileWorkflowPageProps {
  searchParams: {
    orderId?: string
    type?: 'cutting' | 'printing' | 'sewing' | 'qc' | 'packing'
  }
}

export default function MobileWorkflowPage({ searchParams }: MobileWorkflowPageProps) {
  const orderId = searchParams.orderId || 'DEMO-001'
  const workflowType = searchParams.type || 'cutting'

  return (
    <Suspense fallback={<MobileWorkflowSkeleton />}>
      <MobileWorkflowInterface 
        orderId={orderId}
        workflowType={workflowType}
        className="mobile-workflow-app"
      />
    </Suspense>
  )
}