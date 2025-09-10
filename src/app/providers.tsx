'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'
import { ToastProvider } from '../context/toast-context'
import { Toaster } from 'sonner'
// Removed PWAInstallPrompt - not required in CLIENT_UPDATED_PLAN.md
// import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt'
// import { offlineSyncManager } from '@/lib/pwa/offline-sync'
// import { pushNotificationManager } from '@/lib/pwa/push-notifications'

interface ProvidersProps {
  children: ReactNode
}

function PWAInitializer() {
  useEffect(() => {
    // Initialize PWA features
    const initializePWA = async () => {
      try {
        // PWA features temporarily disabled for path resolution issues
        // TODO: Re-enable after fixing path resolution
        console.log('✅ PWA features placeholder (disabled)')
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
        {/* PWAInstallPrompt removed - not in CLIENT_UPDATED_PLAN.md requirements */}
        {children}
        <Toaster 
          position="top-right"
          richColors
          closeButton
          theme="light"
        />
      </ToastProvider>
    </SessionProvider>
  )
}