'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthSigninRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen neural-bg flex items-center justify-center">
      <div className="text-center">
        <div className="quantum-loader w-16 h-16 mx-auto mb-8">
          <div></div><div></div><div></div>
        </div>
        <h1 className="text-2xl font-bold glitch-text text-white mb-4" data-text="Redirecting">Redirecting</h1>
        <p className="text-cyan-300">Redirecting to unified login portal...</p>
      </div>
    </div>
  )
}