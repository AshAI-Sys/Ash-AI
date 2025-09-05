// Sewing System Calculations & Piece-Rate Payroll
// Based on CLIENT_UPDATED_PLAN.md Stage 5 specifications

export interface SewingOperation {
  id: string
  name: string
  standard_minutes: number // SMV
  piece_rate?: number
  complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  skill_level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
  depends_on: string[]
}

export interface BundleStatus {
  bundle_id: string
  bundle_no: string
  total_qty: number
  current_qty: number
  status: 'CREATED' | 'IN_SEWING' | 'COMPLETED' | 'REJECTED'
  operations_completed: string[]
  operations_pending: string[]
  progress_pct: number
}

export interface OperatorPerformance {
  operator_id: string
  total_pieces: number
  total_minutes: number
  earned_minutes: number
  efficiency_pct: number
  pieces_per_hour: number
  piece_rate_earned: number
  defect_rate: number
}

export interface LineEfficiency {
  line_name: string
  target_efficiency: number
  actual_efficiency: number
  bottleneck_operation?: string
  suggested_rebalancing?: OperatorReassignment[]
}

export interface OperatorReassignment {
  operator_id: string
  from_operation: string
  to_operation: string
  expected_improvement_pct: number
}

// Calculate piece-rate earnings for a sewing run
export function calculatePieceRateEarnings(
  qty_good: number,
  operation: SewingOperation,
  operator_skill_level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' = 'BASIC',
  brand_rates?: { [operation_name: string]: number }
): {
  base_earnings: number
  skill_multiplier: number
  total_earnings: number
  earned_minutes: number
} {
  // Determine piece rate
  let piece_rate = operation.piece_rate
  if (!piece_rate && brand_rates) {
    piece_rate = brand_rates[operation.name] || 0
  }
  
  const base_earnings = qty_good * (piece_rate || 0)
  
  // Skill level multipliers
  const skill_multipliers = {
    BASIC: 1.0,
    INTERMEDIATE: 1.1,
    ADVANCED: 1.2
  }
  
  const skill_multiplier = skill_multipliers[operator_skill_level]
  const total_earnings = base_earnings * skill_multiplier
  const earned_minutes = qty_good * operation.standard_minutes

  return {
    base_earnings: Math.round(base_earnings * 100) / 100,
    skill_multiplier,
    total_earnings: Math.round(total_earnings * 100) / 100,
    earned_minutes: Math.round(earned_minutes * 100) / 100
  }
}

// Calculate operator efficiency
export function calculateOperatorEfficiency(
  earned_minutes: number,
  actual_minutes: number,
  target_efficiency: number = 85
): {
  efficiency_pct: number
  performance_rating: 'BELOW_TARGET' | 'ON_TARGET' | 'ABOVE_TARGET'
  efficiency_points: number // For bonus calculations
} {
  const efficiency_pct = actual_minutes > 0 ? (earned_minutes / actual_minutes) * 100 : 0
  
  let performance_rating: 'BELOW_TARGET' | 'ON_TARGET' | 'ABOVE_TARGET'
  let efficiency_points = 0

  if (efficiency_pct < target_efficiency - 5) {
    performance_rating = 'BELOW_TARGET'
  } else if (efficiency_pct > target_efficiency + 10) {
    performance_rating = 'ABOVE_TARGET'
    efficiency_points = Math.round((efficiency_pct - target_efficiency) / 10) // Bonus points
  } else {
    performance_rating = 'ON_TARGET'
  }

  return {
    efficiency_pct: Math.round(efficiency_pct * 100) / 100,
    performance_rating,
    efficiency_points
  }
}

// Calculate bundle progress and dependencies
export function calculateBundleProgress(
  bundle: BundleStatus,
  operations: SewingOperation[],
  completed_operations: string[]
): {
  overall_progress_pct: number
  next_available_operations: string[]
  blocked_operations: string[]
  estimated_completion_time_mins: number
} {
  const operation_map = new Map(operations.map(op => [op.name, op]))
  const completed_set = new Set(completed_operations)
  
  // Check which operations are available (dependencies met)
  const next_available_operations: string[] = []
  const blocked_operations: string[] = []
  
  operations.forEach(op => {
    if (completed_set.has(op.name)) {
      return // Already completed
    }
    
    const dependencies_met = op.depends_on.every(dep => completed_set.has(dep))
    if (dependencies_met) {
      next_available_operations.push(op.name)
    } else {
      blocked_operations.push(op.name)
    }
  })
  
  // Calculate progress
  const total_operations = operations.length
  const completed_count = completed_operations.length
  const overall_progress_pct = total_operations > 0 ? (completed_count / total_operations) * 100 : 0
  
  // Estimate remaining time
  const remaining_operations = operations.filter(op => !completed_set.has(op.name))
  const estimated_completion_time_mins = remaining_operations.reduce(
    (sum, op) => sum + (op.standard_minutes * bundle.current_qty), 0
  )

  return {
    overall_progress_pct: Math.round(overall_progress_pct * 100) / 100,
    next_available_operations,
    blocked_operations,
    estimated_completion_time_mins: Math.round(estimated_completion_time_mins)
  }
}

