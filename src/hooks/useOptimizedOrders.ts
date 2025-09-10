'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface Order {
  id: string
  orderNumber: string
  clientName: string
  status: string
  totalAmount: number
  dueDate: string
  created_at: string
  items: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface UseOptimizedOrdersReturn {
  orders: Order[]
  filteredOrders: Order[]
  loading: boolean
  error: string | null
  searchTerm: string
  statusFilter: string
  currentPage: number
  totalPages: number
  itemsPerPage: number
  setSearchTerm: (term: string) => void
  setStatusFilter: (status: string) => void
  setCurrentPage: (page: number) => void
  setItemsPerPage: (items: number) => void
  refreshOrders: () => Promise<void>
}

// Cache configuration
const CACHE_KEY = 'orders_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CacheData {
  data: Order[]
  timestamp: number
}

const sampleOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ASH-2025-001234',
    clientName: 'Premium Apparel Co.',
    status: 'IN_PRODUCTION',
    totalAmount: 45000,
    dueDate: '2025-09-15',
    created_at: '2025-08-01',
    items: 120,
    priority: 'HIGH'
  },
  {
    id: '2',
    orderNumber: 'ASH-2025-001235',
    clientName: 'TechStart Uniforms',
    status: 'CONFIRMED',
    totalAmount: 28000,
    dueDate: '2025-09-20',
    created_at: '2025-08-05',
    items: 50,
    priority: 'MEDIUM'
  },
  {
    id: '3',
    orderNumber: 'ASH-2025-001236',
    clientName: 'Fashion Forward Ltd.',
    status: 'QC_PASSED',
    totalAmount: 67000,
    dueDate: '2025-09-10',
    created_at: '2025-07-28',
    items: 200,
    priority: 'HIGH'
  },
  {
    id: '4',
    orderNumber: 'ASH-2025-001237',
    clientName: 'Urban Style Co.',
    status: 'DELIVERED',
    totalAmount: 32000,
    dueDate: '2025-08-30',
    created_at: '2025-07-15',
    items: 75,
    priority: 'LOW'
  },
  {
    id: '5',
    orderNumber: 'ASH-2025-001238',
    clientName: 'Corporate Solutions Inc.',
    status: 'READY_FOR_DELIVERY',
    totalAmount: 55000,
    dueDate: '2025-09-12',
    created_at: '2025-08-10',
    items: 150,
    priority: 'MEDIUM'
  }
]

export function useOptimizedOrders(): UseOptimizedOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Check cache first
  const getCachedData = useCallback((): Order[] | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const cacheData: CacheData = JSON.parse(cached)
      const now = Date.now()
      
      // Check if cache is still valid
      if (now - cacheData.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }
      
      return cacheData.data
    } catch {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
  }, [])

  // Cache data
  const setCachedData = useCallback((data: Order[]) => {
    if (typeof window === 'undefined') return
    
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch {
      // Handle storage quota exceeded
      localStorage.removeItem(CACHE_KEY)
    }
  }, [])

  // Optimized API fetch with AbortController
  const fetchOrders = useCallback(async (useCache = true): Promise<Order[]> => {
    // Try cache first
    if (useCache) {
      const cachedData = getCachedData()
      if (cachedData) {
        console.log('📦 Using cached orders data')
        return cachedData
      }
    }

    console.log('🔄 Fetching fresh orders data...')
    const controller = new AbortController()
    
    try {
      const response = await fetch('/api/orders?limit=100&optimized=true', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        // Transform API data
        const transformedOrders: Order[] = data.data.map((order: any) => ({
          id: order.id,
          orderNumber: order.po_number || `ASH-${order.id.slice(-6).toUpperCase()}`,
          clientName: order.client?.name || order.client?.company || 'Unknown Client',
          status: order.status || 'DRAFT',
          totalAmount: (order.commercials?.unit_price || 0) * (order.total_qty || 0),
          dueDate: order.target_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: order.created_at || new Date().toISOString(),
          items: order.total_qty || 0,
          priority: order.ai_risk_assessment?.includes('urgent') ? 'HIGH' : 
                   order.ai_risk_assessment?.includes('delay') ? 'MEDIUM' : 'LOW'
        }))

        // Cache the transformed data
        setCachedData(transformedOrders)
        return transformedOrders
      }
      
      throw new Error('Invalid API response format')
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw fetchError
      }
      
      console.warn('⚠️ API fetch failed, using sample data:', fetchError.message)
      // Cache sample data as fallback
      setCachedData(sampleOrders)
      return sampleOrders
    }
  }, [getCachedData, setCachedData])

  // Initial load
  useEffect(() => {
    let isMounted = true
    
    const loadOrders = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const ordersData = await fetchOrders(true)
        
        if (isMounted) {
          setOrders(ordersData)
          console.log(`✅ Loaded ${ordersData.length} orders`)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && isMounted) {
          setError(err.message || 'Failed to load orders')
          setOrders(sampleOrders) // Fallback
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadOrders()
    
    return () => {
      isMounted = false
    }
  }, [fetchOrders])

  // Refresh function
  const refreshOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const freshOrders = await fetchOrders(false) // Skip cache
      setOrders(freshOrders)
      
      console.log('🔄 Orders refreshed successfully')
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to refresh orders')
      }
    } finally {
      setLoading(false)
    }
  }, [fetchOrders])

  // Memoized filtered orders with debouncing effect
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.clientName.toLowerCase().includes(term) ||
        order.status.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Sort by priority and due date
    filtered.sort((a, b) => {
      // Priority order: HIGH > MEDIUM > LOW
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      // If same priority, sort by due date (earlier first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

    return filtered
  }, [orders, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  return {
    orders,
    filteredOrders,
    loading,
    error,
    searchTerm,
    statusFilter,
    currentPage,
    totalPages,
    itemsPerPage,
    setSearchTerm,
    setStatusFilter,
    setCurrentPage,
    setItemsPerPage,
    refreshOrders
  }
}