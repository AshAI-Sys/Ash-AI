'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
  import {
  UserPlus,
  Brain,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Users,
  Settings,
  Star,
  Activity,
  Database,
  Cpu,
  UserCheck,
  TrendingUp,
  Zap,
  Fingerprint,
  Key,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building
} from 'lucide-react'
import { Role } from '@prisma/client'

interface UserCreationData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: Role
  department: string
  phone: string
  employeeId: string
  startDate: string
  permissions: string[]
  active: boolean
}

interface UserCreationModalProps {
  onUserCreate?: (userData: UserCreationData) => void
}

const ROLE_DESCRIPTIONS: Record<Role, { title: string; description: string; color: string; icon: any; permissions: string[] }> = {
  [Role.ADMIN]: {
    title: 'System Administrator',
    description: 'Full system access and control. Can manage all users, configure system settings, and access all modules.',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    icon: Brain,
    permissions: ['full_system_access', 'user_management', 'system_config', 'audit_logs', 'backup_restore']
  },
  [Role.MANAGER]: {
    title: 'Production Manager', 
    description: 'Oversee operations and manage team performance. Access to production, orders, and financial reports.',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    icon: Settings,
    permissions: ['order_management', 'production_control', 'team_management', 'financial_reports']
  },
  [Role.GRAPHIC_ARTIST]: {
    title: 'Graphic Artist',
    description: 'Create and manage visual designs. Access to design tools and artwork approval workflows.',
    color: 'bg-green-500/20 text-green-400 border-green-500/50',
    icon: Star,
    permissions: ['design_creation', 'artwork_approval', 'file_management', 'client_communication']
  },
  [Role.SILKSCREEN_OPERATOR]: {
    title: 'Silkscreen Operator',
    description: 'Screen printing specialist. Access to production tracking and quality control.',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    icon: Activity,
    permissions: ['production_tasks', 'quality_check', 'equipment_status', 'material_tracking']
  },
  [Role.SUBLIMATION_OPERATOR]: {
    title: 'Sublimation Operator',
    description: 'Sublimation printing expert. Specialized access to sublimation workflows.',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    icon: Activity,
    permissions: ['production_tasks', 'quality_check', 'equipment_status', 'material_tracking']
  },
  [Role.DTF_OPERATOR]: {
    title: 'DTF Operator',
    description: 'Direct-to-film printing specialist. Access to DTF production workflows.',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    icon: Activity,
    permissions: ['production_tasks', 'quality_check', 'equipment_status', 'material_tracking']
  },
  [Role.EMBROIDERY_OPERATOR]: {
    title: 'Embroidery Operator',
    description: 'Embroidery specialist. Access to embroidery workflows and machine management.',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    icon: Activity,
    permissions: ['production_tasks', 'quality_check', 'equipment_status', 'material_tracking']
  },
  [Role.SEWING_OPERATOR]: {
    title: 'Sewing Operator',
    description: 'Garment construction specialist. Access to sewing workflows and quality control.',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    icon: Users,
    permissions: ['production_tasks', 'quality_check', 'material_tracking']
  },
  [Role.QC_INSPECTOR]: {
    title: 'Quality Inspector',
    description: 'Quality assurance specialist. Access to QC workflows and inspection reports.',
    color: 'bg-red-500/20 text-red-400 border-red-500/50',
    icon: Eye,
    permissions: ['quality_inspection', 'report_generation', 'defect_tracking', 'approval_workflows']
  },
  [Role.FINISHING_STAFF]: {
    title: 'Finishing Staff',
    description: 'Final product preparation. Access to finishing workflows and packaging.',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
    icon: CheckCircle,
    permissions: ['finishing_tasks', 'packaging', 'quality_check', 'shipping_prep']
  },
  [Role.DRIVER]: {
    title: 'Delivery Driver',
    description: 'Logistics and delivery. Access to delivery schedules and tracking.',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
    icon: TrendingUp,
    permissions: ['delivery_tracking', 'route_management', 'customer_interaction']
  },
  [Role.PURCHASER]: {
    title: 'Procurement Officer',
    description: 'Supply chain management. Access to purchasing workflows and vendor management.',
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/50',
    icon: Database,
    permissions: ['purchase_orders', 'vendor_management', 'inventory_planning', 'cost_analysis']
  },
  [Role.WAREHOUSE_STAFF]: {
    title: 'Warehouse Staff',
    description: 'Inventory management. Access to warehouse operations and stock tracking.',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    icon: Users,
    permissions: ['inventory_management', 'stock_tracking', 'receiving', 'shipping']
  },
  [Role.ACCOUNTANT]: {
    title: 'Accountant',
    description: 'Financial operations. Access to accounting modules and financial reporting.',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    icon: Cpu,
    permissions: ['financial_management', 'bir_compliance', 'reporting', 'audit_support']
  },
  [Role.LIVE_SELLER]: {
    title: 'Live Seller',
    description: 'Online sales specialist. Access to live selling platforms and customer management.',
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/50',
    icon: Star,
    permissions: ['live_selling', 'customer_management', 'order_processing', 'inventory_check']
  },
  [Role.CSR]: {
    title: 'Customer Service Representative',
    description: 'Customer relations. Access to customer support tools and order management.',
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/50',
    icon: UserCheck,
    permissions: ['customer_support', 'order_assistance', 'complaint_resolution', 'communication']
  },
  [Role.SALES_STAFF]: {
    title: 'Sales Staff',
    description: 'Sales operations. Access to sales tools and customer relationship management.',
    color: 'bg-lime-500/20 text-lime-400 border-lime-500/50',
    icon: TrendingUp,
    permissions: ['sales_management', 'customer_relations', 'order_processing', 'lead_tracking']
  }
}

