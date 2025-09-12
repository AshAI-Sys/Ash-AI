// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Search, 
  Brain, 
  Zap, 
  TrendingUp, 
  Shield, 
  Star,
  Globe,
  Mail,
  Phone,
  Building,
  AlertTriangle
} from 'lucide-react'

interface Client {
  id: string
  name: string
  company?: string
  emails: string[]
  phones: string[]
  risk_score?: number
  ltv_prediction?: number
  ai_insights?: {
    total_orders: number
    avg_order_value: number
    client_status: string
    predicted_ltv: number
  }
  created_at: string
}

export default function FuturisticClientManager() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    emails: [''],
    phones: [''],
    billing_address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postal_code: ''
    },
    notes: '',
    ai_preferences: {
      preferred_communication: 'email',
      design_style: 'modern',
      delivery_preferences: 'standard'
    }
  })

  useEffect(() => {
    fetchClients()
  }, [searchTerm])

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/clients?search=${encodeURIComponent(searchTerm)}`)
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const createClient = async () => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          emails: newClient.emails.filter(email => email.trim() !== ''),
          phones: newClient.phones.filter(phone => phone.trim() !== '')
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setClients([result.data, ...clients])
        setShowCreateForm(false)
        setNewClient({
          name: '',
          company: '',
          emails: [''],
          phones: [''],
          billing_address: {
            street: '',
            city: '',
            state: '',
            country: '',
            postal_code: ''
          },
          notes: '',
          ai_preferences: {
            preferred_communication: 'email',
            design_style: 'modern',
            delivery_preferences: 'standard'
          }
        })
      }
    } catch (error) {
      console.error('Failed to create client:', error)
    }
  }

  const getRiskLevel = (score?: number) => {
    if (!score) return { level: 'UNKNOWN', color: 'bg-gray-500', textColor: 'text-gray-100' }
    if (score < 0.3) return { level: 'LOW', color: 'bg-green-500', textColor: 'text-green-100' }
    if (score < 0.6) return { level: 'MEDIUM', color: 'bg-yellow-500', textColor: 'text-yellow-100' }
    return { level: 'HIGH', color: 'bg-red-500', textColor: 'text-red-100' }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₱0'
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-xl font-light">Loading ASH AI Client Intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      {/* Futuristic Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/50">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Client Intelligence Hub
              </h1>
              <p className="text-gray-300 flex items-center mt-2">
                <Brain className="h-4 w-4 mr-2 text-cyan-400" />
                AI-Powered Client Relationship Management
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Client
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search clients with AI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.map((client) => {
          const risk = getRiskLevel(client.risk_score)
          return (
            <Card 
              key={client.id}
              className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
              onClick={() => setSelectedClient(client)}
            >
              <div className="p-6">
                {/* Client Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{client.name}</h3>
                    {client.company && (
                      <p className="text-gray-400 flex items-center text-sm">
                        <Building className="h-4 w-4 mr-1" />
                        {client.company}
                      </p>
                    )}
                  </div>
                  <Badge className={`${risk.color} ${risk.textColor} text-xs font-medium`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {risk.level} RISK
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {client.emails.length > 0 && (
                    <div className="flex items-center text-sm text-gray-300">
                      <Mail className="h-4 w-4 mr-2 text-cyan-400" />
                      {client.emails[0]}
                    </div>
                  )}
                  {client.phones.length > 0 && (
                    <div className="flex items-center text-sm text-gray-300">
                      <Phone className="h-4 w-4 mr-2 text-purple-400" />
                      {client.phones[0]}
                    </div>
                  )}
                </div>

                {/* AI Insights */}
                {client.ai_insights && (
                  <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <Brain className="h-4 w-4 mr-2 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">Ashley's Insights</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Total Orders</p>
                        <p className="text-white font-medium">{client.ai_insights.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Avg Order</p>
                        <p className="text-white font-medium">{Math.round(client.ai_insights.avg_order_value)} pcs</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <Badge 
                          className={client.ai_insights.client_status === 'ACTIVE' ? 
                            'bg-green-500/20 text-green-400' : 
                            'bg-gray-500/20 text-gray-400'
                          }
                        >
                          {client.ai_insights.client_status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-gray-400">Predicted LTV</p>
                        <p className="text-cyan-400 font-medium flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {formatCurrency(client.ai_insights.predicted_ltv)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Create Client Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Client</h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Client Name *</label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                    <Input
                      value={newClient.company}
                      onChange={(e) => setNewClient({...newClient, company: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <Input
                      value={newClient.emails[0]}
                      onChange={(e) => setNewClient({
                        ...newClient, 
                        emails: [e.target.value, ...newClient.emails.slice(1)]
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="client@company.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                    <Input
                      value={newClient.phones[0]}
                      onChange={(e) => setNewClient({
                        ...newClient, 
                        phones: [e.target.value, ...newClient.phones.slice(1)]
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <Textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Additional notes about the client..."
                    rows={3}
                  />
                </div>

                {/* AI Preferences */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-cyan-400 mb-3 flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Ashley AI Preferences
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Communication</label>
                      <select 
                        value={newClient.ai_preferences.preferred_communication}
                        onChange={(e) => setNewClient({
                          ...newClient,
                          ai_preferences: {
                            ...newClient.ai_preferences,
                            preferred_communication: e.target.value
                          }
                        })}
                        className="w-full bg-slate-600 border-slate-500 text-white rounded px-3 py-2"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Design Style</label>
                      <select 
                        value={newClient.ai_preferences.design_style}
                        onChange={(e) => setNewClient({
                          ...newClient,
                          ai_preferences: {
                            ...newClient.ai_preferences,
                            design_style: e.target.value
                          }
                        })}
                        className="w-full bg-slate-600 border-slate-500 text-white rounded px-3 py-2"
                      >
                        <option value="modern">Modern</option>
                        <option value="classic">Classic</option>
                        <option value="minimalist">Minimalist</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Delivery</label>
                      <select 
                        value={newClient.ai_preferences.delivery_preferences}
                        onChange={(e) => setNewClient({
                          ...newClient,
                          ai_preferences: {
                            ...newClient.ai_preferences,
                            delivery_preferences: e.target.value
                          }
                        })}
                        className="w-full bg-slate-600 border-slate-500 text-white rounded px-3 py-2"
                      >
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                        <option value="economy">Economy</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createClient}
                    disabled={!newClient.name.trim()}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Create with AI Analysis
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {clients.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-24 w-24 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-400 mb-2">No clients found</h3>
          <p className="text-gray-500 mb-6">Start by creating your first client with AI-powered insights</p>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Client
          </Button>
        </div>
      )}
    </div>
  )
}