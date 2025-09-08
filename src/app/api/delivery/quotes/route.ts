// Delivery Quote API for Stage 8 Delivery System
// Based on CLIENT_UPDATED_PLAN.md specifications

import { NextRequest, NextResponse } from 'next/server'
import { get3PLQuotes, recommendDeliveryMethod, calculateDriverCost } from '@/lib/delivery-calculations'

// POST /api/delivery/quotes - Get delivery quotes for shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspace_id,
      weight_kg,
      dimensions,
      pickup_address,
      delivery_address,
      cod_amount,
      is_fragile = false,
      urgency = 'MEDIUM', // LOW, MEDIUM, HIGH
      distance_km
    } = body

    if (!workspace_id || !weight_kg || !dimensions || !pickup_address || !delivery_address) {
      return NextResponse.json(
        { error: 'workspace_id, weight_kg, dimensions, pickup_address, and delivery_address are required' },
        { status: 400 }
      )
    }

    // Validate dimensions
    if (!dimensions.length_cm || !dimensions.width_cm || !dimensions.height_cm) {
      return NextResponse.json(
        { error: 'dimensions must include length_cm, width_cm, and height_cm' },
        { status: 400 }
      )
    }

    // Get 3PL quotes
    const quotes = get3PLQuotes({
      weight_kg,
      dimensions,
      pickup_address,
      delivery_address,
      cod_amount,
      is_fragile
    })

    // Calculate driver cost estimate
    const estimated_distance = distance_km || 15 // Default if not provided
    const driver_estimate = calculateDriverCost(
      estimated_distance,
      estimated_distance / 25 // 25km/h average speed
    )

    // Get Ashley AI recommendation
    const recommendation = recommendDeliveryMethod({
      weight_kg,
      dimensions,
      pickup_address,
      delivery_address,
      cod_amount,
      urgency,
      distance_km: estimated_distance
    })

    // Sort quotes by cost (cheapest first)
    const sorted_quotes = quotes.sort((a, b) => a.estimated_cost - b.estimated_cost)

    return NextResponse.json({
      success: true,
      quotes: sorted_quotes,
      driver_option: {
        method: 'DRIVER',
        service_type: 'DIRECT_DELIVERY',
        estimated_cost: driver_estimate.total_cost,
        estimated_eta: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours default
        cost_breakdown: driver_estimate,
        features: ['Direct delivery', 'Personal handling', 'Flexible timing'],
        restrictions: weight_kg > 50 ? ['Weight may require larger vehicle'] : undefined
      },
      recommendation: {
        method: recommendation.recommended_method,
        provider: recommendation.recommended_provider,
        reasoning: recommendation.reasoning,
        cost_comparison: recommendation.cost_comparison
      },
      metadata: {
        shipment_details: {
          weight_kg,
          dimensions,
          estimated_distance_km: estimated_distance,
          cod_amount: cod_amount || 0,
          is_fragile,
          urgency
        },
        quote_generated_at: new Date().toISOString()
      }
    })

  } catch (_error) {
    console.error('Error generating delivery quotes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate delivery quotes' },
      { status: 500 }
    )
  }
}

// GET /api/delivery/quotes - Get saved quotes (for future implementation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace_id = searchParams.get('workspace_id')
    const order_id = searchParams.get('order_id')

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      )
    }

    // In a full implementation, this would retrieve saved quotes from database
    // For now, return empty array
    return NextResponse.json({
      success: true,
      quotes: [],
      message: 'Saved quotes feature not yet implemented. Use POST to generate new quotes.'
    })

  } catch (_error) {
    console.error('Error fetching saved quotes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved quotes' },
      { status: 500 }
    )
  }
}