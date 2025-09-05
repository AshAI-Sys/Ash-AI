'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/Layout'
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

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    }
  }

  if (!canManageUsers) {
    return (
      <Layout>
        <div className="neural-bg min-h-screen relative">
          <div className="quantum-field">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="quantum-particle" />
            ))}
          </div>
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-center h-64">
              <Card className="quantum-card border-red-500/30 max-w-lg">
                <CardContent className="p-12 text-center">
                  <div className="ai-orb mx-auto mb-6" style={{background: 'radial-gradient(circle, #ef4444, #dc2626)'}}>
                    <Shield className="w-8 h-8 text-red-900" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 glitch-text" data-text="ACCESS DENIED">
                    ACCESS DENIED
                  </h3>
                  <p className="text-red-300 font-mono">
                    INSUFFICIENT NEURAL CLEARANCE FOR USER MANAGEMENT
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const getRoleColor = (role: Role) => {
    const roleColors: Record<Role, string> = {
      [Role.ADMIN]: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      [Role.MANAGER]: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      [Role.GRAPHIC_ARTIST]: 'bg-green-500/20 text-green-400 border-green-500/50',
      [Role.SILKSCREEN_OPERATOR]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      [Role.SUBLIMATION_OPERATOR]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      [Role.DTF_OPERATOR]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      [Role.EMBROIDERY_OPERATOR]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      [Role.SEWING_OPERATOR]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      [Role.QC_INSPECTOR]: 'bg-red-500/20 text-red-400 border-red-500/50',
      [Role.FINISHING_STAFF]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      [Role.DRIVER]: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
      [Role.PURCHASER]: 'bg-pink-500/20 text-pink-400 border-pink-500/50',
      [Role.WAREHOUSE_STAFF]: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      [Role.ACCOUNTANT]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      [Role.LIVE_SELLER]: 'bg-violet-500/20 text-violet-400 border-violet-500/50',
      [Role.CSR]: 'bg-teal-500/20 text-teal-400 border-teal-500/50',
      [Role.SALES_STAFF]: 'bg-lime-500/20 text-lime-400 border-lime-500/50'
    }
    return roleColors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'
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
    <Layout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>

        <div className="relative z-10 p-6 space-y-6">
          {/* Neural Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 p-4 bg-slate-900/60 border border-cyan-500/30 rounded-2xl backdrop-blur-sm">
              <div className="ai-orb animate-pulse">
                <Users className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white glitch-text" data-text="USER NEURAL MATRIX">
                  USER NEURAL MATRIX
                </h1>
                <p className="text-cyan-400 font-mono text-sm">Advanced Personnel Management System</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <Activity className="w-3 h-3 mr-1" />
                {users.filter(u => u.active).length} ACTIVE
              </Badge>
            </div>
          </div>
          
          {/* Action Controls */}
          <div className="flex justify-center gap-4 flex-wrap">
            <UserCreationModal onUserCreate={handleUserCreate} />
            
            <button
              className="neon-btn-outline flex items-center gap-2"
              onClick={() => {
                alert('SECURITY AUDIT INITIATED\n\n• Permission matrix scan\n• Role compliance check\n• Access log analysis\n• Neural threat detection\n• Biometric validation\n• Multi-factor authentication status')
              }}
            >
              <Shield className="w-5 h-5" />
              SECURITY AUDIT
            </button>
            
            <button
              className="neon-btn-outline flex items-center gap-2"
              onClick={() => {
                alert('PERFORMANCE ANALYTICS\n\n• User productivity metrics\n• Task completion rates\n• Neural efficiency scores\n• Team collaboration analysis\n• Predictive performance trends')
              }}
            >
              <TrendingUp className="w-5 h-5" />
              ANALYTICS
            </button>
          </div>

          {/* Bulk Operations */}
          {selectedUsers.length > 0 && (
            <Card className="quantum-card border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                      {selectedUsers.length} USERS SELECTED
                    </Badge>
                    
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="cyber-select"
                    >
                      <option value="">BULK ACTIONS</option>
                      <option value="activate">ACTIVATE USERS</option>
                      <option value="deactivate">DEACTIVATE USERS</option>
                      <option value="reset_password">RESET PASSWORDS</option>
                      <option value="sync_permissions">SYNC PERMISSIONS</option>
                      <option value="delete">DELETE USERS</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="neon-btn-outline text-sm"
                    >
                      CLEAR SELECTION
                    </button>
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      className={`neon-btn-primary text-sm ${!bulkAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      EXECUTE
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Neural Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'TOTAL USERS', value: users.length, icon: Users, color: 'cyan', description: 'REGISTERED AGENTS' },
              { title: 'ACTIVE USERS', value: users.filter(u => u.active).length, icon: Activity, color: 'green', description: 'NEURAL LINKED' },
              { title: 'AVG PERFORMANCE', value: `${Math.round(users.reduce((sum, u) => sum + u.performanceScore, 0) / users.length)}%`, icon: TrendingUp, color: 'purple', description: 'EFFICIENCY INDEX' },
              { title: 'TASKS COMPLETED', value: users.reduce((sum, u) => sum + u.tasksCompleted, 0), icon: CheckCircle, color: 'orange', description: 'NEURAL PROCESSED' }
            ].map((stat, index) => {
              const colorClasses = {
                cyan: { border: 'border-cyan-500/30', icon: 'text-cyan-400', text: 'text-cyan-400' },
                green: { border: 'border-green-500/30', icon: 'text-green-400', text: 'text-green-400' },
                purple: { border: 'border-purple-500/30', icon: 'text-purple-400', text: 'text-purple-400' },
                orange: { border: 'border-orange-500/30', icon: 'text-orange-400', text: 'text-orange-400' }
              }[stat.color]
              
              return (
                <Card key={stat.title} className={`quantum-card ${colorClasses.border}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-mono ${colorClasses.text}`}>{stat.title}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className={`text-xs ${colorClasses.text} font-mono mt-1`}>{stat.description}</p>
                      </div>
                      <div className="ai-orb-small">
                        <stat.icon className={`w-4 h-4 ${colorClasses.icon}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Neural Search Interface */}
          <Card className="quantum-card border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center mb-4">
                <Database className="w-5 h-5 text-cyan-400 mr-2" />
                <h3 className="text-white font-semibold font-mono">NEURAL SEARCH MATRIX</h3>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <input
                  placeholder="SEARCH NEURAL DATABASE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="cyber-input w-64"
                />
                
                <select
                  className="cyber-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">ALL ROLES</option>
                  {Object.values(Role).map(role => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ')}
                    </option>
                  ))}
                </select>

                <select
                  className="cyber-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">ALL STATUS</option>
                  <option value="active">ACTIVE</option>
                  <option value="inactive">INACTIVE</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Neural User Matrix */}
          <div className="space-y-4">
            {users.map((user, index) => {
              const RoleIcon = getRoleIcon(user.role)
              
              return (
                <Card key={user.id} className={`quantum-card transition-all duration-300 ${
                  selectedUsers.includes(user.id) 
                    ? 'border-yellow-500/50 bg-yellow-500/5' 
                    : 'border-cyan-500/20 hover:border-cyan-500/40'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Selection Checkbox */}
                        <div className="pt-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                            className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`ai-orb ${user.active ? '' : 'opacity-50'}`} style={{
                              background: user.active ? 'radial-gradient(circle, var(--cyber-blue), var(--cyber-purple))' : 'radial-gradient(circle, #6b7280, #4b5563)'
                            }}>
                              <RoleIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-1 glitch-text" data-text={user.name}>
                                {user.name}
                              </h3>
                              <p className="text-cyan-400 font-mono text-sm">{user.email}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge className={`${getRoleColor(user.role)} font-mono text-xs`}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {user.role.replace('_', ' ')}
                              </Badge>
                              <Badge className={user.active 
                                ? 'bg-green-500/20 text-green-400 border-green-500/50 font-mono text-xs' 
                                : 'bg-red-500/20 text-red-400 border-red-500/50 font-mono text-xs'
                              }>
                                {user.active ? (
                                  <><Unlock className="w-3 h-3 mr-1" />ACTIVE</>
                                ) : (
                                  <><Lock className="w-3 h-3 mr-1" />INACTIVE</>
                                )}
                              </Badge>
                            </div>
                          </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="bg-slate-800/40 p-3 rounded-lg border border-cyan-500/20">
                            <div className="flex items-center mb-1">
                              <Clock className="w-3 h-3 text-cyan-400 mr-2" />
                              <p className="font-mono text-cyan-400 text-xs">LAST SYNC</p>
                            </div>
                            <p className="text-white font-mono text-sm">{user.lastLogin}</p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg border border-blue-500/20">
                            <div className="flex items-center mb-1">
                              <Activity className="w-3 h-3 text-blue-400 mr-2" />
                              <p className="font-mono text-blue-400 text-xs">ASSIGNED</p>
                            </div>
                            <p className="text-white font-mono text-sm">{user.tasksAssigned}</p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg border border-green-500/20">
                            <div className="flex items-center mb-1">
                              <CheckCircle className="w-3 h-3 text-green-400 mr-2" />
                              <p className="font-mono text-green-400 text-xs">COMPLETED</p>
                            </div>
                            <p className="text-white font-mono text-sm">{user.tasksCompleted}</p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg border border-purple-500/20">
                            <div className="flex items-center mb-1">
                              <TrendingUp className="w-3 h-3 text-purple-400 mr-2" />
                              <p className="font-mono text-purple-400 text-xs">RATE</p>
                            </div>
                            <p className="text-white font-mono text-sm">
                              {user.tasksAssigned > 0 
                                ? Math.round((user.tasksCompleted / user.tasksAssigned) * 100)
                                : 0
                              }%
                            </p>
                          </div>
                          <div className="bg-slate-800/40 p-3 rounded-lg border border-yellow-500/20">
                            <div className="flex items-center mb-1">
                              <Star className="w-3 h-3 text-yellow-400 mr-2" />
                              <p className="font-mono text-yellow-400 text-xs">NEURAL SCORE</p>
                            </div>
                            <p className={`font-bold font-mono text-sm ${
                              user.performanceScore >= 90 ? 'text-green-400' :
                              user.performanceScore >= 80 ? 'text-yellow-400' :
                              user.performanceScore >= 70 ? 'text-orange-400' :
                              'text-red-400'
                            }`}>
                              {user.performanceScore}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                      <div className="flex flex-col gap-2 ml-6">
                        <button
                          onClick={() => alert(`NEURAL ANALYSIS: ${user.name}\n\nROLE: ${user.role}\nSTATUS: ${user.active ? 'ACTIVE' : 'INACTIVE'}\nPERFORMANCE: ${user.performanceScore}%\nTASKS: ${user.tasksCompleted}/${user.tasksAssigned}\n\nDetailed user profile and permissions matrix will be displayed.`)}
                          className="neon-btn-outline text-xs px-3 py-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          ANALYZE
                        </button>
                        <button
                          onClick={() => alert(`NEURAL EDIT MODE: ${user.name}\n\nAvailable Operations:\n• Role modification\n• Permission matrix update\n• Security clearance change\n• Performance metrics adjust\n\nEdit interface will be activated.`)}
                          className="neon-btn-outline text-xs px-3 py-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          MODIFY
                        </button>
                        <UserPermissionsModal 
                          user={user} 
                          onPermissionsUpdate={(userId, permissions) => {
                            alert(`PERMISSIONS UPDATED FOR ${user.name}\n\nUser ID: ${userId}\nActive Permissions: ${permissions.filter(p => p.enabled).length}\n\nPermissions have been synchronized with the neural network.`)
                          }}
                        />
                        <button
                          onClick={() => {
                            const newStatus = !user.active
                            alert(`NEURAL STATUS UPDATE: ${user.name}\n\nStatus changed to: ${newStatus ? 'ACTIVE' : 'INACTIVE'}\n\nThis will ${newStatus ? 'enable' : 'disable'} user access and neural link.`)
                          }}
                          className={user.active ? 'neon-btn-outline text-xs px-3 py-1 border-red-500/50 text-red-400' : 'neon-btn-outline text-xs px-3 py-1 border-green-500/50 text-green-400'}
                        >
                          {user.active ? (
                            <><UserX className="w-3 h-3 mr-1" />DEACTIVATE</>
                          ) : (
                            <><UserCheck className="w-3 h-3 mr-1" />ACTIVATE</>
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}