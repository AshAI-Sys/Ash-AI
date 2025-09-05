'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
import { AshleyChat } from '@/components/AshleyChat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  Zap,
  Activity,
  TrendingUp,
  Shield,
  Clock,
  MessageSquare,
  BarChart3,
  Target,
  Cpu
} from 'lucide-react'

export default function AshleyAIPage() {
  const { data: session } = useSession()
  const [isChatMinimized, setIsChatMinimized] = useState(false)

  const aiCapabilities = [
    {
      icon: BarChart3,
      title: "Production Analytics",
      description: "Real-time monitoring of production metrics and efficiency",
      status: "active"
    },
    {
      icon: TrendingUp,
      title: "Predictive Insights",
      description: "Forecasting delays, bottlenecks, and resource needs",
      status: "active"
    },
    {
      icon: Target,
      title: "Quality Control",
      description: "AI-powered defect detection and quality assurance",
      status: "active"
    },
    {
      icon: Shield,
      title: "Risk Assessment",
      description: "Identifying potential production and business risks",
      status: "active"
    },
    {
      icon: MessageSquare,
      title: "Natural Language Interface",
      description: "Conversational AI for business queries and commands",
      status: "active"
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Round-the-clock assistance and monitoring",
      status: "active"
    }
  ]

  const quickStats = [
    { label: "AI Accuracy", value: "94.7%", trend: "+2.3%" },
    { label: "Queries Processed", value: "2,847", trend: "+156" },
    { label: "Response Time", value: "0.8s", trend: "-0.2s" },
    { label: "Business Insights", value: "42", trend: "+8" }
  ]

  return (
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Neural Background */}
        <div className="quantum-field">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>

        <div className="relative z-10 p-6 space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 p-4 bg-slate-900/60 border border-cyan-500/30 rounded-2xl backdrop-blur-sm">
              <div className="ai-orb animate-pulse">
                <Brain className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white glitch-text" data-text="ASHLEY AI">
                  ASHLEY AI
                </h1>
                <p className="text-cyan-400 font-mono text-sm">Apparel Smart Hub - Artificial Intelligence</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <Activity className="w-3 h-3 mr-1" />
                NEURAL LINK ACTIVE
              </Badge>
            </div>
            
            <p className="text-lg text-gray-300 max-w-2xl mx-auto font-mono">
              Advanced AI Assistant for Production Management, Business Intelligence, and Operational Optimization
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickStats.map((stat, index) => (
              <Card key={index} className="quantum-card border-cyan-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-400 text-sm font-mono">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className="text-green-400 text-sm font-mono">
                      {stat.trend}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Capabilities */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="quantum-card border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Cpu className="w-5 h-5 mr-2 text-cyan-400" />
                    AI CAPABILITIES
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiCapabilities.map((capability, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-800/40 border border-cyan-500/20 rounded-lg">
                      <div className="ai-orb-small">
                        <capability.icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{capability.title}</h4>
                        <p className="text-gray-400 text-xs mt-1">{capability.description}</p>
                        <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                          <Zap className="w-2 h-2 mr-1" />
                          ACTIVE
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="quantum-card border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Activity className="w-5 h-5 mr-2 text-green-400" />
                    SYSTEM STATUS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-mono text-sm">Neural Network</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">OPTIMAL</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-mono text-sm">Data Processing</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ACTIVE</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-mono text-sm">Learning Module</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">ADAPTING</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-mono text-sm">Security Protocols</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">SECURED</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <AshleyChat 
                isMinimized={isChatMinimized}
                onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
                className="h-[600px]"
              />
            </div>
          </div>

          {/* Welcome Message for New Users */}
          {session?.user && (
            <Card className="quantum-card border-cyan-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="ai-orb">
                    <Brain className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Welcome to Ashley AI, {session.user.full_name}!
                    </h3>
                    <p className="text-gray-300 mb-4">
                      I'm your AI assistant for the ASH (Apparel Smart Hub) ERP system. I can help you with:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Production status and forecasting
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Inventory management insights
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Order tracking and delays
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Quality control analysis
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Financial metrics and margins
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        Business optimization recommendations
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-4 font-mono">
                      Start by asking me anything about your business operations in the chat interface above.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}