// Delivery Calculations & 3PL Integration
// Based on CLIENT_UPDATED_PLAN.md Stage 8 specifications

export interface DeliveryQuote {
  provider: string
  service_type: string
  estimated_cost: number
  estimated_eta: string // ISO date string
  dimensional_weight: number
  chargeable_weight: number
  features: string[]
  restrictions?: string[]
}

export interface RouteOptimization {
  optimized_stops: Array<{
    stop_id: string
    sequence: number
    address: string
    estimated_duration_minutes: number
    distance_km: number
  }>
  total_distance_km: number
  total_duration_minutes: number
  fuel_cost_estimate: number
}

export interface DeliveryMetrics {
  on_time_rate: number
  success_rate: number
  avg_delivery_time_hours: number
  cost_per_delivery: number
  customer_satisfaction: number
}

// Calculate dimensional weight (for air freight pricing)
export function calculateDimensionalWeight(
  length_cm: number,
  width_cm: number,
  height_cm: number,
  divisor: number = 5000 // Standard divisor for domestic shipments
): number {
  const volume_cm3 = length_cm * width_cm * height_cm
  return volume_cm3 / divisor // kg
}

// Calculate chargeable weight (max of actual vs dimensional)
export function calculateChargeableWeight(
  actual_weight_kg: number,
  dimensions: { length_cm: number, width_cm: number, height_cm: number }
): number {
  const dimensional_weight = calculateDimensionalWeight(
    dimensions.length_cm,
    dimensions.width_cm,
    dimensions.height_cm
  )
  
  return Math.max(actual_weight_kg, dimensional_weight)
}

// Driver cost estimation
export function calculateDriverCost(
  distance_km: number,
  duration_hours: number,
  fuel_rate_per_km: number = 8.5, // PHP per km
  driver_hourly_rate: number = 150, // PHP per hour
  additional_costs: number = 0 // tolls, parking
): {
  fuel_cost: number
  labor_cost: number
  additional_cost: number
  total_cost: number
} {
  const fuel_cost = distance_km * fuel_rate_per_km
  const labor_cost = duration_hours * driver_hourly_rate
  const total_cost = fuel_cost + labor_cost + additional_costs

  return {
    fuel_cost: Math.round(fuel_cost * 100) / 100,
    labor_cost: Math.round(labor_cost * 100) / 100,
    additional_cost: additional_costs,
    total_cost: Math.round(total_cost * 100) / 100
  }
}

// 3PL quote simulation (in real app, would call actual APIs)
export function get3PLQuotes(shipment: {
  weight_kg: number
  dimensions: { length_cm: number, width_cm: number, height_cm: number }
  pickup_address: string
  delivery_address: string
  cod_amount?: number
  is_fragile?: boolean
}): DeliveryQuote[] {
  const chargeable_weight = calculateChargeableWeight(shipment.weight_kg, shipment.dimensions)
  const base_rate_per_kg = 45 // Base PHP per kg
  
  const quotes: DeliveryQuote[] = [
    {
      provider: 'LALAMOVE',
      service_type: 'SAME_DAY',
      estimated_cost: Math.max(150, chargeable_weight * (base_rate_per_kg * 1.2)),
      estimated_eta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      dimensional_weight: calculateDimensionalWeight(shipment.dimensions.length_cm, shipment.dimensions.width_cm, shipment.dimensions.height_cm),
      chargeable_weight,
      features: ['Real-time tracking', 'Photo POD', 'Same-day delivery'],
      restrictions: shipment.weight_kg > 20 ? ['Weight limit exceeded'] : undefined
    },
    {
      provider: 'GRAB_EXPRESS',
      service_type: 'INSTANT',
      estimated_cost: Math.max(180, chargeable_weight * (base_rate_per_kg * 1.4)),
      estimated_eta: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      dimensional_weight: calculateDimensionalWeight(shipment.dimensions.length_cm, shipment.dimensions.width_cm, shipment.dimensions.height_cm),
      chargeable_weight,
      features: ['Fastest delivery', 'Live tracking', 'Priority handling'],
      restrictions: chargeable_weight > 15 ? ['Size/weight limit'] : undefined
    },
    {
      provider: 'JNT_EXPRESS',
      service_type: 'NEXT_DAY',
      estimated_cost: Math.max(80, chargeable_weight * (base_rate_per_kg * 0.8)),
      estimated_eta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      dimensional_weight: calculateDimensionalWeight(shipment.dimensions.length_cm, shipment.dimensions.width_cm, shipment.dimensions.height_cm),
      chargeable_weight,
      features: ['Nationwide coverage', 'Insurance included', 'COD available'],
      restrictions: undefined
    },
    {
      provider: 'NINJA_VAN',
      service_type: 'STANDARD',
      estimated_cost: Math.max(70, chargeable_weight * (base_rate_per_kg * 0.7)),
      estimated_eta: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days
      dimensional_weight: calculateDimensionalWeight(shipment.dimensions.length_cm, shipment.dimensions.width_cm, shipment.dimensions.height_cm),
      chargeable_weight,
      features: ['Cost-effective', 'Bulk discounts', 'API integration'],
      restrictions: undefined
    }
  ]

  // Add COD fees if applicable
  if (shipment.cod_amount && shipment.cod_amount > 0) {
    quotes.forEach(quote => {
      const cod_fee = Math.max(20, shipment.cod_amount! * 0.02) // 2% or min 20 PHP
      quote.estimated_cost += cod_fee
      quote.features.push('COD collection')
    })
  }

  // Filter out providers that can't handle the shipment
  return quotes.filter(quote => !quote.restrictions?.length)
}

