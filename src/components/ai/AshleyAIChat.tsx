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
    prompt: 'Show me the status of recent orders and any urgent priorities',
    category: 'Orders',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  },
  {
    id: 'production-summary',
    label: 'Production Summary',
    icon: Activity,
    prompt: 'Give me a detailed production summary with efficiency metrics and bottlenecks',
    category: 'Production',
    color: 'bg-green-500/20 text-green-400 border-green-500/50'
  },
  {
    id: 'inventory-alerts',
    label: 'Inventory Analysis',
    icon: AlertTriangle,
    prompt: 'Analyze inventory levels and provide restocking recommendations',
    category: 'Inventory',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
  },
  {
    id: 'financial-overview',
    label: 'Financial Insights',
    icon: DollarSign,
    prompt: 'Provide financial performance analysis and profit optimization suggestions',
    category: 'Finance',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
  }
]

export default function AshleyAIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ashley',
      content: '👋 Hello! I\'m Ashley AI, your intelligent manufacturing assistant. I\'m powered by OpenAI GPT-4o and have deep knowledge of Sorbetes Apparel Studio operations. How can I help optimize your manufacturing today?',
      timestamp: new Date(),
      metadata: { confidence: 1.0, category: 'general', source: 'System' }
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real OpenAI API Integration
  const generateAshleyResponse = async (userMessage: string): Promise<Message> => {
    try {
      // Call the OpenAI API endpoint
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Get suggested actions based on message content
      const actions = getSuggestedActions(userMessage)
      
      return {
        id: `ashley_${Date.now()}`,
        type: 'ashley',
        content: data.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(),
        actions,
        metadata: { 
          confidence: 0.95, 
          category: detectMessageCategory(userMessage),
          source: data.powered_by || 'OpenAI GPT-4o'
        }
      }
    } catch (error) {
      console.error('Chat API error:', error)
      
      // Fallback response if API fails
      return {
        id: `ashley_${Date.now()}`,
        type: 'ashley',
        content: '🔧 I\'m experiencing connectivity issues with my advanced AI systems. However, I can still help you with basic navigation and system functions. My full intelligence will return shortly!',
        timestamp: new Date(),
        actions: getBasicActions(),
        metadata: { confidence: 0.5, category: 'general' as const, source: 'Fallback System' }
      }
    }
  }

  // Helper function to suggest relevant actions based on user message
  const getSuggestedActions = (message: string): ChatAction[] => {
    const lowerMessage = message.toLowerCase()
    const actions: ChatAction[] = []

    if (lowerMessage.includes('order') || lowerMessage.includes('po')) {
      actions.push({
        id: 'view-orders',
        label: 'View Orders',
        icon: Package,
        action: () => window.location.href = '/orders'
      })
    }
    
    if (lowerMessage.includes('production') || lowerMessage.includes('manufacturing')) {
      actions.push({
        id: 'view-production',
        label: 'View Production',
        icon: Activity,
        action: () => window.location.href = '/production'
      })
    }
    
    if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('material')) {
      actions.push({
        id: 'view-inventory',
        label: 'View Inventory',
        icon: Package,
        action: () => window.location.href = '/inventory'
      })
    }
    
    if (lowerMessage.includes('finance') || lowerMessage.includes('money') || lowerMessage.includes('revenue') || lowerMessage.includes('cost')) {
      actions.push({
        id: 'view-finance',
        label: 'View Finance',
        icon: DollarSign,
        action: () => window.location.href = '/finance'
      })
    }

    if (lowerMessage.includes('analytics') || lowerMessage.includes('report') || lowerMessage.includes('dashboard')) {
      actions.push({
        id: 'view-analytics',
        label: 'View Analytics',
        icon: BarChart3,
        action: () => window.location.href = '/analytics'
      })
    }

    return actions
  }

  // Basic actions for fallback mode
  const getBasicActions = (): ChatAction[] => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      action: () => window.location.href = '/dashboard'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      action: () => window.location.href = '/orders'
    },
    {
      id: 'production',
      label: 'Production',
      icon: Activity,
      action: () => window.location.href = '/production'
    }
  ]

  // Helper function to detect message category
  const detectMessageCategory = (message: string): 'order' | 'production' | 'inventory' | 'finance' | 'users' | 'general' => {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('order') || lowerMessage.includes('po')) return 'order'
    if (lowerMessage.includes('production') || lowerMessage.includes('manufacturing')) return 'production'
    if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('material')) return 'inventory'
    if (lowerMessage.includes('finance') || lowerMessage.includes('money') || lowerMessage.includes('revenue') || lowerMessage.includes('cost')) return 'finance'
    if (lowerMessage.includes('user') || lowerMessage.includes('employee') || lowerMessage.includes('staff')) return 'users'
    
    return 'general'
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

    try {
      const ashleyResponse = await generateAshleyResponse(inputMessage)
      setMessages(prev => [...prev, ashleyResponse])
    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setIsTyping(false)
    }
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

    try {
      const ashleyResponse = await generateAshleyResponse(action.prompt)
      setMessages(prev => [...prev, ashleyResponse])
    } catch (error) {
      console.error('Error generating response:', error)
    } finally {
      setIsTyping(false)
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <>
      {/* Floating Chat Button - Mobile Optimized */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-700 rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-2xl shadow-cyan-500/25 hover:scale-105 transition-transform duration-300"
        >
          <div className="ai-orb">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        </Button>
      </div>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="neural-card max-w-4xl w-[95vw] h-[80vh] sm:h-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">Ashley AI Assistant</DialogTitle>
                <DialogDescription className="text-cyan-300 text-sm">
                  Powered by OpenAI GPT-4o • Manufacturing Intelligence
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick Actions */}
              {messages.length === 1 && (
                <div className="mb-6">
                  <p className="text-sm text-cyan-300 mb-3 font-medium">Quick Actions:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className={`p-3 rounded-lg border transition-all hover:scale-105 text-left ${action.color}`}
                      >
                        <action.icon className="w-4 h-4 mb-1" />
                        <p className="text-xs font-medium">{action.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-slate-800/50 text-white border border-cyan-500/20'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.actions.map((action) => (
                          <button
                            key={action.id}
                            onClick={action.action}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded-full text-xs transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Metadata */}
                    {message.metadata && (
                      <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.metadata.source && (
                          <span>• {message.metadata.source}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 border border-cyan-500/20 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-cyan-500/20">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ask Ashley about orders, production, inventory, finance, or system optimization..."
                    className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none resize-none h-12"
                    rows={1}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-cyan-600 hover:bg-cyan-700 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>Press Enter to send • Shift + Enter for new line</span>
                <span>🤖 Real AI • OpenAI GPT-4o</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

