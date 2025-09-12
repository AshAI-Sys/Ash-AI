// @ts-nocheck
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
    <div className="min-h-screen neural-bg relative p-4">
      <div className="quantum-field">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="quantum-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 space-y-4">
        <div className="cyber-loader mx-auto mb-4"></div>
        <p className="text-center text-cyan-300">Loading mobile workflow...</p>
      </div>
    </div>
  )
}

interface MobileWorkflowPageProps {
  searchParams: Promise<{
    order_id?: string
    type?: 'cutting' | 'printing' | 'sewing' | 'qc' | 'packing'
  }>
}

export default async function MobileWorkflowPage({ searchParams }: MobileWorkflowPageProps) {
  const params = await searchParams
  const order_id = params.order_id || 'DEMO-001'
  const workflowType = params.type || 'cutting'

  return (
    <Suspense fallback={<MobileWorkflowSkeleton />}>
      <MobileWorkflowInterface 
        order_id={order_id}
        workflowType={workflowType}
        className="mobile-workflow-app"
      />
    </Suspense>
  )
}