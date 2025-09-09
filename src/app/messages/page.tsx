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
      <div className="elegant-background min-h-screen p-8 space-y-10">
        {/* Elegant Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <h1 className="text-display text-slate-800 flex items-center gap-4">
              <MessageCircle className="w-10 h-10 text-blue-600" />
              Messages
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-caption font-semibold animate-pulse">
                  {unreadCount} NEW
                </Badge>
              )}
            </h1>
            <p className="text-body text-slate-600 max-w-md leading-relaxed">Elegant communication center for your manufacturing operations</p>
          </div>
          
          <div className="flex gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-subtle hover:shadow-elegant transition-all">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </Button>
            <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl shadow-subtle hover:shadow-elegant transition-all">
              <Users className="w-5 h-5 mr-2" />
              Team Chat
            </Button>
          </div>
        </div>

        {/* Elegant Search and Filters */}
        <div className="flex gap-6 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-body-sm border border-slate-200 rounded-xl focus:border-blue-300 focus:ring-blue-100 focus:ring-4 transition-all"
            />
          </div>
          <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-4 rounded-xl shadow-subtle hover:shadow-elegant transition-all">
            <Filter className="w-5 h-5 mr-2" />
            Filter
          </Button>
        </div>

        {/* Elegant Tabs */}
        <div className="flex space-x-2 border-b border-slate-200">
          {[
            { id: 'all', label: 'All Messages', count: messages.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'alerts', label: 'Alerts', count: messages.filter(m => m.type === 'alert' || m.type === 'system').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 text-body-sm font-medium transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-semibold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Elegant Messages List */}
        <div className="space-y-6">
          {filteredMessages.map((message) => (
            <Card key={message.id} className={`elegant-card shadow-subtle hover:shadow-elegant border-0 transition-all duration-300 cursor-pointer ${
              message.unread ? 'ring-2 ring-blue-100' : ''
            }`}>
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  {/* Elegant Avatar */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-subtle ${message.unread ? 'animate-pulse' : ''}`}>
                    <span className="text-xl text-white">{message.avatar}</span>
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`font-semibold text-body ${message.unread ? 'text-slate-800' : 'text-slate-700'}`}>
                        {message.sender}
                      </span>
                      {message.priority === 'high' && (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-semibold">
                          HIGH PRIORITY
                        </span>
                      )}
                      {message.unread && (
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-semibold">
                          NEW
                        </span>
                      )}
                    </div>
                    
                    <h3 className={`font-semibold mb-3 text-h4 ${message.unread ? 'text-slate-800' : 'text-slate-700'}`}>
                      {message.subject}
                    </h3>
                    
                    <p className="text-body text-slate-600 mb-4 leading-relaxed line-clamp-2">
                      {message.preview}
                    </p>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-body-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        {message.time}
                      </div>
                      
                      {message.type === 'system' && (
                        <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-semibold">
                          SYSTEM
                        </span>
                      )}
                      
                      {message.type === 'alert' && (
                        <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-semibold">
                          ALERT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Elegant Actions */}
                  <div className="flex items-center gap-4">
                    {message.unread ? (
                      <AlertCircle className="w-6 h-6 text-blue-600 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-slate-400" />
                    )}
                    <Button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-all">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <Card className="elegant-card shadow-subtle border-0">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-h2 text-slate-800 mb-3 font-serif">No messages found</h3>
              <p className="text-body text-slate-500 max-w-sm mx-auto leading-relaxed">
                {searchTerm ? 'Try adjusting your search terms for better results' : 'You\'re all caught up! No new messages at the moment.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}