'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  History, 
  Clock, 
  User, 
  FileText, 
  Download, 
  Eye, 
  GitCompareArrows,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Edit3,
  Upload,
  MessageSquare
} from 'lucide-react'

interface DesignVersion {
  id: string
  version: number
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'revision_needed'
  createdBy: string
  created_at: string
  changes: string[]
  fileUrl: string
  fileSize: string
  comments?: string
  clientFeedback?: string
  approvedBy?: string
  approvedAt?: string
}

interface DesignVersionHistoryProps {
  design_id: string
  designName: string
  isOpen: boolean
  onClose: () => void
}

const mockVersions: DesignVersion[] = [
  {
    id: 'v3',
    version: 3,
    status: 'approved',
    createdBy: 'John Doe (GA)',
    created_at: '2024-09-01T14:30:00Z',
    changes: ['Updated logo placement', 'Adjusted color saturation', 'Fixed typography alignment'],
    fileUrl: '/designs/corporate-logo-v3.ai',
    fileSize: '2.4 MB',
    comments: 'Final version with all client feedback incorporated',
    approvedBy: 'ABC Corporation',
    approvedAt: '2024-09-01T14:45:00Z'
  },
  {
    id: 'v2',
    version: 2,
    status: 'revision_needed',
    createdBy: 'John Doe (GA)',
    created_at: '2024-08-31T16:15:00Z',
    changes: ['Increased logo size', 'Changed background color', 'Added company tagline'],
    fileUrl: '/designs/corporate-logo-v2.ai',
    fileSize: '2.2 MB',
    clientFeedback: 'Logo needs to be moved to center, tagline font too small'
  },
  {
    id: 'v1',
    version: 1,
    status: 'draft',
    createdBy: 'John Doe (GA)',
    created_at: '2024-08-31T10:00:00Z',
    changes: ['Initial design creation', 'Basic layout setup', 'Color scheme applied'],
    fileUrl: '/designs/corporate-logo-v1.ai',
    fileSize: '1.8 MB',
    comments: 'Initial concept based on client brief'
  }
]

export function DesignVersionHistory({ design_id, designName, isOpen, onClose }: DesignVersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)

  if (!isOpen) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending_approval': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'revision_needed': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      }
      if (prev.length < 2) {
        return [...prev, versionId]
      }
      return [prev[1], versionId]
    })
  }

  const handleCompareVersions = () => {
    if (selectedVersions.length === 2) {
      setShowComparison(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="glass-card w-full max-w-sm md:max-w-2xl lg:max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col modal-mobile md:modal-tablet lg:modal-laptop xl:modal-desktop">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Version History</CardTitle>
                <p className="text-white/70">{designName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {selectedVersions.length === 2 && (
                <Button 
                  onClick={handleCompareVersions}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <GitCompareArrows className="w-4 h-4 mr-2" />
                  Compare Versions
                </Button>
              )}
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {!showComparison ? (
            <div className="space-y-6">
              <div className="text-sm text-white/70 mb-4">
                Select up to 2 versions to compare them side by side
              </div>
              
              {mockVersions.map((version, index) => (
                <div key={version.id} className="relative">
                  {index < mockVersions.length - 1 && (
                    <div className="absolute left-6 top-20 w-px h-8 bg-gradient-to-b from-purple-400 to-transparent"></div>
                  )}
                  
                  <Card className={`enhanced-card hover-lift transition-all ${
                    selectedVersions.includes(version.id) ? 'ring-2 ring-purple-400' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                            v{version.version}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={`flex items-center space-x-1 ${getStatusColor(version.status)}`}>
                                {getStatusIcon(version.status)}
                                <span className="capitalize">{version.status.replace('_', ' ')}</span>
                              </Badge>
                              <span className="text-sm text-gray-500">{version.fileSize}</span>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center space-x-4">
                              <span className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{version.createdBy}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(version.created_at).toLocaleString()}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant={selectedVersions.includes(version.id) ? "default" : "outline"}
                            onClick={() => handleVersionSelect(version.id)}
                            className={selectedVersions.includes(version.id) ? "bg-purple-600 hover:bg-purple-700" : ""}
                          >
                            {selectedVersions.includes(version.id) ? "Selected" : "Select"}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Changes */}
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          Changes Made
                        </h4>
                        <ul className="space-y-1">
                          {version.changes.map((change, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start space-x-2">
                              <ArrowRight className="w-3 h-3 mt-1 text-purple-500" />
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Comments */}
                      {version.comments && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">Designer Notes:</p>
                              <p className="text-sm text-blue-700">{version.comments}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Client Feedback */}
                      {version.clientFeedback && (
                        <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="w-4 h-4 text-orange-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-orange-800">Client Feedback:</p>
                              <p className="text-sm text-orange-700">{version.clientFeedback}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Approval Info */}
                      {version.approvedBy && version.approvedAt && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                Approved by {version.approvedBy}
                              </span>
                            </div>
                            <span className="text-sm text-green-700">
                              {new Date(version.approvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Version Comparison</h3>
                <Button onClick={() => setShowComparison(false)} variant="outline" className="text-white border-white/20">
                  Back to History
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedVersions.map(versionId => {
                  const version = mockVersions.find(v => v.id === versionId)
                  if (!version) return null
                  
                  return (
                    <Card key={version.id} className="enhanced-card">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">
                            v{version.version}
                          </div>
                          <span>Version {version.version}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                          <span className="text-gray-500">Design Preview</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><strong>Status:</strong> {version.status.replace('_', ' ')}</div>
                          <div><strong>Created:</strong> {new Date(version.created_at).toLocaleDateString()}</div>
                          <div><strong>Size:</strong> {version.fileSize}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  )
}