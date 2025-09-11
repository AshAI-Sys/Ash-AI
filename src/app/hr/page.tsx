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
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'employees', label: 'Employees', icon: Users },
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

          {/* Employee Management Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Employee Management</h2>
                <div className="flex gap-3">
                  <Button className="neon-btn-outline">
                    <Users className="w-4 h-4 mr-2" />
                    Import Employees
                  </Button>
                  <Button className="neon-btn-primary">
                    <Users className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              </div>

              <Card className="quantum-card">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap gap-4">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="flex-1 min-w-[200px] bg-slate-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                    />
                    <select className="bg-slate-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400">
                      <option value="">All Departments</option>
                      <option value="PRODUCTION">Production</option>
                      <option value="CUTTING">Cutting</option>
                      <option value="SEWING">Sewing</option>
                      <option value="QC">Quality Control</option>
                      <option value="ADMIN">Administration</option>
                    </select>
                    <select className="bg-slate-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-cyan-500/20">
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">ID</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">NAME</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">DEPARTMENT</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">POSITION</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">HIRE DATE</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">STATUS</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Sample employee data */}
                        <tr className="border-b border-slate-700/50 hover:bg-cyan-500/5">
                          <td className="py-3 px-4 text-white font-mono">0001</td>
                          <td className="py-3 px-4 text-white">Juan Dela Cruz</td>
                          <td className="py-3 px-4 text-gray-300">SEWING</td>
                          <td className="py-3 px-4 text-gray-300">Sewing Operator</td>
                          <td className="py-3 px-4 text-gray-300">2023-01-15</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              ACTIVE
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                View
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-700/50 hover:bg-cyan-500/5">
                          <td className="py-3 px-4 text-white font-mono">0002</td>
                          <td className="py-3 px-4 text-white">Maria Santos</td>
                          <td className="py-3 px-4 text-gray-300">QC</td>
                          <td className="py-3 px-4 text-gray-300">QC Inspector</td>
                          <td className="py-3 px-4 text-gray-300">2023-02-01</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              ACTIVE
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                View
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Attendance Tracking</h2>
                <div className="flex gap-3">
                  <Button className="neon-btn-outline">
                    <Clock className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                  <Button className="neon-btn-primary">
                    <Clock className="w-4 h-4 mr-2" />
                    Manual Entry
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-300">ON TIME TODAY</p>
                        <p className="text-2xl font-bold text-green-400">35</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-300">LATE TODAY</p>
                        <p className="text-2xl font-bold text-yellow-400">3</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-300">ABSENT TODAY</p>
                        <p className="text-2xl font-bold text-red-400">4</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="quantum-card">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap gap-4">
                    <input
                      type="date"
                      className="bg-slate-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                    <select className="bg-slate-800/50 border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400">
                      <option value="">All Departments</option>
                      <option value="PRODUCTION">Production</option>
                      <option value="CUTTING">Cutting</option>
                      <option value="SEWING">Sewing</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-cyan-500/20">
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">EMPLOYEE</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">TIME IN</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">TIME OUT</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">HOURS</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-700/50">
                          <td className="py-3 px-4 text-white">Juan Dela Cruz (0001)</td>
                          <td className="py-3 px-4 text-green-400">08:00 AM</td>
                          <td className="py-3 px-4 text-green-400">05:00 PM</td>
                          <td className="py-3 px-4 text-white">8.0</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              ON TIME
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Payroll Management</h2>
                <div className="flex gap-3">
                  <Button className="neon-btn-outline">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Export Payroll
                  </Button>
                  <Button className="neon-btn-primary">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Process Payroll
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-cyan-300">GROSS PAY</p>
                    <p className="text-xl font-bold text-white">₱2,456,780</p>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-cyan-300">DEDUCTIONS</p>
                    <p className="text-xl font-bold text-red-400">₱245,678</p>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-cyan-300">NET PAY</p>
                    <p className="text-xl font-bold text-green-400">₱2,211,102</p>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-cyan-300">TAX WITHHELD</p>
                    <p className="text-xl font-bold text-yellow-400">₱123,456</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="quantum-card">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Philippine Tax Compliance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex justify-between">
                        <span className="text-cyan-300">SSS Contributions</span>
                        <span className="text-white">₱45,600</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">PhilHealth</span>
                        <span className="text-white">₱32,100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Pag-IBIG</span>
                        <span className="text-white">₱18,200</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Leave Management</h2>
                <Button className="neon-btn-primary">
                  <Calendar className="w-4 h-4 mr-2" />
                  Approve Leaves
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-300">PENDING REQUESTS</p>
                        <p className="text-2xl font-bold text-yellow-400">5</p>
                      </div>
                      <Calendar className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-300">ON LEAVE TODAY</p>
                        <p className="text-2xl font-bold text-blue-400">3</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="quantum-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-300">THIS MONTH</p>
                        <p className="text-2xl font-bold text-cyan-400">18</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-cyan-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="quantum-card">
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-cyan-500/20">
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">EMPLOYEE</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">LEAVE TYPE</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">DATES</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">DAYS</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">STATUS</th>
                          <th className="text-left py-3 px-4 text-cyan-300 font-mono">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-700/50">
                          <td className="py-3 px-4 text-white">Maria Santos</td>
                          <td className="py-3 px-4 text-gray-300">Sick Leave</td>
                          <td className="py-3 px-4 text-gray-300">Sep 15-16, 2025</td>
                          <td className="py-3 px-4 text-white">2</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                              PENDING
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 px-2 bg-green-600 hover:bg-green-700">
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 px-2">
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">HR Reports</h2>
                <Button className="neon-btn-primary">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="quantum-card hover:bg-cyan-500/5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb">
                        <Users className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Employee Master List</h3>
                        <p className="text-sm text-gray-400">Complete employee database</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="quantum-card hover:bg-cyan-500/5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb">
                        <Clock className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Attendance Summary</h3>
                        <p className="text-sm text-gray-400">Monthly attendance report</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="quantum-card hover:bg-cyan-500/5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb">
                        <DollarSign className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Payroll Report</h3>
                        <p className="text-sm text-gray-400">BIR-compliant payroll data</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="quantum-card hover:bg-cyan-500/5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb">
                        <Calendar className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Leave Report</h3>
                        <p className="text-sm text-gray-400">Leave balances and usage</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="quantum-card hover:bg-cyan-500/5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb">
                        <FileText className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Government Reports</h3>
                        <p className="text-sm text-gray-400">SSS, PhilHealth, Pag-IBIG</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="quantum-card hover:bg-cyan-500/5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="ai-orb">
                        <TrendingUp className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Analytics Dashboard</h3>
                        <p className="text-sm text-gray-400">HR metrics and insights</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}