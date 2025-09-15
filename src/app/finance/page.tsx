// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Edit,
  Shield,
  Activity,
  DollarSign,
  AlertTriangle,
  Receipt,
  Users,
  FileText,
  BarChart3,
  PieChart,
  Calculator,
  Calendar,
  CheckCircle,
  Clock,
  Brain,
  Zap,
  Database,
  Settings,
  Cpu,
  Building,
  BookOpen,
  Download,
  Upload,
  Target,
  Monitor,
  Percent,
  Timer,
  Building2,
  Flag,
  Briefcase,
  Banknote,
  HandCoins,
  TrendingUp as TrendIcon,
  AlertCircle
} from 'lucide-react'
import { Role } from '@prisma/client'
import { TikTokCenteredLayout, TikTokPageHeader, TikTokContentCard, TikTokMetricsGrid, TikTokMetricCard } from '@/components/TikTokCenteredLayout'

interface WalletData {
  id: string
  name: string
  type: 'BANK' | 'GCASH' | 'CASH_REGISTER' | 'PETTY_CASH'
  balance: number
  currency: string
}

interface Transaction {
  id: string
  walletId: string
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER'
  amount: number
  description: string
  reference: string
  date: string
  balanceBefore: number
  balanceAfter: number
}

interface Bill {
  id: string
  billNumber: string
  vendorName: string
  amount: number
  dueDate: string
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  description: string
}

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

interface BIRCompliance {
  vatReturns: {
    quarter: string
    dueDate: string
    status: 'PENDING' | 'FILED' | 'OVERDUE'
    amount: number
    form: '2550M' | '2550Q'
    penalties?: number
  }[]
  withholdingTax: {
    month: string
    amount: number
    status: 'PENDING' | 'REMITTED' | 'OVERDUE'
    form: '2307' | '1601-C'
    certificate?: string
  }[]
  annualITR: {
    year: string
    status: 'PENDING' | 'FILED' | 'EXTENDED'
    dueDate: string
    form: '1701' | '1702'
    taxDue?: number
  }[]
  alphaList: {
    year: string
    status: 'PENDING' | 'SUBMITTED'
    suppliers: number
    customers: number
  }[]
}

interface ProfitLossStatement {
  period: string
  revenue: {
    sales: number
    serviceIncome: number
    otherIncome: number
    total: number
  }
  costOfGoodsSold: {
    materials: number
    labor: number
    overhead: number
    total: number
  }
  grossProfit: number
  operatingExpenses: {
    salaries: number
    rent: number
    utilities: number
    marketing: number
    depreciation: number
    other: number
    total: number
  }
  ebitda: number
  netIncome: number
  margins: {
    gross: number
    operating: number
    net: number
  }
}

