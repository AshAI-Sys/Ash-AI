// @ts-nocheck
'use client'

// 🔔 ASH AI - Real-time Notification Center
// Live notifications with WebSocket integration

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  X, 
  Package, 
  CreditCard, 
  AlertTriangle, 
  Settings,
  MessageCircle,
  TrendingUp,
  Clock
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: 'order_update' | 'payment_received' | 'qc_alert' | 'production_milestone' | 'system_alert' | 'chat_message'
  title: string
  message: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: Date
  isRead: boolean
  readAt?: Date
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    // Initialize WebSocket connection
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000', {
      auth: {
        token: session.accessToken || session.user.id // Use proper JWT token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true)
      setConnectionStatus('connected')
      console.log('🔔 Connected to notification service')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
      console.log('🔔 Disconnected from notification service')
    })

    socket.on('connect_error', (error) => {
      setConnectionStatus('disconnected')
      console.error('WebSocket connection error:', error)
    })

    // Notification event handlers
    socket.on('notification', (notification: Notification) => {
      handleNewNotification(notification)
    })

    socket.on('order_update', (update: any) => {
      handleOrderUpdate(update)
    })

    socket.on('chat_message', (message: any) => {
      handleChatMessage(message)
    })

    // Load existing notifications
    loadNotifications()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [session])

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)]) // Keep max 100 notifications
    
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1)
    }

    // Show toast for important notifications
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      toast(notification.title, {
        description: notification.message,
        action: {
          label: 'View',
          onClick: () => handleNotificationClick(notification)
        },
        duration: notification.priority === 'urgent' ? 10000 : 5000
      })
    }

    // Play notification sound
    playNotificationSound(notification.priority)
  }

  const handleOrderUpdate = (update: any) => {
    // Handle specific order updates
    toast.success('Order Update', {
      description: `Order status changed to ${update.status}`,
      action: {
        label: 'View Order',
        onClick: () => window.open(`/orders/${update.order_id}`, '_blank')
      }
    })
  }

  const handleChatMessage = (message: any) => {
    // Handle chat messages
    if (message.senderId !== session?.user?.id) {
      toast.info('New Message', {
        description: `${message.sender.name}: ${message.message.slice(0, 50)}...`,
        action: {
          label: 'Reply',
          onClick: () => window.open(`/orders/${message.order_id}#chat`, '_blank')
        }
      })
    }
  }

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      })

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n)
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Emit to WebSocket
      socketRef.current?.emit('mark_read', notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      })

      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
      )
      
      setUnreadCount(0)

      // Emit to WebSocket
      socketRef.current?.emit('mark_all_read')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'order_update':
        window.open(`/orders/${notification.data?.order_id}`, '_blank')
        break
      case 'payment_received':
        window.open(`/finance/payments/${notification.data?.paymentId}`, '_blank')
        break
      case 'qc_alert':
        window.open(`/qc/inspections/${notification.data?.inspectionId}`, '_blank')
        break
      case 'production_milestone':
        window.open(`/production/tracking/${notification.data?.order_id}`, '_blank')
        break
      case 'chat_message':
        window.open(`/orders/${notification.data?.order_id}#chat`, '_blank')
        break
      default:
        // Generic notification, no specific navigation
        break
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    const iconProps = { 
      className: `h-4 w-4 ${
        priority === 'urgent' ? 'text-red-500' : 
        priority === 'high' ? 'text-orange-500' : 
        priority === 'medium' ? 'text-blue-500' : 'text-gray-500'
      }` 
    }

    switch (type) {
      case 'order_update':
        return <Package {...iconProps} />
      case 'payment_received':
        return <CreditCard {...iconProps} />
      case 'qc_alert':
        return <AlertTriangle {...iconProps} />
      case 'production_milestone':
        return <TrendingUp {...iconProps} />
      case 'chat_message':
        return <MessageCircle {...iconProps} />
      case 'system_alert':
        return <Settings {...iconProps} />
      default:
        return <Bell {...iconProps} />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'destructive',
      high: 'orange',
      medium: 'default',
      low: 'secondary'
    } as const

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const playNotificationSound = (priority: string) => {
    if ('speechSynthesis' in window) {
      // Use different sounds based on priority
      const audio = new Audio(
        priority === 'urgent' ? '/sounds/urgent.wav' :
        priority === 'high' ? '/sounds/high.wav' : 
        '/sounds/notification.wav'
      )
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore play errors
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isConnected ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5 text-gray-400" />
        )}
        
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
            variant="destructive"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 max-w-sm shadow-lg border z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <div className="flex justify-between items-center">
                <CardDescription>
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm leading-tight">
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-1">
                                {getPriorityBadge(notification.priority)}
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsRead(notification.id)
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {index < notifications.length - 1 && (
                        <Separator className="ml-10" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NotificationCenter