'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Zap,
  Brain,
  MessageCircle,
  Sparkles,
  ChevronDown,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Settings,
  User,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Users,
  DollarSign,
  BarChart3
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ashley'
  content: string
  timestamp: Date
  context?: string
  actions?: ChatAction[]
  metadata?: {
    confidence?: number
    source?: string
    category?: 'order' | 'production' | 'inventory' | 'finance' | 'users' | 'general'
  }
}

interface ChatAction {
  id: string
  label: string
  icon?: any
  action: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

interface QuickAction {
  id: string
  label: string
  icon: any
  prompt: string
  category: string
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'order-status',
    label: 'Check Order Status',
    icon: Package,
    prompt: 'Show me the status of recent orders',
    category: 'Orders',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  },
  {
    id: 'production-summary',
    label: 'Production Summary',
    icon: Activity,
    prompt: 'Give me a production summary for today',
    category: 'Production',
    color: 'bg-green-500/20 text-green-400 border-green-500/50'
  },
  {
    id: 'inventory-alerts',
    label: 'Inventory Alerts',
    icon: AlertTriangle,
    prompt: 'Show me any inventory alerts or low stock items',
    category: 'Inventory',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
  },
  {
    id: 'financial-overview',
    label: 'Financial Overview',
    icon: DollarSign,
    prompt: 'Show me today\'s financial performance',
    category: 'Finance',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
  },
  {
    id: 'user-activity',
    label: 'User Activity',
    icon: Users,
    prompt: 'Show me recent user activity and login stats',
    category: 'Users',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: BarChart3,
    prompt: 'How is the system performing today?',
    category: 'System',
    color: 'bg-red-500/20 text-red-400 border-red-500/50'
  }
]

