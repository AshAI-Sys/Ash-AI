// @ts-nocheck
import { createServer } from 'http'
import WebSocketManager from './websocket-manager'
import ProductionTracker from './production-tracker'
import MachineMonitor from './machine-monitor'
import InventoryMonitor from './inventory-monitor'
import AnalyticsEngine from './analytics-engine'

let isInitialized = false
const server: any = null

export function initializeRealtimeServer() {
  if (isInitialized) {
    console.log('Real-time server already initialized')
    return
  }

  try {
    // Create HTTP server if not exists (for development)
    if (typeof window === 'undefined') {
      console.log('🚀 Initializing real-time monitoring system...')

      // Initialize WebSocket Manager
      const wsManager = WebSocketManager.getInstance()
      
      // In Next.js, we'll attach to the existing server when possible
      // For development, this will be handled by the WebSocket manager
      
      // Initialize monitoring services
      const productionTracker = ProductionTracker.getInstance()
      const machineMonitor = MachineMonitor.getInstance()
      const inventoryMonitor = InventoryMonitor.getInstance()
      const analyticsEngine = AnalyticsEngine.getInstance()

      // Start all monitoring services
      console.log('📊 Starting production tracking...')
      productionTracker.startTracking()

      console.log('🏭 Starting machine monitoring...')
      machineMonitor.startMonitoring()

      console.log('📦 Starting inventory monitoring...')
      inventoryMonitor.startMonitoring()

      console.log('📈 Starting analytics engine...')
      analyticsEngine.startAnalytics()

      isInitialized = true
      console.log('✅ Real-time monitoring system initialized successfully')

      // Set up cleanup on process termination
      const cleanup = () => {
        console.log('🛑 Shutting down real-time monitoring system...')
        productionTracker.stopTracking()
        machineMonitor.stopMonitoring()
        inventoryMonitor.stopMonitoring()
        analyticsEngine.stopAnalytics()
        isInitialized = false
        process.exit(0)
      }

      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)
      process.on('beforeExit', cleanup)

    } else {
      console.log('Real-time server initialization skipped (client-side)')
    }

  } catch (error) {
    console.error('❌ Error initializing real-time server:', error)
  }
}

export function getServerStatus() {
  return {
    initialized: isInitialized,
    services: {
      websocket: isInitialized,
      production: isInitialized,
      machines: isInitialized,
      inventory: isInitialized,
      analytics: isInitialized
    },
    timestamp: new Date().toISOString()
  }
}

export function restartServices() {
  if (!isInitialized) {
    console.log('Services not initialized, starting fresh...')
    initializeRealtimeServer()
    return
  }

  console.log('🔄 Restarting real-time services...')
  
  try {
    const productionTracker = ProductionTracker.getInstance()
    const machineMonitor = MachineMonitor.getInstance()
    const inventoryMonitor = InventoryMonitor.getInstance()
    const analyticsEngine = AnalyticsEngine.getInstance()

    // Stop all services
    productionTracker.stopTracking()
    machineMonitor.stopMonitoring()
    inventoryMonitor.stopMonitoring()
    analyticsEngine.stopAnalytics()

    // Wait a moment
    setTimeout(() => {
      // Start all services again
      productionTracker.startTracking()
      machineMonitor.startMonitoring()
      inventoryMonitor.startMonitoring()
      analyticsEngine.startAnalytics()
      
      console.log('✅ Real-time services restarted successfully')
    }, 2000)

  } catch (error) {
    console.error('❌ Error restarting services:', error)
  }
}

// Auto-initialize in development - temporarily disabled for build fixes
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_REALTIME === 'true') {
  // Only initialize once
  if (!isInitialized) {
    // Small delay to allow Next.js to fully start
    setTimeout(() => {
      initializeRealtimeServer()
    }, 5000)
  }
}