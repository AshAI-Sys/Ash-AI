'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare,
  Send,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle,
  Zap,
  Activity
} from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'ashley'
  content: string
  timestamp: Date
  isTyping?: boolean
  suggestions?: string[]
  confidence?: number
  actions?: { label: string; action: string }[]
}

interface AshleyChatProps {
  isMinimized?: boolean
  onToggleMinimize?: () => void
  className?: string
}

const QUICK_QUESTIONS = [
  "Show me today's production status",
  "What orders are at risk of delay?", 
  "Check inventory levels",
  "Generate weekly report",
  "Show QC reject rates",
  "Analyze profit margins"
]

export function AshleyChat({ isMinimized = false, onToggleMinimize, className = "" }: AshleyChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'ashley',
        content: `Hello ${session?.user?.full_name || 'there'}! I'm Ashley, your AI production assistant. I can help you with:\n\n• Production status and forecasts\n• Inventory management\n• Order tracking and delays\n• Quality control insights\n• Cost analysis and recommendations\n\nWhat would you like to know?`,
        timestamp: new Date(),
        suggestions: QUICK_QUESTIONS.slice(0, 3)
      }
      setMessages([welcomeMessage])
    }
  }, [session, messages.length])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Show typing indicator
    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      type: 'ashley',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      const response = await fetch('/api/ai/ashley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          data: {
            message: content.trim(),
            context: 'chat',
            user_role: session?.user?.role,
            conversation_history: messages.slice(-5) // Last 5 messages for context
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.result || data
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping)
        const ashleyResponse: ChatMessage = {
          id: `ashley-${Date.now()}`,
          type: 'ashley',
          content: result.response || result.message || 'I apologize, but I encountered an issue processing your request.',
          timestamp: new Date(),
          confidence: result.confidence,
          suggestions: result.suggestions,
          actions: result.actions
        }
        return [...withoutTyping, ashleyResponse]
      })

      setIsConnected(true)
    } catch (error) {
      console.error('Chat error:', error)
      
      // Remove typing indicator and show error
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping)
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'ashley',
          content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment, or contact your system administrator if the problem persists.',
          timestamp: new Date()
        }
        return [...withoutTyping, errorMessage]
      })
      
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    sendMessage(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  if (isMinimized) {
    return (
      <Card className={`quantum-card border-cyan-500/30 ${className}`}>
        <CardHeader className="p-4 cursor-pointer" onClick={onToggleMinimize}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="ai-orb">
                <Brain className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-white glitch-text" data-text="ASHLEY">
                  ASHLEY
                </CardTitle>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-xs text-cyan-400">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
              </div>
            </div>
            <Maximize2 className="w-4 h-4 text-cyan-400 hover:text-cyan-300 transition-colors" />
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className={`neural-bg relative ${className}`}>
      <div className="quantum-field">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="quantum-particle" />
        ))}
      </div>
      
      <Card className="quantum-card border-cyan-500/30 relative z-10">
        <CardHeader className="border-b border-cyan-500/20 bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="ai-orb animate-pulse">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-white glitch-text flex items-center gap-2" data-text="ASHLEY AI ASSISTANT">
                  ASHLEY AI ASSISTANT
                  <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-cyan-400 font-mono">{isConnected ? 'NEURAL LINK ACTIVE' : 'CONNECTION LOST'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="neon-btn-outline text-cyan-400 hover:text-cyan-300 p-2"
                title="Clear neural cache"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              {onToggleMinimize && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMinimize}
                  className="neon-btn-outline text-cyan-400 hover:text-cyan-300 p-2"
                  title="Minimize interface"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-[500px] flex flex-col bg-slate-900/40 backdrop-blur-sm">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  message.type === 'user' 
                    ? 'bg-blue-500/20 border-blue-500 shadow-glow-blue' 
                    : 'ai-orb border-cyan-400 shadow-glow-cyan'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Bot className="w-4 h-4 text-cyan-400" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-2xl backdrop-blur-sm ${
                    message.type === 'user'
                      ? 'bg-blue-500/20 text-white ml-auto border border-blue-500/50 shadow-glow-blue'
                      : 'bg-slate-800/60 text-white border border-cyan-500/30 shadow-glow-cyan'
                  }`}>
                    {message.isTyping ? (
                      <div className="flex items-center gap-2">
                        <div className="neural-pulse">
                          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                        </div>
                        <span className="text-sm text-cyan-300 font-mono">ASHLEY PROCESSING...</span>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{message.content}</p>
                        
                        {/* Confidence indicator */}
                        {message.confidence && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cyan-500/20">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400 font-mono">
                              CONFIDENCE: {Math.round(message.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => sendMessage(action.action)}
                          className="neon-btn-outline text-xs px-3 py-1 rounded border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 transition-all duration-300"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-cyan-400 font-mono">NEURAL SUGGESTIONS:</p>
                      <div className="space-y-1">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickQuestion(suggestion)}
                            className="block w-full text-left p-2 text-xs bg-slate-800/40 hover:bg-cyan-500/10 rounded-lg text-cyan-300 transition-all duration-300 border border-cyan-500/20 hover:border-cyan-500/40"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-cyan-500/60 mt-1 font-mono">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Neural Input Area */}
          <div className="border-t border-cyan-500/20 p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="INTERFACE WITH ASHLEY NEURAL NETWORK..."
                disabled={isLoading || !isConnected}
                className="cyber-input flex-1"
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim() || !isConnected}
                className="neon-btn-primary px-4 min-w-[60px] flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="neural-pulse">
                    <Zap className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {!isConnected && (
              <div className="flex items-center gap-2 mt-2 text-red-400 text-xs font-mono">
                <AlertTriangle className="w-3 h-3 animate-pulse" />
                NEURAL LINK DISCONNECTED - ATTEMPTING RECONNECTION...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}