'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { BIRComplianceDashboard } from '@/components/BIRComplianceDashboard'
import { Role } from '@prisma/client'

export default function CompliancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user has permission to access BIR compliance
    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT]
    if (!allowedRoles.includes(session.user.role as Role)) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <ResponsiveLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading compliance dashboard...</p>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <ResponsiveLayout>
      <div className="p-6">
        <BIRComplianceDashboard />
      </div>
    </ResponsiveLayout>
  )
}