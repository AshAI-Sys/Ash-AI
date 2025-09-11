'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

export interface RealTimeUpdate {
  type: 'production' | 'machine' | 'inventory' | 'alert' | 'analytics'
  data: any
  timestamp: string
}

export interface AlertData {
  id: string
  type: 'bottleneck' | 'quality' | 'machine' | 'inventory' | 'delay'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  orderId?: string
  machineId?: string
  timestamp: Date
}

export interface ProductionData {
  orderId: string
  workcenterId: string
  status: string
  progress: number
  timestamp: Date
  operatorId?: string
}

export interface MachineData {
  machineId: string
  status: 'running' | 'idle' | 'maintenance' | 'error'
  utilization: number
  temperature?: number
  speed?: number
  lastUpdate: Date
}

export interface InventoryData {
  itemId: string
  sku: string
  currentStock: number
  consumed: number
  location: string
  timestamp: Date
}

export interface AnalyticsData {
  kpis: Array<{
    id: string
    name: string
    value: number
    unit: string
    trend: 'up' | 'down' | 'stable'
    trendPercent: number
    target?: number
    status: 'good' | 'warning' | 'critical'
    lastUpdate: Date
  }>
  timestamp: string
}

interface UseRealTimeDataOptions {
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
}

export function useRealTimeData(options: UseRealTimeDataOptions = {}) {
  const { data: session } = useSession()
  const socketRef = useRef<Socket | null>(null)
  
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000
  } = options

  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)

  // Real-time data state
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [productionUpdates, setProductionUpdates] = useState<ProductionData[]>([])
  const [machineUpdates, setMachineUpdates] = useState<MachineData[]>([])
  const [inventoryUpdates, setInventoryUpdates] = useState<InventoryData[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  // Event listeners
  const [onAlert, setOnAlert] = useState<((alert: AlertData) => void) | null>(null)
  const [onProduction, setOnProduction] = useState<((data: ProductionData) => void) | null>(null)
  const [onMachine, setOnMachine] = useState<((data: MachineData) => void) | null>(null)
  const [onInventory, setOnInventory] = useState<((data: InventoryData) => void) | null>(null)
  const [onAnalytics, setOnAnalytics] = useState<((data: AnalyticsData) => void) | null>(null)

  const connect = useCallback(() => {
    if (!session?.user || socketRef.current?.connected) return

    setIsConnecting(true)
    setError(null)

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      : 'http://localhost:3000'

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setIsConnecting(false)
      setReconnectCount(0)
      setError(null)

      // Authenticate with the server
      socket.emit('authenticate', {
        userId: session.user.id,
        token: session.user.email, // In production, use proper JWT
        role: session.user.role
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setIsConnected(false)
      setIsConnecting(false)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        setTimeout(() => {
          if (reconnectCount < reconnectAttempts) {
            setReconnectCount(prev => prev + 1)
            connect()
          }
        }, reconnectDelay)
      }
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setError(error.message)
      setIsConnecting(false)
      
      if (reconnectCount < reconnectAttempts) {
        setTimeout(() => {
          setReconnectCount(prev => prev + 1)
          connect()
        }, reconnectDelay)
      }
    })

    // Real-time data events
    socket.on('alert:new', (alert: AlertData) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]) // Keep last 50 alerts
      if (onAlert) onAlert(alert)
    })

    socket.on('production:update', (data: ProductionData) => {
      setProductionUpdates(prev => {
        const filtered = prev.filter(update => 
          !(update.orderId === data.orderId && update.workcenterId === data.workcenterId)
        )
        return [data, ...filtered.slice(0, 99)] // Keep last 100 updates
      })
      if (onProduction) onProduction(data)
    })

    socket.on('production:initial', (data: any) => {
      if (data.orders) {
        const updates: ProductionData[] = []
        Object.keys(data.orders).forEach(orderId => {
          Object.keys(data.orders[orderId]).forEach(workcenterId => {
            if (workcenterId !== 'undefined') {
              updates.push(data.orders[orderId][workcenterId])
            }
          })
        })
        setProductionUpdates(updates)
      }
    })

    socket.on('machine:update', (data: MachineData) => {
      setMachineUpdates(prev => {
        const filtered = prev.filter(update => update.machineId !== data.machineId)
        return [data, ...filtered.slice(0, 49)] // Keep last 50 updates
      })
      if (onMachine) onMachine(data)
    })

    socket.on('machines:initial', (data: any) => {
      if (data.machines) {
        const updates = Object.values(data.machines) as MachineData[]
        setMachineUpdates(updates)
      }
    })

    socket.on('inventory:update', (data: InventoryData) => {
      setInventoryUpdates(prev => {
        const filtered = prev.filter(update => update.itemId !== data.itemId)
        return [data, ...filtered.slice(0, 99)] // Keep last 100 updates
      })
      if (onInventory) onInventory(data)
    })

    socket.on('inventory:initial', (data: any) => {
      if (data.inventory) {
        setInventoryUpdates(data.inventory)
      }
    })

    socket.on('analytics:update', (data: AnalyticsData) => {
      setAnalytics(data)
      if (onAnalytics) onAnalytics(data)
    })

  }, [session, reconnectCount, reconnectAttempts, reconnectDelay, onAlert, onProduction, onMachine, onInventory, onAnalytics])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setReconnectCount(0)
  }, [])

  const subscribe = useCallback((channel: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${channel}`, data)
    }
  }, [])

  const unsubscribe = useCallback((channel: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`unsubscribe:${channel}`, data)
    }
  }, [])

  // Auto-connect on session change
  useEffect(() => {
    if (session?.user && autoConnect && !isConnected && !isConnecting) {
      connect()
    }

    return () => {
      if (socketRef.current) {
        disconnect()
      }
    }
  }, [session, autoConnect, connect, disconnect, isConnected, isConnecting])

  // Clear alerts older than 1 hour
  useEffect(() => {
    const interval = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      setAlerts(prev => prev.filter(alert => new Date(alert.timestamp) > oneHourAgo))
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [])

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    reconnectCount,

    // Connection controls
    connect,
    disconnect,
    subscribe,
    unsubscribe,

    // Real-time data
    alerts,
    productionUpdates,
    machineUpdates,
    inventoryUpdates,
    analytics,

    // Event listeners
    onAlert: (callback: (alert: AlertData) => void) => setOnAlert(() => callback),
    onProduction: (callback: (data: ProductionData) => void) => setOnProduction(() => callback),
    onMachine: (callback: (data: MachineData) => void) => setOnMachine(() => callback),
    onInventory: (callback: (data: InventoryData) => void) => setOnInventory(() => callback),
    onAnalytics: (callback: (data: AnalyticsData) => void) => setOnAnalytics(() => callback),

    // Utility methods
    getLatestAlert: () => alerts[0] || null,
    getUnreadAlerts: () => alerts, // In a real app, this would filter by read status
    getAlertsByType: (type: string) => alerts.filter(alert => alert.type === type),
    getAlertsBySeverity: (severity: string) => alerts.filter(alert => alert.severity === severity),

    getProductionByOrder: (orderId: string) => productionUpdates.filter(update => update.orderId === orderId),
    getMachineById: (machineId: string) => machineUpdates.find(update => update.machineId === machineId),
    getInventoryBySku: (sku: string) => inventoryUpdates.find(update => update.sku === sku),

    clearAlerts: () => setAlerts([]),
    clearProductionUpdates: () => setProductionUpdates([]),
    clearMachineUpdates: () => setMachineUpdates([]),
    clearInventoryUpdates: () => setInventoryUpdates([])
  }
}