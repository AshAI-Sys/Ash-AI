// @ts-nocheck
// User Registration Page - Production-ready account creation
// Real-world user registration with validation and verification

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Mail,
  Lock,
  Building,
  Phone,
  Briefcase,
  Building2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Shield
} from 'lucide-react'

interface RegistrationForm {
  email: string
  password: string
  confirmPassword: string
  full_name: string
  role: string
  company_name: string
  phone: string
  department: string
  position: string
}

interface PasswordRequirement {
  text: string
  met: boolean
}

const AVAILABLE_ROLES = [
  { value: 'OPERATOR', label: 'Production Operator', description: 'General production floor operations' },
  { value: 'SALES_STAFF', label: 'Sales Staff', description: 'Sales and customer relations' },
  { value: 'CSR', label: 'Customer Service Representative', description: 'Customer support and service' },
  { value: 'WAREHOUSE_STAFF', label: 'Warehouse Staff', description: 'Inventory and warehouse management' },
  { value: 'QC_INSPECTOR', label: 'Quality Control Inspector', description: 'Quality assurance and inspection' },
  { value: 'SEWING_OPERATOR', label: 'Sewing Operator', description: 'Sewing and garment assembly' },
  { value: 'CUTTING_OPERATOR', label: 'Cutting Operator', description: 'Fabric cutting operations' },
  { value: 'PRINTING_OPERATOR', label: 'Printing Operator', description: 'Screen printing and design application' },
  { value: 'FINISHING_OPERATOR', label: 'Finishing Operator', description: 'Final finishing and packaging' }
]

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: '',
    company_name: '',
    phone: '',
    department: '',
    position: ''
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(true)
  const [showConfirmPassword, setShowConfirmPassword] = useState(true)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  // Password validation
  const getPasswordRequirements = (password: string): PasswordRequirement[] => [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { text: 'Contains number', met: /\d/.test(password) },
    { text: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
  ]

  const passwordRequirements = getPasswordRequirements(formData.password)
  const passwordValid = passwordRequirements.every(req => req.met)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

  const handleInputChange = (field: keyof RegistrationForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setMessage(null)
  }

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.full_name || !formData.role) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return false
    }

    if (!passwordValid) {
      setMessage({ type: 'error', text: 'Password does not meet security requirements' })
      return false
    }

    if (!passwordsMatch) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          company_name: formData.company_name || undefined,
          phone: formData.phone || undefined,
          department: formData.department || undefined,
          position: formData.position || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setRegistrationSuccess(true)
        setMessage({
          type: 'success',
          text: 'Account created successfully! Please check your email for verification instructions.'
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Registration failed' })
      }

    } catch (error) {
      setMessage({ type: 'error', text: 'Registration failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Registration Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-600">Your account has been created successfully.</p>
              <p className="text-sm text-gray-500">
                Please check your email <strong>{formData.email}</strong> for verification instructions.
              </p>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your account will be activated after email verification. You can then log in to access the system.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button onClick={() => router.push('/auth/signin')} className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => setRegistrationSuccess(false)}
                className="w-full"
              >
                Register Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Create Your Account</CardTitle>
          <p className="text-gray-600">Join ASH AI Production Management System</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    Full Name *
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  Role *
                </Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-xs text-gray-500">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Need elevated permissions? Contact your administrator after registration.
                </p>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Security</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center">
                    <Lock className="h-4 w-4 mr-1" />
                    Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Create a strong password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  {formData.password && (
                    <div className="space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center text-xs">
                          {req.met ? (
                            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-gray-400 mr-1" />
                          )}
                          <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {formData.confirmPassword && (
                    <div className="flex items-center text-xs">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-green-600">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                          <span className="text-red-600">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Additional Information
                <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    Company Name
                  </Label>
                  <Input
                    id="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="Your company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    Department
                  </Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="Production, Sales, QC, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="Your job title"
                  />
                </div>
              </div>
            </div>

            {/* Error/Success Message */}
            {message && (
              <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                {message.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordValid || !passwordsMatch}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}