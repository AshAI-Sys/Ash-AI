'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, Zap, Target, Shield, BarChart3, Users, Sparkles, Play, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    
    if (session) {
      router.push('/dashboard')
      return
    }
    
    setMounted(true)
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6)
    }, 3000)
    return () => clearInterval(interval)
  }, [session, status, router])

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Production",
      description: "Ashley AI optimizes your entire manufacturing workflow with predictive analytics and smart automation.",
      color: "from-cyan-400 to-teal-400"
    },
    {
      icon: Target,
      title: "Smart Order Management",
      description: "Streamlined order processing with real-time tracking and intelligent routing optimization.",
      color: "from-teal-400 to-cyan-400"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time insights and forecasting to make data-driven decisions for your business.",
      color: "from-cyan-400 to-slate-700"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with role-based access control and audit trails.",
      color: "from-slate-700 to-cyan-400"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Seamless collaboration tools for teams across design, production, and quality control.",
      color: "from-teal-400 to-slate-700"
    },
    {
      icon: Zap,
      title: "Automation Engine",
      description: "Automated workflows, notifications, and process optimization to maximize efficiency.",
      color: "from-cyan-400 to-teal-400"
    }
  ]

  const testimonials = [
    {
      name: "Maria Santos",
      role: "CEO, Premium Apparel Co.",
      content: "ASH AI transformed our production efficiency by 300%. The AI insights are game-changing.",
      rating: 5
    },
    {
      name: "John Chen",
      role: "Operations Manager, Fashion Forward",
      content: "Best investment we've made. The system pays for itself within months.",
      rating: 5
    },
    {
      name: "Sarah Kim",
      role: "Production Director, Style Works",
      content: "Finally, a system that understands apparel manufacturing. Ashley AI is brilliant.",
      rating: 5
    }
  ]

  if (status === 'loading') {
    return (
      <div className="min-h-screen neural-bg flex items-center justify-center">
        <div className="text-center">
          <div className="quantum-loader w-16 h-16 mx-auto mb-8">
            <div></div><div></div><div></div>
          </div>
          <h1 className="text-3xl font-bold glitch-text text-white mb-4" data-text="ASH AI">ASH AI</h1>
          <p className="text-cyan-300 font-medium">Initializing Neural Manufacturing System...</p>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen neural-bg flex items-center justify-center">
        <div className="quantum-loader w-16 h-16">
          <div></div><div></div><div></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen neural-bg relative overflow-hidden">
      {/* Quantum Field Background */}
      <div className="quantum-field">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="quantum-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          />
        ))}
      </div>
      
      {/* Circuit Pattern Overlay */}
      <div className="absolute inset-0 circuit-pattern opacity-10"></div>

      {/* Professional Navigation */}
      <nav className="relative z-20 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="ai-orb w-12 h-12">
              <img src="/Ash-AI.png" alt="ASH AI" className="w-6 h-6 object-contain z-10 relative" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ASH AI</h1>
              <p className="text-xs text-cyan-300 uppercase tracking-wider">Apparel Smart Hub</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-cyan-300 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-cyan-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="#about" className="text-cyan-300 hover:text-white transition-colors">About</Link>
            <Link href="/demo">
              <Button className="neon-btn">Access Demo</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300 font-medium">Next-Generation Manufacturing Intelligence</span>
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-8">
            <span className="glitch-text text-white" data-text="The Future of">
              The Future of
            </span>
            <br />
            <span className="text-gradient bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Apparel Manufacturing
            </span>
          </h1>

          <p className="text-xl text-cyan-200 mb-12 max-w-3xl mx-auto leading-relaxed">
            Powered by Ashley AI, our revolutionary platform transforms traditional apparel manufacturing 
            into a smart, efficient, and profitable operation. Join the manufacturing revolution.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-16">
            <Link href="/demo">
              <Button className="neon-btn text-lg px-8 py-4 h-auto">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" className="text-lg px-8 py-4 h-auto text-cyan-300 hover:text-white border border-cyan-500/50 hover:bg-cyan-500/10">
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { label: "Efficiency Increase", value: "300%" },
              { label: "Cost Reduction", value: "45%" },
              { label: "Happy Clients", value: "500+" },
              { label: "Orders Processed", value: "1M+" }
            ].map((stat, index) => (
              <div key={index} className="quantum-card text-center p-6">
                <div className="text-3xl font-bold text-cyan-400 mb-2">{stat.value}</div>
                <div className="text-sm text-cyan-200 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-6">
              Powered by <span className="text-gradient bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Ashley AI</span>
            </h2>
            <p className="text-xl text-cyan-200 max-w-3xl mx-auto">
              Our advanced AI assistant revolutionizes every aspect of apparel manufacturing, 
              from design to delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isActive = index === activeFeature
              
              return (
                <div
                  key={index}
                  className={`hologram-card p-8 transition-all duration-500 ${
                    isActive ? 'scale-105 neon-glow' : ''
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} p-4 mb-6 mx-auto flex items-center justify-center`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 text-center">{feature.title}</h3>
                  <p className="text-cyan-200 text-center leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-6">Trusted by Industry Leaders</h2>
            <p className="text-xl text-cyan-200">Join hundreds of successful apparel manufacturers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="quantum-card p-8">
                <div className="flex items-center mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-cyan-200 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="text-white font-semibold">{testimonial.name}</p>
                  <p className="text-cyan-300 text-sm">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-6">Choose Your Plan</h2>
            <p className="text-xl text-cyan-200">Start your transformation today</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$99",
                period: "/month",
                features: ["Up to 100 orders/month", "Basic AI insights", "Standard support", "Core modules"],
                popular: false
              },
              {
                name: "Professional",
                price: "$299",
                period: "/month",
                features: ["Unlimited orders", "Advanced AI analytics", "Priority support", "All modules", "API access"],
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                features: ["Custom deployment", "Dedicated AI model", "24/7 support", "Custom integrations", "Training included"],
                popular: false
              }
            ].map((plan, index) => (
              <div key={index} className={`quantum-card p-8 ${plan.popular ? 'neon-glow scale-105' : ''}`}>
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-cyan-400 mb-1">{plan.price}</div>
                  <div className="text-cyan-300">{plan.period}</div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-cyan-200">
                      <Check className="w-5 h-5 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className={`w-full neon-btn ${plan.popular ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : ''}`}>
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="quantum-card p-16">
            <h2 className="text-5xl font-bold text-white mb-6">Ready to Transform Your Business?</h2>
            <p className="text-xl text-cyan-200 mb-8">
              Join the future of apparel manufacturing with ASH AI. Start your free trial today.
            </p>
            <Link href="/auth/signin">
              <Button className="neon-btn text-xl px-12 py-6 h-auto">
                Access ASH AI Portal
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 border-t border-cyan-500/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="ai-orb w-10 h-10">
                  <img src="/Ash-AI.png" alt="ASH AI" className="w-5 h-5 object-contain z-10 relative" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">ASH AI</h3>
                  <p className="text-xs text-cyan-300">Apparel Smart Hub</p>
                </div>
              </div>
              <p className="text-cyan-200 text-sm">
                The future of intelligent apparel manufacturing.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-cyan-200 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integration</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-cyan-200 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-cyan-200 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-cyan-500/30 mt-12 pt-8 text-center">
            <p className="text-cyan-300 text-sm">
              © 2024 ASH AI. All rights reserved. Built with Next.js and powered by Ashley AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
