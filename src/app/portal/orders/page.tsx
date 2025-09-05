'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClientSession {
  client_id: string
  workspace_id: string
  expires_at: string
}

interface Order {
  id: string
  po_number: string
  product_type: string
  method: string
  total_qty: number
  status: string
  target_delivery_date: string
  created_at: string
  brand: {
    name: string
  }
  routing_steps: Array<{
    id: string
    name: string
    workcenter: string
    sequence: number
    status: string
  }>
}

export default function ClientOrders() {
  const router = useRouter()
  const [session, setSession] = useState<ClientSession | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check authentication
    const sessionData = localStorage.getItem('client_session')
    
    if (!sessionData) {
      router.push('/portal/request-access')
      return
    }

    try {
      const parsed = JSON.parse(sessionData) as ClientSession
      
      // Check if session expired
      if (new Date(parsed.expires_at) < new Date()) {
        localStorage.removeItem('client_session')
        router.push('/portal/request-access')
        return
      }

      setSession(parsed)
      fetchOrders(parsed.client_id)
    } catch (error) {
      console.error('Invalid session data:', error)
      router.push('/portal/request-access')
    }
  }, [router])

  const fetchOrders = async (client_id: string) => {
    try {
      const response = await fetch(`/api/portal/orders?client_id=${client_id}`)
      const data = await response.json()

      if (data.success) {
        setOrders(data.orders)
      } else {
        setError(data.error || 'Failed to fetch orders')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'INTAKE': 'bg-yellow-100 text-yellow-800',
      'DESIGN_PENDING': 'bg-blue-100 text-blue-800',
      'DESIGN_APPROVAL': 'bg-purple-100 text-purple-800',
      'PRODUCTION_PLANNED': 'bg-indigo-100 text-indigo-800',
      'IN_PROGRESS': 'bg-orange-100 text-orange-800',
      'QC': 'bg-cyan-100 text-cyan-800',
      'PACKING': 'bg-green-100 text-green-800',
      'READY_FOR_DELIVERY': 'bg-emerald-100 text-emerald-800',
      'DELIVERED': 'bg-gray-100 text-gray-800',
      'CLOSED': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStepStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PLANNED': 'text-gray-400',
      'READY': 'text-blue-600',
      'IN_PROGRESS': 'text-orange-600',
      'DONE': 'text-green-600',
      'BLOCKED': 'text-red-600'
    }
    return colors[status] || 'text-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-sm text-gray-600">Track your apparel production orders</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('client_session')
                router.push('/portal/request-access')
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white shadow rounded-lg overflow-hidden">
                {/* Order Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {order.po_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {order.brand.name} • {order.product_type} • {order.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.total_qty} pieces
                      </p>
                    </div>
                  </div>
                </div>

                {/* Production Timeline */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Production Progress</h4>
                  <div className="space-y-2">
                    {order.routing_steps.map((step) => (
                      <div key={step.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${
                            step.status === 'DONE' ? 'bg-green-500' :
                            step.status === 'IN_PROGRESS' ? 'bg-orange-500' :
                            step.status === 'READY' ? 'bg-blue-500' :
                            step.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-sm text-gray-900">{step.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({step.workcenter})</span>
                        </div>
                        <span className={`text-xs font-medium ${getStepStatusColor(step.status)}`}>
                          {step.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Details */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Target Delivery:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(order.target_delivery_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}