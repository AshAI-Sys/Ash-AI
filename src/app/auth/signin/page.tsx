'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center neural-bg p-4 relative overflow-hidden">
      {/* Quantum Field Background */}
      <div className="quantum-field">
        {Array.from({ length: 15 }).map((_, i) => (
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
      
      {/* Matrix Rain Effect */}
      <div className="matrix-rain">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="matrix-char"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          >
            {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
          </div>
        ))}
      </div>
      
      <Card className="w-full max-w-md hologram-card relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="ai-orb w-20 h-20 mb-6 mx-auto">
            <img src="/Ash-AI.png" alt="ASH AI Logo" className="w-12 h-12 object-contain z-10 relative" />
          </div>
          <CardTitle className="text-3xl font-bold glitch-text text-white" data-text="Neural Access">
            Neural Access
          </CardTitle>
          <CardDescription className="text-cyan-300 mt-2 font-semibold tracking-wider uppercase">
            ASH AI - Apparel Smart Hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Neural ID // Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="cyber-input h-12 placeholder:text-cyan-400/60"
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Security Key // Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="cyber-input h-12 placeholder:text-cyan-400/60"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-500/50 neon-glow">
                <p className="text-red-300 text-sm font-medium">⚠ NEURAL ACCESS DENIED: {error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="neon-btn w-full h-12 font-medium rounded-xl btn-animate shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="quantum-loader w-4 h-4">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  INITIALIZING NEURAL LINK...
                </div>
              ) : (
                'INITIATE NEURAL ACCESS'
              )}
            </Button>
          </form>

          <div className="mt-8 quantum-card">
            <p className="text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wider">⚡ TEST NEURAL IDS:</p>
            <div className="text-xs text-cyan-200/80 space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <span className="status-hologram status-active text-[10px]">ADMIN</span>
                <span>admin@example.com / admin123</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="status-hologram status-pending text-[10px]">MANAGER</span>
                <span>manager@example.com / admin123</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}