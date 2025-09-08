'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Send, 
  Search, 
  Filter,
  Bell,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react'
import Layout from '@/components/Layout'

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

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

  const messages = [
    {
      id: 1,
      sender: 'Ashley AI',
      avatar: '🤖',
      subject: 'Production Alert: Line 3 Efficiency Drop',
      preview: 'Detected 15% efficiency drop in Line 3. Recommend immediate inspection...',
      time: '2 min ago',
      unread: true,
      priority: 'high',
      type: 'system'
    },
    {
      id: 2,
      sender: 'Maria Santos',
      avatar: '👩‍💼',
      subject: 'Order #ASH-2025-00234 Approval Request',
      preview: 'Client has requested rush delivery for 500 pcs hoodies. Please approve...',
      time: '15 min ago',
      unread: true,
      priority: 'medium',
      type: 'request'
    },
    {
      id: 3,
      sender: 'System Notification',
      avatar: '⚙️',
      subject: 'Inventory Low Stock Alert',
      preview: 'CVC-160-WHITE stock level critical: 5 units remaining...',
      time: '1 hour ago',
      unread: false,
      priority: 'medium',
      type: 'alert'
    },
    {
      id: 4,
      sender: 'John Dela Cruz',
      avatar: '👨‍🔧',
      subject: 'Machine Maintenance Completed',
      preview: 'Embroidery Machine #3 maintenance completed successfully. Ready for production...',
      time: '3 hours ago',
      unread: false,
      priority: 'low',
      type: 'update'
    },
    {
      id: 5,
      sender: 'Finance Team',
      avatar: '💰',
      subject: 'Daily Revenue Report',
      preview: 'Today\'s revenue: ₱24,580 (↑8% vs yesterday). Outstanding invoices: ₱156,200...',
      time: '5 hours ago',
      unread: false,
      priority: 'low',
      type: 'report'
    }
  ]

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         msg.sender.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'unread') return matchesSearch && msg.unread
    if (activeTab === 'alerts') return matchesSearch && (msg.type === 'alert' || msg.type === 'system')
    return matchesSearch
  })

  const unreadCount = messages.filter(msg => msg.unread).length

  return (
    <Layout>
      <div className="neural-bg min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white glitch-text flex items-center gap-3" data-text="MESSAGES">
              <MessageCircle className="w-8 h-8 text-cyan-400" />
              MESSAGES
              {unreadCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                  {unreadCount} NEW
                </Badge>
              )}
            </h1>
            <p className="text-cyan-300 font-mono">System notifications and team communications</p>
          </div>
          
          <div className="flex gap-3">
            <Button className="neon-btn-primary">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button className="neon-btn-outline">
              <Users className="w-4 h-4 mr-2" />
              Team Chat
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-input pl-10"
            />
          </div>
          <Button className="neon-btn-outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 rounded-lg p-1">
          {[
            { id: 'all', label: 'All Messages', count: messages.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'alerts', label: 'Alerts', count: messages.filter(m => m.type === 'alert' || m.type === 'system').length }
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
              {tab.count > 0 && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="space-y-3">
          {filteredMessages.map((message) => (
            <Card key={message.id} className={`quantum-card transition-all duration-300 hover:scale-105 cursor-pointer ${
              message.unread ? 'border-cyan-500/50 shadow-cyan-500/20' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`ai-orb ${message.unread ? 'animate-pulse' : ''}`}>
                    <span className="text-lg">{message.avatar}</span>
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold ${message.unread ? 'text-white' : 'text-cyan-300'}`}>
                        {message.sender}
                      </span>
                      {message.priority === 'high' && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                          HIGH
                        </Badge>
                      )}
                      {message.unread && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                          NEW
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className={`font-semibold mb-1 ${message.unread ? 'text-white' : 'text-gray-300'}`}>
                      {message.subject}
                    </h3>
                    
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                      {message.preview}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-cyan-400">
                        <Clock className="w-3 h-3" />
                        {message.time}
                      </div>
                      
                      {message.type === 'system' && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                          SYSTEM
                        </Badge>
                      )}
                      
                      {message.type === 'alert' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                          ALERT
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {message.unread ? (
                      <AlertCircle className="w-5 h-5 text-cyan-400 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-gray-500" />
                    )}
                    <Button className="neon-btn-outline text-xs px-2 py-1">
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <Card className="quantum-card">
            <CardContent className="p-8 text-center">
              <div className="ai-orb mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No messages found</h3>
              <p className="text-cyan-300">
                {searchTerm ? 'Try adjusting your search terms' : 'All caught up! No new messages.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}