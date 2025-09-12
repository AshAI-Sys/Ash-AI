// @ts-nocheck
/**
 * ASH AI - Client Portal Dashboard
 * Professional client interface with order tracking and design approvals
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Package,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileImage,
  Truck,
  Star,
  Calendar,
  Filter,
  Search,
  Bell,
  Settings,
  LogOut,
  Brain,
  Palette,
  Wifi,
  WifiOff,
  RefreshCw,
  Circle,
  Plus,
  Upload,
  Save,
  Send,
  Info,
  Building2,
  User,
  Sparkles,
  Zap,
  Shirt,
  Palette as PaletteIcon,
  Hash,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react'

interface ClientDashboard {
  client: {
    name: string
    company: string
    settings: any
  }
  overview: {
    total_orders: number
    active_orders: number
    pending_approvals: number
    urgent_tasks: number
  }
  recent_orders: Array<{
    id: string
    po_number: string
    brand: string
    status: string
    product_type: string
    total_qty: number
    target_delivery_date: string
    created_at: string
    progress_percentage: number
    next_milestone: string | null
    design_status: string
    delivery_info: any
  }>
  pending_approvals: Array<{
    id: string
    order_po: string
    brand: string
    file_name: string
    type: string
    version: number
    created_at: string
    order_id: string
  }>
  insights: {
    avg_lead_time: number
    on_time_delivery_rate: number
    design_approval_time: number
    status_distribution: Record<string, number>
    delivery_performance: {
      on_time: number
      delayed: number
      early: number
    }
  }
  notifications: Array<{
    id: string
    type: string
    message: string
    created_at: string
    order_id: string
  }>
  quick_actions: Array<{
    type: string
    title: string
    count: number
    priority: string
  }>
}

interface OrderFormData {
  company_name: string
  requested_deadline: string
  product_name: string
  service_type: string
  garment_type: string
  fabric_type: string
  fabric_colors: string[]
  method: string
  options: {
    with_collar: boolean
    with_cuffs: boolean
    with_combi: boolean
    with_bias_tape: boolean
    with_side_slit: boolean
    with_flatbed: boolean
    with_buttons: boolean
    with_zipper: boolean
    with_linings: boolean
    with_pangiti: boolean
    sleeveless: boolean
    longsleeves: boolean
    three_quarter_sleeves: boolean
    pocket: boolean
    reversible: boolean
    raglan: boolean
    hooded: boolean
    long_tee: boolean
    kangaroo_pocket: boolean
    with_batok: boolean
  }
  screen_printed: boolean
  embroidered_sublim: boolean
  size_label: string
  estimated_quantity: number
  images: File[]
  attachments: File[]
  notes: string
  brand_id: string
  product_type: string
  total_qty: number
  target_delivery_date: string
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Order form state
  const [orderFormData, setOrderFormData] = useState<OrderFormData>({
    company_name: '',
    requested_deadline: '',
    product_name: '',
    service_type: '',
    garment_type: '',
    fabric_type: '',
    fabric_colors: [],
    method: 'SILKSCREEN',
    options: {
      with_collar: false,
      with_cuffs: false,
      with_combi: false,
      with_bias_tape: false,
      with_side_slit: false,
      with_flatbed: false,
      with_buttons: false,
      with_zipper: false,
      with_linings: false,
      with_pangiti: false,
      sleeveless: false,
      longsleeves: false,
      three_quarter_sleeves: false,
      pocket: false,
      reversible: false,
      raglan: false,
      hooded: false,
      long_tee: false,
      kangaroo_pocket: false,
      with_batok: false
    },
    screen_printed: false,
    embroidered_sublim: false,
    size_label: '',
    estimated_quantity: 0,
    images: [],
    attachments: [],
    notes: '',
    brand_id: '1',
    product_type: '',
    total_qty: 0,
    target_delivery_date: ''
  })
  const [orderFormLoading, setOrderFormLoading] = useState(false)
  const [orderFormErrors, setOrderFormErrors] = useState<string[]>([])
  
  // Real-time notifications integration
  const { 
    notifications, 
    connectionStatus, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    requestNotificationPermission 
  } = useRealtimeNotifications('client-portal')

  useEffect(() => {
    loadDashboard()
    // Request notification permission on first load
    requestNotificationPermission()
  }, [])

  // Auto-populate company name when dashboard loads
  useEffect(() => {
    if (dashboard?.client && !orderFormData.company_name) {
      setOrderFormData(prev => ({
        ...prev,
        company_name: dashboard.client.company || dashboard.client.name
      }))
    }
  }, [dashboard])

  // Auto-refresh dashboard when relevant notifications arrive
  useEffect(() => {
    const relevantNotifications = notifications.filter(notif => 
      notif.type === 'order_status_change' || 
      notif.type === 'design_approval_needed' ||
      notif.type === 'production_update'
    )
    
    if (relevantNotifications.length > 0) {
      // Refresh dashboard data automatically
      loadDashboard()
    }
  }, [notifications])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client-portal/dashboard')
      
      if (response.ok) {
        const data = await response.json()
        setDashboard(data.dashboard)
      } else if (response.status === 401) {
        router.push('/client-portal/login')
      } else {
        setError('Failed to load dashboard')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/client-portal/auth', { method: 'DELETE' })
      router.push('/client-portal/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Order form constants
  const garmentTypes = [
    'Tee', 'Polo Shirt', 'Hoodie', 'Jersey', 'Uniform', 'Tank Top', 'Long Sleeve', 'Jacket', 'Dress', 'Custom'
  ]
  
  const fabricTypes = [
    'Cotton 100%', 'Cotton Blend', 'Polyester', 'Cotton-Polyester', 'Bamboo', 'Linen', 'Dri-Fit', 'Jersey Knit', 'French Terry', 'Custom'
  ]
  
  const colorOptions = [
    'White', 'Black', 'Navy Blue', 'Royal Blue', 'Red', 'Maroon', 'Green', 'Gray', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Beige'
  ]

  // Order form handlers
  const handleOrderFormChange = (field: keyof OrderFormData, value: any) => {
    setOrderFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleColorToggle = (color: string) => {
    setOrderFormData(prev => ({
      ...prev,
      fabric_colors: prev.fabric_colors.includes(color)
        ? prev.fabric_colors.filter(c => c !== color)
        : [...prev.fabric_colors, color]
    }))
  }

  const handleOptionToggle = (option: keyof OrderFormData['options']) => {
    setOrderFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [option]: !prev.options[option]
      }
    }))
  }

  const handleFileUpload = (field: 'images' | 'attachments', files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files)
      setOrderFormData(prev => ({
        ...prev,
        [field]: [...prev[field], ...fileArray]
      }))
    }
  }

  const removeFile = (field: 'images' | 'attachments', index: number) => {
    setOrderFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const validateOrderForm = (): boolean => {
    const errors: string[] = []
    
    if (!orderFormData.company_name.trim()) errors.push('Company name is required')
    if (!orderFormData.product_name.trim()) errors.push('Product name is required')
    if (!orderFormData.service_type) errors.push('Service type is required')
    if (!orderFormData.requested_deadline) errors.push('Requested deadline is required')
    if (orderFormData.estimated_quantity <= 0) errors.push('Estimated quantity must be greater than 0')
    if (orderFormData.fabric_colors.length === 0) errors.push('At least one fabric color must be selected')
    
    setOrderFormErrors(errors)
    return errors.length === 0
  }

  const handleOrderSubmit = async () => {
    if (!validateOrderForm()) return

    setOrderFormLoading(true)
    try {
      // Auto-populate client information from session
      const submissionData = {
        ...orderFormData,
        total_qty: orderFormData.estimated_quantity,
        target_delivery_date: orderFormData.requested_deadline,
        product_type: orderFormData.garment_type,
        // Convert images and attachments to URLs (in real implementation, upload files first)
        images: orderFormData.images.map((file, index) => ({
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type
        })),
        attachments: orderFormData.attachments.map((file, index) => ({
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.name.split('.').pop()?.toLowerCase() || 'unknown'
        }))
      }

      const response = await fetch('/api/client-portal/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Show success message with TikTok-style notification
        if (result.message) {
          // Create a temporary success banner
          const successBanner = document.createElement('div')
          successBanner.innerHTML = `
            <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
              <div class="flex items-center space-x-3">
                <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span class="font-bold text-lg">${result.message}</span>
              </div>
            </div>
          `
          document.body.appendChild(successBanner)
          
          // Remove banner after 5 seconds
          setTimeout(() => {
            if (successBanner.parentNode) {
              successBanner.parentNode.removeChild(successBanner)
            }
          }, 5000)
        }
        
        // Reset form to initial state
        setOrderFormData({
          company_name: dashboard?.client?.company || '',
          requested_deadline: '',
          product_name: '',
          service_type: '',
          garment_type: '',
          fabric_type: '',
          fabric_colors: [],
          method: 'SILKSCREEN',
          options: {
            with_collar: false,
            with_cuffs: false,
            with_combi: false,
            with_bias_tape: false,
            with_side_slit: false,
            with_flatbed: false,
            with_buttons: false,
            with_zipper: false,
            with_linings: false,
            with_pangiti: false,
            sleeveless: false,
            longsleeves: false,
            three_quarter_sleeves: false,
            pocket: false,
            reversible: false,
            raglan: false,
            hooded: false,
            long_tee: false,
            kangaroo_pocket: false,
            with_batok: false
          },
          screen_printed: false,
          embroidered_sublim: false,
          size_label: '',
          estimated_quantity: 0,
          images: [],
          attachments: [],
          notes: '',
          brand_id: '1',
          product_type: '',
          total_qty: 0,
          target_delivery_date: ''
        })
        
        // Clear any existing errors
        setOrderFormErrors([])
        
        // Refresh dashboard to show new order
        loadDashboard()
      } else {
        const errorData = await response.json()
        if (errorData.details && Array.isArray(errorData.details)) {
          // Handle Zod validation errors
          setOrderFormErrors(errorData.details.map((err: any) => err.message))
        } else {
          setOrderFormErrors([errorData.error || 'Failed to create order'])
        }
      }
    } catch (error) {
      console.error('Order submission error:', error)
      setOrderFormErrors(['Network error. Please try again.'])
    } finally {
      setOrderFormLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'INTAKE': 'bg-blue-500',
      'DESIGN_PENDING': 'bg-purple-500',
      'DESIGN_APPROVAL': 'bg-yellow-500',
      'PRODUCTION_PLANNED': 'bg-indigo-500',
      'IN_PROGRESS': 'bg-orange-500',
      'QC': 'bg-red-500',
      'PACKING': 'bg-green-500',
      'READY_FOR_DELIVERY': 'bg-teal-500',
      'DELIVERED': 'bg-emerald-500',
      'CLOSED': 'bg-gray-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">No dashboard data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* TikTok-Style Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    ASH AI Client Portal
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">Professional Manufacturing Partner</p>
                </div>
              </div>
              <div className="hidden lg:block">
                <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200 text-xs font-medium">
                  <Circle className="w-2 h-2 mr-1.5 fill-current" />
                  Welcome, {dashboard.client.name}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Real-time connection status */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100/70 text-xs font-medium">
                {connectionStatus.connected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700">Live</span>
                  </>
                ) : connectionStatus.reconnecting ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-yellow-500 animate-spin" />
                    <span className="text-yellow-600">Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>

              {/* Notifications button */}
              <Button variant="ghost" size="sm" className="relative hover:bg-teal-50 transition-colors" onClick={markAllAsRead}>
                <Bell className="w-4 h-4 text-gray-600" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </Button>

              <Button variant="ghost" size="sm" className="hover:bg-blue-50 transition-colors">
                <Settings className="w-4 h-4 text-gray-600" />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-red-50 transition-colors" onClick={handleLogout}>
                <LogOut className="w-4 h-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with proper padding for fixed header */}
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TikTok-Style Real-time Notifications Banner */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-blue-200/50 shadow-xl shadow-blue-100/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Live Updates</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-blue-600 hover:bg-blue-50 rounded-xl font-medium"
                  >
                    Mark all read
                  </Button>
                </div>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {notifications.slice(0, 3).map((notification) => (
                    <div 
                      key={notification.id}
                      className={`flex items-start space-x-4 p-4 rounded-xl transition-all hover:shadow-md ${
                        notification.read ? 'bg-gray-50/70' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                        notification.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                        notification.priority === 'normal' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {notifications.length > 3 && (
                    <div className="text-center pt-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-medium">
                        +{notifications.length - 3} more updates
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TikTok-Style Overview Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Orders</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.overview.total_orders}</span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
                {dashboard.overview.active_orders} active
              </Badge>
              <span className="text-xs text-green-600 font-medium">+12% this month</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FileImage className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending Approvals</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.overview.pending_approvals}</span>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs font-medium">
                Designs awaiting
              </Badge>
              <span className="text-xs text-yellow-600 font-medium">Urgent review</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">On-Time Delivery</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.insights.on_time_delivery_rate}%</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-medium">
                Excellent rate
              </Badge>
              <span className="text-xs text-green-600 font-medium">Above target</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgent Items</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">{dashboard.overview.urgent_tasks}</span>
                  <Star className="w-4 h-4 text-red-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-medium">
                Need attention
              </Badge>
              <span className="text-xs text-red-600 font-medium">High priority</span>
            </div>
          </div>
        </div>

        {/* TikTok-Style Tabs Navigation */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-100/50 p-2 mb-8">
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-transparent gap-2 p-0">
              <TabsTrigger 
                value="orders" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
              >
                <Package className="w-4 h-4" />
                My Orders
              </TabsTrigger>
              <TabsTrigger 
                value="create-order" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
              >
                <Plus className="w-4 h-4" />
                New Order
              </TabsTrigger>
              <TabsTrigger 
                value="approvals" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium relative"
              >
                <FileImage className="w-4 h-4" />
                Design Approvals
                {dashboard.overview.pending_approvals > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">{dashboard.overview.pending_approvals}</span>
                  </div>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                Insights
              </TabsTrigger>
            </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="grid gap-4">
              {dashboard.recent_orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.po_number}</CardTitle>
                        <CardDescription>
                          {order.brand} • {order.product_type} • {order.total_qty} pieces
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status) + ' text-white'}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{order.progress_percentage}%</span>
                      </div>
                      <Progress value={order.progress_percentage} />
                    </div>

                    {/* Current Step */}
                    {order.next_milestone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {order.next_milestone}
                      </div>
                    )}

                    {/* Design Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span>Design Status:</span>
                      <span className={
                        order.design_status.includes('Pending') ? 'text-yellow-600' :
                        order.design_status.includes('Approved') ? 'text-green-600' :
                        order.design_status.includes('Revision') ? 'text-red-600' :
                        'text-muted-foreground'
                      }>
                        {order.design_status}
                      </span>
                    </div>

                    {/* Delivery Date */}
                    <div className="flex items-center justify-between text-sm">
                      <span>Delivery Date:</span>
                      <span className={
                        new Date(order.target_delivery_date) < new Date() ? 'text-red-600' : ''
                      }>
                        {new Date(order.target_delivery_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      {order.design_status.includes('Pending') && (
                        <Button size="sm" variant="outline">
                          <Palette className="w-4 h-4 mr-1" />
                          Review Designs
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dashboard.recent_orders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No orders found</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Create New Order Tab */}
          <TabsContent value="create-order" className="space-y-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-emerald-200/50 shadow-xl shadow-emerald-100/50 p-8">
              {/* Header */}
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Create New Order
                  </h2>
                  <p className="text-gray-600 font-medium">Submit your next apparel manufacturing request</p>
                </div>
              </div>

              {/* Error Display */}
              {orderFormErrors.length > 0 && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {orderFormErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <form className="space-y-8">
                {/* Company Information */}
                <Card className="border-emerald-100 bg-emerald-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                    <CardDescription>Basic details about your order</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company_name" className="text-sm font-semibold text-gray-700">
                        Company/Organization Name *
                      </Label>
                      <Input
                        id="company_name"
                        value={orderFormData.company_name}
                        onChange={(e) => handleOrderFormChange('company_name', e.target.value)}
                        placeholder="e.g., Premium Sports Inc."
                        className="bg-white/80 border-emerald-200 focus:border-emerald-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requested_deadline" className="text-sm font-semibold text-gray-700">
                        Requested Deadline *
                      </Label>
                      <Input
                        id="requested_deadline"
                        type="datetime-local"
                        value={orderFormData.requested_deadline}
                        onChange={(e) => handleOrderFormChange('requested_deadline', e.target.value)}
                        className="bg-white/80 border-emerald-200 focus:border-emerald-400"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Product Details */}
                <Card className="border-blue-100 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Shirt className="w-5 h-5" />
                      Product Details
                    </CardTitle>
                    <CardDescription>Specify your garment requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="product_name" className="text-sm font-semibold text-gray-700">
                          Product Name *
                        </Label>
                        <Input
                          id="product_name"
                          value={orderFormData.product_name}
                          onChange={(e) => handleOrderFormChange('product_name', e.target.value)}
                          placeholder="e.g., Team Jersey, Corporate Polo"
                          className="bg-white/80 border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service_type" className="text-sm font-semibold text-gray-700">
                          Service Type *
                        </Label>
                        <Select value={orderFormData.service_type} onValueChange={(value) => handleOrderFormChange('service_type', value)}>
                          <SelectTrigger className="bg-white/80 border-blue-200 focus:border-blue-400">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sew and Print / Embro">Sew and Print / Embroidery</SelectItem>
                            <SelectItem value="Sew Only">Sew Only</SelectItem>
                            <SelectItem value="Print / Embro Only">Print / Embroidery Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="garment_type" className="text-sm font-semibold text-gray-700">
                          Garment Type
                        </Label>
                        <Select value={orderFormData.garment_type} onValueChange={(value) => handleOrderFormChange('garment_type', value)}>
                          <SelectTrigger className="bg-white/80 border-blue-200 focus:border-blue-400">
                            <SelectValue placeholder="Select garment" />
                          </SelectTrigger>
                          <SelectContent>
                            {garmentTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fabric_type" className="text-sm font-semibold text-gray-700">
                          Fabric Type
                        </Label>
                        <Select value={orderFormData.fabric_type} onValueChange={(value) => handleOrderFormChange('fabric_type', value)}>
                          <SelectTrigger className="bg-white/80 border-blue-200 focus:border-blue-400">
                            <SelectValue placeholder="Select fabric" />
                          </SelectTrigger>
                          <SelectContent>
                            {fabricTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="method" className="text-sm font-semibold text-gray-700">
                          Print Method
                        </Label>
                        <Select value={orderFormData.method} onValueChange={(value) => handleOrderFormChange('method', value)}>
                          <SelectTrigger className="bg-white/80 border-blue-200 focus:border-blue-400">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SILKSCREEN">Silkscreen</SelectItem>
                            <SelectItem value="SUBLIMATION">Sublimation</SelectItem>
                            <SelectItem value="DTF">DTF (Direct to Film)</SelectItem>
                            <SelectItem value="EMBROIDERY">Embroidery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Fabric Colors *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {colorOptions.map(color => (
                          <div key={color} className="flex items-center space-x-2">
                            <Checkbox
                              id={`color-${color}`}
                              checked={orderFormData.fabric_colors.includes(color)}
                              onCheckedChange={() => handleColorToggle(color)}
                              className="border-blue-300"
                            />
                            <Label htmlFor={`color-${color}`} className="text-sm font-medium">{color}</Label>
                          </div>
                        ))}
                      </div>
                      {orderFormData.fabric_colors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {orderFormData.fabric_colors.map(color => (
                            <Badge key={color} variant="secondary" className="bg-blue-100 text-blue-700">
                              {color}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Options & Features */}
                <Card className="border-purple-100 bg-purple-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                      <Settings className="w-5 h-5" />
                      Options & Features
                    </CardTitle>
                    <CardDescription>Select additional features for your garments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Object.entries(orderFormData.options).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={value}
                            onCheckedChange={() => handleOptionToggle(key as keyof OrderFormData['options'])}
                            className="border-purple-300"
                          />
                          <Label htmlFor={key} className="text-sm font-medium capitalize">
                            {key.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Design Information */}
                <Card className="border-yellow-100 bg-yellow-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                      <PaletteIcon className="w-5 h-5" />
                      Design Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="screen_printed"
                          checked={orderFormData.screen_printed}
                          onCheckedChange={(checked) => handleOrderFormChange('screen_printed', checked)}
                          className="border-yellow-300"
                        />
                        <Label htmlFor="screen_printed" className="text-sm font-medium">Screen Printed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="embroidered_sublim"
                          checked={orderFormData.embroidered_sublim}
                          onCheckedChange={(checked) => handleOrderFormChange('embroidered_sublim', checked)}
                          className="border-yellow-300"
                        />
                        <Label htmlFor="embroidered_sublim" className="text-sm font-medium">Embroidered/Sublim</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="size_label" className="text-sm font-semibold text-gray-700">Size Label</Label>
                        <Select value={orderFormData.size_label} onValueChange={(value) => handleOrderFormChange('size_label', value)}>
                          <SelectTrigger className="bg-white/80 border-yellow-200 focus:border-yellow-400">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sew">Sew</SelectItem>
                            <SelectItem value="Print">Print</SelectItem>
                            <SelectItem value="None">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quantity & Files */}
                <Card className="border-teal-100 bg-teal-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-teal-700">
                      <Hash className="w-5 h-5" />
                      Quantity & Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="estimated_quantity" className="text-sm font-semibold text-gray-700">
                        Estimated Quantity *
                      </Label>
                      <Input
                        id="estimated_quantity"
                        type="number"
                        min="1"
                        value={orderFormData.estimated_quantity}
                        onChange={(e) => handleOrderFormChange('estimated_quantity', parseInt(e.target.value) || 0)}
                        placeholder="e.g., 100"
                        className="bg-white/80 border-teal-200 focus:border-teal-400 max-w-xs"
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Design Images (Max 10)</Label>
                      <div className="border-2 border-dashed border-teal-300 rounded-xl p-6 text-center bg-white/50">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload('images', e.target.files)}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center space-y-2">
                            <ImageIcon className="w-8 h-8 text-teal-500" />
                            <span className="text-sm font-medium text-teal-600">Click to upload images</span>
                            <span className="text-xs text-gray-500">PNG, JPG up to 10MB each</span>
                          </div>
                        </label>
                      </div>
                      {orderFormData.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {orderFormData.images.map((file, index) => (
                            <div key={index} className="relative group">
                              <div className="bg-white p-2 rounded-lg shadow border">
                                <div className="text-xs font-medium truncate">{file.name}</div>
                                <div className="text-xs text-gray-500">{Math.round(file.size / 1024)}KB</div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="absolute -top-2 -right-2 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFile('images', index)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attachments Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">Design Files (PDF, AI, PSD, ZIP)</Label>
                      <div className="border-2 border-dashed border-teal-300 rounded-xl p-6 text-center bg-white/50">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.ai,.psd,.zip"
                          onChange={(e) => handleFileUpload('attachments', e.target.files)}
                          className="hidden"
                          id="attachment-upload"
                        />
                        <label htmlFor="attachment-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center space-y-2">
                            <FileText className="w-8 h-8 text-teal-500" />
                            <span className="text-sm font-medium text-teal-600">Click to upload files</span>
                            <span className="text-xs text-gray-500">PDF, AI, PSD, ZIP up to 50MB each</span>
                          </div>
                        </label>
                      </div>
                      {orderFormData.attachments.length > 0 && (
                        <div className="space-y-2">
                          {orderFormData.attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg shadow border">
                              <div className="flex items-center space-x-3">
                                <FileText className="w-4 h-4 text-teal-500" />
                                <div>
                                  <div className="text-sm font-medium">{file.name}</div>
                                  <div className="text-xs text-gray-500">{Math.round(file.size / 1024)}KB</div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFile('attachments', index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border-gray-100 bg-gray-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-700">
                      <FileText className="w-5 h-5" />
                      Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={orderFormData.notes}
                      onChange={(e) => handleOrderFormChange('notes', e.target.value)}
                      placeholder="Any special requirements, deadlines, or additional information..."
                      rows={4}
                      className="bg-white/80 border-gray-200 focus:border-gray-400 resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <Button
                    type="button"
                    onClick={handleOrderSubmit}
                    disabled={orderFormLoading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-12 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-semibold"
                  >
                    {orderFormLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                        Submitting Order...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-3" />
                        Submit Order Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* Design Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            <div className="grid gap-4">
              {dashboard.pending_approvals.map((approval) => (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{approval.file_name}</CardTitle>
                        <CardDescription>
                          {approval.order_po} • {approval.brand} • Version {approval.version}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Uploaded {Math.floor((Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago</span>
                      <span className="capitalize">{approval.type}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Review Design
                      </Button>
                      <Button size="sm" variant="outline">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Quick Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dashboard.pending_approvals.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending design approvals</p>
                  <p className="text-sm">All designs are up to date!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dashboard.insights.status_distribution).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm">{status.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">On Time</span>
                      <span className="text-sm font-medium text-green-600">
                        {dashboard.insights.delivery_performance.on_time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Early</span>
                      <span className="text-sm font-medium text-blue-600">
                        {dashboard.insights.delivery_performance.early}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Delayed</span>
                      <span className="text-sm font-medium text-red-600">
                        {dashboard.insights.delivery_performance.delayed}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common actions based on your current orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dashboard.quick_actions.map((action, index) => (
                    <Button key={index} variant="outline" className="h-auto p-4 flex-col">
                      <div className="text-lg font-semibold">{action.count}</div>
                      <div className="text-sm text-center">{action.title}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
        </div>
      </div>
    </div>
  )
}