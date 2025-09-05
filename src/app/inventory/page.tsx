'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QRCodeGenerator } from '@/components/inventory/QRCodeGenerator'
import { QRScanner } from '@/components/inventory/QRScanner'
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Eye,
  Edit,
  Filter,
  Shield,
  QrCode,
  Scan,
  Database,
  Warehouse,
  Activity,
  Zap,
  BarChart3,
  Target,
  Settings,
  RefreshCw,
  Clock,
  MapPin,
  Truck
} from 'lucide-react'
import { Role } from '@prisma/client'

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [items, setItems] = useState([
    { id: 1, name: 'White Cotton T-Shirt', category: 'T-Shirts', quantity: 150, reorderPoint: 50, status: 'In Stock', value: 7500 },
    { id: 2, name: 'Black Polo Shirt', category: 'Polo', quantity: 25, reorderPoint: 30, status: 'Low Stock', value: 1250 },
    { id: 3, name: 'Navy Blue Hoodie', category: 'Hoodies', quantity: 0, reorderPoint: 20, status: 'Out of Stock', value: 0 },
    { id: 4, name: 'DTF Transfer Film', category: 'Materials', quantity: 500, reorderPoint: 100, status: 'In Stock', value: 25000 },
    { id: 5, name: 'Embroidery Thread', category: 'Materials', quantity: 75, reorderPoint: 50, status: 'In Stock', value: 3750 },
    { id: 6, name: 'Vinyl Sheets', category: 'Materials', quantity: 15, reorderPoint: 25, status: 'Low Stock', value: 900 }
  ])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user has permission to view inventory
    const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF, Role.PURCHASER]
    if (!allowedRoles.includes(session.user.role)) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="neural-bg min-h-screen relative">
          <div className="quantum-field">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="quantum-particle" />
            ))}
          </div>
          <div className="relative z-10 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="neural-pulse">
                  <Zap className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                </div>
                <p className="text-cyan-300 font-mono">INITIALIZING INVENTORY NEURAL NETWORK...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  // Check if user has permission to view inventory
  const allowedRoles = [Role.ADMIN, Role.MANAGER, Role.WAREHOUSE_STAFF, Role.PURCHASER]
  if (!allowedRoles.includes(session.user.role)) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen relative">
          <div className="quantum-field">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="quantum-particle" />
            ))}
          </div>
          <div className="relative z-10 p-8">
            <div className="flex items-center justify-center h-64">
              <Card className="quantum-card border-red-500/30">
                <CardContent className="p-8 text-center">
                  <Shield className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-xl font-semibold text-white mb-2 glitch-text" data-text="ACCESS DENIED">
                    ACCESS DENIED
                  </h3>
                  <p className="text-red-300 mb-4 font-mono">INSUFFICIENT NEURAL CLEARANCE</p>
                  <p className="text-sm text-gray-400 font-mono">Contact system administrator for access authorization.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    )
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800'
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800'
      case 'Out of Stock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || item.category === categoryFilter
    const matchesStatus = !statusFilter || item.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  // Handle QR scan results
  const handleScanResult = (result: any) => {
    setScanHistory(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 scans
    
    if (result.type === 'inventory_batch') {
      // Auto-add scanned batch to inventory
      handleBatchUpdate(result.data)
    }
  }

  // Handle batch updates from QR scanning
  const handleBatchUpdate = (batchData: any) => {
    const existingItemIndex = items.findIndex(item => item.name === batchData.itemName || item.name === batchData.itemSku)
    
    if (existingItemIndex >= 0) {
      // Update existing item
      setItems(prev => prev.map((item, index) => 
        index === existingItemIndex 
          ? { 
              ...item, 
              quantity: item.quantity + batchData.quantity,
              value: (item.quantity + batchData.quantity) * (item.value > 0 ? Math.round(item.value / Math.max(item.quantity, 1)) : 50),
              status: (item.quantity + batchData.quantity) === 0 ? 'Out of Stock' : 
                     (item.quantity + batchData.quantity) <= item.reorderPoint ? 'Low Stock' : 'In Stock',
              lastUpdated: new Date(),
              batchNumber: batchData.batchNumber
            } 
          : item
      ))
    } else {
      // Add new item
      const newItem = {
        id: items.length + 1,
        name: batchData.itemName || batchData.itemSku,
        category: 'Materials',
        quantity: batchData.quantity,
        reorderPoint: 20,
        status: batchData.quantity === 0 ? 'Out of Stock' : batchData.quantity <= 20 ? 'Low Stock' : 'In Stock',
        value: batchData.quantity * 50,
        batchNumber: batchData.batchNumber,
        supplier: batchData.supplier,
        location: batchData.location,
        qualityGrade: batchData.qualityGrade,
        lastUpdated: new Date()
      }
      setItems(prev => [newItem, ...prev])
    }
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>
        
        <div className="relative z-10 p-6 space-y-6">
          {/* Neural Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 p-4 bg-slate-900/60 border border-cyan-500/30 rounded-2xl backdrop-blur-sm">
              <div className="ai-orb animate-pulse">
                <Database className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white glitch-text" data-text="INVENTORY NEURAL HUB">
                  INVENTORY NEURAL HUB
                </h1>
                <p className="text-cyan-400 font-mono text-sm">Advanced Quantum Inventory Management System</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <Activity className="w-3 h-3 mr-1" />
                SYSTEM ACTIVE
              </Badge>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              className="neon-btn-primary flex items-center gap-2"
              onClick={() => {
                const name = prompt('ENTER ITEM NAME:')
                if (name) {
                  const category = prompt('ENTER CATEGORY (T-Shirts, Polo, Hoodies, Materials):') || 'Materials'
                  const quantity = parseInt(prompt('ENTER QUANTITY:') || '0')
                  const reorderPoint = parseInt(prompt('ENTER REORDER POINT:') || '20')
                  const unitValue = parseInt(prompt('ENTER UNIT VALUE:') || '50')
                  
                  const newItem = {
                    id: items.length + 1,
                    name,
                    category,
                    quantity,
                    reorderPoint,
                    status: quantity === 0 ? 'Out of Stock' : quantity <= reorderPoint ? 'Low Stock' : 'In Stock',
                    value: quantity * unitValue,
                    lastUpdated: new Date()
                  }
                  
                  setItems(prev => [newItem, ...prev])
                  alert(`NEURAL NETWORK UPDATED: ${name} ADDED TO INVENTORY`)
                }
              }}
            >
              <Plus className="w-5 h-5" />
              ADD ITEM
            </button>
            
            <QRCodeGenerator 
              onBatchCreate={handleBatchUpdate}
            />
            
            <QRScanner 
              onScanResult={handleScanResult}
              onBatchUpdate={handleBatchUpdate}
            />
            
            <button
              className="neon-btn-outline flex items-center gap-2"
              onClick={() => {
                alert('NEURAL ANALYTICS INITIALIZED\n\nGenerating reports for:\n• Inventory turnover rates\n• Stock level predictions\n• Supplier performance metrics\n• Cost analysis trends')
              }}
            >
              <BarChart3 className="w-5 h-5" />
              ANALYTICS
            </button>
            
            <button
              className="neon-btn-outline flex items-center gap-2"
              onClick={() => {
                setItems(prev => prev.map(item => ({
                  ...item,
                  lastUpdated: new Date()
                })))
                alert('NEURAL NETWORK SYNCHRONIZED\n\nAll inventory data refreshed from neural database')
              }}
            >
              <RefreshCw className="w-5 h-5" />
              SYNC DATA
            </button>
          </div>

          {/* Neural Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="quantum-card border-cyan-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono text-cyan-400">TOTAL ITEMS</p>
                    <p className="text-2xl font-bold text-white">1,247</p>
                    <p className="text-sm text-green-400 flex items-center mt-1 font-mono">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5% EFFICIENCY
                    </p>
                  </div>
                  <div className="ai-orb-small">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono text-yellow-400">LOW STOCK</p>
                    <p className="text-2xl font-bold text-white">15</p>
                    <p className="text-sm text-yellow-400 flex items-center mt-1 font-mono">
                      <AlertTriangle className="w-3 h-3 mr-1 animate-pulse" />
                      ALERT STATUS
                    </p>
                  </div>
                  <div className="ai-orb-small" style={{background: 'radial-gradient(circle, #eab308, #f59e0b)'}}>
                    <AlertTriangle className="w-4 h-4 text-yellow-900" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono text-red-400">OUT OF STOCK</p>
                    <p className="text-2xl font-bold text-white">3</p>
                    <p className="text-sm text-red-400 flex items-center mt-1 font-mono">
                      <TrendingDown className="w-3 h-3 mr-1 animate-bounce" />
                      CRITICAL
                    </p>
                  </div>
                  <div className="ai-orb-small" style={{background: 'radial-gradient(circle, #ef4444, #dc2626)'}}>
                    <Package className="w-4 h-4 text-red-900" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="quantum-card border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono text-purple-400">TOTAL VALUE</p>
                    <p className="text-2xl font-bold text-white">₱485K</p>
                    <p className="text-sm text-purple-400 flex items-center mt-1 font-mono">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      NEURAL CALC
                    </p>
                  </div>
                  <div className="ai-orb-small" style={{background: 'radial-gradient(circle, #a855f7, #9333ea)'}}>
                    <ShoppingCart className="w-4 h-4 text-purple-900" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Neural Search & Filter Interface */}
          <Card className="quantum-card border-cyan-500/30">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <input
                        placeholder="SEARCH NEURAL INVENTORY DATABASE..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="cyber-input pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <select 
                      className="cyber-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">ALL CATEGORIES</option>
                      <option value="T-Shirts">T-SHIRTS</option>
                      <option value="Polo">POLO</option>
                      <option value="Hoodies">HOODIES</option>
                      <option value="Materials">MATERIALS</option>
                    </select>
                    <select 
                      className="cyber-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">ALL STATUS</option>
                      <option value="In Stock">IN STOCK</option>
                      <option value="Low Stock">LOW STOCK</option>
                      <option value="Out of Stock">OUT OF STOCK</option>
                    </select>
                    <select 
                      className="cyber-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">SORT BY NAME</option>
                      <option value="quantity">SORT BY QUANTITY</option>
                      <option value="value">SORT BY VALUE</option>
                      <option value="status">SORT BY STATUS</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      className={`neon-btn-outline text-sm ${viewMode === 'list' ? 'text-cyan-400 border-cyan-400' : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      LIST VIEW
                    </button>
                    <button
                      className={`neon-btn-outline text-sm ${viewMode === 'grid' ? 'text-cyan-400 border-cyan-400' : ''}`}
                      onClick={() => setViewMode('grid')}
                    >
                      GRID VIEW
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      {filteredItems.length} ITEMS FOUND
                    </Badge>
                    {scanHistory.length > 0 && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {scanHistory.length} SCANS TODAY
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card className="quantum-card border-purple-500/30">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <div className="ai-orb mr-3">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                  RECENT QR SCANS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scanHistory.slice(0, 6).map((scan, index) => (
                    <div key={index} className="p-3 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                          {scan.type?.toUpperCase().replace('_', ' ') || 'SCAN'}
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">
                          {scan.timestamp?.toLocaleTimeString() || 'Now'}
                        </span>
                      </div>
                      <p className="text-cyan-300 text-sm truncate">
                        {scan.data?.batchNumber || scan.data?.itemName || scan.rawData || 'QR Data'}
                      </p>
                      {scan.confidence && (
                        <p className="text-xs text-green-400 mt-1 font-mono">
                          {Math.round(scan.confidence * 100)}% Confidence
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Neural Inventory Grid */}
          <div className="space-y-4">
            {filteredItems.map((item: any) => {
              const getStatusBadge = (status: string) => {
                switch (status) {
                  case 'In Stock': return 'bg-green-500/20 text-green-400 border-green-500/50'
                  case 'Low Stock': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                  case 'Out of Stock': return 'bg-red-500/20 text-red-400 border-red-500/50'
                  default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                }
              }
              
              return (
                <Card key={item.id} className="quantum-card border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="ai-orb">
                          <Package className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1 glitch-text" data-text={item.name}>
                            {item.name}
                          </h3>
                          <p className="text-cyan-400 text-sm mb-2 font-mono">{item.category}</p>
                          <div className="flex items-center gap-6 text-sm font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">QTY:</span>
                              <span className={`font-bold ${
                                item.quantity === 0 ? 'text-red-400' : 
                                item.quantity <= item.reorderPoint ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {item.quantity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">REORDER:</span>
                              <span className="font-bold text-cyan-400">{item.reorderPoint}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">VALUE:</span>
                              <span className="font-bold text-purple-400">{formatCurrency(item.value)}</span>
                            </div>
                            {item.batchNumber && (
                              <div className="flex items-center gap-2">
                                <QrCode className="w-3 h-3 text-cyan-400" />
                                <span className="text-cyan-400 text-xs">{item.batchNumber}</span>
                              </div>
                            )}
                            {item.supplier && (
                              <div className="flex items-center gap-2">
                                <Truck className="w-3 h-3 text-blue-400" />
                                <span className="text-blue-400 text-xs">{item.supplier}</span>
                              </div>
                            )}
                            {item.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs">{item.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <Badge className={getStatusBadge(item.status)}>
                          {item.status}
                        </Badge>

                        <div className="flex gap-2">
                          <button
                            className="neon-btn-outline text-xs px-3 py-1"
                            onClick={() => {
                              alert(`NEURAL ANALYSIS: ${item.name}\n\nCATEGORY: ${item.category}\nQUANTITY: ${item.quantity}\nREORDER POINT: ${item.reorderPoint}\nSTATUS: ${item.status}\nVALUE: ${formatCurrency(item.value)}${item.batchNumber ? `\nBATCH: ${item.batchNumber}` : ''}\n\nDetailed neural analytics will be displayed with movement history and predictive restocking.`)
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            ANALYZE
                          </button>
                          <button
                            className="neon-btn-outline text-xs px-3 py-1"
                            onClick={() => {
                              const newQuantity = prompt(`NEURAL UPDATE - QUANTITY FOR ${item.name}:`, item.quantity.toString())
                              if (newQuantity && !isNaN(parseInt(newQuantity))) {
                                const quantity = parseInt(newQuantity)
                                setItems(prev => prev.map(i => 
                                  i.id === item.id ? { 
                                    ...i, 
                                    quantity, 
                                    status: quantity === 0 ? 'Out of Stock' : quantity <= i.reorderPoint ? 'Low Stock' : 'In Stock',
                                    value: quantity * (i.value > 0 ? Math.round(i.value / Math.max(i.quantity, 1)) : 50)
                                  } : i
                                ))
                                alert(`NEURAL NETWORK UPDATED: ${item.name} QUANTITY SET TO ${quantity}`)
                              }
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            UPDATE
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {filteredItems.length === 0 && (
              <Card className="quantum-card border-cyan-500/30">
                <CardContent className="p-12 text-center">
                  <div className="ai-orb mx-auto mb-4">
                    <Warehouse className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 glitch-text" data-text="NO ITEMS DETECTED">
                    NO ITEMS DETECTED
                  </h3>
                  <p className="text-cyan-300 mb-6 font-mono">NEURAL SCAN COMPLETE - DATABASE EMPTY</p>
                  <button
                    className="neon-btn-primary"
                    onClick={() => {
                      const firstItem = {
                        id: 1,
                        name: 'White Cotton T-Shirt',
                        category: 'T-Shirts',
                        quantity: 100,
                        reorderPoint: 25,
                        status: 'In Stock',
                        value: 5000
                      }
                      setItems([firstItem])
                      alert('NEURAL NETWORK INITIALIZED: First inventory item added!')
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    INITIALIZE INVENTORY
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}