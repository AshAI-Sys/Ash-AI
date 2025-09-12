// @ts-nocheck
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthSigninRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* TikTok Sidebar */}
      <div className="fixed left-0 top-0 h-full w-16 bg-black flex flex-col items-center py-4">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-8">
          <span className="text-black font-bold text-sm">🎵</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-16 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">🎵</span>
            </div>
            <span className="text-lg font-medium text-gray-600">TikTok</span>
            <span className="text-lg font-medium text-gray-900">Seller Center</span>
          </div>
          
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Redirecting</h1>
          <p className="text-gray-600">Redirecting to unified login portal...</p>
        </div>
      </div>
    </div>
  )
}