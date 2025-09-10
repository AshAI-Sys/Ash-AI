import { NextRequest, NextResponse } from 'next/server'

import { verifyToken } from '@/lib/auth'

// Mock settings storage (in real app, this would be database)
const systemSettings = [
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

// Mock brands storage
let brands = [
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

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'brands') {
      return NextResponse.json({
        success: true,
        brands
      })
    }

    return NextResponse.json({
      success: true,
      settings: systemSettings
    })

  } catch (_error) {
    console.error('Error fetching settings:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings - Save settings
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, settings: newSettings, brands: newBrands } = body

    if (type === 'brands' && newBrands) {
      brands = newBrands
      return NextResponse.json({
        success: true,
        message: 'Brands updated successfully',
        brands
      })
    }

    if (type === 'settings' && newSettings) {
      // Update system settings
      newSettings.forEach((newSetting: any) => {
        const existingIndex = systemSettings.findIndex(s => s.key === newSetting.key)
        if (existingIndex !== -1) {
          systemSettings[existingIndex] = { ...systemSettings[existingIndex], ...newSetting }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
        settings: systemSettings
      })
    }

    return NextResponse.json(
      { error: 'Invalid request type' },
      { status: 400 }
    )

  } catch (_error) {
    console.error('Error saving settings:', _error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}