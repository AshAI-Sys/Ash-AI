// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { UserPermissionsModal } from '@/components/users/UserPermissionsModal'
import { UserCreationModal } from '@/components/users/UserCreationModal'
import { 
  User, 
  UserPlus, 
  Eye, 
  Edit, 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Activity, 
  Star, 
  Shield,
  Brain,
  Zap,
  Database,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Cpu
} from 'lucide-react'
import { Role } from '@prisma/client'

interface UserData {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  lastLogin: string
  tasksCompleted: number
  tasksAssigned: number
  performanceScore: number
}

const mockUsers: UserData[] = [
  {
    id: '1',
    name: 'System Admin',
    email: 'admin@example.com',
    role: Role.ADMIN,
    active: true,
    lastLogin: '2024-08-28',
    tasksCompleted: 45,
    tasksAssigned: 50,
    performanceScore: 95
  },
  {
    id: '2',
    name: 'Factory Manager',
    email: 'manager@example.com', 
    role: Role.MANAGER,
    active: true,
    lastLogin: '2024-08-28',
    tasksCompleted: 38,
    tasksAssigned: 42,
    performanceScore: 88
  },
  {
    id: '3',
    name: 'Graphic Artist',
    email: 'designer@example.com',
    role: Role.GRAPHIC_ARTIST,
    active: true,
    lastLogin: '2024-08-27',
    tasksCompleted: 22,
    tasksAssigned: 25,
    performanceScore: 92
  },
  {
    id: '4',
    name: 'Sewing Operator',
    email: 'sewing@example.com',
    role: Role.SEWING_OPERATOR,
    active: true,
    lastLogin: '2024-08-28',
    tasksCompleted: 18,
    tasksAssigned: 20,
    performanceScore: 85
  },
  {
    id: '5',
    name: 'QC Inspector',
    email: 'qc@example.com',
    role: Role.QC_INSPECTOR,
    active: true,
    lastLogin: '2024-08-26',
    tasksCompleted: 15,
    tasksAssigned: 18,
    performanceScore: 78
  }
]

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserData[]>(mockUsers)
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>(mockUsers)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')

  const canManageUsers = session?.user.role === Role.ADMIN || session?.user.role === Role.MANAGER

  // Filter users based on search term, role, and status
  useEffect(() => {
    let filtered = users
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.active : !user.active
      )
    }
    
    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter, statusFilter])

  const handleUserCreate = (userData: any) => {
    const newUser: UserData = {
      id: (users.length + 1).toString(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      active: userData.active,
      lastLogin: new Date().toISOString().split('T')[0],
      tasksCompleted: 0,
      tasksAssigned: 0,
      performanceScore: 100
    }
    setUsers(prev => [newUser, ...prev])
    setFilteredUsers(prev => [newUser, ...prev])
  }

  const handleBulkAction = () => {
    if (!bulkAction || selectedUsers.length === 0) return

    switch (bulkAction) {
      case 'activate':
        setUsers(prev => prev.map(user => 
          selectedUsers.includes(user.id) ? { ...user, active: true } : user
        ))
        break
      case 'deactivate':
        setUsers(prev => prev.map(user => 
          selectedUsers.includes(user.id) ? { ...user, active: false } : user
        ))
        break
      case 'delete':
        if (confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) {
          setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)))
        }
        break
    }
    
    setSelectedUsers([])
    setBulkAction('')
  }

  const handleUserSelection = (user_id: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, user_id])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== user_id))
    }
  }

  if (!canManageUsers) {
    return (
      <TikTokLayout>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Access Denied</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              You don't have permission to manage users. Contact your administrator for access.
            </p>
          </div>
        </div>
      </TikTokLayout>
    )
  }

  const getRoleColor = (role: Role) => {
    const roleColors: Record<Role, string> = {
      [Role.ADMIN]: 'bg-purple-50 text-purple-700 border-purple-200',
      [Role.MANAGER]: 'bg-blue-50 text-blue-700 border-blue-200',
      [Role.GRAPHIC_ARTIST]: 'bg-green-50 text-green-700 border-green-200',
      [Role.SILKSCREEN_OPERATOR]: 'bg-orange-50 text-orange-700 border-orange-200',
      [Role.SUBLIMATION_OPERATOR]: 'bg-orange-50 text-orange-700 border-orange-200',
      [Role.DTF_OPERATOR]: 'bg-orange-50 text-orange-700 border-orange-200',
      [Role.EMBROIDERY_OPERATOR]: 'bg-orange-50 text-orange-700 border-orange-200',
      [Role.SEWING_OPERATOR]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      [Role.QC_INSPECTOR]: 'bg-red-50 text-red-700 border-red-200',
      [Role.FINISHING_STAFF]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      [Role.DRIVER]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      [Role.PURCHASER]: 'bg-pink-50 text-pink-700 border-pink-200',
      [Role.WAREHOUSE_STAFF]: 'bg-gray-50 text-gray-700 border-gray-200',
      [Role.ACCOUNTANT]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      [Role.LIVE_SELLER]: 'bg-violet-50 text-violet-700 border-violet-200',
      [Role.CSR]: 'bg-teal-50 text-teal-700 border-teal-200',
      [Role.SALES_STAFF]: 'bg-lime-50 text-lime-700 border-lime-200'
    }
    return roleColors[role] || 'bg-gray-50 text-gray-700 border-gray-200'
  }
  
  const getRoleIcon = (role: Role) => {
    const roleIcons: Record<Role, any> = {
      [Role.ADMIN]: Brain,
      [Role.MANAGER]: Settings,
      [Role.GRAPHIC_ARTIST]: Star,
      [Role.SILKSCREEN_OPERATOR]: Activity,
      [Role.SUBLIMATION_OPERATOR]: Activity,
      [Role.DTF_OPERATOR]: Activity,
      [Role.EMBROIDERY_OPERATOR]: Activity,
      [Role.SEWING_OPERATOR]: Users,
      [Role.QC_INSPECTOR]: Eye,
      [Role.FINISHING_STAFF]: CheckCircle,
      [Role.DRIVER]: TrendingUp,
      [Role.PURCHASER]: Database,
      [Role.WAREHOUSE_STAFF]: User,
      [Role.ACCOUNTANT]: Cpu,
      [Role.LIVE_SELLER]: Star,
      [Role.CSR]: UserCheck,
      [Role.SALES_STAFF]: TrendingUp
    }
    return roleIcons[role] || User
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-yellow-600'
    if (score >= 70) return 'text-orange-600'
    return 'text-red-600'
  }

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    ...Object.values(Role).map(role => ({
      value: role,
      label: role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }))
  ]

  return (
    <TikTokLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600">Manage system users and permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserCreationModal onUserCreate={handleUserCreate}>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </UserCreationModal>
              <Badge className="bg-green-50 text-green-700 border-green-200">
                <Activity className="w-3 h-3 mr-1" />
                {users.filter(u => u.active).length} Active
              </Badge>
            </div>
          </div>
        </div>
        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <option value="all">All Roles</option>
                {Object.values(Role).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
        </div>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <Badge className="bg-teal-50 text-teal-700 border-teal-200">Total</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{users.filter(u => u.active).length}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200">Avg</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{Math.round(users.reduce((sum, u) => sum + u.performanceScore, 0) / users.length)}%</div>
            <div className="text-sm text-gray-600">Performance</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200">Total</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{users.reduce((sum, u) => sum + u.tasksCompleted, 0)}</div>
            <div className="text-sm text-gray-600">Tasks Completed</div>
          </div>
        </div>
        {/* Users List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
            </div>
            <p className="text-gray-600 text-sm">Manage user accounts and permissions</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        user.active ? 'bg-teal-50' : 'bg-gray-100'
                      }`}>
                        <User className={`w-6 h-6 ${user.active ? 'text-teal-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">Last login: {user.lastLogin}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge className={user.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <UserPermissionsModal user={user}>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </UserPermissionsModal>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TikTokLayout>
  )
}
