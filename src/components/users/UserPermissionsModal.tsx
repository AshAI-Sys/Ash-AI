'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Shield, 
  Lock, 
  Unlock, 
  Eye, 
  Edit, 
  Trash2, 
  UserCheck,
  Settings,
  Database,
  Cpu,
  Activity,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react'
import { Role } from '@prisma/client'

interface Permission {
  id: string
  name: string
  description: string
  category: 'read' | 'write' | 'delete' | 'admin'
  enabled: boolean
  critical?: boolean
}

interface UserPermissionsModalProps {
  user: {
    id: string
    name: string
    email: string
    role: Role
    active: boolean
  }
  onPermissionsUpdate?: (user_id: string, permissions: Permission[]) => void
}

const PERMISSION_TEMPLATES = {
  [Role.ADMIN]: [
    { id: 'user_manage', name: 'User Management', description: 'Create, edit, and delete user accounts', category: 'admin' as const, enabled: true, critical: true },
    { id: 'role_assign', name: 'Role Assignment', description: 'Assign and modify user roles', category: 'admin' as const, enabled: true, critical: true },
    { id: 'system_config', name: 'System Configuration', description: 'Modify system settings and configurations', category: 'admin' as const, enabled: true, critical: true },
    { id: 'audit_logs', name: 'Audit Logs', description: 'View and manage system audit logs', category: 'read' as const, enabled: true },
    { id: 'backup_restore', name: 'Backup & Restore', description: 'Perform system backups and restores', category: 'admin' as const, enabled: true, critical: true },
  ],
  [Role.MANAGER]: [
    { id: 'order_manage', name: 'Order Management', description: 'Create, edit, and manage customer orders', category: 'write' as const, enabled: true },
    { id: 'production_control', name: 'Production Control', description: 'Control production schedules and workflows', category: 'write' as const, enabled: true },
    { id: 'inventory_manage', name: 'Inventory Management', description: 'Manage inventory levels and stock', category: 'write' as const, enabled: true },
    { id: 'team_performance', name: 'Team Performance', description: 'View and manage team performance metrics', category: 'read' as const, enabled: true },
    { id: 'financial_reports', name: 'Financial Reports', description: 'Access financial reports and analytics', category: 'read' as const, enabled: true },
  ]
}

const getDefaultPermissions = (role: Role): Permission[] => {
  return PERMISSION_TEMPLATES[role] || [
    { id: 'basic_read', name: 'Basic Read', description: 'Read access to assigned tasks', category: 'read', enabled: true },
    { id: 'task_update', name: 'Task Updates', description: 'Update status of assigned tasks', category: 'write', enabled: true },
  ]
}

export function UserPermissionsModal({ user, onPermissionsUpdate }: UserPermissionsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>(getDefaultPermissions(user.role))
  const [hasChanges, setHasChanges] = useState(false)

  const togglePermission = (permissionId: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === permissionId ? { ...p, enabled: !p.enabled } : p
    ))
    setHasChanges(true)
  }

  const saveChanges = () => {
    onPermissionsUpdate?.(user.id, permissions)
    setHasChanges(false)
    setIsOpen(false)
  }

  const resetPermissions = () => {
    setPermissions(getDefaultPermissions(user.role))
    setHasChanges(true)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'read': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'write': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'delete': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'read': return Eye
      case 'write': return Edit
      case 'delete': return Trash2
      case 'admin': return Shield
      default: return Settings
    }
  }

  const enabledCount = permissions.filter(p => p.enabled).length
  const criticalCount = permissions.filter(p => p.critical && p.enabled).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="neon-btn-outline text-xs px-3 py-1">
          <Shield className="w-3 h-3 mr-1" />
          PERMISSIONS
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl neural-bg border border-cyan-500/30">
        <div className="quantum-field">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="quantum-particle" />
          ))}
        </div>
        
        <div className="relative z-10">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white glitch-text" data-text="NEURAL PERMISSIONS MATRIX">
              <div className="ai-orb mr-3">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              NEURAL PERMISSIONS MATRIX
            </DialogTitle>
            <DialogDescription className="text-cyan-300 font-mono">
              Configure access permissions for {user.name} ({user.role})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* User Info Panel */}
            <Card className="quantum-card border-cyan-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="ai-orb">
                      <UserCheck className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{user.name}</h3>
                      <p className="text-cyan-400 font-mono text-sm">{user.email}</p>
                      <Badge className="mt-1 bg-purple-500/20 text-purple-400 border-purple-500/50">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{enabledCount}</div>
                        <div className="text-xs text-green-400 font-mono">ACTIVE</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                        <div className="text-xs text-red-400 font-mono">CRITICAL</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">{permissions.length}</div>
                        <div className="text-xs text-cyan-400 font-mono">TOTAL</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Grid */}
            <Card className="quantum-card border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white font-mono">PERMISSION MODULES</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissions.map((permission) => {
                    const CategoryIcon = getCategoryIcon(permission.category)
                    
                    return (
                      <div
                        key={permission.id}
                        className={`
                          p-4 rounded-lg border transition-all duration-300 cursor-pointer
                          ${permission.enabled 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-slate-800/40 border-slate-600/30'
                          }
                          ${permission.critical ? 'ring-2 ring-red-400/30' : ''}
                        `}
                        onClick={() => togglePermission(permission.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="ai-orb-small">
                              <CategoryIcon className={`w-4 h-4 ${
                                permission.enabled ? 'text-green-400' : 'text-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-semibold ${
                                  permission.enabled ? 'text-white' : 'text-gray-400'
                                }`}>
                                  {permission.name}
                                </h4>
                                {permission.critical && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                                    CRITICAL
                                  </Badge>
                                )}
                              </div>
                              <p className={`text-sm ${
                                permission.enabled ? 'text-cyan-300' : 'text-gray-500'
                              }`}>
                                {permission.description}
                              </p>
                              <Badge className={`mt-2 text-xs ${getCategoryColor(permission.category)}`}>
                                {permission.category.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="ml-3">
                            {permission.enabled ? (
                              <div className="neural-pulse">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              </div>
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={resetPermissions}
                  className="neon-btn-outline"
                >
                  <Database className="w-4 h-4 mr-2" />
                  RESET TO DEFAULT
                </button>
                
                <button
                  onClick={() => {
                    const allEnabled = permissions.every(p => p.enabled)
                    setPermissions(prev => prev.map(p => ({ ...p, enabled: !allEnabled })))
                    setHasChanges(true)
                  }}
                  className="neon-btn-outline"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  TOGGLE ALL
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="neon-btn-outline"
                >
                  CANCEL
                </button>
                <button
                  onClick={saveChanges}
                  disabled={!hasChanges}
                  className={`neon-btn-primary ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  SAVE PERMISSIONS
                </button>
              </div>
            </div>

            {/* Warning for Critical Permissions */}
            {criticalCount > 0 && (
              <Card className="quantum-card border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="ai-orb-small" style={{background: 'radial-gradient(circle, #ef4444, #dc2626)'}}>
                      <Shield className="w-4 h-4 text-red-900" />
                    </div>
                    <div>
                      <h4 className="text-red-400 font-bold font-mono">CRITICAL PERMISSIONS ACTIVE</h4>
                      <p className="text-red-300 text-sm">
                        This user has {criticalCount} critical permission(s) enabled. These provide system-level access.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}