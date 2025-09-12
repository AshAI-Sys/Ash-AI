// @ts-nocheck
'use client'

// 💳 ASH AI - Advanced Payment Checkout Component
// Multi-provider payment interface with Philippine focus

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Smartphone, Building2, Shield, CheckCircle } from 'lucide-react'
import { paymentGateway, PaymentMethod, PaymentRequest } from '@/lib/payments/payment-gateway'

interface PaymentCheckoutProps {
  order_id: string
  amount: number
  currency?: string
  description: string
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  onSuccess: (paymentId: string) => void
  onError: (error: string) => void
}

export function PaymentCheckout({
  order_id,
  amount,
  currency = 'PHP',
  description,
  customerInfo,
  onSuccess,
  onError
}: PaymentCheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [fees, setFees] = useState(0)
  const [installmentMonths, setInstallmentMonths] = useState('0')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    // Load available payment methods
    const methods = paymentGateway.getAvailablePaymentMethods(currency)
    setPaymentMethods(methods)
    if (methods.length > 0) {
      setSelectedMethod(methods[0].id)
    }
  }, [currency])

  useEffect(() => {
    // Calculate fees when method changes
    if (selectedMethod) {
      const calculatedFees = paymentGateway.calculatePaymentFees(amount, selectedMethod)
      setFees(calculatedFees)
    }
  }, [selectedMethod, amount])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency
    }).format(value)
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />
      case 'wallet':
        return <Smartphone className="h-5 w-5" />
      case 'bank':
        return <Building2 className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getMethodBadgeColor = (method: PaymentMethod) => {
    switch (method.provider) {
      case 'paymongo':
        return 'bg-blue-100 text-blue-800'
      case 'stripe':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePayment = async () => {
    if (!selectedMethod || !agreedToTerms) return

    setIsProcessing(true)

    try {
      const method = paymentMethods.find(m => m.id === selectedMethod)
      if (!method) throw new Error('Selected payment method not found')

      const paymentRequest: PaymentRequest = {
        order_id,
        amount,
        currency,
        paymentMethod: method,
        customerInfo,
        description,
        metadata: {
          installment_months: installmentMonths !== '0' ? installmentMonths : undefined,
          ui_version: 'v2.0',
          source: 'ash_ai_portal'
        }
      }

      const paymentResponse = await paymentGateway.createPayment(paymentRequest)

      if (paymentResponse.checkoutUrl) {
        // Redirect to payment provider
        window.location.href = paymentResponse.checkoutUrl
      } else {
        // Handle direct payment completion
        onSuccess(paymentResponse.id)
      }
    } catch (error) {
      console.error('Payment creation failed:', error)
      onError(error instanceof Error ? error.message : 'Payment processing failed')
      setIsProcessing(false)
    }
  }

  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Secure Payment Checkout
        </CardTitle>
        <CardDescription>
          Complete your payment for {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Processing Fee:</span>
            <span>{formatCurrency(fees)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatCurrency(amount + fees)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Choose Payment Method</h3>
          
          <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <RadioGroupItem value={method.id} id={method.id} />
                <div className="flex-1">
                  <Label htmlFor={method.id} className="flex items-center gap-3 cursor-pointer">
                    {getPaymentMethodIcon(method)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{method.name}</span>
                        <Badge className={getMethodBadgeColor(method)}>
                          {method.provider.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Fee: {method.fees.percentage}% + ₱{method.fees.fixed}
                        <span className="ml-2">
                          • Limit: {formatCurrency(method.minAmount)} - {formatCurrency(method.maxAmount)}
                        </span>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Installment Options (for supported cards) */}
        {selectedMethodData?.type === 'card' && (
          <div className="space-y-2">
            <Label htmlFor="installments">Installment Plan (Optional)</Label>
            <Select value={installmentMonths} onValueChange={setInstallmentMonths}>
              <SelectTrigger>
                <SelectValue placeholder="Select installment plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Pay in Full</SelectItem>
                <SelectItem value="3">3 Months (0% interest)</SelectItem>
                <SelectItem value="6">6 Months (3% interest)</SelectItem>
                <SelectItem value="12">12 Months (6% interest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="font-semibold">Billing Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={customerInfo.name} 
                disabled 
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={customerInfo.email} 
                disabled 
                className="bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Security Features */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Secure Payment:</strong> Your payment is protected by 256-bit SSL encryption 
            and PCI DSS compliance. We never store your payment details.
          </AlertDescription>
        </Alert>

        {/* Terms and Conditions */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="terms" className="text-sm">
            I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
              Privacy Policy
            </a>
          </Label>
        </div>

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={!selectedMethod || !agreedToTerms || isProcessing}
          className="w-full h-12 text-lg"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              Pay {formatCurrency(amount + fees)}
            </>
          )}
        </Button>

        {/* Payment Providers */}
        <div className="flex justify-center items-center gap-4 pt-4 border-t">
          <span className="text-sm text-gray-600">Powered by:</span>
          <div className="flex gap-3">
            <img src="/logos/paymongo.png" alt="PayMongo" className="h-6 opacity-60" />
            <img src="/logos/stripe.png" alt="Stripe" className="h-6 opacity-60" />
            <img src="/logos/gcash.png" alt="GCash" className="h-6 opacity-60" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PaymentCheckout