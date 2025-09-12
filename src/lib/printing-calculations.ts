// @ts-nocheck
// Printing Calculations & Ashley AI Validations
// Based on CLIENT_UPDATED_PLAN.md Stage 4 specifications

export interface PrintingSpecs {
  method: 'SILKSCREEN' | 'SUBLIMATION' | 'DTF' | 'EMBROIDERY'
  placement_area_cm2: number
  quantity: number
  colors?: number
  coats?: number
  mesh_count?: number
  stitch_count?: number
}

export interface MaterialEstimation {
  item_name: string
  uom: string
  estimated_qty: number
  cost_per_unit?: number
  total_cost?: number
}

export interface PrintingValidation {
  risk: 'GREEN' | 'AMBER' | 'RED'
  confidence: number
  issues: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    message: string
  }>
  recommendations: string[]
  material_estimates: MaterialEstimation[]
}

// SILKSCREEN CALCULATIONS
export function calculateSilkscreenMaterials(specs: PrintingSpecs): MaterialEstimation[] {
  const { placement_area_cm2, quantity, colors = 1, coats = 1, mesh_count = 160 } = specs
  
  // Coverage factor varies by mesh count and ink type
  const coverage_factor = mesh_count <= 110 ? 0.012 : mesh_count <= 160 ? 0.008 : 0.006
  
  const ink_per_piece_g = placement_area_cm2 * coats * coverage_factor
  const total_ink_g = ink_per_piece_g * quantity * 1.15 // 15% waste factor
  
  const materials: MaterialEstimation[] = [
    {
      item_name: 'Plastisol Ink',
      uom: 'g',
      estimated_qty: Math.round(total_ink_g),
      cost_per_unit: 0.25, // PHP per gram
      total_cost: Math.round(total_ink_g * 0.25)
    }
  ]

  // Screen prep materials
  if (colors > 0) {
    materials.push(
      {
        item_name: 'Screen Mesh',
        uom: 'pcs',
        estimated_qty: colors,
        cost_per_unit: 350,
        total_cost: colors * 350
      },
      {
        item_name: 'Emulsion',
        uom: 'ml',
        estimated_qty: colors * 50,
        cost_per_unit: 1.2,
        total_cost: colors * 50 * 1.2
      }
    )
  }

  return materials
}

// SUBLIMATION CALCULATIONS
export function calculateSublimationMaterials(specs: PrintingSpecs): MaterialEstimation[] {
  const { placement_area_cm2, quantity } = specs
  
  // Paper usage (add 10% waste)
  const paper_area_m2 = (placement_area_cm2 / 10000) * quantity * 1.1
  
  // Ink estimation (approximately 2.5g per 100cm²)
  const ink_g = (placement_area_cm2 / 100) * 2.5 * quantity

  return [
    {
      item_name: 'Sublimation Paper',
      uom: 'm2',
      estimated_qty: Math.ceil(paper_area_m2 * 100) / 100,
      cost_per_unit: 45,
      total_cost: Math.round(paper_area_m2 * 45)
    },
    {
      item_name: 'Sublimation Ink',
      uom: 'g',
      estimated_qty: Math.round(ink_g),
      cost_per_unit: 1.8,
      total_cost: Math.round(ink_g * 1.8)
    }
  ]
}

// DTF CALCULATIONS
export function calculateDTFMaterials(specs: PrintingSpecs): MaterialEstimation[] {
  const { placement_area_cm2, quantity } = specs
  
  // Film usage (add 5% waste for DTF - more precise than sublimation)
  const film_area_m2 = (placement_area_cm2 / 10000) * quantity * 1.05
  
  // Ink (similar to sublimation but slightly higher coverage)
  const ink_g = (placement_area_cm2 / 100) * 3.0 * quantity
  
  // Powder (approximately 15g per m²)
  const powder_g = film_area_m2 * 15

  return [
    {
      item_name: 'DTF Film',
      uom: 'm2',
      estimated_qty: Math.ceil(film_area_m2 * 100) / 100,
      cost_per_unit: 85,
      total_cost: Math.round(film_area_m2 * 85)
    },
    {
      item_name: 'DTF Ink',
      uom: 'g',
      estimated_qty: Math.round(ink_g),
      cost_per_unit: 2.2,
      total_cost: Math.round(ink_g * 2.2)
    },
    {
      item_name: 'DTF Powder',
      uom: 'g',
      estimated_qty: Math.round(powder_g),
      cost_per_unit: 0.8,
      total_cost: Math.round(powder_g * 0.8)
    }
  ]
}

