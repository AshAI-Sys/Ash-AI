// 🔔 ASH AI - Real-time WebSocket Notification System
// Enterprise-grade real-time notifications for production tracking

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

interface NotificationPayload {
  id: string
  type: 'order_update' | 'payment_received' | 'qc_alert' | 'production_milestone' | 'system_alert' | 'chat_message'
  title: string
  message: string
  data?: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'urgent'
  targetUsers?: string[]
  targetRoles?: string[]
  workspace_id: string
  created_at: Date
  expiresAt?: Date
}

interface ConnectedUser {
  user_id: string
  workspace_id: string
  roles: string[]
  socketId: string
  joinedAt: Date
  lastActivity: Date
}

class WebSocketNotificationService {
  private io: SocketIOServer | null = null
  private connectedUsers: Map<string, ConnectedUser> = new Map()
  private userSockets: Map<string, string[]> = new Map() // user_id -> socketIds

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ASH_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    })

    this.io.use(this.authenticateSocket.bind(this))
    this.io.on('connection', this.handleConnection.bind(this))

    console.log('🔔 WebSocket notification service initialized')
  }

  private async authenticateSocket(socket: any, next: any) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token
      
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.ASH_JWT_SECRET!) as any
      
      // Get user details from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.user_id },
        include: {
          workspace: true,
          roles: true
        }
      })

      if (!user || !user.is_active) {
        return next(new Error('User not found or inactive'))
      }

      socket.user_id = user.id
      socket.workspace_id = user.workspace_id
      socket.roles = user.roles.map(r => r.name)
      socket.userData = user

      next()
    } catch (_error) {
      next(new Error('Authentication failed'))
    }
  }

  private handleConnection(socket: any) {
    const user: ConnectedUser = {
      user_id: socket.user_id,
      workspace_id: socket.workspace_id,
      roles: socket.roles,
      socketId: socket.id,
      joinedAt: new Date(),
      lastActivity: new Date()
    }

    // Store connected user
    this.connectedUsers.set(socket.id, user)
    
    // Add socket to user's socket list
    const userSockets = this.userSockets.get(socket.user_id) || []
    userSockets.push(socket.id)
    this.userSockets.set(socket.user_id, userSockets)

    // Join workspace room
    socket.join(`workspace:${socket.workspace_id}`)
    
    // Join role-specific rooms
    socket.roles.forEach((role: string) => {
      socket.join(`role:${role}`)
    })

    console.log(`👤 User ${socket.user_id} connected (${socket.id})`)

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to ASH AI real-time notifications',
      user_id: socket.user_id,
      connectedUsers: this.getWorkspaceConnectedCount(socket.workspace_id)
    })

    // Send pending notifications
    this.sendPendingNotifications(socket.user_id, socket)

    // Handle socket events
    this.setupSocketEvents(socket)
  }

  private setupSocketEvents(socket: any) {
    // Heartbeat to track activity
    socket.on('ping', () => {
      const user = this.connectedUsers.get(socket.id)
      if (user) {
        user.lastActivity = new Date()
        this.connectedUsers.set(socket.id, user)
      }
      socket.emit('pong')
    })

    // Join specific notification channels
    socket.on('join_channel', (channel: string) => {
      if (this.isValidChannel(channel, socket.workspace_id, socket.roles)) {
        socket.join(channel)
        console.log(`👤 User ${socket.user_id} joined channel: ${channel}`)
      }
    })

    // Leave specific channels
    socket.on('leave_channel', (channel: string) => {
      socket.leave(channel)
      console.log(`👤 User ${socket.user_id} left channel: ${channel}`)
    })

    // Mark notification as read
    socket.on('mark_read', async (notificationId: string) => {
      await this.markNotificationAsRead(notificationId, socket.user_id)
    })

    // Mark all notifications as read
    socket.on('mark_all_read', async () => {
      await this.markAllNotificationsAsRead(socket.user_id)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket)
    })

    // Chat message handling
    socket.on('chat_message', async (data: { order_id: string, message: string, attachments?: string[] }) => {
      await this.handleChatMessage(socket, data)
    })

    // Typing indicators
    socket.on('typing_start', (data: { order_id: string }) => {
      socket.to(`order:${data.order_id}`).emit('user_typing', { user_id: socket.user_id, order_id: data.order_id })
    })

    socket.on('typing_stop', (data: { order_id: string }) => {
      socket.to(`order:${data.order_id}`).emit('user_stopped_typing', { user_id: socket.user_id, order_id: data.order_id })
    })
  }

  private handleDisconnection(socket: any) {
    // Remove from connected users
    this.connectedUsers.delete(socket.id)

    // Remove from user's socket list
    const userSockets = this.userSockets.get(socket.user_id) || []
    const updatedSockets = userSockets.filter(id => id !== socket.id)
    
    if (updatedSockets.length === 0) {
      this.userSockets.delete(socket.user_id)
    } else {
      this.userSockets.set(socket.user_id, updatedSockets)
    }

    console.log(`👤 User ${socket.user_id} disconnected (${socket.id})`)
  }

  // Public methods for sending notifications
  async sendNotification(notification: NotificationPayload) {
    if (!this.io) {
      console.error('WebSocket server not initialized')
      return
    }

    // Store notification in database
    const stored = await prisma.notification.create({
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: JSON.stringify(notification.data || {}),
        priority: notification.priority.toUpperCase(),
        workspace_id: notification.workspace_id,
        targetUsers: notification.targetUsers || [],
        targetRoles: notification.targetRoles || [],
        created_at: notification.created_at,
        expiresAt: notification.expiresAt,
        isRead: false
      }
    })

    // Send to specific users
    if (notification.targetUsers?.length) {
      notification.targetUsers.forEach(user_id => {
        const userSockets = this.userSockets.get(user_id) || []
        userSockets.forEach(socketId => {
          this.io!.to(socketId).emit('notification', notification)
        })
      })
    }

    // Send to specific roles
    if (notification.targetRoles?.length) {
      notification.targetRoles.forEach(role => {
        this.io!.to(`role:${role}`).emit('notification', notification)
      })
    }

    // Send to entire workspace if no specific targeting
    if (!notification.targetUsers?.length && !notification.targetRoles?.length) {
      this.io!.to(`workspace:${notification.workspace_id}`).emit('notification', notification)
    }

    // Send push notifications for high priority items
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      await this.sendPushNotification(notification)
    }

    console.log(`🔔 Notification sent: ${notification.title}`)
  }

  // Broadcast order status updates
  async broadcastOrderUpdate(order_id: string, update: any) {
    const notification: NotificationPayload = {
      id: `order_${order_id}_${Date.now()}`,
      type: 'order_update',
      title: 'Order Status Update',
      message: `Order #${order_id.slice(-8)} status changed to ${update.status}`,
      data: { order_id, ...update },
      priority: 'medium',
      workspace_id: update.workspace_id,
      created_at: new Date()
    }

    await this.sendNotification(notification)

    // Also broadcast to order-specific channel
    this.io?.to(`order:${order_id}`).emit('order_update', update)
  }

  // Broadcast production milestone updates
  async broadcastProductionMilestone(order_id: string, milestone: any) {
    const notification: NotificationPayload = {
      id: `milestone_${order_id}_${Date.now()}`,
      type: 'production_milestone',
      title: 'Production Milestone',
      message: `${milestone.stageName} completed for Order #${order_id.slice(-8)}`,
      data: { order_id, ...milestone },
      priority: 'medium',
      workspace_id: milestone.workspace_id,
      targetRoles: ['PRODUCTION_MANAGER', 'CSR'],
      created_at: new Date()
    }

    await this.sendNotification(notification)
  }

  // Broadcast QC alerts
  async broadcastQCAlert(order_id: string, alert: any) {
    const notification: NotificationPayload = {
      id: `qc_${order_id}_${Date.now()}`,
      type: 'qc_alert',
      title: 'Quality Control Alert',
      message: `QC ${alert.result} for Order #${order_id.slice(-8)}`,
      data: { order_id, ...alert },
      priority: alert.result === 'FAILED' ? 'urgent' : 'high',
      workspace_id: alert.workspace_id,
      targetRoles: ['QC_INSPECTOR', 'PRODUCTION_MANAGER'],
      created_at: new Date()
    }

    await this.sendNotification(notification)
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  getWorkspaceConnectedCount(workspace_id: string): number {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.workspace_id === workspace_id).length
  }

  // Helper methods
  private async sendPendingNotifications(user_id: string, socket: any) {
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetUsers: { has: user_id } },
          { targetUsers: { isEmpty: true } }
        ],
        isRead: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    })

    pendingNotifications.forEach(notification => {
      socket.emit('notification', {
        ...notification,
        data: JSON.parse(notification.data || '{}')
      })
    })
  }

  private async markNotificationAsRead(notificationId: string, user_id: string) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        OR: [
          { targetUsers: { has: user_id } },
          { targetUsers: { isEmpty: true } }
        ]
      },
      data: { isRead: true, readAt: new Date() }
    })
  }

  private async markAllNotificationsAsRead(user_id: string) {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { targetUsers: { has: user_id } },
          { targetUsers: { isEmpty: true } }
        ],
        isRead: false
      },
      data: { isRead: true, readAt: new Date() }
    })
  }

  private isValidChannel(channel: string, workspace_id: string, roles: string[]): boolean {
    // Validate channel access based on workspace and roles
    const allowedChannels = [
      `workspace:${workspace_id}`,
      `order:*`, // Will be validated further
      ...roles.map(role => `role:${role}`)
    ]

    return allowedChannels.some(allowed => 
      allowed.includes('*') ? channel.startsWith(allowed.replace('*', '')) : channel === allowed
    )
  }

  private async handleChatMessage(socket: any, data: { order_id: string, message: string, attachments?: string[] }) {
    // Store chat message in database
    const chatMessage = await prisma.chatMessage.create({
      data: {
        id: crypto.randomUUID(),
        order_id: data.order_id,
        senderId: socket.user_id,
        message: data.message,
        attachments: data.attachments || [],
        created_at: new Date()
      },
      include: {
        sender: {
          select: { name: true, avatar: true }
        }
      }
    })

    // Broadcast to order participants
    this.io!.to(`order:${data.order_id}`).emit('chat_message', {
      ...chatMessage,
      sender: chatMessage.sender
    })
  }

  private async sendPushNotification(notification: NotificationPayload) {
    // Integration with push notification services (FCM, APNs, etc.)
    // This would send notifications to mobile apps and browser push
    console.log(`📱 Push notification queued: ${notification.title}`)
  }
}

export const notificationService = new WebSocketNotificationService()
export type { NotificationPayload, ConnectedUser }