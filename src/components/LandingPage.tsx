// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight,
  Sparkles,
  Bot,
  Factory,
  BarChart3,
  Shield,
  Zap,
  Users,
  Package,
  Target,
  Brain,
  Workflow,
  CheckCircle,
  Star,
  TrendingUp,
  Globe,
  Clock,
  Award,
  Palette,
  Scissors,
  Shirt
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: "Ashley AI Assistant",
    description: "Intelligent production planning with predictive analytics and real-time optimization",
    color: "from-purple-500 to-blue-500"
  },
  {
    icon: Workflow,
    title: "Smart Routing Engine", 
    description: "Automated workflow routing for Silkscreen, DTF, Sublimation, and Embroidery processes",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Advanced dashboard with live production metrics and performance insights",
    color: "from-green-500 to-teal-500"
  },
  {
    icon: Shield,
    title: "Quality Assurance",
    description: "Comprehensive QC system with AQL sampling and defect tracking",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Smart inventory tracking with QR codes and automated reorder points",
    color: "from-pink-500 to-rose-500"
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Role-based access control with real-time team productivity monitoring",
    color: "from-indigo-500 to-purple-500"
  }
]

const stats = [
  { number: "500+", label: "Orders Processed", icon: Package },
  { number: "95%", label: "Quality Score", icon: Target },
  { number: "24/7", label: "System Uptime", icon: Clock },
  { number: "50%", label: "Efficiency Gain", icon: TrendingUp }
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Production Manager",
    company: "Manila Apparel Co.",
    content: "ASH AI transformed our production workflow. We've seen 40% improvement in efficiency and near-perfect quality scores.",
    avatar: "SC"
  },
  {
    name: "Mike Rodriguez",
    role: "Operations Director", 
    company: "Philippine Textiles Inc.",
    content: "The routing engine is incredible. Ashley AI predicts bottlenecks before they happen and suggests optimal solutions.",
    avatar: "MR"
  },
  {
    name: "Lisa Tan",
    role: "QC Supervisor",
    company: "Cebu Manufacturing Hub",
    content: "Quality control has never been easier. The AQL sampling system catches defects early and maintains our standards.",
    avatar: "LT"
  }
]

export function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Next-Generation Manufacturing AI
            </Badge>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-8">
              <span className="animated-gradient-text">ASH AI</span>
              <br />
              <span className="text-slate-800">Production Hub</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Transform your apparel manufacturing with intelligent automation, predictive analytics, 
              and real-time optimization powered by Ashley AI assistant.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-slate-300 hover:border-purple-500 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-50 transition-all duration-300"
              >
                Watch Demo
              </Button>
            </div>
          </div>
          
          {/* Floating Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="ash-glass rounded-3xl p-8 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="enhanced-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">247</h3>
                    <p className="text-slate-600">Active Orders</p>
                  </CardContent>
                </Card>
                
                <Card className="enhanced-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">96.8%</h3>
                    <p className="text-slate-600">Quality Score</p>
                  </CardContent>
                </Card>
                
                <Card className="enhanced-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center pulse-glow">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Ashley</h3>
                    <p className="text-slate-600">AI Online</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Intelligent Manufacturing Features
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Discover how ASH AI revolutionizes apparel production with cutting-edge technology and intelligent automation
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="enhanced-card group hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className="text-center animate-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">{stat.number}</div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Showcase */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Complete Production Pipeline
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              From order intake to final delivery - ASH AI manages every step of your manufacturing process
            </p>
          </div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              {[
                { icon: Package, label: "Order Intake", color: "bg-blue-500" },
                { icon: Palette, label: "Design", color: "bg-purple-500" },
                { icon: Scissors, label: "Cutting", color: "bg-green-500" },
                { icon: Factory, label: "Production", color: "bg-orange-500" },
                { icon: CheckCircle, label: "Quality", color: "bg-red-500" },
                { icon: Shirt, label: "Delivery", color: "bg-pink-500" }
              ].map((step, index) => (
                <div key={step.label} className="flex flex-col items-center">
                  <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mb-4 animate-pulse`}
                       style={{ animationDelay: `${index * 500}ms` }}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                  {index < 5 && (
                    <ArrowRight className="w-6 h-6 text-slate-400 mt-4 absolute" 
                                style={{ left: `${(index + 1) * 16.666}%`, transform: 'translateX(-50%)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-16">
            Trusted by Industry Leaders
          </h2>
          
          <Card className="ash-glass backdrop-blur-xl border border-white/20 p-8 mb-8">
            <CardContent className="p-8">
              <div className="flex justify-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <blockquote className="text-xl md:text-2xl text-slate-700 mb-8 leading-relaxed italic">
                "{testimonials[currentTestimonial].content}"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {testimonials[currentTestimonial].avatar}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900">{testimonials[currentTestimonial].name}</div>
                  <div className="text-slate-600">{testimonials[currentTestimonial].role}</div>
                  <div className="text-slate-500 text-sm">{testimonials[currentTestimonial].company}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-center space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTestimonial ? 'bg-purple-600' : 'bg-slate-300'
                }`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to Transform Your Manufacturing?
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto">
            Join hundreds of manufacturers already using ASH AI to optimize their production and deliver exceptional results.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              size="lg"
              className="bg-white text-purple-600 hover:bg-slate-100 px-8 py-4 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Zap className="mr-2 w-5 h-5" />
              Get Started Today
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300"
            >
              <Globe className="mr-2 w-5 h-5" />
              Schedule Demo
            </Button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <Award className="w-8 h-8 mx-auto mb-4" />
              <h4 className="font-semibold mb-2">30-Day Free Trial</h4>
              <p className="text-purple-100 text-sm">No credit card required</p>
            </div>
            <div>
              <Users className="w-8 h-8 mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Expert Support</h4>
              <p className="text-purple-100 text-sm">24/7 technical assistance</p>
            </div>
            <div>
              <CheckCircle className="w-8 h-8 mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Guaranteed ROI</h4>
              <p className="text-purple-100 text-sm">Or your money back</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}