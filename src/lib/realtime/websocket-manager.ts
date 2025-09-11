import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextApiRequest } from 'next'
import Redis from 'ioredis'

export interface ProductionUpdate {
  orderId: string
  workcenterId: string
  status: string
  progress: number
  timestamp: Date
  operatorId?: string
}

export interface MachineUpdate {
  machineId: string
  status: 'running' | 'idle' | 'maintenance' | 'error'
  utilization: number
  temperature?: number
  speed?: number
  lastUpdate: Date
}

export interface InventoryUpdate {
  itemId: string
  sku: string
  currentStock: number
  consumed: number
  location: string
  timestamp: Date
}

export interface AlertUpdate {
  id: string
  type: 'bottleneck' | 'quality' | 'machine' | 'inventory' | 'delay'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  orderId?: string
  machineId?: string
  timestamp: Date
}

class WebSocketManager {
  private static instance: WebSocketManager
  private io: SocketIOServer | null = null
  private redis: Redis
  private connectedUsers = new Map<string, { userId: string, role: string }>()

  private constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  initialize(server: HTTPServer) {
    if (this.io) return this.io

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [process.env.NEXTAUTH_URL!] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupEventHandlers()
    return this.io
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('authenticate', (data: { userId: string, token: string, role: string }) => {
        // In production, verify the token
        this.connectedUsers.set(socket.id, { 
          userId: data.userId, 
          role: data.role 
        })
        
        // Join role-based rooms
        socket.join(`role:${data.role}`)
        socket.join(`user:${data.userId}`)
        
        console.log(`User ${data.userId} authenticated with role ${data.role}`)
        
        // Send initial data
        this.sendInitialData(socket, data.role)
      })

      socket.on('subscribe:production', (orderId: string) => {
        socket.join(`order:${orderId}`)
      })

      socket.on('subscribe:machine', (machineId: string) => {
        socket.join(`machine:${machineId}`)
      })

      socket.on('subscribe:inventory', () => {
        socket.join('inventory:updates')
      })

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id)
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  private async sendInitialData(socket: any, role: string) {
    try {
      // Send cached real-time data based on role
      const productionData = await this.redis.get('realtime:production')
      const machineData = await this.redis.get('realtime:machines')
      const inventoryData = await this.redis.get('realtime:inventory')

      if (productionData) {
        socket.emit('production:initial', JSON.parse(productionData))
      }

      if (machineData && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(role)) {
        socket.emit('machines:initial', JSON.parse(machineData))
      }

      if (inventoryData && ['ADMIN', 'MANAGER', 'WAREHOUSE', 'WAREHOUSE_STAFF'].includes(role)) {
        socket.emit('inventory:initial', JSON.parse(inventoryData))
      }
    } catch (error) {
      console.error('Error sending initial data:', error)
    }
  }

  // Production Updates
  async broadcastProductionUpdate(update: ProductionUpdate) {
    if (!this.io) return

    // Cache the update
    await this.redis.setex(
      `production:${update.orderId}:${update.workcenterId}`,
      300, // 5 minutes TTL
      JSON.stringify(update)
    )

    // Update production summary cache
    await this.updateProductionSummary(update)

    // Broadcast to relevant rooms
    this.io.to(`order:${update.orderId}`).emit('production:update', update)
    this.io.to('role:ADMIN').emit('production:update', update)
    this.io.to('role:MANAGER').emit('production:update', update)
    
    console.log('Production update broadcasted:', update.orderId)
  }

  // Machine Updates
  async broadcastMachineUpdate(update: MachineUpdate) {
    if (!this.io) return

    // Cache the update
    await this.redis.setex(
      `machine:${update.machineId}`,
      60, // 1 minute TTL
      JSON.stringify(update)
    )

    // Update machine summary cache
    await this.updateMachineSummary(update)

    // Broadcast to relevant rooms
    this.io.to(`machine:${update.machineId}`).emit('machine:update', update)
    this.io.to('role:ADMIN').emit('machine:update', update)
    this.io.to('role:MANAGER').emit('machine:update', update)
    this.io.to('role:OPERATOR').emit('machine:update', update)
    
    console.log('Machine update broadcasted:', update.machineId)
  }

