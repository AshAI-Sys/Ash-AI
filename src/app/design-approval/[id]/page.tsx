'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { 
  Lock,
  Unlock,
  Check,
  X,
  MessageCircle,
  Download,
  Edit,
  Clock,
  User,
  Target,
  Printer,
  ArrowLeft,
  AlertTriangle,
  Zap,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface DesignDetail {
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
  lockedBy?: string
  printingMethod: string
  placementAreas: string[]
  fileUrl: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  comments: any[]
  printingSpecs?: {
    colors: string[]
    screenCount: number
    setupTime: number
    estPrintTime: number
    materialSpecs: string[]
  }
  patternAreas?: {
    frontChest?: { width: number, height: number, position: string }
    backCenter?: { width: number, height: number, position: string }
    sleeves?: { width: number, height: number, position: string }
  }
}

export default function DesignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [design, setDesign] = useState<DesignDetail | null>(null)
  const [newComment, setNewComment] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  // Resolve params promise
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // Mock data - would be fetched from API
  useEffect(() => {
    if (!resolvedParams) return
    
    const mockDesign: DesignDetail = {
      id: resolvedParams.id,
      orderId: 'ORD-2024-001',
      clientName: 'Premium Apparel Co.',
      designName: 'Summer Collection Logo',
      version: 1,
      status: 'Approved',
      uploadedBy: 'Ashley Chen',
      uploadedAt: '2024-12-01',
      approvedBy: 'Manager Portal',
      approvedAt: '2024-12-02',
      printingMethod: 'Silkscreen',
      placementAreas: ['Front Chest', 'Back Center'],
      fileUrl: '/designs/summer-logo-v1.ai',
      priority: 'HIGH',
      comments: [
        {
          id: 1,
          author: 'Ashley Chen',
          message: 'Initial design upload for client review',
          timestamp: '2024-12-01 10:30',
          type: 'info'
        },
        {
          id: 2,
          author: 'Client Portal',
          message: 'Looks great! Approved for production.',
          timestamp: '2024-12-02 14:15',
          type: 'approval'
        }
      ],
      // Connected to printing specs (Stage 2 → Stage 4 connection)
      printingSpecs: {
        colors: ['Cyan Blue', 'White'],
        screenCount: 2,
        setupTime: 45,
        estPrintTime: 3.5,
        materialSpecs: ['Water-based ink', 'Mesh count: 110']
      },
      // Pattern areas by size (Stage 2 → Stage 3 connection)
      patternAreas: {
        frontChest: { width: 8, height: 6, position: 'center' },
        backCenter: { width: 12, height: 10, position: 'center' }
      }
    }
    setDesign(mockDesign)
  }, [resolvedParams])

  const handleAction = async (action: string) => {
    setActionLoading(action)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (action === 'lock_design' && design) {
        setDesign(prev => prev ? {
          ...prev,
          status: 'Locked',
          lockedAt: new Date().toISOString(),
          lockedBy: session?.user?.full_name || 'Current User'
        } : null)
      }
      
      if (action === 'unlock_design' && design) {
        setDesign(prev => prev ? {
          ...prev,
          status: 'Approved',
          lockedAt: undefined,
          lockedBy: undefined
        } : null)
      }
      
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const addComment = () => {
    if (!newComment.trim() || !design) return
    
    const comment = {
      id: design.comments.length + 1,
      author: session?.user?.full_name || 'Current User',
      message: newComment,
      timestamp: new Date().toLocaleString(),
      type: 'comment'
    }
    
    setDesign(prev => prev ? {
      ...prev,
      comments: [...prev.comments, comment]
    } : null)
    
    setNewComment('')
  }

  if (!design) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="quantum-loader w-16 h-16 mx-auto mb-8">
              <div></div><div></div><div></div>
            </div>
            <p className="text-cyan-300">Loading design details...</p>
          </div>
        </div>
      </Layout>
    )
  }

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

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 10 }).map((_, i) => (
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
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/design-approval')}
              className="border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Designs
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-white">{design.designName}</h1>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(design.status)}`}>
                  {design.status === 'Locked' ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {design.status.replace('_', ' ')}
                </div>
              </div>
              <p className="text-cyan-300">
                {design.clientName} • {design.orderId} • Version {design.version}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Design Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Design Preview */}
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white">Design Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-cyan-500/30 flex items-center justify-center">
                    <div className="text-center">
                      <Eye className="w-16 h-16 text-cyan-400/50 mx-auto mb-4" />
                      <p className="text-cyan-300">Design Preview</p>
                      <p className="text-sm text-cyan-400">{design.fileUrl}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button className="neon-btn flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download Original
                    </Button>
                    <Button variant="ghost" className="border border-cyan-500/30 hover:border-cyan-400">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Printing Specifications */}
              {design.printingSpecs && (
                <Card className="quantum-card">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Printer className="w-5 h-5 text-cyan-400" />
                      Printing Specifications
                    </CardTitle>
                    <CardDescription className="text-cyan-300">
                      Connected specs for {design.printingMethod} production
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-cyan-400 text-sm">Colors:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {design.printingSpecs.colors.map((color, index) => (
                            <Badge key={index} variant="outline" className="text-xs border-cyan-500/50 text-cyan-300">
                              {color}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-cyan-400 text-sm">Screen Count:</span>
                        <p className="text-white font-medium">{design.printingSpecs.screenCount}</p>
                      </div>
                      <div>
                        <span className="text-cyan-400 text-sm">Setup Time:</span>
                        <p className="text-white font-medium">{design.printingSpecs.setupTime} min</p>
                      </div>
                      <div>
                        <span className="text-cyan-400 text-sm">Est. Print Time:</span>
                        <p className="text-white font-medium">{design.printingSpecs.estPrintTime} hrs</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <span className="text-cyan-400 text-sm">Material Specs:</span>
                      <ul className="list-disc list-inside text-white text-sm mt-1 space-y-1">
                        {design.printingSpecs.materialSpecs.map((spec, index) => (
                          <li key={index}>{spec}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pattern Areas */}
              {design.patternAreas && (
                <Card className="quantum-card">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-cyan-400" />
                      Pattern Areas & Sizing
                    </CardTitle>
                    <CardDescription className="text-cyan-300">
                      Placement dimensions for cutting optimization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(design.patternAreas).map(([area, specs]) => (
                        <div key={area} className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border border-cyan-500/20">
                          <h4 className="text-white font-medium mb-2 capitalize">{area.replace(/([A-Z])/g, ' $1')}</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="text-cyan-400">Size:</span> <span className="text-white">{specs.width}" × {specs.height}"</span></p>
                            <p><span className="text-cyan-400">Position:</span> <span className="text-white capitalize">{specs.position}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-cyan-400" />
                    Comments & Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {design.comments.map((comment) => (
                      <div key={comment.id} className="p-4 rounded-lg bg-slate-800/50 border border-cyan-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-cyan-400" />
                          <span className="text-white font-medium">{comment.author}</span>
                          <span className="text-cyan-300 text-sm">{comment.timestamp}</span>
                        </div>
                        <p className="text-white text-sm">{comment.message}</p>
                      </div>
                    ))}
                    
                    {/* Add Comment */}
                    <div className="border-t border-cyan-500/20 pt-4">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment or note..."
                        className="neural-input mb-3"
                      />
                      <Button onClick={addComment} className="neon-btn" disabled={!newComment.trim()}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              {/* Design Status Actions */}
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white">Design Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {design.status === 'Approved' && (
                    <Button
                      onClick={() => handleAction('lock_design')}
                      disabled={actionLoading === 'lock_design'}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                    >
                      {actionLoading === 'lock_design' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      Lock for Production
                    </Button>
                  )}
                  
                  {design.status === 'Locked' && (
                    <Button
                      onClick={() => handleAction('unlock_design')}
                      disabled={actionLoading === 'unlock_design'}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                    >
                      {actionLoading === 'unlock_design' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Unlock className="w-4 h-4 mr-2" />
                      )}
                      Unlock Design
                    </Button>
                  )}

                  <Button variant="ghost" className="w-full border border-green-500/30 hover:border-green-400 hover:bg-green-500/10">
                    <Check className="w-4 h-4 mr-2" />
                    Approve Changes
                  </Button>

                  <Button variant="ghost" className="w-full border border-red-500/30 hover:border-red-400 hover:bg-red-500/10">
                    <X className="w-4 h-4 mr-2" />
                    Request Revision
                  </Button>
                </CardContent>
              </Card>

              {/* Design Details */}
              <Card className="hologram-card">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Design Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-cyan-400">Priority:</span>
                    <Badge className={`ml-2 ${design.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : design.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                      {design.priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-cyan-400">Method:</span>
                    <p className="text-white font-medium">{design.printingMethod}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400">Uploaded:</span>
                    <p className="text-white">{design.uploadedAt}</p>
                    <p className="text-cyan-300 text-xs">by {design.uploadedBy}</p>
                  </div>
                  {design.approvedAt && (
                    <div>
                      <span className="text-cyan-400">Approved:</span>
                      <p className="text-white">{design.approvedAt}</p>
                      <p className="text-cyan-300 text-xs">by {design.approvedBy}</p>
                    </div>
                  )}
                  {design.lockedAt && (
                    <div>
                      <span className="text-cyan-400">Locked:</span>
                      <p className="text-white">{design.lockedAt}</p>
                      <p className="text-cyan-300 text-xs">by {design.lockedBy}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ashley AI Insights */}
              <Card className="quantum-card neon-glow">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Ashley AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
                      <p className="text-white text-xs">
                        This design is optimized for 2-color silkscreen. Estimated 3.5hr print time for 500 units.
                      </p>
                    </div>
                    
                    {design.status === 'Locked' && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                        <p className="text-white text-xs">
                          Design locked - Production can begin. Pattern areas optimized for minimal waste.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}