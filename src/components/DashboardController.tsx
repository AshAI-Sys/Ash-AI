// @ts-nocheck
"use client"

import { useSession } from 'next-auth/react'
import { Role } from '@prisma/client'
import { ProfessionalDashboard } from './ProfessionalDashboard'
import { StaffDashboard } from './StaffDashboard'

export function DashboardController() {
  const { data: session, status } = useSession()
  
  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }
  
  // If no session, return null (will be handled by parent page)
  if (!session?.user) {
    return null
  }
  
  const userRole = session.user.role as Role
  
  // Admin and Manager see the full analytics dashboard
  const isAdminOrManager = userRole === Role.ADMIN || userRole === Role.MANAGER
  
  try {
    if (isAdminOrManager) {
      return <ProfessionalDashboard />
    }
    
    // All other staff members see their task-focused dashboard
    return <StaffDashboard />
  } catch (error) {
    console.error('Dashboard render error:', error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Error</h3>
          <p className="text-gray-600">Please refresh the page to try again.</p>
        </div>
      </div>
    )
  }
}