/**
 * ASH AI - Routing Templates Management
 * Professional routing template creation and optimization with Ashley AI
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { RoutingTemplateBuilder } from '@/components/ash/RoutingTemplateBuilder'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Route,
  Zap,
  Settings,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Palette,
  Users,
  Archive
} from 'lucide-react'

interface RoutingTemplate {
  id: string
  name: string
  description?: string
  category: string
  is_default: boolean
  is_active: boolean
  created_at: string
  created_by?: {
    full_name: string
  }
  steps: Array<{
    id: string
    name: string
    workcenter: string
    sequence: number
  }>
  _count: {
    steps: number
    orders: number
  }
  ai_analysis?: {
    efficiency_score: number
    bottlenecks: Array<{
      step: string
      severity: string
      issue: string
    }>
    optimizations: Array<{
      type: string
      description: string
      estimated_improvement: number
    }>
    estimated_lead_time: number
  }
}

export default function RoutingTemplatesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [templates, setTemplates] = useState<RoutingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('browse')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchTemplates()
  }, [session, status, router, categoryFilter])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        include_steps: 'true',
        active_only: 'false',
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      })
      
      const response = await fetch(`/api/ash/routing-templates?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      } else {
        console.error('Failed to fetch templates')
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setActiveTab('builder')
    setSelectedTemplate(null)
  }

  const handleEditTemplate = (template_id: string) => {
    setSelectedTemplate(template_id)
    setActiveTab('builder')
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  const categories = ['all', ...new Set(templates.map(t => t.category))]

  if (status === 'loading' || loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ResponsiveLayout>
    )
  }

  if (!session) return null

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Routing Templates</h1>
            <p className="text-muted-foreground mt-1">
              Manage production workflows with AI-powered optimization
            </p>
          </div>
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Route className="w-4 h-4" />
              Browse Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Template Builder
            </TabsTrigger>
          </TabsList>

          {/* Browse Templates */}
          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleEditTemplate(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          {template.name}
                          {template.is_default && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {template.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Template Stats */}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{template._count.steps} steps</span>
                      <span>{template._count.orders} orders</span>
                    </div>

                    {/* Ashley AI Analysis */}
                    {template.ai_analysis && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Efficiency Score</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              template.ai_analysis.efficiency_score >= 0.8 ? 'bg-green-500' :
                              template.ai_analysis.efficiency_score >= 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <span className="text-sm font-medium">
                              {Math.round(template.ai_analysis.efficiency_score * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Est. Lead Time</span>
                          <span className="font-medium">
                            {template.ai_analysis.estimated_lead_time}h
                          </span>
                        </div>

                        {/* Bottlenecks */}
                        {template.ai_analysis.bottlenecks.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-muted-foreground">
                              {template.ai_analysis.bottlenecks.length} bottleneck(s)
                            </span>
                          </div>
                        )}

                        {/* Optimizations */}
                        {template.ai_analysis.optimizations.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Brain className="w-4 h-4 text-purple-500" />
                            <span className="text-muted-foreground">
                              {template.ai_analysis.optimizations.length} optimization(s)
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {template.created_by?.full_name || 'System'}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          template.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm text-muted-foreground">
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <Route className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No templates found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Create your first routing template to get started'
                  }
                </p>
                {!searchQuery && categoryFilter === 'all' && (
                  <Button onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Summary Cards */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{templates.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {templates.filter(t => t.is_active).length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {templates.length > 0 
                      ? Math.round((templates.reduce((sum, t) => 
                          sum + (t.ai_analysis?.efficiency_score || 0), 0) / templates.length) * 100)
                      : 0
                    }%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ashley AI assessment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Orders Using</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {templates.reduce((sum, t) => sum + t._count.orders, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total orders processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{categories.length - 1}</div>
                  <p className="text-xs text-muted-foreground">
                    Template categories
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Efficiency Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Efficiency Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {templates.map(template => (
                      <div key={template.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">{template.name}</span>
                          <span className="font-medium">
                            {Math.round((template.ai_analysis?.efficiency_score || 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (template.ai_analysis?.efficiency_score || 0) >= 0.8 ? 'bg-green-500' :
                              (template.ai_analysis?.efficiency_score || 0) >= 0.6 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ 
                              width: `${(template.ai_analysis?.efficiency_score || 0) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Usage Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Archive className="w-5 h-5 mr-2" />
                    Usage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {templates
                      .sort((a, b) => b._count.orders - a._count.orders)
                      .slice(0, 6)
                      .map(template => (
                        <div key={template.id} className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium truncate">{template.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {template.category}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{template._count.orders}</div>
                            <div className="text-sm text-muted-foreground">orders</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Template Builder */}
          <TabsContent value="builder" className="space-y-6">
            <RoutingTemplateBuilder 
              template_id={selectedTemplate}
              onSave={() => {
                fetchTemplates()
                setActiveTab('browse')
              }}
              onCancel={() => setActiveTab('browse')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  )
}