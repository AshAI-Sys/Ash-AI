// @ts-nocheck
// Cutting System Calculations & Optimization
// Based on CLIENT_UPDATED_PLAN.md Stage 3 specifications

export interface PieceLayout {
  id: string
  name: string // e.g., "Front Panel Size M"
  size: string
  width_cm: number
  height_cm: number
  rotation?: number // Degrees rotation for optimal layout
  quantity: number
}

export interface CuttingSheetLayout {
  sheet_number: number
  sheet_width_cm: number
  sheet_length_cm: number
  pieces: Array<{
    piece_id: string
    x: number
    y: number
    rotation: number
    width_cm: number
    height_cm: number
  }>
  utilization_pct: number
  waste_area_cm2: number
}

export interface FabricOptimizationResult {
  total_fabric_needed_cm: number
  utilization_pct: number
  sheets: CuttingSheetLayout[]
  waste_analysis: {
    total_waste_cm2: number
    waste_percentage: number
    cost_of_waste: number
  }
  cutting_time_estimate_mins: number
}

export interface CuttingMetrics {
  pieces_per_hour: number
  fabric_utilization_pct: number
  waste_percentage: number
  defect_rate: number
  operator_efficiency: number
  cost_per_piece: number
}

// Calculate optimal fabric layout using rectangular bin packing
export function optimizeFabricLayout(
  pieces: PieceLayout[],
  fabric_width_cm: number,
  max_fabric_length_cm: number = 1000,
  seam_allowance_cm: number = 0.5,
  grain_direction_required: boolean = true
): FabricOptimizationResult {
  
  // Add seam allowances to all pieces
  const adjusted_pieces = pieces.map(piece => ({
    ...piece,
    width_cm: piece.width_cm + (seam_allowance_cm * 2),
    height_cm: piece.height_cm + (seam_allowance_cm * 2)
  }))

  // Expand pieces based on quantity
  const all_pieces: Array<PieceLayout & { original_id: string }> = []
  adjusted_pieces.forEach(piece => {
    for (let i = 0; i < piece.quantity; i++) {
      all_pieces.push({
        ...piece,
        id: `${piece.id}_${i + 1}`,
        original_id: piece.id,
        quantity: 1
      })
    }
  })

  // Sort pieces by area (largest first) for better bin packing
  all_pieces.sort((a, b) => (b.width_cm * b.height_cm) - (a.width_cm * a.height_cm))

  const sheets: CuttingSheetLayout[] = []
  let remaining_pieces = [...all_pieces]
  let sheet_number = 1

  while (remaining_pieces.length > 0) {
    const sheet = packPiecesIntoSheet(
      remaining_pieces,
      fabric_width_cm,
      max_fabric_length_cm,
      grain_direction_required
    )

    if (sheet.pieces.length === 0) {
      // If we can't fit any more pieces, break to avoid infinite loop
      console.warn('Unable to fit remaining pieces:', remaining_pieces.length)
      break
    }

    sheet.sheet_number = sheet_number++
    sheets.push(sheet)

    // Remove placed pieces from remaining
    const placed_piece_ids = new Set(sheet.pieces.map(p => p.piece_id))
    remaining_pieces = remaining_pieces.filter(p => !placed_piece_ids.has(p.id))
  }

  // Calculate totals
  const total_fabric_used_cm2 = sheets.reduce((sum, sheet) => 
    sum + (sheet.sheet_width_cm * sheet.sheet_length_cm), 0
  )
  
  const total_piece_area_cm2 = all_pieces.reduce((sum, piece) => 
    sum + (piece.width_cm * piece.height_cm), 0
  )

  const total_waste_cm2 = total_fabric_used_cm2 - total_piece_area_cm2
  const utilization_pct = (total_piece_area_cm2 / total_fabric_used_cm2) * 100

  const total_fabric_needed_cm = sheets.reduce((sum, sheet) => sum + sheet.sheet_length_cm, 0)

  // Estimate cutting time (simplified)
  const cutting_time_estimate_mins = calculateCuttingTime(all_pieces.length, sheets.length)

  return {
    total_fabric_needed_cm,
    utilization_pct,
    sheets,
    waste_analysis: {
      total_waste_cm2,
      waste_percentage: (total_waste_cm2 / total_fabric_used_cm2) * 100,
      cost_of_waste: 0 // Would be calculated based on fabric cost
    },
    cutting_time_estimate_mins
  }
}

