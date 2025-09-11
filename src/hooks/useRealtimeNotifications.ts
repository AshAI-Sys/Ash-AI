'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

export interface RealtimeNotification {
  id: string
  type: string
  message: string
  data: any
  timestamp: string
  priority: 'low' | 'normal' | 'high'
  channel?: string
  order_id?: string
  read?: boolean
}

export interface RealtimeConnectionStatus {
  connected: boolean
  reconnecting: boolean
  lastHeartbeat: Date | null
  connectionCount: number
}

export function useRealtimeNotifications(channel: string = 'general') {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    connected: false,
    reconnecting: false,
    lastHeartbeat: null,
    connectionCount: 0
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Connect to real-time updates
  const connect = useCallback(() => {
    if (!session?.user) return

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionStatus(prev => ({ 
      ...prev, 
      reconnecting: true 
    }))

    try {
      // Create authentication token for WebSocket connection
      const token = btoa(JSON.stringify({
        user_id: session.user.id,
        timestamp: Date.now()
      }))

      const url = `/api/websocket?channel=${encodeURIComponent(channel)}&token=${encodeURIComponent(token)}`
      const eventSource = new EventSource(url)

      eventSource.onopen = () => {
        console.log('📡 Real-time connection established')
        setConnectionStatus(prev => ({
          ...prev,
          connected: true,
          reconnecting: false,
          connectionCount: prev.connectionCount + 1
        }))
        connectionAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'heartbeat') {
            setConnectionStatus(prev => ({
              ...prev,
              lastHeartbeat: new Date()
            }))
            return
          }

          if (data.type === 'connection') {
            console.log('📡 Real-time connection confirmed:', data.message)
            return
          }

          // Handle actual notifications
          if (data.type && data.message) {
            const notification: RealtimeNotification = {
              id: data.id || `notif_${Date.now()}`,
              type: data.type,
              message: data.message,
              data: data.data || {},
              timestamp: data.timestamp || new Date().toISOString(),
              priority: data.priority || 'normal',
              channel: data.channel,
              order_id: data.order_id,
              read: false
            }

            setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50 notifications

            // Show browser notification for high priority items
            if (notification.priority === 'high' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(`ASH AI - ${notification.type.replace('_', ' ').toUpperCase()}`, {
                  body: notification.message,
                  icon: '/icon-192x192.png',
                  tag: notification.id
                })
              }
            }

            console.log('🔔 Real-time notification received:', notification)
          }
        } catch (error) {
          console.error('Error parsing real-time message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('📡 Real-time connection error:', error)
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          reconnecting: false
        }))

        // Attempt to reconnect with exponential backoff
        if (connectionAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttemptsRef.current), 30000)
          console.log(`📡 Reconnecting in ${delay}ms (attempt ${connectionAttemptsRef.current + 1}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectionAttemptsRef.current++
            connect()
          }, delay)
        } else {
          console.error('📡 Max reconnection attempts reached')
        }
      }

      eventSourceRef.current = eventSource

    } catch (error) {
      console.error('Failed to establish real-time connection:', error)
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: false
      }))
    }
  }, [session, channel])

  // Disconnect from real-time updates
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setConnectionStatus({
      connected: false,
      reconnecting: false,
      lastHeartbeat: null,
      connectionCount: 0
    })
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
  }, [])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Send a notification (for admin/system use)
  const sendNotification = useCallback(async (notification: Partial<RealtimeNotification>) => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          type: notification.type,
          message: notification.message,
          data: notification.data,
          target_user_id: notification.data?.target_user_id,
          target_client_id: notification.data?.target_client_id,
          order_id: notification.order_id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send notification')
      }

      const result = await response.json()
      console.log('📤 Notification sent successfully:', result)
      return result
    } catch (error) {
      console.error('Failed to send notification:', error)
      throw error
    }
  }, [channel])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }, [])

  // Connect on mount and when session changes
  useEffect(() => {
    if (session?.user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [session, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    notifications,
    connectionStatus,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    sendNotification,
    requestNotificationPermission
  }
}