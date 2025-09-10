'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle,
  XCircle,
  MessageSquare,
  Download,
  Eye,
  Zoom,
  RotateCcw,
  Share2,
  Clock,
  User,
  Calendar,
  Package,
  Palette,
  AlertTriangle,
  Star,
  Heart,
  ThumbsUp
} from 'lucide-react'
import Image from 'next/image'

interface DesignApproval {
  id: string
  designName: string
  po_number: string
  brand: string
  method: string
  version: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  approvedAt?: string
  mockupUrl: string
  productionSpecs: {
    colors: string[]
    placements: { area: string; size: string }[]
    materials: string[]
  }
  clientComments?: string
  designerNotes?: string
  companyName: string
  approvalDeadline: string
}

interface ClientApprovalPortalProps {
  approvalId: string
  designData: DesignApproval
  onApprove: (comments?: string) => void
  onReject: (comments: string) => void
  onRequestChanges: (comments: string) => void
}

// Mock design approval data
const mockDesignApproval: DesignApproval = {
  id: 'approval_001',
  designName: 'Corporate Event T-Shirt Design',
  po_number: 'REEF-2024-000123',
  brand: 'Reefer',
  method: 'Silkscreen',
  version: 2,
  status: 'pending',
  submittedAt: '2024-09-01T10:00:00Z',
  mockupUrl: '/api/placeholder/400/500',
  productionSpecs: {
    colors: ['#1a1a1a', '#ffffff', '#ff6b35'],
    placements: [
      { area: 'Front Center', size: '25cm x 30cm' },
      { area: 'Left Sleeve', size: '8cm x 8cm' }
    ],
    materials: ['100% Cotton', 'Plastisol Ink', 'Water-based Ink']
  },
  designerNotes: 'Updated logo placement based on previous feedback. Increased contrast for better visibility.',
  companyName: 'ABC Corporation',
  approvalDeadline: '2024-09-03T17:00:00Z'
}

export function ClientApprovalPortal({ 
  approvalId, 
  designData = mockDesignApproval, 
  onApprove, 
  onReject, 
  onRequestChanges 
}: ClientApprovalPortalProps) {
  const [feedback, setFeedback] = useState('')
  const [zoom, setZoom] = useState(100)
  const [showSpecs, setShowSpecs] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reaction, setReaction] = useState<'love' | 'like' | null>(null)

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      onApprove(feedback)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim()) {
      alert('Please provide feedback for rejection')
      return
    }
    
    setIsSubmitting(true)
    try {
      onReject(feedback)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      alert('Please provide specific change requests')
      return
    }
    
    setIsSubmitting(true)
    try {
      onRequestChanges(feedback)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isApprovalExpired = new Date() > new Date(designData.approvalDeadline)
  const timeRemaining = Math.ceil((new Date(designData.approvalDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="enhanced-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Palette className="w-6 w-6 text-white" />
                  </div>
                  <span>{designData.designName}</span>
                </CardTitle>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Package className="w-4 h-4" />
                    <span>{designData.po_number}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{designData.brand}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Version {designData.version}</span>
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <Badge 
                  className={`mb-2 ${
                    isApprovalExpired ? 'bg-red-100 text-red-800' :
                    timeRemaining <= 1 ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {isApprovalExpired ? 'Expired' : `${timeRemaining} day${timeRemaining !== 1 ? 's' : ''} remaining`}
                </Badge>
                <div className="text-sm text-gray-600">
                  Deadline: {new Date(designData.approvalDeadline).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Preview */}
          <Card className="enhanced-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>Design Preview</span>
                </CardTitle>
                
                <div className="flex items-center space-x-2">
                  {/* Quick Reactions */}
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant={reaction === 'love' ? 'default' : 'ghost'}
                      onClick={() => setReaction(reaction === 'love' ? null : 'love')}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Heart className={`w-4 h-4 ${reaction === 'love' ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant={reaction === 'like' ? 'default' : 'ghost'}
                      onClick={() => setReaction(reaction === 'like' ? null : 'like')}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <ThumbsUp className={`w-4 h-4 ${reaction === 'like' ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setZoom(Math.max(50, zoom - 25))}
                      disabled={zoom <= 50}
                    >
                      -
                    </Button>
                    <span className="text-xs px-2">{zoom}%</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setZoom(Math.min(200, zoom + 25))}
                      disabled={zoom >= 200}
                    >
                      +
                    </Button>
                  </div>
                  
                  <Button size="sm" variant="ghost" onClick={() => setZoom(100)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="relative bg-gray-100 rounded-lg p-8 min-h-96 flex items-center justify-center overflow-auto">
                <div 
                  style={{ transform: `scale(${zoom / 100})` }}
                  className="transition-transform duration-300"
                >
                  <div className="bg-white rounded-lg shadow-xl p-6">
                    <div className="w-64 h-80 bg-gradient-to-b from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Image 
                          src="/api/placeholder/200/250" 
                          alt="Design Mockup" 
                          width={200} 
                          height={250}
                          className="rounded-lg"
                        />
                        <p className="mt-4 text-sm font-medium">T-Shirt Mockup</p>
                        <p className="text-xs">{designData.method}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setShowSpecs(!showSpecs)}
                >
                  {showSpecs ? 'Hide' : 'Show'} Specifications
                </Button>
                
                <div className="flex space-x-2">
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
              
              {/* Production Specifications */}
              {showSpecs && (
                <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">Production Specifications</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Colors Used</h5>
                      <div className="flex flex-wrap gap-2">
                        {designData.productionSpecs.colors.map((color, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Print Placements</h5>
                      <div className="space-y-1">
                        {designData.productionSpecs.placements.map((placement, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{placement.area}:</span> {placement.size}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Materials</h5>
                    <div className="flex flex-wrap gap-2">
                      {designData.productionSpecs.materials.map((material, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Actions */}
          <div className="space-y-6">
            {/* Designer Notes */}
            {designData.designerNotes && (
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span>Designer Notes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{designData.designerNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Feedback Form */}
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="text-lg">Your Feedback</CardTitle>
                <p className="text-sm text-gray-600">
                  Please provide your feedback on this design. Your input helps us deliver exactly what you need.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Share your thoughts, requests for changes, or approval comments..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-32"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={isSubmitting || isApprovalExpired}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Approving...' : 'Approve Design'}
                  </Button>
                  
                  <Button
                    onClick={handleRequestChanges}
                    disabled={isSubmitting || isApprovalExpired || !feedback.trim()}
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Requesting...' : 'Request Changes'}
                  </Button>
                  
                  <Button
                    onClick={handleReject}
                    disabled={isSubmitting || isApprovalExpired || !feedback.trim()}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Rejecting...' : 'Reject Design'}
                  </Button>
                </div>
                
                {isApprovalExpired && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-red-800 font-medium">Approval Period Expired</p>
                        <p className="text-red-700 text-sm">Please contact your account manager to extend the approval deadline.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Information */}
            <Card className="enhanced-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>Order Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Number:</span>
                    <span className="font-medium">{designData.po_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-medium">{designData.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{designData.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-medium">v{designData.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium">{new Date(designData.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Help Section */}
        <Card className="enhanced-card bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Need Help?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Approval Process</h4>
                <p className="text-blue-700">Review the design and provide feedback. You can approve, request changes, or reject.</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Making Changes</h4>
                <p className="text-blue-700">Use "Request Changes" to ask for specific modifications with detailed feedback.</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Contact Support</h4>
                <p className="text-blue-700">Questions? Contact your account manager or call our support team.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}