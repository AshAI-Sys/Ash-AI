// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { DesignUploadModal } from '@/components/design/DesignUploadModal'
import { DesignVersionHistory } from '@/components/design/DesignVersionHistory'
import { ProductionHandoffModal } from '@/components/design/ProductionHandoffModal'
import { 
  Palette,
  Upload,
  Eye,
  Edit3,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Image,
  FileText,
  Users,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Download,
  Share2,
  History,
  GitBranch,
  ArrowRight,
  Package
} from 'lucide-react'

interface Design {
  id: string
  name: string
  order_id: string
  po_number: string
  brand: string
  method: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'revision_needed'
  version: number
  createdBy: string
  created_at: string
  approvedBy?: string
  approvedAt?: string
  mockupUrl?: string
  notes?: string
  clientComments?: string
}

const mockDesigns: Design[] = [
  {
    id: '1',
    name: 'Corporate Logo Tee Design',
    order_id: 'order_1',
    po_number: 'REEF-2024-000123',
    brand: 'Reefer',
    method: 'Silkscreen',
    status: 'approved',
    version: 2,
    createdBy: 'John Doe (GA)',
    created_at: '2024-09-01T08:00:00Z',
    approvedBy: 'ABC Corporation',
    approvedAt: '2024-09-01T14:30:00Z',
    notes: 'Updated logo placement per client feedback'
  },
  {
    id: '2',
    name: 'Sports Jersey All-Over Print',
    order_id: 'order_2',
    po_number: 'SORB-2024-000098',
    brand: 'Sorbetes',
    method: 'Sublimation',
    status: 'pending_approval',
    version: 1,
    createdBy: 'Maria Garcia (GA)',
    created_at: '2024-09-01T10:15:00Z',
    notes: 'Full-color sublimation design with team logos'
  },
  {
    id: '3',
    name: 'Event Merchandise Design',
    order_id: 'order_3',
    po_number: 'REEF-2024-000124',
    brand: 'Reefer',
    method: 'DTF',
    status: 'revision_needed',
    version: 1,
    createdBy: 'Alex Thompson (GA)',
    created_at: '2024-08-31T16:45:00Z',
    clientComments: 'Please adjust text size and change background color'
  },
  {
    id: '4',
    name: 'Premium Hoodie Embroidery',
    order_id: 'order_4',
    po_number: 'SORB-2024-000099',
    brand: 'Sorbetes',
    method: 'Embroidery',
    status: 'draft',
    version: 1,
    createdBy: 'Sarah Chen (GA)',
    created_at: '2024-09-01T09:30:00Z',
    notes: 'Complex embroidery pattern - needs stitch count optimization'
  }
]

const mockOrders = [
  { id: 'order_1', po_number: 'REEF-2024-000123', method: 'Silkscreen', brand: 'Reefer' },
  { id: 'order_2', po_number: 'SORB-2024-000098', method: 'Sublimation', brand: 'Sorbetes' },
  { id: 'order_3', po_number: 'REEF-2024-000124', method: 'DTF', brand: 'Reefer' },
  { id: 'order_4', po_number: 'SORB-2024-000099', method: 'Embroidery', brand: 'Sorbetes' }
]