// EMBROIDERY CALCULATIONS
export function calculateEmbroideryMaterials(specs: PrintingSpecs): MaterialEstimation[] {
  const { stitch_count = 5000, quantity } = specs
  
  // Thread estimation: approximately 1000 stitches = 1 meter of thread
  const thread_meters = (stitch_count / 1000) * quantity * 1.2 // 20% waste
  
  // Stabilizer: varies by design complexity
  const stabilizer_factor = stitch_count > 10000 ? 1.5 : stitch_count > 5000 ? 1.0 : 0.7
  const stabilizer_qty = quantity * stabilizer_factor

  return [
    {
      item_name: 'Embroidery Thread',
      uom: 'm',
      estimated_qty: Math.round(thread_meters),
      cost_per_unit: 0.08,
      total_cost: Math.round(thread_meters * 0.08)
    },
    {
      item_name: 'Cut-away Stabilizer',
      uom: 'pcs',
      estimated_qty: Math.round(stabilizer_qty),
      cost_per_unit: 2.5,
      total_cost: Math.round(stabilizer_qty * 2.5)
    }
  ]
}

// ASHLEY AI VALIDATION
export function validatePrintingSpecs(specs: PrintingSpecs): PrintingValidation {
  const issues: PrintingValidation['issues'] = []
  const recommendations: string[] = []
  let risk: PrintingValidation['risk'] = 'GREEN'
  let confidence = 0.95

  // Get material estimates
  let material_estimates: MaterialEstimation[] = []
  
  switch (specs.method) {
    case 'SILKSCREEN':
      material_estimates = calculateSilkscreenMaterials(specs)
      
      // Silkscreen validations
      if (specs.colors && specs.colors > 4) {
        issues.push({
          type: 'COMPLEXITY',
          severity: 'MEDIUM',
          message: `High color count (${specs.colors}) may cause registration issues`
        })
        recommendations.push('Consider color reduction or DTF method for complex designs')
        risk = 'AMBER'
        confidence = 0.8
      }
      
      if (specs.placement_area_cm2 > 900) { // 30cm x 30cm
        issues.push({
          type: 'SIZE_LIMIT',
          severity: 'HIGH',
          message: 'Large placement area may exceed standard screen sizes'
        })
        risk = 'RED'
        confidence = 0.6
      }
      
      break
      
    case 'SUBLIMATION':
      material_estimates = calculateSublimationMaterials(specs)
      
      recommendations.push('Ensure polyester content >65% for optimal sublimation results')
      
      if (specs.placement_area_cm2 > 2000) {
        recommendations.push('Consider splitting large designs across multiple presses')
      }
      
      break
      
    case 'DTF':
      material_estimates = calculateDTFMaterials(specs)
      
      recommendations.push('DTF works on all fabric types - good choice for mixed materials')
      
      if (specs.quantity < 50) {
        recommendations.push('DTF is cost-effective for small quantities')
      }
      
      break
      
    case 'EMBROIDERY':
      material_estimates = calculateEmbroideryMaterials(specs)
      
      if (specs.stitch_count && specs.stitch_count > 15000) {
        issues.push({
          type: 'DENSITY',
          severity: 'HIGH',
          message: 'High stitch count may cause puckering on lightweight fabrics'
        })
        recommendations.push('Consider design simplification or backing stabilizer')
        risk = 'AMBER'
        confidence = 0.7
      }
      
      break
  }

  // General quantity validations
  if (specs.quantity > 1000) {
    recommendations.push('Large quantity - ensure adequate material inventory')
  }

  return {
    risk,
    confidence,
    issues,
    recommendations,
    material_estimates
  }
}

// CURING VALIDATION (for silkscreen)
export function validateCuring(temp_c: number, seconds: number, ink_type: string): {
  status: 'PASS' | 'WARN' | 'FAIL'
  cure_index: number
  message: string
} {
  // Cure index calculation - simplified thermal energy model
  const cure_index = temp_c * Math.log(seconds + 1)
  
  const thresholds = {
    PLASTISOL: { min: 650, optimal: 800 }, // ~160°C for 6-8 seconds
    WATER: { min: 400, optimal: 550 },     // ~140°C for 4-6 seconds
    PUFF: { min: 700, optimal: 900 }       // ~170°C for 6-8 seconds
  }
  
  const threshold = thresholds[ink_type as keyof typeof thresholds] || thresholds.PLASTISOL
  
  if (cure_index < threshold.min) {
    return {
      status: 'FAIL',
      cure_index,
      message: `Under-cured: Need ${Math.round(threshold.min)} cure index (got ${Math.round(cure_index)})`
    }
  } else if (cure_index < threshold.optimal) {
    return {
      status: 'WARN',
      cure_index,
      message: `Marginal cure: Recommend higher temp or longer time`
    }
  } else {
    return {
      status: 'PASS',
      cure_index,
      message: `Properly cured`
    }
  }
}