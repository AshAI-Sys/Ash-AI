'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { 
  Palette, 
  Upload,
  Eye,
  Check,
  X,
  Clock,
  Lock,
  Unlock,
  Download,
  MessageCircle,
  User,
  Calendar,
  Target,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Design {
  id: string
  orderId: string
  clientName: string
  designName: string
  version: number
  status: 'Pending_Review' | 'Client_Review' | 'Approved' | 'Revision_Requested' | 'Locked'
  uploadedBy: string
  uploadedAt: string
  approvedBy?: string
  approvedAt?: string
  lockedAt?: string
  printingMethod: string
  placementAreas: string[]
  fileUrl: string
  comments: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export default function DesignApprovalPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Mock data - Stage 2 Design & Approval
  const [designs] = useState<Design[]>([
    {
      id: 'DES-2024-001',
      orderId: 'ORD-2024-001',
      clientName: 'Premium Apparel Co.',
      designName: 'Summer Collection Logo',
      version: 1,
      status: 'Client_Review',
      uploadedBy: 'Ashley Chen',
      uploadedAt: '2024-12-01',
      printingMethod: 'Silkscreen',
      placementAreas: ['Front Chest', 'Back Center'],
      fileUrl: '/designs/summer-logo-v1.ai',
      comments: 2,
      priority: 'HIGH'
    },
    {
      id: 'DES-2024-002', 
      orderId: 'ORD-2024-002',
      clientName: 'Urban Streetwear',
      designName: 'Hoodie Graphics',
      version: 3,
      status: 'Approved',
      uploadedBy: 'Ashley Chen',
      uploadedAt: '2024-11-28',
      approvedBy: 'Client Portal',
      approvedAt: '2024-11-30',
      printingMethod: 'DTF',
      placementAreas: ['Front Panel', 'Sleeves'],
      fileUrl: '/designs/hoodie-graphics-v3.psd',
      comments: 5,
      priority: 'MEDIUM'
    },
    {
      id: 'DES-2024-003',
      orderId: 'ORD-2024-003', 
      clientName: 'Sports Academy',
      designName: 'Team Jersey Design',
      version: 2,
      status: 'Locked',
      uploadedBy: 'Ashley Chen',
      uploadedAt: '2024-11-25',
      approvedBy: 'Manager Portal',
      approvedAt: '2024-11-29',
      lockedAt: '2024-12-01',
      printingMethod: 'Sublimation',
      placementAreas: ['Full Print'],
      fileUrl: '/designs/team-jersey-v2.ai',
      comments: 1,
      priority: 'HIGH'
    }
  ])

  const [statusFilter, setStatusFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending_Review': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'Client_Review': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'Approved': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'Revision_Requested': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'Locked': return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending_Review': return <Clock className="w-4 h-4" />
      case 'Client_Review': return <User className="w-4 h-4" />
      case 'Approved': return <Check className="w-4 h-4" />
      case 'Revision_Requested': return <X className="w-4 h-4" />
      case 'Locked': return <Lock className="w-4 h-4" />
      default: return <Eye className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400 bg-red-500/20'
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20'
      case 'LOW': return 'text-green-400 bg-green-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         design.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         design.orderId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || design.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold glitch-text text-white mb-2" data-text="Design & Approval">
                Design & Approval
              </h1>
              <p className="text-cyan-300 text-lg">
                Stage 2: Neural design workflow control center
              </p>
            </div>
            <Button 
              className="neon-btn"
              onClick={() => router.push('/design-approval/upload')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Design
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card className="hologram-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">8</div>
                <p className="text-xs text-cyan-300">Awaiting designer review</p>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Client Review</CardTitle>
                <User className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">5</div>
                <p className="text-xs text-cyan-300">With client for approval</p>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Approved</CardTitle>
                <Check className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">23</div>
                <p className="text-xs text-cyan-300">Ready for production</p>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Locked</CardTitle>
                <Lock className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">18</div>
                <p className="text-xs text-cyan-300">Production locked</p>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Revisions</CardTitle>
                <X className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">3</div>
                <p className="text-xs text-cyan-300">Need updates</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="quantum-card mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                  <Input
                    placeholder="Search designs by name, client, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 neural-input"
                  />
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-md text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="All">All Status</option>
                  <option value="Pending_Review">Pending Review</option>
                  <option value="Client_Review">Client Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Revision_Requested">Revision Requested</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Designs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDesigns.map((design) => (
              <Card key={design.id} className="hologram-card hover:scale-105 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(design.priority)}>
                        {design.priority}
                      </Badge>
                      <span className="text-cyan-300 text-sm">v{design.version}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(design.status)}`}>
                      {getStatusIcon(design.status)}
                      {design.status.replace('_', ' ')}
                    </div>
                  </div>
                  <CardTitle className="text-white text-lg">{design.designName}</CardTitle>
                  <CardDescription className="text-cyan-300">
                    {design.clientName} • {design.orderId}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Design Preview Area */}
                    <div className="w-full h-32 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-cyan-500/30 flex items-center justify-center">
                      <Palette className="w-12 h-12 text-cyan-400/50" />
                    </div>

                    {/* Design Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-cyan-400">Method:</span>
                        <p className="text-white font-medium">{design.printingMethod}</p>
                      </div>
                      <div>
                        <span className="text-cyan-400">Uploaded:</span>
                        <p className="text-white font-medium">{design.uploadedAt}</p>
                      </div>
                    </div>

                    {/* Placement Areas */}
                    <div>
                      <span className="text-cyan-400 text-sm">Placement Areas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {design.placementAreas.map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs border-cyan-500/50 text-cyan-300">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Comments & Status Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-cyan-300">
                        <MessageCircle className="w-4 h-4" />
                        {design.comments} comments
                      </div>
                      {design.status === 'Locked' && (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Lock className="w-3 h-3" />
                          <span className="text-xs">Production Locked</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="flex-1 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      
                      {design.status === 'Pending_Review' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="border border-green-500/30 hover:border-green-400 hover:bg-green-500/10"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      
                      {design.status === 'Approved' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10"
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Lock
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Insights for Design Process */}
          <Card className="quantum-card neon-glow mt-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Ashley AI Design Insights
              </CardTitle>
              <CardDescription className="text-cyan-300">
                AI-powered design workflow optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">Approval Bottleneck</span>
                  </div>
                  <p className="text-xs text-white">
                    5 designs pending client review for {'>'}48hrs. Ashley suggests automated reminder system.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Design Quality</span>
                  </div>
                  <p className="text-xs text-white">
                    92% approval rate this week. Ashley recommends design template optimization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredDesigns.length === 0 && (
            <Card className="quantum-card">
              <CardContent className="text-center py-12">
                <Palette className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No designs found</h3>
                <p className="text-cyan-300 mb-4">
                  {searchTerm || statusFilter !== 'All' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'Upload your first design to begin the approval process'
                  }
                </p>
                <Button className="neon-btn" onClick={() => router.push('/design-approval/upload')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Design
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}