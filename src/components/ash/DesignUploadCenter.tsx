/**
 * ASH AI - Futuristic Design Upload Center
 * Advanced drag-and-drop design upload with AI validation
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  FileImage,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  Download,
  Zap,
  Brain,
  Sparkles,
  Palette,
  Settings,
  History,
  Camera,
  Layers,
  Monitor,
  Cpu
} from 'lucide-react'

interface DesignUploadCenterProps {
  orderId: string
  onUploadComplete?: (asset: any) => void
  onClose?: () => void
}

interface UploadedAsset {
  id: string
  file_name: string
  file_path: string
  version: number
  ashley_analysis?: {
    risk: string
    confidence: number
    issues_count: number
    recommendations_count: number
  }
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'analyzing' | 'complete' | 'error'
  error?: string
  result?: UploadedAsset
}

const DESIGN_TYPES = [
  { value: 'MOCKUP', label: 'Design Mockup', icon: Palette },
  { value: 'PRODUCTION_READY', label: 'Production Ready', icon: Settings },
  { value: 'REVISION', label: 'Design Revision', icon: History },
  { value: 'REFERENCE', label: 'Reference Material', icon: Eye },
  { value: 'PROOF', label: 'Client Proof', icon: CheckCircle }
]

export function DesignUploadCenter({ orderId, onUploadComplete, onClose }: DesignUploadCenterProps) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const [designType, setDesignType] = useState('MOCKUP')
  const [description, setDescription] = useState('')
  const [isReplacement, setIsReplacement] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }, [designType, description, isReplacement])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.tiff'],
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  })

  const uploadFile = async (file: File) => {
    const uploadId = `${file.name}-${Date.now()}`
    const initialProgress: UploadProgress = {
      file,
      progress: 0,
      status: 'uploading'
    }

    setUploads(prev => new Map(prev.set(uploadId, initialProgress)))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('order_id', orderId)
      formData.append('design_type', designType)
      formData.append('description', description)
      formData.append('is_replacement', isReplacement.toString())

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploads(prev => {
          const updated = new Map(prev)
          const current = updated.get(uploadId)
          if (current && current.status === 'uploading' && current.progress < 70) {
            updated.set(uploadId, { ...current, progress: current.progress + 10 })
          }
          return updated
        })
      }, 200)

      const response = await fetch('/api/designs/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      // Switch to analyzing phase
      setUploads(prev => {
        const updated = new Map(prev)
        updated.set(uploadId, { ...prev.get(uploadId)!, progress: 80, status: 'analyzing' })
        return updated
      })

      const result = await response.json()

      if (result.success) {
        setUploads(prev => {
          const updated = new Map(prev)
          updated.set(uploadId, {
            ...prev.get(uploadId)!,
            progress: 100,
            status: 'complete',
            result: result.asset
          })
          return updated
        })

        onUploadComplete?.(result.asset)
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (error) {
      setUploads(prev => {
        const updated = new Map(prev)
        updated.set(uploadId, {
          ...prev.get(uploadId)!,
          progress: 100,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        })
        return updated
      })
    }
  }

  const removeUpload = (uploadId: string) => {
    setUploads(prev => {
      const updated = new Map(prev)
      updated.delete(uploadId)
      return updated
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return <Upload className="w-4 h-4 animate-pulse text-blue-500" />
      case 'analyzing': return <Brain className="w-4 h-4 animate-pulse text-purple-500" />
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <FileImage className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'bg-blue-500'
      case 'analyzing': return 'bg-purple-500'
      case 'complete': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'GREEN': return 'bg-green-500'
      case 'AMBER': return 'bg-yellow-500'
      case 'RED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-blue-500" />
            Design Upload Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Advanced AI-powered design validation and processing
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Designs
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Processing Queue
            {uploads.size > 0 && (
              <Badge variant="secondary" className="ml-1">
                {uploads.size}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {/* Upload Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Upload Settings
              </CardTitle>
              <CardDescription>
                Configure design upload parameters for optimal processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="design-type">Design Type</Label>
                  <Select value={designType} onValueChange={setDesignType}>
                    <SelectTrigger id="design-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGN_TYPES.map(type => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center">
                              <Icon className="w-4 h-4 mr-2" />
                              {type.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isReplacement}
                      onChange={(e) => setIsReplacement(e.target.checked)}
                      className="mr-2"
                    />
                    Replacement Version
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark previous versions as superseded
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this design version..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Drag & Drop Zone */}
          <Card className="relative overflow-hidden">
            <div
              {...getRootProps()}
              className={`
                relative p-8 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer
                ${isDragActive || dragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} ref={fileInputRef} />
              
              {/* Animated Background */}
              {(isDragActive || dragActive) && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
              )}

              <div className="relative text-center space-y-4">
                <div className="flex justify-center">
                  <div className={`
                    p-4 rounded-full transition-all duration-300
                    ${isDragActive || dragActive 
                      ? 'bg-blue-100 text-blue-600 scale-110' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    <Upload className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {isDragActive ? 'Drop files here!' : 'Upload Design Files'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your design files or click to browse
                  </p>
                  <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
                    <span>• PNG, JPEG, SVG, PDF, TIFF</span>
                    <span>• Max 50MB per file</span>
                    <span>• AI validation included</span>
                  </div>
                </div>

                <Button variant="outline" className="mt-4">
                  <FileImage className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </div>
          </Card>

          {/* AI Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Brain className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Ashley AI Analysis</h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Intelligent design validation with printability assessment
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Layers className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">Version Control</h4>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-200">
                  Automatic versioning with change tracking and rollback
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Cpu className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Smart Processing</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-200">
                  Thumbnail generation and format optimization
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Processing Queue Tab */}
        <TabsContent value="queue" className="space-y-6">
          {uploads.size === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No uploads in progress</h3>
                <p className="text-muted-foreground">
                  Upload design files to see processing status here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.from(uploads.entries()).map(([uploadId, upload]) => (
                <Card key={uploadId} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(upload.status)}
                          <span className="font-medium truncate">{upload.file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {(upload.file.size / (1024 * 1024)).toFixed(1)}MB
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {upload.status === 'uploading' && 'Uploading file...'}
                          {upload.status === 'analyzing' && 'Ashley AI analyzing design...'}
                          {upload.status === 'complete' && 'Processing complete'}
                          {upload.status === 'error' && upload.error}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(uploadId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <Progress 
                        value={upload.progress} 
                        className={`h-2 ${getStatusColor(upload.status)}`}
                      />
                    </div>

                    {/* Results */}
                    {upload.status === 'complete' && upload.result && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              Version {upload.result.version}
                            </Badge>
                            {upload.result.ashley_analysis && (
                              <Badge 
                                variant="outline" 
                                className={`${getRiskColor(upload.result.ashley_analysis.risk)} text-white`}
                              >
                                {upload.result.ashley_analysis.risk} Risk
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {upload.result.ashley_analysis && (
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center space-x-4">
                              <span>
                                Confidence: {Math.round(upload.result.ashley_analysis.confidence * 100)}%
                              </span>
                              <span>
                                Issues: {upload.result.ashley_analysis.issues_count}
                              </span>
                              <span>
                                Recommendations: {upload.result.ashley_analysis.recommendations_count}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {upload.status === 'error' && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{upload.error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}