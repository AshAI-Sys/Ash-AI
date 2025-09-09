'use client'

// 📱 ASH AI - PWA Install Prompt Component
// Smart installation prompt for Progressive Web App

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Smartphone, 
  Download, 
  X, 
  Wifi,
  Zap,
  Shield,
  Camera,
  Bell,
  WifiOff,
  Star,
  ArrowDown
} from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallPromptProps {
  className?: string
}

export function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    
    setIsStandalone(isStandaloneMode || isIOSStandalone)
    setIsInstalled(isStandaloneMode || isIOSStandalone)

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // Check if prompt was previously dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setPromptDismissed(true)
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const beforeInstallEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(beforeInstallEvent)
      
      // Show prompt after a delay if not dismissed and not installed
      setTimeout(() => {
        if (!isStandaloneMode && !promptDismissed) {
          setShowPrompt(true)
        }
      }, 10000) // Show after 10 seconds
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('🎉 PWA was installed')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [promptDismissed])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS, show manual install instructions
      if (isIOS) {
        setShowPrompt(true)
        return
      }
      return
    }

    try {
      // Show the browser's install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted the install prompt')
        setIsInstalled(true)
      } else {
        console.log('❌ User dismissed the install prompt')
        handleDismiss()
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Install prompt failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setPromptDismissed(true)
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString())
  }

  const handleManualInstall = () => {
    setShowPrompt(true)
  }

  // Don't show if already installed or in standalone mode
  if (isInstalled || isStandalone) {
    return null
  }

  // Don't show if dismissed recently
  if (promptDismissed && !showPrompt) {
    return null
  }

  return (
    <>
      {/* Floating Install Button */}
      {!showPrompt && deferredPrompt && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleManualInstall}
            className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
            size="lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Install App
          </Button>
        </div>
      )}

      {/* Install Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
              
              <CardTitle className="text-xl">Install ASH AI</CardTitle>
              <CardDescription>
                Get the full experience with our mobile app
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Features */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <WifiOff className="h-4 w-4 text-green-600" />
                  <span>Offline Access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span>Faster Loading</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span>Push Notifications</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4 text-purple-600" />
                  <span>Camera Integration</span>
                </div>
              </div>

              {/* iOS Instructions */}
              {isIOS && (
                <Alert>
                  <ArrowDown className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">To install on iOS:</p>
                      <ol className="text-sm space-y-1 list-decimal list-inside">
                        <li>Tap the Share button in Safari</li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" to confirm</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Install Buttons */}
              <div className="flex gap-3">
                {!isIOS && deferredPrompt && (
                  <Button 
                    onClick={handleInstallClick}
                    className="flex-1"
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Install Now
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  className={isIOS ? "flex-1" : ""}
                  size="lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  {isIOS ? 'Got it' : 'Maybe Later'}
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span>5-Star Rated</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  <span>Works Offline</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default PWAInstallPrompt