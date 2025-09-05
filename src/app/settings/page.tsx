'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Layout from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, Plus, Edit, Trash2, Building2, Palette, Bell } from 'lucide-react'
import { Role } from '@prisma/client'

interface Brand {
  id: string
  name: string
  code: string
  active: boolean
  description: string
}

interface SystemSetting {
  key: string
  label: string
  value: string
  type: 'text' | 'number' | 'boolean' | 'select'
  options?: { value: string; label: string }[]
}

const mockBrands: Brand[] = [
  {
    id: '1',
    name: 'Reefer',
    code: 'REF',
    active: true,
    description: 'Premium streetwear brand'
  },
  {
    id: '2',
    name: 'Sorbetes',
    code: 'SOR', 
    active: true,
    description: 'Casual lifestyle apparel'
  }
]

const systemSettings: SystemSetting[] = [
  {
    key: 'company_name',
    label: 'Company Name',
    value: 'Sorbetes Apparel Studio',
    type: 'text'
  },
  {
    key: 'default_currency',
    label: 'Default Currency',
    value: 'PHP',
    type: 'select',
    options: [
      { value: 'PHP', label: 'Philippine Peso (PHP)' },
      { value: 'USD', label: 'US Dollar (USD)' },
      { value: 'EUR', label: 'Euro (EUR)' }
    ]
  },
  {
    key: 'working_hours_start',
    label: 'Working Hours Start',
    value: '08:00',
    type: 'text'
  },
  {
    key: 'working_hours_end',
    label: 'Working Hours End', 
    value: '17:00',
    type: 'text'
  },
  {
    key: 'auto_assign_tasks',
    label: 'Auto Assign Tasks',
    value: 'true',
    type: 'boolean'
  },
  {
    key: 'email_notifications',
    label: 'Email Notifications',
    value: 'true',
    type: 'boolean'
  },
  {
    key: 'low_stock_threshold',
    label: 'Low Stock Alert Threshold',
    value: '20',
    type: 'number'
  }
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'general' | 'brands' | 'notifications' | 'users'>('general')
  const [brands, setBrands] = useState<Brand[]>(mockBrands)
  const [settings, setSettings] = useState<SystemSetting[]>(systemSettings)
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [newBrand, setNewBrand] = useState({ name: '', code: '', description: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canManageSettings = session?.user.role === Role.ADMIN

  // Load settings from API
  useEffect(() => {
    if (canManageSettings) {
      loadSettings()
    }
  }, [canManageSettings])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const [settingsRes, brandsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings?type=brands')
      ])

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        if (settingsData.success) {
          setSettings(settingsData.settings)
        }
      }

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        if (brandsData.success) {
          setBrands(brandsData.brands)
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    setIsLoading(false)
  }

  const saveAllSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'settings',
          settings: settings
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Settings saved successfully!')
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    }
    setIsSaving(false)
  }

  const saveBrands = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'brands',
          brands: brands
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Brands saved successfully!')
      } else {
        alert('Failed to save brands')
      }
    } catch (error) {
      console.error('Error saving brands:', error)
      alert('Error saving brands')
    }
  }

  if (!canManageSettings) {
    return (
      <Layout>
        <div className="p-6">
          <div className="hologram-card backdrop-blur-lg shadow-2xl border border-cyan-500/30 rounded-2xl">
            <div className="p-12 text-center">
              <Settings className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Access Denied</h3>
              <p className="text-cyan-300">
                You don't have permission to access system settings.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      )
    )
  }

  const handleAddBrand = async () => {
    if (!newBrand.name || !newBrand.code) {
      alert('Please fill in brand name and code')
      return
    }

    const brand: Brand = {
      id: String(brands.length + 1),
      name: newBrand.name,
      code: newBrand.code.toUpperCase(),
      active: true,
      description: newBrand.description
    }

    const updatedBrands = [...brands, brand]
    setBrands(updatedBrands)
    setNewBrand({ name: '', code: '', description: '' })
    setShowBrandForm(false)

    // Save to API
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'brands',
          brands: updatedBrands
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Brand added successfully!')
      } else {
        alert('Failed to add brand')
      }
    } catch (error) {
      console.error('Error adding brand:', error)
      alert('Error adding brand')
    }
  }

  const toggleBrandStatus = async (brandId: string) => {
    const updatedBrands = brands.map(brand =>
      brand.id === brandId ? { ...brand, active: !brand.active } : brand
    )
    setBrands(updatedBrands)

    // Save to API
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'brands',
          brands: updatedBrands
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Brand status updated successfully!')
      } else {
        alert('Failed to update brand status')
      }
    } catch (error) {
      console.error('Error updating brand status:', error)
      alert('Error updating brand status')
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white glitch-text" data-text="System Settings">System Settings</h1>
            <p className="text-cyan-300 font-medium">
              Configure neural system parameters and preferences
            </p>
          </div>
          <Button 
            className="neon-btn bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white border-0 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
            onClick={saveAllSettings}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'general', label: 'General', icon: Settings },
            { key: 'brands', label: 'Brands', icon: Building2 },
            { key: 'notifications', label: 'Notifications', icon: Bell },
            { key: 'users', label: 'User Preferences', icon: Settings }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(key as 'general' | 'brands' | 'notifications' | 'users')}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-cyan-300">Loading settings...</p>
            </div>
          </div>
        )}

        {/* General Settings */}
        {!isLoading && activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Basic system settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settings.map((setting) => (
                    <div key={setting.key}>
                      <label className="block text-sm font-medium mb-1">
                        {setting.label}
                      </label>
                      {setting.type === 'text' && (
                        <Input
                          value={setting.value}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        />
                      )}
                      {setting.type === 'number' && (
                        <Input
                          type="number"
                          value={setting.value}
                          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        />
                      )}
                      {setting.type === 'select' && setting.options && (
                        <Select
                          value={setting.value}
                          onValueChange={(value) => handleSettingChange(setting.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {setting.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {setting.type === 'boolean' && (
                        <Select
                          value={setting.value}
                          onValueChange={(value) => handleSettingChange(setting.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Enabled</SelectItem>
                            <SelectItem value="false">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Settings</CardTitle>
                <CardDescription>
                  Configure production workflow and task management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Default Production Lead Time (days)
                    </label>
                    <Input type="number" defaultValue="7" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quality Control Pass Rate Target (%)
                    </label>
                    <Input type="number" defaultValue="95" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Task Auto-Assignment Algorithm
                    </label>
                    <Select defaultValue="capacity_based">
                      <SelectTrigger>
                        <SelectValue placeholder="Select algorithm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="capacity_based">Based on Capacity</SelectItem>
                        <SelectItem value="performance_based">Based on Performance</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="manual">Manual Assignment Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Brands Management */}
        {!isLoading && activeTab === 'brands' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Brand Management</CardTitle>
                    <CardDescription>
                      Manage your apparel brands and product lines
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowBrandForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Brand
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showBrandForm && (
                  <Card className="mb-6 border-dashed">
                    <CardHeader>
                      <CardTitle className="text-lg">Add New Brand</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Brand Name *
                          </label>
                          <Input
                            value={newBrand.name}
                            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                            placeholder="Enter brand name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Brand Code *
                          </label>
                          <Input
                            value={newBrand.code}
                            onChange={(e) => setNewBrand({ ...newBrand, code: e.target.value.toUpperCase() })}
                            placeholder="e.g., REF, SOR"
                            maxLength={5}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">
                            Description
                          </label>
                          <Textarea
                            value={newBrand.description}
                            onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                            placeholder="Brand description"
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowBrandForm(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddBrand}>
                          Add Brand
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {brands.map((brand) => (
                    <div key={brand.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Palette className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{brand.name}</h3>
                          <p className="text-sm text-gray-600">Code: {brand.code}</p>
                          <p className="text-sm text-gray-600">{brand.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={brand.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {brand.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleBrandStatus(brand.id)}
                        >
                          {brand.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Settings */}
        {!isLoading && activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure when and how users receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Email Notifications</h4>
                    <div className="space-y-3">
                      {[
                        'New order created',
                        'Task assigned',
                        'Task completed',
                        'Quality control failed',
                        'Low stock alert',
                        'Payment received',
                        'Bill due reminder'
                      ].map((notification) => (
                        <div key={notification} className="flex items-center justify-between">
                          <span className="text-sm">{notification}</span>
                          <Select defaultValue="enabled">
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enabled">Enabled</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                              <SelectItem value="admin_only">Admin Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">System Alerts</h4>
                    <div className="space-y-3">
                      {[
                        'System maintenance scheduled',
                        'Database backup completed',
                        'Integration errors',
                        'Performance issues detected'
                      ].map((alert) => (
                        <div key={alert} className="flex items-center justify-between">
                          <span className="text-sm">{alert}</span>
                          <Select defaultValue="enabled">
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enabled">Enabled</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Preferences */}
        {!isLoading && activeTab === 'users' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Default User Settings</CardTitle>
                <CardDescription>
                  Set default preferences for new users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Default Language
                    </label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="tl">Filipino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Default Timezone
                    </label>
                    <Select defaultValue="Asia/Manila">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Manila">Philippine Time (PHT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Session Timeout (minutes)
                    </label>
                    <Input type="number" defaultValue="60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Password Expiry (days)
                    </label>
                    <Input type="number" defaultValue="90" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security and access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Require two-factor authentication</span>
                    <Select defaultValue="optional">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Login attempt limit</span>
                    <Input type="number" defaultValue="5" className="w-20" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account lockout duration (minutes)</span>
                    <Input type="number" defaultValue="15" className="w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}