  // Inventory Updates
  async broadcastInventoryUpdate(update: InventoryUpdate) {
    if (!this.io) return

    // Cache the update
    await this.redis.setex(
      `inventory:${update.itemId}`,
      180, // 3 minutes TTL
      JSON.stringify(update)
    )

    // Broadcast to relevant rooms
    this.io.to('inventory:updates').emit('inventory:update', update)
    this.io.to('role:ADMIN').emit('inventory:update', update)
    this.io.to('role:MANAGER').emit('inventory:update', update)
    this.io.to('role:WAREHOUSE').emit('inventory:update', update)
    this.io.to('role:WAREHOUSE_STAFF').emit('inventory:update', update)
    
    console.log('Inventory update broadcasted:', update.itemId)
  }

  // Alert Broadcasting
  async broadcastAlert(alert: AlertUpdate) {
    if (!this.io) return

    // Cache the alert
    await this.redis.lpush('alerts:recent', JSON.stringify(alert))
    await this.redis.ltrim('alerts:recent', 0, 99) // Keep last 100 alerts

    // Determine which roles should receive the alert
    const targetRoles = this.getTargetRolesForAlert(alert)
    
    targetRoles.forEach(role => {
      this.io!.to(`role:${role}`).emit('alert:new', alert)
    })

    console.log('Alert broadcasted:', alert.type, alert.severity)
  }

  private getTargetRolesForAlert(alert: AlertUpdate): string[] {
    const baseRoles = ['ADMIN', 'MANAGER']
    
    switch (alert.type) {
      case 'bottleneck':
      case 'delay':
        return [...baseRoles, 'CSR', 'OPERATOR']
      case 'quality':
        return [...baseRoles, 'QC', 'QC_INSPECTOR']
      case 'machine':
        return [...baseRoles, 'OPERATOR', 'MAINTENANCE']
      case 'inventory':
        return [...baseRoles, 'WAREHOUSE', 'WAREHOUSE_STAFF']
      default:
        return baseRoles
    }
  }

  // Analytics Broadcasting
  async broadcastAnalytics(data: any) {
    if (!this.io) return

    this.io.to('role:ADMIN').emit('analytics:update', data)
    this.io.to('role:MANAGER').emit('analytics:update', data)
    
    console.log('Analytics update broadcasted')
  }

  // Helper methods for cache updates
  private async updateProductionSummary(update: ProductionUpdate) {
    try {
      const key = 'realtime:production'
      const existing = await this.redis.get(key)
      const summary = existing ? JSON.parse(existing) : { orders: {}, summary: {} }
      
      summary.orders[update.orderId] = {
        ...summary.orders[update.orderId],
        [`${update.workcenterId}`]: update
      }
      
      summary.lastUpdate = new Date().toISOString()
      
      await this.redis.setex(key, 300, JSON.stringify(summary))
    } catch (error) {
      console.error('Error updating production summary:', error)
    }
  }

  private async updateMachineSummary(update: MachineUpdate) {
    try {
      const key = 'realtime:machines'
      const existing = await this.redis.get(key)
      const summary = existing ? JSON.parse(existing) : { machines: {}, summary: {} }
      
      summary.machines[update.machineId] = update
      summary.lastUpdate = new Date().toISOString()
      
      await this.redis.setex(key, 60, JSON.stringify(summary))
    } catch (error) {
      console.error('Error updating machine summary:', error)
    }
  }

  // Health check
  getConnectionCount(): number {
    return this.connectedUsers.size
  }

  getConnectedUsersByRole(): Record<string, number> {
    const roleCount: Record<string, number> = {}
    
    this.connectedUsers.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1
    })
    
    return roleCount
  }
}

export default WebSocketManager