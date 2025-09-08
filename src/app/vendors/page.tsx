'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  Search, 
  Plus, 
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Layout from '@/components/Layout'

export default function VendorsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center neural-bg">
      <div className="text-cyan-400 text-xl">Loading...</div>
    </div>
  }

  if (!session) return null

  const vendors = [
    {
      id: 1,
      name: 'Manila Textile Supply Co.',
      category: 'Fabric Supplier',
      contact: 'Juan Dela Cruz',
      email: 'j.delacruz@manilatextile.com',
      phone: '+63 917 123 4567',
      address: 'Divisoria, Manila',
      rating: 4.8,
      orders: 156,
      totalSpent: 2450000,
      status: 'active',
      lastOrder: '2 days ago',
      paymentTerms: 'Net 30'
    },
    {
      id: 2,
      name: 'Pacific Ink Solutions',
      category: 'Ink & Chemicals',
      contact: 'Maria Santos',
      email: 'maria@pacificink.ph',
      phone: '+63 928 987 6543',
      address: 'Marikina City',
      rating: 4.9,
      orders: 89,
      totalSpent: 890000,
      status: 'active',
      lastOrder: '5 days ago',
      paymentTerms: 'Net 15'
    },
    {
      id: 3,
      name: 'Golden Thread Trading',
      category: 'Thread & Accessories',
      contact: 'Robert Tan',
      email: 'robert@goldenthread.com.ph',
      phone: '+63 935 456 7890',
      address: 'Binondo, Manila',
      rating: 4.6,
      orders: 203,
      totalSpent: 567000,
      status: 'active',
      lastOrder: '1 week ago',
      paymentTerms: 'COD'
    },
    {
      id: 4,
      name: 'Metro Zipper Corp',
      category: 'Hardware & Notions',
      contact: 'Linda Chen',
      email: 'linda@metrozipper.ph',
      phone: '+63 912 345 6789',
      address: 'Quezon City',
      rating: 4.3,
      orders: 67,
      totalSpent: 234000,
      status: 'pending',
      lastOrder: '3 weeks ago',
      paymentTerms: 'Net 30'
    }
  ]

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'active') return matchesSearch && vendor.status === 'active'
    if (activeTab === 'pending') return matchesSearch && vendor.status === 'pending'
    return matchesSearch
  })

  return (
    <Layout>
      <div className="neural-bg min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white glitch-text flex items-center gap-3" data-text="VENDORS">
              <Building className="w-8 h-8 text-cyan-400" />
              VENDORS
            </h1>
            <p className="text-cyan-300 font-mono">Supplier and vendor management system</p>
          </div>
          
          <div className="flex gap-3">
            <Button className="neon-btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
            <Button className="neon-btn-outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">TOTAL VENDORS</p>
                  <p className="text-3xl font-bold text-white">{vendors.length}</p>
                </div>
                <div className="ai-orb">
                  <Building className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">ACTIVE VENDORS</p>
                  <p className="text-3xl font-bold text-white">{vendors.filter(v => v.status === 'active').length}</p>
                </div>
                <div className="ai-orb">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">TOTAL SPENT</p>
                  <p className="text-3xl font-bold text-white">₱{(vendors.reduce((sum, v) => sum + v.totalSpent, 0) / 1000000).toFixed(1)}M</p>
                </div>
                <div className="ai-orb">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">AVG RATING</p>
                  <p className="text-3xl font-bold text-white">{(vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1)}</p>
                </div>
                <div className="ai-orb">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-input pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 rounded-lg p-1">
          {[
            { id: 'all', label: 'All Vendors', count: vendors.length },
            { id: 'active', label: 'Active', count: vendors.filter(v => v.status === 'active').length },
            { id: 'pending', label: 'Pending Review', count: vendors.filter(v => v.status === 'pending').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-mono text-sm ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              {tab.label}
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="quantum-card transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="ai-orb">
                      <Building className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{vendor.name}</h3>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                        {vendor.category}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={
                    vendor.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                  }>
                    {vendor.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 text-sm">Contact Person</span>
                    <span className="text-white font-mono text-sm">{vendor.contact}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{vendor.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{vendor.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{vendor.address}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold text-white">{vendor.rating}</span>
                      </div>
                      <span className="text-xs text-gray-400">Rating</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Package className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white">{vendor.orders}</span>
                      </div>
                      <span className="text-xs text-gray-400">Orders</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                    <div>
                      <span className="text-xs text-gray-400">Total Spent: </span>
                      <span className="font-bold text-green-400">₱{vendor.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{vendor.lastOrder}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Button className="neon-btn-outline text-xs flex-1">
                      <Mail className="w-3 h-3 mr-1" />
                      Contact
                    </Button>
                    <Button className="neon-btn-outline text-xs flex-1">
                      <Package className="w-3 h-3 mr-1" />
                      Orders
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <Card className="quantum-card">
            <CardContent className="p-8 text-center">
              <div className="ai-orb mx-auto mb-4">
                <Building className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No vendors found</h3>
              <p className="text-cyan-300">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first vendor'}
              </p>
              <Button className="neon-btn-primary mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Vendor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}