'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  WifiOff, 
  RefreshCw, 
  Package, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Home,
  Smartphone
} from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Offline Status */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl text-orange-800">You're Offline</CardTitle>
            <CardDescription className="text-orange-700">
              No internet connection detected. Some features may be limited.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>

        {/* Available Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Offline</CardTitle>
            <CardDescription>
              These features work without internet connection
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-800">View Cached Orders</div>
                <div className="text-sm text-green-700">Previously loaded order data</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-800">Production Tracking</div>
                <div className="text-sm text-green-700">Track work progress offline</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-800">QC Inspections</div>
                <div className="text-sm text-green-700">Complete inspections, sync later</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-800">Inventory Updates</div>
                <div className="text-sm text-green-700">Log changes, sync when online</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limited Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Limited Offline</CardTitle>
            <CardDescription>
              These features require internet connection
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-700">Real-time Updates</div>
                <div className="text-sm text-gray-600">Live notifications disabled</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-700">AI Assistant</div>
                <div className="text-sm text-gray-600">Ashley AI unavailable</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-700">New Orders</div>
                <div className="text-sm text-gray-600">Cannot create new orders</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-700">File Uploads</div>
                <div className="text-sm text-gray-600">Photos and documents</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Information */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your changes are being saved locally and will automatically sync when you're back online.
          </AlertDescription>
        </Alert>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.location.href = '/dashboard'}
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.location.href = '/mobile-workflow'}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile View
          </Button>
        </div>

        {/* Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-medium text-blue-800 mb-2">💡 Offline Tips</div>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Complete pending tasks to reduce sync time</li>
                <li>• Take photos for later upload</li>
                <li>• Use voice notes for complex information</li>
                <li>• Check back periodically for connection</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}