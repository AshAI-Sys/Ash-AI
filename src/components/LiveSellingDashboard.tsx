// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  RotateCcw,
  Calendar,
  DollarSign,
  ShoppingBag,
  Eye,
  Link,
  Upload
} from 'lucide-react'

interface PlatformSale {
  id: string
  saleId: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  netAmount: number
  fees: number
  status: string
  saleDate: string
  reconciled: boolean
  reconciledAt?: string
  platform: {
    id: string
    name: string
  }
  seller: {
    name: string
  }
}

interface ReconciliationSummary {
  total: number
  reconciled: number
  pending: number
  totalAmount: number
  totalFees: number
  netRevenue: number
}

export function LiveSellingDashboard() {
  const [sales, setSales] = useState<PlatformSale[]>([])
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null)
  const [selectedSales, setSelectedSales] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState({
    platform: '',
    status: '',
    reconciled: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchSales()
  }, [filter])

  const fetchSales = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.platform) params.append('platformId', filter.platform)
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)

      const response = await fetch(`/api/live-selling/sync?${params}`)
      const data = await response.json()

      if (data.success) {
        let filteredSales = data.sales
        
        if (filter.status) {
          filteredSales = filteredSales.filter((sale: PlatformSale) => sale.status === filter.status)
        }
        
        if (filter.reconciled !== '') {
          const isReconciled = filter.reconciled === 'true'
          filteredSales = filteredSales.filter((sale: PlatformSale) => sale.reconciled === isReconciled)
        }

        setSales(filteredSales)
        
        // Calculate summary
        const summary: ReconciliationSummary = {
          total: filteredSales.length,
          reconciled: filteredSales.filter((s: PlatformSale) => s.reconciled).length,
          pending: filteredSales.filter((s: PlatformSale) => !s.reconciled).length,
          totalAmount: filteredSales.reduce((sum: number, s: PlatformSale) => sum + s.totalAmount, 0),
          totalFees: filteredSales.reduce((sum: number, s: PlatformSale) => sum + s.fees, 0),
          netRevenue: filteredSales.reduce((sum: number, s: PlatformSale) => sum + s.netAmount, 0)
        }
        setSummary(summary)
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const syncPlatformSales = async (platformId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/live-selling/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          endDate: new Date().toISOString()
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`Sync completed: ${data.summary.synced} new sales, ${data.summary.duplicates} duplicates`)
        fetchSales()
      } else {
        alert(`Sync failed: ${data.message}`)
      }
    } catch (error) {
      alert('Sync failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const reconcileSales = async (action: string = 'reconcile') => {
    if (selectedSales.length === 0) {
      alert('Please select sales to reconcile')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/live-selling/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleIds: selectedSales,
          action
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        setSelectedSales([])
        fetchSales()
      } else {
        alert(`Reconciliation failed: ${data.message}`)
      }
    } catch (error) {
      alert('Reconciliation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSaleSelection = (saleId: string) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    )
  }

  const toggleAllSalesSelection = () => {
    if (selectedSales.length === sales.length) {
      setSelectedSales([])
    } else {
      setSelectedSales(sales.map(sale => sale.id))
    }
  }

  const getStatusBadge = (status: string, reconciled: boolean) => {
    if (reconciled) {
      return <Badge className="bg-green-100 text-green-800">Reconciled</Badge>
    }

    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      RETURNED: 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const platforms = [
    { id: 'tiktok-1', name: 'TikTok Shop' },
    { id: 'shopee-1', name: 'Shopee' },
    { id: 'lazada-1', name: 'Lazada' },
    { id: 'facebook-1', name: 'Facebook Shop' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Live Selling Management</h1>
        <Button onClick={fetchSales} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reconciled</p>
                  <p className="text-3xl font-bold text-green-600">{summary.reconciled}</p>
                  <p className="text-sm text-gray-500">
                    {summary.total > 0 ? Math.round((summary.reconciled / summary.total) * 100) : 0}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{summary.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ₱{summary.netRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fees: ₱{summary.totalFees.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Platform Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map(platform => (
              <Button
                key={platform.id}
                onClick={() => syncPlatformSales(platform.id)}
                disabled={isLoading}
                variant="outline"
                className="h-20 flex flex-col gap-2"
              >
                <ShoppingBag className="w-6 h-6" />
                <span className="text-sm">{platform.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                value={filter.platform}
                onChange={(e) => setFilter(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Platforms</option>
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.id}>{platform.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reconciled
              </label>
              <select
                value={filter.reconciled}
                onChange={(e) => setFilter(prev => ({ ...prev, reconciled: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="true">Reconciled</option>
                <option value="false">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedSales.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-blue-900">
                {selectedSales.length} sales selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => reconcileSales('reconcile')}
                  disabled={isLoading}
                >
                  <Link className="w-4 h-4 mr-1" />
                  Auto Reconcile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reconcileSales('mark_shipped')}
                  disabled={isLoading}
                >
                  <Truck className="w-4 h-4 mr-1" />
                  Mark Shipped
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reconcileSales('handle_return')}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Handle Returns
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Platform Sales</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedSales.length === sales.length && sales.length > 0}
                onChange={toggleAllSalesSelection}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className={`p-4 border rounded-lg transition-colors ${
                  selectedSales.includes(sale.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSales.includes(sale.id)}
                      onChange={() => toggleSaleSelection(sale.id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{sale.productName}</h3>
                        {getStatusBadge(sale.status, sale.reconciled)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Platform:</span> {sale.platform.name}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {sale.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> ₱{sale.totalAmount.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Net:</span> ₱{sale.netAmount.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div>Sale ID: {sale.saleId}</div>
                        <div>Date: {new Date(sale.saleDate).toLocaleDateString()}</div>
                        <div>Seller: {sale.seller.name}</div>
                        {sale.reconciledAt && (
                          <div>Reconciled: {new Date(sale.reconciledAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {sales.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
                <p className="text-gray-600">Try adjusting your filters or sync platform data</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading sales data...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}