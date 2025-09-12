// @ts-nocheck
'use client'

import { useSession } from 'next-auth/react'

export function DebugDashboard() {
  const { data: session } = useSession()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Debug Dashboard</h1>
      <p className="text-white">Testing basic functionality...</p>
      <p className="text-white">Session: {session ? 'Loaded' : 'Not loaded'}</p>
      <p className="text-white">User: {session?.user?.name || 'No user'}</p>
    </div>
  )
}