// Line balancing and bottleneck analysis
export function analyzeLineEfficiency(
  operators: OperatorPerformance[],
  operations_workload: { [operation: string]: number }, // Total minutes required
  target_efficiency: number = 85
): LineEfficiency {
  if (operators.length === 0) {
    return {
      line_name: 'Unknown',
      target_efficiency,
      actual_efficiency: 0,
      suggested_rebalancing: []
    }
  }

  // Calculate overall line efficiency
  const total_earned_minutes = operators.reduce((sum, op) => sum + op.earned_minutes, 0)
  const total_actual_minutes = operators.reduce((sum, op) => sum + op.total_minutes, 0)
  const actual_efficiency = total_actual_minutes > 0 ? (total_earned_minutes / total_actual_minutes) * 100 : 0

  // Find bottleneck (operation with highest workload vs capacity ratio)
  const operation_efficiency: { [operation: string]: number } = {}
  const operation_operators: { [operation: string]: OperatorPerformance[] } = {}

  operators.forEach(op => {
    // In a real system, we'd track which operations each operator works on
    // For now, we'll simulate this analysis
    operation_efficiency['main_operation'] = op.efficiency_pct
  })

  // Find the operation with the lowest efficiency
  const bottleneck_operation = Object.entries(operation_efficiency)
    .sort(([, a], [, b]) => a - b)[0]?.[0]

  // Suggest rebalancing if efficiency is below target
  const suggested_rebalancing: OperatorReassignment[] = []
  if (actual_efficiency < target_efficiency) {
    // Find high-performing operators who could help bottleneck operations
    const high_performers = operators.filter(op => op.efficiency_pct > target_efficiency + 15)
    const low_performers = operators.filter(op => op.efficiency_pct < target_efficiency - 10)

    high_performers.forEach(high => {
      low_performers.forEach(low => {
        suggested_rebalancing.push({
          operator_id: high.operator_id,
          from_operation: 'current_operation',
          to_operation: 'bottleneck_operation',
          expected_improvement_pct: 10
        })
      })
    })
  }

  return {
    line_name: 'Production Line',
    target_efficiency,
    actual_efficiency: Math.round(actual_efficiency * 100) / 100,
    bottleneck_operation,
    suggested_rebalancing
  }
}

// Ashley AI recommendations for sewing operations
export function getAshleyAISewingRecommendations(
  operator_performance: OperatorPerformance,
  recent_defect_rate: number,
  continuous_work_hours: number,
  operation_complexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
): {
  efficiency_score: number
  risk_level: 'GREEN' | 'AMBER' | 'RED'
  recommendations: string[]
  alerts: string[]
} {
  const recommendations: string[] = []
  const alerts: string[] = []
  let efficiency_score = 0
  let risk_level: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'

  // Efficiency analysis
  if (operator_performance.efficiency_pct >= 85) {
    efficiency_score += 40
    recommendations.push('Excellent efficiency maintained')
  } else if (operator_performance.efficiency_pct >= 70) {
    efficiency_score += 25
    recommendations.push('Good efficiency, minor optimization possible')
  } else if (operator_performance.efficiency_pct >= 50) {
    efficiency_score += 15
    risk_level = 'AMBER'
    recommendations.push('Efficiency below target - check for training needs')
    recommendations.push('Review material flow and workspace setup')
  } else {
    efficiency_score += 5
    risk_level = 'RED'
    alerts.push('Low efficiency detected - immediate intervention required')
    recommendations.push('Provide additional training and supervision')
  }

  // Defect rate analysis
  if (recent_defect_rate <= 0.02) {
    efficiency_score += 30
  } else if (recent_defect_rate <= 0.05) {
    efficiency_score += 20
    recommendations.push('Monitor quality consistency')
  } else {
    efficiency_score += 5
    risk_level = 'RED'
    alerts.push('High defect rate - quality intervention needed')
    recommendations.push('Review operation techniques and quality standards')
  }

  // Fatigue monitoring
  if (continuous_work_hours >= 4) {
    risk_level = 'AMBER'
    recommendations.push('Consider break to maintain quality and efficiency')
  }
  
  if (continuous_work_hours >= 6) {
    risk_level = 'RED'
    alerts.push('Extended work period - mandatory break required')
  }

  // Production rate analysis
  const expected_pieces_per_hour = operator_performance.pieces_per_hour
  if (expected_pieces_per_hour < 15 && operation_complexity === 'LOW') {
    recommendations.push('Production rate below expectation for low complexity operation')
  }

  // Speed vs quality balance
  if (operator_performance.efficiency_pct > 120 && recent_defect_rate > 0.03) {
    risk_level = 'AMBER'
    alerts.push('High speed with elevated defects - may be rushing')
    recommendations.push('Focus on quality over speed')
  }

  // Final scoring
  efficiency_score = Math.min(100, Math.max(0, efficiency_score))

  return {
    efficiency_score,
    risk_level,
    recommendations,
    alerts
  }
}