// Simple rectangular bin packing algorithm
function packPiecesIntoSheet(
  pieces: Array<PieceLayout & { original_id: string }>,
  sheet_width_cm: number,
  max_length_cm: number,
  grain_direction_required: boolean
): CuttingSheetLayout {
  
  const placed_pieces: CuttingSheetLayout['pieces'] = []
  const occupied_areas: Array<{x: number, y: number, width: number, height: number}> = []
  
  let current_y = 0
  let row_height = 0
  let current_x = 0
  
  for (const piece of pieces) {
    let piece_width = piece.width_cm
    let piece_height = piece.height_cm
    let rotation = 0

    // Try to fit piece in current row
    if (current_x + piece_width <= sheet_width_cm && current_y + piece_height <= max_length_cm) {
      // Fits as-is
    } else if (!grain_direction_required && 
               current_x + piece_height <= sheet_width_cm && 
               current_y + piece_width <= max_length_cm) {
      // Try rotated 90 degrees
      piece_width = piece.height_cm
      piece_height = piece.width_cm
      rotation = 90
    } else {
      // Start new row
      current_y += row_height
      current_x = 0
      row_height = 0

      if (current_y + piece_height <= max_length_cm && piece_width <= sheet_width_cm) {
        // Fits in new row
      } else if (!grain_direction_required && 
                 current_y + piece_width <= max_length_cm && 
                 piece_height <= sheet_width_cm) {
        // Fits rotated in new row
        piece_width = piece.height_cm
        piece_height = piece.width_cm
        rotation = 90
      } else {
        // Cannot fit this piece
        break
      }
    }

    // Place the piece
    placed_pieces.push({
      piece_id: piece.id,
      x: current_x,
      y: current_y,
      rotation,
      width_cm: piece_width,
      height_cm: piece_height
    })

    occupied_areas.push({
      x: current_x,
      y: current_y,
      width: piece_width,
      height: piece_height
    })

    current_x += piece_width
    row_height = Math.max(row_height, piece_height)
  }

  const sheet_length_cm = current_y + row_height
  const total_sheet_area = sheet_width_cm * sheet_length_cm
  const used_area = occupied_areas.reduce((sum, area) => sum + (area.width * area.height), 0)
  
  return {
    sheet_number: 0, // Will be set by caller
    sheet_width_cm,
    sheet_length_cm,
    pieces: placed_pieces,
    utilization_pct: (used_area / total_sheet_area) * 100,
    waste_area_cm2: total_sheet_area - used_area
  }
}

// Estimate cutting time based on complexity
export function calculateCuttingTime(
  total_pieces: number,
  total_sheets: number,
  cutting_method: 'MANUAL' | 'LASER' | 'DIE_CUT' = 'MANUAL'
): number {
  const base_times = {
    MANUAL: 2.5, // minutes per piece
    LASER: 0.8,  // minutes per piece
    DIE_CUT: 0.3 // minutes per piece
  }

  const setup_times = {
    MANUAL: 5,   // minutes per sheet
    LASER: 3,    // minutes per sheet
    DIE_CUT: 10  // minutes per sheet (die setup)
  }

  const cutting_time = total_pieces * base_times[cutting_method]
  const setup_time = total_sheets * setup_times[cutting_method]

  return Math.round(cutting_time + setup_time)
}

// Calculate fabric waste and cost implications
export function calculateFabricWaste(
  fabric_used_cm2: number,
  pieces_area_cm2: number,
  fabric_cost_per_cm2: number = 0.01
): {
  waste_area_cm2: number
  waste_percentage: number
  waste_cost: number
  utilization_pct: number
} {
  const waste_area_cm2 = fabric_used_cm2 - pieces_area_cm2
  const waste_percentage = (waste_area_cm2 / fabric_used_cm2) * 100
  const waste_cost = waste_area_cm2 * fabric_cost_per_cm2
  const utilization_pct = (pieces_area_cm2 / fabric_used_cm2) * 100

  return {
    waste_area_cm2: Math.round(waste_area_cm2),
    waste_percentage: Math.round(waste_percentage * 100) / 100,
    waste_cost: Math.round(waste_cost * 100) / 100,
    utilization_pct: Math.round(utilization_pct * 100) / 100
  }
}