interface FinancialKPIs {
  currentRatio: number
  quickRatio: number
  debtToEquity: number
  returnOnAssets: number
  returnOnEquity: number
  inventoryTurnover: number
  receivablesTurnover: number
  payablesTurnover: number
  cashConversionCycle: number
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

const mockWallets: WalletData[] = [
  {
    id: '1',
    name: 'Main Bank Account',
    type: 'BANK',
    balance: 125450.00,
    currency: 'PHP'
  },
  {
    id: '2', 
    name: 'GCash Wallet',
    type: 'GCASH',
    balance: 18750.50,
    currency: 'PHP'
  },
  {
    id: '3',
    name: 'Cash Register',
    type: 'CASH_REGISTER', 
    balance: 7500.00,
    currency: 'PHP'
  },
  {
    id: '4',
    name: 'Petty Cash',
    type: 'PETTY_CASH',
    balance: 2200.00,
    currency: 'PHP'
  }
]

const mockTransactions: Transaction[] = [
  {
    id: '1',
    walletId: '1',
    type: 'CREDIT',
    amount: 15000.00,
    description: 'Order payment from ABC Company',
    reference: 'ORD-001',
    date: '2024-08-28',
    balanceBefore: 110450.00,
    balanceAfter: 125450.00
  },
  {
    id: '2',
    walletId: '2',
    type: 'DEBIT',
    amount: 2500.00,
    description: 'Material purchase - DTF Film',
    reference: 'PO-025',
    date: '2024-08-27',
    balanceBefore: 21250.50,
    balanceAfter: 18750.50
  },
  {
    id: '3',
    walletId: '3',
    type: 'DEBIT',
    amount: 500.00,
    description: 'Fuel for delivery van',
    reference: 'FUEL-001',
    date: '2024-08-26',
    balanceBefore: 8000.00,
    balanceAfter: 7500.00
  }
]

const mockBIRCompliance: BIRCompliance = {
  vatReturns: [
    {
      quarter: 'Q3 2025',
      dueDate: '2025-10-25',
      status: 'PENDING',
      amount: 45600.00,
      form: '2550Q',
      penalties: 0
    },
    {
      quarter: 'Q2 2025',
      dueDate: '2025-07-25',
      status: 'FILED',
      amount: 38900.00,
      form: '2550Q'
    }
  ],
  withholdingTax: [
    {
      month: 'September 2025',
      amount: 12500.00,
      status: 'PENDING',
      form: '2307',
      certificate: 'WHT-2025-09'
    },
    {
      month: 'August 2025',
      amount: 11800.00,
      status: 'REMITTED',
      form: '2307',
      certificate: 'WHT-2025-08'
    }
  ],
  annualITR: [
    {
      year: '2025',
      status: 'PENDING',
      dueDate: '2026-04-15',
      form: '1702',
      taxDue: 125000.00
    },
    {
      year: '2024',
      status: 'FILED',
      dueDate: '2025-04-15',
      form: '1702'
    }
  ],
  alphaList: [
    {
      year: '2025',
      status: 'PENDING',
      suppliers: 45,
      customers: 128
    },
    {
      year: '2024',
      status: 'SUBMITTED',
      suppliers: 38,
      customers: 95
    }
  ]
}

const mockProfitLoss: ProfitLossStatement = {
  period: 'Q3 2025',
  revenue: {
    sales: 2850000.00,
    serviceIncome: 450000.00,
    otherIncome: 25000.00,
    total: 3325000.00
  },
  costOfGoodsSold: {
    materials: 1200000.00,
    labor: 680000.00,
    overhead: 185000.00,
    total: 2065000.00
  },
  grossProfit: 1260000.00,
  operatingExpenses: {
    salaries: 320000.00,
    rent: 85000.00,
    utilities: 45000.00,
    marketing: 75000.00,
    depreciation: 25000.00,
    other: 95000.00,
    total: 645000.00
  },
  ebitda: 640000.00,
  netIncome: 615000.00,
  margins: {
    gross: 37.9,
    operating: 19.2,
    net: 18.5
  }
}

const mockFinancialKPIs: FinancialKPIs = {
  currentRatio: 2.8,
  quickRatio: 1.9,
  debtToEquity: 0.45,
  returnOnAssets: 12.5,
  returnOnEquity: 18.2,
  inventoryTurnover: 8.5,
  receivablesTurnover: 12.3,
  payablesTurnover: 9.8,
  cashConversionCycle: 45.2
}

const mockBills: Bill[] = [
  {
    id: '1',
    billNumber: 'BILL-001',
    vendorName: 'Textile Supplier Co.',
    amount: 25000.00,
    dueDate: '2024-09-05',
    status: 'PENDING',
    description: 'Cotton fabric bulk order'
  },
  {
    id: '2',
    billNumber: 'BILL-002', 
    vendorName: 'Ink & Supplies Ltd.',
    amount: 8500.00,
    dueDate: '2024-08-30',
    status: 'OVERDUE',
    description: 'Screen printing inks and chemicals'
  },
  {
    id: '3',
    billNumber: 'BILL-003',
    vendorName: 'Power Company',
    amount: 12000.00,
    dueDate: '2024-09-15',
    status: 'PENDING',
    description: 'Electricity bill for August'
  }
]

export default function FinancePage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'transactions' | 'bills' | 'ar-ap' | 'reports'>('overview')
  const [wallets] = useState<WalletData[]>(mockWallets)
  const [transactions] = useState<Transaction[]>(mockTransactions)
  const [bills] = useState<Bill[]>(mockBills)

  const canManageFinance = session?.user.role === Role.ADMIN || 
                          session?.user.role === Role.MANAGER ||
                          session?.user.role === Role.ACCOUNTANT

