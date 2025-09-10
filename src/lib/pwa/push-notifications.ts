// 🔔 ASH AI - Advanced Push Notification System
// Comprehensive push notification management for PWA

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: { action: string; title: string; icon?: string }[]
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
}


class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BMxD5VpJv7XE-NbV4jUNLG7lP9r5M-hqhKvNq5m3lJ7A8tY1v2d2mN7sW3pK5rB9cV8fG4h6j2l8n9qR1tU3vW5yZ'

  async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('🔔 Service Worker registered for push notifications')

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription()
      
      if (this.subscription) {
        console.log('✅ Already subscribed to push notifications')
        await this.syncSubscriptionWithServer()
      }

    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications')
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    console.log('🔔 Notification permission:', permission)
    return permission
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    const permission = await this.requestPermission()
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    try {
      // Convert VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      console.log('✅ Subscribed to push notifications')

      // Send subscription to server
      await this.syncSubscriptionWithServer()

      return this.subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.subscription) {
      return
    }

    try {
      await this.subscription.unsubscribe()
      console.log('✅ Unsubscribed from push notifications')
      
      // Remove subscription from server
      await this.removeSubscriptionFromServer()
      
      this.subscription = null
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      throw error
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!this.subscription) {
      throw new Error('Not subscribed to push notifications')
    }

    try {
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.subscription,
          payload
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send push notification')
      }

      console.log('✅ Push notification sent')
    } catch (error) {
      console.error('Failed to send push notification:', error)
      throw error
    }
  }

  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    const permission = await this.requestPermission()
    
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    const options: NotificationOptions & { actions?: any; vibrate?: number[] } = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      data: payload.data,
      actions: payload.actions,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      vibrate: payload.vibrate || [200, 100, 200]
    }

    const notification = new Notification(payload.title, options)

    // Auto-close after 5 seconds unless requireInteraction is true
    if (!payload.requireInteraction) {
      setTimeout(() => {
        notification.close()
      }, 5000)
    }

    return new Promise((resolve) => {
      notification.onclick = () => {
        console.log('Notification clicked')
        notification.close()
        resolve()
      }

      notification.onclose = () => {
        resolve()
      }
    })
  }

  // Predefined notification types for ASH AI
  async notifyOrderUpdate(order_id: string, status: string, _details?: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Order Update',
      body: `Order ${order_id} status changed to ${status}`,
      icon: '/icon-192.png',
      data: { type: 'order_update', order_id, status },
      actions: [
        {
          action: 'view',
          title: 'View Order',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ],
      tag: `order_${order_id}`,
      vibrate: [200, 100, 200]
    }

    if (this.subscription) {
      await this.sendNotification(payload)
    } else {
      await this.showLocalNotification(payload)
    }
  }

  async notifyQualityAlert(order_id: string, issue: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Quality Alert',
      body: `Quality issue detected in order ${order_id}: ${issue}`,
      icon: '/icon-192.png',
      data: { type: 'quality_alert', order_id, issue },
      actions: [
        {
          action: 'inspect',
          title: 'Start Inspection',
          icon: '/icons/inspect.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ],
      tag: `quality_${order_id}`,
      requireInteraction: true,
      vibrate: [500, 200, 500, 200, 500]
    }

    if (this.subscription) {
      await this.sendNotification(payload)
    } else {
      await this.showLocalNotification(payload)
    }
  }

  async notifyProductionMilestone(order_id: string, milestone: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Production Milestone',
      body: `${milestone} completed for order ${order_id}`,
      icon: '/icon-192.png',
      data: { type: 'production_milestone', order_id, milestone },
      actions: [
        {
          action: 'view',
          title: 'View Progress',
          icon: '/icons/progress.png'
        }
      ],
      tag: `milestone_${order_id}`,
      vibrate: [100, 50, 100]
    }

    if (this.subscription) {
      await this.sendNotification(payload)
    } else {
      await this.showLocalNotification(payload)
    }
  }

  async notifyInventoryAlert(_item: string, _level: number, _threshold: number): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Inventory Alert',
      body: `${_item} is running low: ${_level} remaining (threshold: ${_threshold})`,
      icon: '/icon-192.png',
      data: { type: 'inventory_alert', item: _item, level: _level, threshold: _threshold },
      actions: [
        {
          action: 'reorder',
          title: 'Create PO',
          icon: '/icons/reorder.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ],
      tag: `inventory_${_item}`,
      requireInteraction: true,
      vibrate: [300, 100, 300]
    }

    if (this.subscription) {
      await this.sendNotification(payload)
    } else {
      await this.showLocalNotification(payload)
    }
  }

  async notifyMaintenanceReminder(equipment: string, task: string, dueDate: Date): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Maintenance Reminder',
      body: `${task} due for ${equipment} on ${dueDate.toLocaleDateString()}`,
      icon: '/icon-192.png',
      data: { type: 'maintenance_reminder', equipment, task, dueDate },
      actions: [
        {
          action: 'schedule',
          title: 'Schedule Now',
          icon: '/icons/schedule.png'
        },
        {
          action: 'snooze',
          title: 'Remind Later',
          icon: '/icons/snooze.png'
        }
      ],
      tag: `maintenance_${equipment}`,
      vibrate: [150, 75, 150]
    }

    if (this.subscription) {
      await this.sendNotification(payload)
    } else {
      await this.showLocalNotification(payload)
    }
  }

  // Utility methods
  private async syncSubscriptionWithServer(): Promise<void> {
    if (!this.subscription) return

    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to sync subscription with server')
      }

      console.log('✅ Subscription synced with server')
    } catch (error) {
      console.error('Failed to sync subscription:', error)
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription?.endpoint
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server')
      }

      console.log('✅ Subscription removed from server')
    } catch (error) {
      console.error('Failed to remove subscription:', error)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  // Public getters
  get isSubscribed(): boolean {
    return this.subscription !== null
  }

  get hasPermission(): boolean {
    return Notification.permission === 'granted'
  }

  get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }
}

// Global instance
export const pushNotificationManager = new PushNotificationManager()

// Initialize when module loads
if (typeof window !== 'undefined') {
  pushNotificationManager.initialize().catch(console.error)
}

export default pushNotificationManager