// Ashley AI recommendations for cutting efficiency
export function getAshleyAICuttingRecommendations(
  utilization_pct: number,
  waste_percentage: number,
  cutting_time_mins: number,
  piece_complexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
): {
  efficiency_score: number
  risk_level: 'GREEN' | 'AMBER' | 'RED'
  recommendations: string[]
  optimization_tips: string[]
} {
  const recommendations: string[] = []
  const optimization_tips: string[] = []
  let efficiency_score = 0
  let risk_level: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'

  // Utilization scoring
  if (utilization_pct >= 85) {
    efficiency_score += 40
    recommendations.push('Excellent fabric utilization achieved')
  } else if (utilization_pct >= 75) {
    efficiency_score += 30
    optimization_tips.push('Consider rotating pieces to improve utilization')
  } else {
    efficiency_score += 10
    risk_level = 'AMBER'
    recommendations.push('Low fabric utilization detected')
    optimization_tips.push('Review piece layouts for better nesting')
    optimization_tips.push('Consider different fabric widths')
  }

  // Waste analysis
  if (waste_percentage <= 10) {
    efficiency_score += 30
  } else if (waste_percentage <= 20) {
    efficiency_score += 20
    optimization_tips.push('Optimize piece placement to reduce waste')
  } else {
    efficiency_score += 5
    risk_level = 'RED'
    recommendations.push('High fabric waste detected - review cutting plan')
  }

  // Time efficiency
  const time_per_piece = cutting_time_mins / 10 // Assume 10 pieces for baseline
  if (time_per_piece <= 2) {
    efficiency_score += 20
  } else if (time_per_piece <= 4) {
    efficiency_score += 15
  } else {
    efficiency_score += 5
    optimization_tips.push('Consider batch cutting similar pieces')
    optimization_tips.push('Optimize cutting sequence to reduce tool changes')
  }

  // Complexity adjustments
  if (piece_complexity === 'HIGH') {
    efficiency_score -= 10
    optimization_tips.push('Complex pieces require careful handling')
    optimization_tips.push('Allow extra time for intricate cuts')
  }

  // Final scoring
  efficiency_score = Math.min(100, Math.max(0, efficiency_score))

  if (efficiency_score >= 80) {
    risk_level = 'GREEN'
  } else if (efficiency_score >= 60) {
    risk_level = 'AMBER'
  } else {
    risk_level = 'RED'
  }

  return {
    efficiency_score,
    risk_level,
    recommendations,
    optimization_tips
  }
}

// Calculate cost analysis for cutting operation
export function calculateCuttingCost(
  pieces_count: number,
  cutting_time_mins: number,
  fabric_cost: number,
  waste_cost: number,
  labor_rate_per_hour: number = 300 // PHP per hour
): {
  labor_cost: number
  material_cost: number
  waste_cost: number
  total_cost: number
  cost_per_piece: number
} {
  const labor_cost = (cutting_time_mins / 60) * labor_rate_per_hour
  const material_cost = fabric_cost
  const total_cost = labor_cost + material_cost + waste_cost
  const cost_per_piece = total_cost / pieces_count

  return {
    labor_cost: Math.round(labor_cost * 100) / 100,
    material_cost: Math.round(material_cost * 100) / 100,
    waste_cost: Math.round(waste_cost * 100) / 100,
    total_cost: Math.round(total_cost * 100) / 100,
    cost_per_piece: Math.round(cost_per_piece * 100) / 100
  }
}

// Generate cutting instructions for operators
export function generateCuttingInstructions(
  sheets: CuttingSheetLayout[],
  fabric_type: string,
  special_requirements?: string[]
): {
  sheet_number: number
  instructions: string[]
  safety_notes: string[]
  quality_checkpoints: string[]
}[] {
  
  return sheets.map(sheet => ({
    sheet_number: sheet.sheet_number,
    instructions: [
      `Set up ${fabric_type} fabric on cutting table`,
      `Verify fabric width: ${sheet.sheet_width_cm}cm`,
      `Mark cutting length: ${sheet.sheet_length_cm}cm`,
      `Follow piece layout pattern exactly`,
      `Cut ${sheet.pieces.length} pieces from this sheet`,
      ...(special_requirements || [])
    ],
    safety_notes: [
      'Ensure cutting tools are sharp and properly maintained',
      'Keep fingers away from cutting path',
      'Verify fabric is properly secured before cutting',
      'Check for fabric defects before cutting'
    ],
    quality_checkpoints: [
      'Verify piece dimensions against specifications',
      'Check for proper grain direction alignment',
      'Inspect cut edges for fraying or defects',
      'Confirm all pieces are properly labeled'
    ]
  }))
}