// Simple route optimization (in real app, would use Google Maps/HERE APIs)
export function optimizeRoute(stops: Array<{
  id: string
  address: string
  lat?: number
  lon?: number
}>): RouteOptimization {
  // Simplified distance calculation - in reality would use actual routing APIs
  const optimized_stops = stops.map((stop, index) => ({
    stop_id: stop.id,
    sequence: index + 1,
    address: stop.address,
    estimated_duration_minutes: 30 + (index * 15), // Base time + travel between stops
    distance_km: 8 + (index * 5) // Estimated distance
  }))

  const total_distance_km = optimized_stops.reduce((sum, stop) => sum + stop.distance_km, 0)
  const total_duration_minutes = optimized_stops.reduce((sum, stop) => sum + stop.estimated_duration_minutes, 0)
  const fuel_cost_estimate = calculateDriverCost(total_distance_km, total_duration_minutes / 60).fuel_cost

  return {
    optimized_stops,
    total_distance_km: Math.round(total_distance_km * 100) / 100,
    total_duration_minutes,
    fuel_cost_estimate
  }
}

// Ashley AI delivery method recommendation
export function recommendDeliveryMethod(shipment: {
  weight_kg: number
  dimensions: { length_cm: number, width_cm: number, height_cm: number }
  pickup_address: string
  delivery_address: string
  cod_amount?: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH'
  distance_km?: number
}): {
  recommended_method: 'DRIVER' | '3PL'
  recommended_provider?: string
  reasoning: string[]
  cost_comparison: {
    driver_cost: number
    cheapest_3pl_cost: number
    savings: number
  }
} {
  const quotes = get3PLQuotes(shipment)
  const distance_km = shipment.distance_km || 15 // Default estimate
  const driver_cost = calculateDriverCost(distance_km, distance_km / 25) // 25km/h average speed
  
  const cheapest_3pl = quotes.reduce((min, quote) => 
    quote.estimated_cost < min.estimated_cost ? quote : min
  )

  const reasoning: string[] = []
  let recommended_method: 'DRIVER' | '3PL' = 'DRIVER'
  let recommended_provider: string | undefined

  // Cost analysis
  if (cheapest_3pl.estimated_cost < driver_cost.total_cost) {
    recommended_method = '3PL'
    recommended_provider = cheapest_3pl.provider
    reasoning.push(`3PL is ₱${(driver_cost.total_cost - cheapest_3pl.estimated_cost).toFixed(2)} cheaper`)
  } else {
    reasoning.push(`In-house delivery saves ₱${(cheapest_3pl.estimated_cost - driver_cost.total_cost).toFixed(2)}`)
  }

  // Urgency consideration
  if (shipment.urgency === 'HIGH') {
    const same_day_options = quotes.filter(q => 
      q.service_type === 'SAME_DAY' || q.service_type === 'INSTANT'
    )
    if (same_day_options.length > 0) {
      const fastest = same_day_options.reduce((min, quote) => 
        new Date(quote.estimated_eta) < new Date(min.estimated_eta) ? quote : min
      )
      recommended_method = '3PL'
      recommended_provider = fastest.provider
      reasoning.push(`Urgent delivery - ${fastest.provider} delivers in ${fastest.service_type}`)
    }
  }

  // Weight/size considerations
  const chargeable_weight = calculateChargeableWeight(shipment.weight_kg, shipment.dimensions)
  if (chargeable_weight > 25) {
    recommended_method = '3PL'
    recommended_provider = 'JNT_EXPRESS' // Better for heavy items
    reasoning.push('Heavy/bulky items better suited for 3PL logistics network')
  }

  // Distance consideration
  if (distance_km > 50) {
    recommended_method = '3PL'
    reasoning.push('Long distance delivery more efficient via 3PL network')
  }

  return {
    recommended_method,
    recommended_provider,
    reasoning,
    cost_comparison: {
      driver_cost: driver_cost.total_cost,
      cheapest_3pl_cost: cheapest_3pl.estimated_cost,
      savings: Math.abs(driver_cost.total_cost - cheapest_3pl.estimated_cost)
    }
  }
}