export function AshleyAIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ashley',
      content: 'Hello! I\'m Ashley, your AI assistant for the Apparel Smart Hub. I can help you with orders, production, inventory, finance, and system management. What would you like to know?',
      timestamp: new Date(),
      context: 'welcome',
      metadata: {
        confidence: 1.0,
        category: 'general'
      }
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isSpeechActive, setIsSpeechActive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateAshleyResponse = async (userMessage: string): Promise<Message> => {
    // AI response generation logic
    const responses = {
      'order': {
        content: 'I found 12 active orders. 8 are in production, 3 are pending approval, and 1 is ready for shipping. The average completion time is 5.2 days, which is 12% faster than last month.',
        actions: [
          {
            id: 'view-orders',
            label: 'View Orders',
            icon: Package,
            action: () => window.location.href = '/orders'
          }
        ],
        metadata: { confidence: 0.95, category: 'order' as const }
      },
      'production': {
        content: 'Today\'s production efficiency is 87%, with 156 units completed. Quality score is 94%. Workstation A is performing excellently, while Workstation C needs attention due to temperature issues.',
        actions: [
          {
            id: 'view-production',
            label: 'View Production',
            icon: Activity,
            action: () => window.location.href = '/production-tracking'
          }
        ],
        metadata: { confidence: 0.92, category: 'production' as const }
      },
      'inventory': {
        content: 'I found 3 low stock alerts: CVC-160-WHITE (5 units left), POLY-200-BLACK (12 units), and ELASTIC-BAND (28 units). Recommended reorder quantities have been calculated based on usage patterns.',
        actions: [
          {
            id: 'view-inventory',
            label: 'View Inventory',
            icon: Package,
            action: () => window.location.href = '/inventory'
          }
        ],
        metadata: { confidence: 0.89, category: 'inventory' as const }
      },
      'finance': {
        content: 'Today\'s revenue is ₱24,580, up 8% from yesterday. Outstanding invoices total ₱156,200. BIR compliance status is green - all reports are up to date.',
        actions: [
          {
            id: 'view-finance',
            label: 'View Finance',
            icon: DollarSign,
            action: () => window.location.href = '/finance'
          }
        ],
        metadata: { confidence: 0.91, category: 'finance' as const }
      },
      'users': {
        content: '18 users are currently active. New user registrations today: 2. Last login activity shows normal patterns. No security alerts detected.',
        actions: [
          {
            id: 'view-users',
            label: 'View Users',
            icon: Users,
            action: () => window.location.href = '/users'
          }
        ],
        metadata: { confidence: 0.88, category: 'users' as const }
      },
      'system': {
        content: 'System performance is optimal. CPU usage: 34%, Memory: 67%, Database response time: 45ms. All services are running normally. Last backup completed successfully 2 hours ago.',
        metadata: { confidence: 0.96, category: 'general' as const }
      }
    }

    // Simple keyword matching for demo
    const lowerMessage = userMessage.toLowerCase()
    let response = responses.system

    if (lowerMessage.includes('order')) response = responses.order
    else if (lowerMessage.includes('production')) response = responses.production
    else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) response = responses.inventory
    else if (lowerMessage.includes('finance') || lowerMessage.includes('money') || lowerMessage.includes('revenue')) response = responses.finance
    else if (lowerMessage.includes('user') || lowerMessage.includes('login') || lowerMessage.includes('activity')) response = responses.users

    return {
      id: `ashley_${Date.now()}`,
      type: 'ashley',
      content: response.content,
      timestamp: new Date(),
      actions: response.actions || [],
      metadata: response.metadata
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simulate AI processing delay
    setTimeout(async () => {
      const ashleyResponse = await generateAshleyResponse(inputMessage)
      setMessages(prev => [...prev, ashleyResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleQuickAction = async (action: QuickAction) => {
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: action.prompt,
      timestamp: new Date(),
      context: action.id
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    setTimeout(async () => {
      const ashleyResponse = await generateAshleyResponse(action.prompt)
      setMessages(prev => [...prev, ashleyResponse])
      setIsTyping(false)
    }, 1200)
  }

  const toggleVoice = () => {
    setIsVoiceEnabled(!isVoiceEnabled)
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="neon-btn-primary rounded-full w-14 h-14 shadow-2xl shadow-cyan-500/25"
        >
          <div className="ai-orb">
            <Bot className="w-6 h-6" />
          </div>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] neural-bg border border-cyan-500/30">
          <div className="quantum-field">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="quantum-particle" />
            ))}
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <DialogHeader className="border-b border-cyan-500/20 pb-4">
              <DialogTitle className="flex items-center text-white glitch-text" data-text="ASHLEY AI ASSISTANT">
                <div className="ai-orb mr-3">
                  <Brain className="w-6 h-6 text-cyan-400" />
                </div>
                ASHLEY AI ASSISTANT
                <div className="ml-auto flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <div className="neural-pulse mr-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    ONLINE
                  </Badge>
                </div>
              </DialogTitle>
              <DialogDescription className="text-cyan-300 font-mono">
                Powered by Advanced Neural Networks • Real-time ERP Intelligence
              </DialogDescription>
            </DialogHeader>

            {/* Quick Actions */}
            <div className="py-4 border-b border-cyan-500/20">
              <div className="flex items-center mb-3">
                <Sparkles className="w-4 h-4 text-cyan-400 mr-2" />
                <span className="text-sm font-mono text-cyan-300">QUICK ACTIONS</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const IconComponent = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className={`
                        p-2 rounded-lg border text-xs font-mono transition-all duration-300
                        hover:bg-opacity-30 hover:scale-105 ${action.color}
                      `}
                    >
                      <div className="flex items-center gap-1">
                        <IconComponent className="w-3 h-3" />
                        <span>{action.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[80%] p-4 rounded-lg ${
                      message.type === 'user' 
                        ? 'quantum-card bg-cyan-500/20 border-cyan-500/30' 
                        : 'quantum-card border-purple-500/30'
                    }
                  `}>
                    <div className="flex items-start gap-3">
                      {message.type === 'ashley' && (
                        <div className="ai-orb-small flex-shrink-0">
                          <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {message.type === 'user' ? (
                            <User className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <span className="text-purple-400 font-mono text-sm font-bold">ASHLEY</span>
                          )}
                          
                          <span className="text-xs text-gray-400 font-mono">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          
                          {message.metadata?.confidence && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                              {Math.round(message.metadata.confidence * 100)}% CONFIDENCE
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-white text-sm leading-relaxed mb-3">
                          {message.content}
                        </p>
                        
                        {message.actions && message.actions.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {message.actions.map((action) => {
                              const ActionIcon = action.icon
                              return (
                                <button
                                  key={action.id}
                                  onClick={action.action}
                                  className="neon-btn-outline text-xs px-3 py-1"
                                >
                                  <ActionIcon className="w-3 h-3 mr-1" />
                                  {action.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="text-gray-400 hover:text-cyan-400 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          
                          {message.type === 'ashley' && (
                            <>
                              <button className="text-gray-400 hover:text-green-400 transition-colors">
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button className="text-gray-400 hover:text-red-400 transition-colors">
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="quantum-card border-purple-500/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb-small">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-mono text-sm font-bold">ASHLEY</span>
                        <span className="text-cyan-300 text-sm">is analyzing...</span>
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
                              style={{ animationDelay: `${i * 0.2}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-cyan-500/20 p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ask Ashley about orders, production, inventory, finance, or system status..."
                    className="cyber-input resize-none h-12"
                    rows={1}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={toggleVoice}
                    className={`neon-btn-outline ${isVoiceEnabled ? 'text-cyan-400 border-cyan-400' : ''}`}
                  >
                    {isVoiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="neon-btn-primary"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400 font-mono">
                <span>Press Enter to send • Shift + Enter for new line</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span>SYSTEM OPTIMAL</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}