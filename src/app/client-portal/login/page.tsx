'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ClientPortalLoginRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-8"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirecting</h1>
        <p className="text-gray-600">Redirecting to unified login portal...</p>
      </div>
    </div>
  )
}