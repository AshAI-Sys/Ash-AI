// @ts-nocheck
"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Receipt, 
  CreditCard,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Calculator,
  Eye,
  Edit,
  Plus,
  Shield,
  Activity,
  Wallet
} from 'lucide-react'
import { Role } from '@prisma/client'

interface FinanceMetrics {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  cashFlow: number
  pendingInvoices: number
  overdueInvoices: number
  payrollCosts: number
  taxLiabilities: number
}

interface ExpenseItem {
  id: string
  expenseNumber: string
  description: string
  amount: number
  category: { name: string }
  paymentStatus: string
  expenseDate: string
  submitter: { name: string }
}

interface PayrollItem {
  id: string
  payrollNumber: string
  employee: { name: string }
  period: string
  netPay: number
  status: string
}

interface JournalEntry {
  id: string
  entryNumber: string
  description: string
  totalDebit: number
  totalCredit: number
  status: string
  entryDate: string
}

export default function ComprehensiveFinancePage() {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  const canManageFinance = session?.user.role === Role.ADMIN || 
                          session?.user.role === Role.MANAGER ||
                          session?.user.role === Role.ACCOUNTANT

  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    try {
      // Mock comprehensive finance data
      const mockMetrics: FinanceMetrics = {
        totalRevenue: 2850000,
        totalExpenses: 1950000,
        netProfit: 900000,
        cashFlow: 650000,
        pendingInvoices: 15,
        overdueInvoices: 3,
        payrollCosts: 480000,
        taxLiabilities: 85000
      }

      const mockExpenses: ExpenseItem[] = [
        {
          id: "1",
          expenseNumber: "EXP000001",
          description: "Office supplies and materials",
          amount: 15750,
          category: { name: "Office Supplies" },
          paymentStatus: "PAID",
          expenseDate: "2024-01-15",
          submitter: { name: "Maria Santos" }
        },
        {
          id: "2", 
          expenseNumber: "EXP000002",
          description: "Equipment maintenance and repair",
          amount: 28500,
          category: { name: "Maintenance" },
          paymentStatus: "PENDING",
          expenseDate: "2024-01-16",
          submitter: { name: "Juan Dela Cruz" }
        },
        {
          id: "3",
          expenseNumber: "EXP000003", 
          description: "Utility bills - January",
          amount: 42000,
          category: { name: "Utilities" },
          paymentStatus: "APPROVED",
          expenseDate: "2024-01-18",
          submitter: { name: "Ana Rodriguez" }
        }
      ]

      const mockPayrolls: PayrollItem[] = [
        {
          id: "1",
          payrollNumber: "PAY2024-01-001",
          employee: { name: "Ana Rodriguez" },
          period: "2024-01",
          netPay: 35000,
          status: "PAID"
        },
        {
          id: "2",
          payrollNumber: "PAY2024-01-002", 
          employee: { name: "Carlos Martinez" },
          period: "2024-01",
          netPay: 42000,
          status: "APPROVED"
        },
        {
          id: "3",
          payrollNumber: "PAY2024-01-003",
          employee: { name: "Sofia Gonzalez" },
          period: "2024-01", 
          netPay: 38500,
          status: "DRAFT"
        }
      ]

      const mockJournalEntries: JournalEntry[] = [
        {
          id: "1",
          entryNumber: "JE000001",
          description: "Monthly office rent expense",
          totalDebit: 25000,
          totalCredit: 25000,
          status: "POSTED",
          entryDate: "2024-01-01"
        },
        {
          id: "2",
          entryNumber: "JE000002",
          description: "Sales revenue recognition - January",
          totalDebit: 150000,
          totalCredit: 150000,
          status: "POSTED", 
          entryDate: "2024-01-02"
        },
        {
          id: "3",
          entryNumber: "JE000003",
          description: "Equipment depreciation - January",
          totalDebit: 8500,
          totalCredit: 8500,
          status: "DRAFT",
          entryDate: "2024-01-03"
        }
      ]

      setMetrics(mockMetrics)
      setExpenses(mockExpenses)
      setPayrolls(mockPayrolls)
      setJournalEntries(mockJournalEntries)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching finance data:", error)
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'posted':
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!canManageFinance) {
    return (
      <ResponsiveLayout>
        <div className="min-h-screen gradient-mesh relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-32 h-32 gradient-purple rounded-full opacity-20 float morph-shape"></div>
            <div className="absolute top-40 right-16 w-24 h-24 gradient-pink rounded-full opacity-30 float" style={{animationDelay: '2s'}}></div>
          </div>
          <div className="relative z-10 p-6">
            <div className="glass-card p-12 rounded-3xl text-center max-w-lg mx-auto mt-20">
              <div className="gradient-red w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Access Denied</h3>
              <p className="text-white/70 text-lg">
                You don't have permission to view financial information.
              </p>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="min-h-screen gradient-mesh relative overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="min-h-screen gradient-mesh relative overflow-hidden">
        {/* Floating background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 gradient-purple rounded-full opacity-20 float morph-shape"></div>
          <div className="absolute top-40 right-16 w-24 h-24 gradient-green rounded-full opacity-30 float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 gradient-blue rounded-full opacity-15 float morph-shape" style={{animationDelay: '4s'}}></div>
          <div className="absolute bottom-16 right-16 w-28 h-28 gradient-pink rounded-full opacity-25 float" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 p-6 space-y-6">
          {/* Header */}
          <div className="glass-card p-8 rounded-3xl slide-in-up">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gradient mb-2">Stage 9: Finance System</h1>
                <p className="text-white/80 text-lg">
                  Comprehensive financial management with BIR compliance for ASH AI System
                </p>
              </div>
              <div className="flex gap-3">
                <Button className="glass-card border border-white/20 text-white hover:bg-white/10 px-6 py-3 rounded-2xl font-semibold hover-scale">
                  <FileText className="w-5 h-5 mr-2" />
                  Generate Report
                </Button>
                <Button className="gradient-blue text-white px-6 py-3 rounded-2xl font-semibold hover-scale">
                  <Calculator className="w-5 h-5 mr-2" />
                  New Entry
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 slide-in-left">
              <div className="glass-card p-6 rounded-3xl hover-scale">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                  </div>
                  <div className="gradient-green w-12 h-12 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">+12.5% vs last month</span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-3xl hover-scale">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(metrics.totalExpenses)}
                    </p>
                  </div>
                  <div className="gradient-orange w-12 h-12 rounded-2xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <TrendingDown className="w-4 h-4 text-orange-400 mr-1" />
                  <span className="text-sm text-orange-400">+5.2% vs last month</span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-3xl hover-scale">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Net Profit</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(metrics.netProfit)}
                    </p>
                  </div>
                  <div className="gradient-blue w-12 h-12 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <TrendingUp className="w-4 w-4 text-blue-400 mr-1" />
                  <span className="text-sm text-blue-400">+18.7% vs last month</span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-3xl hover-scale">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm font-medium">Cash Flow</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(metrics.cashFlow)}
                    </p>
                  </div>
                  <div className="gradient-purple w-12 h-12 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <CheckCircle className="w-4 h-4 text-purple-400 mr-1" />
                  <span className="text-sm text-purple-400">Healthy</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Tabs */}
          <div className="glass-card p-6 rounded-3xl slide-in-right">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6 bg-white/10 rounded-2xl">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white/20 rounded-xl text-white">Overview</TabsTrigger>
                <TabsTrigger value="expenses" className="data-[state=active]:bg-white/20 rounded-xl text-white">Expenses</TabsTrigger>
                <TabsTrigger value="payroll" className="data-[state=active]:bg-white/20 rounded-xl text-white">Payroll</TabsTrigger>
                <TabsTrigger value="journal" className="data-[state=active]:bg-white/20 rounded-xl text-white">Journal</TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-white/20 rounded-xl text-white">Reports</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-white/20 rounded-xl text-white">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Expenses */}
                  <Card className="glass-card border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center text-white">
                        <Receipt className="h-5 w-5 mr-2" />
                        Recent Expenses
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Latest expense submissions and approvals
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {expenses.slice(0, 5).map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-white">{expense.description}</p>
                              <p className="text-sm text-white/60">
                                {expense.category.name} • {expense.submitter.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-white">{formatCurrency(expense.amount)}</p>
                              <Badge variant="secondary" className={getStatusColor(expense.paymentStatus)}>
                                {expense.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payroll Summary */}
                  <Card className="glass-card border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center text-white">
                        <Users className="h-5 w-5 mr-2" />
                        Payroll Status
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        Current month payroll processing status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {payrolls.slice(0, 5).map((payroll) => (
                          <div key={payroll.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-white">{payroll.employee.name}</p>
                              <p className="text-sm text-white/60">
                                {payroll.period} • {payroll.payrollNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-white">{formatCurrency(payroll.netPay)}</p>
                              <Badge variant="secondary" className={getStatusColor(payroll.status)}>
                                {payroll.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Finance Alerts */}
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Finance Alerts & BIR Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
                        <Clock className="h-8 w-8 text-yellow-400 mr-3" />
                        <div>
                          <p className="font-semibold text-yellow-300">Pending Approvals</p>
                          <p className="text-sm text-yellow-400">8 expense reports awaiting approval</p>
                        </div>
                      </div>

                      <div className="flex items-center p-4 bg-red-500/20 border border-red-400/30 rounded-lg">
                        <AlertTriangle className="h-8 w-8 text-red-400 mr-3" />
                        <div>
                          <p className="font-semibold text-red-300">Overdue Invoices</p>
                          <p className="text-sm text-red-400">{metrics?.overdueInvoices} invoices past due date</p>
                        </div>
                      </div>

                      <div className="flex items-center p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                        <Calendar className="h-8 w-8 text-blue-400 mr-3" />
                        <div>
                          <p className="font-semibold text-blue-300">Tax Filing Due</p>
                          <p className="text-sm text-blue-400">BIR monthly filing in 5 days</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="expenses">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-white">Expense Management</CardTitle>
                    <CardDescription className="text-white/60">Track and manage all business expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-medium text-white">{expense.description}</p>
                                <p className="text-sm text-white/60">
                                  {expense.expenseNumber} • {expense.category.name}
                                </p>
                                <p className="text-sm text-white/50">
                                  Submitted by {expense.submitter.name} on {new Date(expense.expenseDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg text-white">{formatCurrency(expense.amount)}</p>
                            <Badge variant="secondary" className={getStatusColor(expense.paymentStatus)}>
                              {expense.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payroll">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-white">Payroll Management</CardTitle>
                    <CardDescription className="text-white/60">Employee payroll processing with SSS/PhilHealth/Pag-ibig compliance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {payrolls.map((payroll) => (
                        <div key={payroll.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-medium text-white">{payroll.employee.name}</p>
                                <p className="text-sm text-white/60">
                                  {payroll.payrollNumber} • Period: {payroll.period}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg text-white">{formatCurrency(payroll.netPay)}</p>
                            <Badge variant="secondary" className={getStatusColor(payroll.status)}>
                              {payroll.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="journal">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-white">Journal Entries</CardTitle>
                    <CardDescription className="text-white/60">Double-entry bookkeeping journal management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {journalEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-medium text-white">{entry.description}</p>
                                <p className="text-sm text-white/60">
                                  {entry.entryNumber} • {new Date(entry.entryDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/60">
                              Dr: {formatCurrency(entry.totalDebit)} | Cr: {formatCurrency(entry.totalCredit)}
                            </p>
                            <Badge variant="secondary" className={getStatusColor(entry.status)}>
                              {entry.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-white">BIR-Compliant Financial Reports</CardTitle>
                    <CardDescription className="text-white/60">Generate Philippine tax authority compliant reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Button variant="outline" className="h-20 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10">
                        <PieChart className="h-6 w-6 mb-2" />
                        Profit & Loss
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10">
                        <BarChart3 className="h-6 w-6 mb-2" />
                        Balance Sheet
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10">
                        <TrendingUp className="h-6 w-6 mb-2" />
                        Cash Flow
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10">
                        <FileText className="h-6 w-6 mb-2" />
                        BIR 2307 Certificates
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10">
                        <Calendar className="h-6 w-6 mb-2" />
                        VAT Returns
                      </Button>
                      <Button variant="outline" className="h-20 flex flex-col items-center justify-center glass-card border-white/20 text-white hover:bg-white/10">
                        <Receipt className="h-6 w-6 mb-2" />
                        Withholding Tax
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="text-white">Finance Settings</CardTitle>
                    <CardDescription className="text-white/60">Configure chart of accounts and tax settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button variant="outline" className="glass-card border-white/20 text-white hover:bg-white/10">
                        <Calculator className="h-4 w-4 mr-2" />
                        Chart of Accounts
                      </Button>
                      <Button variant="outline" className="glass-card border-white/20 text-white hover:bg-white/10">
                        <FileText className="h-4 w-4 mr-2" />
                        BIR Tax Configuration
                      </Button>
                      <Button variant="outline" className="glass-card border-white/20 text-white hover:bg-white/10">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payment Methods
                      </Button>
                      <Button variant="outline" className="glass-card border-white/20 text-white hover:bg-white/10">
                        <Users className="h-4 w-4 mr-2" />
                        Employee Benefits Setup
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  )
}