// Calculate delivery metrics
export function calculateDeliveryMetrics(deliveries: Array<{
  delivered_at: Date | null
  promised_date: Date
  status: string
  cost: number
  rating?: number
}>): DeliveryMetrics {
  const total_deliveries = deliveries.length
  if (total_deliveries === 0) {
    return {
      on_time_rate: 0,
      success_rate: 0,
      avg_delivery_time_hours: 0,
      cost_per_delivery: 0,
      customer_satisfaction: 0
    }
  }

  const successful_deliveries = deliveries.filter(d => d.status === 'DELIVERED')
  const on_time_deliveries = successful_deliveries.filter(d => 
    d.delivered_at && d.delivered_at <= d.promised_date
  )

  const total_delivery_time = successful_deliveries
    .filter(d => d.delivered_at)
    .reduce((sum, d) => {
      const hours = (d.delivered_at!.getTime() - new Date(d.promised_date).getTime()) / (1000 * 60 * 60)
      return sum + Math.abs(hours)
    }, 0)

  const total_cost = deliveries.reduce((sum, d) => sum + d.cost, 0)
  
  const ratings = deliveries.filter(d => d.rating).map(d => d.rating!)
  const avg_rating = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
    : 0

  return {
    on_time_rate: Math.round((on_time_deliveries.length / total_deliveries) * 10000) / 100,
    success_rate: Math.round((successful_deliveries.length / total_deliveries) * 10000) / 100,
    avg_delivery_time_hours: Math.round((total_delivery_time / successful_deliveries.length) * 100) / 100,
    cost_per_delivery: Math.round((total_cost / total_deliveries) * 100) / 100,
    customer_satisfaction: Math.round(avg_rating * 100) / 100
  }
}

// Validate COD collection
export function validateCODCollection(
  collected_amount: number,
  expected_amount: number,
  tolerance: number = 0.01 // 1% tolerance
): {
  is_valid: boolean
  variance: number
  variance_pct: number
  action_required?: string
} {
  const variance = collected_amount - expected_amount
  const variance_pct = expected_amount > 0 ? (variance / expected_amount) * 100 : 0

  const is_valid = Math.abs(variance_pct) <= tolerance * 100

  let action_required: string | undefined
  if (!is_valid) {
    if (variance > 0) {
      action_required = 'Excess collection - refund or credit customer'
    } else {
      action_required = 'Shortfall - collect remaining amount or investigate'
    }
  }

  return {
    is_valid,
    variance: Math.round(variance * 100) / 100,
    variance_pct: Math.round(variance_pct * 100) / 100,
    action_required
  }
}