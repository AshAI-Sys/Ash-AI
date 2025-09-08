import { NextRequest, NextResponse } from 'next/server'
import { ashleyAI } from '@/services/ashley-ai'

// POST /api/ashley-ai/validate - Real-time order validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    if (!body.method || !body.totalQty || !body.targetDeliveryDate) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        advisories: []
      }, { status: 400 })
    }

    // Get Ashley AI validation
    const advisories = await ashleyAI.validateOrderIntake({
      method: body.method,
      productType: body.productType || 'T-Shirt',
      totalQty: body.totalQty,
      sizeCurve: body.sizeCurve || {},
      targetDeliveryDate: body.targetDeliveryDate,
      routingTemplate: body.routingTemplate || '',
      brandId: body.brandId || ''
    })

    return NextResponse.json({
      success: true,
      advisories
    })

  } catch (_error) {
    console.error('Error in Ashley AI validation:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      advisories: []
    }, { status: 500 })
  }
}