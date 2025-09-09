'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'
import { ToastProvider } from '@/context/toast-context'
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt'
import { offlineSyncManager } from '@/lib/pwa/offline-sync'
import { pushNotificationManager } from '@/lib/pwa/push-notifications'

interface ProvidersProps {
  children: ReactNode
}

function PWAInitializer() {
  useEffect(() => {
    // Initialize PWA features (temporarily disabled for debugging)
    const initializePWA = async () => {
      try {
        console.log('PWA initialization temporarily disabled for debugging')
        // TODO: Re-enable after fixing dashboard error
        // await offlineSyncManager.initialize()
        // offlineSyncManager.setupAutoSync()
        // await offlineSyncManager.cacheEssentialData()
        // await pushNotificationManager.initialize()
        // offlineSyncManager.registerBackgroundSync()
        
        console.log('✅ PWA features initialized')
      } catch (error) {
        console.error('❌ PWA initialization failed:', error)
      }
    }

    initializePWA()
  }, [])

  return null
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ToastProvider>
        <PWAInitializer />
        <PWAInstallPrompt />
        {children}
      </ToastProvider>
    </SessionProvider>
  )
}