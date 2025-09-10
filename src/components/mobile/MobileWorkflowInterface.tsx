'use client'

// 📱 ASH AI - Advanced Mobile Workflow Interface
// Optimized mobile interface for manufacturing workflows

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Scissors,
  Palette,
  Users,
  Target,
  Truck,
  Wifi,
  WifiOff,
  RefreshCw,
  Upload,
  Download,
  Mic,
  MicOff,
  Vibrate,
  Save,
  RotateCcw,
  AlertTriangle
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { offlineSyncManager } from '@/lib/pwa/offline-sync'

interface WorkflowStage {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  progress: number
  icon: any
  tasks: WorkflowTask[]
}

interface WorkflowTask {
  id: string
  title: string
  description: string
  type: 'scan' | 'photo' | 'form' | 'approval' | 'measurement'
  required: boolean
  completed: boolean
  data?: any
}

interface MobileWorkflowProps {
  order_id: string
  workflowType: 'cutting' | 'printing' | 'sewing' | 'qc' | 'packing'
  className?: string
}

export function MobileWorkflowInterface({ order_id, workflowType, className }: MobileWorkflowProps) {
  const { data: session } = useSession()
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [currentStage, setCurrentStage] = useState<string>('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isLoading, setIsLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncStatus, setSyncStatus] = useState('')
  const [pendingChanges, setPendingChanges] = useState(0)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    initializeMobileFeatures()
    loadWorkflowData()
    setupOfflineSync()
    
    // Monitor online/offline status
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [order_id, workflowType])

  const initializeMobileFeatures = async () => {
    // Initialize PWA features
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js')
        console.log('📱 Service Worker registered')
      } catch (error) {
        console.error('SW registration failed:', error)
      }
    }

    // Enable vibration for feedback
    if ('vibrate' in navigator) {
      console.log('📳 Vibration API available')
    }

    // Request camera permissions
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      console.log('📷 Camera permission granted')
    } catch (error) {
      console.log('📷 Camera permission denied')
    }
  }

  const setupOfflineSync = () => {
    offlineSyncManager.onSyncProgress((progress, status) => {
      setSyncProgress(progress)
      setSyncStatus(status)
    })

    // Get pending changes count
    offlineSyncManager.getData('sync_queue').then(queue => {
      setPendingChanges(queue.length)
    })
  }

  const loadWorkflowData = async () => {
    setIsLoading(true)
    
    try {
      let data
      
      if (isOnline) {
        // Try to fetch from server
        const response = await fetch(`/api/workflows/${workflowType}/${order_id}`)
        if (response.ok) {
          data = await response.json()
          // Cache the data offline
          await offlineSyncManager.storeData('workflows', data)
        } else {
          throw new Error('Failed to fetch from server')
        }
      } else {
        // Load from offline storage
        const offlineData = await offlineSyncManager.getData('workflows', { order_id, type: workflowType })
        data = offlineData[0] || getDefaultWorkflowData()
      }

      setStages(data.stages || getDefaultStages())
      setCurrentStage(data.currentStage || data.stages?.[0]?.id || '')
      
    } catch (error) {
      console.error('Failed to load workflow data:', error)
      
      // Use default data if everything fails
      const defaultStages = getDefaultStages()
      setStages(defaultStages)
      setCurrentStage(defaultStages[0]?.id || '')
      
      toast.error('Failed to load workflow data. Using offline mode.')
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultStages = (): WorkflowStage[] => {
    const stageConfigs = {
      cutting: [
        { id: 'lay-planning', name: 'Lay Planning', icon: Scissors },
        { id: 'cutting', name: 'Cutting', icon: Scissors },
        { id: 'bundle-tracking', name: 'Bundle Tracking', icon: Package }
      ],
      printing: [
        { id: 'setup', name: 'Print Setup', icon: Palette },
        { id: 'printing', name: 'Printing', icon: Palette },
        { id: 'quality-check', name: 'Quality Check', icon: Target }
      ],
      sewing: [
        { id: 'preparation', name: 'Preparation', icon: Users },
        { id: 'sewing', name: 'Sewing Operations', icon: Users },
        { id: 'finishing', name: 'Finishing', icon: CheckCircle }
      ],
      qc: [
        { id: 'inspection', name: 'Inspection', icon: Target },
        { id: 'testing', name: 'Testing', icon: Target },
        { id: 'approval', name: 'Final Approval', icon: CheckCircle }
      ],
      packing: [
        { id: 'sorting', name: 'Sorting', icon: Package },
        { id: 'packing', name: 'Packing', icon: Package },
        { id: 'shipping', name: 'Shipping Prep', icon: Truck }
      ]
    }

    return (stageConfigs[workflowType] || []).map(stage => ({
      ...stage,
      status: 'pending' as const,
      progress: 0,
      tasks: getDefaultTasks(stage.id)
    }))
  }

  const getDefaultTasks = (stageId: string): WorkflowTask[] => {
    const taskConfigs = {
      'lay-planning': [
        { id: 'scan-fabric', title: 'Scan Fabric Roll', type: 'scan', required: true },
        { id: 'measure-fabric', title: 'Measure Fabric', type: 'measurement', required: true },
        { id: 'photo-lay', title: 'Photo of Lay Plan', type: 'photo', required: false }
      ],
      'cutting': [
        { id: 'scan-marker', title: 'Scan Cut Marker', type: 'scan', required: true },
        { id: 'cut-pieces', title: 'Cut Fabric Pieces', type: 'form', required: true },
        { id: 'bundle-pieces', title: 'Bundle Cut Pieces', type: 'form', required: true }
      ],
      'printing': [
        { id: 'setup-machine', title: 'Setup Print Machine', type: 'form', required: true },
        { id: 'test-print', title: 'Test Print Quality', type: 'photo', required: true },
        { id: 'production-run', title: 'Production Run', type: 'form', required: true }
      ],
      'qc': [
        { id: 'visual-inspection', title: 'Visual Inspection', type: 'form', required: true },
        { id: 'measurement-check', title: 'Measurement Check', type: 'measurement', required: true },
        { id: 'defect-photos', title: 'Defect Photos', type: 'photo', required: false }
      ]
    }

    return (taskConfigs[stageId] || []).map(task => ({
      ...task,
      description: `Complete ${task.title.toLowerCase()} for order ${order_id}`,
      completed: false
    }))
  }

  const getDefaultWorkflowData = () => ({
    order_id,
    type: workflowType,
    stages: getDefaultStages(),
    currentStage: '',
    updated_at: new Date()
  })

  const handleOnline = () => {
    setIsOnline(true)
    toast.success('📶 Connection restored - syncing data...')
    offlineSyncManager.syncWithServer()
  }

  const handleOffline = () => {
    setIsOnline(false)
    toast.info('📵 Working offline - changes will sync when online')
  }

  const handleTaskComplete = async (stageId: string, taskId: string, data?: any) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }

    const updatedStages = stages.map(stage => {
      if (stage.id === stageId) {
        const updatedTasks = stage.tasks.map(task => 
          task.id === taskId ? { ...task, completed: true, data } : task
        )
        
        const completedTasks = updatedTasks.filter(t => t.completed).length
        const progress = Math.round((completedTasks / updatedTasks.length) * 100)
        
        return {
          ...stage,
          tasks: updatedTasks,
          progress,
          status: progress === 100 ? 'completed' as const : 'in_progress' as const
        }
      }
      return stage
    })

    setStages(updatedStages)

    // Store the change for sync
    const changeData = {
      order_id,
      workflowType,
      stageId,
      taskId,
      completed: true,
      data,
      timestamp: new Date()
    }

    try {
      await offlineSyncManager.storeData('workflow_tasks', changeData, 'UPDATE')
      setPendingChanges(prev => prev + 1)
      
      toast.success('✅ Task completed', {
        description: isOnline ? 'Synced to server' : 'Saved offline'
      })
    } catch (error) {
      console.error('Failed to save task completion:', error)
      toast.error('Failed to save task completion')
    }
  }

  const handleScanQR = async (taskId: string) => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      setCameraStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      // In a real implementation, you'd use a QR code scanning library
      toast.info('📱 QR Scanner activated', {
        description: 'Point camera at QR code'
      })
      
    } catch (error) {
      console.error('Camera access failed:', error)
      toast.error('Camera access required for QR scanning')
    }
  }

  const handlePhotoCapture = async (taskId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      setCameraStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      toast.info('📷 Camera activated', {
        description: 'Tap to capture photo'
      })
      
    } catch (error) {
      console.error('Camera access failed:', error)
      toast.error('Camera access required for photos')
    }
  }

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input not supported')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsVoiceEnabled(true)
      toast.info('🎤 Listening...', { description: 'Speak now' })
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      toast.success('Voice captured', { description: transcript })
    }

    recognition.onerror = () => {
      setIsVoiceEnabled(false)
      toast.error('Voice input failed')
    }

    recognition.onend = () => {
      setIsVoiceEnabled(false)
    }

    recognition.start()
  }

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast.error('Sync requires internet connection')
      return
    }

    try {
      await offlineSyncManager.syncWithServer()
      setPendingChanges(0)
      toast.success('✅ Sync completed')
    } catch (error) {
      toast.error('Sync failed')
    }
  }

  const renderTask = (task: WorkflowTask, stageId: string) => (
    <Card key={task.id} className={`mb-3 ${task.completed ? 'bg-green-50 border-green-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {task.completed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
            <span className="font-medium">{task.title}</span>
            {task.required && <Badge variant="outline" className="text-xs">Required</Badge>}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
        
        {!task.completed && (
          <div className="flex flex-wrap gap-2">
            {task.type === 'scan' && (
              <Button
                size="sm"
                onClick={() => handleScanQR(task.id)}
                className="flex items-center gap-1"
              >
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
            )}
            
            {task.type === 'photo' && (
              <Button
                size="sm"
                onClick={() => handlePhotoCapture(task.id)}
                className="flex items-center gap-1"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            )}
            
            {task.type === 'form' && (
              <Button
                size="sm"
                onClick={() => handleTaskComplete(stageId, task.id)}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </Button>
            )}
            
            {task.type === 'measurement' && (
              <Button
                size="sm"
                onClick={() => handleTaskComplete(stageId, task.id)}
                className="flex items-center gap-1"
              >
                <Target className="h-4 w-4" />
                Record
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleVoiceInput}
              className="flex items-center gap-1"
            >
              {isVoiceEnabled ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              Voice
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const currentStageData = stages.find(s => s.id === currentStage)

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Status Bar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              Order {order_id} - {workflowType.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {pendingChanges > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendingChanges} pending
              </Badge>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncNow}
              disabled={!isOnline || syncProgress > 0}
            >
              {syncProgress > 0 ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {syncProgress > 0 && (
          <div className="px-3 pb-2">
            <Progress value={syncProgress} className="h-1" />
            <p className="text-xs text-gray-600 mt-1">{syncStatus}</p>
          </div>
        )}
      </div>

      {/* Stage Navigation */}
      <div className="p-3">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const Icon = stage.icon
            return (
              <Button
                key={stage.id}
                variant={currentStage === stage.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentStage(stage.id)}
                className="flex-shrink-0 flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {stage.name}
                {stage.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-600" />}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Current Stage Content */}
      <div className="p-3">
        {currentStageData && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <currentStageData.icon className="h-5 w-5" />
                <CardTitle className="text-lg">{currentStageData.name}</CardTitle>
              </div>
              <CardDescription>
                Progress: {currentStageData.progress}% • {currentStageData.tasks.filter(t => t.completed).length} of {currentStageData.tasks.length} tasks completed
              </CardDescription>
              <Progress value={currentStageData.progress} className="mt-2" />
            </CardHeader>
            
            <CardContent>
              {currentStageData.tasks.map((task) => renderTask(task, currentStageData.id))}
              
              {currentStageData.tasks.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks for this stage</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Camera View (when active) */}
      {cameraStream && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <Button
              size="lg"
              onClick={() => {
                if (cameraStream) {
                  cameraStream.getTracks().forEach(track => track.stop())
                  setCameraStream(null)
                }
              }}
              className="rounded-full w-16 h-16"
            >
              <XCircle className="h-8 w-8" />
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            // Handle photo upload
            toast.success('Photo captured')
          }
        }}
      />
    </div>
  )
}

export default MobileWorkflowInterface