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
  Plus, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  Clock,
  Users,
  Building,
  CheckCircle,
  AlertTriangle,
  Camera,
  Upload
} from 'lucide-react'

interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  hireDate: string
  salary: number
  address: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  skills: string[]
  notes?: string
  avatar?: string
}

interface EmployeeModalProps {
  employee?: Employee
  onEmployeeCreate?: (employee: Employee) => void
  onEmployeeUpdate?: (employee: Employee) => void
  mode: 'create' | 'edit' | 'view'
}

const departments = [
  'Production',
  'Design',
  'Quality Control',
  'Maintenance',
  'Administration',
  'Sales & Marketing',
  'Human Resources',
  'Finance'
]

const positions = {
  'Production': ['Production Manager', 'Machine Operator', 'Quality Inspector', 'Packer'],
  'Design': ['Design Manager', 'Graphic Designer', 'Pattern Maker', 'Creative Director'],
  'Quality Control': ['QC Manager', 'Quality Inspector', 'QC Analyst', 'Testing Specialist'],
  'Maintenance': ['Maintenance Manager', 'Technician', 'Electrician', 'Mechanic'],
  'Administration': ['Office Manager', 'Administrative Assistant', 'Receptionist', 'Data Entry'],
  'Sales & Marketing': ['Sales Manager', 'Account Executive', 'Marketing Specialist', 'Customer Service'],
  'Human Resources': ['HR Manager', 'HR Specialist', 'Recruiter', 'Payroll Administrator'],
  'Finance': ['Finance Manager', 'Accountant', 'Bookkeeper', 'Financial Analyst']
}

const commonSkills = [
  'Screen Printing', 'Heat Transfer', 'Embroidery', 'Cutting', 'Sewing',
  'Quality Control', 'Machine Maintenance', 'Inventory Management',
  'Adobe Illustrator', 'Adobe Photoshop', 'Pattern Making', 'Color Matching',
  'Customer Service', 'Data Analysis', 'Project Management', 'Leadership'
]

export function EmployeeModal({ employee, onEmployeeCreate, onEmployeeUpdate, mode }: EmployeeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<Employee>>(
    employee || {
      status: 'ACTIVE',
      hireDate: new Date().toISOString().split('T')[0],
      department: 'Production',
      salary: 25000,
      emergencyContact: {
        name: '',
        phone: '',
        relationship: 'Spouse'
      },
      skills: []
    }
  )
  const [selectedSkills, setSelectedSkills] = useState<string[]>(employee?.skills || [])

  const totalSteps = mode === 'view' ? 1 : 3
  const isReadOnly = mode === 'view'

  const generateEmployeeId = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EMP${year}${month}${random}`
  }

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position || !formData.department) {
      return
    }

    const employeeData: Employee = {
      id: employee?.id || `emp_${Date.now()}`,
      employeeId: employee?.employeeId || generateEmployeeId(),
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      email: formData.email!,
      phone: formData.phone || '',
      position: formData.position!,
      department: formData.department!,
      status: formData.status || 'ACTIVE',
      hireDate: formData.hireDate || new Date().toISOString().split('T')[0],
      salary: formData.salary || 25000,
      address: formData.address || '',
      emergencyContact: formData.emergencyContact || { name: '', phone: '', relationship: 'Spouse' },
      skills: selectedSkills,
      notes: formData.notes,
      avatar: formData.avatar
    }

    if (mode === 'edit') {
      onEmployeeUpdate?.(employeeData)
    } else {
      onEmployeeCreate?.(employeeData)
    }
    
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setCurrentStep(1)
    setFormData({
      status: 'ACTIVE',
      hireDate: new Date().toISOString().split('T')[0],
      department: 'Production',
      salary: 25000,
      emergencyContact: {
        name: '',
        phone: '',
        relationship: 'Spouse'
      },
      skills: []
    })
    setSelectedSkills([])
  }

  const toggleSkill = (skill: string) => {
    if (isReadOnly) return
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    ON_LEAVE: 'bg-yellow-100 text-yellow-800',
    TERMINATED: 'bg-red-100 text-red-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            {mode === 'edit' ? 'Edit' : 'View'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>
              {mode === 'create' ? 'Add New Employee' : 
               mode === 'edit' ? 'Edit Employee' : 'Employee Details'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' 
              ? 'View employee information and details'
              : `Step ${currentStep} of ${totalSteps}: ${
                  currentStep === 1 ? 'Basic Information' :
                  currentStep === 2 ? 'Employment Details' : 'Skills & Notes'
                }`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar - Only show for create/edit */}
        {!isReadOnly && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {(currentStep === 1 || isReadOnly) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                {employee && (
                  <Badge className={statusColors[employee.status]}>
                    {employee.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                {!isReadOnly && (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Photo
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG up to 2MB</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId || (employee ? employee.employeeId : generateEmployeeId())}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Employee['status'] }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Employment Details */}
          {(currentStep === 2 || isReadOnly) && (
            <div className="space-y-4">
              {!isReadOnly && <h3 className="text-lg font-semibold">Employment Details</h3>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value, position: '' }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="position">Position *</Label>
                  <select
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                  >
                    <option value="">Select Position</option>
                    {formData.department && positions[formData.department as keyof typeof positions]?.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Monthly Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary: parseFloat(e.target.value) || 0 }))}
                    readOnly={isReadOnly}
                    className={isReadOnly ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="emergencyName">Name</Label>
                      <Input
                        id="emergencyName"
                        value={formData.emergencyContact?.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          emergencyContact: {
                            ...prev.emergencyContact!,
                            name: e.target.value
                          }
                        }))}
                        readOnly={isReadOnly}
                        className={isReadOnly ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Phone</Label>
                      <Input
                        id="emergencyPhone"
                        value={formData.emergencyContact?.phone || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          emergencyContact: {
                            ...prev.emergencyContact!,
                            phone: e.target.value
                          }
                        }))}
                        readOnly={isReadOnly}
                        className={isReadOnly ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyRelationship">Relationship</Label>
                      <select
                        id="emergencyRelationship"
                        value={formData.emergencyContact?.relationship}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          emergencyContact: {
                            ...prev.emergencyContact!,
                            relationship: e.target.value
                          }
                        }))}
                        disabled={isReadOnly}
                        className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md disabled:bg-gray-50"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Skills & Notes */}
          {(currentStep === 3 || isReadOnly) && (
            <div className="space-y-4">
              {!isReadOnly && <h3 className="text-lg font-semibold">Skills & Notes</h3>}
              
              {/* Skills */}
              <div>
                <Label>Skills</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {commonSkills.map(skill => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          selectedSkills.includes(skill) 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'hover:bg-gray-100'
                        } ${isReadOnly ? 'cursor-default' : ''}`}
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  {selectedSkills.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedSkills.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  readOnly={isReadOnly}
                  className={`w-full mt-1 px-3 py-2 border border-input bg-background rounded-md min-h-[100px] ${
                    isReadOnly ? 'bg-gray-50' : ''
                  }`}
                  placeholder="Additional notes about the employee..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          {!isReadOnly ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : setIsOpen(false)}
              >
                {currentStep > 1 ? 'Previous' : 'Cancel'}
              </Button>
              
              <div className="flex space-x-2">
                {currentStep < totalSteps ? (
                  <Button 
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={
                      currentStep === 1 && (!formData.firstName || !formData.lastName || !formData.email) ||
                      currentStep === 2 && (!formData.department || !formData.position)
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.position}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {mode === 'edit' ? 'Update Employee' : 'Add Employee'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}