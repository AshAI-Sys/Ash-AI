// 🏦 ASH AI - Advanced Payment Gateway Integration
// Philippine-focused payment systems with international support

interface PaymentMethod {
  id: string
  name: string
  type: 'card' | 'wallet' | 'bank' | 'crypto' | 'installment'
  provider: 'paymongo' | 'stripe' | 'gcash' | 'maya' | 'grabpay'
  enabled: boolean
  fees: {
    fixed: number // PHP
    percentage: number // %
  }
  currency: string[]
  minAmount: number
  maxAmount: number
}

interface PaymentRequest {
  order_id: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  description: string
  metadata?: Record<string, any>
}

interface PaymentResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  checkoutUrl?: string
  reference?: string
  fees: number
  netAmount: number
  created_at: Date
  completedAt?: Date
}

class PaymentGatewayService {
  private paymentMethods: PaymentMethod[] = [
    // PayMongo Methods (Philippine Focus)
    {
      id: 'paymongo_card',
      name: 'Credit/Debit Card',
      type: 'card',
      provider: 'paymongo',
      enabled: true,
      fees: { fixed: 0, percentage: 3.5 },
      currency: ['PHP'],
      minAmount: 100,
      maxAmount: 1000000
    },
    {
      id: 'paymongo_gcash',
      name: 'GCash',
      type: 'wallet',
      provider: 'paymongo',
      enabled: true,
      fees: { fixed: 0, percentage: 2.5 },
      currency: ['PHP'],
      minAmount: 1,
      maxAmount: 500000
    },
    {
      id: 'paymongo_grabpay',
      name: 'GrabPay',
      type: 'wallet',
      provider: 'paymongo',
      enabled: true,
      fees: { fixed: 0, percentage: 2.9 },
      currency: ['PHP'],
      minAmount: 100,
      maxAmount: 300000
    },
    {
      id: 'paymongo_maya',
      name: 'Maya (PayMaya)',
      type: 'wallet',
      provider: 'paymongo',
      enabled: true,
      fees: { fixed: 0, percentage: 2.5 },
      currency: ['PHP'],
      minAmount: 1,
      maxAmount: 500000
    },
    // Stripe (International)
    {
      id: 'stripe_card',
      name: 'International Cards',
      type: 'card',
      provider: 'stripe',
      enabled: true,
      fees: { fixed: 15, percentage: 3.9 },
      currency: ['USD', 'EUR', 'SGD', 'PHP'],
      minAmount: 50,
      maxAmount: 999999999
    }
  ]

  // PayMongo Integration
  async createPayMongoPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymongoSecret = process.env.ASH_PAYMONGO_SECRET_KEY
    if (!paymongoSecret) throw new Error('PayMongo secret key not configured')

    try {
      // Create PayMongo payment intent
      const paymentData = {
        data: {
          attributes: {
            amount: request.amount * 100, // Convert to centavos
            currency: request.currency,
            description: request.description,
            payment_method_allowed: this.getPayMongoMethods(request.paymentMethod.id),
            metadata: {
              order_id: request.order_id,
              customer_name: request.customerInfo.name,
              ...request.metadata
            }
          }
        }
      }

      const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(paymongoSecret).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        throw new Error(`PayMongo API error: ${response.statusText}`)
      }

      const result = await response.json()
      const fees = this.calculateFees(request.amount, request.paymentMethod)
      