export function UserCreationModal({ onUserCreate }: UserCreationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userData, setUserData] = useState<UserCreationData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: Role.WAREHOUSE_STAFF,
    department: '',
    phone: '',
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    permissions: [],
    active: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!userData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!userData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!userData.password) {
      newErrors.password = 'Password is required'
    } else if (userData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (userData.password !== userData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!userData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      const newUser = {
        ...userData,
        permissions: ROLE_DESCRIPTIONS[userData.role].permissions
      }
      onUserCreate?.(newUser)
      setIsOpen(false)
      setUserData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: Role.WAREHOUSE_STAFF,
        department: '',
        phone: '',
        employeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        permissions: [],
        active: true
      })
      setErrors({})
    }
  }

  const selectedRole = ROLE_DESCRIPTIONS[userData.role]
  const RoleIcon = selectedRole.icon

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="neon-btn-primary">
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] neural-bg border border-cyan-500/30">
        <div className="quantum-field">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
          <DialogHeader className="border-b border-cyan-500/20 pb-4">
            <DialogTitle className="flex items-center text-white glitch-text" data-text="NEURAL USER CREATION">
              <div className="ai-orb mr-3">
                <UserPlus className="w-6 h-6 text-cyan-400" />
              </div>
              NEURAL USER CREATION
              <div className="ml-auto">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  <Fingerprint className="w-3 h-3 mr-1" />
                  BIOMETRIC READY
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription className="text-cyan-300 font-mono">
              Advanced Personnel Registration • Neural Pattern Mapping • Security Clearance Setup
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{maxHeight: 'calc(90vh - 200px)'}}>
            {/* Basic Information */}
            <Card className="quantum-card border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white font-mono flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-cyan-400" />
                  BASIC INFORMATION
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-cyan-300 font-mono">Full Name *</Label>
                    <Input
                      id="name"
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      className="cyber-input"
                      placeholder="Enter full name"
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1 font-mono">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="employeeId" className="text-cyan-300 font-mono">Employee ID *</Label>
                    <Input
                      id="employeeId"
                      value={userData.employeeId}
                      onChange={(e) => setUserData({ ...userData, employeeId: e.target.value })}
                      className="cyber-input"
                      placeholder="e.g., EMP-001"
                    />
                    {errors.employeeId && <p className="text-red-400 text-xs mt-1 font-mono">{errors.employeeId}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-cyan-300 font-mono">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <Input
                        id="email"
                        type="email"
                        value={userData.email}
                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                        className="cyber-input pl-10"
                        placeholder="user@company.com"
                      />
                    </div>
                    {errors.email && <p className="text-red-400 text-xs mt-1 font-mono">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-cyan-300 font-mono">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <Input
                        id="phone"
                        value={userData.phone}
                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                        className="cyber-input pl-10"
                        placeholder="+63 9XX XXX XXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="department" className="text-cyan-300 font-mono">Department</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <Input
                        id="department"
                        value={userData.department}
                        onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                        className="cyber-input pl-10"
                        placeholder="Production, Design, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="startDate" className="text-cyan-300 font-mono">Start Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <Input
                        id="startDate"
                        type="date"
                        value={userData.startDate}
                        onChange={(e) => setUserData({ ...userData, startDate: e.target.value })}
                        className="cyber-input pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Credentials */}
            <Card className="quantum-card border-red-500/30">
              <CardHeader>
                <CardTitle className="text-white font-mono flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-400" />
                  SECURITY CREDENTIALS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-cyan-300 font-mono">Password *</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={userData.password}
                        onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                        className="cyber-input pl-10 pr-10"
                        placeholder="Enter secure password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-xs mt-1 font-mono">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-cyan-300 font-mono">Confirm Password *</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={userData.confirmPassword}
                        onChange={(e) => setUserData({ ...userData, confirmPassword: e.target.value })}
                        className="cyber-input pl-10 pr-10"
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 font-mono">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-mono text-sm font-semibold">SECURITY REQUIREMENTS</p>
                      <ul className="text-yellow-300 text-xs mt-2 space-y-1 font-mono">
                        <li>• Password must be at least 8 characters long</li>
                        <li>• Include uppercase, lowercase, numbers and symbols</li>
                        <li>• Avoid using personal information</li>
                        <li>• Neural encryption will be applied automatically</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role Assignment */}
            <Card className="quantum-card border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white font-mono flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-purple-400" />
                  ROLE ASSIGNMENT
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role" className="text-cyan-300 font-mono">System Role</Label>
                  <select
                    id="role"
                    value={userData.role}
                    onChange={(e) => setUserData({ ...userData, role: e.target.value as Role })}
                    className="cyber-select w-full"
                  >
                    {Object.entries(ROLE_DESCRIPTIONS).map(([role, details]) => (
                      <option key={role} value={role}>
                        {details.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-slate-800/40 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="ai-orb-small">
                      <RoleIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{selectedRole.title}</h4>
                      <Badge className={selectedRole.color}>
                        {userData.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-cyan-300 text-sm mb-3">{selectedRole.description}</p>
                  
                  <div>
                    <h5 className="text-cyan-300 font-mono text-sm font-semibold mb-2">NEURAL PERMISSIONS:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedRole.permissions.map((permission) => (
                        <div key={permission} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-green-400 text-xs font-mono">
                            {permission.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-cyan-500/20 p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={userData.active}
                    onChange={(e) => setUserData({ ...userData, active: e.target.checked })}
                    className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <Label htmlFor="active" className="text-cyan-300 font-mono">
                    ACTIVATE USER IMMEDIATELY
                  </Label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="neon-btn-outline"
                >
                  CANCEL
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="neon-btn-primary"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  CREATE USER
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}