export default function DesignPage() {
  const [designs, setDesigns] = useState<Design[]>(mockDesigns)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showProductionHandoff, setShowProductionHandoff] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         design.po_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || design.status === statusFilter
    const matchesMethod = methodFilter === 'all' || design.method === methodFilter
    
    return matchesSearch && matchesStatus && matchesMethod
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending_approval': return 'bg-blue-100 text-blue-800'
      case 'revision_needed': return 'bg-orange-100 text-orange-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'pending_approval': return <Clock className="w-4 h-4" />
      case 'revision_needed': return <AlertTriangle className="w-4 h-4" />
      case 'rejected': return <AlertTriangle className="w-4 h-4" />
      case 'draft': return <Edit3 className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handleDesignUpload = async (designData: any) => {
    try {
      const apiData = {
        name: designData.name,
        order_id: designData.order_id,
        method: designData.method,
        type: 'MOCKUP',
        fileUrl: designData.mockupFile ? URL.createObjectURL(designData.mockupFile) : '',
        placements: designData.placements || [],
        palette: designData.colors || [],
        meta: {
          ...designData.ashleyAnalysis,
          printabilityScore: designData.printabilityScore,
          costEstimate: designData.costEstimate,
          productionFileUrl: designData.productionFile ? URL.createObjectURL(designData.productionFile) : '',
          separationFiles: designData.separationFiles?.map((file: File) => URL.createObjectURL(file)) || []
        }
      }

      const response = await fetch('/api/design/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })

      const result = await response.json()
      
      if (result.success) {
        // Add the new design to the UI
        const newDesign: Design = {
          id: result.asset.id,
          name: result.asset.name,
          order_id: designData.order_id,
          po_number: mockOrders.find(o => o.id === designData.order_id)?.po_number || '',
          brand: mockOrders.find(o => o.id === designData.order_id)?.brand || '',
          method: designData.method,
          status: 'draft',
          version: 1,
          createdBy: 'Current User (GA)',
          created_at: new Date().toISOString(),
          notes: designData.notes
        }
        
        setDesigns([newDesign, ...designs])
      } else {
        console.error('Failed to create design asset:', result.error)
        // Fallback to local state for demo purposes
        const fallbackDesign: Design = {
          id: `design_${Date.now()}`,
          name: designData.name,
          order_id: designData.order_id,
          po_number: mockOrders.find(o => o.id === designData.order_id)?.po_number || '',
          brand: mockOrders.find(o => o.id === designData.order_id)?.brand || '',
          method: designData.method,
          status: 'draft',
          version: 1,
          createdBy: 'Current User (GA)',
          created_at: new Date().toISOString(),
          notes: designData.notes
        }
        setDesigns([fallbackDesign, ...designs])
      }
    } catch (error) {
      console.error('Error uploading design:', error)
      // Fallback for demo
      const fallbackDesign: Design = {
        id: `design_${Date.now()}`,
        name: designData.name,
        order_id: designData.order_id,
        po_number: mockOrders.find(o => o.id === designData.order_id)?.po_number || '',
        brand: mockOrders.find(o => o.id === designData.order_id)?.brand || '',
        method: designData.method,
        status: 'draft',
        version: 1,
        createdBy: 'Current User (GA)',
        created_at: new Date().toISOString(),
        notes: designData.notes
      }
      setDesigns([fallbackDesign, ...designs])
    }
  }

  const handleViewVersionHistory = (design: Design) => {
    setSelectedDesign(design)
    setShowVersionHistory(true)
  }

  const handleCreateNewVersion = (design: Design) => {
    const newVersion: Design = {
      ...design,
      id: `${design.id}_v${design.version + 1}`,
      version: design.version + 1,
      status: 'draft',
      created_at: new Date().toISOString(),
      notes: `New version based on v${design.version}`
    }
    setDesigns([newVersion, ...designs])
  }

  const handleProductionHandoff = (design: Design) => {
    setSelectedDesign(design)
    setShowProductionHandoff(true)
  }

  const handleApproveDesign = async (design: Design) => {
    try {
      const response = await fetch(`/api/design/${design.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: 'Approved via design management interface' })
      })

      const result = await response.json()
      
      if (result.success) {
        setDesigns(prev => 
          prev.map(d => 
            d.id === design.id 
              ? { ...d, status: 'approved', approvedAt: new Date().toISOString() }
              : d
          )
        )
      }
    } catch (error) {
      console.error('Error approving design:', error)
      // Fallback for demo
      setDesigns(prev => 
        prev.map(d => 
          d.id === design.id 
            ? { ...d, status: 'approved', approvedAt: new Date().toISOString() }
            : d
        )
      )
    }
  }

  const handleRequestRevision = async (design: Design, comments: string) => {
    try {
      const response = await fetch(`/api/design/${design.id}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments, urgency: 'MEDIUM' })
      })

      const result = await response.json()
      
      if (result.success) {
        setDesigns(prev => 
          prev.map(d => 
            d.id === design.id 
              ? { ...d, status: 'revision_needed', clientComments: comments }
              : d
          )
        )
      }
    } catch (error) {
      console.error('Error requesting revision:', error)
      // Fallback for demo
      setDesigns(prev => 
        prev.map(d => 
          d.id === design.id 
            ? { ...d, status: 'revision_needed', clientComments: comments }
            : d
        )
      )
    }
  }

  const handleHandoffSubmit = (handoffData: any) => {
    console.log('Production handoff data:', handoffData)
    // Here you would typically send this to your backend
    // Update design status to indicate it's been handed off to production
    setDesigns(prev => 
      prev.map(d => 
        d.id === handoffData.design_id 
          ? { ...d, status: 'in_production' as any }
          : d
      )
    )
  }

  const stats = {
    total: designs.length,
    pending: designs.filter(d => d.status === 'pending_approval').length,
    approved: designs.filter(d => d.status === 'approved').length,
    needsRevision: designs.filter(d => d.status === 'revision_needed').length
  }

  return (
    <ResponsiveLayout>
      <div className="responsive-container mobile-dashboard tablet-dashboard laptop-dashboard desktop-dashboard">
        {/* Header */}
        <div className="mobile-header tablet-header laptop-header desktop-header">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold flex items-center space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Palette className="h-4 w-4 md:h-6 md:w-6 text-white" />
                </div>
                <span className="ash-gradient-text">Design Management</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm md:text-base">Upload, review, and manage design assets for production orders</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white btn-mobile md:btn-tablet lg:btn-laptop"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Upload Design</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid-mobile md:stats-grid-tablet lg:stats-grid-laptop xl:stats-grid-desktop">
          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total Designs</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Image className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900">{stats.pending}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-xl md:text-2xl font-bold text-green-900">{stats.approved}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card-mobile md:stats-card-tablet lg:stats-card-laptop xl:stats-card-desktop enhanced-card hover-lift">
            <CardContent className="p-responsive">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Needs Revision</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-900">{stats.needsRevision}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="enhanced-card">
          <CardContent className="p-responsive">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search designs by name or PO number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 form-mobile md:form-tablet lg:form-laptop"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white form-mobile md:form-tablet lg:form-laptop flex-1 sm:flex-initial"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="revision_needed">Needs Revision</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white form-mobile md:form-tablet lg:form-laptop flex-1 sm:flex-initial"
                >
                  <option value="all">All Methods</option>
                  <option value="Silkscreen">Silkscreen</option>
                  <option value="Sublimation">Sublimation</option>
                  <option value="DTF">DTF</option>
                  <option value="Embroidery">Embroidery</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Designs Grid */}
        <div className="designs-grid-mobile md:designs-grid-tablet lg:designs-grid-laptop xl:designs-grid-desktop">
          {filteredDesigns.map((design) => (
            <Card key={design.id} className="design-card-mobile md:design-card-tablet lg:design-card-laptop xl:design-card-desktop enhanced-card hover-lift">
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base md:text-lg font-semibold text-gray-900 mb-1 md:mb-2">
                      {design.name}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs md:text-sm text-gray-600">
                      <span>{design.po_number}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{design.brand}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="hide-mobile">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 md:space-y-4">
                {/* Status and Method */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Badge className={`flex items-center space-x-1 text-xs ${getStatusColor(design.status)}`}>
                    {getStatusIcon(design.status)}
                    <span className="capitalize">{design.status.replace('_', ' ')}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {design.method}
                  </Badge>
                </div>

                {/* Version and Creator */}
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span>Version {design.version}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="p-1 h-6 w-6"
                        onClick={() => handleViewVersionHistory(design)}
                      >
                        <History className="w-3 h-3" />
                      </Button>
                    </div>
                    <span>by {design.createdBy}</span>
                  </div>
                  <div className="mt-1">
                    Created {new Date(design.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Client Comments */}
                {design.clientComments && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start space-x-2">
                      <Users className="w-4 h-4 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Client Feedback:</p>
                        <p className="text-sm text-orange-700">{design.clientComments}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mobile-actions md:flex md:items-center md:space-x-2 md:space-y-0">
                  <Button size="sm" variant="outline" className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial">
                    <Eye className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Preview</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                  
                  {design.status === 'draft' && (
                    <Button 
                      size="sm" 
                      className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setDesigns(prev => 
                          prev.map(d => 
                            d.id === design.id 
                              ? { ...d, status: 'pending_approval' }
                              : d
                          )
                        )
                      }}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Send for Approval</span>
                      <span className="sm:hidden">Send</span>
                    </Button>
                  )}
                  
                  {design.status === 'pending_approval' && (
                    <>
                      <Button 
                        size="sm" 
                        className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveDesign(design)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Approve</span>
                        <span className="sm:hidden">✓</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          const comments = prompt('Enter revision comments:')
                          if (comments) handleRequestRevision(design, comments)
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Request Changes</span>
                        <span className="sm:hidden">Edit</span>
                      </Button>
                    </>
                  )}
                  
                  {design.status === 'revision_needed' && (
                    <Button 
                      size="sm" 
                      className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleCreateNewVersion(design)}
                    >
                      <GitBranch className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">New Version</span>
                      <span className="sm:hidden">Update</span>
                    </Button>
                  )}
                  
                  {design.status === 'approved' && (
                    <>
                      <Button size="sm" variant="outline" className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial">
                        <Download className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Download</span>
                        <span className="sm:hidden">Get</span>
                      </Button>
                      <Button 
                        size="sm" 
                        className="btn-mobile md:btn-tablet lg:btn-laptop flex-1 md:flex-initial bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                        onClick={() => handleProductionHandoff(design)}
                      >
                        <ArrowRight className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Hand Off</span>
                        <span className="sm:hidden">Send</span>
                      </Button>
                    </>
                  )}
                  
                  <Button size="sm" variant="ghost" className="btn-mobile md:btn-tablet lg:btn-laptop hide-mobile">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDesigns.length === 0 && (
          <Card className="enhanced-card">
            <CardContent className="p-12 text-center">
              <Palette className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No designs found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' || methodFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by uploading your first design'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && methodFilter === 'all' && (
                <Button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Design
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Design Upload Modal */}
        <DesignUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleDesignUpload}
          orderOptions={mockOrders}
        />

        {/* Design Version History Modal */}
        {selectedDesign && (
          <DesignVersionHistory
            design_id={selectedDesign.id}
            designName={selectedDesign.name}
            isOpen={showVersionHistory}
            onClose={() => {
              setShowVersionHistory(false)
              setSelectedDesign(null)
            }}
          />
        )}

        {/* Production Handoff Modal */}
        <ProductionHandoffModal
          design={selectedDesign}
          isOpen={showProductionHandoff}
          onClose={() => {
            setShowProductionHandoff(false)
            setSelectedDesign(null)
          }}
          onHandoff={handleHandoffSubmit}
        />
      </div>
    </ResponsiveLayout>
  )
}