      return {
        id: result.data.id,
        status: 'pending',
        checkoutUrl: result.data.attributes.next_action?.redirect?.url,
        reference: result.data.attributes.client_key,
        fees,
        netAmount: request.amount - fees,
        created_at: new Date(result.data.attributes.created_at)
      }
    } catch (_error) {
      console.error('PayMongo payment creation failed:', error)
      throw new Error('Failed to create PayMongo payment')
    }
  }

  // Stripe Integration
  async createStripePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const stripeSecret = process.env.ASH_STRIPE_SECRET_KEY
    if (!stripeSecret) throw new Error('Stripe secret key not configured')

    try {
      // Create Stripe payment session
      const sessionData = {
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: request.currency.toLowerCase(),
            product_data: {
              name: request.description,
              metadata: {
                order_id: request.order_id
              }
            },
            unit_amount: request.amount * 100 // Convert to cents
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.ASH_APP_URL}/portal/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.ASH_APP_URL}/portal/payment/cancel`,
        customer_email: request.customerInfo.email,
        metadata: {
          order_id: request.order_id,
          customer_name: request.customerInfo.name,
          ...request.metadata
        }
      }

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(sessionData as any).toString()
      })

      if (!response.ok) {
        throw new Error(`Stripe API error: ${response.statusText}`)
      }

      const result = await response.json()
      const fees = this.calculateFees(request.amount, request.paymentMethod)

      return {
        id: result.id,
        status: 'pending',
        checkoutUrl: result.url,
        reference: result.payment_intent,
        fees,
        netAmount: request.amount - fees,
        created_at: new Date()
      }
    } catch (_error) {
      console.error('Stripe payment creation failed:', error)
      throw new Error('Failed to create Stripe payment')
    }
  }

  // GCash Direct Integration (via PayMongo)
  async createGCashPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const gcashMethod = this.paymentMethods.find(m => m.id === 'paymongo_gcash')
    if (!gcashMethod) throw new Error('GCash payment method not configured')

    return this.createPayMongoPayment({
      ...request,
      paymentMethod: gcashMethod
    })
  }

  // Universal Payment Creation
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Validate payment method
    if (!this.isPaymentMethodEnabled(request.paymentMethod.id)) {
      throw new Error('Payment method is not enabled')
    }

    // Validate amount limits
    if (request.amount < request.paymentMethod.minAmount || 
        request.amount > request.paymentMethod.maxAmount) {
      throw new Error('Amount is outside allowed limits')
    }

    // Route to appropriate provider
    switch (request.paymentMethod.provider) {
      case 'paymongo':
        return this.createPayMongoPayment(request)
      case 'stripe':
        return this.createStripePayment(request)
      default:
        throw new Error('Unsupported payment provider')
    }
  }

  // Payment Status Check
  async getPaymentStatus(paymentId: string, provider: string): Promise<PaymentResponse> {
    switch (provider) {
      case 'paymongo':
        return this.getPayMongoStatus(paymentId)
      case 'stripe':
        return this.getStripeStatus(paymentId)
      default:
        throw new Error('Unsupported payment provider')
    }
  }

  // Helper Methods
  private getPayMongoMethods(methodId: string): string[] {
    const methodMap: Record<string, string[]> = {
      'paymongo_card': ['card'],
      'paymongo_gcash': ['gcash'],
      'paymongo_grabpay': ['grab_pay'],
      'paymongo_maya': ['paymaya']
    }
    return methodMap[methodId] || ['card']
  }

  private calculateFees(amount: number, method: PaymentMethod): number {
    return method.fees.fixed + (amount * method.fees.percentage / 100)
  }

  private isPaymentMethodEnabled(methodId: string): boolean {
    const method = this.paymentMethods.find(m => m.id === methodId)
    return method?.enabled || false
  }

  private async getPayMongoStatus(paymentId: string): Promise<PaymentResponse> {
    const paymongoSecret = process.env.ASH_PAYMONGO_SECRET_KEY
    
    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(paymongoSecret!).toString('base64')}`
      }
    })

    const result = await response.json()
    const status = this.mapPayMongoStatus(result.data.attributes.status)
    
    return {
      id: result.data.id,
      status,
      fees: result.data.attributes.fees || 0,
      netAmount: (result.data.attributes.amount - result.data.attributes.fees) / 100,
      created_at: new Date(result.data.attributes.created_at),
      completedAt: status === 'completed' ? new Date() : undefined
    }
  }

  private async getStripeStatus(sessionId: string): Promise<PaymentResponse> {
    const stripeSecret = process.env.ASH_STRIPE_SECRET_KEY
    
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecret}`
      }
    })

    const result = await response.json()
    const status = this.mapStripeStatus(result.payment_status)
    
    return {
      id: result.id,
      status,
      fees: (result.amount_total - result.amount_total) || 0, // Stripe fees calculated separately
      netAmount: result.amount_total / 100,
      created_at: new Date(result.created * 1000),
      completedAt: status === 'completed' ? new Date() : undefined
    }
  }

  private mapPayMongoStatus(status: string): PaymentResponse['status'] {
    const statusMap: Record<string, PaymentResponse['status']> = {
      'awaiting_payment_method': 'pending',
      'processing': 'processing',
      'succeeded': 'completed',
      'requires_payment_method': 'failed'
    }
    return statusMap[status] || 'pending'
  }

  private mapStripeStatus(status: string): PaymentResponse['status'] {
    const statusMap: Record<string, PaymentResponse['status']> = {
      'unpaid': 'pending',
      'paid': 'completed',
      'no_payment_required': 'completed'
    }
    return statusMap[status] || 'pending'
  }

  // Public Methods for Client
  getAvailablePaymentMethods(currency: string = 'PHP'): PaymentMethod[] {
    return this.paymentMethods.filter(method => 
      method.enabled && method.currency.includes(currency)
    )
  }

  calculatePaymentFees(amount: number, methodId: string): number {
    const method = this.paymentMethods.find(m => m.id === methodId)
    if (!method) return 0
    return this.calculateFees(amount, method)
  }
}

export const paymentGateway = new PaymentGatewayService()
export type { PaymentMethod, PaymentRequest, PaymentResponse }