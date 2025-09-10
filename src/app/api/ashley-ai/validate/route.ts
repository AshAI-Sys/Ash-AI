import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import { ashleyAI } from '@/services/ashley-ai'

// POST /api/ashley-ai/validate - Real-time order validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    if (!body.method || !body.total_qty || !body.target_delivery_date) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        advisories: []
      }, { status: 400 })
    }

    // Get Ashley AI validation
    const advisories = await ashleyAI.validateOrderIntake({
      method: body.method,
      productType: body.productType || 'T-Shirt',
      total_qty: body.total_qty,
      sizeCurve: body.sizeCurve || {},
      target_delivery_date: body.target_delivery_date,
      routeTemplate: body.routeTemplate || '',
      brand_id: body.brand_id || ''
    })

    return NextResponse.json({
      success: true,
      advisories
    })

  } catch (_error) {
    console.error('Error in Ashley AI validation:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      advisories: []
    }, { status: 500 })
  }
}