'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Target,
  Activity,
  Lightbulb,
  Send,
  User,
  Bot,
  MessageSquare,
  Users,
  Clock
} from 'lucide-react'

interface AIStats {
  totalSuggestions: number
  appliedSuggestions: number
  accuracy: number
  timeSaved: number
}

interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AIStats>({
    totalSuggestions: 0,
    appliedSuggestions: 0,
    accuracy: 0,
    timeSaved: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user has access to AI features
    const allowedRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE_STAFF', 'PURCHASER', 'SALES_STAFF', 'CSR']
    if (!allowedRoles.includes(session.user.role)) {
      router.push('/dashboard')
      return
    }

    // Mock stats - in real app, fetch from API
    setStats({
      totalSuggestions: 147,
      appliedSuggestions: 89,
      accuracy: 92,
      timeSaved: 24.5
    })
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <ResponsiveLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading AI Assistant...</p>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  if (!session) return null

  const getRoleSpecificContent = () => {
    switch (session.user.role) {
      case 'ADMIN':
      case 'MANAGER':
        return ['chat', 'assignments', 'forecasts', 'inventory', 'pricing', 'anomalies']
      case 'WAREHOUSE_STAFF':
      case 'PURCHASER':
        return ['chat', 'inventory']
      case 'SALES_STAFF':
      case 'CSR':
        return ['chat', 'pricing']
      default:
        return ['chat']
    }
  }

  const availableTabs = getRoleSpecificContent()

  return (
    <ResponsiveLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 relative overflow-hidden">
        {/* Beautiful Background Elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjAyIi8+CjwvZz4KPHN2Zz4=')] opacity-40"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/5 to-cyan-400/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 p-10 space-y-8">
          {/* Beautiful Page Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  Ashley AI Assistant
                </h1>
                <p className="text-lg text-slate-600 font-medium mt-2">
                  Intelligent recommendations and insights powered by advanced analytics
                </p>
              </div>
            </div>
          </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Lightbulb className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Suggestions</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalSuggestions}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Applied</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stats.appliedSuggestions}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Accuracy</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stats.accuracy}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Time Saved</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stats.timeSaved}h</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Features Tabs */}
        <Card className="border-0 shadow-sm">
          <Tabs defaultValue={availableTabs[0]} className="w-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">AI Features</CardTitle>
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {availableTabs.includes('chat') && (
                  <TabsTrigger value="chat">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </TabsTrigger>
                )}
                {availableTabs.includes('assignments') && (
                  <TabsTrigger value="assignments">
                    <Users className="w-4 h-4 mr-2" />
                    Tasks
                  </TabsTrigger>
                )}
                {availableTabs.includes('forecasts') && (
                  <TabsTrigger value="forecasts">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Forecasting
                  </TabsTrigger>
                )}
                {availableTabs.includes('inventory') && (
                  <TabsTrigger value="inventory">
                    <Package className="w-4 h-4 mr-2" />
                    Inventory
                  </TabsTrigger>
                )}
                {availableTabs.includes('pricing') && (
                  <TabsTrigger value="pricing">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pricing
                  </TabsTrigger>
                )}
                {availableTabs.includes('anomalies') && (
                  <TabsTrigger value="anomalies">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Anomalies
                  </TabsTrigger>
                )}
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {availableTabs.includes('chat') && (
                <TabsContent value="chat" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Chat with Ashley</h3>
                    <p className="text-gray-600">Ask questions, get insights, and receive intelligent recommendations</p>
                  </div>
                  <AshleyChat />
                </TabsContent>
              )}

              {availableTabs.includes('assignments') && (
                <TabsContent value="assignments" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Intelligent Task Assignment</h3>
                    <p className="text-gray-600">AI-powered suggestions based on workload, skills, and performance history</p>
                  </div>
                  <AITaskAssignment />
                </TabsContent>
              )}

              {availableTabs.includes('forecasts') && (
                <TabsContent value="forecasts" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Completion Forecasting</h3>
                    <p className="text-gray-600">Predict completion dates and identify potential delays</p>
                  </div>
                  <AIForecasting />
                </TabsContent>
              )}

              {availableTabs.includes('inventory') && (
                <TabsContent value="inventory" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Inventory Intelligence</h3>
                    <p className="text-gray-600">Smart restock and liquidation recommendations</p>
                  </div>
                  <AIInventorySuggestions />
                </TabsContent>
              )}

              {availableTabs.includes('pricing') && (
                <TabsContent value="pricing" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Dynamic Pricing Optimization</h3>
                    <p className="text-gray-600">AI-driven pricing suggestions based on costs and market analysis</p>
                  </div>
                  <AIPricingSuggestions />
                </TabsContent>
              )}

              {availableTabs.includes('anomalies') && (
                <TabsContent value="anomalies" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Anomaly Detection</h3>
                    <p className="text-gray-600">Identify unusual patterns in costs, performance, and quality</p>
                  </div>
                  <AIAnomalyDetection />
                </TabsContent>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>
      </div>
    </ResponsiveLayout>
  )
}

// Smart response generator for Ashley AI
function generateSmartResponse(userInput: string): string {
  // Greetings
  if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'greetings'].some(greeting => userInput.includes(greeting))) {
    const greetings = [
      "Hello! I'm Ashley, your AI assistant for Sorbetes Apparel Studio. How can I help you today? 👋",
      "Hi there! Great to see you! I'm here to help with your manufacturing operations. What would you like to know?",
      "Hey! I'm Ashley, your smart manufacturing assistant. Ready to optimize your production today?",
      "Good day! I'm Ashley AI, and I'm excited to help you with your apparel business. What's on your mind?"
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  }

  // Production/Manufacturing queries
  if (['production', 'manufacturing', 'sewing', 'cutting', 'printing'].some(word => userInput.includes(word))) {
    return "I can help you optimize your production workflow! Based on current data, I see opportunities to improve efficiency by 15-20%. Would you like me to analyze your sewing operations, printing schedules, or cutting patterns? I can also predict bottlenecks and suggest resource allocation."
  }

  // Orders and business
  if (['order', 'orders', 'client', 'customer', 'business', 'revenue'].some(word => userInput.includes(word))) {
    return "Great question about orders! I'm tracking 23 active orders with a total value of ₱2.4M. Your top performing client is Reefer Brand with 8 orders this month. I can help with order prioritization, delivery scheduling, or client management. What specific aspect interests you?"
  }

  // Inventory
  if (['inventory', 'stock', 'material', 'fabric', 'supplies'].some(word => userInput.includes(word))) {
    return "I'm monitoring your inventory levels! Currently, DTF Film is running low (15% remaining) and needs reordering. Cotton fabric stock is healthy at 78%. I can predict material needs, suggest optimal ordering quantities, or help with supplier management. What would you like to explore?"
  }

  // Quality control
  if (['quality', 'qc', 'defect', 'inspection'].some(word => userInput.includes(word))) {
    return "Quality is crucial! Your current defect rate is 2.3% (below industry average of 3.5% - great job!). I can analyze quality trends, identify common defect patterns, or suggest preventive measures. Would you like a detailed quality report?"
  }

  // AI and analytics
  if (['ai', 'analytics', 'data', 'report', 'insight'].some(word => userInput.includes(word))) {
    return "I love talking about data and insights! I've analyzed thousands of data points to help optimize your operations. I can provide predictive analytics, performance forecasts, cost optimization suggestions, or custom reports. What type of analysis interests you most?"
  }

  // Pricing and finance
  if (['price', 'pricing', 'cost', 'profit', 'finance', 'money'].some(word => userInput.includes(word))) {
    return "Smart pricing is key to profitability! Based on material costs, labor rates, and market analysis, I can suggest optimal pricing strategies. Your current gross margin is 42%. I can help with cost analysis, price optimization, or profit forecasting. What would you like to explore?"
  }

  // Help or how questions
  if (['help', 'how', 'what can you', 'assist'].some(word => userInput.includes(word))) {
    return "I'm here to help with everything! I can assist with: 📊 Production optimization, 📈 Analytics & forecasting, 💰 Cost analysis, 📦 Inventory management, 🎯 Quality control, 👥 Staff scheduling, and much more! Just ask me anything about your apparel manufacturing business."
  }

  // Thank you
  if (['thank', 'thanks', 'appreciate'].some(word => userInput.includes(word))) {
    return "You're very welcome! I'm always happy to help optimize your operations. Feel free to ask me anything else - I'm here 24/7 to support Sorbetes Apparel Studio! 😊"
  }

  // Default responses with variety
  const defaultResponses = [
    "That's an interesting question! As your AI manufacturing assistant, I can analyze that from multiple angles. Could you tell me more specifically what aspect you'd like me to focus on?",
    "I understand what you're asking about. Based on your current operations data, I can provide detailed insights. Would you like me to dive deeper into production metrics, financial analysis, or operational recommendations?",
    "Great question! I have access to real-time data about your manufacturing operations. I can help with analysis, predictions, or actionable recommendations. What would be most valuable for you right now?",
    "I'm here to help with that! As Ashley AI, I can process complex manufacturing data and provide strategic insights. Let me know what specific area you'd like me to analyze or optimize."
  ]
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}

// Ashley Chat Component
function AshleyChat() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm Ashley, your AI assistant powered by ChatGPT for Sorbetes Apparel Studio. I'm ready to help with intelligent insights! How can I assist you today? 🤖✨",
      timestamp: new Date()
    }
  ])

  // Call real OpenAI API
  const callOpenAI = async (userMessage: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })
      
      const data = await response.json()
      
      const aiResponse: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: data.response || data.fallback || "I'm sorry, I couldn't process your request.",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])
      
    } catch (error) {
      console.error('Error calling AI:', error)
      
      // Fallback to local response if API fails
      const fallbackResponse = generateSmartResponse(userMessage.toLowerCase())
      const aiResponse: Message = {
        id: messages.length + 2,
        type: 'assistant',
        content: fallbackResponse + " (Note: Using local AI due to connection issue)",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages([...messages, userMessage])
    setMessage('')

    // Call real OpenAI API
    callOpenAI(message)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${
                  msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.type === 'user' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {msg.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${
                    msg.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-500">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-100 text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <p className="text-sm">Ashley is thinking...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-4">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Ashley anything about your business..."
                className="flex-1"
              />
              <Button type="submit" disabled={!message.trim() || isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Task Assignment Component
function AITaskAssignment() {
  const mockAssignments = [
    {
      task: "Quality check for Order #1045",
      suggestedAssignee: "Maria Santos",
      reason: "Highest quality score (96%) and available capacity",
      confidence: 92,
      estimatedTime: "2 hours"
    },
    {
      task: "Fabric cutting for polo shirts",
      suggestedAssignee: "Juan dela Cruz",
      reason: "Expert in polo shirt patterns, 85% efficiency rate",
      confidence: 88,
      estimatedTime: "4 hours"
    }
  ]

  return (
    <div className="space-y-4">
      {mockAssignments.map((assignment, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.task}</h3>
                <p className="text-gray-600 text-sm mb-2">
                  <strong>Suggested:</strong> {assignment.suggestedAssignee}
                </p>
                <p className="text-gray-700 text-sm mb-3">{assignment.reason}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Confidence: {assignment.confidence}%</span>
                  <span>Est. Time: {assignment.estimatedTime}</span>
                </div>
              </div>
              <Button 
                onClick={() => alert(`Assign task: ${assignment.task} to ${assignment.suggestedAssignee}`)}
                className="ml-4"
              >
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Forecasting Component
function AIForecasting() {
  const mockForecasts = [
    {
      project: "Corporate uniforms - ABC Company",
      originalDueDate: "2025-01-15",
      predictedCompletion: "2025-01-14",
      confidence: 89,
      status: "On track",
      riskFactors: ["Material delivery on schedule", "All staff available"]
    },
    {
      project: "School t-shirts - XYZ School",
      originalDueDate: "2025-01-20",
      predictedCompletion: "2025-01-22",
      confidence: 76,
      status: "At risk",
      riskFactors: ["High order volume", "Limited embroidery capacity"]
    }
  ]

  return (
    <div className="space-y-4">
      {mockForecasts.map((forecast, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{forecast.project}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Original Due:</span>
                    <p className="font-medium">{forecast.originalDueDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Predicted:</span>
                    <p className="font-medium">{forecast.predictedCompletion}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-gray-600 text-sm">Risk Factors:</span>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                    {forecast.riskFactors.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`mb-2 ${
                  forecast.status === 'On track' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {forecast.status}
                </Badge>
                <p className="text-sm text-gray-600">{forecast.confidence}% confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Inventory Suggestions Component
function AIInventorySuggestions() {
  const mockSuggestions = [
    {
      item: "Cotton Fabric - White",
      currentStock: 50,
      suggestedAction: "Restock",
      quantity: 200,
      urgency: "High",
      reason: "Stock will run out in 3 days based on current orders"
    },
    {
      item: "Polyester Thread - Black",
      currentStock: 15,
      suggestedAction: "Restock",
      quantity: 100,
      urgency: "Medium",
      reason: "Below reorder point, 7 days supply remaining"
    },
    {
      item: "Labels - Brand Tags",
      currentStock: 500,
      suggestedAction: "Liquidate",
      quantity: 300,
      urgency: "Low",
      reason: "Slow-moving inventory, 6 months without movement"
    }
  ]

  return (
    <div className="space-y-4">
      {mockSuggestions.map((suggestion, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  suggestion.urgency === 'High' ? 'bg-red-100' :
                  suggestion.urgency === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <Package className={`w-6 h-6 ${
                    suggestion.urgency === 'High' ? 'text-red-600' :
                    suggestion.urgency === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{suggestion.item}</h3>
                  <p className="text-gray-600 text-sm mb-2">Current Stock: {suggestion.currentStock} units</p>
                  <p className="text-gray-700 text-sm">{suggestion.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`mb-2 ${
                  suggestion.urgency === 'High' ? 'bg-red-100 text-red-800' :
                  suggestion.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {suggestion.urgency}
                </Badge>
                <div className="text-gray-900 font-semibold">
                  {suggestion.suggestedAction}: {suggestion.quantity} units
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AIPricingSuggestions() {
  const mockPricing = [
    {
      product: "Custom T-Shirt Design",
      currentPrice: 350,
      suggestedPrice: 395,
      confidence: 87,
      reasoning: "Market analysis shows competitors pricing 15% higher for similar quality",
      impact: "+₱45 margin per unit"
    },
    {
      product: "Hoodie - Premium Cotton",
      currentPrice: 1200,
      suggestedPrice: 1150,
      confidence: 92,
      reasoning: "Material costs decreased 8% this quarter, maintain competitive edge",
      impact: "Volume increase expected"
    },
    {
      product: "Branded Polo Shirt",
      currentPrice: 580,
      suggestedPrice: 620,
      confidence: 79,
      reasoning: "High demand product, low stock levels support premium pricing",
      impact: "+₱40 margin per unit"
    }
  ]

  return (
    <div className="space-y-4">
      {mockPricing.map((pricing, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{pricing.product}</h3>
                  <p className="text-gray-700 text-sm mb-2">{pricing.reasoning}</p>
                  <p className="text-green-600 text-sm font-medium">{pricing.impact}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-600 text-sm mb-1">Current: ₱{pricing.currentPrice}</div>
                <div className="text-gray-900 font-bold text-lg">Suggested: ₱{pricing.suggestedPrice}</div>
                <div className="text-gray-500 text-sm mt-1">{pricing.confidence}% confidence</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-sm">Confidence:</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${pricing.confidence}%` }}
                />
              </div>
              <span className="text-gray-900 font-medium text-sm">{pricing.confidence}%</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AIAnomalyDetection() {
  const mockAnomalies = [
    {
      type: "Cost Spike",
      description: "Material costs 23% higher than usual for Order #045",
      severity: "High",
      impact: "₱2,340 over budget",
      recommendation: "Review supplier pricing or find alternative materials",
      detectedAt: "2 hours ago"
    },
    {
      type: "Performance Drop",
      description: "Sewing department output down 15% this week",
      severity: "Medium",
      impact: "3 orders at risk of delay",
      recommendation: "Check for equipment issues or staff scheduling conflicts",
      detectedAt: "6 hours ago"
    },
    {
      type: "Quality Issue",
      description: "Reject rate increased to 8% from normal 3%",
      severity: "High",
      impact: "12 units rejected",
      recommendation: "Immediate quality audit on recent production batches",
      detectedAt: "1 hour ago"
    }
  ]

  return (
    <div className="space-y-4">
      {mockAnomalies.map((anomaly, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                anomaly.severity === 'High' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  anomaly.severity === 'High' ? 'text-red-600' : 'text-yellow-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{anomaly.type}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={`${
                      anomaly.severity === 'High' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {anomaly.severity}
                    </Badge>
                    <span className="text-gray-500 text-xs">{anomaly.detectedAt}</span>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-2">{anomaly.description}</p>
                <p className="text-gray-600 text-sm mb-3"><strong>Impact:</strong> {anomaly.impact}</p>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-gray-900 text-sm"><strong>Recommendation:</strong> {anomaly.recommendation}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}