  if (!canManageFinance) {
    return (
      <TikTokLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
                    <Shield className="w-16 h-16 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Access Denied
                  </h3>
                  <p className="text-gray-600">
                    You don't have permission to access financial data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TikTokLayout>
    )
  }

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
  const pendingBills = bills.filter(bill => bill.status === 'PENDING')
  const overdueBills = bills.filter(bill => bill.status === 'OVERDUE')
  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0)
  const totalOverdue = overdueBills.reduce((sum, bill) => sum + bill.amount, 0)

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'BANK': return <CreditCard className="w-5 h-5" />
      case 'GCASH': return <Wallet className="w-5 h-5" />
      case 'CASH_REGISTER': return <Wallet className="w-5 h-5" />
      case 'PETTY_CASH': return <Wallet className="w-5 h-5" />
      default: return <Wallet className="w-5 h-5" />
    }
  }

  const getBillStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'OVERDUE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <TikTokLayout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
          {/* Neural Financial Command Center Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold glitch-text text-white mb-3" data-text="FINANCIAL COMMAND CENTER">
                💰 FINANCIAL COMMAND CENTER
              </h1>
              <p className="text-cyan-300 text-xl font-mono">
                Advanced BIR compliance • P&L analytics • Real-time monitoring • Philippine tax authority integration
              </p>
            </div>

            <div className="flex gap-4">
              <div className="hologram-card p-4">
                <div className="text-center">
                  <p className="text-sm text-cyan-300 font-mono">TOTAL LIQUIDITY</p>
                  <p className="text-2xl font-bold text-white">₱{totalBalance.toLocaleString()}</p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50 mt-2">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    OPERATIONAL
                  </Badge>
                </div>
              </div>

              <Button className="neon-btn">
                <Brain className="w-4 h-4 mr-2" />
                AI INSIGHTS
              </Button>

              <Button className="neon-btn-primary">
                <Download className="w-4 h-4 mr-2" />
                BIR REPORTS
              </Button>
            </div>
          </div>

          {/* Advanced Financial Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">NET INCOME</p>
                    <p className="text-3xl font-bold text-white">₱{mockProfitLoss.netIncome.toLocaleString()}</p>
                    <p className="text-xs text-green-400 mt-1">{mockProfitLoss.margins.net}% margin</p>
                  </div>
                  <div className="ai-orb">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">GROSS PROFIT</p>
                    <p className="text-3xl font-bold text-white">₱{mockProfitLoss.grossProfit.toLocaleString()}</p>
                    <p className="text-xs text-blue-400 mt-1">{mockProfitLoss.margins.gross}% margin</p>
                  </div>
                  <div className="ai-orb">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">VAT LIABILITY</p>
                    <p className="text-3xl font-bold text-white">₱{mockBIRCompliance.vatReturns[0].amount.toLocaleString()}</p>
                    <p className="text-xs text-red-400 mt-1">Due: {mockBIRCompliance.vatReturns[0].dueDate}</p>
                  </div>
                  <div className="ai-orb">
                    <Flag className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">CASH CYCLE</p>
                    <p className="text-3xl font-bold text-white">{mockFinancialKPIs.cashConversionCycle}</p>
                    <p className="text-xs text-purple-400 mt-1">days conversion</p>
                  </div>
                  <div className="ai-orb">
                    <Timer className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BIR Compliance Alert Panel */}
          <Card className="quantum-card border-red-500/30 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <div className="ai-orb mr-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                BIR COMPLIANCE STATUS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                      PENDING
                    </Badge>
                    <span className="text-cyan-300 font-mono text-sm">VAT RETURN</span>
                  </div>
                  <p className="text-white font-bold text-lg">Form {mockBIRCompliance.vatReturns[0].form}</p>
                  <p className="text-red-400 text-sm">Due: {mockBIRCompliance.vatReturns[0].dueDate}</p>
                  <p className="text-cyan-300 font-mono">₱{mockBIRCompliance.vatReturns[0].amount.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-lg border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                      PENDING
                    </Badge>
                    <span className="text-cyan-300 font-mono text-sm">WITHHOLDING TAX</span>
                  </div>
                  <p className="text-white font-bold text-lg">Form {mockBIRCompliance.withholdingTax[0].form}</p>
                  <p className="text-yellow-400 text-sm">{mockBIRCompliance.withholdingTax[0].month}</p>
                  <p className="text-cyan-300 font-mono">₱{mockBIRCompliance.withholdingTax[0].amount.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                      PENDING
                    </Badge>
                    <span className="text-cyan-300 font-mono text-sm">ANNUAL ITR</span>
                  </div>
                  <p className="text-white font-bold text-lg">Form {mockBIRCompliance.annualITR[0].form}</p>
                  <p className="text-purple-400 text-sm">Due: {mockBIRCompliance.annualITR[0].dueDate}</p>
                  <p className="text-cyan-300 font-mono">₱{mockBIRCompliance.annualITR[0].taxDue?.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <Button className="neon-btn-primary">
                  <Download className="w-4 h-4 mr-2" />
                  GENERATE VAT RETURN
                </Button>
                <Button className="neon-btn">
                  <FileText className="w-4 h-4 mr-2" />
                  PRINT CERTIFICATES
                </Button>
                <Button className="neon-btn">
                  <Upload className="w-4 h-4 mr-2" />
                  E-FILE RETURNS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Neural Action Buttons */}
          <div className="flex gap-4 flex-wrap mb-8">
            <Button className="neon-btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
            <Button variant="outline" className="border-gray-300">
              <Receipt className="w-4 h-4 mr-2" />
              Create Bill
            </Button>
            <Button variant="outline" className="border-gray-300">
              <Building className="w-4 h-4 mr-2" />
              BIR Compliance
            </Button>
            <Button variant="outline" className="border-gray-300">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <div className="flex flex-wrap gap-1">
              {[
                { key: 'overview', label: 'Overview', icon: TrendingUp },
                { key: 'wallets', label: 'Wallets', icon: Wallet },
                { key: 'transactions', label: 'Transactions', icon: Activity },
                { key: 'bills', label: 'Bills', icon: Building },
                { key: 'ar-ap', label: 'AR/AP', icon: Calculator },
                { key: 'reports', label: 'Reports', icon: BarChart3 }
              ].map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Overview Dashboard */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Wallet className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Total Balance</div>
                        <div className="text-xl font-bold text-gray-900">₱{totalBalance.toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Pending Bills</div>
                        <div className="text-xl font-bold text-gray-900">₱{totalPending.toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Overdue</div>
                        <div className="text-xl font-bold text-gray-900">₱{totalOverdue.toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Net Position</div>
                        <div className="text-xl font-bold text-gray-900">₱{(totalBalance - totalPending - totalOverdue).toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* BIR Compliance Section */}
              <Card className="quantum-card border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Building className="w-5 h-5 mr-2 text-yellow-400" />
                    BIR COMPLIANCE NEURAL MONITOR
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-yellow-400" />
                        <h4 className="font-semibold text-yellow-400 font-mono">VAT RETURNS</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Q3 2024:</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">FILED</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Q4 2024:</span>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">DUE NOV 25</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="w-4 h-4 text-purple-400" />
                        <h4 className="font-semibold text-purple-400 font-mono">WITHHOLDING TAX</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">October:</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">REMITTED</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">November:</span>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">₱12,450</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-semibold text-cyan-400 font-mono">ANNUAL ITR</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">2023:</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">FILED</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">2024:</span>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">PREPARING</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button className="neon-btn-outline text-xs px-3 py-1">
                      <Download className="w-3 h-3 mr-1" />
                      EXPORT BIR FORMS
                    </button>
                    <button className="neon-btn-outline text-xs px-3 py-1">
                      <Upload className="w-3 h-3 mr-1" />
                      UPLOAD RECEIPTS
                    </button>
                    <button className="neon-btn-outline text-xs px-3 py-1">
                      <Calculator className="w-3 h-3 mr-1" />
                      TAX CALCULATOR
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Neural Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="quantum-card border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <Wallet className="w-5 h-5 mr-2 text-green-400" />
                      NEURAL WALLET MATRIX
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {wallets.map(wallet => (
                      <div key={wallet.id} className="flex items-center justify-between p-3 bg-slate-800/40 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="ai-orb-small">
                            {getWalletIcon(wallet.type)}
                          </div>
                          <div>
                            <p className="font-medium text-white font-mono">{wallet.name}</p>
                            <p className="text-sm text-green-400 font-mono">{wallet.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-white font-mono">₱{wallet.balance.toLocaleString()}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="quantum-card border-red-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
                      CRITICAL BILL ALERTS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[...overdueBills, ...pendingBills.slice(0, 3)].map(bill => {
                      const getBillStatusBadge = (status: string) => {
                        switch (status) {
                          case 'PAID': return 'bg-green-500/20 text-green-400 border-green-500/50'
                          case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                          case 'OVERDUE': return 'bg-red-500/20 text-red-400 border-red-500/50'
                          default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                        }
                      }
                      
                      return (
                        <div key={bill.id} className="flex items-center justify-between p-3 bg-slate-800/40 border border-red-500/20 rounded-lg">
                          <div>
                            <p className="font-medium text-white font-mono">{bill.vendorName}</p>
                            <p className="text-sm text-gray-400 font-mono">{bill.description}</p>
                            <p className="text-xs text-red-400 font-mono">DUE: {bill.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-white font-mono">₱{bill.amount.toLocaleString()}</p>
                            <Badge className={getBillStatusBadge(bill.status)}>
                              {bill.status}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Neural Wallets Tab */}
          {activeTab === 'wallets' && (
            <div className="grid gap-4">
              {wallets.map(wallet => {
                const getWalletColor = (type: string) => {
                  switch (type) {
                    case 'BANK': return 'border-blue-500/30'
                    case 'GCASH': return 'border-green-500/30'
                    case 'CASH_REGISTER': return 'border-purple-500/30'
                    case 'PETTY_CASH': return 'border-orange-500/30'
                    default: return 'border-gray-500/30'
                  }
                }
                
                return (
                  <Card key={wallet.id} className={`quantum-card ${getWalletColor(wallet.type)} hover:border-cyan-500/40 transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="ai-orb">
                            {getWalletIcon(wallet.type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white glitch-text" data-text={wallet.name}>
                              {wallet.name}
                            </h3>
                            <p className="text-cyan-400 font-mono">{wallet.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white font-mono">₱{wallet.balance.toLocaleString()}</p>
                          <div className="flex gap-2 mt-3">
                            <button
                              className="neon-btn-outline text-xs px-3 py-1"
                              onClick={() => alert(`NEURAL ANALYSIS: ${wallet.name}\n\nType: ${wallet.type}\nBalance: ₱${wallet.balance.toLocaleString()}\nCurrency: ${wallet.currency}\n\nTransaction history and analytics will be displayed.`)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              ANALYZE
                            </button>
                            <button
                              className="neon-btn-outline text-xs px-3 py-1"
                              onClick={() => alert(`WALLET CONFIGURATION: ${wallet.name}\n\nAvailable Operations:\n• Balance adjustment\n• Account linking\n• Security settings\n• Transaction limits\n\nEdit interface will be activated.`)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              CONFIG
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Neural Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <Card className="quantum-card border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Activity className="w-5 h-5 mr-2 text-cyan-400" />
                    NEURAL TRANSACTION STREAM
                  </CardTitle>
                  <CardDescription className="text-cyan-300 font-mono">
                    Real-time financial activity monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transactions.map(transaction => {
                    const wallet = wallets.find(w => w.id === transaction.walletId)
                    const isCredit = transaction.type === 'CREDIT'
                    
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className={`ai-orb-small ${
                            isCredit ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`} style={{
                            background: isCredit 
                              ? 'radial-gradient(circle, #10b981, #059669)' 
                              : 'radial-gradient(circle, #ef4444, #dc2626)'
                          }}>
                            {isCredit ? (
                              <ArrowDownLeft className="w-4 h-4 text-white" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white font-mono">{transaction.description}</p>
                            <p className="text-sm text-cyan-400 font-mono">{wallet?.name} • {transaction.date}</p>
                            {transaction.reference && (
                              <p className="text-xs text-gray-500 font-mono">REF: {transaction.reference}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold font-mono ${
                            isCredit ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isCredit ? '+' : '-'}₱{transaction.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-400 font-mono">
                            BALANCE: ₱{transaction.balanceAfter.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Neural Bills & BIR Tab */}
          {activeTab === 'bills' && (
            <div className="space-y-4">
              {bills.map(bill => {
                const getBillStatusBadge = (status: string) => {
                  switch (status) {
                    case 'PAID': return 'bg-green-500/20 text-green-400 border-green-500/50'
                    case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                    case 'OVERDUE': return 'bg-red-500/20 text-red-400 border-red-500/50'
                    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                  }
                }
                
                return (
                  <Card key={bill.id} className="quantum-card border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="ai-orb-small">
                              <Receipt className="w-4 h-4 text-orange-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white glitch-text font-mono" data-text={bill.billNumber}>
                              {bill.billNumber}
                            </h3>
                            <Badge className={getBillStatusBadge(bill.status)}>
                              {bill.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-800/40 p-3 rounded-lg border border-orange-500/20">
                              <p className="font-medium text-orange-400 font-mono text-sm">VENDOR</p>
                              <p className="text-white font-mono">{bill.vendorName}</p>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-lg border border-orange-500/20">
                              <p className="font-medium text-orange-400 font-mono text-sm">DESCRIPTION</p>
                              <p className="text-white font-mono">{bill.description}</p>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-lg border border-orange-500/20">
                              <p className="font-medium text-orange-400 font-mono text-sm">AMOUNT</p>
                              <p className="text-white font-mono font-bold">₱{bill.amount.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-800/40 p-3 rounded-lg border border-orange-500/20">
                              <p className="font-medium text-orange-400 font-mono text-sm">DUE DATE</p>
                              <p className={`font-mono font-bold ${
                                bill.status === 'OVERDUE' ? 'text-red-400' : 'text-white'
                              }`}>{bill.dueDate}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-6">
                          <button
                            className="neon-btn-outline text-xs px-3 py-1"
                            onClick={() => alert(`BILL ANALYSIS: ${bill.billNumber}\n\nVendor: ${bill.vendorName}\nAmount: ₱${bill.amount.toLocaleString()}\nStatus: ${bill.status}\nDue: ${bill.dueDate}\n\nDetailed bill information and payment history will be displayed.`)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            ANALYZE
                          </button>
                          {bill.status === 'PENDING' && (
                            <button
                              className="neon-btn-primary text-xs px-3 py-1"
                              onClick={() => alert(`PAYMENT PROCESSING: ${bill.billNumber}\n\nAmount: ₱${bill.amount.toLocaleString()}\n\nPayment methods:\n• Bank transfer\n• GCash payment\n• Check payment\n• Cash payment\n\nBIR compliance validation will be performed.`)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              PAY NOW
                            </button>
                          )}
                          <button
                            className="neon-btn-outline text-xs px-3 py-1"
                            onClick={() => alert(`BIR FORMS: ${bill.billNumber}\n\n• Official Receipt (OR)\n• Commercial Receipt (CR)\n• VAT computation\n• Withholding tax certificate\n• Export to BIR eFPS`)}
                          >
                            <Building className="w-3 h-3 mr-1" />
                            BIR FORMS
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* AR/AP Aging Tab */}
          {activeTab === 'ar-ap' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Accounts Receivable */}
                <Card className="quantum-card border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <ArrowDownLeft className="w-5 h-5 mr-2 text-green-400" />
                      ACCOUNTS RECEIVABLE AGING
                    </CardTitle>
                    <CardDescription className="text-green-300 font-mono">
                      Outstanding customer invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                      <div className="bg-slate-800/40 p-3 rounded border border-green-500/20 text-center">
                        <p className="text-green-400 mb-1">CURRENT</p>
                        <p className="text-white font-bold">₱125,400</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-yellow-500/20 text-center">
                        <p className="text-yellow-400 mb-1">1-30 DAYS</p>
                        <p className="text-white font-bold">₱65,200</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-orange-500/20 text-center">
                        <p className="text-orange-400 mb-1">31-60 DAYS</p>
                        <p className="text-white font-bold">₱32,100</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-red-500/20 text-center">
                        <p className="text-red-400 mb-1">61-90 DAYS</p>
                        <p className="text-white font-bold">₱18,500</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-red-600/20 text-center">
                        <p className="text-red-600 mb-1">90+ DAYS</p>
                        <p className="text-white font-bold">₱8,900</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { client: 'ABC Manufacturing Corp.', invoice: 'INV-2024-001', amount: 45200, days: 15, status: 'current' },
                        { client: 'XYZ Fashion Inc.', invoice: 'INV-2024-008', amount: 32500, days: 45, status: 'overdue' },
                        { client: 'Fashion Forward Ltd.', invoice: 'INV-2024-012', amount: 18900, days: 75, status: 'critical' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/40 border border-green-500/20 rounded-lg">
                          <div>
                            <p className="font-medium text-white font-mono text-sm">{item.client}</p>
                            <p className="text-xs text-green-400 font-mono">{item.invoice} • {item.days} days</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white font-mono">₱{item.amount.toLocaleString()}</p>
                            <Badge className={
                              item.status === 'current' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                              item.status === 'overdue' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                              'bg-red-500/20 text-red-400 border-red-500/50'
                            }>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Accounts Payable */}
                <Card className="quantum-card border-red-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <ArrowUpRight className="w-5 h-5 mr-2 text-red-400" />
                      ACCOUNTS PAYABLE AGING
                    </CardTitle>
                    <CardDescription className="text-red-300 font-mono">
                      Outstanding vendor bills
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                      <div className="bg-slate-800/40 p-3 rounded border border-green-500/20 text-center">
                        <p className="text-green-400 mb-1">CURRENT</p>
                        <p className="text-white font-bold">₱85,300</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-yellow-500/20 text-center">
                        <p className="text-yellow-400 mb-1">1-30 DAYS</p>
                        <p className="text-white font-bold">₱42,800</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-orange-500/20 text-center">
                        <p className="text-orange-400 mb-1">31-60 DAYS</p>
                        <p className="text-white font-bold">₱15,600</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-red-500/20 text-center">
                        <p className="text-red-400 mb-1">61-90 DAYS</p>
                        <p className="text-white font-bold">₱8,500</p>
                      </div>
                      <div className="bg-slate-800/40 p-3 rounded border border-red-600/20 text-center">
                        <p className="text-red-600 mb-1">90+ DAYS</p>
                        <p className="text-white font-bold">₱3,200</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { vendor: 'Textile Suppliers Inc.', bill: 'BILL-001', amount: 25000, days: 5, status: 'current' },
                        { vendor: 'Ink & Chemicals Co.', bill: 'BILL-007', amount: 15600, days: 35, status: 'overdue' },
                        { vendor: 'Utilities Provider', bill: 'BILL-015', amount: 8500, days: 65, status: 'critical' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/40 border border-red-500/20 rounded-lg">
                          <div>
                            <p className="font-medium text-white font-mono text-sm">{item.vendor}</p>
                            <p className="text-xs text-red-400 font-mono">{item.bill} • {item.days} days</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white font-mono">₱{item.amount.toLocaleString()}</p>
                            <Badge className={
                              item.status === 'current' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                              item.status === 'overdue' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                              'bg-red-500/20 text-red-400 border-red-500/50'
                            }>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Flow Forecast */}
              <Card className="quantum-card border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                    CASH FLOW FORECAST (30 DAYS)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-purple-500/20">
                      <h4 className="font-semibold text-purple-400 font-mono mb-3">EXPECTED INFLOWS</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Collections from AR:</span>
                          <span className="text-green-400 font-mono">₱190,600</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">New orders expected:</span>
                          <span className="text-green-400 font-mono">₱85,000</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-purple-500/20 pt-2">
                          <span className="text-purple-400">Total Inflows:</span>
                          <span className="text-green-400 font-mono">₱275,600</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-purple-500/20">
                      <h4 className="font-semibold text-purple-400 font-mono mb-3">EXPECTED OUTFLOWS</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">AP payments due:</span>
                          <span className="text-red-400 font-mono">₱128,100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payroll & benefits:</span>
                          <span className="text-red-400 font-mono">₱95,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Operating expenses:</span>
                          <span className="text-red-400 font-mono">₱45,000</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-purple-500/20 pt-2">
                          <span className="text-purple-400">Total Outflows:</span>
                          <span className="text-red-400 font-mono">₱268,100</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-purple-500/20">
                      <h4 className="font-semibold text-purple-400 font-mono mb-3">NET POSITION</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Opening balance:</span>
                          <span className="text-cyan-400 font-mono">₱153,900</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Net cash flow:</span>
                          <span className="text-green-400 font-mono">₱7,500</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-purple-500/20 pt-2">
                          <span className="text-purple-400">Projected balance:</span>
                          <span className="text-cyan-400 font-mono text-lg">₱161,400</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Financial Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Profit & Loss Statement',
                    description: 'Monthly P&L with cost analysis',
                    icon: TrendingUp,
                    color: 'green',
                    data: 'Current Month: ₱125,400 profit'
                  },
                  {
                    title: 'Balance Sheet',
                    description: 'Assets, liabilities, and equity',
                    icon: PieChart,
                    color: 'blue',
                    data: 'Total Assets: ₱2,456,780'
                  },
                  {
                    title: 'Cash Flow Statement',
                    description: 'Operating, investing, financing activities',
                    icon: Activity,
                    color: 'purple',
                    data: 'Operating CF: ₱98,200'
                  },
                  {
                    title: 'BIR VAT Report',
                    description: 'VAT returns and compliance',
                    icon: Building,
                    color: 'orange',
                    data: 'Q4 VAT: ₱45,600 due Nov 25'
                  },
                  {
                    title: 'Aging Reports',
                    description: 'AR/AP aging analysis',
                    icon: Calculator,
                    color: 'cyan',
                    data: 'AR Total: ₱250,100'
                  },
                  {
                    title: 'Cost Analysis',
                    description: 'Manufacturing cost breakdown',
                    icon: BarChart3,
                    color: 'pink',
                    data: 'Material: 45%, Labor: 30%, Overhead: 25%'
                  }
                ].map((report, index) => {
                  const colorClasses = {
                    green: { border: 'border-green-500/30', icon: 'text-green-400', text: 'text-green-400' },
                    blue: { border: 'border-blue-500/30', icon: 'text-blue-400', text: 'text-blue-400' },
                    purple: { border: 'border-purple-500/30', icon: 'text-purple-400', text: 'text-purple-400' },
                    orange: { border: 'border-orange-500/30', icon: 'text-orange-400', text: 'text-orange-400' },
                    cyan: { border: 'border-cyan-500/30', icon: 'text-cyan-400', text: 'text-cyan-400' },
                    pink: { border: 'border-pink-500/30', icon: 'text-pink-400', text: 'text-pink-400' }
                  }[report.color]
                  
                  return (
                    <Card key={index} className={`quantum-card ${colorClasses.border} hover:border-opacity-60 cursor-pointer transition-all duration-300`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="ai-orb">
                            <report.icon className={`w-6 h-6 ${colorClasses.icon}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">{report.title}</h3>
                            <p className="text-sm text-gray-400 mb-3">{report.description}</p>
                            <p className={`text-sm font-mono ${colorClasses.text}`}>{report.data}</p>
                            <div className="flex gap-2 mt-4">
                              <button className="neon-btn-outline text-xs px-3 py-1">
                                <Eye className="w-3 h-3 mr-1" />
                                VIEW
                              </button>
                              <button className="neon-btn-outline text-xs px-3 py-1">
                                <Download className="w-3 h-3 mr-1" />
                                EXPORT
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* BIR Compliance Summary */}
              <Card className="quantum-card border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Building className="w-5 h-5 mr-2 text-yellow-400" />
                    BIR COMPLIANCE STATUS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-yellow-500/20">
                      <h4 className="font-semibold text-yellow-400 font-mono mb-2">VAT REGISTRATION</h4>
                      <p className="text-green-400 text-sm mb-1">✓ Active</p>
                      <p className="text-gray-400 text-xs">TIN: 123-456-789-000</p>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-yellow-500/20">
                      <h4 className="font-semibold text-yellow-400 font-mono mb-2">BOOKS OF ACCOUNTS</h4>
                      <p className="text-green-400 text-sm mb-1">✓ Updated</p>
                      <p className="text-gray-400 text-xs">Last: Oct 2024</p>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-yellow-500/20">
                      <h4 className="font-semibold text-yellow-400 font-mono mb-2">QUARTERLY RETURNS</h4>
                      <p className="text-yellow-400 text-sm mb-1">⚠ Due Soon</p>
                      <p className="text-gray-400 text-xs">Q4 Due: Nov 25</p>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-lg border border-yellow-500/20">
                      <h4 className="font-semibold text-yellow-400 font-mono mb-2">ANNUAL ITR</h4>
                      <p className="text-blue-400 text-sm mb-1">➤ Preparing</p>
                      <p className="text-gray-400 text-xs">2024 Due: Apr 15</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </TikTokLayout>
  )
}