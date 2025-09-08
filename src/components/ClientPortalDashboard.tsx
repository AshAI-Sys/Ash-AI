/**
 * Client Portal Dashboard - Stage 12 Implementation
 * Complete client-facing interface with tracking, approvals, payments, reorders
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  Clock,
  CreditCard,
  MessageCircle,
  RotateCcw,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Truck,
  Star,
  Calendar,
  DollarSign,
  FileText,
  Camera,
  Send,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import OrderTracking from './OrderTracking'

interface ClientOrder {
  id: string
  po_number: string
  status: string
  progress_percentage: number
  product_type: string
  method: string
  quantity: number
  created_at: string
  target_delivery_date: string
  estimated_total: number
  paid_amount: number
  stages: any[]
}

interface Invoice {
  id: string
  invoice_number: string
  order_id: string
  amount: number
  paid_amount: number
  due_date: string
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  payment_terms: string
}

interface Message {
  id: string
  order_id: string
  sender: 'CLIENT' | 'CSR' | 'SYSTEM'
  message: string
  timestamp: string
  attachments?: string[]
  status: 'SENT' | 'READ' | 'REPLIED'
}

interface DesignApproval {
  id: string
  order_id: string
  design_name: string
  mockup_url: string
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED'
  submitted_date: string
  comments?: string
}

export default function ClientPortalDashboard() {
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  
  const [orders, setOrders] = useState<ClientOrder[]>([
    {
      id: '1',
      po_number: 'ASH-2025-001234',
      status: 'IN_PROGRESS',
      progress_percentage: 65,
      product_type: 'Hoodie',
      method: 'SILKSCREEN',
      quantity: 450,
      created_at: '2025-01-08T10:00:00Z',
      target_delivery_date: '2025-01-25',
      estimated_total: 224750,
      paid_amount: 112375,
      stages: []
    },
    {
      id: '2',
      po_number: 'ASH-2025-001156',
      status: 'DESIGN_APPROVAL',
      progress_percentage: 25,
      product_type: 'T-Shirt',
      method: 'DTF',
      quantity: 200,
      created_at: '2025-01-06T14:30:00Z',
      target_delivery_date: '2025-01-20',
      estimated_total: 89800,
      paid_amount: 44900,
      stages: []
    }
  ])

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      invoice_number: 'INV-2025-0123',
      order_id: '1',
      amount: 224750,
      paid_amount: 112375,
      due_date: '2025-01-15',
      status: 'PARTIAL',
      payment_terms: '50% deposit, 50% on completion'
    },
    {
      id: '2',
      invoice_number: 'INV-2025-0156',
      order_id: '2',
      amount: 89800,
      paid_amount: 44900,
      due_date: '2025-01-12',
      status: 'PARTIAL',
      payment_terms: '50% deposit, 50% on completion'
    }
  ])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      order_id: '1',
      sender: 'CSR',
      message: 'Good day! Your hoodie order is now in the cutting stage. We expect to start printing by tomorrow.',
      timestamp: '2025-01-08T15:30:00Z',
      status: 'READ'
    },
    {
      id: '2',
      order_id: '2',
      sender: 'SYSTEM',
      message: 'Your design is ready for approval. Please review and approve to proceed with production.',
      timestamp: '2025-01-07T09:15:00Z',
      status: 'SENT'
    }
  ])

  const [designApprovals, setDesignApprovals] = useState<DesignApproval[]>([
    {
      id: '1',
      order_id: '2',
      design_name: 'Corporate Logo Design - Version 2',
      mockup_url: '/mockups/design-v2.jpg',
      status: 'PENDING',
      submitted_date: '2025-01-07T09:00:00Z'
    }
  ])

  const [newMessage, setNewMessage] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700 border-blue-300',
      'COMPLETED': 'bg-green-100 text-green-700 border-green-300',
      'DESIGN_APPROVAL': 'bg-purple-100 text-purple-700 border-purple-300',
      'DELIVERED': 'bg-green-100 text-green-700 border-green-300',
      'PAID': 'bg-green-100 text-green-700 border-green-300',
      'PARTIAL': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'OVERDUE': 'bg-red-100 text-red-700 border-red-300',
      'APPROVED': 'bg-green-100 text-green-700 border-green-300',
      'CHANGES_REQUESTED': 'bg-orange-100 text-orange-700 border-orange-300'
    }
    return colors[status as keyof typeof colors] || colors.PENDING
  }

  const handlePayment = (invoiceId: string) => {
    // In real implementation, this would redirect to payment gateway
    console.log(`Initiating payment for invoice ${invoiceId}`)
  }

  const handleReorder = (orderId: string) => {
    // In real implementation, this would create a new order based on the existing one
    console.log(`Creating reorder based on ${orderId}`)
  }

  const handleDesignApproval = (approvalId: string, action: 'approve' | 'request_changes', comments?: string) => {
    setDesignApprovals(prev => 
      prev.map(approval => 
        approval.id === approvalId 
          ? { 
              ...approval, 
              status: action === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED',
              comments 
            }
          : approval
      )
    )
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        order_id: selectedOrder || '1',
        sender: 'CLIENT',
        message: newMessage,
        timestamp: new Date().toISOString(),
        status: 'SENT'
      }
      setMessages(prev => [message, ...prev])
      setNewMessage('')
    }
  }

  return (
    <div className="space-y-6 p-6 neural-bg min-h-screen">
      {/* Header */}
      <div className="executive-card fade-in">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-500" />
            Client Portal Dashboard
          </CardTitle>
          <CardDescription className="text-base">
            Track your orders, approve designs, manage payments, and communicate with our team
          </CardDescription>
        </CardHeader>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Active Orders</p>
                <p className="text-2xl font-bold text-blue-400">{orders.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Pending Approvals</p>
                <p className="text-2xl font-bold text-purple-400">
                  {designApprovals.filter(d => d.status === 'PENDING').length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Outstanding Balance</p>
                <p className="text-2xl font-bold text-amber-400">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0))}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="executive-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Unread Messages</p>
                <p className="text-2xl font-bold text-green-400">
                  {messages.filter(m => m.status === 'SENT' && m.sender !== 'CLIENT').length}
                </p>
              </div>
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="approvals">Design Approvals</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="reorders">Reorders</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {selectedOrder ? (
            <div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedOrder(null)}
                className="mb-4"
              >
                ← Back to Orders
              </Button>
              <OrderTracking order={{
                id: selectedOrder,
                po_number: orders.find(o => o.id === selectedOrder)?.po_number || '',
                status: orders.find(o => o.id === selectedOrder)?.status || '',
                progress_percentage: orders.find(o => o.id === selectedOrder)?.progress_percentage || 0,
                created_at: orders.find(o => o.id === selectedOrder)?.created_at || '',
                target_delivery_date: orders.find(o => o.id === selectedOrder)?.target_delivery_date || '',
                stages: []
              }} />
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => (
                <Card key={order.id} className="executive-card hover-scale">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{order.po_number}</h3>
                        <p className="text-slate-400 mb-2">
                          {order.product_type} • {order.method} • {order.quantity} units
                        </p>
                        <Badge className={`status-badge ${order.status.toLowerCase()}`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-400">
                          {formatCurrency(order.estimated_total)}
                        </p>
                        <p className="text-sm text-slate-400">
                          Due: {formatDate(order.target_delivery_date)}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-slate-400">{order.progress_percentage}% Complete</span>
                      </div>
                      <Progress value={order.progress_percentage} className="h-3" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setSelectedOrder(order.id)}
                        className="btn-professional btn-primary"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleReorder(order.id)}
                        className="btn-professional btn-outline"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reorder
                      </Button>
                      <Button 
                        variant="outline"
                        className="btn-professional btn-ghost"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          {designApprovals.map((approval) => (
            <Card key={approval.id} className="executive-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{approval.design_name}</h3>
                    <p className="text-slate-400 mb-2">
                      Order: {orders.find(o => o.id === approval.order_id)?.po_number}
                    </p>
                    <Badge className={`status-badge ${approval.status.toLowerCase()}`}>
                      {approval.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">
                      Submitted: {formatDate(approval.submitted_date)}
                    </p>
                  </div>
                </div>

                {/* Mockup Preview */}
                <div className="mb-6">
                  <div className="bg-slate-100 rounded-lg p-8 text-center">
                    <Camera className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500">Design Preview</p>
                    <p className="text-xs text-slate-400">Mockup image would be displayed here</p>
                  </div>
                </div>

                {/* Approval Actions */}
                {approval.status === 'PENDING' && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleDesignApproval(approval.id, 'approve')}
                      className="btn-professional btn-primary"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Approve Design
                    </Button>
                    <Button 
                      onClick={() => handleDesignApproval(approval.id, 'request_changes', 'Please review colors')}
                      variant="outline"
                      className="btn-professional btn-outline"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Request Changes
                    </Button>
                  </div>
                )}

                {approval.comments && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 mb-1">Comments:</p>
                    <p className="text-sm text-amber-700">{approval.comments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="executive-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{invoice.invoice_number}</h3>
                    <p className="text-slate-400 mb-2">
                      Order: {orders.find(o => o.id === invoice.order_id)?.po_number}
                    </p>
                    <Badge className={`status-badge ${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <p className="text-sm text-slate-400">
                      Paid: {formatCurrency(invoice.paid_amount)}
                    </p>
                    <p className="text-sm text-slate-400">
                      Due: {formatDate(invoice.due_date)}
                    </p>
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Payment Progress</span>
                    <span className="text-sm text-slate-400">
                      {Math.round((invoice.paid_amount / invoice.amount) * 100)}% Paid
                    </span>
                  </div>
                  <Progress value={(invoice.paid_amount / invoice.amount) * 100} className="h-3" />
                </div>

                {/* Payment Actions */}
                {invoice.status !== 'PAID' && (
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handlePayment(invoice.id)}
                      className="btn-professional btn-primary"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay {formatCurrency(invoice.amount - invoice.paid_amount)}
                    </Button>
                    <Button 
                      variant="outline"
                      className="btn-professional btn-outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Invoice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <Card className="executive-card">
            <CardHeader>
              <CardTitle>Communication Center</CardTitle>
              <CardDescription>Chat with our customer service team</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Message List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.sender === 'CLIENT' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'CLIENT' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'CLIENT' ? 'text-blue-100' : 'text-slate-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 cyber-input"
                />
                <Button onClick={handleSendMessage} className="btn-professional btn-primary">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorders" className="space-y-6">
          <Card className="executive-card">
            <CardHeader>
              <CardTitle>Quick Reorders</CardTitle>
              <CardDescription>Reorder from your previous orders with one click</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {orders.filter(order => order.status === 'DELIVERED' || order.status === 'COMPLETED').map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="font-medium">{order.po_number}</p>
                      <p className="text-sm text-slate-500">
                        {order.product_type} • {order.method} • {order.quantity} units
                      </p>
                      <p className="text-sm text-slate-500">
                        Completed: {formatDate(order.target_delivery_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.estimated_total)}</p>
                        <div className="flex items-center text-sm text-amber-500">
                          <Star className="w-4 h-4 mr-1" />
                          <span>Popular Choice</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleReorder(order.id)}
                        className="btn-professional btn-primary"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reorder
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}