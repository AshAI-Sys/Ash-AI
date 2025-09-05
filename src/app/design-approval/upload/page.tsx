'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { 
  Upload, 
  FileImage, 
  X, 
  Save,
  AlertCircle,
  CheckCircle,
  Target,
  Palette,
  Package,
  ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function DesignUploadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [designData, setDesignData] = useState({
    orderId: '',
    designName: '',
    printingMethod: 'Silkscreen',
    placementAreas: [] as string[],
    notes: '',
    priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW'
  })
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  const printingMethods = [
    'Silkscreen',
    'Sublimation', 
    'DTF',
    'Embroidery'
  ]

  const placementOptions = [
    'Front Chest',
    'Back Center', 
    'Front Panel',
    'Back Panel',
    'Left Chest',
    'Right Chest',
    'Sleeves',
    'Full Print',
    'Hem',
    'Collar'
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        const isImage = file.type.startsWith('image/') || 
                       file.name.endsWith('.ai') || 
                       file.name.endsWith('.psd') ||
                       file.name.endsWith('.eps')
        return isImage && file.size < 50 * 1024 * 1024 // 50MB limit
      })
      setSelectedFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const togglePlacementArea = (area: string) => {
    setDesignData(prev => ({
      ...prev,
      placementAreas: prev.placementAreas.includes(area)
        ? prev.placementAreas.filter(a => a !== area)
        : [...prev.placementAreas, area]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadStatus('uploading')

    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In production, this would upload files and create design record
      const newDesign = {
        id: `DES-${Date.now()}`,
        ...designData,
        uploadedBy: session?.user?.full_name || 'Unknown',
        uploadedAt: new Date().toISOString(),
        status: 'Pending_Review',
        version: 1,
        files: selectedFiles.map(f => f.name)
      }

      console.log('Design uploaded:', newDesign)
      setUploadStatus('success')
      
      setTimeout(() => {
        router.push('/design-approval')
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
    }
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 8 }).map((_, i) => (
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

        <div className="relative z-10 p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold glitch-text text-white mb-2" data-text="Upload Design">
                Upload Design
              </h1>
              <p className="text-cyan-300 text-lg">
                Stage 2: Submit design for approval workflow
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-400" />
                  Design Information
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Basic details about the design
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderId" className="text-white">Order ID</Label>
                    <Input
                      id="orderId"
                      value={designData.orderId}
                      onChange={(e) => setDesignData(prev => ({ ...prev, orderId: e.target.value }))}
                      placeholder="ORD-2024-001"
                      className="neural-input"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="designName" className="text-white">Design Name</Label>
                    <Input
                      id="designName"
                      value={designData.designName}
                      onChange={(e) => setDesignData(prev => ({ ...prev, designName: e.target.value }))}
                      placeholder="Summer Collection Logo"
                      className="neural-input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="printingMethod" className="text-white">Printing Method</Label>
                    <select
                      id="printingMethod"
                      value={designData.printingMethod}
                      onChange={(e) => setDesignData(prev => ({ ...prev, printingMethod: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-md text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {printingMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="priority" className="text-white">Priority</Label>
                    <select
                      id="priority"
                      value={designData.priority}
                      onChange={(e) => setDesignData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-cyan-500/30 rounded-md text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Placement Areas */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  Placement Areas
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Select where the design will be placed on the garment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {placementOptions.map(area => (
                    <Button
                      key={area}
                      type="button"
                      variant="ghost"
                      onClick={() => togglePlacementArea(area)}
                      className={`p-3 text-sm border transition-all ${
                        designData.placementAreas.includes(area)
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border-cyan-500/30 text-white hover:border-cyan-400 hover:bg-cyan-500/10'
                      }`}
                    >
                      {area}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-cyan-400" />
                  Design Files
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Upload design files (Images, AI, PSD, EPS - Max 50MB each)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.ai,.psd,.eps"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">Click to upload files</p>
                    <p className="text-cyan-300 text-sm">or drag and drop your design files here</p>
                  </label>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white font-medium">Selected Files:</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-cyan-500/30">
                        <div className="flex items-center gap-3">
                          <FileImage className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-white text-sm font-medium">{file.name}</p>
                            <p className="text-cyan-300 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="quantum-card">
              <CardHeader>
                <CardTitle className="text-white">Additional Notes</CardTitle>
                <CardDescription className="text-cyan-300">
                  Any special instructions or comments for the approval team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={designData.notes}
                  onChange={(e) => setDesignData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any special instructions, color requirements, or approval notes..."
                  className="min-h-24 neural-input"
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                className="border border-gray-500/30 hover:border-gray-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadStatus === 'uploading' || selectedFiles.length === 0}
                className="neon-btn"
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Uploaded!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>

            {/* Status Messages */}
            {uploadStatus === 'error' && (
              <Card className="border-red-500/50 bg-red-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <p>Upload failed. Please try again.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {uploadStatus === 'success' && (
              <Card className="border-green-500/50 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <p>Design uploaded successfully! Redirecting to approval dashboard...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>
      </div>
    </Layout>
  )
}