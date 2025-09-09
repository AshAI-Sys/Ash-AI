'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
  import {
  CreditCard, 
  Smartphone, 
  Building, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Shield,
  Clock,
  Zap,
  Settings,
  Link as LinkIcon,
  Unlink
} from 'lucide-react'

interface PaymentProvider {
  id: string
  name: string
  type: 'CARD' | 'DIGITAL_WALLET' | 'BANK_TRANSFER' | 'CRYPTO'
  status: 'CONNECTED' | 'DISCONNECTED' | 'PENDING'
  icon: any
  fees: {
    domestic: number
    international: number
  }
  currency: string[]
  features: string[]
  apiKeys?: {
    publicKey?: string
    secretKey?: string
    webhookUrl?: string
  }
}

interface Transaction {
  id: string
  amount: number
  currency: string
  provider: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  customerEmail: string
  orderNumber: string
  timestamp: string
  fees: number
}

export function PaymentIntegration() {
  const [isConfiguring, setIsConfiguring] = useState<string | null>(null)
  const [providers, setProviders] = useState<PaymentProvider[]>([
    {
      id: 'stripe',
      name: 'Stripe',
      type: 'CARD',
      status: 'CONNECTED',
      icon: CreditCard,
      fees: { domestic: 3.4, international: 3.9 },
      currency: ['PHP', 'USD', 'EUR'],
      features: ['Credit Cards', 'Digital Wallets', 'Subscriptions', 'Dispute Management'],
      apiKeys: {
        publicKey: 'pk_test_***************',
        secretKey: 'sk_test_***************',
        webhookUrl: 'https://api.sorbetes.com/webhooks/stripe'
      }
    },
    {
      id: 'paypal',
      name: 'PayPal',
      type: 'DIGITAL_WALLET',
      status: 'CONNECTED',
      icon: Smartphone,
      fees: { domestic: 3.9, international: 4.4 },
      currency: ['PHP', 'USD', 'EUR', 'GBP'],
      features: ['PayPal Wallet', 'Credit Cards', 'Buy Now Pay Later', 'Seller Protection'],
      apiKeys: {
        publicKey: 'AX4Dt***************',
        secretKey: 'ELs9W***************'
      }
    },
    {
      id: 'gcash',
      name: 'GCash',
      type: 'DIGITAL_WALLET',
      status: 'PENDING',
      icon: Smartphone,
      fees: { domestic: 2.5, international: 0 },
      currency: ['PHP'],
      features: ['GCash Wallet', 'QR Payments', 'Mobile Banking', 'Instant Transfer']
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      type: 'DIGITAL_WALLET',
      status: 'DISCONNECTED',
      icon: Smartphone,
      fees: { domestic: 2.8, international: 3.5 },
      currency: ['PHP', 'USD'],
      features: ['Maya Wallet', 'Credit Cards', 'Online Banking', 'Virtual Cards']
    },
    {
      id: 'instapay',
      name: 'InstaPay',
      type: 'BANK_TRANSFER',
      status: 'DISCONNECTED',
      icon: Building,
      fees: { domestic: 1.5, international: 0 },
      currency: ['PHP'],
      features: ['Real-time Transfer', 'Bank Integration', 'Low Fees', '24/7 Processing']
    }
  ])

  const [recentTransactions] = useState<Transaction[]>([
    {
      id: 'txn_001',
      amount: 2850,
      currency: 'PHP',
      provider: 'Stripe',
      status: 'COMPLETED',
      customerEmail: 'customer@email.com',
      orderNumber: 'ORD-2024-001',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      fees: 97.09
    },
    {
      id: 'txn_002',
      amount: 1750,
      currency: 'PHP',
      provider: 'PayPal',
      status: 'PENDING',
      customerEmail: 'client@business.com',
      orderNumber: 'ORD-2024-002',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      fees: 68.25
    },
    {
      id: 'txn_003',
      amount: 4200,
      currency: 'PHP',
      provider: 'GCash',
      status: 'FAILED',
      customerEmail: 'user@example.com',
      orderNumber: 'ORD-2024-003',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      fees: 0
    }
  ])

  const handleConnect = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, status: 'CONNECTED' as const } : p
    ))
    setIsConfiguring(null)
  }

  const handleDisconnect = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, status: 'DISCONNECTED' as const } : p
    ))
  }

  const getStatusColor = (status: PaymentProvider['status']) => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'DISCONNECTED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTransactionStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'REFUNDED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalVolume = recentTransactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalFees = recentTransactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.fees, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Integration</h2>
          <p className="text-gray-600">Manage payment providers and transaction processing</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Settings className="mr-2 h-4 w-4" />
          Advanced Settings
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connected Providers</p>
                <p className="text-2xl font-bold text-green-600">
                  {providers.filter(p => p.status === 'CONNECTED').length}
                </p>
              </div>
              <LinkIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transaction Volume</p>
                <p className="text-2xl font-bold text-blue-600">₱{totalVolume.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing Fees</p>
                <p className="text-2xl font-bold text-orange-600">₱{totalFees.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((recentTransactions.filter(t => t.status === 'COMPLETED').length / recentTransactions.length) * 100)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(provider => {
          const IconComponent = provider.icon
          return (
            <Card key={provider.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <p className="text-sm text-gray-500">{provider.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(provider.status)}>
                    {provider.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Fees */}
                  <div>
                    <p className="text-sm font-medium mb-2">Processing Fees</p>
                    <div className="flex justify-between text-sm">
                      <span>Domestic: {provider.fees.domestic}%</span>
                      <span>International: {provider.fees.international}%</span>
                    </div>
                  </div>

                  {/* Supported Currencies */}
                  <div>
                    <p className="text-sm font-medium mb-2">Currencies</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.currency.map(curr => (
                        <Badge key={curr} variant="outline" className="text-xs">
                          {curr}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <p className="text-sm font-medium mb-2">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.features.slice(0, 2).map(feature => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {provider.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{provider.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* API Configuration */}
                  {provider.status === 'CONNECTED' && provider.apiKeys && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-2 flex items-center">
                        <Shield className="mr-1 h-4 w-4" />
                        API Configuration
                      </p>
                      {provider.apiKeys.publicKey && (
                        <p className="text-xs text-gray-600 mb-1">
                          Public Key: {provider.apiKeys.publicKey}
                        </p>
                      )}
                      {provider.apiKeys.webhookUrl && (
                        <p className="text-xs text-gray-600">
                          Webhook: {provider.apiKeys.webhookUrl}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {provider.status === 'DISCONNECTED' ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="flex-1">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Connect
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Connect {provider.name}</DialogTitle>
                            <DialogDescription>
                              Enter your API credentials to connect {provider.name} payment processing.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="publicKey">Public/Publishable Key</Label>
                              <Input
                                id="publicKey"
                                placeholder="pk_live_..."
                                type="password"
                              />
                            </div>
                            <div>
                              <Label htmlFor="secretKey">Secret Key</Label>
                              <Input
                                id="secretKey"
                                placeholder="sk_live_..."
                                type="password"
                              />
                            </div>
                            <div>
                              <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                              <Input
                                id="webhookUrl"
                                placeholder="https://api.sorbetes.com/webhooks/..."
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline">Cancel</Button>
                              <Button onClick={() => handleConnect(provider.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Connect
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDisconnect(provider.id)}
                        className="flex-1"
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Transactions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTransactions.map(transaction => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{transaction.orderNumber}</p>
                    <p className="text-sm text-gray-500">{transaction.customerEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <div>
                      <p className="font-medium">₱{transaction.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{transaction.provider}</p>
                    </div>
                    <Badge className={getTransactionStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}