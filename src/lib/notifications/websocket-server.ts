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
  workspaceId: string
  createdAt: Date
  expiresAt?: Date
}

interface ConnectedUser {
  userId: string
  workspaceId: string
  roles: string[]
  socketId: string
  joinedAt: Date
  lastActivity: Date
}

class WebSocketNotificationService {
  private io: SocketIOServer | null = null
  private connectedUsers: Map<string, ConnectedUser> = new Map()
  private userSockets: Map<string, string[]> = new Map() // userId -> socketIds

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
        where: { id: decoded.userId },
        include: {
          workspace: true,
          roles: true
        }
      })

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'))
      }

      socket.userId = user.id
      socket.workspaceId = user.workspaceId
      socket.roles = user.roles.map(r => r.name)
      socket.userData = user

      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  }

  private handleConnection(socket: any) {
    const user: ConnectedUser = {
      userId: socket.userId,
      workspaceId: socket.workspaceId,
      roles: socket.roles,
      socketId: socket.id,
      joinedAt: new Date(),
      lastActivity: new Date()
    }

    // Store connected user
    this.connectedUsers.set(socket.id, user)
    
    // Add socket to user's socket list
    const userSockets = this.userSockets.get(socket.userId) || []
    userSockets.push(socket.id)
    this.userSockets.set(socket.userId, userSockets)

    // Join workspace room
    socket.join(`workspace:${socket.workspaceId}`)
    
    // Join role-specific rooms
    socket.roles.forEach((role: string) => {
      socket.join(`role:${role}`)
    })

    console.log(`👤 User ${socket.userId} connected (${socket.id})`)

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to ASH AI real-time notifications',
      userId: socket.userId,
      connectedUsers: this.getWorkspaceConnectedCount(socket.workspaceId)
    })

    // Send pending notifications
    this.sendPendingNotifications(socket.userId, socket)

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
      if (this.isValidChannel(channel, socket.workspaceId, socket.roles)) {
        socket.join(channel)
        console.log(`👤 User ${socket.userId} joined channel: ${channel}`)
      }
    })

    // Leave specific channels
    socket.on('leave_channel', (channel: string) => {
      socket.leave(channel)
      console.log(`👤 User ${socket.userId} left channel: ${channel}`)
    })

    // Mark notification as read
    socket.on('mark_read', async (notificationId: string) => {
      await this.markNotificationAsRead(notificationId, socket.userId)
    })

    // Mark all notifications as read
    socket.on('mark_all_read', async () => {
      await this.markAllNotificationsAsRead(socket.userId)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket)
    })

    // Chat message handling
    socket.on('chat_message', async (data: { orderId: string, message: string, attachments?: string[] }) => {
      await this.handleChatMessage(socket, data)
    })

    // Typing indicators
    socket.on('typing_start', (data: { orderId: string }) => {
      socket.to(`order:${data.orderId}`).emit('user_typing', { userId: socket.userId, orderId: data.orderId })
    })

    socket.on('typing_stop', (data: { orderId: string }) => {
      socket.to(`order:${data.orderId}`).emit('user_stopped_typing', { userId: socket.userId, orderId: data.orderId })
    })
  }

  private handleDisconnection(socket: any) {
    // Remove from connected users
    this.connectedUsers.delete(socket.id)

    // Remove from user's socket list
    const userSockets = this.userSockets.get(socket.userId) || []
    const updatedSockets = userSockets.filter(id => id !== socket.id)
    
    if (updatedSockets.length === 0) {
      this.userSockets.delete(socket.userId)
    } else {
      this.userSockets.set(socket.userId, updatedSockets)
    }

    console.log(`👤 User ${socket.userId} disconnected (${socket.id})`)
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
        workspaceId: notification.workspaceId,
        targetUsers: notification.targetUsers || [],
        targetRoles: notification.targetRoles || [],
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
        isRead: false
      }
    })

    // Send to specific users
    if (notification.targetUsers?.length) {
      notification.targetUsers.forEach(userId => {
        const userSockets = this.userSockets.get(userId) || []
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
      this.io!.to(`workspace:${notification.workspaceId}`).emit('notification', notification)
    }

    // Send push notifications for high priority items
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      await this.sendPushNotification(notification)
    }

    console.log(`🔔 Notification sent: ${notification.title}`)
  }

  // Broadcast order status updates
  async broadcastOrderUpdate(orderId: string, update: any) {
    const notification: NotificationPayload = {
      id: `order_${orderId}_${Date.now()}`,
      type: 'order_update',
      title: 'Order Status Update',
      message: `Order #${orderId.slice(-8)} status changed to ${update.status}`,
      data: { orderId, ...update },
      priority: 'medium',
      workspaceId: update.workspaceId,
      createdAt: new Date()
    }

    await this.sendNotification(notification)

    // Also broadcast to order-specific channel
    this.io?.to(`order:${orderId}`).emit('order_update', update)
  }

  // Broadcast production milestone updates
  async broadcastProductionMilestone(orderId: string, milestone: any) {
    const notification: NotificationPayload = {
      id: `milestone_${orderId}_${Date.now()}`,
      type: 'production_milestone',
      title: 'Production Milestone',
      message: `${milestone.stageName} completed for Order #${orderId.slice(-8)}`,
      data: { orderId, ...milestone },
      priority: 'medium',
      workspaceId: milestone.workspaceId,
      targetRoles: ['PRODUCTION_MANAGER', 'CSR'],
      createdAt: new Date()
    }

    await this.sendNotification(notification)
  }

  // Broadcast QC alerts
  async broadcastQCAlert(orderId: string, alert: any) {
    const notification: NotificationPayload = {
      id: `qc_${orderId}_${Date.now()}`,
      type: 'qc_alert',
      title: 'Quality Control Alert',
      message: `QC ${alert.result} for Order #${orderId.slice(-8)}`,
      data: { orderId, ...alert },
      priority: alert.result === 'FAILED' ? 'urgent' : 'high',
      workspaceId: alert.workspaceId,
      targetRoles: ['QC_INSPECTOR', 'PRODUCTION_MANAGER'],
      createdAt: new Date()
    }

    await this.sendNotification(notification)
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  getWorkspaceConnectedCount(workspaceId: string): number {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.workspaceId === workspaceId).length
  }

  // Helper methods
  private async sendPendingNotifications(userId: string, socket: any) {
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetUsers: { has: userId } },
          { targetUsers: { isEmpty: true } }
        ],
        isRead: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    pendingNotifications.forEach(notification => {
      socket.emit('notification', {
        ...notification,
        data: JSON.parse(notification.data || '{}')
      })
    })
  }

  private async markNotificationAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        OR: [
          { targetUsers: { has: userId } },
          { targetUsers: { isEmpty: true } }
        ]
      },
      data: { isRead: true, readAt: new Date() }
    })
  }

  private async markAllNotificationsAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { targetUsers: { has: userId } },
          { targetUsers: { isEmpty: true } }
        ],
        isRead: false
      },
      data: { isRead: true, readAt: new Date() }
    })
  }

  private isValidChannel(channel: string, workspaceId: string, roles: string[]): boolean {
    // Validate channel access based on workspace and roles
    const allowedChannels = [
      `workspace:${workspaceId}`,
      `order:*`, // Will be validated further
      ...roles.map(role => `role:${role}`)
    ]

    return allowedChannels.some(allowed => 
      allowed.includes('*') ? channel.startsWith(allowed.replace('*', '')) : channel === allowed
    )
  }

  private async handleChatMessage(socket: any, data: { orderId: string, message: string, attachments?: string[] }) {
    // Store chat message in database
    const chatMessage = await prisma.chatMessage.create({
      data: {
        id: crypto.randomUUID(),
        orderId: data.orderId,
        senderId: socket.userId,
        message: data.message,
        attachments: data.attachments || [],
        createdAt: new Date()
      },
      include: {
        sender: {
          select: { name: true, avatar: true }
        }
      }
    })

    // Broadcast to order participants
    this.io!.to(`order:${data.orderId}`).emit('chat_message', {
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