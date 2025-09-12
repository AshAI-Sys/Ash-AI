// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, Plus, Edit, Trash2, Building2, Palette, Bell, Shield, Globe, Clock, Users } from 'lucide-react'
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
      <TikTokLayout>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Settings className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Access Denied</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              You don't have permission to access system settings. Contact your administrator for access.
            </p>
          </div>
        </div>
      </TikTokLayout>
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

  const toggleBrandStatus = async (brand_id: string) => {
    const updatedBrands = brands.map(brand =>
      brand.id === brand_id ? { ...brand, active: !brand.active } : brand
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
    <TikTokLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600">Configure system parameters and preferences</p>
              </div>
            </div>
            <Button 
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
              onClick={saveAllSettings}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'general', label: 'General', icon: Settings },
              { key: 'brands', label: 'Brands', icon: Building2 },
              { key: 'notifications', label: 'Notifications', icon: Bell },
              { key: 'users', label: 'User Preferences', icon: Users }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as 'general' | 'brands' | 'notifications' | 'users')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === key
                    ? 'bg-teal-50 text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        )}

        {/* General Settings */}
        {!isLoading && activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
                </div>
                <p className="text-gray-600 text-sm">Basic system settings and preferences</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settings.map((setting) => (
                    <div key={setting.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Production Settings</h3>
                </div>
                <p className="text-gray-600 text-sm">Configure production workflow and task management</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Production Lead Time (days)
                    </label>
                    <Input type="number" defaultValue="7" className="border-gray-200 focus:border-teal-500 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality Control Pass Rate Target (%)
                    </label>
                    <Input type="number" defaultValue="95" className="border-gray-200 focus:border-teal-500 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
              </div>
            </div>
          </div>
        )}

        {/* Brands Management */}
        {!isLoading && activeTab === 'brands' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Brand Management</h3>
                      <p className="text-gray-600 text-sm">Manage your apparel brands and product lines</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowBrandForm(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Brand
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {showBrandForm && (
                  <div className="mb-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Brand</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Brand Name *
                          </label>
                          <Input
                            value={newBrand.name}
                            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                            placeholder="Enter brand name"
                            className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Brand Code *
                          </label>
                          <Input
                            value={newBrand.code}
                            onChange={(e) => setNewBrand({ ...newBrand, code: e.target.value.toUpperCase() })}
                            placeholder="e.g., REF, SOR"
                            maxLength={5}
                            className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <Textarea
                            value={newBrand.description}
                            onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                            placeholder="Brand description"
                            rows={3}
                            className="border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowBrandForm(false)}
                          className="px-4 py-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddBrand}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl"
                        >
                          Add Brand
                        </Button>
                      </div>
                  </div>
                )}

                <div className="space-y-3">
                  {brands.map((brand) => (
                    <div key={brand.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                            <Palette className="w-6 h-6 text-teal-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{brand.name}</h4>
                            <p className="text-sm text-gray-600">Code: {brand.code}</p>
                            <p className="text-sm text-gray-500">{brand.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={brand.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                            {brand.active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleBrandStatus(brand.id)}
                            className="border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            {brand.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {!isLoading && activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                </div>
                <p className="text-gray-600 text-sm">Configure when and how users receive notifications</p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Email Notifications</h4>
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
                        <div key={notification} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{notification}</span>
                          <Select defaultValue="enabled">
                            <SelectTrigger className="w-32 border-gray-200 focus:border-teal-500 focus:ring-teal-500">
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
                    <h4 className="font-semibold text-gray-900 mb-4">System Alerts</h4>
                    <div className="space-y-3">
                      {[
                        'System maintenance scheduled',
                        'Database backup completed',
                        'Integration errors',
                        'Performance issues detected'
                      ].map((alert) => (
                        <div key={alert} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{alert}</span>
                          <Select defaultValue="enabled">
                            <SelectTrigger className="w-32 border-gray-200 focus:border-teal-500 focus:ring-teal-500">
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
              </div>
            </div>
          </div>
        )}

        {/* User Preferences */}
        {!isLoading && activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Default User Settings</h3>
                </div>
                <p className="text-gray-600 text-sm">Set default preferences for new users</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Language
                    </label>
                    <Select defaultValue="en">
                      <SelectTrigger className="border-gray-200 focus:border-teal-500 focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="tl">Filipino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Timezone
                    </label>
                    <Select defaultValue="Asia/Manila">
                      <SelectTrigger className="border-gray-200 focus:border-teal-500 focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Manila">Philippine Time (PHT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <Input type="number" defaultValue="60" className="border-gray-200 focus:border-teal-500 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Expiry (days)
                    </label>
                    <Input type="number" defaultValue="90" className="border-gray-200 focus:border-teal-500 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                </div>
                <p className="text-gray-600 text-sm">Configure security and access controls</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Require two-factor authentication</span>
                    <Select defaultValue="optional">
                      <SelectTrigger className="w-32 border-gray-200 focus:border-teal-500 focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Login attempt limit</span>
                    <Input type="number" defaultValue="5" className="w-20 border-gray-200 focus:border-teal-500 focus:ring-teal-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Account lockout duration (minutes)</span>
                    <Input type="number" defaultValue="15" className="w-20 border-gray-200 focus:border-teal-500 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TikTokLayout>
  )
}