// Calculate payroll accruals for sewing operations
export function calculateSewingPayrollAccruals(
  sewing_runs: Array<{
    operator_id: string
    qty_good: number
    piece_rate_earned: number
    earned_minutes: number
    actual_minutes: number
    operation_name: string
  }>,
  period_start: Date,
  period_end: Date
): Array<{
  operator_id: string
  period: { start: Date, end: Date }
  piece_rate_earnings: number
  efficiency_bonus: number
  total_earned_minutes: number
  total_actual_minutes: number
  overall_efficiency_pct: number
  operations_worked: string[]
  total_pieces_completed: number
}> {
  // Group by operator
  const operator_accruals = new Map<string, any>()

  sewing_runs.forEach(run => {
    if (!operator_accruals.has(run.operator_id)) {
      operator_accruals.set(run.operator_id, {
        operator_id: run.operator_id,
        period: { start: period_start, end: period_end },
        piece_rate_earnings: 0,
        total_earned_minutes: 0,
        total_actual_minutes: 0,
        operations_worked: new Set(),
        total_pieces_completed: 0
      })
    }

    const accrual = operator_accruals.get(run.operator_id)
    accrual.piece_rate_earnings += run.piece_rate_earned
    accrual.total_earned_minutes += run.earned_minutes
    accrual.total_actual_minutes += run.actual_minutes
    accrual.operations_worked.add(run.operation_name)
    accrual.total_pieces_completed += run.qty_good
  })

  // Calculate efficiency bonuses and finalize
  return Array.from(operator_accruals.values()).map(accrual => {
    const overall_efficiency_pct = accrual.total_actual_minutes > 0 
      ? (accrual.total_earned_minutes / accrual.total_actual_minutes) * 100 
      : 0

    // Efficiency bonus calculation
    let efficiency_bonus = 0
    if (overall_efficiency_pct > 100) {
      efficiency_bonus = accrual.piece_rate_earnings * ((overall_efficiency_pct - 100) / 100) * 0.1 // 10% of excess as bonus
    }

    return {
      ...accrual,
      operations_worked: Array.from(accrual.operations_worked),
      overall_efficiency_pct: Math.round(overall_efficiency_pct * 100) / 100,
      efficiency_bonus: Math.round(efficiency_bonus * 100) / 100,
      piece_rate_earnings: Math.round(accrual.piece_rate_earnings * 100) / 100,
      total_earned_minutes: Math.round(accrual.total_earned_minutes * 100) / 100,
      total_actual_minutes: Math.round(accrual.total_actual_minutes * 100) / 100
    }
  })
}

// Generate production schedule based on operations and dependencies
export function generateSewingSchedule(
  operations: SewingOperation[],
  available_operators: number,
  bundle_qty: number,
  target_completion_hours: number = 8
): {
  schedule: Array<{
    operation_name: string
    sequence: number
    estimated_start_hour: number
    estimated_duration_hours: number
    required_operators: number
    can_start_parallel: boolean
  }>
  total_estimated_hours: number
  bottleneck_operations: string[]
  recommendations: string[]
} {
  const schedule: any[] = []
  const completed_operations = new Set<string>()
  const recommendations: string[] = []
  const bottleneck_operations: string[] = []
  
  let current_hour = 0
  let sequence = 1

  // Create dependency graph
  const operation_map = new Map(operations.map(op => [op.name, op]))
  
  while (completed_operations.size < operations.length) {
    // Find operations that can start (dependencies met)
    const available_operations = operations.filter(op => 
      !completed_operations.has(op.name) && 
      op.depends_on.every(dep => completed_operations.has(dep))
    )

    if (available_operations.length === 0) {
      break // No more operations can start (circular dependency?)
    }

    // Schedule available operations
    available_operations.forEach(op => {
      const operation_time_hours = (op.standard_minutes * bundle_qty) / 60
      const required_operators = Math.min(available_operators, Math.ceil(operation_time_hours / target_completion_hours))
      const actual_duration = operation_time_hours / required_operators

      schedule.push({
        operation_name: op.name,
        sequence: sequence++,
        estimated_start_hour: current_hour,
        estimated_duration_hours: Math.round(actual_duration * 100) / 100,
        required_operators,
        can_start_parallel: available_operations.length > 1
      })

      // Check for bottlenecks
      if (actual_duration > target_completion_hours / 8) { // More than 1/8 of shift
        bottleneck_operations.push(op.name)
        recommendations.push(`Consider splitting ${op.name} operation or adding operators`)
      }

      completed_operations.add(op.name)
    })

    current_hour += Math.max(...schedule.slice(-available_operations.length).map(s => s.estimated_duration_hours))
  }

  const total_estimated_hours = current_hour

  if (total_estimated_hours > target_completion_hours) {
    recommendations.push(`Schedule exceeds target by ${Math.round((total_estimated_hours - target_completion_hours) * 100) / 100} hours`)
    recommendations.push('Consider overtime or additional operators')
  }

  return {
    schedule,
    total_estimated_hours: Math.round(total_estimated_hours * 100) / 100,
    bottleneck_operations,
    recommendations
  }
}