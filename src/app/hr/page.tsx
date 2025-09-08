'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Clock, 
  DollarSign, 
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  UserCheck,
  Calculator
} from 'lucide-react'
import Layout from '@/components/Layout'

export default function HRManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

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

  const hrStats = {
    totalEmployees: 45,
    activeToday: 38,
    onLeave: 3,
    pendingApprovals: 5,
    payrollPending: 2,
    averageAttendance: 94.2
  }

  return (
    <Layout>
      <div className="neural-bg min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white glitch-text" data-text="HR MANAGEMENT">
              HR MANAGEMENT
            </h1>
            <p className="text-cyan-300 font-mono">Human Resources & Payroll System</p>
          </div>
          
          <div className="flex gap-3">
            <Button className="neon-btn-primary">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button className="neon-btn-outline">
              <Calculator className="w-4 h-4 mr-2" />
              Payroll
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="quantum-card neon-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">TOTAL EMPLOYEES</p>
                  <p className="text-3xl font-bold text-white">{hrStats.totalEmployees}</p>
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs">+2 this month</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card neon-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">ACTIVE TODAY</p>
                  <p className="text-3xl font-bold text-white">{hrStats.activeToday}</p>
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-xs">{hrStats.averageAttendance}% attendance</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <UserCheck className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="quantum-card neon-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-cyan-300 font-mono">PENDING APPROVALS</p>
                  <p className="text-3xl font-bold text-white">{hrStats.pendingApprovals}</p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs">Requires attention</span>
                  </div>
                </div>
                <div className="ai-orb">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-900/50 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'attendance', label: 'Attendance', icon: Clock },
            { id: 'payroll', label: 'Payroll', icon: DollarSign },
            { id: 'leaves', label: 'Leaves', icon: Calendar },
            { id: 'reports', label: 'Reports', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 font-mono text-sm ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    Today's Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-300">Present</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      {hrStats.activeToday}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-300">On Leave</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      {hrStats.onLeave}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-300">Absent</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                      {hrStats.totalEmployees - hrStats.activeToday - hrStats.onLeave}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="quantum-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-cyan-400" />
                    Payroll Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-300">Current Period</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      Sep 1-15, 2025
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-300">Pending Runs</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                      {hrStats.payrollPending}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-300">Total Amount</span>
                    <span className="text-white font-mono">₱2,456,780</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab !== 'overview' && (
            <Card className="quantum-card">
              <CardContent className="p-8 text-center">
                <div className="ai-orb mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module
                </h3>
                <p className="text-cyan-300 mb-4">
                  This HR module is currently under development and will be available soon.
                </p>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  COMING SOON
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}